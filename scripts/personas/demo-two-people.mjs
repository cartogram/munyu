// The branching demo's pieces, drawn from scratch and written to
// originals/demo-two-people.svg for normalize-personas.mjs to tint and finish.
// Three stacks side by side on a 2060-wide canvas, Rose's, Myron's and an
// unnamed someone's, in the order the deck reveals them: the intent, the same
// for everyone, in a box at the top; then a box for each kind of context, the
// empathy, stepped in under it; and over them the device with the UI they add
// up to. The boxes are plain, in the wash, with no outline; the device is
// outlined bold. The third person stands for everyone else, so their stack is
// drawn subdued, a step lighter throughout, and past it a fourth, empty stack
// runs off the card's edge: the list goes on.
//
// Each piece is a data-part the deck moves: <person>-intent, <person>-screen-1
// to -3, <person>-bracket, gathering the stack into the device, <person>-ui,
// the device with its UI, and more, the empty stack, with more-bracket. The
// finish gives every bracket Myron's (REUSE in normalize-personas.mjs). <person>-head, their head and
// shoulders, is drawn hidden, for the deck's avatar buttons. Words are text,
// set in Aileron by the deck.
//   node scripts/personas/demo-two-people.mjs
import { INK, WHITE, DEEP, SOFT, WASH, LIGHT, poly, line, circle, ellipse, curve, path, write } from './draw.mjs';

const OUT = new URL('../../media/personas/originals/demo-two-people.svg', import.meta.url);
const LINE = 7; // outline weight, close to the traced set's after the finish

// a rounded rectangle's outline points, clockwise from the top-left corner
const rounded = (x, y, w, h, r, n = 6) => {
	const arc = (cx, cy, from) =>
		Array.from({ length: n + 1 }, (_, k) => {
			const a = ((from + (90 * k) / n) * Math.PI) / 180;
			return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
		});
	return [...arc(x + r, y + r, 180), ...arc(x + w - r, y + r, 270), ...arc(x + w - r, y + h - r, 0), ...arc(x + r, y + h - r, 90)];
};
// the points of a polygon path (poly, circle, ellipse), to outline or edit
const points = (d) => {
	const n = d.match(/-?\d+\.?\d*/g).map(Number);
	return Array.from({ length: n.length / 2 }, (_, i) => [n[2 * i], n[2 * i + 1]]);
};
// a polygon grown outwards by d (shrunk, for a negative d), each corner moved
// along the bisector of its two edges' outward normals
const offset = (pts, d) => {
	const area = pts.reduce((a, [x, y], i) => a + x * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * y, 0);
	const s = area > 0 ? -1 : 1; // which side of each edge is outside
	const normal = ([x0, y0], [x1, y1]) => {
		const len = Math.hypot(x1 - x0, y1 - y0) || 1;
		return [(s * -(y1 - y0)) / len, (s * (x1 - x0)) / len];
	};
	return pts.map((p, i) => {
		const a = normal(pts[(i - 1 + pts.length) % pts.length], p), b = normal(p, pts[(i + 1) % pts.length]);
		const m = [a[0] + b[0], a[1] + b[1]], len = Math.hypot(...m) || 1;
		const k = d / Math.max(0.4, (m[0] * a[0] + m[1] * a[1]) / len);
		return [p[0] + (m[0] / len) * k, p[1] + (m[1] / len) * k];
	});
};
// a closed curve through every point (Catmull-Rom), n points per span
const smooth = (pts, n = 6) =>
	pts.flatMap((p1, i) => {
		const at = (k) => pts[(i + k + pts.length) % pts.length];
		const [p0, p2, p3] = [at(-1), at(1), at(2)];
		return Array.from({ length: n }, (_, j) => {
			const t = j / n, t2 = t * t, t3 = t2 * t;
			return [0, 1].map(
				(c) => 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t3),
			);
		});
	});
// a piece with an ink outline: an ink sheet under it, a line's width bigger,
// as the traced illustrations are cut
const outlined = (fill, pts, w = LINE, ink = INK) => [path(ink, poly(offset(pts, w))), path(fill, poly(pts))];
// text, in a grey the finish maps to a ramp step like any fill; the deck sets
// it in Aileron, or in the serif for class="serif"
const text = (x, y, size, words, { fill = INK, anchor = 'start', weight = 600, serif = false } = {}) =>
	`<text x="${x}" y="${y}"${serif ? ' class="serif"' : ''} font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${words}</text>`;

const shapes = [];
let part; // the data-part the next shapes belong to
let hidden = false; // whether they're drawn hidden
let subdued = false; // whether they're drawn a step lighter: ink as deep, deep as soft
const lighter = { [INK]: DEEP, [DEEP]: SOFT };
const add = (...s) =>
	shapes.push(
		...s.flat().map((el) => {
			el = el.replace(/^<(path|text)\b/, `<$1 data-part="${part}"${hidden ? ' data-hidden' : ''}`);
			return subdued ? el.replace(/\bfill="([^"]+)"/, (m, fill) => `fill="${lighter[fill] ?? fill}"`) : el;
		}),
	);

// ---- the people: head and shoulders, turned to the right like Rose's
// portrait, drawn at S times the size first sketched, about the head's centre

function rose(hx, hy, S) {
	const at = (dx, dy) => [hx + dx * S, hy + dy * S];
	// her dark sweater: rounded shoulders, cut straight across like a bust
	add(path(INK, poly(rounded(...at(-128, 84), 266 * S, 120 * S, 64 * S).map(([x, y]) => [x, Math.min(y, hy + 150 * S)]))));
	// neck, behind the chin
	add(outlined(WHITE, [at(-14, 40), at(20, 40), at(22, 98), at(-16, 98)]));
	// the low bun at the back of her head, tied off with a light band
	add(path(INK, ellipse([...at(-74, 16), 30 * S, 24 * S, -12])));
	add(path(SOFT, poly([at(-50, 2), at(-40, -2), at(-32, 30), at(-42, 34)])));
	// hair: a dark cap over the top and back of the head
	add(path(INK, ellipse([...at(-6, -8), 60 * S, 58 * S])));
	// face: the front of the head, below the hairline, with a pointed nose out
	// of the profile and the chin dropping below the hair
	add(outlined(WHITE, smooth([
		at(-12, -24), at(18, -42), at(44, -44), at(52, -18), at(54, 6), at(68, 20), at(54, 26),
		at(50, 44), at(30, 60), at(6, 64), at(-14, 54), at(-24, 30), at(-22, 4),
	])));
	// dark glasses: a lens each side of the nose's bridge, and the arm back to the ear
	add(path(INK, ellipse([...at(20, 0), 22 * S, 15 * S, -4])));
	add(path(INK, ellipse([...at(54, -2), 9 * S, 14 * S, -4])));
	add(path(INK, line(at(40, -4), at(48, -4), 6 * S)));
	add(path(INK, line(at(-20, -4), at(0, -2), 6 * S)));
	// a small smile
	add(path(INK, curve(at(22, 38), at(34, 46), at(46, 36), 5 * S), 'edge'));
}

function myron(hx, hy, S) {
	const at = (dx, dy) => [hx + dx * S, hy + dy * S];
	// his light shirt: rounded shoulders, cut straight across like a bust
	add(outlined(WHITE, rounded(...at(-128, 84), 266 * S, 120 * S, 64 * S).map(([x, y]) => [x, Math.min(y, hy + 150 * S)])));
	// an open collar
	add(path(INK, line(at(-12, 92), at(4, 112), 5 * S)), path(INK, line(at(20, 92), at(4, 112), 5 * S)));
	// neck, behind the chin
	add(outlined(WHITE, [at(-14, 40), at(20, 40), at(22, 96), at(-16, 96)]));
	// short dark hair, over the top and back of the head
	add(path(INK, ellipse([...at(-4, -14), 58 * S, 52 * S])));
	// face, with a pointed nose out of the profile
	add(outlined(WHITE, smooth([
		at(-18, -26), at(16, -46), at(46, -40), at(54, -14), at(56, 8), at(70, 22), at(56, 28),
		at(52, 46), at(32, 62), at(6, 66), at(-14, 56), at(-26, 30), at(-24, 0),
	])));
	// a dot of an eye and a small smile
	add(path(INK, circle(at(34, -6), 4.5 * S, 24), 'edge'));
	add(path(INK, curve(at(26, 36), at(34, 42), at(42, 34), 5 * S), 'edge'));
	// his headset: an earcup over the ear, and the boom round to his mouth
	add(path(INK, line(at(-8, 20), at(44, 52), 6 * S)));
	add(outlined(SOFT, points(circle(at(-14, 6), 16 * S, 36)), 6));
	add(outlined(SOFT, points(circle(at(50, 54), 8 * S, 24)), 5));
}


// someone: no one in particular, a plain head and shoulders with no face
function someone(hx, hy, S) {
	const at = (dx, dy) => [hx + dx * S, hy + dy * S];
	add(path(SOFT, poly(rounded(...at(-128, 84), 266 * S, 120 * S, 64 * S).map(([x, y]) => [x, Math.min(y, hy + 150 * S)]))));
	add(path(SOFT, poly([at(-14, 40), at(20, 40), at(22, 98), at(-16, 98)])));
	add(path(SOFT, ellipse([...at(4, 6), 60 * S, 64 * S])));
}

// ---- the pictograms on the context boxes, centred on cx, cy at s times
// their first size

const PICTOGRAMS = {
	// a dimmed sun, its rays short
	sun(cx, cy, s) {
		add(outlined(SOFT, points(circle([cx, cy], 12 * s, 36)), 4 + s));
		for (let a = 0; a < 360; a += 45) {
			const r = (a * Math.PI) / 180;
			add(path(INK, line([cx + 19 * s * Math.cos(r), cy + 19 * s * Math.sin(r)], [cx + 25 * s * Math.cos(r), cy + 25 * s * Math.sin(r)], 3 + s), 'edge'));
		}
	},
	// drawn curtains, two plain panels meeting in the middle
	curtains(cx, cy, s) {
		for (const x0 of [cx - 24 * s, cx + 2 * s]) add(outlined(WHITE, rounded(x0, cy - 20 * s, 22 * s, 40 * s, 3 * s), 3 + s));
	},



	// a desk, its top and two legs, ending on the right like the set's tables
	desk(cx, cy, s) {
		add(outlined(WHITE, rounded(cx - 26 * s, cy - 6 * s, 52 * s, 9 * s, 2 * s), 3 + s));
		add(path(INK, line([cx - 20 * s, cy + 6 * s], [cx - 20 * s, cy + 22 * s], 3 + s)), path(INK, line([cx + 14 * s, cy + 6 * s], [cx + 14 * s, cy + 22 * s], 3 + s)));
		add(outlined(WHITE, rounded(cx - 10 * s, cy - 26 * s, 26 * s, 16 * s, 2 * s), 3 + s));
	},

	// the front of a train, its two windows and its lamps
	train(cx, cy, s) {
		add(outlined(WHITE, rounded(cx - 20 * s, cy - 24 * s, 40 * s, 44 * s, 9 * s), 4 + s));
		add(path(INK, poly(rounded(cx - 14 * s, cy - 17 * s, 28 * s, 16 * s, 3 * s)), 'edge'));
		for (const dx of [-10, 10]) add(path(INK, circle([cx + dx * s, cy + 10 * s], 3 * s, 16), 'edge'));
		add(path(INK, line([cx - 14 * s, cy + 22 * s], [cx - 20 * s, cy + 30 * s], 3 + s)), path(INK, line([cx + 14 * s, cy + 22 * s], [cx + 20 * s, cy + 30 * s], 3 + s)));
	},
	// a battery, half full
	battery(cx, cy, s) {
		add(outlined(WHITE, rounded(cx - 24 * s, cy - 14 * s, 44 * s, 28 * s, 5 * s), 4 + s));
		add(path(INK, poly(rounded(cx + 22 * s, cy - 6 * s, 6 * s, 12 * s, 2 * s))));
		add(path(INK, poly(rounded(cx - 19 * s, cy - 9 * s, 18 * s, 18 * s, 2 * s)), 'edge'));
	},
	// a wheelchair from the side: its big wheel, the seat and back, and the
	// small front wheel
	wheelchair(cx, cy, s) {
		add(outlined(WHITE, points(circle([cx - 4 * s, cy + 6 * s], 16 * s, 36)), 4 + s));
		add(path(INK, circle([cx - 4 * s, cy + 6 * s], 3 * s, 12), 'edge'));
		add(path(INK, line([cx - 14 * s, cy - 26 * s], [cx - 10 * s, cy - 6 * s], 4 + s)), path(INK, line([cx - 10 * s, cy - 6 * s], [cx + 18 * s, cy - 6 * s], 4 + s)));
		add(path(INK, line([cx + 16 * s, cy - 6 * s], [cx + 20 * s, cy + 16 * s], 3 + s)));
		add(path(INK, circle([cx + 20 * s, cy + 19 * s], 4 * s, 16)));
	},
	// a spreadsheet: a sheet with a dark header row and a grid
	grid(cx, cy, s) {
		add(outlined(WHITE, rounded(cx - 22 * s, cy - 18 * s, 44 * s, 36 * s, 3 * s), 4 + s));
		add(path(INK, poly(rounded(cx - 22 * s, cy - 18 * s, 44 * s, 9 * s, 2 * s))));
		for (const dy of [3, 11]) add(path(INK, line([cx - 22 * s, cy + dy * s], [cx + 22 * s, cy + dy * s], 2 + s), 'edge'));
		for (const dx of [-7, 8]) add(path(INK, line([cx + dx * s, cy - 9 * s], [cx + dx * s, cy + 18 * s], 2 + s), 'edge'));
	},
	// a pair of glasses: two round lenses, the bridge and the arms
	glasses(cx, cy, s) {
		for (const dx of [-13, 13]) add(outlined(WHITE, points(circle([cx + dx * s, cy + 2 * s], 10 * s, 36)), 3 + s));
		add(path(INK, curve([cx - 4 * s, cy], [cx, cy - 4 * s], [cx + 4 * s, cy], 3 + s, false)));
		add(path(INK, line([cx - 23 * s, cy], [cx - 28 * s, cy - 6 * s], 3 + s)), path(INK, line([cx + 23 * s, cy], [cx + 28 * s, cy - 6 * s], 3 + s)));
	},


	// a clock
	clock(cx, cy, s) {
		add(outlined(WHITE, points(circle([cx, cy], 20 * s, 36)), 4 + s));
		add(path(INK, line([cx, cy], [cx, cy - 12 * s], 3 + s), 'edge'), path(INK, line([cx, cy], [cx + 9 * s, cy + 5 * s], 3 + s), 'edge'));
	},
};

// ---- the devices, each a case outlined bold with its screen inset; x, y is
// the case's top-left corner

const BASE_LINE = 14; // the devices' outline
function device({ x, y, w, h }, r, inset, screen) {
	add(outlined(WASH, rounded(x, y, w, h, r), BASE_LINE));
	const s = { x: x + inset, y: y + inset, w: w - 2 * inset, h: h - 2 * inset };
	add(path(screen, poly(rounded(s.x, s.y, s.w, s.h, Math.max(8, r - inset))), 'edge'));
	return s;
}

// Rose's iPad, on its side: a translator, dark and dim, nothing on it brighter
// than the soft step, its two languages side by side
function tablet(x, y) {
	const s = device({ x, y, w: 560, h: 360 }, 40, 28, INK);
	add(text(s.x + 28, s.y + 44, 22, 'Translate', { fill: SOFT }));
	const w = (s.w - 28 * 3) / 2;
	[['EN', [170, 130, 150]], ['DE', [180, 140, 110]]].forEach(([chip, lines], i) => {
		const px = s.x + 28 + i * (w + 28), py = s.y + 70;
		add(path(DEEP, poly(rounded(px, py, w, s.h - 98, 16)), 'edge'));
		add(path(SOFT, poly(rounded(px + 18, py + 18, 60, 28, 14)), 'edge'));
		add(text(px + 48, py + 39, 17, chip, { fill: DEEP, anchor: 'middle', weight: 700 }));
		lines.forEach((len, j) => add(path(SOFT, line([px + 22, py + 82 + 32 * j], [px + 22 + len, py + 82 + 32 * j], 11), 'edge')));
	});
}

// Myron's desktop monitor on its stand: voice only, a mic that's listening,
// its rings and its waveform
function monitor(x, y) {
	const [w, h] = [560, 330];
	// the stand first, so the screen's case covers its top
	add(outlined(WASH, [[x + w / 2 - 34, y + h - 20], [x + w / 2 + 34, y + h - 20], [x + w / 2 + 44, y + h + 64], [x + w / 2 - 44, y + h + 64]], 10));
	add(outlined(WASH, rounded(x + w / 2 - 120, y + h + 60, 240, 26, 10), 10));
	const s = device({ x, y, w, h }, 26, 22, WHITE);
	add(text(s.x + 28, s.y + 44, 22, 'Translate'));
	const [cx, cy] = [s.x + 150, s.y + s.h / 2 + 18];
	for (const r of [100, 78]) add(path(SOFT, poly(offset(points(circle([cx, cy], r, 72)), 3)), 'edge'), path(WHITE, circle([cx, cy], r - 3, 72), 'edge'));
	add(path(LIGHT, circle([cx, cy], 54, 72)));
	add(outlined(WHITE, rounded(cx - 14, cy - 30, 28, 46, 14), 6));
	add(path(INK, curve([cx - 24, cy + 2], [cx, cy + 38], [cx + 24, cy + 2], 6, false)), path(INK, line([cx, cy + 20], [cx, cy + 34], 6)));
	const wave = [[0, 0], [24, -24], [48, 22], [72, -36], [96, 30], [120, -26], [144, 18], [168, -14], [192, 8], [210, 0]];
	const [wx, wy] = [s.x + 280, cy - 20];
	wave.slice(1).forEach(([x1, y1], j) => {
		const [x0, y0] = wave[j];
		add(path(INK, curve([wx + x0, wy + y0], [wx + (x0 + x1) / 2, wy + (y0 + y1) / 2 + (j % 2 ? 12 : -12)], [wx + x1, wy + y1], 6, false)));
	});
	add(text(wx + 105, wy + 70, 24, 'Listening…', { anchor: 'middle' }));
}

// someone's phone, held in one hand: the text up top, and everything to
// press in big buttons at the bottom, where a thumb reaches
function phone(x, y) {
	const s = device({ x, y, w: 300, h: 430 }, 48, 16, WHITE);
	add(text(s.x + 26, s.y + 44, 22, 'Translate'));
	add(path(WASH, poly(rounded(s.x + 22, s.y + 66, s.w - 44, 130, 16)), 'edge'));
	[150, 110, 130].forEach((len, j) => add(path(SOFT, line([s.x + 44, s.y + 100 + 30 * j], [s.x + 44 + len, s.y + 100 + 30 * j], 11), 'edge')));
	add(path(SOFT, poly(rounded(s.x + 22, s.y + 212, s.w - 44, 72, 36)), 'edge'));
	add(path(SOFT, poly(rounded(s.x + 22, s.y + 296, (s.w - 58) / 2, 72, 36)), 'edge'));
	add(path(SOFT, poly(rounded(s.x + 36 + (s.w - 58) / 2, s.y + 296, (s.w - 58) / 2, 72, 36)), 'edge'));
	add(path(INK, line([s.x + s.w / 2 - 36, s.y + s.h - 16], [s.x + s.w / 2 + 36, s.y + s.h - 16], 6), 'edge'));
}

// ---- the stacks ----
// Each person's stack, its left edge at ox: the intent in a box at the top;
// below it the empathy, a box for each kind of context, the same width but as
// tall as its words, each stepped a little further right; and last the
// device, set apart below. The devices' tops line up, below the tallest stack.
const BOX_W = 520, BOX_R = 28, GAP = 16, STEP = 33;
// a stack's width, and the space between two: wide enough that the empty
// stack past the last starts near the card's right edge, so only part of it
// shows (the deck's avatar grid, .branching-people, uses both)
const COL = BOX_W + STEP * 3, COL_GAP = 230;
const DEVICE_GAP = 126; // the space between the tallest stack's last box and the devices' outlines, room for the bracket
const BRACKET_GAP = 24, BRACKET_H = 44; // the bracket's space under the tallest stack, and its depth
// a box in the wash, no outline
const box = ({ x, y, w, h }) => add(path(WASH, poly(rounded(x, y, w, h, BOX_R))));
// words on as few lines as keep each within about n characters, as even as
// they break; or, where they hold a |, broken there
const wrap = (words, n) => {
	if (words.includes('|')) return words.split('|').map((l) => l.trim());
	const w = words.split(' ');
	// the most even split of w[i…] into k lines, as [lines, longest]
	const split = (i, k) => {
		if (k === 1) {
			const line = w.slice(i).join(' ');
			return [[line], line.length];
		}
		let best = null;
		for (let j = i + 1; j <= w.length - k + 1; j++) {
			const line = w.slice(i, j).join(' ');
			const [rest, longest] = split(j, k - 1);
			const max = Math.max(line.length, longest);
			if (!best || max < best[1]) best = [[line, ...rest], max];
		}
		return best;
	};
	for (let k = 1; k < w.length; k++) {
		const [lines, longest] = split(0, k);
		if (longest <= n + 2) return lines;
	}
	return w;
};

const KINDS = ['Condition', 'Environment', 'Situation'];
const PEOPLE = [
	{
		name: 'rose', draw: rose, device: tablet, deviceW: 560,
		context: [['sun', 'Hyperphotosensitivity'], ['curtains', 'On the couch, curtains drawn'], ['battery', 'Medium energy budget today']],
	},
	{
		name: 'myron', draw: myron, device: monitor, deviceW: 560,
		context: [['wheelchair', 'Spine injury, | steers by head'], ['desk', 'At his desk, headset on'], ['grid', 'Focused on a spreadsheet']],
	},
	{
		name: 'someone', draw: someone, device: phone, deviceW: 300, subdued: true,
		context: [['glasses', 'Needs reading glasses'], ['train', 'Crowded subway, one hand free'], ['clock', 'Running late, heatwave, stressful']],
	},
];

PEOPLE.forEach((person, n) => {
	const { name } = person;
	const x0 = n * (COL + COL_GAP), y0 = 0;
	subdued = !!person.subdued;
	// their head and shoulders, hidden, for the deck's avatar button
	part = `${name}-head`;
	hidden = true;
	person.draw(x0 + 194, y0 + 350, 1.25);
	hidden = false;

	// 0. the intent, its quote in the serif
	part = `${name}-intent`;
	const intent = { x: x0, y: y0, w: BOX_W, h: 124 };
	box(intent);
	add(text(x0 + 36, y0 + 54, 32, '“I’d like to', { serif: true, weight: 400 }));
	add(text(x0 + 36, y0 + 96, 32, 'translate this text”', { serif: true, weight: 400 }));

	// 1-3. the empathy: a box for each kind of context, its pictogram, its
	// kind and its words
	let y = intent.y + intent.h + GAP;
	person.context.forEach(([pictogram, words], i) => {
		part = `${name}-screen-${i + 1}`;
		const lines = wrap(words, 21);
		const b = { x: x0 + STEP * (i + 1), y, w: BOX_W, h: 78 + 39 * lines.length };
		box(b);
		PICTOGRAMS[pictogram](b.x + 58, b.y + b.h / 2, 1.3);
		add(text(b.x + 110, b.y + 46, 23, KINDS[i], { weight: 700 }));
		lines.forEach((l, j) => add(text(b.x + 110, b.y + 88 + 39 * j, 32, l)));
		y += b.h + GAP;
	});
	person.bottom = y - GAP;
});
// 4. the UI they add up to, centred under each stack, all at one height,
// and over it a bracket under the stack, gathering it to an arrow down into
// the device: the boxes are the input, the device what's made of them
const stacksBottom = Math.max(...PEOPLE.map((p) => p.bottom));
const deviceTop = stacksBottom + DEVICE_GAP + BASE_LINE;
function bracket(x0, name, ink = INK) {
	part = `${name}-bracket`;
	const [l, r, c] = [x0 + 40, x0 + COL - 40, x0 + COL / 2];
	const [top, mid, tip] = [stacksBottom + BRACKET_GAP, stacksBottom + BRACKET_GAP + BRACKET_H / 2, stacksBottom + BRACKET_GAP + BRACKET_H];
	const [w, hook] = [LINE - 1, 30];
	// a brace on its back: hooked ends up under the stack, a point down the middle
	add(path(ink, curve([l, top], [l, mid], [l + hook, mid], w, false)), path(ink, line([l + hook, mid], [c - hook, mid], w)));
	add(path(ink, curve([c - hook, mid], [c, mid], [c, tip], w, false)), path(ink, curve([c, tip], [c, mid], [c + hook, mid], w, false)));
	add(path(ink, line([c + hook, mid], [r - hook, mid], w)), path(ink, curve([r - hook, mid], [r, mid], [r, top], w, false)));
	// the arrow, from the point down to the device's outline
	const head = deviceTop - BASE_LINE - 14;
	add(path(ink, line([c, tip], [c, head - 22], w)), path(ink, poly([[c - 20, head - 28], [c + 20, head - 28], [c, head]])));
}
PEOPLE.forEach((person, n) => {
	subdued = !!person.subdued;
	bracket(n * (COL + COL_GAP), person.name);
	part = `${person.name}-ui`;
	// the finish thickens ink outlines outwards, but not a subdued one's, so
	// that sits higher to line up
	person.device(n * (COL + COL_GAP) + (COL - person.deviceW) / 2, deviceTop - (subdued ? 13 : 0));
});

// ---- more: an empty stack past the last, the same shape but blank, its
// device only an outline, running off the card's edge
subdued = true;
part = 'more';
{
	const x0 = PEOPLE.length * (COL + COL_GAP);
	box({ x: x0, y: 0, w: BOX_W, h: 124 });
	[0, 1, 2].forEach((i) => box({ x: x0 + STEP * (i + 1), y: 140 + i * 172, w: BOX_W, h: 156 }));
	bracket(x0, 'more', SOFT);
	part = 'more';
	add(outlined(WHITE, rounded(x0 + (COL - 300) / 2, deviceTop - 13, 300, 430, 48), BASE_LINE, SOFT));
}

write(OUT, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${PEOPLE.length * (COL + COL_GAP) + COL} 1280">${shapes.join('')}</svg>\n`);
