// Melody's edits to her traced illustration, written to originals/melody.svg,
// which normalize-personas.mjs then tints and finishes. The chair goes, bar a
// back; she gets white shoes, a floor and filled nails; the table ends on the
// right; the Be My Eyes mark sits on the phone. Coordinates are the trace's
// 1024 canvas.   node scripts/personas/melody.mjs && npm run personas
import { readFileSync, writeFileSync } from 'fs';
const SRC = new URL('../../media/personas/traces/melody.svg', import.meta.url);
const OUT = new URL('../../media/personas/originals/melody.svg', import.meta.url);
const INK = '#000000', WHITE = '#FEFEFE', FLOOR = '#C8C7C8';

const f = (v) => +v.toFixed(1);
const poly = (pts) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
// a straight stroke as a filled strip
const line = ([x0, y0], [x1, y1], w = 4) => {
	const len = Math.hypot(x1 - x0, y1 - y0), nx = (-(y1 - y0) / len) * (w / 2), ny = ((x1 - x0) / len) * (w / 2);
	return poly([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]);
};
const path = (fill, d) => `<path fill="${fill}" d="${d}"/>`;

// Her back, row by row, measured from a render (x of the body's left edge).
const back = [[440, 234], [455, 225], [470, 217], [485, 211], [500, 207], [515, 203], [530, 201], [545, 200], [560, 201], [575, 204], [590, 209], [605, 215], [620, 224], [632, 233]];

// 1. no chair: white over the old one's back, up to her body, down to the desk
const clearBack =
	'M100 430L240 430' +
	back.map(([y, x]) => `L${x - 1} ${y}`).join('') +
	'L100 632Z';

// 1b. in its place just a chair back, like Allana's: dark, rounded at the top,
// standing behind her down to the desk, with white between it and her sweater
// so the two read apart. Nothing of the chair below the desk.
const GAP = 13;
// her back higher up, where it curves round towards her shoulder
const shoulder = [[400, 279], [410, 265], [420, 253], [430, 244]];
const chairEdge = [...shoulder, ...back.filter(([y]) => y >= 440)].map(([y, x]) => [x - GAP, y]);
// mostly behind her: it rises over her back and follows it round towards her
// shoulder, and its left edge leans in so its foot stays inside the table's
// slanted corner
const chairBack =
	`M${chairEdge[0][0]} ${chairEdge[0][1]}` +
	`C${chairEdge[0][0] - 4} 386 238 376 214 380` +
	'C180 386 160 420 157 460L157 632' + // straight down; its foot needn't meet the table's slant
	chairEdge
		.slice()
		.reverse()
		.map(([x, y]) => `L${x} ${y}`)
		.join('') +
	'Z';

// 2. and under the desk, white over its seat line and leg, beside her legs
const legs = [[792, 425], [800, 428], [815, 419], [830, 408], [845, 397], [860, 387], [875, 376], [890, 365], [903, 360]];
const cover = poly([[184, 790], ...legs.map(([y, x]) => [x - 2, y]), [184, 903]]);

// 3. feet: the trousers end at a hem, with white below it, and a white shoe
// under each leg, outlined: a pointed toe and a small heel. Each shoe is its
// dark silhouette with the white shoe laid on it a little smaller, so the
// cut-paper strips turn the rim into an even outline.
const HEM = 884;
const below = poly([[340, HEM], [652, HEM], [652, 903], [336, 903]]);
// heel x, where the top of the shoe meets the toe's slope, toe tip x. The sole
// arches between the heel block and the ball of the foot.
const shoe = (h, a, t, g = 0) =>
	`M${h - g} ${HEM - g}L${a} ${HEM - g}` +
	`C${a + (t - a) * 0.5} ${HEM + 6 - g} ${t - 4 + g} ${890 - g} ${t + 3 + g} ${893 - g}` + // the toe, pointed and a little upturned
	`C${t + 2 + g} ${899 + g} ${t - 8} ${903 + g} ${t - 20} ${903 + g}` +
	`L${h + 44} ${903 + g}C${h + 38} ${896 + g} ${h + 30} ${896 + g} ${h + 24} ${896 + g}` + // the arch
	`L${h + 24} ${903 + g}L${h - g} ${903 + g}Z`; // the heel block
const SHOES = [[380, 460, 552], [566, 626, 716]];
// the back leg's hem corner, rounded off rather than coming to a point
const corner = `M376 ${HEM - 18}L358 ${HEM + 4}L383 ${HEM}Q367 ${HEM} 378.5 ${HEM - 16}Z`; // a curve tangent to the leg's edge and the hem

// 7. on the right the table just ends: no edge to its top there, and no leg
const tableRight = line([815, 625], [904, 712], 18);
const tableLegs = [poly([[825, 708], [845, 708], [845, 903], [825, 903]])];

// 8. beside the collar, a sliver of the light beam sits on its darker crossing
// and reads as a stray strip: recolour it to the crossing
const SLIVER_PATH = 9, BEAM_DEEP = '#766435';

// 4. floor: a grey shadow strip under the chair and feet, ragged at the ends
const floor =
	'M126 905L742 905C758 906 766 912 758 919C746 924 700 923 640 924L240 925C178 925 126 924 118 919C110 913 114 906 126 905Z';

// 5. nails, filled in: an ellipse at each fingertip (cx, cy, rx, ry, angle)
const ellipse = ([cx, cy, rx, ry, deg = 0]) => {
	const a = (deg * Math.PI) / 180, pts = [];
	for (let i = 0; i < 24; i++) {
		const t = (i / 24) * 2 * Math.PI, x = rx * Math.cos(t), y = ry * Math.sin(t);
		pts.push([cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
	}
	return poly(pts);
};
const nails = [
	// the hand on the letter: three hooked tips (the fourth is its own shape, below)
	[514.5, 499, 3.5, 6, 25], [531.5, 509.5, 3.5, 6, 25], [530, 549.5, 3.5, 5.5, 25],
	// the hand on the phone: inside the three loops down the knuckles
	[778, 408, 6.5, 5, -15], [779, 428.5, 6.5, 5, -15], [783.5, 448, 6, 4.5, -15],
];
// the letter hand's closed-loop nail is a white shape of its own in the trace: fill it
const NAIL_PATH = 53;

// 6. the Be My Eyes symbol, white on the caller's dark shape, under the eyes.
// simplified: the original's fine rays don't survive at this size, so it's
// redrawn as a solid centre and a ring of twelve thick rays
const CX = 737, CY = 418, K = 1.2; // K: its scale
const rays = Array.from({ length: 12 }, (_, i) => {
	const a = (i / 12) * 2 * Math.PI;
	return line([CX + 10 * K * Math.cos(a), CY + 10 * K * Math.sin(a)], [CX + 17 * K * Math.cos(a), CY + 17 * K * Math.sin(a)], 3.4 * K);
});
const symbol = [ellipse([CX, CY, 6.5 * K, 6.5 * K]), ...rays];

let svg = readFileSync(SRC, 'utf8').replace(/<metadata>.*?<\/metadata>/s, '');
let n = -1;
svg = svg.replace(/<path\b[^>]*?\/?>/g, (p) => {
	n++;
	if (n === NAIL_PATH) return p.replace(/fill="[^"]+"/, `fill="${INK}"`);
	if (n === SLIVER_PATH) return p.replace(/fill="[^"]+"/, `fill="${BEAM_DEEP}"`);
	return p;
});
// the chair back sits just above the figure's ink sheet (the first path), under
// everything else; the rest goes on top. Inserted in place, so the gradients
// defined between the paths stay where they are.
const first = svg.match(/<path\b[^>]*?\/?>/);
const at = first.index + first[0].length;
svg = svg.slice(0, at) + path(WHITE, clearBack) + path(INK, chairBack) + svg.slice(at);
const top = [
	path(WHITE, cover),
	path(FLOOR, floor),
	path(WHITE, below),
	path(WHITE, corner),
	path(WHITE, tableRight),
	...tableLegs.map((d) => path(WHITE, d)),	...SHOES.flatMap(([h, a, t]) => [path(INK, shoe(h, a, t, 2.5)), path(WHITE, shoe(h, a, t))]),
	...nails.map((e) => path(INK, ellipse(e))),
	...symbol.map((d) => path(WHITE, d)),
].join('');
svg = svg.replace(/<\/svg>\s*$/, `${top}</svg>\n`);
writeFileSync(OUT, svg);
console.log('wrote', OUT.pathname, (svg.match(/<path\b/g) || []).length, 'paths');
