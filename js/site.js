import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import branchingArtSvg from '../media/personas/demo-two-people.svg?raw';
import todaysModelSvg from '../media/personas/todays-model.svg?raw';
import backToSarahSvg from '../media/personas/back-to-sarah.svg?raw';

gsap.registerPlugin(ScrollTrigger, SplitText);
// Resizes are handled by rebuild() below, which keeps the reader on the same
// beat; ScrollTrigger's own resize refresh would shift positions first.
ScrollTrigger.config({ ignoreMobileResize: true, autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load' });

// Phones get the lite deck (set in index.html's head): the cards lie one
// under another in the page's flow and scroll natively, with no pins, scrubbed
// builds, snapping or title intro. Each build shows whole, its illustration a
// still WebP. The beats, index, notes, keys and hash all work as before.
const lite = document.documentElement.classList.contains('is-lite');

// The event in the top band: WeyWeyWeb as written in index.html, or the
// talk's event named by ?event= (?event=weyweyweb or ?event=react-advanced).
const EVENTS = {
	'react-advanced': ['React Advanced', 'London 2026'],
	weyweyweb: ['WeyWeyWeb', 'Málaga 2026'],
};
const eventName = new URLSearchParams(window.location.search).get('event');
const event = EVENTS[eventName];
if (event) {
	const [name, place] = event;
	const chromeEvent = document.querySelector('.chrome-event');
	chromeEvent.firstChild.textContent = name;
	chromeEvent.querySelector('.sub-meta').lastChild.textContent = place;
	// A scene whose data-cut-at names the event isn't in that event's talk:
	// gone before the index, the beats and the scroll build over what's left.
	document.querySelectorAll('[data-cut-at]').forEach((scene) => {
		if (scene.dataset.cutAt.split(/\s+/).includes(eventName)) scene.remove();
	});
}

// Scenes that hold while they play one step per beat. Each step adds its
// tweens to the act timeline within `hold` px of scroll; the beat lands once
// they've finished.
const STEPPED_SCENES = {
	'todays-model': todaysModelSteps,
	'demo-two-people': branchingSteps,
	'ui-equals-f-intent': screenshotsSteps,
};
const STEP_HOLD = 0.5; // scroll per reveal step, as a fraction of the card height
const STEP_FADE = 0.1; // share of a step spent fading its piece in

function fadeInStep(piece) {
	return (tl, hold) => tl.fromTo(piece, { opacity: 0 }, { opacity: 1, duration: hold * STEP_FADE, ease: 'none' });
}

// Generated interfaces today: the scene arrives with its headline alone.
// Then each screenshot in turn has a beat to itself, nearly the card's size,
// the headline faded while they're up; its caption stays a little over its
// usual size. Then all three shrink together into their row, and last the
// formula under them, with the half they lack. Reduced motion fades each
// piece in place.
const SOLO_CAPTION = 1.25; // a solo screenshot's caption, against its size in the row

function screenshotsSteps(scene) {
	const figures = [...scene.querySelectorAll('.screenshots figure')];
	const captions = figures.map((figure) => figure.querySelector('figcaption'));
	const headline = scene.querySelector('h2');
	const formula = scene.querySelector('p.formula');
	// offsets within the scene, not boxes, as the cards may be moved aside
	// while the scenes are built
	const offset = (el) => {
		let left = 0;
		let top = 0;
		for (; el && el !== scene.offsetParent; el = el.offsetParent) {
			left += el.offsetLeft;
			top += el.offsetTop;
		}
		return { left, top };
	};
	const origin = offset(scene);
	const within = (el) => {
		const { left, top } = offset(el);
		return { left: left - origin.left, top: top - origin.top };
	};
	gsap.set(figures, { clearProps: 'transform,opacity,visibility' });
	gsap.set(captions, { clearProps: 'transform' });

	// the solo frame: from the headline's top to the scene's bottom padding,
	// between its side paddings. Each screenshot fills as much of it as it
	// can with its caption under it, the two centred in it.
	const style = getComputedStyle(scene);
	const frameLeft = parseFloat(style.paddingLeft);
	const frameWidth = scene.clientWidth - frameLeft - parseFloat(style.paddingRight);
	const frameTop = within(headline).top;
	const frameHeight = scene.clientHeight - frameTop - parseFloat(style.paddingBottom);
	const solo = figures.map((figure, i) => {
		const img = figure.querySelector('img');
		const { left, top } = within(img);
		const width = img.offsetWidth;
		const height = img.offsetHeight;
		const gap = within(captions[i]).top - top - height;
		const caption = captions[i].offsetHeight * SOLO_CAPTION;
		const scale = Math.min(frameWidth / width, (frameHeight - caption) / (height + gap));
		const groupTop = frameTop + (frameHeight - (height + gap) * scale - caption) / 2;
		return {
			figure: {
				transformOrigin: `${width / 2}px ${height / 2}px`,
				x: frameLeft + frameWidth / 2 - (left + width / 2),
				y: groupTop + (height * scale) / 2 - (top + height / 2),
				scale,
			},
			caption: { transformOrigin: '50% 0', scale: SOLO_CAPTION / scale },
		};
	});
	figures.forEach((figure, i) => {
		gsap.set(figure, { ...solo[i].figure, autoAlpha: 0 });
		gsap.set(captions[i], solo[i].caption);
	});

	const fade = (tl, targets, to, at, hold) => tl.to(targets, { autoAlpha: to, duration: hold * STEP_FADE, ease: 'none' }, at);
	const steps = figures.map((figure, i) => (tl, hold, at) => {
		fade(tl, i ? figures[i - 1] : headline, 0, at, hold);
		if (reduceMotion) return fade(tl, figure, 1, at, hold);
		const { scale } = solo[i].figure;
		tl.fromTo(figure, { autoAlpha: 0, scale: scale * 0.94 }, { autoAlpha: 1, scale, duration: hold * 0.4, ease: 'power2.out' }, at + hold * 0.05);
	});
	// into the row: the last one shrinks into its place as the others come
	// in from where they stood alone
	steps.push((tl, hold, at) => {
		const row = { x: 0, y: 0, scale: 1 };
		if (reduceMotion) {
			fade(tl, figures.at(-1), 0, at, hold);
			tl.set(figures, row).set(captions, { scale: 1 });
			fade(tl, [...figures, headline], 1, '>', hold);
			return;
		}
		tl.to(figures, { ...row, autoAlpha: 1, duration: hold * 0.5, ease: 'power2.inOut' }, at);
		tl.to(captions, { scale: 1, duration: hold * 0.5, ease: 'power2.inOut' }, at);
		fade(tl, headline, 1, at + hold * 0.3, hold * 2);
	});
	steps.push(fadeInStep(formula));

	return steps.map((step) => (tl, hold) => step(tl, hold, tl.duration()));
}

// Today's model, as Sarah lives it: her browser arrives with the page as it
// was built. Then, on one beat, her extensions, half a second apart: each
// box slides in beside the browser as its layer is laid on the page (bionic
// reading, voice control's numbers, dark mode, voice control's number grid),
// and last the empty boxes below them, for every preference still to come.
// On the last beat the layers jostle and slip out of register with the page
// and with each other, none aware of the rest, and the boxes go askew. Those
// two beats play in time rather than with the scroll: each sets its
// timeline off as the reader scrolls into it, and sets it back if they
// scroll back past its start. Reduced motion fades each piece in place and
// shows the conflict without moving anything.
const TODAYS_MODEL_LAYERS = ['bionic', 'numbers', 'dark', 'grid'];
const TODAYS_MODEL_GAP = 0.5; // seconds between one extension and the next

function todaysModelSteps(scene) {
	const art = scene.querySelector('svg.todays-model-illustration');
	if (!art) return [];
	const part = (name) => art.querySelector(`[data-part="${name}"]`);
	const layers = TODAYS_MODEL_LAYERS.map(part);
	const boxes = TODAYS_MODEL_LAYERS.map((name) => part(`${name}-box`));

	const base = (tl, hold) => {
		if (reduceMotion) return tl.fromTo(part('base'), { opacity: 0 }, { opacity: 1, duration: hold * STEP_FADE, ease: 'none' });
		tl.fromTo(part('base'), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: hold * 0.5, ease: 'back.out(1.2)' });
	};

	// the extensions: each box slides in from the right as its layer is laid
	// down on the page, from a little above it; then the empty boxes
	const arrive = gsap.timeline({ paused: true });
	const fade = (targets, at) => arrive.fromTo(targets, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none' }, at);
	TODAYS_MODEL_LAYERS.forEach((_, i) => {
		const at = i * TODAYS_MODEL_GAP;
		if (reduceMotion) return fade([layers[i], boxes[i]], at);
		arrive.fromTo(boxes[i], { opacity: 0, x: 80 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' }, at);
		arrive.fromTo(layers[i], { opacity: 0, y: -24 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, at + 0.05);
	});
	const last = TODAYS_MODEL_LAYERS.length * TODAYS_MODEL_GAP;
	if (reduceMotion) fade(part('more-box'), last);
	else arrive.fromTo(part('more-box'), { opacity: 0, x: 80 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power2.out' }, last);

	// where each layer settles once they've slipped, and how far each box
	// goes askew: never so far a box lands on its neighbour
	const SLIPS = {
		dark: { x: -18, y: 8, rotation: -0.6 },
		bionic: { x: 10, y: -5, rotation: 0.4 },
		numbers: { x: 22, y: -12, rotation: 0 },
		grid: { x: -14, y: 12, rotation: 1 },
	};
	const ASKEW = [-1.2, 1, -0.8, 1.6];
	const clash = gsap.timeline({ paused: true });
	clash.fromTo(scene.querySelector('[data-piece="conflict"]'), { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'none' });
	if (!reduceMotion) {
		clash.to([...layers, ...boxes], { x: (i) => (i % 2 ? 6 : -6), duration: 0.1, ease: 'sine.inOut', yoyo: true, repeat: 3 }, '<');
		layers.forEach((layer, i) =>
			clash.to(layer, { ...SLIPS[TODAYS_MODEL_LAYERS[i]], transformOrigin: '50% 50%', duration: 0.6, ease: 'power2.out' }, i ? '<' : undefined),
		);
		boxes.forEach((box, i) =>
			clash.to(box, { x: i % 2 ? 14 : -10, rotation: ASKEW[i], transformOrigin: '50% 50%', duration: 0.6, ease: 'power2.out' }, '<'),
		);
	}

	// a beat that sets a timeline off, instead of scrubbing it
	const played = (onStart, onReverseComplete) => (tl) => tl.to({}, { duration: 1, onStart, onReverseComplete });
	const extensions = played(
		() => arrive.restart(),
		() => {
			clash.pause(0);
			arrive.pause(0);
		},
	);
	const conflict = played(
		() => {
			arrive.progress(1);
			clash.restart();
		},
		() => clash.reverse(),
	);

	return [base, extensions, conflict];
}

// The branching demo: a stack of boxes per person, side by side, built on the
// intent one box per beat; the scene arrives with only its headline. A
// person's part starts with their avatar and their intent; then an empathy box
// for each kind of context, and last the UI. Each stack stays, so the next
// person's can be compared with it. The last person stands for everyone else:
// their stack comes up in one beat, their UI in the next, and in the last an
// empty stack past it, running off the card's edge. Each piece slides up from below
// the bottom of the card, off the screen, and stops in its place: no easing, so
// it moves only as the reader scrolls, and sticks. Reduced motion fades each
// piece in place.
const BRANCHING_PEOPLE = ['rose', 'myron', 'someone'];
const BRANCHING_SCREENS = ['screen-1', 'screen-2', 'screen-3'];

function branchingSteps(scene) {
	const avatars = Object.fromEntries([...scene.querySelectorAll('.branching-person')].map((b) => [b.dataset.person, b]));
	const art = scene.querySelector('svg.branching-illustration');
	const part = (name) => art?.querySelector(`[data-part="${name}"]`);
	gsap.set(Object.values(avatars), { autoAlpha: 0 });
	// each bracket is drawn as a part of its own, so the finish can make them
	// all alike; it comes up with the UI under it, as one piece
	if (art) [...BRANCHING_PEOPLE.map((person) => `${person}-ui`), 'more'].forEach((name) => part(name).prepend(part(`${name.replace(/-ui$/, '')}-bracket`)));

	const fade = (tl, targets, at, duration) => tl.fromTo(targets, { autoAlpha: 0 }, { autoAlpha: 1, duration, ease: 'none' }, at);
	// The illustration draws past its frame, so the pieces travel in from the
	// card's bottom edge, which clips them: px per drawing unit, and how far
	// the frame sits from the card's bottom edge, in drawing units. Measured
	// from the layout (offsets within the card), as the cards may be moved
	// aside while the scenes are built.
	const frame = art?.viewBox.baseVal;
	const card = scene.closest('.act-panel');
	const offsetTop = (el) => {
		let top = 0;
		for (; el && el !== card; el = el.offsetParent) top += el.offsetTop;
		return top;
	};
	const wrapper = art?.parentElement;
	const scale = art ? art.getBoundingClientRect().height / frame.height : 1;
	const toBottom = art ? (card.clientHeight - offsetTop(wrapper) - wrapper.offsetHeight) / scale : 0;
	// up from below the card's bottom edge, clear of the finish's rough edges
	const rise = (tl, pieces, at, duration) => {
		pieces = pieces.filter(Boolean);
		if (reduceMotion) return fade(tl, pieces, at, duration * STEP_FADE);
		pieces.forEach((piece) => {
			const below = frame.y + frame.height + toBottom + frame.height * 0.05 - piece.getBBox().y;
			tl.fromTo(piece, { y: below }, { y: 0, duration, ease: 'none' }, at);
		});
	};
	// several pieces in one beat, each starting a little after the last
	const cascade = (tl, pieces, at, hold) =>
		pieces.forEach((piece, i) => rise(tl, [piece], at + i * hold * 0.12, hold * (0.9 - 0.12 * (pieces.length - 1))));

	const steps = [];
	BRANCHING_PEOPLE.forEach((person, i) => {
		const last = i === BRANCHING_PEOPLE.length - 1;
		const intro = (tl, hold, at) => fade(tl, avatars[person], at, hold * 0.15);
		if (last) {
			steps.push((tl, hold, at) => {
				intro(tl, hold, at);
				if (art) cascade(tl, [`${person}-intent`, ...BRANCHING_SCREENS.map((s) => `${person}-${s}`)].map(part), at, hold);
			});
			steps.push((tl, hold, at) => art && rise(tl, [part(`${person}-ui`)], at, hold * 0.9));
			steps.push((tl, hold, at) => art && rise(tl, [part('more')], at, hold * 0.9));
			return;
		}
		// the person, and their intent
		steps.push((tl, hold, at) => {
			intro(tl, hold, at);
			if (art) rise(tl, [part(`${person}-intent`)], at, hold * 0.9);
		});
		// then a box per kind of context, and the UI
		[...BRANCHING_SCREENS, 'ui'].forEach((screen) => steps.push((tl, hold, at) => art && rise(tl, [part(`${person}-${screen}`)], at, hold * 0.9)));
	});

	return steps.map((step) => (tl, hold) => step(tl, hold, tl.duration()));
}

// A list whose items share their opening words, shown as one line: the shared
// words hold still and the endings rotate through a mask on their own, one a
// second, each sliding up out as the next rises in: round twice, to rest on
// the first again. It turns while the scene is in view (an IntersectionObserver, as the scene
// slides in sideways inside its pinned card) and starts again from the
// first ending on return. Reduced motion crossfades them instead. The list
// stays in the page, visually hidden, for screen readers; the line is
// hidden from them.
const ROTATOR_EVERY = 1; // seconds from one ending to the next
const ROTATOR_ROUNDS = 2; // times round the endings before it rests

function rotatorLoop(list) {
	const line = list.previousElementSibling?.classList.contains('rotator') ? list.previousElementSibling : buildRotator(list);
	const endings = [...line.querySelectorAll('.rotator-ending')];
	let shown = 0;
	let turns = 0;
	let timer = null;

	const reset = () => {
		timer?.kill();
		gsap.killTweensOf(endings);
		gsap.set(endings, { clearProps: 'transform,opacity' });
		gsap.set(endings.slice(1), { yPercent: 110 });
		shown = 0;
		turns = 0;
	};
	const turn = () => {
		const outgoing = endings[shown];
		shown = (shown + 1) % endings.length;
		const incoming = endings[shown];
		if (reduceMotion) {
			gsap.set(incoming, { yPercent: 0 });
			gsap.to(outgoing, { opacity: 0, duration: 0.3, ease: 'none' });
			gsap.fromTo(incoming, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'none' });
		} else {
			gsap.to(outgoing, { yPercent: -110, duration: 0.25, ease: 'power2.in' });
			gsap.fromTo(incoming, { yPercent: 110, opacity: 1 }, { yPercent: 0, duration: 0.5, ease: 'expo.out', delay: 0.12 });
		}
		turns += 1;
		if (turns < ROTATOR_ROUNDS * endings.length) timer = gsap.delayedCall(ROTATOR_EVERY, turn);
	};

	reset();
	new IntersectionObserver(([entry]) => {
		reset();
		if (entry.isIntersecting) timer = gsap.delayedCall(ROTATOR_EVERY, turn);
	}, { threshold: 0.5 }).observe(line);
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

// Cards stack: act k sits k × --stack-step lower than the first, so earlier
// cards' top edges show above the current one.
acts.forEach((panel, k) => panel.style.setProperty('--stack', k));

// The next slide in speaker view. Created here, after `acts` is captured, so
// the scroll timeline never pins it.
const speakerNext = document.createElement('section');
speakerNext.className = 'act-panel speaker-next';
speakerNext.setAttribute('aria-hidden', 'true');
document.querySelector('main').append(speakerNext);
let speakerFrameId = null;
let speakerWantedId = null;
let speakerFade = null;
let speakerFadeTo = null;
let drawerTl = null;
// Room for the current slide and the next one stacked beside the drawer.
const speakerRoom = window.matchMedia('(min-width: 700px) and (min-height: 640px)');

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

// Each slide's video shows as a pill-shaped "Watch (0:35)" button where the
// video sat (css/talk.css); the length is added once the clip's metadata
// loads. Pressing it plays the video in the spotlight (openSpotlight, below).
// The video stays inside, unseen, for its source and where it was left off.
const clipLength = (seconds) => {
	const s = Math.round(seconds);
	return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

document.querySelectorAll('main video').forEach((video) => {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = 'video-play';
	button.dataset.title = video.closest('section[data-scene]')?.querySelector('h2')?.textContent.trim() ?? '';
	button.setAttribute('aria-label', button.dataset.title ? `Watch video: ${button.dataset.title}` : 'Watch video');
	video.removeAttribute('controls');
	video.replaceWith(button);
	const label = document.createElement('span');
	label.textContent = 'Watch';
	button.append(label, video);
	const showLength = () => {
		if (Number.isFinite(video.duration)) label.textContent = `Watch (${clipLength(video.duration)})`;
	};
	if (video.readyState >= 1) showLength();
	else video.addEventListener('loadedmetadata', showLength, { once: true });
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

	// Cards sit in from the window edges (--inset-*), one stack step lower
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

// The lite deck's beats: where each act opener and scene starts in the page,
// less the top band, with a free range through any scene taller than the
// window. Offsets, not boxes, so the open drawer's push doesn't move them.
function buildFlow() {
	const { insetTop } = cardInsets();
	const room = document.documentElement.clientHeight - insetTop;
	const pageTop = (el) => {
		let top = 0;
		for (; el; el = el.offsetParent) top += el.offsetTop;
		return top - insetTop;
	};
	acts.forEach((panel) => {
		const act = panel.dataset.act;
		const trigger = { trigger: panel, start: 0 };
		const opener = panel.querySelector('.act-opener');
		if (opener) beats.push({ id: act, scene: null, opener, trigger, time: pageTop(opener) });
		panel.querySelectorAll('section[data-scene]').forEach((scene) => {
			const time = pageTop(scene);
			beats.push({ id: `${act}/${scene.dataset.scene}`, scene, trigger, time });
			const overflow = scene.offsetHeight - room;
			if (overflow > 16) freeRanges.push({ trigger, from: time, to: time + overflow });
		});
	});
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
	if (lite) {
		// nothing moves on its own, as with reduced motion
		reduceMotion = true;
		buildFlow();
		return;
	}
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

// The reader's place: the current beat, and how far past it they've scrolled.
function currentPlace() {
	const beat = currentBeat();
	return { beat, offset: beat ? window.scrollY - beatPosition(beat) : 0 };
}

// Rebuild everything from current layout, keeping the reader on the same beat.
function rebuild({ beat, offset } = currentPlace()) {
	navTween?.kill();
	navTween = null;
	closeSpotlight();
	// Pins are measured from the cards' layout, so take off the drawer's push
	// and shrink while they're rebuilt, then put them back (the drawer may
	// have resized).
	drawerTl?.progress(1);
	gsap.set(document.body, { '--drawer-push': '0px', '--drawer-scale': 1, '--stack-collapse': 0 });
	gsap.set(acts, { '--drawer-scale': 1 });
	mm?.revert();
	setup();
	gsap.set(document.body, drawerVars());
	gsap.set(acts, { '--drawer-scale': (i, panel) => cardScale(panel) });
	const same = beat && beatById(beat.id);
	if (same) window.scrollTo(0, beatPosition(same) + offset);
	updateChrome();
}

function restoreHash() {
	const beat = beatById(decodeURIComponent(window.location.hash.slice(1)));
	if (beat) window.scrollTo(0, beatPosition(beat));
}

// An illustration that moves is a WebP like the others, for the page without
// scripts and the system page; here the finished SVG takes its place,
// inline, so its parts can move, framed on data-frame if the image has one.
function inlineArt(img, source) {
	const svg = new DOMParser().parseFromString(source, 'image/svg+xml').documentElement;
	scopeIds(svg, `${img.classList[0]}-`);
	svg.setAttribute('class', img.className);
	if (img.dataset.frame) svg.setAttribute('viewBox', img.dataset.frame);
	svg.setAttribute('role', 'img');
	svg.setAttribute('aria-label', img.alt);
	img.replaceWith(svg);
	return svg;
}

// The drawings share their filter ids (edge, sheet…) and url(#id) resolves to
// the first in the page, so each inline drawing prefixes its own.
function scopeIds(svg, prefix) {
	const ids = new Set([...svg.querySelectorAll('[id]')].map((el) => el.id));
	const scoped = (value) => value.replace(/#([\w.:-]+)/g, (ref, id) => (ids.has(id) ? `#${prefix}${id}` : ref));
	svg.querySelectorAll('*').forEach((el) => {
		if (el.id) el.id = prefix + el.id;
		for (const attr of el.attributes) if (attr.value.includes('#')) attr.value = scoped(attr.value);
	});
}

// Today's model: the extensions land one by one (todaysModelSteps)
const todaysModelArt = document.querySelector('img.todays-model-illustration');
if (todaysModelArt && !lite) inlineArt(todaysModelArt, todaysModelSvg);

// A UI generated for your…: its endings turn on their own (rotatorLoop)
const rotatorList = document.querySelector('[data-scene="your-ui-is-not-my-ui-create-specific"] ul');
if (rotatorList && !lite) rotatorLoop(rotatorList);

// Back to Sarah, the calm after her storm: when the drawing comes into view,
// the lines of the page on her laptop are written out one by one and the
// rainbow comes out band by band; while it's on screen, the sun's rays turn,
// slowly. Any change inside an SVG repaints it whole, filters and all, so the
// moving parts are lifted out into layers of their own (layers()), and the
// rest of the drawing stays still. The scene slides in sideways inside its
// pinned card, so an IntersectionObserver, not a ScrollTrigger, tells when
// it's in view; leaving sets it back, to play again on return. Only transform
// and opacity move (GSAP sets an SVG part's origin from its own box, so it
// needs no transform-box). Reduced motion and the lite deck keep the still WebP.
const backToSarahArt = document.querySelector('img.back-to-sarah-illustration');
if (backToSarahArt && !lite && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
	const svg = inlineArt(backToSarahArt, backToSarahSvg);
	// the rainbow lies under the drawing, the page's lines and the rays on it
	const [under, over] = layers(svg, ['rainbow-'], ['text-', 'rays']);
	const parts = (layer, prefix) => [...layer.querySelectorAll(`[data-part^="${prefix}"]`)];
	const lines = parts(over, 'text-'), bands = parts(under, 'rainbow-'), rays = parts(over, 'rays');
	const arrive = gsap.timeline({ paused: true, delay: 0.3 })
		.fromTo(lines, { scaleX: 0, transformOrigin: '0% 50%' }, { scaleX: 1, duration: 0.7, ease: 'power1.inOut', stagger: 0.35 })
		.fromTo(bands, { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, ease: 'sine.inOut', stagger: 0.4 }, 0.6);
	// the rays are eightfold, so an eighth of a turn loops without a seam
	const turn = gsap.to(rays, { rotation: 45, transformOrigin: '50% 50%', duration: 40, ease: 'none', repeat: -1, paused: true });
	new IntersectionObserver(([entry]) => {
		if (entry.isIntersecting) {
			arrive.restart(true);
			turn.play();
		} else {
			arrive.pause(0);
			turn.pause();
		}
	}, { threshold: 0.5 }).observe(svg);
}

// Lift an inline drawing's moving parts (those whose data-part starts with
// one of the prefixes) out into copies of it laid exactly over it: one under
// it for the first list, one on it for the second. Each copy holds only its
// parts, and uses the drawing's own filters (url(#id) finds them by id), so
// what moves repaints only its own layer (css/talk.css composites each).
function layers(svg, ...lists) {
	const moving = (el, prefixes) => prefixes.some((prefix) => el.dataset.part?.startsWith(prefix));
	const copies = lists.map((prefixes, k) => {
		const copy = svg.cloneNode(true);
		copy.removeAttribute('role');
		copy.removeAttribute('aria-label');
		copy.setAttribute('aria-hidden', 'true');
		copy.querySelector('defs')?.remove();
		[...copy.children].filter((el) => !moving(el, prefixes)).forEach((el) => el.remove());
		svg.querySelectorAll('[data-part]').forEach((el) => moving(el, prefixes) && el.remove());
		svg[k ? 'after' : 'before'](copy);
		return copy;
	});
	return copies;
}

// The branching demo, framed on the three stacks (data-frame), so its parts
// can move (branchingSteps). Each avatar button shows its person's head from
// the drawing, and jumps to their part.
const branchingArt = document.querySelector('img.branching-illustration');
if (branchingArt && !lite) {
	const svg = inlineArt(branchingArt, branchingArtSvg);

	const scene = svg.closest('section[data-scene]');
	scene.querySelectorAll('.branching-person').forEach((button) => {
		const { person } = button.dataset;
		// the head is drawn hidden; the avatar shows what's inside it, measured
		// while it's briefly shown
		const head = svg.querySelector(`[data-part="${person}-head"]`);
		const still = document.createElementNS(svg.namespaceURI, 'g');
		still.id = `branching-${person}-head`;
		still.append(...head.childNodes);
		head.append(still);
		head.removeAttribute('display');
		const box = still.getBBox();
		head.setAttribute('display', 'none');
		const side = box.width * 0.86;
		const avatar = document.createElementNS(svg.namespaceURI, 'svg');
		avatar.setAttribute('viewBox', `${box.x + (box.width - side) / 2} ${box.y - side * 0.06} ${side} ${side}`);
		avatar.setAttribute('aria-hidden', 'true');
		const use = document.createElementNS(svg.namespaceURI, 'use');
		use.setAttribute('href', `#${still.id}`);
		avatar.append(use);
		button.querySelector('.branching-avatar').append(avatar);
		button.addEventListener('click', () => {
			const beat = beatById(`${scene.closest('[data-act]').dataset.act}/${scene.dataset.scene}/${button.dataset.beat}`);
			if (beat) jumpTo(beatPosition(beat));
		});
	});
}

history.scrollRestoration = 'manual';
setup();
restoreHash();

// Images and video metadata change scene heights after first layout.
window.addEventListener('load', () => {
	rebuild();
	restoreHash();
});

// the band's intro: its text rises out from under the cards' top edge
// (css/talk.css, .is-band-intro).
// Played once the page has loaded and been rebuilt, so that long task
// doesn't eat its start, but no later than 1.2s in on a slow network.
let bandIntro = document.documentElement.classList.contains('is-band-intro');
function playBandIntro() {
	if (!bandIntro) return;
	bandIntro = false;
	requestAnimationFrame(() => gsap.fromTo(document.documentElement, { '--intro': 1 }, {
		'--intro': 0,
		duration: 0.9,
		ease: 'power3.out',
		onComplete: () => {
			document.documentElement.classList.remove('is-band-intro');
			gsap.set(document.documentElement, { clearProps: '--intro' });
		},
	}));
}
if (document.readyState === 'complete') playBandIntro();
else window.addEventListener('load', playBandIntro);
setTimeout(playBandIntro, 1200);
// In the lite deck anything that changes the page's height (fonts, a late
// image) moves the beats under it, so they're measured again.
if (lite) new ResizeObserver(() => setup()).observe(document.querySelector('main'));

// Printed, the page is a speaker script (css/talk.css, @media print): every
// scene in the page's flow, a slide with its notes under it. So the scroll
// choreography comes off first, taking its pins, offsets and half-played
// builds with it (every build prints whole), and each scene's notes step out
// after it, leaving the scene as just the slide. Afterwards both go back, on
// the same beat.
let printedFrom = null;
let movedNotes = [];
function beforePrint() {
	if (printedFrom) return;
	printedFrom = currentPlace();
	navTween?.kill();
	navTween = null;
	closeSpotlight();
	mm?.revert();
	movedNotes = [...document.querySelectorAll('main :is(section[data-scene], .act-opener) > aside.notes')].map((notes) => {
		const place = { notes, parent: notes.parentElement, next: notes.nextSibling };
		place.parent.after(notes);
		return place;
	});
}
function afterPrint() {
	if (!printedFrom) return;
	movedNotes.forEach(({ notes, parent, next }) => parent.insertBefore(notes, next));
	movedNotes = [];
	const place = printedFrom;
	printedFrom = null;
	rebuild(place);
}
window.addEventListener('beforeprint', beforePrint);
// the Print buttons, in the notes drawer's footer and on the credits
document.querySelectorAll('[data-print]').forEach((button) => button.addEventListener('click', () => window.print()));
window.addEventListener('afterprint', afterPrint);
// Some browsers only tell the page through the print media query
window.matchMedia('print').addEventListener('change', (e) => (e.matches ? beforePrint() : afterPrint()));

let lastWidth = window.innerWidth;
let lastHeight = window.innerHeight;
let resizeTimer = null;
window.addEventListener('resize', () => {
	clearTimeout(resizeTimer);
	resizeTimer = setTimeout(() => {
		if (printedFrom) return;
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
function syncHash() {
	const beat = currentBeat();
	const hash = beat ? `#${beat.id}` : '';
	if (beat && window.location.hash !== hash) history.replaceState(null, '', hash);
}
// The lite deck has no triggers for ScrollTrigger to watch, so it waits for
// the scroll to settle itself.
if (lite) {
	let hashTimer = null;
	window.addEventListener('scroll', () => {
		clearTimeout(hashTimer);
		hashTimer = setTimeout(syncHash, 150);
	}, { passive: true });
} else ScrollTrigger.addEventListener('scrollEnd', syncHash);

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
		// the lite deck glides there natively, unless motion is reduced
		const glide = lite && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		window.scrollTo({ top: target, behavior: glide ? 'smooth' : 'instant' });
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

// The talk title's words come in from off the card, one after another, to
// their places: Your from the left, the first UI from the top, is not my
// from the right and the last UI from the bottom. Each word is split into
// its letters; the UIs' follow one another in, a moment apart. The abstract
// and speakers fade in between them as they come. Then, every few seconds,
// Your and my trade places: Your slides off to the left and comes back as
// My, while my slides off to the right and comes back as your, and back
// again (swapTitle). Reduced motion shows the title in place, and still.
const titleWords = document.querySelector('.title-words');
const titleInfo = titleWords ? [...titleWords.parentElement.querySelectorAll('.title-centre > *')] : [];
const titleLeaves = titleWords ? [...titleWords.querySelectorAll('span:not(.title-line)')] : [];
const titleSplits = new Map(); // each word → its SplitText
// splits a word into its letters, first giving it new text if there's one.
// Set apart, the letters lose the font's kerning (Yo, most), so each is
// nudged back to where it sat in the whole word.
const splitWord = (leaf, text) => {
	titleSplits.get(leaf)?.revert();
	if (text) leaf.textContent = text;
	const node = leaf.firstChild, range = document.createRange();
	// (SplitText makes no letter of a space, so neither do these)
	const kerned = [...leaf.textContent].flatMap((ch, i) => {
		if (/\s/.test(ch)) return [];
		range.setStart(node, i);
		range.setEnd(node, i + 1);
		return [range.getBoundingClientRect().left];
	});
	const split = new SplitText(leaf, { type: 'chars', tag: 'span', charsClass: 'title-char', aria: 'none' });
	split.chars.forEach((char, i) => {
		const drift = char.getBoundingClientRect().left - gsap.getProperty(char, 'x') - kerned[i];
		if (Math.abs(drift) > 0.5) char.style.marginLeft = `${-drift}px`;
	});
	titleSplits.set(leaf, split);
};
const lettersOf = (el) => [...el.querySelectorAll('.title-char')];
// an element's place, less any move it or the words around it have
const placeOf = (el) => {
	const r = el.getBoundingClientRect();
	let x = 0, y = 0;
	for (let e = el; e && e !== titleWords; e = e.parentElement) {
		x += gsap.getProperty(e, 'x');
		y += gsap.getProperty(e, 'y');
	}
	return { left: r.left - x, right: r.right - x, top: r.top - y, bottom: r.bottom - y };
};
// each letter's background set back by its place in the title, so the
// gradient runs on from letter to letter (css/talk.css); before the split,
// each word's
function alignTitleGradient() {
	const box = titleWords.getBoundingClientRect();
	const painted = titleWords.querySelectorAll('.title-char').length ? titleWords.querySelectorAll('.title-char') : titleLeaves;
	painted.forEach((el) => {
		const p = placeOf(el);
		el.style.setProperty('--bx', `${p.left - box.left}px`);
		el.style.setProperty('--by', `${p.top - box.top}px`);
	});
}
// how far a word must move to sit just off the card on the side it comes
// from: the first from the left, the first UI from the top, is not my from
// the right, the last UI from the bottom
const offLeft = (el) => ({ x: -placeOf(el).right - 40, y: 0 });
const offRight = (el) => ({ x: innerWidth - placeOf(el).left + 40, y: 0 });
const offTop = (el) => ({ x: 0, y: -placeOf(el).bottom - 40 });
const offBottom = (el) => ({ x: 0, y: innerHeight - placeOf(el).top + 40 });
const TITLE_SIDES = [offLeft, offTop, offRight, offBottom];
// the words that come down or up (the UIs) let their letters follow one
// another in, a moment apart, from the end nearest their place; the words
// that slide sideways keep their letters together
const TITLE_STAGGERS = [0, { each: 0.035, from: 'end' }, 0, { each: 0.035, from: 'start' }];
if (titleWords) {
	document.fonts.ready.then(alignTitleGradient);
	window.addEventListener('resize', () => requestAnimationFrame(alignTitleGradient));
}
if (titleWords && !lite && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
	gsap.set(titleInfo, { autoAlpha: 0 });
	[...titleWords.children].forEach((word, k) => gsap.set(word, TITLE_SIDES[k](word)));
	// off the card and hidden now, so the head's pre-paint hiding can go
	document.documentElement.classList.remove('is-title-intro');
	// after the fonts, so the words are split and measured in the title's face
	document.fonts.ready.then(() => {
		const words = [...titleWords.children];
		gsap.set(words, { x: 0, y: 0 });
		titleLeaves.forEach((leaf) => splitWord(leaf));
		alignTitleGradient();
		const intro = gsap.timeline({ onComplete: () => gsap.delayedCall(2.5, swapTitle) });
		intro.to(titleInfo, { autoAlpha: 1, duration: 0.4, ease: 'power1.inOut' }, 0.3);
		words.forEach((word, k) => {
			const letters = lettersOf(word);
			gsap.set(letters, TITLE_SIDES[k](word));
			intro.to(letters, { x: 0, y: 0, duration: 1.1, ease: 'power4.out', stagger: TITLE_STAGGERS[k] }, 0.3 + k * 0.12);
		});
	});
}

// Your and my trade places: each slides off its own side, takes the
// other's word, and slides back. is not, set right with my, moves over to
// make room for the longer word, or close up after the shorter; the UIs
// move to start just after the first word, as they start after Your. Both
// set off a little before the words are gone, measured ahead on copies of
// the words.
let titleSwap = null;
// the width a word would have with other text, from a hidden copy
const widthAs = (leaf, text) => {
	const copy = document.createElement('span');
	copy.textContent = text;
	copy.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap';
	leaf.parentElement.append(copy);
	const width = copy.getBoundingClientRect().width;
	copy.remove();
	return width;
};
const widthOf = (el) => placeOf(el).right - placeOf(el).left;
function swapTitle() {
	const [first, , line] = titleWords.children;
	const [isNot, last] = line.children;
	const swapped = first.textContent === 'Your';
	const [nextFirst, nextLast] = swapped ? ['My', 'your'] : ['Your', 'my'];
	const em = parseFloat(getComputedStyle(titleWords).fontSize);
	// the space between the first word and UI, from where UI starts now
	const space = parseFloat(getComputedStyle(titleWords).getPropertyValue('--under-ui')) * em - widthOf(first);
	const under = `${(widthAs(first, nextFirst) + space) / em}em`;
	// how far is not moves over: by the difference the new last word makes
	const shift = widthOf(last) - widthAs(last, nextLast);
	const ease = 'power3.inOut', OUT = 0.6, AHEAD = 0.3, MOVE = 1.1;
	// is not's move, which the new last word, once in, makes part of itself
	const move = { x: 0 };
	let placed = 0;
	const tl = (titleSwap = gsap.timeline({ onComplete: () => gsap.delayedCall(3, swapTitle) }));
	tl.to(lettersOf(first), { ...offLeft(first), duration: OUT, ease: 'power2.in' })
		.to(lettersOf(last), { ...offRight(last), duration: OUT, ease: 'power2.in' }, 0)
		.to(move, { x: shift, duration: MOVE, ease, onUpdate: () => gsap.set(isNot, { x: move.x - placed }) }, OUT - AHEAD)
		.to(titleWords, { '--under-ui': under, duration: MOVE, ease, onUpdate: alignTitleGradient }, OUT - AHEAD)
		// the words gone, they take each other's place
		.add(() => {
			splitWord(first, nextFirst);
			splitWord(last, nextLast);
			placed = shift;
			gsap.set(isNot, { x: move.x - placed });
			gsap.set(lettersOf(first), offLeft(first));
			gsap.set(lettersOf(last), offRight(last));
			alignTitleGradient();
			tl.to(lettersOf(first), { x: 0, duration: 1, ease: 'power4.out' }, OUT);
			tl.to(lettersOf(last), { x: 0, duration: 1, ease: 'power4.out' }, OUT);
		}, OUT);
	if (!titleInView) tl.pause();
}

// the swap pauses while the title slide is out of view
let titleInView = true;
if (titleWords) {
	new IntersectionObserver(([entry]) => {
		titleInView = entry.isIntersecting;
		if (titleInView) titleSwap?.resume();
		else titleSwap?.pause();
	}).observe(titleWords);
}

// The talk title in the top band goes back to the title slide, as Home does.
document.querySelector('.chrome-home').addEventListener('click', (event) => {
	event.preventDefault();
	jumpTo(nextStop(0, 'first'));
	event.currentTarget.blur();
});

// Back and Forward glide to the beat their entry names.
window.addEventListener('popstate', () => {
	const beat = beatById(decodeURIComponent(window.location.hash.slice(1)));
	if (beat) moveTo(beatPosition(beat));
});

let currentSceneNotes = null;

// The scene's notes as written, tags and all; notes of bare text become one
// paragraph.
function renderDrawer() {
	const notes = currentSceneNotes;
	const text = notes?.textContent.replace(/\s+/g, ' ').trim();
	if (text && notes.firstElementChild) {
		notesDrawerContent.replaceChildren(...[...notes.childNodes].map((node) => node.cloneNode(true)));
		return;
	}
	const p = document.createElement('p');
	p.textContent = text || 'No notes for this section.';
	notesDrawerContent.replaceChildren(p);
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
	// the lite deck has no tabs (css/talk.css), so it skips measuring them
	if (!lite) acts.forEach((panel, k) => {
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
		// Measured on screen, where the open drawer shrinks the card, so it's
		// scaled back to the card's own pixels, which the tab moves in;
		// unscaled, the tab peeked in at the card's edge on its first slide.
		const second = own[1].frame.scene;
		const box = panel.getBoundingClientRect();
		const scale = box.width / panel.offsetWidth || 1;
		const shift = Math.max(0, (second.getBoundingClientRect().left - box.left) / scale);
		tab.style.setProperty('--tab-shift', `${Math.round(shift)}px`);
	});
	document.body.dataset.currentAct = current.trigger.trigger.dataset.act;
	// the cards under the current one, which fade as the drawer opens
	acts.forEach((panel, k) => panel.classList.toggle('is-under', k < currentAct));
	updateSpeakerNext();
}

// The drawer's index: every act and its scenes, in order. Entries link to
// their frame's beat id; an act without an opener (the first, which opens on
// the talk title) lists its scenes without an act heading.
const tocList = document.getElementById('drawer-toc');
const tocNav = tocList.closest('.drawer-toc');
tocNav.addEventListener('pointerleave', () => tocNav.classList.remove('is-resting'));

// On small screens the pin button pins the folded index open, and unpins it
// (css/talk.css). With a pointer, folding also rests it, or the
// pointer over it would hold it open.
const tocPin = tocNav.querySelector('.toc-pin');
function setTocPinned(isPinned, rest = true) {
	tocNav.classList.toggle('is-pinned', isPinned);
	tocPin.setAttribute('aria-expanded', String(isPinned));
	tocPin.setAttribute('aria-label', isPinned ? 'Unpin the index' : 'Pin the index open');
	if (!isPinned && rest) tocNav.classList.add('is-resting');
}
tocPin.addEventListener('click', (event) => {
	setTocPinned(!tocNav.classList.contains('is-pinned'));
	if (event.detail > 0) tocPin.blur();
});
const tocLinks = new Map(); // beat id → link
const frameNames = new Map(); // beat id → { title, number }, e.g. Molly, 2.2

// Who speaks in a scene, in order, from the badges in its notes: Simon, or
// Simon then Matt where the other takes over mid-scene.
function sceneSpeakers(scene) {
	const names = [...(scene?.querySelectorAll(':scope > aside.notes .speaker') ?? [])].map((badge) => badge.textContent.trim());
	return names.filter((name, i) => name !== names[i - 1]);
}

function tocLink(id, label, className, number, speakers = []) {
	const link = document.createElement('a');
	link.className = className;
	link.href = `#${id}`;
	// The number sits left of the label, right-aligned to where the label
	// already starts, with the same plain dash as the notes heading.
	const num = document.createElement('span');
	num.className = 'toc-num sub-meta';
	const dash = document.createElement('span');
	dash.className = 'em-dash';
	dash.textContent = '—';
	num.append(number, dash);
	// the title in its own span, so the collapsed index (css/talk.css) can
	// hide it while the number shows
	const title = document.createElement('span');
	title.className = 'toc-title';
	title.textContent = label;
	// the speakers as initials at the entry's end, floated so a long title
	// ellipsizes before them; the full name for a screen reader
	const who = document.createElement('span');
	who.className = 'toc-speakers';
	speakers.forEach((name) => {
		const initial = document.createElement('span');
		initial.className = 'toc-speaker';
		initial.title = name;
		initial.setAttribute('aria-hidden', 'true');
		initial.textContent = name[0];
		const read = document.createElement('span');
		read.className = 'visually-hidden';
		read.textContent = `, ${name}`;
		who.append(initial, read);
	});
	link.append(num, ...(speakers.length ? [who] : []), title);
	link.addEventListener('click', (event) => {
		event.preventDefault();
		const beat = beatById(id);
		if (beat) jumpTo(beatPosition(beat));
		// a mouse click hands focus back to the page so the arrow keys keep
		// navigating; keyboard activation keeps focus in the list
		if (event.detail > 0) {
			link.blur();
			// and folds a collapsing index back to its numbers, though the
			// pointer is still over it, until the pointer leaves
			tocNav.classList.add('is-resting');
		}
		// a pinned index stays open, except on a phone, where it covers the
		// notes: there it folds once an entry is picked, so they show
		if (phone.matches && tocNav.classList.contains('is-pinned')) setTocPinned(false);
	});
	tocLinks.set(id, link);
	return link;
}

// Acts count from 1 and scenes within an act from 1; in the index, an act
// opener is its act's number with .0.
acts.forEach((panel, k) => {
	const act = panel.dataset.act;
	const item = document.createElement('li');
	item.style.setProperty('--act-color', getComputedStyle(panel).getPropertyValue('--act-color'));
	const name = actNames.get(panel);
	if (panel.querySelector('.act-opener')) {
		// "2.0": the act's own number, in the scenes' form, so the column of
		// numbers reads as one sequence
		item.append(tocLink(act, name, 'toc-act toc-link', `${k + 1}.0`, sceneSpeakers(panel.querySelector('.act-opener'))));
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
		// data-title names a scene whose heading doesn't read as one in the
		// index (none, a formula, or a rotating
		// ending); a heading read by its aria-label (the talk title, its words
		// hidden as letters) goes by that; failing all, its id stands in
		const label = scene.dataset.title || heading?.getAttribute('aria-label') || read?.textContent.replace(/\s+/g, ' ').trim() || scene.dataset.scene.replace(/-/g, ' ');
		const id = `${act}/${scene.dataset.scene}`;
		const entry = document.createElement('li');
		entry.append(tocLink(id, label, 'toc-link', `${k + 1}.${i + 1}`, sceneSpeakers(scene)));
		scenes.append(entry);
		frameNames.set(id, { title: label, number: `${k + 1}.${i + 1}` });
	});
	item.append(scenes);
	tocList.append(item);
});

// On small screens the index folds to a rail of its numbers (css/talk.css),
// each slid from its open place to the rail's centre. Where each number's
// centre sits, from the card's left edge, sets how far: --num-centre.
// Measured where it shows, less whatever slide it has now, so it can be
// measured folded, open or mid-slide.
const railMode = window.matchMedia('(max-width: 1024px)');
function measureTocNumbers() {
	if (!railMode.matches) return;
	const card = tocNav.getBoundingClientRect().left;
	tocNav.querySelectorAll('.toc-num').forEach((num) => {
		const text = document.createRange();
		text.setStart(num, 0);
		text.setEndBefore(num.querySelector('.em-dash'));
		const shown = text.getBoundingClientRect();
		const slide = parseFloat(getComputedStyle(num).translate) || 0;
		num.style.setProperty('--num-centre', `${shown.left + shown.width / 2 - slide - card}px`);
	});
}
measureTocNumbers();
document.fonts.ready.then(measureTocNumbers);
railMode.addEventListener('change', measureTocNumbers);

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
// "Molly—2.2".
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
function drawerIsOpen() {
	return notesDrawer.classList.contains('is-open');
}
const drawerPush = () => (drawerIsOpen() && phone.matches ? notesDrawer.offsetWidth : 0);
const drawerScale = () => (drawerIsOpen() && !phone.matches ? 1 - notesDrawer.offsetWidth / document.documentElement.clientWidth : 1);
const drawerVars = () => ({ '--drawer-push': `${drawerPush()}px`, '--drawer-scale': drawerScale(), '--stack-collapse': drawerIsOpen() ? 1 : 0 });
// Each card shrinks by its own measured width, so its left edge meets the
// drawer's exactly.
const cardScale = (panel) => (drawerIsOpen() && !phone.matches ? (document.documentElement.clientWidth - notesDrawer.offsetWidth) / panel.offsetWidth : 1);

// Frames are the act openers and scenes, not the reveal steps inside a scene.
function slideFrames() {
	return beats.filter((beat) => beat.id.split('/').length < 3);
}

function nextSlideFrame() {
	const beat = currentBeat();
	if (!beat) return null;
	const frames = slideFrames();
	const id = beat.id.split('/').slice(0, 2).join('/');
	const index = frames.findIndex((frame) => frame.id === id);
	return index < 0 ? null : (frames[index + 1] ?? null);
}

// The preview is the full card, scaled from its top-left like the deck, and
// parked at the current slide's visual bottom-left so the two meet.
function placeSpeakerNext() {
	const beat = currentBeat();
	const panel = (beat?.scene ?? beat?.opener)?.closest('.act-panel');
	if (!panel || panel === speakerNext) return;
	const box = panel.getBoundingClientRect();
	// Cards have no bottom border, so its top border meets the slide's
	// bottom edge directly: one rule between them, no gap.
	speakerNext.style.top = `${box.bottom}px`;
	speakerNext.style.left = `${box.left}px`;
	speakerNext.style.width = `${panel.offsetWidth}px`;
	speakerNext.style.height = `${panel.offsetHeight}px`;
	speakerNext.style.setProperty('--card-width', `${panel.clientWidth}px`);
	speakerNext.style.setProperty('--stack', getComputedStyle(panel).getPropertyValue('--stack'));
	// the card's own shrink, so the preview is exactly as wide
	speakerNext.style.setProperty('--drawer-scale', getComputedStyle(panel).getPropertyValue('--drawer-scale'));
}

function fillSpeakerNext(frame) {
	const source = frame.scene ?? frame.opener;
	const actPanel = source.closest('.act-panel');
	speakerNext.dataset.act = actPanel.dataset.act;
	speakerNext.style.setProperty('--speaker-act', acts.indexOf(actPanel));
	const clone = source.cloneNode(true);
	clone.querySelectorAll('aside.notes').forEach((note) => note.remove());
	clone.querySelectorAll('[id]').forEach((el) => {
		const id = `speaker-next-${el.id}`;
		clone.querySelectorAll(`[href="#${CSS.escape(el.id)}"]`).forEach((ref) => ref.setAttribute('href', `#${id}`));
		el.id = id;
	});
	const inner = document.createElement('div');
	inner.className = 'act-panel-inner';
	inner.append(clone);
	speakerNext.replaceChildren(inner);
	// The tab is on screen for a scene, and rides off the card on an opener.
	const isOpener = !frame.scene || frame.scene.dataset.scene === 'your-ui-is-not-my-ui-title';
	if (!isOpener) {
		const tab = document.createElement('span');
		tab.className = 'act-tab';
		tab.setAttribute('aria-hidden', 'true');
		tab.textContent = actNames.get(actPanel) ?? '';
		speakerNext.append(tab);
	}
}

// Fades the preview in as the drawer opens and out as it closes. A change of
// slide fades the old one out before the new one fades in. Killed and
// replaced when the target changes, so a quick step shows only the latest.
function fadeSpeakerNext(opacity, duration, onComplete) {
	// The drawer's timeline calls updateSpeakerNext on every frame. Leave a
	// fade that's already running toward this opacity alone, or each frame
	// would kill it before it moved.
	if (speakerFade && speakerFadeTo === opacity && speakerFade.progress() < 1) return;
	speakerFade?.kill();
	speakerFadeTo = opacity;
	const speed = reduceMotion ? 0 : 1;
	speakerFade = gsap.to(speakerNext, {
		opacity,
		duration: duration * speed,
		ease: opacity ? 'power2.out' : 'power2.in',
		onComplete,
	});
}

function updateSpeakerNext() {
	const frame = drawerIsOpen() && speakerRoom.matches ? nextSlideFrame() : null;
	if (!frame) {
		// Already hidden, and nothing is on its way out.
		if (speakerWantedId === null && !document.body.classList.contains('is-speaker')) return;
		// The fade out is already running; keep the card pinned under the
		// current slide while the drawer closes over it.
		if (speakerWantedId === null && speakerFade?.isActive()) {
			placeSpeakerNext();
			return;
		}
		speakerWantedId = null;
		// quickly as the drawer closes, before the growing card can carry it
		// down the window
		fadeSpeakerNext(0, drawerIsOpen() ? 0.45 : 0.15, () => {
			if (speakerWantedId !== null) return;
			document.body.classList.remove('is-speaker');
			speakerNext.replaceChildren();
			speakerFrameId = null;
		});
		return;
	}

	// As the drawer opens, the preview waits until the cards have all but
	// settled, rather than riding up the window with them.
	const opening = drawerTl && drawerTl.progress() < 0.5;
	if (opening && !document.body.classList.contains('is-speaker')) return;

	if (speakerWantedId !== frame.id) {
		const incoming = frame.id;
		speakerWantedId = incoming;
		const reveal = () => {
			if (speakerWantedId !== incoming) return;
			if (speakerFrameId !== incoming) {
				fillSpeakerNext(frame);
				speakerFrameId = incoming;
			}
			// Visible before the opacity tween, which starts from 0.
			document.body.classList.add('is-speaker');
			placeSpeakerNext();
			fadeSpeakerNext(1, 0.45);
		};
		const faded = Number(gsap.getProperty(speakerNext, 'opacity')) > 0.08;
		if (speakerFrameId && speakerFrameId !== incoming && faded) fadeSpeakerNext(0, 0.28, reveal);
		else reveal();
	}
	if (document.body.classList.contains('is-speaker')) placeSpeakerNext();
}

speakerRoom.addEventListener('change', () => updateSpeakerNext());

const DRAWER_KEY = 'notes-drawer';

// A fresh timeline per toggle. The cards' push and the icon tween from
// wherever they are, so an interrupted toggle turns around smoothly.
function setDrawerOpen(isOpen) {
	notesDrawer.classList.toggle('is-open', isOpen);
	// kept for this tab, so a reload (as when editing the notes) reopens it
	try {
		sessionStorage.setItem(DRAWER_KEY, isOpen ? 'open' : '');
	} catch {}
	// on a phone the drawer reopens on the notes, the index folded;
	// elsewhere a pinned index stays pinned
	if (!isOpen && phone.matches) setTocPinned(false, false);
	notesToggle.setAttribute('aria-expanded', String(isOpen));
	if (isOpen) {
		closeSpotlight();
		updateCurrentScene();
		renderDrawer();
	}

	drawerTl?.kill();
	const speed = reduceMotion ? 0 : 1;
	// the cards under the current one hide at once as it opens, and show
	// again only once the closing cards are back in their stack
	if (isOpen) document.body.classList.add('is-collapsed');
	drawerTl = gsap.timeline({
		defaults: { duration: 0.5 * speed },
		onUpdate: () => {
			updateCursor();
			updateSpeakerNext();
		},
		onComplete: () => updateSpeakerNext(),
	});
	if (isOpen) {
		drawerTl
			.set(notesDrawer, { visibility: 'visible' })
			.to(document.body, { ...drawerVars(), ease: 'expo.out', duration: 0.6 * speed }, 0)
			.to(acts, { '--drawer-scale': (i, panel) => cardScale(panel), ease: 'expo.out', duration: 0.6 * speed }, 0)
			.to(drawerIcon, { rotation: 90, ease: 'power3.out', duration: 0.4 * speed }, 0);
		if (activeTocLink) centreInDrawer(activeTocLink);
	} else {
		drawerTl
			// eased out as well as in, so the slides settle back rather than snap
			.to(document.body, { ...drawerVars(), ease: 'power3.inOut', duration: 0.6 * speed }, 0)
			.to(acts, { '--drawer-scale': (i, panel) => cardScale(panel), ease: 'power3.inOut', duration: 0.6 * speed }, 0)
			.to(drawerIcon, { rotation: 45, ease: 'power2.inOut', duration: 0.3 * speed }, 0)
			// hidden once covered, so its links leave the tab order
			.set(notesDrawer, { visibility: 'hidden' })
			.call(() => document.body.classList.remove('is-collapsed'));
	}
	updateCursor();
	updateSpeakerNext();
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
	close.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#icon-x" /></svg>';
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

// Script or Bullets (css/talk.css switches between them): remembered across
// visits, as a speaker keeps to one.
const NOTES_VIEW_KEY = 'notes-view';
const notesView = document.querySelector('.notes-view');
try {
	const saved = notesView.querySelector(`input[value="${localStorage.getItem(NOTES_VIEW_KEY)}"]`);
	if (saved) saved.checked = true;
} catch {}
notesView.addEventListener('change', (event) => {
	try {
		localStorage.setItem(NOTES_VIEW_KEY, event.target.value);
	} catch {}
});

// A drawer left open in this tab opens again after a reload, at once.
try {
	if (sessionStorage.getItem(DRAWER_KEY) === 'open') {
		setDrawerOpen(true);
		drawerTl.progress(1);
	}
} catch {}

if (import.meta.env?.DEV) {
	window.__deck = { beats: () => beats, freeRanges: () => freeRanges, stops: stopPositions, ScrollTrigger };
}
