// Sarah again, for the talk's close: her illustration (sarah.mjs) without
// the storm or the stack of fighting overlays. A sun in the window, on her
// laptop one calm page, dark, with a few large lines of text, each word's
// second half bold: the interface that already fits her, and both her hands
// on it: the hand at her cheek comes
// down to the keyboard. Written to originals/back-to-sarah.svg for
// normalize-personas.mjs to tint and finish. Coordinates are the trace's
// 1024 canvas.
//   node scripts/personas/back-to-sarah.mjs && npm run personas
import { INK, WHITE, LIGHT, DEEP, SOFT, WASH, poly, line, circle, curve, path, under, over, eachPath, write } from './draw.mjs';
import { sarah } from './sarah.mjs';
import { smooth } from './busts.mjs';

const OUT = new URL('../../media/personas/originals/back-to-sarah.svg', import.meta.url);

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
// the trace's hand on the keyboard, its outline and finger lines: they go,
// and both hands are drawn again (5). Its fingers sat so close that the gaps
// between them closed up in the finish.
const HAND_ZONE = [465, 592, 580, 642];
// the laptop base's outline, a mid grey in the trace: ink, like the base
const BASE_OUTLINE = [502, 640, 711, 667];
const base = sarah({ storm: false });
// her face, the last six paths of sarah.mjs: nose, eye, mouth. The nose and
// eye are put back on top of the patches (4); the mouth goes.
const MOUTH = (base.match(/<path\b/g) || []).length - 1;
const face = base.match(/(?:<path\b[^>]*\/>){6}(?=<\/svg>)/)[0].replace(/<path\b[^>]*\/>$/, '');
const near = (b, to) => b.every((v, k) => Math.abs(v - to[k]) < 1.5);
let svg = eachPath(base, (i, p) => {
	if (i === FINGERS || i === WRIST || i === MOUTH) return '';
	if (i === LAPTOP) return path(INK, poly([[616, 482], [778, 482], [784, 488], [718, 642], [549, 641]]));
	if (i === SILL) return p;
	if (i === SCREEN) return '';
	const [x0, y0, x1, y1] = box(p);
	if (x0 >= HAND_ZONE[0] && y0 >= HAND_ZONE[1] && x1 <= HAND_ZONE[2] && y1 <= HAND_ZONE[3]) return '';
	if (near([x0, y0, x1, y1], BASE_OUTLINE)) return p.replace(/\bfill="[^"]+"/, `fill="${INK}"`);
	return x0 >= PANE[0] && y0 >= PANE[1] && x1 <= PANE[2] && y1 <= PANE[3] ? '' : p;
});

// 2. the screen, and the page on it: a heading and three lines of large
// text, slanted with the screen. (u, v) runs across and down the screen, from its
// top-left corner (626, 497) to its bottom-right (696, 615).
const at = (u, v) => [626 + u * 118 - v * 48, 497 + v * 118];
// Pieces the deck moves (js/site.js) are named parts: data-part="<name>",
// which normalize-personas.mjs keeps as a <g data-part> in the finished SVG
const part = (name, el) => el.replace(/^<path\b/, `<path data-part="${name}"`);
// The page is in dark mode, with each word's second half in bold. Only
// indicated: a word is one bar, stepped where its bold half begins, the
// bold half the taller. The bars on a line are one part (a run of shapes
// of one part is one <g>), so the deck can write them out line by line.
const BOLD_FIRST = false; // true: the first half is bold, as bionic reading sets it
const word = (u0, u1, vc, thin, bold) => {
	const um = (u0 + u1) / 2, t = thin / 2 / 118, b = bold / 2 / 118;
	const [a, c] = BOLD_FIRST ? [b, t] : [t, b];
	return poly([at(u0, vc - a), at(um, vc - a), at(um, vc - c), at(u1, vc - c), at(u1, vc + c), at(um, vc + c), at(um, vc + a), at(u0, vc + a)]);
};
const textLine = (name, v, thin, bold, words) =>
	words.map(([u0, u1]) => part(name, path(WHITE, word(u0, u1, v + bold / 2 / 118, thin, bold), 'edge')));
const page = [
	path(DEEP, poly([at(0, 0), at(1, 0), at(1, 1), at(0, 1)])),
	...textLine('text-1', 0.15, 8, 18, [[0.14, 0.36], [0.4, 0.62]]),
	...textLine('text-2', 0.4, 5, 12, [[0.14, 0.34], [0.38, 0.58], [0.62, 0.86]]),
	...textLine('text-3', 0.55, 5, 12, [[0.14, 0.3], [0.34, 0.52], [0.56, 0.8]]),
	...textLine('text-4', 0.7, 5, 12, [[0.14, 0.36], [0.4, 0.66]]),
];

// 3. the sun, in the storm's place: light, so pale and without an outline,
// its rays short strips around it
const SUN = [728, 252];
const rays = Array.from({ length: 8 }, (_, k) => {
	const a = (k / 8) * 2 * Math.PI + Math.PI / 8;
	const from = [SUN[0] + 64 * Math.cos(a), SUN[1] + 64 * Math.sin(a)], to = [SUN[0] + 88 * Math.cos(a), SUN[1] + 88 * Math.sin(a)];
	return part('rays', path(LIGHT, line(from, to, 12)));
});

// 4. the raised arm comes down. White patches over the old line between her
// face and hand (wide, as the finish thickens and shifts it), and over the
// raised forearm and its elbow, the round lower part of the old sleeve,
// which as her upper arm stood out far in front of her chest. Her far arm
// is drawn anew in one curve, like her near arm: down from her shoulder (the
// patch's lower edge rounds over it from her collar), bending at the elbow
// and on to her hand on the keyboard (5), with a thin line of white between
// it and her chest.
const jawLine = poly([[400, 384], [424, 384], [402, 424], [407, 428], [410, 458], [388, 461], [379, 428], [381, 420]]);
// the arm's new top, from her collar to the old sleeve's outer edge
const ARM_TOP = [[390, 452], [402, 458], [413, 466], [422, 476], [428, 488]];
// the upper arm's front, from the shoulder down to the elbow
const ARM_FRONT = [[428, 488], [434, 504], [440, 522], [446, 538], [452, 547]];
const sleeve = poly([[388, 446], [391, 437], [398, 432], [420, 417], [436, 414], [450, 422], [463, 452], [472, 480], [476, 505], [470, 512], ...ARM_TOP.slice().reverse()]);
const elbow = poly([...ARM_FRONT, [472, 546], [478, 520], [478, 500], [470, 484], [444, 470]]);
// the far arm, round its outline from the shoulder: the front down to the
// elbow and along the forearm's top to the wrist, then back under the
// forearm, round the elbow and up the arm's back
const farArm = poly(smooth([
	[410, 468], [424, 480], [434, 498], [441, 520], [448, 540], [460, 556], [478, 572], [494, 582], [503, 590],
	[503, 604], [482, 603], [460, 596], [440, 586], [422, 576], [408, 562],
	[400, 544], [396, 522], [396, 500], [400, 482],
], 4));
// the white behind it, a little wider than its back, joining the gap
// under it, so it stands apart from her chest as her near arm does
const armpit = poly([[398, 480], [394, 500], [394, 522], [396, 542], [388, 560], [380, 574], [400, 582], [430, 586], [450, 560], [430, 500], [415, 478]]);
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
	[316, 422], [346, 450], [362, 451], [380, 447], ...ARM_TOP, [434, 515], [410, 515],
	[396, 505], [379, 487], [360, 472], [330, 448], [311, 444], [310, 429],
]);

// 5. both hands on the keyboard, drawn like Myron's: white, outlined in even
// strokes, a slim thumb along the top, the fingers one zigzag of rounded
// loops stacked down to the keys. Each is drawn flat, its wrist at the
// origin, then turned down by deg and set at the sleeve's cuff. The far hand
// comes out of her far forearm, drawn out from her elbow; it is smaller, and
// its fingertips stop short of the laptop's lid, which stands in front of it.
const hand = ([ox, oy], deg, { h, knuckle, finger, fingers = 3, thumb = finger * 0.8 }) => {
	const r = (deg * Math.PI) / 180, c = Math.cos(r), sn = Math.sin(r);
	const place = ([x, y]) => [ox + x * c - y * sn, oy + x * sn + y * c];
	const base = knuckle * 0.55, loop = h / fingers;
	const pts = [[0, 0], [base, 0]];
	// the thumb: a slimmer loop than a finger, lying along the top
	for (let k = 1; k < 8; k++) {
		const a = (Math.PI * k) / 8;
		pts.push([base + thumb * Math.sin(a) ** 0.5, -loop * 0.36 - loop * 0.36 * Math.cos(a) * 0.92]);
	}
	pts.push([knuckle * 0.9, 0]);
	for (let i = 0; i < fingers; i++) {
		const y0 = loop * i, y1 = loop * (i + 1), ym = (y0 + y1) / 2;
		const tip = knuckle + finger - [3, 0, 1, 5][i % 4] * (finger / 32); // their lengths vary a little
		pts.push([knuckle, y0]);
		for (let k = 1; k < 8; k++) {
			const a = (Math.PI * k) / 8;
			pts.push([knuckle + (tip - knuckle) * Math.sin(a) ** 0.35, ym - (loop / 2) * Math.cos(a) * 0.92]);
		}
	}
	pts.push([knuckle, h], [0, h]);
	const at = pts.map(place);
	// open at the wrist, round at every joint
	return [
		path(WHITE, poly(at)),
		...at.slice(1).map((pt, i) => path(INK, line(at[i], pt, 2.6), 'edge')),
		...at.slice(1, -1).map((pt) => path(INK, circle(pt, 1.3, 12), 'edge')),
	];
};
const farHand = hand([500, 584], 12, { h: 22, knuckle: 18, finger: 18 });
const nearHand = hand([482, 612], 10, { h: 30, knuckle: 26, finger: 23 });

// 6. the laptop's base, dark like its lid, with white between the two
const laptopBase = poly([[505, 647], [717, 647], [715, 655], [709, 663], [703, 665], [510, 665], [504, 661], [503, 651]]);

// 7. a rainbow under the sun, as wide as the window: three bands round a
// centre just below the sill, cut off by the window's frame on either side
// and by the sill below, and hidden in the middle by the laptop. The finish
// trims each band back, so white shows between them; the middle one is light,
// like the sun.
const ARC = [675, 600];
const PANE_X = [515, 835], SILL_Y = 588;
const clip = ([x, y]) => [Math.min(Math.max(x, PANE_X[0]), PANE_X[1]), Math.min(y, SILL_Y)];
const band = (r, w, n = 96) => poly([
	...Array.from({ length: n + 1 }, (_, k) => [ARC[0] + (r + w / 2) * Math.cos((Math.PI * k) / n), ARC[1] - (r + w / 2) * Math.sin((Math.PI * k) / n)]),
	...Array.from({ length: n + 1 }, (_, k) => [ARC[0] + (r - w / 2) * Math.cos((Math.PI * (n - k)) / n), ARC[1] - (r - w / 2) * Math.sin((Math.PI * (n - k)) / n)]),
].map(clip));
// each band a part, so the deck can bring them out one after another
const rainbow = [
	part('rainbow-1', path(SOFT, band(205, 22), 'piece')),
	part('rainbow-2', path(LIGHT, band(183, 22), 'piece')),
	part('rainbow-3', path(WASH, band(161, 22), 'piece')),
];

svg = under(svg, [...rainbow, path(INK, laptopBase)]);
svg = over(svg, [
	...page,
	part('sun', path(LIGHT, circle(SUN, 48))),
	...rays,
	path(WHITE, jawLine, 'edge'),
	path(WHITE, sleeve, 'edge'),
	path(WHITE, elbow, 'edge'),
	// over the patches, which reach into where they lie
	path(WHITE, armpit, 'edge'),
	path(INK, farArm),
	...farHand,
	...nearHand,
	path(WHITE, zigzag, 'edge'),
	path(INK, collar),
	...chin.map((d) => path(INK, d, 'edge')),
	...jaw.map((d) => path(INK, d, 'edge')),
	face,
	path(INK, smile, 'edge'),
]);
write(OUT, svg);
