// The branching demo's pieces, drawn from scratch and written to
// originals/demo-two-people.svg for normalize-personas.mjs to tint and finish.
// One stack per person, Rose's on the left half of a 2048 × 1280 canvas and
// Myron's on the right, in the order the deck reveals them: the
// intent, the same for both, in a box at the top; then a box for each kind of
// context, the empathy, stepped in under it; and over them the phone with the
// UI they add up to. The boxes are plain, in the wash, with no outline; the
// UI's phone is outlined bold, with a phone's chrome.
//
// Each piece is a data-part the deck moves: <person>-intent, <person>-screen-1
// to -3, <person>-ui. <person>-head, their head and shoulders, is drawn hidden,
// for the deck's avatar buttons. The deck shows one stack at a time (data-frame
// on the scene's image), and slides Myron's in from the right as Rose's
// leaves. Words are text, set in Aileron by the deck.
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
const add = (...s) => shapes.push(...s.flat().map((el) => el.replace(/^<(path|text)\b/, `<$1 data-part="${part}"${hidden ? ' data-hidden' : ''}`)));

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

// ---- the pictograms on the context screens, centred on cx, cy at s times
// their size on a screen's top band

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
		for (const x0 of [cx - 24 * s, cx + 2 * s]) add(outlined(WASH, rounded(x0, cy - 20 * s, 22 * s, 40 * s, 3 * s), 3 + s));
	},
	// a clock
	clock(cx, cy, s) {
		add(outlined(WHITE, points(circle([cx, cy], 20 * s, 36)), 4 + s));
		add(path(INK, line([cx, cy], [cx, cy - 12 * s], 3 + s), 'edge'), path(INK, line([cx, cy], [cx + 9 * s, cy + 5 * s], 3 + s), 'edge'));
	},
	// a speech bubble with its tail, and three dots
	bubble(cx, cy, s) {
		const body = rounded(cx - 24 * s, cy - 18 * s, 48 * s, 30 * s, 10 * s);
		add(outlined(WHITE, [...body.slice(0, 21), [cx - 6 * s, cy + 12 * s], [cx - 16 * s, cy + 22 * s], [cx - 12 * s, cy + 12 * s], ...body.slice(21)], 4 + s));
		for (const dx of [-11, 0, 11]) add(path(INK, circle([cx + dx * s, cy - 3 * s], 3.2 * s, 16), 'edge'));
	},
	// a desk, its top and two legs, ending on the right like the set's tables
	desk(cx, cy, s) {
		add(outlined(WHITE, rounded(cx - 26 * s, cy - 6 * s, 52 * s, 9 * s, 2 * s), 3 + s));
		add(path(INK, line([cx - 20 * s, cy + 6 * s], [cx - 20 * s, cy + 22 * s], 3 + s)), path(INK, line([cx + 14 * s, cy + 6 * s], [cx + 14 * s, cy + 22 * s], 3 + s)));
		add(outlined(WHITE, rounded(cx - 10 * s, cy - 26 * s, 26 * s, 16 * s, 2 * s), 3 + s));
	},
	// a calendar page with its year count
	calendar(cx, cy, s) {
		add(outlined(WHITE, rounded(cx - 20 * s, cy - 20 * s, 40 * s, 40 * s, 5 * s), 4 + s));
		add(path(INK, poly(rounded(cx - 20 * s, cy - 20 * s, 40 * s, 11 * s, 3 * s))));
		add(text(cx, cy + 15 * s, 22 * s, '23', { anchor: 'middle', weight: 700 }));
	},
};

// ---- the stacks ----
// Each person's stack, its left edge at ox: the intent in a box at the top;
// below it the empathy, a box for each kind of context, the same width but as
// tall as its words, each stepped a little further right; and last the UI's
// phone, sliding in over the bottom of the stack. Each group's label sits to
// the right of the stack, level with its first box.
const BOX_W = 460, BOX_R = 28, GAP = 18, STEP = 40;
const PHONE_W = 380, PHONE_H = 600, PHONE_X = 160, PHONE_OVER = 10; // how far the phone's outline covers the last box, in its padding
const LABEL_X = STEP * 3 + BOX_W + 40; // past the last box, the stack's right edge
const BASE_LINE = 14; // the outline of the UI's phone
const top = (ox) => ({ x: ox + 150, y: 80 });
// a box in the wash, no outline
const box = ({ x, y, w, h }) => add(path(WASH, poly(rounded(x, y, w, h, BOX_R))));
// the base: a phone's case, outlined bold, and its screen in the given fill
function handset({ x, y, w, h }, screen = WHITE) {
	add(outlined(WASH, rounded(x, y, w, h, 54), BASE_LINE));
	add(path(screen, poly(rounded(x + 16, y + 16, w - 32, h - 32, 40)), 'edge'));
	// the home bar
	add(path(screen === INK ? DEEP : INK, line([x + w / 2 - 44, y + h - 30], [x + w / 2 + 44, y + h - 30], 6), 'edge'));
}
// a phone's top strip, its title
const band = ({ x, y }, words, fill = INK) => add(text(x + 40, y + 42, 23, words, { fill }));
// words on one line if they fit in n characters, or else on two, as even as
// they break
const wrap = (words, n) => {
	if (words.length <= n) return [words];
	const w = words.split(' ');
	const splits = w.slice(1).map((_, i) => [w.slice(0, i + 1).join(' '), w.slice(i + 1).join(' ')]);
	return splits.reduce((a, b) => (Math.max(...b.map((l) => l.length)) < Math.max(...a.map((l) => l.length)) ? b : a));
};
// a group's label, outside the stack whose left edge is ox, level with the
// top of box b, like the deck's eyebrows
const label = (ox, { y }, words) => add(text(top(ox).x + LABEL_X, y + 46, 24, words, { weight: 700 }));

const KINDS = ['Capabilities &amp; preferences', 'User context', 'Memory &amp; history'];
const PEOPLE = [
	{
		name: 'rose', ox: 0, draw: rose,
		context: [['sun', 'Keep it dim, low glare'], ['curtains', 'Curtains drawn, at home'], ['clock', 'Retunes her setup daily']],
	},
	{
		name: 'myron', ox: 1024, draw: myron,
		context: [['bubble', 'Speaks, doesn’t point'], ['desk', 'Hands-free, at his desk'], ['calendar', '23 years of voice control']],
	},
];

for (const person of PEOPLE) {
	const { name, ox } = person;
	const { x: x0, y: y0 } = top(ox);
	// their head and shoulders, hidden, for the deck's avatar button
	part = `${name}-head`;
	hidden = true;
	person.draw(x0 + 194, y0 + 350, 1.25);
	hidden = false;

	// 0. the intent, its quote in the serif
	part = `${name}-intent`;
	const intent = { x: x0, y: y0, w: BOX_W, h: 132 };
	box(intent);
	label(ox, intent, 'Intent');
	add(text(x0 + 36, y0 + 58, 32, '“I’d like to', { serif: true, weight: 400 }));
	add(text(x0 + 36, y0 + 100, 32, 'translate this text”', { serif: true, weight: 400 }));

	// 1-3. the empathy: a box for each kind of context, its pictogram, its
	// kind and its words; the group's label, beside the stack, arrives with the
	// first
	let y = intent.y + intent.h + GAP;
	person.context.forEach(([pictogram, words], i) => {
		part = `${name}-screen-${i + 1}`;
		const lines = wrap(words, 22);
		const b = { x: x0 + STEP * (i + 1), y, w: BOX_W, h: 76 + 36 * lines.length };
		box(b);
		if (i === 0) label(ox, b, 'Empathy');
		PICTOGRAMS[pictogram](b.x + 58, b.y + b.h / 2, 1.3);
		add(text(b.x + 110, b.y + 46, 21, KINDS[i], { weight: 700 }));
		lines.forEach((l, j) => add(text(b.x + 110, b.y + 86 + 36 * j, 29, l)));
		y += b.h + GAP;
	});
	// 4. the UI they add up to
	part = `${name}-ui`;
	const ui = { x: x0 + PHONE_X, y: y - GAP - PHONE_OVER + BASE_LINE, w: PHONE_W, h: PHONE_H };
	if (name === 'rose') {
		// a translator, dark and dim: nothing on it brighter than the soft step
		handset(ui, INK);
		band(ui, 'Translate', SOFT);
		for (const [top, chip, lines] of [[ui.y + 80, 'EN', [240, 190, 210]], [ui.y + 320, 'DE', [250, 200, 160]]]) {
			add(path(DEEP, poly(rounded(ui.x + 40, top, ui.w - 80, 210, 18)), 'edge'));
			add(path(SOFT, poly(rounded(ui.x + 62, top + 22, 64, 30, 15)), 'edge'));
			add(text(ui.x + 94, top + 45, 18, chip, { fill: DEEP, anchor: 'middle', weight: 700 }));
			lines.forEach((len, j) => add(path(SOFT, line([ui.x + 66, top + 90 + 34 * j], [ui.x + 66 + len, top + 90 + 34 * j], 12), 'edge')));
		}
	} else {
		// voice only: a mic that's listening, its rings and its waveform
		handset(ui);
		band(ui, 'Translate');
		const [cx, cy] = [ui.x + ui.w / 2, ui.y + 250];
		for (const r of [118, 92]) add(path(SOFT, poly(offset(points(circle([cx, cy], r, 72)), 3)), 'edge'), path(WHITE, circle([cx, cy], r - 3, 72), 'edge'));
		add(path(LIGHT, circle([cx, cy], 64, 72)));
		add(outlined(WHITE, rounded(cx - 16, cy - 34, 32, 52, 16), 6));
		add(path(INK, curve([cx - 28, cy + 2], [cx, cy + 44], [cx + 28, cy + 2], 6, false)), path(INK, line([cx, cy + 22], [cx, cy + 40], 6)));
		const wave = [[-130, 0], [-100, -26], [-70, 24], [-40, -40], [-10, 34], [20, -30], [50, 22], [80, -18], [110, 10], [130, 0]];
		wave.slice(1).forEach(([x1, y1], j) => {
			const [x0, y0] = wave[j];
			add(path(INK, curve([cx + x0, ui.y + 440 + y0], [cx + (x0 + x1) / 2, ui.y + 440 + (y0 + y1) / 2 + (j % 2 ? 14 : -14)], [cx + x1, ui.y + 440 + y1], 6, false)));
		});
		add(text(cx, ui.y + 530, 26, 'Listening…', { anchor: 'middle' }));
	}
}

write(OUT, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 1280">${shapes.join('')}</svg>\n`);
