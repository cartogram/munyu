import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

// Scenes that hold while their pieces appear one per beat, in DOM order.
const STEPPED_SCENES = {
	'todays-model': (scene) => scene.querySelectorAll('.diagram-piece'),
	'demo-two-people': (scene) => scene.querySelectorAll('.demo-panel'),
};
const STEP_HOLD = 0.5; // scroll per reveal step, as a fraction of the card height
const STEP_FADE = 0.1; // share of a step spent fading its piece in

const acts = gsap.utils.toArray('main .act-panel');

// Rebuilt with every setup(). A beat's scroll position is its trigger's start
// plus its timeline time: durations are in scroll pixels, so 1s = 1px.
let beats = []; // { id, scene, trigger, time }
let freeRanges = []; // { trigger, from, to } — tall scenes, scrolled through freely

// One timeline per act: fake-scroll the inner content up to each scene, hold
// for stepped reveals, then (except for the last act) hold one card height
// while the next card slides over. The act is pinned for the whole timeline;
// no scene inside it is pinned on its own, so nothing ever sits inside a
// transformed ancestor.
function buildAct(panel, isLast) {
	const inner = panel.querySelector('.act-panel-inner');
	const act = panel.dataset.act;
	const cardHeight = panel.clientHeight;
	const maxOffset = Math.max(0, inner.offsetHeight - cardHeight);
	const tl = gsap.timeline();
	const actBeats = [{ id: act, scene: null, time: 0 }];
	const actRanges = [];
	let offset = 0;

	const scrollInnerTo = (target) => {
		if (target <= offset) return;
		tl.to(inner, { y: -target, duration: target - offset, ease: 'none' });
		offset = target;
	};

	panel.querySelectorAll('section[data-scene]').forEach((scene) => {
		const id = `${act}/${scene.dataset.scene}`;
		scrollInnerTo(Math.min(scene.offsetTop, maxOffset));
		actBeats.push({ id, scene, time: tl.duration() });

		const pieces = STEPPED_SCENES[scene.dataset.scene]?.(scene) ?? [];
		pieces.forEach((piece, i) => {
			const hold = cardHeight * STEP_HOLD;
			tl.fromTo(piece, { opacity: 0 }, { opacity: 1, duration: hold * STEP_FADE, ease: 'none' });
			tl.to({}, { duration: hold * (1 - STEP_FADE) });
			actBeats.push({ id: `${id}/${i + 1}`, scene, time: tl.duration() });
		});

		const bottom = Math.min(scene.offsetTop + scene.offsetHeight - cardHeight, maxOffset);
		if (bottom > offset + 1) {
			const from = tl.duration();
			scrollInnerTo(bottom);
			actRanges.push({ from, to: tl.duration() });
		}
	});
	scrollInnerTo(maxOffset);

	const travel = tl.duration();
	if (!isLast) {
		// pinSpacing is off so the next card overlaps; this margin delays its
		// arrival until the inner content has finished fake-scrolling.
		gsap.set(panel, { marginBottom: travel });
		tl.to({}, { duration: cardHeight });
	}

	const trigger = ScrollTrigger.create({
		trigger: panel,
		start: 'top top',
		end: `+=${tl.duration()}`,
		pin: true,
		pinSpacing: isLast,
		scrub: true,
		animation: tl,
	});

	actBeats.forEach((beat) => beats.push({ ...beat, trigger }));
	actRanges.forEach((range) => freeRanges.push({ ...range, trigger }));
}

let mm = null;

function setup() {
	beats = [];
	freeRanges = [];
	mm = gsap.matchMedia();
	mm.add({ always: '(min-width: 0px)', reduceMotion: '(prefers-reduced-motion: reduce)' }, () => {
		acts.forEach((panel, i) => buildAct(panel, i === acts.length - 1));
		ScrollTrigger.refresh();
	});
}

function rebuild() {
	mm?.revert();
	setup();
}

setup();

// Images and video metadata change scene heights after first layout.
window.addEventListener('load', rebuild);

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

const notesToggle = document.getElementById('notes-toggle');
const notesDrawer = document.getElementById('notes-drawer');
const notesDrawerContent = document.getElementById('notes-drawer-content');

let currentSceneNotes = null;

function renderDrawer() {
	notesDrawerContent.textContent = currentSceneNotes || 'No notes for this section.';
}

const beatPosition = (beat) => beat.trigger.start + beat.time;

// Beats are pushed act by act in timeline order, so they're sorted by position.
function currentBeat() {
	let current = beats[0];
	for (const beat of beats) {
		if (beatPosition(beat) > window.scrollY + 2) break;
		current = beat;
	}
	return current;
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

window.addEventListener('scroll', updateCurrentScene, { passive: true });

notesToggle.addEventListener('click', () => {
	const isOpen = notesDrawer.classList.toggle('is-open');
	notesToggle.setAttribute('aria-expanded', String(isOpen));
	if (isOpen) {
		updateCurrentScene();
		renderDrawer();
	}
});

if (import.meta.env?.DEV) {
	window.__deck = { beats: () => beats, freeRanges: () => freeRanges, ScrollTrigger };
}
