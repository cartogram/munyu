// Sinead again, for the talk's close: her illustration (sinead.mjs) without
// the storm or the stack of fighting overlays. A sun in the window, on her
// laptop one calm page with a few large lines of text, the interface that
// already fits her, and both her hands on it: the hand at her cheek comes
// down to the keyboard. Written to originals/back-to-sinead.svg for
// normalize-personas.mjs to tint and finish. Coordinates are the trace's
// 1024 canvas.
//   node scripts/personas/back-to-sinead.mjs && npm run personas
import { INK, WHITE, LIGHT, DEEP, SOFT, WASH, poly, line, circle, curve, path, under, over, eachPath, write } from './draw.mjs';
import { sinead } from './sinead.mjs';

const OUT = new URL('../../media/personas/originals/back-to-sinead.svg', import.meta.url);

// a path's box, from every coordinate in its d (the trace's are absolute)
const box = (p) => {
	const n = p.match(/\bd="([^"]+)"/)[1].match(/-?\d*\.?\d+/g).map(Number);
	const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1);
	return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};

// 1. the overlays go: every piece inside the window's right-hand pane, above
// the window's foot, bar the window's own line along it. Path 2 is one ink
// sheet of the laptop and the overlays' frames, and the overlays covered
// half the screen: both are redrawn, the laptop alone and its whole screen.
const PANE = [515, 340, 835, 600];
const LAPTOP = 2, SILL = 31, SCREEN = 33;
// the hand at her cheek: the fingers along her profile, and the wrist
const FINGERS = 72, WRIST = 73;
// her near hand: its outline and finger lines, copied for the far hand (4)
const NEAR_HAND = [65, 66, 67, 92, 105];
const base = sinead({ storm: false });
// her face, the last six paths of sinead.mjs: nose, eye, mouth. The nose and
// eye are put back on top of the patches (4); the mouth goes.
const MOUTH = (base.match(/<path\b/g) || []).length - 1;
const face = base.match(/(?:<path\b[^>]*\/>){6}(?=<\/svg>)/)[0].replace(/<path\b[^>]*\/>$/, '');
const nearHand = [];
let svg = eachPath(base, (i, p) => {
	if (i === FINGERS || i === WRIST || i === MOUTH) return '';
	if (NEAR_HAND.includes(i)) nearHand.push(p);
	if (i === LAPTOP) return path(INK, poly([[616, 482], [778, 482], [784, 488], [718, 642], [549, 641]]));
	if (i === SILL) return p;
	if (i === SCREEN) return '';
	const [x0, y0, x1, y1] = box(p);
	return x0 >= PANE[0] && y0 >= PANE[1] && x1 <= PANE[2] && y1 <= PANE[3] ? '' : p;
});

// 2. the screen, and the page on it: a heading and three lines of large
// text, slanted with the screen. (u, v) runs across and down the screen, from its
// top-left corner (626, 497) to its bottom-right (696, 615).
const at = (u, v) => [626 + u * 118 - v * 48, 497 + v * 118];
const bar = (u0, u1, v, h) => poly([at(u0, v), at(u1, v), at(u1, v + h / 118), at(u0, v + h / 118)]);
const page = [
	path(LIGHT, poly([at(0, 0), at(1, 0), at(1, 1), at(0, 1)])),
	path(DEEP, bar(0.14, 0.62, 0.18, 12), 'edge'),
	path(DEEP, bar(0.14, 0.86, 0.42, 7), 'edge'),
	path(DEEP, bar(0.14, 0.8, 0.56, 7), 'edge'),
	path(DEEP, bar(0.14, 0.66, 0.7, 7), 'edge'),
];

// 3. the sun, in the storm's place: light, so pale and without an outline,
// its rays short strips around it
const SUN = [728, 252];
const rays = Array.from({ length: 8 }, (_, k) => {
	const a = (k / 8) * 2 * Math.PI + Math.PI / 8;
	const from = [SUN[0] + 64 * Math.cos(a), SUN[1] + 64 * Math.sin(a)], to = [SUN[0] + 88 * Math.cos(a), SUN[1] + 88 * Math.sin(a)];
	return path(LIGHT, line(from, to, 12));
});

// 4. the raised arm comes down. White patches over the old line between her
// face and hand (wide, as the finish thickens and shifts it), and over the
// raised forearm. Its elbow, the round lower part of the old sleeve, stays as
// her far upper arm, as full as in her first illustration; the patch's lower
// edge is the arm's new top, curving down from her collar to it.
const jawLine = poly([[400, 384], [424, 384], [402, 424], [407, 428], [410, 458], [388, 461], [379, 428], [381, 420]]);
// the arm's new top, from her collar to the old sleeve's outer edge
const ARM_TOP = [[390, 452], [408, 462], [428, 472], [446, 484], [458, 494], [464, 505]];
const sleeve = poly([[388, 446], [391, 437], [398, 432], [420, 417], [436, 414], [450, 422], [463, 452], [472, 480], [476, 505], [470, 512], ...ARM_TOP.slice().reverse()]);
// her chin, in profile under the nose: one round curve, as soft as her
// cheek in her first illustration, and the jaw back to her collar; and a
// small, thin smile where her mouth was
const J = 4.5;
const chin = [
	curve([414.5, 390], [420, 401], [415, 410], J, false),
	curve([415, 410], [410, 419], [398, 420.5], J, false),
	curve([398, 420.5], [388, 421.5], [377, 423.6], J, false),
	...[[415, 410], [398, 420.5], [377, 423.6]].map((p) => circle(p, J / 2, 12)),
];
const smile = curve([396, 399], [401, 403.5], [406.5, 399.5], 3);
// her neck, so her head doesn't float above her body. The zigzag under her
// chin (where the hand's wrist was) is patched out and her jaw runs on, one
// line, to the point under her ear's line; the sweater's collar comes up
// under it, a strip of white neck between; and her chest fills out from
// the collar to her far arm, where the white between them was.
const zigzag = poly([[357, 433], [363, 415], [382, 418], [382, 431], [362, 442]]);
const jaw = [curve([377, 423.6], [366, 429], [355, 438.5], J, false), circle([355, 438.5], J / 2, 12)];
// one piece, so the finish treats it like the sweater it joins
const collar = poly([
	[316, 422], [346, 450], [362, 451], [380, 447], ...ARM_TOP, [440, 515], [410, 515],
	[396, 505], [379, 487], [360, 472], [330, 448], [311, 444], [310, 429],
]);

// 5. the far hand on the keyboard, beside the near one: a copy of the near
// hand, moved up and along, and her far forearm out from her elbow to it. The hand sits under the drawing, so her near arm and the laptop's lid
// draw over it, as the nearer things.
const HAND_SHIFT = [14, -24];
const shift = (p) => {
	let k = 0;
	return p.replace(/\bd="([^"]+)"/, (_, d) => `d="${d.replace(/-?\d*\.?\d+/g, (v) => +(+v + HAND_SHIFT[k++ % 2]).toFixed(2))}"`);
};
const farSleeve = poly([[436, 548], [456, 542], [470, 556], [486, 574], [500, 585], [502, 604], [480, 602], [458, 594], [440, 582], [428, 566]]);

// 6. the laptop's base, dark like its lid, with white between the two
const laptopBase = poly([[505, 647], [717, 647], [715, 655], [709, 663], [703, 665], [510, 665], [504, 661], [503, 651]]);

// 7. a faint rainbow, rising from the window's bottom-right corner behind
// the laptop and arching up to the left, each band thinning away to
// nothing before it reaches the pane's far side
const ARC = [662, 588];
// a band around ARC at radius r, half-width h, from the right (0) round to
// its end; it keeps its width for the first half, then tapers out
const band = (r, h, end, n = 60) => {
	const at = (k, side) => {
		const t = k / n, a = t * end, w = h * Math.min(1, (1 - t) / 0.5);
		return [ARC[0] + (r + side * w) * Math.cos(a), ARC[1] - (r + side * w) * Math.sin(a)];
	};
	return poly([...Array.from({ length: n + 1 }, (_, k) => at(k, 1)), ...Array.from({ length: n + 1 }, (_, k) => at(n - k, -1))]);
};
const rainbow = [
	path(SOFT, band(160, 7, 2.05)),
	path(WASH, band(144, 7, 2.0)),
	path(SOFT, band(128, 7, 1.95)),
];

svg = under(svg, [...rainbow, path(INK, laptopBase), ...nearHand.map(shift)]);
svg = over(svg, [
	...page,
	path(LIGHT, circle(SUN, 48)),
	...rays,
	path(WHITE, jawLine, 'edge'),
	path(WHITE, sleeve, 'edge'),
	// over the patches, which reach into where they lie
	path(INK, farSleeve),
	path(WHITE, zigzag, 'edge'),
	path(INK, collar),
	...chin.map((d) => path(INK, d, 'edge')),
	...jaw.map((d) => path(INK, d, 'edge')),
	face,
	path(INK, smile, 'edge'),
]);
write(OUT, svg);
