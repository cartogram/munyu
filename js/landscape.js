// Generated line fields for the act openers and the title slide: a regular
// grid of short lines whose angles and lengths follow smooth, seeded fields,
// so broad regions of vertical, horizontal and diagonal strokes turn into one
// another and some regions shrink to faint ticks — an abstract image made
// only of turning lines. Drawn in tints of the act's colour via CSS classes,
// seeded by the act's name so each act always gets the same picture.
//
// `svg.draw(time)` redraws it with the fields drifted by `time` (seconds),
// so the lines turn; draw(0) is the still picture.

const W = 1280;
const H = 1000;
const NS = 'http://www.w3.org/2000/svg';
const GRID = 20; // spacing of the line grid
const STROKE = 1;
const LENGTH = 18; // the longest line
const TINTS = ['lm-tint-35', 'lm-tint-55', 'lm-tint-70', 'lm-tint-100']; // by length, shortest first

// Small deterministic PRNG (mulberry32) seeded from a string.
function rng(seedText) {
	let seed = 0;
	for (const ch of seedText) seed = (Math.imul(seed ^ ch.charCodeAt(0), 2654435761) + 0x9e3779b9) | 0;
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// A smooth seeded field over the frame, roughly in -1..1: a few broad plane
// waves in random directions, each drifting slowly over `time` (seconds).
function field(random, waves, scale) {
	const terms = Array.from({ length: waves }, (_, i) => {
		const direction = random() * Math.PI * 2;
		const k = ((1 + random() * 1.5) * Math.PI * 2) / (W * scale);
		return {
			kx: Math.cos(direction) * k,
			ky: Math.sin(direction) * k,
			p: random() * Math.PI * 2,
			a: 1 / (i + 1),
			drift: (0.12 + random() * 0.18) * (random() < 0.5 ? -1 : 1), // radians per second
		};
	});
	const total = terms.reduce((sum, t) => sum + t.a, 0);
	return (x, y, time) => terms.reduce((v, t) => v + t.a * Math.sin(t.kx * x + t.ky * y + t.p + t.drift * time), 0) / total;
}

const fix = (n) => n.toFixed(1);
const clamp01 = (u) => (u < 0 ? 0 : u > 1 ? 1 : u);

export function landscape(seedText) {
	const random = rng(seedText);
	const svg = document.createElementNS(NS, 'svg');
	svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
	svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
	svg.setAttribute('aria-hidden', 'true');
	svg.setAttribute('focusable', 'false');
	svg.classList.add('landscape');

	// angle: broad turning regions; length: where lines run long or shrink
	const angleField = field(random, 4, 1.1);
	const lengthField = field(random, 3, 0.9);

	// One path per tint, redrawn whole each time.
	const paths = TINTS.map((tint) => {
		const path = document.createElementNS(NS, 'path');
		path.setAttribute('stroke-width', STROKE);
		path.classList.add(tint, 'lm-stroke');
		svg.append(path);
		return path;
	});

	svg.draw = (time = 0) => {
		const parts = TINTS.map(() => []);
		for (let x = GRID / 2; x < W; x += GRID) {
			for (let y = GRID / 2; y < H; y += GRID) {
				// a full turn of the angle field spans every orientation;
				// length runs from a faint tick to a full stroke
				const angle = angleField(x, y, time) * Math.PI;
				const share = 0.15 + 0.85 * clamp01(0.5 + 0.75 * lengthField(x, y, time));
				const tint = Math.min(TINTS.length - 1, (share * TINTS.length) | 0);

				const half = (LENGTH * share) / 2;
				const dx = Math.cos(angle) * half;
				const dy = Math.sin(angle) * half;
				parts[tint].push(`M${fix(x - dx)},${fix(y - dy)}l${fix(2 * dx)},${fix(2 * dy)}`);
			}
		}
		parts.forEach((part, i) => paths[i].setAttribute('d', part.join('')));
	};

	svg.draw(0);
	return svg;
}
