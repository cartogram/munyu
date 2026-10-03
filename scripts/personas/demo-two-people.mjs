// The branching demo's pieces, drawn from scratch on the 1024 canvas and
// written to originals/demo-two-people.svg for normalize-personas.mjs to tint
// and finish. So far one stack, Rose's, built from the top down in the order
// the deck reveals it: her head and shoulders, then three context cards, each
// overlapping the bottom of the one before, then, below an arrow, the tablet
// with the UI they add up to, her dark, low-glare translator. Each piece is a
// data-part the deck slides in (person, card-1 to card-3, ui), and each card
// carries its words as text, set in Aileron by the deck.
//   node scripts/personas/demo-two-people.mjs
import { INK, WHITE, DEEP, SOFT, WASH, poly, line, circle, ellipse, curve, path, floor, write } from './draw.mjs';

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

const shapes = [];
let part; // the data-part the next shapes belong to
const add = (...s) => shapes.push(...s.flat().map((el) => el.replace(/^<(path|text)\b/, `<$1 data-part="${part}"`)));

// ---- 1. Rose, head and shoulders, turned to the right like her portrait ----
part = 'person';
// Drawn at S times the size it was first sketched at, about the head's centre.
const S = 1.4, [hx, hy] = [500, 160];
const at = (dx, dy) => [hx + dx * S, hy + dy * S];
// her dark sweater: rounded shoulders, cut straight across like a bust, just
// below where the first card will cover it
add(path(INK, poly(rounded(hx - 180, hy + 84 * S, 372, 160, 90).map(([x, y]) => [x, Math.min(y, 340)]))));
// neck, behind the chin
add(outlined(WHITE, [at(-14, 40), at(20, 40), at(22, 98), at(-16, 98)]));
// the low bun at the back of her head, tied off with a light band
add(path(INK, ellipse([...at(-74, 16), 30 * S, 24 * S, -12])));
add(path(SOFT, poly([at(-50, 2), at(-40, -2), at(-32, 30), at(-42, 34)])));
// hair: a dark cap over the top and back of the head
add(path(INK, ellipse([...at(-6, -8), 60 * S, 58 * S])));
// face: the front of the head, below the hairline, with a pointed nose out of
// the profile and the chin dropping below the hair
const face = smooth([
	at(-12, -24), at(18, -42), at(44, -44), at(52, -18), at(54, 6), at(68, 20), at(54, 26),
	at(50, 44), at(30, 60), at(6, 64), at(-14, 54), at(-24, 30), at(-22, 4),
]);
add(outlined(WHITE, face));
// dark glasses: a lens each side of the nose's bridge, and the arm back to the ear
add(path(INK, ellipse([...at(20, 0), 22 * S, 15 * S, -4])));
add(path(INK, ellipse([...at(54, -2), 9 * S, 14 * S, -4])));
add(path(INK, line(at(40, -4), at(48, -4), 6 * S)));
add(path(INK, line(at(-20, -4), at(0, -2), 6 * S)));
// a small smile
add(path(INK, curve(at(22, 38), at(34, 46), at(46, 36), 5 * S), 'edge'));

// ---- 2-4. the context cards, top first: each arrives in front of the one
// before and covers its bottom edge, so only a strip of each shows, and all
// of the last. Each sits a little left or right, as if dropped on the pile.
const CARD_TOP = 318, CARD_STEP = 82, CARD_H = 104, CARD_W = 560;
const card = (k) => ({ x: 512 - CARD_W / 2 + [0, -8, 10, -6, 8][k], y: CARD_TOP + CARD_STEP * (k - 1), w: CARD_W });
// the middle of the strip of card k that shows: its pictogram's centre, and
// the label's start and baseline (the label is set at 30 units)
const middle = (k) => card(k).y + (CARD_STEP - 8) / 2 + 4;
const iconAt = (k) => [card(k).x + 62, middle(k)];
const LABELS = ['Keep it dim, low glare', 'Curtains drawn, at home', 'Retunes her setup daily'];
const label = (k) => `<text x="${card(k).x + 112}" y="${middle(k) + 11}" font-size="30" font-weight="600">${LABELS[k - 1]}</text>`;

for (const k of [1, 2, 3]) {
	part = `card-${k}`;
	const { x, y, w } = card(k);
	add(outlined(WHITE, rounded(x, y, w, CARD_H, 16)), label(k));
	if (k === 1) {
		// capabilities: a dimmed sun, its rays short
		const [cx, cy] = iconAt(1);
		add(outlined(SOFT, points(circle([cx, cy], 15, 36)), 6));
		for (let a = 0; a < 360; a += 45) {
			const r = (a * Math.PI) / 180;
			add(path(INK, line([cx + 23 * Math.cos(r), cy + 23 * Math.sin(r)], [cx + 31 * Math.cos(r), cy + 31 * Math.sin(r)], 5), 'edge'));
		}
	}
	if (k === 2) {
		// context: her drawn curtains, two plain panels meeting in the middle
		const [cx, cy] = iconAt(2);
		for (const side of [-1, 1]) {
			const x0 = side < 0 ? cx - 30 : cx + 3, y0 = cy - 24;
			add(outlined(WASH, rounded(x0, y0, 27, 48, 4), 5));
		}
	}
	if (k === 3) {
		// memory: a clock
		const [cx, cy] = iconAt(3);
		add(outlined(WHITE, points(circle([cx, cy], 25, 36)), 6));
		add(path(INK, line([cx, cy], [cx, cy - 15], 5), 'edge'), path(INK, line([cx, cy], [cx + 11, cy + 6], 5), 'edge'));
	}
}

// ---- 5. the UI they add up to: an arrow down from the pile, and the tablet ----
part = 'ui';
const PILE_END = card(3).y + CARD_H;
add(path(INK, line([512, PILE_END + 18], [512, PILE_END + 50], 8)));
add(path(INK, poly([[494, PILE_END + 46], [530, PILE_END + 46], [512, PILE_END + 66]])));
const TABLET = { x: 322, y: PILE_END + 82, w: 380, h: 236 };
{
	const { x, y, w, h } = TABLET;
	add(outlined(WHITE, rounded(x, y, w, h, 28), 9));
	// the screen is dark, as on her laptops
	add(path(INK, poly(rounded(x + 22, y + 22, w - 44, h - 44, 12))));
	// two panels, source above and translation below, nothing on them
	// brighter than the soft step
	for (const [py, len] of [[y + 40, [190, 140]], [y + 126, [210, 150]]]) {
		add(path(DEEP, poly(rounded(x + 42, py, w - 84, 72, 10)), 'edge'));
		add(path(SOFT, poly(rounded(x + 58, py + 13, 44, 18, 9)), 'edge'));
		add(path(SOFT, line([x + 62, py + 44], [x + 62 + len[0], py + 44], 8), 'edge'));
		add(path(SOFT, line([x + 62, py + 59], [x + 62 + len[1], py + 59], 8), 'edge'));
	}
}
// the floor under the tablet
add(path(SOFT, floor(TABLET.x - 40, TABLET.x + TABLET.w + 40, TABLET.y + TABLET.h + 12)));

write(OUT, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${shapes.join('')}</svg>\n`);
