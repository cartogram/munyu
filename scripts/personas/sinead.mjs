// Sinead's edits to her traced illustration, written to originals/sinead.svg,
// which normalize-personas.mjs then tints and finishes: dark hair, a face, a
// cloud treated like light, no left frame or right table leg, and a floor like
// Melody's and Allana's. Coordinates are the trace's 1024 canvas.
//   node scripts/personas/sinead.mjs && npm run personas
import { readFileSync, writeFileSync } from 'fs';
const SRC = new URL('../../media/personas/traces/sinead.svg', import.meta.url);
const OUT = new URL('../../media/personas/originals/sinead.svg', import.meta.url);
const INK = '#000000', FLOOR = '#C8C7C8';
const path = (fill, d) => `<path fill="${fill}" d="${d}"/>`;

let svg = readFileSync(SRC, 'utf8').replace(/<metadata>.*?<\/metadata>/s, '');

// 1. changes by path index in the trace, made in one pass:
// - the frame's left side, and the right table leg, go
// - the storm cloud (a shape per wall panel, plus the specks along its edge)
//   is redrawn as one cloud (4, below), in the right half's place, so the
//   frame's top and centre lines still draw over it
// - dark hair: her head is one outline (path 94) of four contours, the outer
//   edge then holes for the bun, the face and the hair; the bun and hair holes
//   are filled in ink, just above the outline
const FRAME_LEFT = [97, 98, 99, 100, 101, 102, 103, 104, 105, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 128];
const TABLE_LEG = 122;
const CLOUD = 43, CLOUD_LEFT = 87;
// (52 and 63, among them, are pieces of the frame: they stay)
const SPECKS = [...Array.from({ length: 40 }, (_, i) => 47 + i).filter((i) => i !== 52 && i !== 63), 89, 90, 91, 92, 93];
const HEAD = 94, BUN = 1, HAIR = 3;
// the old chair: back, seat curve and legs, replaced in its first path's place (5)
const CHAIR = [121, 123, 133, 143, 144, 149];
const drop = new Set([...FRAME_LEFT, TABLE_LEG, CLOUD_LEFT, ...SPECKS, ...CHAIR.slice(1)]);
let index = -1;
svg = svg.replace(/<path\b[^>]*?\/?>/g, (p) => {
	index++;
	if (drop.has(index)) return '';
	if (index === CLOUD) return '<path data-cloud/>';
	if (index === CHAIR[0]) return '<path data-chair/>';
	if (index === HEAD) {
		const contours = p.match(/\bd="([^"]+)"/)[1].split(/(?=M)/);
		return p + path(INK, contours[BUN] + contours[HAIR]);
	}
	return p;
});

// 2. a floor: a grey shadow strip under the chair and feet, ragged at the ends
const floor =
	'M176 906L630 906C646 907 654 913 646 919C634 924 590 923 540 924L260 925C206 925 172 924 166 919C160 913 164 907 176 906Z';

// 3. a face, after the profiles in the cut-paper references: a dot of an eye
// with a flick of lash, a brow, a round cheek and a small smile. She is seen
// from a little behind, her hand on her cheek, so the features sit just inside
// her profile, clear of her fingers.
const f = (v) => +v.toFixed(1);
const poly = (pts) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
const ellipse = ([cx, cy, rx, ry, deg = 0]) => {
	const a = (deg * Math.PI) / 180, pts = [];
	for (let i = 0; i < 24; i++) {
		const t = (i / 24) * 2 * Math.PI, x = rx * Math.cos(t), y = ry * Math.sin(t);
		pts.push([cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
	}
	return poly(pts);
};
// a stroke along a quadratic curve, as a filled strip that tapers at the ends
const stroke = ([x0, y0], [cx, cy], [x1, y1], w) => {
	const pt = (t) => [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1];
	const n = 12, left = [], right = [];
	for (let i = 0; i <= n; i++) {
		const t = i / n, [x, y] = pt(t), [ax, ay] = pt(Math.min(t + 0.01, 1)), [bx, by] = pt(Math.max(t - 0.01, 0));
		const len = Math.hypot(ax - bx, ay - by) || 1, half = (w / 2) * Math.sin(Math.PI * Math.max(t, 0.12) * Math.min(1, (1 - t) / 0.12 + 0.5));
		const nx = (-(ay - by) / len) * half, ny = ((ax - bx) / len) * half;
		left.push([x + nx, y + ny]);
		right.unshift([x - nx, y - ny]);
	}
	return poly([...left, ...right]);
};
const CHEEK = '#C8C7C8'; // the soft step
const face = [
	path(CHEEK, ellipse([383, 389, 12.5, 12])),
	path(INK, ellipse([403.5, 361, 3, 3.8, -10])), // eye
	path(INK, stroke([405, 357.5], [408, 354], [412.5, 353], 2.4)), // lash
	path(INK, stroke([394.5, 347], [402, 342], [411, 342.5], 3.2)), // brow
	path(INK, stroke([398, 402.5], [404.5, 409], [412, 403], 2.8)), // smile
].join('');

// 4. the storm: a cartoon cloud, flat underneath and bumped on top, coming in
// from the frame's right edge (which draws over it), with a bolt of lightning
// in the empty right-hand panel, clear of the windows. The cloud is in the
// beam's colour from Melody's illustration, so it's treated as light: pale,
// grained, no outline. The bolt is the originals' saturated yellow, so it's
// light too, at the accent step.
const BEAM = '#FDEABF', BOLT = '#F8C55A';
const cloud =
	'M838 262L582 262C548 262 540 230 562 219C558 186 600 174 622 191' +
	'C632 158 690 157 702 187C718 167 760 171 764 199C790 186 830 191 838 206Z';
const bolt = 'M796 258L770 302L786 302L758 352L806 290L789 290L812 258Z';
svg = svg.replace('<path data-cloud/>', path(BEAM, cloud) + path(BOLT, bolt));

// 5. a chair like Allana's: a dark rounded back standing behind her, white
// between it and her sweater so they read apart, running into a dark seat
// under her; the seat's top is her hip's curve, which the old seat drew. Two
// slanted legs to the floor.
const sweater = [[525, 243], [540, 239], [555, 235], [570, 232], [585, 230], [600, 228], [615, 227], [630, 227], [645, 228], [660, 229], [675, 231], [690, 234], [705, 237]];
const GAP = 13;
const hip = [[242, 722], [250, 742], [262, 757], [280, 768], [310, 776], [347, 778]];
const backEdge = sweater.map(([y, x]) => [x - GAP, y]);
const chair =
	`M${backEdge[0][0]} ${backEdge[0][1]}` +
	`C${backEdge[0][0]} 506 214 494 200 494C188 494 182 508 182 528L182 776C182 796 194 806 214 806` +
	'L362 806C376 806 380 790 372 780L347 778' +
	hip
		.slice()
		.reverse()
		.map(([x, y]) => `L${x} ${y}`)
		.join('') +
	`L${backEdge.at(-1)[0] + 4} 716` +
	backEdge
		.slice()
		.reverse()
		.map(([x, y]) => `L${x} ${y}`)
		.join('') +
	'Z';
const line = ([x0, y0], [x1, y1], w) => {
	const len = Math.hypot(x1 - x0, y1 - y0), nx = (-(y1 - y0) / len) * (w / 2), ny = ((x1 - x0) / len) * (w / 2);
	return poly([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]);
};
const legs = [line([252, 804], [216, 906], 5), line([344, 804], [314, 906], 5)];
// under her, so her trousers and sweater draw over its edges
svg = svg.replace('<path data-chair/>', [path(INK, chair), ...legs.map((d) => path(INK, d))].join(''));

svg = svg.replace(/<\/svg>\s*$/, `${path(FLOOR, floor)}${face}</svg>\n`);

writeFileSync(OUT, svg);
console.log('wrote', OUT.pathname, (svg.match(/<path\b/g) || []).length, 'paths');
