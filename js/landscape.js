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

// Jittered grid of points between two boundaries.
function scatter(random, top, bottom, spacing, keep = 1) {
	const points = [];
	for (let x = -spacing; x < W + spacing; x += spacing) {
		for (let y = 0; y < H + spacing; y += spacing) {
			const px = x + (random() - 0.5) * spacing;
			const py = y + (random() - 0.5) * spacing;
			if (py > top(px) && py < bottom(px) && random() < keep) points.push([px, py]);
		}
	}
	return points;
}

const FILLS = {
	asterisks(random, top, bottom) {
		return scatter(random, top, bottom, 24, 0.85)
			.map(([x, y]) => asterisk(x, y, 5.5, random() * Math.PI))
			.join('');
	},
	dots(random, top, bottom) {
		return scatter(random, top, bottom, 24, 0.8)
			.map(([x, y]) => circle(x, y, 4.2))
			.join('');
	},
	stipple(random, top, bottom) {
		return scatter(random, top, bottom, 7.5, 0.92)
			.map(([x, y]) => circle(x, y, 2.6))
			.join('');
	},
	// Short strokes in rows that follow the band's curve.
	// Short leaf strokes in rows that follow the band's curve, each tilted
	// across the row like the reference's combed fields.
	dashes(random, top, bottom) {
		let d = '';
		for (let t = 0.12; t < 0.95; t += 0.2) {
			for (let x = (random() * 16) | 0; x < W; x += 16) {
				const y = top(x) + (bottom(x) - top(x)) * t;
				const along = Math.atan2(top(x + 4) + (bottom(x + 4) - top(x + 4)) * t - y, 4);
				const a = along - 0.9 + (random() - 0.5) * 0.3;
				const dx = Math.cos(a) * 5;
				const dy = Math.sin(a) * 5;
				d += `M${(x - dx).toFixed(1)},${(y - dy).toFixed(1)}L${(x + dx).toFixed(1)},${(y + dy).toFixed(1)}`;
			}
		}
		return d;
	},
	// Fine lines running parallel through the band, like wood grain.
	contours(random, top, bottom) {
		let d = '';
		for (let t = 0.05; t < 1; t += 0.11) {
			const drift = (random() - 0.5) * 10;
			for (let x = 0; x <= W; x += 16) {
				const y = top(x) + (bottom(x) - top(x)) * t + Math.sin(x / 90 + t * 9) * 3 + drift;
				d += `${x === 0 ? 'M' : 'L'}${x},${y.toFixed(1)}`;
			}
		}
		return d;
	},
};

// Mark type → tint class (see css/talk.css) and whether it's stroked.
const STYLE = {
	asterisks: { tint: 'lm-tint-70', stroke: 2.2 },
	dots: { tint: 'lm-tint-35' },
	stipple: { tint: 'lm-tint-100' },
	dashes: { tint: 'lm-tint-70', stroke: 4.5 },
	contours: { tint: 'lm-tint-55', stroke: 1.8 },
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
	const horizon = 440 + random() * 40;
	const bounds = [wave(random, horizon, 45)];
	let y = horizon;
	while (y < H + 40) {
		y += 55 + random() * 55;
		bounds.push(wave(random, y, 30 + random() * 25));
	}

	const layers = { asterisks: '', dots: '', stipple: '', dashes: '', contours: '' };
	const order = ['contours', 'dots', 'dashes', 'asterisks', 'contours', 'dots', 'dashes'];
	const offset = (random() * order.length) | 0;
	for (let i = 0; i < bounds.length - 1; i++) {
		const kind = order[(i + offset) % order.length];
		layers[kind] += FILLS[kind](random, bounds[i], bounds[i + 1]);
	}

	// Dense stipple islands: lens shapes laid over two of the bands.
	for (let n = 0; n < 2; n++) {
		const i = 1 + ((random() * (bounds.length - 2)) | 0);
		const x0 = random() * W * 0.6;
		const width = W * (0.3 + random() * 0.35);
		const thickness = 20 + random() * 30;
		const mid = bounds[i];
		const half = (x) => {
			const u = (x - x0) / width;
			return u <= 0 || u >= 1 ? 0 : thickness * Math.sin(Math.PI * u) ** 0.8;
		};
		layers.stipple += FILLS.stipple(random, (x) => mid(x) - half(x), (x) => mid(x) + half(x) * 0.6);
	}

	// Sky: a thin trail of asterisks along a gentle curve above the horizon.
	const trail = wave(random, horizon - 90 - random() * 60, 40);
	layers.asterisks += FILLS.asterisks(random, (x) => trail(x) - 14, (x) => trail(x) + 14);

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
