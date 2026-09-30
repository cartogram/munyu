import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { landscape } from './landscape.js';

gsap.registerPlugin(ScrollTrigger);
// Resizes are handled by rebuild() below, which keeps the reader on the same
// beat; ScrollTrigger's own resize refresh would shift positions first.
ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load' });

// Scenes that hold while their pieces appear one per beat, in DOM order.
const STEPPED_SCENES = {
	'todays-model': (scene) => scene.querySelectorAll('.diagram-piece'),
	'demo-two-people': (scene) => scene.querySelectorAll('.demo-panel'),
};
const STEP_HOLD = 0.5; // scroll per reveal step, as a fraction of the card height
const STEP_FADE = 0.1; // share of a step spent fading its piece in

const acts = gsap.utils.toArray('main .act-panel');

// Cards stack: act k sits k × --stack-step further in from the top and left
// than the first, so earlier cards' corners show behind the current one.
acts.forEach((panel, k) => panel.style.setProperty('--stack', k));

// --inset-top / --inset-bottom / --stack-step from css/talk.css, in px.
function cardInsets() {
	const root = getComputedStyle(document.documentElement);
	const rem = parseFloat(root.fontSize);
	const px = (name) => {
		const value = root.getPropertyValue(name).trim();
		return parseFloat(value) * (value.endsWith('rem') ? rem : 1) || 0;
	};
	return { insetTop: px('--inset-top'), insetBottom: px('--inset-bottom'), stackStep: px('--stack-step') };
}

// Each act opener gets its own seeded mark-field landscape, in the act's tints.
acts.forEach((panel) => panel.querySelector('.act-opener')?.append(landscape(panel.dataset.act)));

// Each scene's kicker ("Act name—3/8"), shown in the slide chrome under
// the talk title. The first act has no opener heading, and its title scene
// carries no kicker.
acts.forEach((panel) => {
	const actName = panel.querySelector('.act-title')?.textContent ?? 'Hypothesis';
	const scenes = [...panel.querySelectorAll('section[data-scene]')];
	scenes.forEach((scene, i) => {
		if (scene.dataset.scene === 'your-ui-is-not-my-ui-title') return;
		scene.dataset.kickerAct = actName;
		scene.dataset.kickerNumber = `${i + 1}/${scenes.length}`;
	});
});

// Rebuilt with every setup(). A beat's scroll position is its trigger's start
// plus its timeline time: durations are in scroll pixels, so 1s = 1px.
let beats = []; // { id, scene, trigger, time }
let freeRanges = []; // { trigger, from, to } — tall scenes, scrolled through freely

// One timeline per act: slide the inner row of scenes left to each scene,
// hold for stepped reveals, scroll tall scenes up through their overflow,
// then (except for the last act) hold one card height while the next card
// slides over. The act is pinned for the whole timeline; no scene inside it
// is pinned on its own, so nothing ever sits inside a transformed ancestor.
function buildAct(panel, isLast) {
	const inner = panel.querySelector('.act-panel-inner');
	const act = panel.dataset.act;
	const cardHeight = panel.clientHeight;
	const tl = gsap.timeline();
	// An act without an opener (the first, which opens on the talk title)
	// starts directly on its first scene.
	const actBeats = panel.querySelector('.act-opener') ? [{ id: act, scene: null, time: 0 }] : [];
	const actRanges = [];

	gsap.set(panel, { '--card-width': `${panel.clientWidth}px` });

	// Each move takes one card height of scroll per scene crossed, plus the
	// vertical distance, so a slide feels the same at any viewport width.
	let x = 0;
	let y = 0;
	const moveInnerTo = (targetX, targetY) => {
		const scenesCrossed = Math.abs(targetX - x) / panel.clientWidth;
		const duration = scenesCrossed * cardHeight + Math.abs(targetY - y);
		if (duration < 1) return;
		tl.to(inner, { x: -targetX, y: -targetY, duration, ease: 'none' });
		x = targetX;
		y = targetY;
	};

	panel.querySelectorAll('section[data-scene]').forEach((scene) => {
		const id = `${act}/${scene.dataset.scene}`;
		moveInnerTo(scene.offsetLeft, 0);
		actBeats.push({ id, scene, time: tl.duration() });

		const pieces = STEPPED_SCENES[scene.dataset.scene]?.(scene) ?? [];
		pieces.forEach((piece, i) => {
			const hold = cardHeight * STEP_HOLD;
			tl.fromTo(piece, { opacity: 0 }, { opacity: 1, duration: hold * STEP_FADE, ease: 'none' });
			tl.to({}, { duration: hold * (1 - STEP_FADE) });
			actBeats.push({ id: `${id}/${i + 1}`, scene, time: tl.duration() });
		});

		// Only scroll through a scene that overflows by more than its bottom
		// padding could absorb; a few px of overflow isn't worth a stop.
		const overflow = scene.offsetHeight - cardHeight;
		if (overflow > 16) {
			const from = tl.duration();
			moveInnerTo(x, overflow);
			actRanges.push({ from, to: tl.duration() });
		}
	});

	// Cards sit in from the window edges (--inset-*), one stack step further
	// per act: each pins at its own top offset, and the next card arrives at
	// its own (one step lower).
	const { insetTop, insetBottom, stackStep } = cardInsets();
	const k = acts.indexOf(panel);
	const top = insetTop + k * stackStep;
	const travel = tl.duration();
	if (!isLast) {
		// pinSpacing is off so the next card overlaps; this margin delays its
		// arrival until the scenes have finished sliding. The hold is the
		// distance for the next card to rise from the window's bottom edge to
		// its stack position.
		gsap.set(panel, { marginBottom: travel + insetBottom });
		tl.to({}, { duration: document.documentElement.clientHeight - (top + stackStep) });
	}

	// One trigger scrubs the act's timeline over its own stretch of scroll.
	// The last act also pins (with spacing) for that stretch, which gives the
	// page its final length.
	const trigger = ScrollTrigger.create({
		trigger: panel,
		start: `top ${top}px`,
		end: `+=${tl.duration()}`,
		scrub: true,
		animation: tl,
		...(isLast && { pin: true, pinSpacing: true }),
	});

	// Earlier acts stay pinned from their arrival to the end of the page, so
	// they remain stacked beneath the later cards. Refreshed after the other
	// triggers, once the page's full length is known.
	if (!isLast) {
		ScrollTrigger.create({
			trigger: panel,
			start: `top ${top}px`,
			endTrigger: 'main',
			end: 'bottom bottom',
			pin: true,
			pinSpacing: false,
			refreshPriority: -1,
		});
	}

	actBeats.forEach((beat) => beats.push({ ...beat, trigger }));
	actRanges.forEach((range) => freeRanges.push({ ...range, trigger }));
}

const beatPosition = (beat) => beat.trigger.start + beat.time;
const beatById = (id) => beats.find((beat) => beat.id === id);
const freeRangePositions = () =>
	freeRanges.map((range) => ({ from: range.trigger.start + range.from, to: range.trigger.start + range.to }));

// Everywhere navigation can land: every beat, plus the bottom of each tall
// scene so stepping back from the next beat returns to where you left it.
function stopPositions() {
	const positions = beats.map(beatPosition);
	freeRangePositions().forEach((range) => positions.push(range.to));
	return positions.sort((a, b) => a - b);
}

// Beats are pushed act by act in timeline order, so they're sorted by position.
function currentBeat() {
	let current = beats[0];
	for (const beat of beats) {
		if (beatPosition(beat) > window.scrollY + 2) break;
		current = beat;
	}
	return current;
}

let navTween = null;
let navTarget = null;

function createSnap() {
	ScrollTrigger.create({
		start: 0,
		end: 'max',
		snap: {
			snapTo: (progress, self) => {
				const span = self.end - self.start;
				const y = self.start + progress * span;
				if (navTween) return progress;
				if (freeRangePositions().some((range) => y > range.from + 2 && y < range.to - 2)) return progress;
				const stops = stopPositions();
				if (stops.some((stop) => Math.abs(stop - y) <= 2)) return progress;
				const target =
					self.direction >= 0
						? (stops.find((stop) => stop > y) ?? stops.at(-1))
						: (stops.findLast((stop) => stop < y) ?? stops[0]);
				return (target - self.start) / span;
			},
			duration: { min: 0.2, max: 0.6 },
			delay: 0.1,
			ease: 'power2.inOut',
			inertia: false,
		},
	});
}

let mm = null;
let reduceMotion = false;

function setup() {
	beats = [];
	freeRanges = [];
	mm = gsap.matchMedia();
	mm.add({ always: '(min-width: 0px)', reduceMotion: '(prefers-reduced-motion: reduce)' }, (context) => {
		reduceMotion = context.conditions.reduceMotion;
		acts.forEach((panel, i) => buildAct(panel, i === acts.length - 1));
		// Reduced motion keeps the scroll-linked cards (they move only as the
		// reader scrolls) but drops motion the page starts on its own.
		if (!reduceMotion) createSnap();
		ScrollTrigger.refresh();
	});
}

// Rebuild everything from current layout, keeping the reader on the same beat.
function rebuild() {
	const beat = currentBeat();
	const offset = beat ? window.scrollY - beatPosition(beat) : 0;
	navTween?.kill();
	navTween = null;
	mm?.revert();
	setup();
	const same = beat && beatById(beat.id);
	if (same) window.scrollTo(0, beatPosition(same) + offset);
	updateChrome();
}

function restoreHash() {
	const beat = beatById(decodeURIComponent(window.location.hash.slice(1)));
	if (beat) window.scrollTo(0, beatPosition(beat));
}

history.scrollRestoration = 'manual';
setup();
restoreHash();

// Images and video metadata change scene heights after first layout.
window.addEventListener('load', () => {
	rebuild();
	restoreHash();
});

let lastWidth = window.innerWidth;
let lastHeight = window.innerHeight;
let resizeTimer = null;
window.addEventListener('resize', () => {
	clearTimeout(resizeTimer);
	resizeTimer = setTimeout(() => {
		const widthChanged = window.innerWidth !== lastWidth;
		const heightChanged = Math.abs(window.innerHeight - lastHeight) > 120;
		if (!widthChanged && !heightChanged) return;
		lastWidth = window.innerWidth;
		lastHeight = window.innerHeight;
		rebuild();
	}, 200);
});

// The hash names the current beat, so a reload during rehearsal lands on it.
ScrollTrigger.addEventListener('scrollEnd', () => {
	const beat = currentBeat();
	const hash = beat ? `#${beat.id}` : '';
	if (beat && window.location.hash !== hash) history.replaceState(null, '', hash);
});

// Next stop in a direction. Inside a tall scene, page through it one
// viewport at a time before moving on.
function nextStop(from, direction) {
	const stops = stopPositions();
	if (direction === 'first') return stops[0];
	if (direction === 'last') return stops.at(-1);
	const range = freeRangePositions().find((r) =>
		direction > 0 ? from >= r.from - 2 && from < r.to - 2 : from > r.from + 2 && from <= r.to + 2,
	);
	if (range) {
		return direction > 0 ? Math.min(from + window.innerHeight, range.to) : Math.max(from - window.innerHeight, range.from);
	}
	return direction > 0 ? stops.find((stop) => stop > from + 2) : stops.findLast((stop) => stop < from - 2);
}

function moveTo(y) {
	const target = Math.max(0, Math.min(y, ScrollTrigger.maxScroll(window)));
	navTween?.kill();
	if (reduceMotion) {
		navTween = null;
		window.scrollTo(0, target);
		return;
	}
	navTarget = target;
	const proxy = { y: window.scrollY };
	navTween = gsap.to(proxy, {
		y: target,
		duration: 0.9,
		ease: 'power2.inOut',
		onUpdate: () => window.scrollTo(0, proxy.y),
		onComplete: () => {
			navTween = null;
		},
	});
}

// Manual scrolling takes over from a key tween immediately.
['wheel', 'touchstart', 'pointerdown'].forEach((type) =>
	window.addEventListener(
		type,
		() => {
			navTween?.kill();
			navTween = null;
		},
		{ passive: true },
	),
);

const notesToggle = document.getElementById('notes-toggle');
const notesDrawer = document.getElementById('notes-drawer');
const notesDrawerContent = document.getElementById('notes-drawer-content');

const KEY_BLOCKING_TAGS = ['INPUT', 'TEXTAREA', 'SELECT', 'VIDEO', 'AUDIO'];

function keysBlocked() {
	const active = document.activeElement;
	if (!active) return false;
	if (KEY_BLOCKING_TAGS.includes(active.tagName) || active.isContentEditable) return true;
	return notesDrawer.classList.contains('is-open') && notesDrawer.contains(active);
}

const FORWARD_KEYS = ['ArrowDown', 'ArrowRight', 'PageDown'];
const BACK_KEYS = ['ArrowUp', 'ArrowLeft', 'PageUp'];

// Clicker-friendly: most presentation remotes send PageUp/PageDown. A press
// mid-move continues from where that move was headed, so quick presses
// advance several beats in one continuous motion.
window.addEventListener('keydown', (event) => {
	if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
	if (keysBlocked()) return;

	let direction = null;
	if (FORWARD_KEYS.includes(event.key) || (event.key === ' ' && !event.shiftKey)) direction = 1;
	else if (BACK_KEYS.includes(event.key) || (event.key === ' ' && event.shiftKey)) direction = -1;
	else if (event.key === 'Home') direction = 'first';
	else if (event.key === 'End') direction = 'last';
	if (direction === null) return;

	event.preventDefault();
	const from = navTween ? navTarget : window.scrollY;
	const target = nextStop(from, direction);
	if (target !== undefined) moveTo(target);
});

let currentSceneNotes = null;

function renderDrawer() {
	notesDrawerContent.textContent = currentSceneNotes || 'No notes for this section.';
}

let currentScene;

function updateCurrentScene() {
	const scene = currentBeat()?.scene ?? null;
	if (scene === currentScene) return;
	currentScene = scene;
	const notesEl = scene?.querySelector('aside.notes');
	currentSceneNotes = notesEl ? notesEl.textContent.trim() : null;
	if (notesDrawer.classList.contains('is-open')) renderDrawer();
}

const actNames = new Map(acts.map((panel) => [panel, panel.querySelector('.act-title')?.textContent ?? 'Hypothesis']));

// Each act card carries its own tab, so it scrolls in and away with the card.
const actTabs = new Map(
	acts.map((panel) => {
		const tab = document.createElement('span');
		tab.className = 'act-tab';
		tab.setAttribute('aria-hidden', 'true');
		panel.append(tab);
		return [panel, tab];
	}),
);

// A tab reads "Act name—3/8 07/42": the scene within its act (not on openers
// or the title slide), then the frame within the talk. Frames are act openers
// and scenes, not reveal steps. The current card's tab shows the current
// frame; cards stacked beneath keep their last frame, cards yet to arrive show
// their first. The top-band chrome takes the current act's colour.
function tabText(frame, index, total) {
	const dash = '<span class="em-dash">—</span>';
	const sceneCount = frame.scene?.dataset.kickerNumber ? `${frame.scene.dataset.kickerNumber} ` : '';
	const page = `${String(index + 1).padStart(2, '0')}/${total}`;
	// words in the meta face, dash and numbers in sub-meta, as "—London 2026"
	return `${actNames.get(frame.trigger.trigger)}<span class="sub-meta">${dash}${sceneCount}${page}</span>`;
}

function updateChrome() {
	const frames = beats.filter((beat) => beat.id.split('/').length < 3);
	let index = 0;
	frames.forEach((frame, i) => {
		if (beatPosition(frame) <= window.scrollY + 2) index = i;
	});
	const current = frames[index];
	if (!current) return;
	const currentAct = acts.indexOf(current.trigger.trigger);
	acts.forEach((panel, k) => {
		const own = frames.map((frame, i) => ({ frame, i })).filter(({ frame }) => frame.trigger.trigger === panel);
		if (!own.length) return;
		const pick = k === currentAct ? { frame: current, i: index } : k < currentAct ? own.at(-1) : own[0];
		const html = tabText(pick.frame, pick.i, frames.length);
		const tab = actTabs.get(panel);
		if (tab.innerHTML !== html) tab.innerHTML = html;
	});
	document.body.dataset.currentAct = current.trigger.trigger.dataset.act;
}

window.addEventListener('scroll', () => {
	updateCurrentScene();
	updateChrome();
}, { passive: true });
updateChrome();

notesToggle.addEventListener('click', () => {
	const isOpen = notesDrawer.classList.toggle('is-open');
	notesToggle.setAttribute('aria-expanded', String(isOpen));
	if (isOpen) {
		updateCurrentScene();
		renderDrawer();
	}
	// Hand focus back to the page so the arrow keys keep navigating.
	notesToggle.blur();
});

if (import.meta.env?.DEV) {
	window.__deck = { beats: () => beats, freeRanges: () => freeRanges, stops: stopPositions, ScrollTrigger };
}
