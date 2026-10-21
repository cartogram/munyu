// Everything bespoke: drawn from scratch like the empathy slide's medallions
// and written to originals/imagine-everything-bespoke.svg for
// normalize-personas.mjs to tint and finish. Rose, Myron and Sarah, each a
// head-and-shoulders bust (busts.mjs) in a bubble of their own with a screen
// made only for them: Rose's dim, Myron's a voice's waveform, Sarah's a few
// big lines. The bubbles float apart, among more, faded: everyone else,
// each sealed in a bubble of their own.
//   node scripts/personas/imagine-everything-bespoke.mjs && npm run personas
import { INK, WHITE, DEEP, SOFT, WASH, LIGHT, poly, line, circle, path, write } from './draw.mjs';
import { LINE, rounded, points, outlined, rose, myron, sarah } from './busts.mjs';

const OUT = new URL('../../media/personas/originals/imagine-everything-bespoke.svg', import.meta.url);
const R = 100; // every bubble's radius
const GAP = 8; // the wash between what's inside and the rim

// a polygon cut to the disc at c of radius r, as the medallions are
const clip = (pts, [cx, cy], r) =>
	pts
		.flatMap((p, i) => {
			const q = pts[(i + 1) % pts.length];
			const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 4));
			return Array.from({ length: n }, (_, k) => [p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n]);
		})
		.map(([x, y]) => {
			const d = Math.hypot(x - cx, y - cy);
			return d > r ? [cx + ((x - cx) * r) / d, cy + ((y - cy) * r) / d] : [x, y];
		});
const within = (c, els, r = R) => els.map((el) => el.replace(/ d="([^"]+)"/, (m, d) => ` d="${poly(clip(points(d), c, r - GAP))}"`));

// each screen's content, in its own box and in proportion to it: Rose's
// dimmed, Myron's a waveform for his voice, Sarah's three big lines of text
const screens = {
	rose: (x, y, w, h) => [
		path(DEEP, poly(rounded(x, y, w, h, 6)), 'edge'),
		...[0, 1, 2].map((j) => path(SOFT, line([x + w * 0.16, y + h * (0.28 + j * 0.22)], [x + w * (0.84 - j * 0.16), y + h * (0.28 + j * 0.22)], 5), 'edge')),
	],
	myron: (x, y, w, h) => [
		path(LIGHT, poly(rounded(x, y, w, h, 6))),
		...[10, 22, 36, 18, 30, 12, 24, 8].map((t, j) => {
			const bx = x + w * 0.18 + j * ((w * 0.64) / 7);
			const th = (t / 64) * h;
			return path(INK, line([bx, y + h / 2 - th / 2], [bx, y + h / 2 + th / 2], 5), 'edge');
		}),
	],
	sarah: (x, y, w, h) => [
		path(LIGHT, poly(rounded(x, y, w, h, 6))),
		...[0, 1, 2].map((j) => path(INK, line([x + w * 0.18, y + h * (0.27 + j * 0.23)], [x + w * (0.82 - (j === 2) * 0.3), y + h * (0.27 + j * 0.23)], 8), 'edge')),
	],
};

const shapes = [];
const add = (...s) => shapes.push(...s.flat());

// the column: two staggered rows of bubbles packed close, each then nudged
// off the grid so they don't sit in rows
const PITCH = 240; // from one bubble's centre to the next, before the nudge
const COLS = [512 - (PITCH * Math.sqrt(3)) / 4, 512 + (PITCH * Math.sqrt(3)) / 4];
const slots = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => [COLS[i % 2], 60 + (i * PITCH) / 2]);
// and one more bubble out to either side, packed against the column at
// opposite ends: low on the left, high on the right
const SIDE = (PITCH * Math.sqrt(3)) / 2;
slots.push([COLS[0] - SIDE, 60 + (7 * PITCH) / 2], [COLS[1] + SIDE, 60 + (2 * PITCH) / 2]);
// each place scattered off the grid by a seeded random nudge, up to SCATTER
// each way, so the drawing comes out the same every run; then any two that
// end up closer than CLEAR are pushed apart, a little at a time, until none
// are
const SCATTER = 60;
const CLEAR = 2 * (R + LINE) + 14;
let seed = 7;
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
for (const c of slots) {
	c[0] += (random() * 2 - 1) * SCATTER;
	c[1] += (random() * 2 - 1) * SCATTER;
}
for (let pass = 0; pass < 200; pass++) {
	let moved = false;
	slots.forEach((a, i) => slots.slice(i + 1).forEach((b) => {
		const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
		if (d >= CLEAR) return;
		const push = (CLEAR - d) / 2 / d;
		a[0] -= dx * push, a[1] -= dy * push, b[0] += dx * push, b[1] += dy * push;
		moved = true;
	}));
	if (!moved) break;
}
// their bubbles, zigzagging down it: Myron high, Sarah to the right and Rose
// low, each with its person and screen
const bubbles = [
	{ c: slots[2], bust: myron, screen: screens.myron },
	{ c: slots[5], bust: sarah, screen: screens.sarah },
	{ c: slots[8], bust: rose, screen: screens.rose },
];

// 1. everyone else, faded, in every other place: solid bubbles in the
// palest step, the size of theirs, some fainter than others
const FADE = [0.45, 0.9, 0.6, 1, 0.5, 0.75, 0.4, 0.85];
slots
	.filter((c) => !bubbles.some((b) => b.c === c))
	.forEach((c, i) => add(path(WASH, circle(c, R + LINE, 144)).replace('<path ', `<path data-opacity="${FADE[i]}" `)));

// 2. their bubbles
bubbles.forEach(({ c: [cx, cy], bust, screen }) => {
	const k = R / 150;
	// the bubble: an ink rim round a wash
	add(path(INK, circle([cx, cy], R + LINE, 144)), path(WASH, circle([cx, cy], R, 144)));
	// the person, turned to the screen, cut to the bubble
	add(within([cx, cy], bust(cx - 55 * k, cy - 18 * k, 0.62 * k)));
	// a desk across the bubble's floor, over where the bust is cut off
	const desk = cy + 50 * k;
	add(within([cx, cy], [
		path(INK, poly([[cx - R, desk - 3], [cx + R, desk - 3], [cx + R, cy + R], [cx - R, cy + R]])),
		path(SOFT, poly([[cx - R, desk + 4], [cx + R, desk + 4], [cx + R, cy + R], [cx - R, cy + R]])),
	]));
	// the screen on its stand, on the desk
	const s = { x: cx + 26 * k, y: cy - 62 * k, w: 96 * k, h: 80 * k };
	add(within([cx, cy], [
		path(INK, line([s.x + s.w / 2, s.y + s.h], [s.x + s.w / 2, s.y + s.h + 30 * k], 8)),
		path(INK, line([s.x + s.w / 2 - 26 * k, s.y + s.h + 30 * k], [s.x + s.w / 2 + 26 * k, s.y + s.h + 30 * k], 8)),
		...outlined(WHITE, rounded(s.x, s.y, s.w, s.h, 10), 6),
	]));
	add(screen(s.x + 5, s.y + 5, s.w - 10, s.h - 10));
	// a glint on the glass, top left
	const arc = Array.from({ length: 9 }, (_, j) => {
		const a = ((200 + j * 7) * Math.PI) / 180;
		return [cx + (R - 17) * Math.cos(a), cy + (R - 17) * Math.sin(a)];
	});
	add(...arc.slice(1).map((p, j) => path(WHITE, line(arc[j], p, 8), 'edge')), ...arc.map((p) => path(WHITE, circle(p, 4, 12), 'edge')));
});

write(OUT, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${shapes.join('')}</svg>\n`);
