// Generated "mark field" landscapes for the act openers: flowing bands that
// are told apart only by the marks that fill them (asterisks, dots, stipple,
// dash rows, contour lines), after the hand-stippled landscape reference.
// Everything is drawn in tints of the act's colour via CSS classes, seeded by
// the act's name so each act always gets the same picture.

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

// A wavy boundary across the width: a baseline plus a few seeded sines.
function wave(random, base, amplitude) {
	const terms = Array.from({ length: 3 }, (_, i) => ({
		a: amplitude * (0.35 + random() * 0.65) / (i + 1),
		f: ((i + 1) * (0.6 + random() * 0.8) * Math.PI * 2) / W,
		p: random() * Math.PI * 2,
	}));
	return (x) => base + terms.reduce((y, t) => y + t.a * Math.sin(t.f * x + t.p), 0);
}

const circle = (x, y, r) => `M${(x - r).toFixed(1)},${y.toFixed(1)}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`;

function asterisk(x, y, r, angle) {
	let d = '';
	for (let k = 0; k < 3; k++) {
		const a = angle + (k * Math.PI) / 3;
		const dx = Math.cos(a) * r;
		const dy = Math.sin(a) * r;
		d += `M${(x - dx).toFixed(1)},${(y - dy).toFixed(1)}L${(x + dx).toFixed(1)},${(y + dy).toFixed(1)}`;
	}
	return d;
}

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
// regions.
const FILLS = {
	asterisks(random, top, bottom, skip) {
		return scatter(random, top, bottom, 11, 0.4, 0.9)
			.filter(([x, y]) => !skip(x, y))
			.map(([x, y]) => asterisk(x, y, 2.5, random() * Math.PI))
			.join('');
	},
	dots(random, top, bottom, skip) {
		return scatter(random, top, bottom, 9, 0.5, 0.85)
			.filter(([x, y]) => !skip(x, y))
			.map(([x, y]) => circle(x, y, 1.8))
			.join('');
	},
	stipple(random, top, bottom) {
		return scatter(random, top, bottom, 4.2, 0.3, 0.95)
			.map(([x, y]) => circle(x, y, 1.2))
			.join('');
	},
	// Short leaf strokes in rows that follow the band's curve, each tilted
	// across the row like the reference's combed fields.
	dashes(random, top, bottom, skip) {
		let d = '';
		for (let t = 0.08; t < 0.96; t += 0.11) {
			for (let x = (random() * 9) | 0; x < W; x += 9) {
				if (bottom(x) - top(x) < 3) continue; // band has tapered away
				const y = top(x) + (bottom(x) - top(x)) * t;
				if (skip(x, y)) continue;
				const along = Math.atan2(top(x + 4) + (bottom(x + 4) - top(x + 4)) * t - y, 4);
				const a = along - 0.9 + (random() - 0.5) * 0.3;
				const dx = Math.cos(a) * 3;
				const dy = Math.sin(a) * 3;
				d += `M${(x - dx).toFixed(1)},${(y - dy).toFixed(1)}L${(x + dx).toFixed(1)},${(y + dy).toFixed(1)}`;
			}
		}
		return d;
	},
	// Fine lines running parallel through the band, like wood grain; a line
	// breaks where it would cross an island.
	contours(random, top, bottom, skip) {
		let d = '';
		for (let t = 0.04; t < 1; t += 0.06) {
			const drift = (random() - 0.5) * 10;
			let pen = false;
			for (let x = 0; x <= W; x += 8) {
				const depth = bottom(x) - top(x);
				// the wobble and drift shrink with the band, so lines settle into the edge
				const y = top(x) + depth * t + (Math.sin(x / 90 + t * 9) * 3 + drift) * Math.min(1, depth / 40);
				if (depth < 3 || skip(x, y)) {
					pen = false;
					continue;
				}
				d += `${pen ? 'L' : 'M'}${x},${y.toFixed(1)}`;
				pen = true;
			}
		}
		return d;
	},
};

// Mark type → tint class (see css/talk.css) and whether it's stroked.
const STYLE = {
	asterisks: { tint: 'lm-tint-70', stroke: 1.2 },
	dots: { tint: 'lm-tint-35' },
	stipple: { tint: 'lm-tint-100' },
	dashes: { tint: 'lm-tint-70', stroke: 2.6 },
	contours: { tint: 'lm-tint-55', stroke: 1.1 },
};

export function landscape(seedText) {
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
	const depth = (k, x) => {
		let d = -Infinity;
		for (let j = k; j < n; j++) d = Math.max(d, (H - raws[j](x)) * taperOf(j)(x));
		return d;
	};
	const bounds = raws.map((_, k) => (x) => H - depth(k, x));

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
		islands.push({ top: (x) => mid(x) - half(x), bottom: (x) => mid(x) + half(x) * 0.6, half });
	}
	const GAP = 4; // clear space around an island, in px
	const skip = (x, y) => islands.some((isl) => isl.half(x) > 0 && y > isl.top(x) - GAP && y < isl.bottom(x) + GAP);

	const layers = { asterisks: '', dots: '', stipple: '', dashes: '', contours: '' };
	const order = ['contours', 'dots', 'dashes', 'asterisks', 'contours', 'dots', 'dashes'];
	const offset = (random() * order.length) | 0;
	for (let i = 0; i < bounds.length - 1; i++) {
		const kind = order[(i + offset) % order.length];
		layers[kind] += FILLS[kind](random, bounds[i], bounds[i + 1], skip);
	}
	for (const isl of islands) layers.stipple += FILLS.stipple(random, isl.top, isl.bottom);

	// Sky: a thin trail of asterisks along a gentle curve above the horizon.
	// the sky trail thins out with the outermost mound
	const skyFade = taperOf(0);
	const rawTrail = wave(random, horizon - 90 - random() * 60, 40);
	const trail = (x) => H - Math.max((H - rawTrail(x)) * skyFade(x), depth(0, x));
	layers.asterisks += FILLS.asterisks(random, (x) => trail(x) - 14 * skyFade(x), (x) => trail(x) + 14 * skyFade(x), skip);

	for (const [kind, d] of Object.entries(layers)) {
		if (!d) continue;
		const path = document.createElementNS(NS, 'path');
		path.setAttribute('d', d);
		path.classList.add(STYLE[kind].tint, STYLE[kind].stroke ? 'lm-stroke' : 'lm-fill');
		if (STYLE[kind].stroke) path.setAttribute('stroke-width', STYLE[kind].stroke);
		svg.append(path);
	}
	return svg;
}
