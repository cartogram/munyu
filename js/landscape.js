// Generated "mark field" landscapes for the act openers: flowing bands that
// are told apart only by the marks that fill them (asterisks, dots, stipple,
// dash rows, contour lines), after the hand-stippled landscape reference.
// Everything is drawn in tints of the act's colour via CSS classes, seeded by
// the act's name so each act always gets the same picture.
//
// Each band, island and the sky trail is cut into vertical strips, one path
// each, numbered in `data-reveal` (outermost band first, sky last) and
// `data-strip` (left to right), so js/site.js can grow the marks in strip by
// strip.
//
// A live landscape (`{ live: true }`) also gets `svg.flow(seconds)`: the band
// boundaries drift and swell over time, like a streamgraph, and every mark
// rides along at its place within its band.

const W = 1280;
const H = 800;
const NS = 'http://www.w3.org/2000/svg';

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

// A wavy boundary across the width: a baseline plus a few seeded sines. Over
// `time` (seconds) each sine drifts sideways and swells and thins; at time 0
// it is the still picture. The motion takes nothing from `random`, so the
// still pictures don't change.
function wave(random, base, amplitude) {
	const terms = Array.from({ length: 3 }, (_, i) => ({
		a: amplitude * (0.35 + random() * 0.65) / (i + 1),
		f: ((i + 1) * (0.6 + random() * 0.8) * Math.PI * 2) / W,
		p: random() * Math.PI * 2,
		drift: (0.18 + 0.09 * i) * (i % 2 ? -1 : 1), // radians per second
		swell: 0.23 * (i + 1),
	}));
	return (x, time = 0) =>
		base +
		terms.reduce((y, t) => y + t.a * (1 + 0.25 * Math.sin(t.swell * time)) * Math.sin(t.f * x + t.p + t.drift * time), 0);
}

// Every mark is a stroke, so js/site.js can grow all the marks in a path at
// once with one property: a dot is a zero-length round-capped stroke (it
// swells with stroke-width), and asterisks and leaf dashes are arms drawn out
// from their centre (they grow with stroke-dasharray, which restarts on every
// subpath). Marks keep their geometry — { x, y } and `arms` (angles, length
// `r`), or a contour's `runs` of [x, y] points — and are drawn by `draw`,
// with `at(x, y)` placing each point (the identity for a still picture).
const fix = (n) => n.toFixed(1);
const still = (x, y) => y;

function draw(mark, at = still) {
	if (mark.runs) return mark.runs.map((run) => run.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${fix(at(x, y))}`).join('')).join('');
	const head = `M${fix(mark.x)},${fix(at(mark.x, mark.y))}`;
	if (!mark.arms) return `${head}h0`;
	return mark.arms.map((a) => `${head}l${fix(Math.cos(a) * mark.r)},${fix(Math.sin(a) * mark.r)}`).join('');
}

const asteriskArms = (angle) => [0, 1, 2, 3, 4, 5].map((k) => angle + (k * Math.PI) / 3);

// Jittered grid of points between two boundaries. Jitter is a fraction of
// the spacing, so neighbours are always at least (1 - jitter) × spacing
// apart: callers pick a jitter that keeps their marks from touching.
function scatter(random, top, bottom, spacing, jitter, keep = 1) {
	const points = [];
	for (let x = -spacing; x < W + spacing; x += spacing) {
		for (let y = 0; y < H + spacing; y += spacing) {
			const px = x + (random() - 0.5) * spacing * jitter;
			const py = y + (random() - 0.5) * spacing * jitter;
			// a small inset keeps marks off the boundary shared with the next band
			if (py > top(px) + 2.5 && py < bottom(px) - 2.5 && random() < keep) points.push([px, py]);
		}
	}
	return points;
}

// Each fill takes the band's top/bottom boundaries and a `skip(x, y)` test
// for points claimed by a stipple island, so marks never overlap across
// regions. It returns its marks, which carry an `x` so they can be cut into
// strips.
const FILLS = {
	asterisks(random, top, bottom, skip) {
		return scatter(random, top, bottom, 11, 0.4, 0.9)
			.filter(([x, y]) => !skip(x, y))
			.map(([x, y]) => ({ x, y, r: 2.5, arms: asteriskArms(random() * Math.PI) }));
	},
	dots(random, top, bottom, skip) {
		return scatter(random, top, bottom, 9, 0.5, 0.85)
			.filter(([x, y]) => !skip(x, y))
			.map(([x, y]) => ({ x, y }));
	},
	stipple(random, top, bottom) {
		return scatter(random, top, bottom, 4.2, 0.3, 0.95).map(([x, y]) => ({ x, y }));
	},
	// Short leaf strokes in rows that follow the band's curve, each tilted
	// across the row like the reference's combed fields.
	dashes(random, top, bottom, skip) {
		const marks = [];
		for (let t = 0.08; t < 0.96; t += 0.11) {
			for (let x = (random() * 9) | 0; x < W; x += 9) {
				if (bottom(x) - top(x) < 3) continue; // band has tapered away
				const y = top(x) + (bottom(x) - top(x)) * t;
				if (skip(x, y)) continue;
				const along = Math.atan2(top(x + 4) + (bottom(x + 4) - top(x + 4)) * t - y, 4);
				const a = along - 0.9 + (random() - 0.5) * 0.3;
				marks.push({ x, y, r: 3, arms: [a, a + Math.PI] });
			}
		}
		return marks;
	},
	// Fine lines running parallel through the band, like wood grain; a line
	// breaks where it would cross an island. Lines run the full width, so they
	// stay one mark (they draw themselves left to right).
	contours(random, top, bottom, skip) {
		const runs = [];
		for (let t = 0.04; t < 1; t += 0.06) {
			const drift = (random() - 0.5) * 10;
			let run = null;
			for (let x = 0; x <= W; x += 8) {
				const depth = bottom(x) - top(x);
				// the wobble and drift shrink with the band, so lines settle into the edge
				const y = top(x) + depth * t + (Math.sin(x / 90 + t * 9) * 3 + drift) * Math.min(1, depth / 40);
				if (depth < 3 || skip(x, y)) {
					run = null;
					continue;
				}
				if (!run) runs.push((run = []));
				run.push([x, y]);
			}
		}
		return runs.length ? [{ x: 0, runs }] : [];
	},
};

// Mark type → tint class (see css/talk.css), stroke width, and how
// js/site.js grows it (data-grow): 'dot' by stroke-width, 'arm' and 'line'
// by stroke-dasharray up to data-size (the arm or line length).
const STYLE = {
	asterisks: { tint: 'lm-tint-70', stroke: 1.2, grow: 'arm', size: 2.5 },
	dots: { tint: 'lm-tint-35', stroke: 3.6, grow: 'dot' },
	stipple: { tint: 'lm-tint-100', stroke: 2.4, grow: 'dot' },
	dashes: { tint: 'lm-tint-70', stroke: 2.6, grow: 'arm', size: 3 },
	contours: { tint: 'lm-tint-55', stroke: 1.1, grow: 'line', size: W + 40 },
};

const STRIP = 160; // width of the strips a band's marks are cut into

export function landscape(seedText, { live = false } = {}) {
	const random = rng(seedText);
	const svg = document.createElementNS(NS, 'svg');
	svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
	svg.setAttribute('preserveAspectRatio', 'xMidYMax slice');
	svg.setAttribute('aria-hidden', 'true');
	svg.setAttribute('focusable', 'false');
	svg.classList.add('landscape');

	// Bands fill the lower part of the frame; a loose drift of asterisks rises
	// into the sky above them.
	// Toward the right the mounds give out one by one until none are left.
	// Each boundary has its own taper, the outermost ending first; a boundary
	// can never sit below the next one in, so a finished band simply closes
	// up against its neighbour. The art ends inside the frame, not at a cut.
	const smooth = (u) => (u <= 0 ? 1 : u >= 1 ? 0 : 1 - u * u * (3 - 2 * u));
	const horizon = 420 + random() * 70;
	const raws = [wave(random, horizon, 35 + random() * 40)];
	let y = horizon;
	while (y < H + 40) {
		y += 35 + random() * 95;
		raws.push(wave(random, y, 15 + random() * 45));
	}
	const n = raws.length;
	// Each band gets a seeded end point (share of the width where it's gone)
	// and taper length: roughly outermost first, with plenty of variation, and
	// the last one running almost to the right edge.
	const ends = raws.map((_, k) => Math.min(1.02, 0.6 + 0.4 * (k / (n - 1)) + (random() - 0.5) * 0.22));
	const spans = raws.map(() => 0.35 + random() * 0.3);
	const taperOf = (k) => (x) => smooth((x / W - (ends[k] - spans[k])) / spans[k]);
	const depth = (k, x, time = 0) => {
		let d = -Infinity;
		for (let j = k; j < n; j++) d = Math.max(d, (H - raws[j](x, time)) * taperOf(j)(x));
		return d;
	};
	const bounds = raws.map((_, k) => (x, time = 0) => H - depth(k, x, time));

	// Dense stipple islands: lens shapes over two of the bands. They're decided
	// first so the bands can leave room for them.
	const islands = [];
	for (let n = 0; n < 2; n++) {
		const i = 1 + ((random() * (bounds.length - 2)) | 0);
		const x0 = random() * W * 0.6;
		const width = W * (0.3 + random() * 0.35);
		const thickness = 20 + random() * 30;
		const mid = bounds[i];
		const fade = taperOf(i);
		const half = (x) => {
			const u = (x - x0) / width;
			return u <= 0 || u >= 1 ? 0 : thickness * fade(x) * Math.sin(Math.PI * u) ** 0.8;
		};
		islands.push({ band: i, top: (x) => mid(x) - half(x), bottom: (x) => mid(x) + half(x) * 0.6, half });
	}
	const GAP = 4; // clear space around an island, in px
	const skip = (x, y) => islands.some((isl) => isl.half(x) > 0 && y > isl.top(x) - GAP && y < isl.bottom(x) + GAP);

	// pieces in drawing order; `band` places each in the reveal sequence
	const pieces = [];
	const order = ['contours', 'dots', 'dashes', 'asterisks', 'contours', 'dots', 'dashes'];
	const offset = (random() * order.length) | 0;
	for (let i = 0; i < bounds.length - 1; i++) {
		const kind = order[(i + offset) % order.length];
		pieces.push({ kind, band: i, marks: FILLS[kind](random, bounds[i], bounds[i + 1], skip) });
	}
	// an island arrives with the band it sits on
	islands.forEach((isl) => pieces.push({ kind: 'stipple', band: isl.band, marks: FILLS.stipple(random, isl.top, isl.bottom) }));

	// Sky: a thin trail of asterisks along a gentle curve above the horizon.
	// the sky trail thins out with the outermost mound
	const skyFade = taperOf(0);
	const rawTrail = wave(random, horizon - 90 - random() * 60, 40);
	const trail = (x, time = 0) => H - Math.max((H - rawTrail(x, time)) * skyFade(x), depth(0, x, time));
	pieces.push({
		kind: 'asterisks',
		band: -1,
		marks: FILLS.asterisks(random, (x) => trail(x) - 14 * skyFade(x), (x) => trail(x) + 14 * skyFade(x), skip),
	});

	// Reveal order: the outermost band (nearest the card's leading edge once
	// the art is flipped) first, in toward the horizon, then the sky.
	const sequence = [...new Set(pieces.map((piece) => piece.band))].sort((a, b) => b - a);
	const paths = []; // { path, marks, piece }
	for (const piece of pieces) {
		const strips = new Map();
		for (const mark of piece.marks) {
			const strip = Math.max(0, Math.floor(mark.x / STRIP));
			if (!strips.has(strip)) strips.set(strip, []);
			strips.get(strip).push(mark);
		}
		const { tint, stroke, grow, size } = STYLE[piece.kind];
		for (const [strip, marks] of strips) {
			const path = document.createElementNS(NS, 'path');
			path.setAttribute('d', marks.map((mark) => draw(mark)).join(''));
			path.setAttribute('stroke-width', stroke);
			path.classList.add(tint, 'lm-stroke');
			Object.assign(path.dataset, { reveal: sequence.indexOf(piece.band), strip, grow, size: size ?? stroke });
			svg.append(path);
			paths.push({ path, marks, piece });
		}
	}
	if (live) svg.flow = flowing(paths, bounds, trail);
	return svg;
}

// Builds a live landscape's `flow(time)`. Each point keeps its place relative
// to what holds it — a band mark its share of the way across its band, an
// island mark its offset from the boundary it sits on, a sky mark its offset
// from the trail — so as the boundaries move the marks stretch and gather
// with their bands. The boundaries are sampled once per frame on a grid and
// interpolated, rather than re-summed for every mark.
function flowing(paths, bounds, trail) {
	const STEP = 8;
	const columns = Math.ceil((W + 40) / STEP) + 1;
	const curves = [...bounds, trail];
	const sample = (time) =>
		curves.map((curve) => Float64Array.from({ length: columns }, (_, c) => curve(c * STEP - 20, time)));
	const read = (samples, x) => {
		const u = Math.min(columns - 1.001, Math.max(0, (x + 20) / STEP));
		const c = u | 0;
		return samples[c] + (samples[c + 1] - samples[c]) * (u - c);
	};

	// how each piece places a point, given this frame's samples (`now`) and
	// the still picture's (`rest`)
	const rest = sample(0);
	const sky = curves.length - 1;
	const placer = (piece) => {
		if (piece.band === -1) return (now) => (x, y) => y + read(now[sky], x) - read(rest[sky], x);
		if (piece.kind === 'stipple') {
			const b = piece.band;
			return (now) => (x, y) => y + read(now[b], x) - read(rest[b], x);
		}
		const top = piece.band;
		const share = (x, y) => {
			const t0 = read(rest[top], x);
			const d0 = read(rest[top + 1], x) - t0;
			return d0 > 0.01 ? (y - t0) / d0 : 0;
		};
		return (now) => (x, y) => {
			const t1 = read(now[top], x);
			return t1 + share(x, y) * (read(now[top + 1], x) - t1);
		};
	};
	const placers = new Map(paths.map(({ piece }) => [piece, placer(piece)]));

	return (time) => {
		const now = sample(time);
		const at = new Map([...placers].map(([piece, place]) => [piece, place(now)]));
		for (const { path, marks, piece } of paths) {
			path.setAttribute('d', marks.map((mark) => draw(mark, at.get(piece))).join(''));
		}
	};
}
