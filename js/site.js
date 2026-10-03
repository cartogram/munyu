import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
// Resizes are handled by rebuild() below, which keeps the reader on the same
// beat; ScrollTrigger's own resize refresh would shift positions first.
ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load' });

// Scenes that hold while they play one step per beat. Each step adds its
// tweens to the act timeline within `hold` px of scroll; the beat lands once
// they've finished.
const STEPPED_SCENES = {
	'todays-model': todaysModelSteps,
	'your-ui-is-not-my-ui-create-specific': (scene) => rotatorSteps(scene.querySelector('ul')),
	'demo-two-people': (scene) => [...scene.querySelectorAll('.demo-panel')].map(fadeInStep),
};
const STEP_HOLD = 0.5; // scroll per reveal step, as a fraction of the card height
const STEP_FADE = 0.1; // share of a step spent fading its piece in

function fadeInStep(piece) {
	return (tl, hold) => tl.fromTo(piece, { opacity: 0 }, { opacity: 1, duration: hold * STEP_FADE, ease: 'none' });
}

// Today's model: the base interface arrives, then each tool drops onto the
// stack as its own pane (dark mode, screen reader, high contrast,
// magnification). On the last beat they jostle and slide out of register,
// none aware of the others, and the magnifier drifts off what it was
// showing. Reduced motion keeps the beats but fades each pane in place and
// shows the conflict without moving anything.
function todaysModelSteps(scene) {
	const piece = (name) => scene.querySelector(`[data-piece="${name}"]`);
	const layers = ['dark', 'screen-reader', 'contrast', 'magnifier'].map(piece);
	const [dark, screenReader, contrast, magnifier] = layers;

	const arrive = (target, from) => (tl, hold) => {
		if (reduceMotion) return fadeInStep(target)(tl, hold);
		tl.fromTo(target, { opacity: 0, ...from }, { opacity: 1, y: 0, duration: hold * 0.5, ease: 'back.out(1.2)' });
	};

	// the conflict moves each tool's pane, not its label, so the labels stay
	// lined up while the panes slip out of register
	const pane = (layer) => layer.querySelector('.stack-pane');

	const conflict = (tl, hold) => {
		tl.fromTo(piece('conflict'), { opacity: 0 }, { opacity: 1, duration: hold * 0.2, ease: 'none' });
		if (reduceMotion) return;
		// a jostle, each pane nudged its own way, then each settles out of
		// line with the interface beneath
		tl.to(
			layers.map(pane),
			{ x: (i) => (i % 2 ? 6 : -6), duration: hold * 0.05, ease: 'sine.inOut', yoyo: true, repeat: 3 },
			'<',
		)
			.to(pane(dark), { x: -34, y: 6, duration: hold * 0.3, ease: 'power2.out' })
			.to(pane(screenReader), { x: 28, y: -4, duration: hold * 0.3, ease: 'power2.out' }, '<')
			.to(pane(contrast), { x: -18, y: 10, duration: hold * 0.3, ease: 'power2.out' }, '<')
			.to(pane(magnifier), { x: 70, y: -26, duration: hold * 0.35, ease: 'power2.out' }, '<');
	};

	return [
		arrive(piece('base'), { y: 40 }),
		...layers.map((layer) => arrive(layer, { y: -120 })),
		conflict,
	];
}

// A list whose items share their opening words, shown as one line: the shared
// words hold still and the endings rotate through a mask, one per beat, each
// sliding up out as the next rises in. The list stays in the page,
// visually hidden, for screen readers; the line is hidden from them.
function rotatorSteps(list) {
	const line = list.previousElementSibling?.classList.contains('rotator') ? list.previousElementSibling : buildRotator(list);
	const endings = [...line.querySelectorAll('.rotator-ending')];

	// all but the first ending wait below the mask (or, with reduced motion,
	// invisible in place)
	const hidden = reduceMotion ? { opacity: 0 } : { yPercent: 110 };
	gsap.set(endings.slice(1), hidden);

	return endings.slice(1).map((incoming, i) => (tl, hold) => {
		const outgoing = endings[i];
		if (reduceMotion) {
			tl.to(outgoing, { opacity: 0, duration: hold * 0.15, ease: 'none' }).fromTo(
				incoming,
				{ opacity: 0 },
				{ opacity: 1, duration: hold * 0.15, ease: 'none' },
			);
			return;
		}
		tl.to(outgoing, { yPercent: -110, duration: hold * 0.25, ease: 'power2.in' }).fromTo(
			incoming,
			{ yPercent: 110 },
			{ yPercent: 0, duration: hold * 0.5, ease: 'expo.out' },
			`<+=${hold * 0.12}`,
		);
	});
}

function buildRotator(list) {
	const items = [...list.querySelectorAll('li')].map((li) => li.textContent.trim().split(/\s+/));
	let shared = 0;
	while (items.every((words) => shared < words.length - 1 && words[shared] === items[0][shared])) shared += 1;

	const line = document.createElement('p');
	line.className = 'rotator';
	line.setAttribute('aria-hidden', 'true');
	const slot = document.createElement('span');
	slot.className = 'rotator-slot';
	items.forEach((words) => {
		const ending = document.createElement('span');
		ending.className = 'rotator-ending';
		ending.textContent = words.slice(shared).join(' ');
		slot.append(ending);
	});
	line.append(`${items[0].slice(0, shared).join(' ')} `, slot);
	list.before(line);
	list.classList.add('visually-hidden');
	return line;
}

const acts = gsap.utils.toArray('main .act-panel');

// Cards stack: act k sits k × --stack-step further in from the top and left
// than the first, so earlier cards' corners show behind the current one.
// --stacks lets css/talk.css size each card's corner to nest with the rest.
acts.forEach((panel, k) => panel.style.setProperty('--stack', k));
document.documentElement.style.setProperty('--stacks', acts.length);

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

// Each slide's video shows as a round "Play video" button in the slide's
// top-right corner: its label three times round a circle, turning
// (css/talk.css).
// Pressing it plays the video in the spotlight (openSpotlight, below). The
// video stays inside, unseen, for its source and where it was left off.
const RING_R = 42; // the label's circle (its baseline), in the ring's 100 × 100 viewBox
const playRing = (id) => `<svg class="video-play-ring" viewBox="0 0 100 100" aria-hidden="true">
	<path id="${id}" fill="none" d="M50 ${50 - RING_R}a${RING_R} ${RING_R} 0 1 1 0 ${2 * RING_R}a${RING_R} ${RING_R} 0 1 1 0 ${-2 * RING_R}" />
	<text><textPath href="#${id}" textLength="${(2 * Math.PI * RING_R).toFixed(1)}" lengthAdjust="spacing">Play video • Play video • Play video •</textPath></text>
</svg>`;

document.querySelectorAll('main video').forEach((video, i) => {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'video-play';
	button.dataset.title = video.closest('section[data-scene]')?.querySelector('h2')?.textContent.trim() ?? '';
	button.setAttribute('aria-label', button.dataset.title ? `Play video: ${button.dataset.title}` : 'Play video');
	video.removeAttribute('controls');
	video.replaceWith(button);
	button.innerHTML = playRing(`video-play-ring-${i}`);
	button.append(video);
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
	const opener = panel.querySelector('.act-opener');
	const actBeats = opener ? [{ id: act, scene: null, opener, time: 0 }] : [];
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

		const steps = STEPPED_SCENES[scene.dataset.scene]?.(scene) ?? [];
		steps.forEach((step, i) => {
			const hold = cardHeight * STEP_HOLD;
			const start = tl.duration();
			step(tl, hold);
			// Pad to a full hold so every beat is the same scroll distance.
			tl.to({}, { duration: Math.max(0, start + hold - tl.duration()) });
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
function beatAt(y) {
	let current = beats[0];
	for (const beat of beats) {
		if (beatPosition(beat) > y + 2) break;
		current = beat;
	}
	return current;
}

const currentBeat = () => beatAt(window.scrollY);

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
	closeSpotlight();
	// Pins are measured from the cards' layout, so take off the drawer's push
	// and shrink while they're rebuilt, then put them back (the drawer may
	// have resized).
	drawerTl?.progress(1);
	gsap.set(document.body, { '--drawer-push': '0px', '--drawer-scale': 1 });
	mm?.revert();
	setup();
	gsap.set(document.body, drawerVars());
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
// Stepping and scrolling only keep the current history entry's hash up to
// date; deliberate jumps (jumpTo, below) add entries of their own.
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
	if (target === undefined) return;
	if (typeof direction === 'string') jumpTo(target);
	else moveTo(target);
});

// A deliberate jump (from the index, or Home and End) gets its own history
// entry, as following a link would, so Back returns to where it started.
// The entry being left is brought up to date first, since scrolling only
// updates it once the scroll settles.
function jumpTo(y) {
	const here = beatAt(navTween ? navTarget : window.scrollY);
	const there = beatAt(y);
	if (here) history.replaceState(null, '', `#${here.id}`);
	if (there && there !== here) history.pushState(null, '', `#${there.id}`);
	moveTo(y);
}

// Back and Forward glide to the beat their entry names.
window.addEventListener('popstate', () => {
	const beat = beatById(decodeURIComponent(window.location.hash.slice(1)));
	if (beat) moveTo(beatPosition(beat));
});

let currentSceneNotes = null;

// One paragraph per <p> or <li> in the scene's notes (or the notes' whole text).
function renderDrawer() {
	const paragraphs = currentSceneNotes
		? [...(currentSceneNotes.querySelectorAll('p, li').length ? currentSceneNotes.querySelectorAll('p, li') : [currentSceneNotes])]
		: [];
	const texts = paragraphs.map((el) => el.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
	notesDrawerContent.replaceChildren(
		...(texts.length ? texts : ['No notes for this section.']).map((text) => {
			const p = document.createElement('p');
			p.textContent = text;
			return p;
		}),
	);
}

let currentScene;

function updateCurrentScene() {
	const beat = currentBeat();
	// an act opener can carry notes of its own, like a scene
	const scene = beat?.scene ?? beat?.opener ?? null;
	if (scene === currentScene) return;
	currentScene = scene;
	currentSceneNotes = scene?.querySelector('aside.notes') ?? null;
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

// A tab shows the act's name. Frames are act openers and scenes, not reveal
// steps. The current card's tab shows the current
// frame; cards stacked beneath keep their last frame, cards yet to arrive show
// their first. The top-band chrome takes the current act's colour.
function tabText(frame) {
	return actNames.get(frame.trigger.trigger);
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
		if (own.length < 2) return;
		let pick = k === currentAct ? { frame: current, i: index } : k < currentAct ? own.at(-1) : own[0];
		// the tab belongs to the act's second slide onward, so on the first it
		// already shows the second's details as it travels in with it
		if (pick.frame === own[0].frame) pick = own[1];
		const html = tabText(pick.frame);
		const tab = actTabs.get(panel);
		if (tab.innerHTML !== html) tab.innerHTML = html;
		// Not on an act's first slide (the title, or the opener): the tab rides
		// in with the second slide as it slides in from the right, then sticks
		// at the card's centre while the later slides pass beneath it.
		const second = own[1].frame.scene;
		const shift = Math.max(0, second.getBoundingClientRect().left - panel.getBoundingClientRect().left);
		tab.style.setProperty('--tab-shift', `${Math.round(shift)}px`);
	});
	document.body.dataset.currentAct = current.trigger.trigger.dataset.act;
}

// The drawer's index: every act and its scenes, in order. Entries link to
// their frame's beat id; an act without an opener (the first, which opens on
// the talk title) lists its scenes without an act heading.
const tocList = document.getElementById('drawer-toc');
const tocLinks = new Map(); // beat id → link
const frameNames = new Map(); // beat id → { title, number }, e.g. Melody, 2.2

function tocLink(id, label, className) {
	const link = document.createElement('a');
	link.className = className;
	link.href = `#${id}`;
	link.textContent = label;
	link.addEventListener('click', (event) => {
		event.preventDefault();
		const beat = beatById(id);
		if (beat) jumpTo(beatPosition(beat));
		// a mouse click hands focus back to the page so the arrow keys keep
		// navigating; keyboard activation keeps focus in the list
		if (event.detail > 0) link.blur();
	});
	tocLinks.set(id, link);
	return link;
}

// Acts count from 1 and scenes within an act from 1; an act opener is just
// its act's number.
acts.forEach((panel, k) => {
	const act = panel.dataset.act;
	const item = document.createElement('li');
	item.style.setProperty('--act-color', getComputedStyle(panel).getPropertyValue('--act-color'));
	const name = actNames.get(panel);
	if (panel.querySelector('.act-opener')) {
		item.append(tocLink(act, name, 'toc-act toc-link'));
		frameNames.set(act, { title: name, number: `${k + 1}` });
	}
	const scenes = document.createElement('ol');
	panel.querySelectorAll('section[data-scene]').forEach((scene, i) => {
		// the h2 is a scene's title
		const heading = scene.querySelector('h2') ?? scene.querySelector('h1, h3');
		// read as a screen reader would: without what's hidden from one (a
		// rotating headline's endings)
		const read = heading?.cloneNode(true);
		read?.querySelectorAll('[aria-hidden="true"]').forEach((el) => el.remove());
		const label = read?.textContent.replace(/\s+/g, ' ').trim() || scene.dataset.scene.replace(/-/g, ' ');
		const id = `${act}/${scene.dataset.scene}`;
		const entry = document.createElement('li');
		entry.append(tocLink(id, label, 'toc-link'));
		scenes.append(entry);
		frameNames.set(id, { title: label, number: `${k + 1}.${i + 1}` });
	});
	item.append(scenes);
	tocList.append(item);
});

let activeTocLink = null;

// Centres a link in whichever part of the drawer scrolls. Not scrollIntoView,
// which would also scroll the page off its beat.
function centreInDrawer(link) {
	const column = link.closest('.drawer-column');
	const scroller = column.scrollHeight > column.clientHeight ? column : notesDrawer;
	const box = scroller.getBoundingClientRect();
	const target = link.getBoundingClientRect();
	scroller.scrollTop += target.top - box.top - (box.height - target.height) / 2;
}

const drawerSlide = document.getElementById('drawer-slide');
let drawerSlideId = null;

// Marks the current frame (act opener or scene, not a reveal step) in the
// index, and names it over the notes in the chrome's meta style:
// "Melody—2.2".
function updateToc() {
	const id = currentBeat()?.id.split('/').slice(0, 2).join('/');
	const frame = frameNames.get(id);
	if (frame && id !== drawerSlideId) {
		drawerSlideId = id;
		const number = document.createElement('span');
		number.className = 'sub-meta';
		number.innerHTML = '<span class="em-dash">—</span>';
		number.append(frame.number);
		drawerSlide.replaceChildren(frame.title, number);
	}
	const link = tocLinks.get(id) ?? null;
	if (link === activeTocLink) return;
	activeTocLink?.removeAttribute('aria-current');
	link?.setAttribute('aria-current', 'true');
	activeTocLink = link;
	if (link && notesDrawer.classList.contains('is-open')) centreInDrawer(link);
}

window.addEventListener('scroll', () => {
	updateCurrentScene();
	updateChrome();
	updateToc();
}, { passive: true });
updateChrome();
updateToc();

// The drawer sits still under the deck, against the left edge; opening it
// shrinks the act cards into the room beside it (--drawer-scale, read by
// css/talk.css) so the whole slide stays in view, and closing grows them back
// over it. On a phone the drawer fills the window, so the cards slide right
// by its width (--drawer-push) instead.
const drawerIcon = notesToggle.querySelector('svg');
const phone = window.matchMedia('(max-width: 699px)');
const drawerIsOpen = () => notesDrawer.classList.contains('is-open');
const drawerPush = () => (drawerIsOpen() && phone.matches ? notesDrawer.offsetWidth : 0);
const drawerScale = () => (drawerIsOpen() && !phone.matches ? 1 - notesDrawer.offsetWidth / document.documentElement.clientWidth : 1);
const drawerVars = () => ({ '--drawer-push': `${drawerPush()}px`, '--drawer-scale': drawerScale() });

// A fresh timeline per toggle. The cards' push and the icon tween from
// wherever they are, so an interrupted toggle turns around smoothly.
let drawerTl = null;

function setDrawerOpen(isOpen) {
	notesDrawer.classList.toggle('is-open', isOpen);
	notesToggle.setAttribute('aria-expanded', String(isOpen));
	if (isOpen) {
		closeSpotlight();
		updateCurrentScene();
		renderDrawer();
	}

	drawerTl?.kill();
	const speed = reduceMotion ? 0 : 1;
	drawerTl = gsap.timeline({ defaults: { duration: 0.5 * speed }, onUpdate: updateCursor });
	if (isOpen) {
		drawerTl
			.set(notesDrawer, { visibility: 'visible' })
			.to(document.body, { ...drawerVars(), ease: 'expo.out', duration: 0.6 * speed }, 0)
			.to(drawerIcon, { rotation: 45, ease: 'power3.out', duration: 0.4 * speed }, 0);
		if (activeTocLink) centreInDrawer(activeTocLink);
	} else {
		drawerTl
			// eased out as well as in, so the slides settle back rather than snap
			.to(document.body, { ...drawerVars(), ease: 'power3.inOut', duration: 0.6 * speed }, 0)
			.to(drawerIcon, { rotation: 0, ease: 'power2.inOut', duration: 0.3 * speed }, 0)
			// hidden once covered, so its links leave the tab order
			.set(notesDrawer, { visibility: 'hidden' });
	}
	updateCursor();
}

notesToggle.addEventListener('click', () => {
	setDrawerOpen(!notesDrawer.classList.contains('is-open'));
	// Hand focus back to the page so the arrow keys keep navigating.
	notesToggle.blur();
});

// The pointer over the deck: a → on an act opener, a ▶ on a video, and a ×
// anywhere over the cards while the drawer is open, or around a spotlit
// video, where a click closes it. Elsewhere, and for touch, the system cursor.
const deckCursor = document.getElementById('deck-cursor');
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
let pointer = null; // the mouse's last { x, y }, or null once it's left the window

function cursorIcon(target) {
	if (!target?.closest('.act-panel')) return '';
	if (notesDrawer.classList.contains('is-open')) return 'close';
	// the spotlit video and its close button keep the system cursor
	if (spotlight?.el.contains(target)) return target.closest('video, button') ? '' : 'close';
	if (target.closest('.video-play')) return 'play';
	return target.closest('.act-opener') ? 'next' : '';
}

// Hit-tested afresh on scroll and as the cards slide, since the deck moves
// under a still pointer.
function updateCursor() {
	const icon = pointer && finePointer.matches ? cursorIcon(document.elementFromPoint(pointer.x, pointer.y)) : '';
	if (deckCursor.dataset.icon !== icon) deckCursor.dataset.icon = icon;
	document.documentElement.classList.toggle('has-deck-cursor', icon !== '');
	if (pointer) deckCursor.style.translate = `${pointer.x}px ${pointer.y}px`;
}

window.addEventListener('pointermove', (event) => {
	if (event.pointerType !== 'mouse') return;
	pointer = { x: event.clientX, y: event.clientY };
	updateCursor();
}, { passive: true });
document.documentElement.addEventListener('pointerleave', () => {
	pointer = null;
	updateCursor();
});
window.addEventListener('scroll', updateCursor, { passive: true });

// A click on the cards closes the open drawer or spotlight; on a video, it
// opens the spotlight; on an act opener, it moves on to the next beat, as the
// → says. Captured, so nothing in the cards (links, video) acts on it too.
// Keyboard presses of the video's button come through here as well.
document.addEventListener('click', (event) => {
	const icon = cursorIcon(event.target);
	if (!icon) return;
	event.preventDefault();
	event.stopPropagation();
	if (icon === 'close') {
		if (notesDrawer.classList.contains('is-open')) setDrawerOpen(false);
		else closeSpotlight();
	} else if (icon === 'play') {
		openSpotlight(event.target.closest('.video-play'), event.detail === 0);
	} else {
		const target = nextStop(navTween ? navTarget : window.scrollY, 1);
		if (target !== undefined) moveTo(target);
	}
}, { capture: true });

// The spotlight plays a slide's video over the whole act card, as large as
// fits, growing out of its panel and shrinking back into it. It closes with
// its ×, Escape, a click on the ground around the video, or any scroll.
let spotlight = null; // { el, video, panel, layout, scrollY, tl, fromKeyboard }

function spotlightLayout(el, ratio) {
	const box = el.getBoundingClientRect();
	// clears the × in the corner
	const pad = Math.max(56, Math.min(box.width, box.height) * 0.06);
	const width = Math.min(box.width - 2 * pad, (box.height - 2 * pad) * ratio);
	const height = width / ratio;
	return { box, width, height, left: (box.width - width) / 2, top: (box.height - height) / 2 };
}

// The transform that shrinks the spotlit video onto its panel, as wide as
// the panel and centred on it.
function onPanel(panel, layout) {
	const rect = panel.getBoundingClientRect();
	const scale = rect.width / layout.width;
	return {
		x: rect.left + rect.width / 2 - layout.box.left - layout.left - (layout.width * scale) / 2,
		y: rect.top + rect.height / 2 - layout.box.top - layout.top - (layout.height * scale) / 2,
		scale,
	};
}

function openSpotlight(panel, fromKeyboard) {
	if (spotlight) return;
	const source = panel.querySelector('video');
	const el = document.createElement('div');
	el.className = 'video-spotlight';
	el.setAttribute('role', 'dialog');
	el.setAttribute('aria-modal', 'true');
	el.setAttribute('aria-label', panel.dataset.title ? `Video: ${panel.dataset.title}` : 'Video');
	const backdrop = document.createElement('div');
	backdrop.className = 'spotlight-backdrop';
	const video = document.createElement('video');
	video.src = source.currentSrc || source.src;
	video.controls = true;
	video.playsInline = true;
	video.currentTime = source.currentTime; // picks up where it was closed
	const close = document.createElement('button');
	close.type = 'button';
	close.className = 'spotlight-close';
	close.setAttribute('aria-label', 'Close video');
	close.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" /></svg>';
	close.addEventListener('click', closeSpotlight);
	el.append(backdrop, video, close);
	panel.closest('.act-panel').append(el);

	const layout = spotlightLayout(el, source.videoWidth / source.videoHeight || 16 / 9);
	gsap.set(video, { width: layout.width, height: layout.height, left: layout.left, top: layout.top });
	const speed = reduceMotion ? 0 : 1;
	const tl = gsap.timeline();
	tl.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.35 * speed, ease: 'power2.out' }, 0)
		.fromTo(close, { opacity: 0 }, { opacity: 1, duration: 0.3 * speed }, 0.2 * speed);
	if (reduceMotion) tl.fromTo(video, { opacity: 0 }, { opacity: 1, duration: 0 }, 0);
	else {
		tl.fromTo(video, onPanel(panel, layout), { x: 0, y: 0, scale: 1, duration: 0.6, ease: 'expo.out' }, 0)
			.fromTo(video, { opacity: 0 }, { opacity: 1, duration: 0.15 }, 0);
	}

	spotlight = { el, video, panel, layout, scrollY: window.scrollY, tl, fromKeyboard };
	video.play().catch(() => {});
	video.focus({ preventScroll: true });
	updateCursor();
}

function closeSpotlight() {
	if (!spotlight) return;
	const { el, video, panel, layout, tl, fromKeyboard } = spotlight;
	spotlight = null;
	video.pause();
	panel.querySelector('video').currentTime = video.currentTime;
	el.style.pointerEvents = 'none';
	const hadFocus = el.contains(document.activeElement);
	if (hadFocus && fromKeyboard) panel.focus({ preventScroll: true });
	else if (hadFocus) document.activeElement.blur();

	tl.kill();
	const speed = reduceMotion ? 0 : 1;
	const out = gsap.timeline({ onComplete: () => el.remove() });
	out.to(el.querySelectorAll('.spotlight-backdrop, .spotlight-close'), { opacity: 0, duration: 0.35 * speed, ease: 'power2.in' }, 0);
	if (reduceMotion) out.to(video, { opacity: 0, duration: 0 }, 0);
	else {
		out.to(video, { ...onPanel(panel, layout), duration: 0.45, ease: 'power3.inOut' }, 0)
			.to(video, { opacity: 0, duration: 0.12 }, 0.33);
	}
	updateCursor();
}

window.addEventListener('scroll', () => {
	if (spotlight && Math.abs(window.scrollY - spotlight.scrollY) > 2) closeSpotlight();
}, { passive: true });

window.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && spotlight) closeSpotlight();
});

// N opens and closes the notes and index, as the + does. Ignored while typing
// in a field or playing a video, where the key means something else.
window.addEventListener('keydown', (event) => {
	if (event.key.toLowerCase() !== 'n' || event.repeat || event.defaultPrevented) return;
	if (event.metaKey || event.ctrlKey || event.altKey || spotlight) return;
	const active = document.activeElement;
	if (active && (KEY_BLOCKING_TAGS.includes(active.tagName) || active.isContentEditable)) return;
	event.preventDefault();
	setDrawerOpen(!notesDrawer.classList.contains('is-open'));
});

window.addEventListener('keydown', (event) => {
	if (event.key !== 'Escape' || !notesDrawer.classList.contains('is-open')) return;
	const hadFocus = notesDrawer.contains(document.activeElement);
	setDrawerOpen(false);
	if (hadFocus) notesToggle.focus();
});

if (import.meta.env?.DEV) {
	window.__deck = { beats: () => beats, freeRanges: () => freeRanges, stops: stopPositions, ScrollTrigger };
}
