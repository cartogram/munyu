// Today's model, as Sinead lives it: drawn from scratch like the branching
// demo and written to originals/todays-model.svg for normalize-personas.mjs to
// tint and finish. Her avatar at the top; her browser, outlined bold like the
// demo's phones, with a lecture page on it, the interface built for the
// average; and her extensions, each laid on the page as a layer of its own,
// none aware of the others, with a box beside the browser that names it. In
// the order they land: a dark mode plugin darkens the page; a reading plugin
// bolds the first half of every word; voice control's number badges, thrown
// off their targets by the bolding; and its number grid, there but lost dark
// on dark.
//
// Each piece is a data-part the deck moves: base, then dark, bionic, numbers
// and grid, each with its box, <layer>-box. sinead, her avatar and name,
// holds still throughout. Words are text, set in Aileron by the deck.
//   node scripts/personas/todays-model.mjs && npm run personas
import { INK, WHITE, DEEP, SOFT, WASH, poly, line, circle, ellipse, curve, path, write } from './draw.mjs';

const OUT = new URL('../../media/personas/originals/todays-model.svg', import.meta.url);
const LINE = 7; // outline weight, as the demo's

// a rounded rectangle's outline points, clockwise from the top-left corner
const rounded = (x, y, w, h, r, n = 6) => {
	const arc = (cx, cy, from) =>
		Array.from({ length: n + 1 }, (_, k) => {
			const a = ((from + (90 * k) / n) * Math.PI) / 180;
			return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
		});
	return [...arc(x + r, y + r, 180), ...arc(x + w - r, y + r, 270), ...arc(x + w - r, y + h - r, 0), ...arc(x + r, y + h - r, 90)];
};
// the points of a polygon path (poly, circle), to outline
const points = (d) => {
	const n = d.match(/-?\d+\.?\d*/g).map(Number);
	return Array.from({ length: n.length / 2 }, (_, i) => [n[2 * i], n[2 * i + 1]]);
};
// a polygon grown outwards by d, each corner moved along the bisector of its
// two edges' outward normals
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
// a piece with an ink outline: an ink sheet under it, a line's width bigger
const outlined = (fill, pts, w = LINE) => [path(INK, poly(offset(pts, w))), path(fill, poly(pts))];
// text, in a grey the finish maps to a ramp step like any fill
const text = (x, y, size, words, { fill = INK, anchor = 'start', weight = 600 } = {}) =>
	`<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}" fill="${fill}">${words}</text>`;

const shapes = [];
let part; // the data-part the next shapes belong to
const add = (...s) => shapes.push(...s.flat().map((el) => el.replace(/^<(path|text)\b/, `<$1 data-part="${part}"`)));

// ---- Sinead: head and shoulders in a round frame, turned to the right like
// her portrait, at S times the size first sketched, about the head's centre.
// Her dark sweater, cut to the frame (inside), her hair pulled back into a
// bun, a dot of an eye.
function sinead(hx, hy, S, inside) {
	const at = (dx, dy) => [hx + dx * S, hy + dy * S];
	add(path(INK, poly(inside(rounded(...at(-128, 84), 266 * S, 120 * S, 64 * S)))));
	add(outlined(WHITE, [at(-14, 40), at(20, 40), at(22, 98), at(-16, 98)]));
	// the bun, high at the back of her head
	add(path(INK, ellipse([...at(-70, -6), 30 * S, 28 * S, -12])));
	add(path(INK, ellipse([...at(-6, -8), 60 * S, 58 * S])));
	add(outlined(WHITE, smooth([
		at(-12, -24), at(18, -42), at(44, -44), at(52, -18), at(54, 6), at(68, 20), at(54, 26),
		at(50, 44), at(30, 60), at(6, 64), at(-14, 54), at(-24, 30), at(-22, 4),
	])));
	add(path(INK, circle(at(32, -4), 4.5 * S, 24), 'edge'));
	add(path(INK, curve(at(24, 38), at(34, 45), at(44, 36), 5 * S), 'edge'));
}
// a round frame's rim, in ink; and its inside, to cut a shape to it: each
// point past the rim pulled back onto it, which for a convex shape is close
// enough to the cut
const hole = ([cx, cy], r) => points(circle([cx, cy], r, 72));
const rim = (c, r) => add(`<path fill="${INK}" fill-rule="evenodd" data-finish="edge" d="${poly(hole(c, r + 5))}${poly(hole(c, r - 3))}"/>`);
const within = ([cx, cy], r) => (pts) =>
	pts.map(([x, y]) => {
		const d = Math.hypot(x - cx, y - cy);
		return d > r ? [cx + ((x - cx) * r) / d, cy + ((y - cy) * r) / d] : [x, y];
	});

// ---- the scene ----
const BASE_LINE = 14; // the browser's outline, as the demo's phones
const ui = { x: 80, y: 330, w: 580, h: 600 };
const screen = { x: ui.x + 16, y: ui.y + 16, w: ui.w - 32, h: ui.h - 32 };
// the page's furniture, in screen coordinates: a heading, a video, text beside
// and below it, and two buttons. Each line of text is its words' lengths.
const page = {
	heading: [ui.x + 44, ui.y + 108, 250],
	video: { x: ui.x + 44, y: ui.y + 144, w: 220, h: 160 },
	text: [
		...[[56, 40, 70], [48, 62, 38], [66, 34, 54], [44, 60, 46], [52, 38, 62], [60, 44]].map((words, j) => [ui.x + 290, ui.y + 160 + 30 * j, words]),
		...[[64, 40, 72, 50, 38, 66], [50, 70, 36, 60, 48, 70], [62, 44, 56, 40, 70, 38], [58, 66, 42, 54]].map((words, j) => [ui.x + 44, ui.y + 350 + 30 * j, words]),
	],
	buttons: [{ x: ui.x + 44, y: ui.y + 500, w: 150 }, { x: ui.x + 212, y: ui.y + 500, w: 150 }],
};
// each word of each line as its span, 10 between words
const words = page.text.flatMap(([x, y, lengths]) => {
	let at = x;
	return lengths.map((len) => {
		const w = [at, y, len];
		at += len + 12;
		return w;
	});
});
// the page in one palette: the base in the light steps; the dark mode
// plugin's copy of it, laid over, dimmed
function drawPage({ ground, title, bars, heading, video, play, button, label }) {
	if (ground) add(path(ground, poly(rounded(screen.x, screen.y, screen.w, screen.h, 26)), 'edge'));
	add(text(ui.x + 44, ui.y + 62, 23, 'Lecture notes', { fill: title }));
	for (const dx of [0, 22, 44]) add(path(bars, circle([ui.x + ui.w - 92 + dx, ui.y + 54], 7, 24), 'edge'));
	const [hx, hy, hw] = page.heading;
	add(path(heading, line([hx, hy], [hx + hw, hy], 16), 'edge'));
	const v = page.video;
	add(path(video, poly(rounded(v.x, v.y, v.w, v.h, 14)), 'edge'));
	const [px, py] = [v.x + v.w / 2, v.y + v.h / 2];
	add(path(play, poly([[px - 16, py - 22], [px + 22, py], [px - 16, py + 22]]), 'edge'));
	for (const [x, y, len] of words) add(path(bars, line([x, y], [x + len, y], 8), 'edge'));
	for (const b of page.buttons) {
		add(path(button, poly(rounded(b.x, b.y, b.w, 46, 23)), 'edge'));
		add(path(label, line([b.x + 36, b.y + 23], [b.x + b.w - 36, b.y + 23], 9), 'edge'));
	}
}

// 0. Sinead, above it all: her avatar, and her name
part = 'sinead';
const AV = [ui.x + 84, 150], AV_R = 84;
add(path(WASH, circle(AV, AV_R + 2, 72), 'edge'));
sinead(AV[0] + 4, AV[1] - 6, 0.62, within(AV, AV_R));
rim(AV, AV_R);
add(text(AV[0] + AV_R + 36, AV[1] + 12, 34, 'Sinead’s setup'));

// 1. her browser, with the lecture page on it, as it was built
part = 'base';
add(outlined(WASH, rounded(ui.x, ui.y, ui.w, ui.h, 40), BASE_LINE));
drawPage({ ground: WHITE, title: INK, bars: SOFT, heading: DEEP, video: SOFT, play: WHITE, button: WASH, label: DEEP });
add(text(ui.x, ui.y - 34, 24, 'Base adaptive layout', { weight: 700 }));

// the extensions' boxes, down the right of the browser, in the order they land
const BOX = { x: ui.x + ui.w + 40, w: 310, h: 120, gap: 40 };
const box = (i, name) => {
	const b = { x: BOX.x, y: ui.y + i * (BOX.h + BOX.gap), w: BOX.w, h: BOX.h };
	add(path(WASH, poly(rounded(b.x, b.y, b.w, b.h, 26))));
	add(text(b.x + 36, b.y + b.h / 2 + 10, 27, name));
	return b;
};

// 2. a dark mode plugin: the page again, dimmed, laid over the whole screen
part = 'dark';
drawPage({ ground: INK, title: SOFT, bars: DEEP, heading: DEEP, video: DEEP, play: INK, button: DEEP, label: INK });
part = 'dark-box';
box(0, 'Dark mode');

// 3. a reading plugin: the first half of every word, bold and bright
part = 'bionic';
for (const [x, y, len] of words) add(path(WHITE, line([x, y], [x + Math.round(len * 0.5), y], 13), 'edge'));
part = 'bionic-box';
box(1, 'Bionic reading');

// 4. voice control's numbers, one on each thing she can say, but the bolding
// has moved the words under them: each lands off its target, two on the
// same word, one over nothing
part = 'numbers';
const v = page.video, [b1, b2] = page.buttons;
const badges = [
	[v.x + v.w - 6, v.y + 8, '1'],
	[ui.x + 360, ui.y + 132, '2'],
	[ui.x + 384, ui.y + 146, '3'],
	[b1.x + b1.w + 4, b1.y - 6, '4'],
	[b2.x + b2.w + 52, b2.y + 10, '5'],
];
for (const [x, y, n] of badges) {
	add(outlined(WHITE, points(circle([x, y], 18, 36)), 5));
	add(text(x, y + 8, 22, n, { anchor: 'middle', weight: 700 }));
}
part = 'numbers-box';
box(2, 'Voice control');

// 5. voice control's number grid, its other way in: drawn in the page's dim
// step, so it all but vanishes in the dark
part = 'grid';
for (const k of [1, 2]) {
	add(path(DEEP, line([screen.x + (screen.w * k) / 3, screen.y + 10], [screen.x + (screen.w * k) / 3, screen.y + screen.h - 10], 5), 'edge'));
	add(path(DEEP, line([screen.x + 10, screen.y + (screen.h * k) / 3], [screen.x + screen.w - 10, screen.y + (screen.h * k) / 3], 5), 'edge'));
}
for (let r = 0; r < 3; r++)
	for (let c = 0; c < 3; c++)
		add(text(screen.x + (screen.w * (c + 0.5)) / 3, screen.y + (screen.h * (r + 0.5)) / 3 + 12, 34, `${r * 3 + c + 1}`, { fill: DEEP, anchor: 'middle', weight: 700 }));
part = 'grid-box';
box(3, 'Number grid');

write(OUT, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 1024">${shapes.join('')}</svg>\n`);
