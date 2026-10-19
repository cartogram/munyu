// Myron's edits to his traced illustration, written to originals/myron.svg,
// which normalize-personas.mjs then tints and finishes: a clean spreadsheet on
// his screen, no keyboard or mouse, his hand flat on his lap, dark trousers
// over white shoes, and a floor like the others'. Coordinates are the trace's 1024
// canvas.   node scripts/personas/myron.mjs && npm run personas
import { readFileSync, writeFileSync } from 'fs';
const SRC = new URL('../../media/personas/traces/myron.svg', import.meta.url);
const OUT = new URL('../../media/personas/originals/myron.svg', import.meta.url);
const FLOOR = '#C8C7C8';
const path = (fill, d) => `<path fill="${fill}" d="${d}"/>`;

let svg = readFileSync(SRC, 'utf8').replace(/<metadata>.*?<\/metadata>/s, '');

// the spreadsheet is drawn again (6–8), so the trace's goes: its grid (path
// 4, ink with the cells cut out), the slivers of grey along its lines (5 to
// 22), and every other piece inside the screen, bar the ink sheet (path 0)
// that the screen's white covers. Two ticks to the right of the screen (2
// and 3) go with it, and the headset's cable up to the shelf (62).
const SCREEN_ZONE = [215, 335, 440, 545];
const DROP = new Set([2, 3, 62]);
const box = (p) => {
	const n = p.match(/\bd="([^"]+)"/)[1].match(/-?\d*\.?\d+/g).map(Number);
	const xs = n.filter((_, i) => i % 2 === 0), ys = n.filter((_, i) => i % 2 === 1);
	return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};
let index = -1;
svg = svg.replace(/<path\b[^>]*?\/?>/g, (p) => {
	index++;
	if (index === 0) return p;
	if (DROP.has(index)) return '';
	const [x0, y0, x1, y1] = box(p);
	const [zx0, zy0, zx1, zy1] = SCREEN_ZONE;
	return x0 >= zx0 && y0 >= zy0 && x1 <= zx1 && y1 <= zy1 ? '' : p;
});

const INK = '#000000', WHITE = '#FEFEFE';
const f = (v) => +v.toFixed(1);
const poly = (pts) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
const line = ([x0, y0], [x1, y1], w) => {
	const len = Math.hypot(x1 - x0, y1 - y0), nx = (-(y1 - y0) / len) * (w / 2), ny = ((x1 - x0) / len) * (w / 2);
	return poly([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]);
};

// 1. no keyboard or mouse: white over them, and over his hand and cuff, which
// rested on the keyboard. The desk's top edge is drawn back where the hand
// crossed it, and the monitor's stand comes down to a foot on the desk.
const clear = [
	poly([[172, 562], [391, 562], [391, 617], [172, 617]]),
	poly([[386, 557], [441, 557], [441, 591], [386, 591]]),
	poly([[298, 617], [391, 617], [391, 641], [298, 641]]),
];
const desk = poly([[296, 617.5], [366, 617.5], [366, 621], [296, 621]]);
// (its foot is hidden behind his hand, which sits in front of the desk)
const stand = [poly([[361.5, 558], [365.5, 558], [365.5, 601], [361.5, 601]])];
// and the monitor's lower edge, where clearing the keyboard broke it
const bezel = poly([[386, 557.5], [443, 557.5], [443, 560.5], [386, 560.5]]);

// 2. dark trousers: both legs as one dark shape from his lap down to a hem,
// over the trace's two shoes and sock bands
const HEM = 889;
const frontEdge = [[650, 337], [660, 327], [670, 320], [680, 315], [690, 310], [700, 307], [710, 303], [720, 299], [730, 296], [740, 292], [750, 288], [760, 285], [770, 281], [780, 277], [790, 274], [800, 270], [810, 266], [820, 263], [830, 259], [840, 255], [850, 252], [860, 248], [870, 244], [880, 240], [HEM, 237]];
const backEdge = [[740, 396], [750, 391], [760, 387], [770, 382], [780, 378], [790, 373], [800, 369], [810, 365], [820, 360], [830, 356], [840, 351], [850, 347], [860, 343], [870, 339], [880, 334], [HEM, 330]];
const legs = poly([
	[399, 646], [360, 644],
	...frontEdge.map(([y, x]) => [x - 1, y]),
	...backEdge.slice().reverse().map(([y, x]) => [x + 1, y]),
	[399, 738],
]);

// 3. one simple shoe below the hem: white with an outline (its dark
// silhouette, the white shoe on it a little smaller), a pointed toe forward,
// a flat sole on the footrest's line, its back curving down from the hem.
// White first over the trace's shoes, socks and footrest block, leaving the
// footrest's line and the strut down to the castor.
const SOLE = 925;
const feet = poly([[176, 850], [394, 850], [367, SOLE - 1], [176, SOLE - 1]]);
const shoe = (g = 0) =>
	`M${236 - g} ${HEM - g}L${334 + g} ${HEM - g}` +
	`C${344 + g} ${HEM - g} ${351 + g} ${900} ${351 + g} ${SOLE + g}` + // the back, curving down
	`L${190 - g} ${SOLE + g}C${181 - g} ${SOLE + g} ${180 - g} ${914} ${190 - g} ${911}Z`; // the sole, then the toe

const dot = ([x, y], r) => poly(Array.from({ length: 12 }, (_, k) => [x + r * Math.cos((k / 12) * 2 * Math.PI), y + r * Math.sin((k / 12) * 2 * Math.PI)]));

// 4. his hand flat on his lap, out of the sleeve at the wrist (x 392), after
// the cartoon hands in the references: a straight top, the fingers as one
// zigzag line of four long rounded tips stacked down to his thigh, and a
// straight underside back to the wrist. White, outlined in even strokes.
const FINGERS = 4, TOP = 607, BOTTOM = 645, KNUCKLE = 368;
// the thumb first: a short rounded loop lying along the top of the hand
const handPts = [[392, TOP], [378, TOP]];
for (let k = 1; k < 8; k++) {
	const a = (Math.PI * k) / 8;
	// a slimmer loop than a finger, along the top from its base at x 378
	handPts.push([378 - (378 - 346) * Math.sin(a) ** 0.5, TOP - 3.6 - 3.6 * Math.cos(a) * 0.92]);
}
handPts.push([370, TOP]);
for (let i = 0; i < FINGERS; i++) {
	const y0 = TOP + ((BOTTOM - TOP) * i) / FINGERS, y1 = TOP + ((BOTTOM - TOP) * (i + 1)) / FINGERS, ym = (y0 + y1) / 2;
	const tip = 336 + [3, 0, 1, 5][i]; // the fingers' lengths vary a little
	handPts.push([KNUCKLE, y0]);
	// a long loop out to the tip and back: flat along each side, round at the end
	for (let k = 1; k < 8; k++) {
		const a = (Math.PI * k) / 8;
		handPts.push([KNUCKLE - (KNUCKLE - tip) * Math.sin(a) ** 0.35, ym - ((y1 - y0) / 2) * Math.cos(a) * 0.92]);
	}
}
handPts.push([KNUCKLE, BOTTOM], [392, BOTTOM]);
const handShape = poly(handPts);
// open at the wrist, round at every joint
const handLine = [...handPts.slice(1).map((pt, i) => line(handPts[i], pt, 2.6)), ...handPts.slice(1, -1).map((pt) => dot(pt, 1.3))];

// 5. his thigh under the arm: the space between his arm and the seat was left
// white, so his trousers carry on under the arm to the armrest and the seat
const thigh = poly([[334, 645], [396, 645], [396, 646], [492, 646], [500, 649], [505, 655.5], [557, 655.5], [557, 700], [450, 690], [415, 712], [397, 740]]);

// white between his leg and the chair, along the seat's top edge and down its
// front, so the dark trousers and the dark seat read apart
// it stops where his leg leaves the seat; below, the seat meets white anyway
const seatEdge = [[557, 656], [557, 684], [554, 687], [500, 687], [452, 688], [428, 697], [412, 710], [404, 728], [401, 742]];
// round joints, so the bends show no notches
const seatGap = [...seatEdge.slice(1).map((p, i) => line(seatEdge[i], p, 6)), ...seatEdge.slice(1, -1).map((p) => dot(p, 3))];

// 6. the spreadsheet, on one even grid: columns 26.5 wide and rows 23 tall
// from the screen's top-left corner, eight of each filling the screen. It
// spills out of the screen like the windows popping out of Sarah's laptop:
// two more rows above it, over the frame, and two more columns to its left,
// on the same lines. Column A, the headers he wants lined up, is selected,
// in the soft tone.
const SCREEN = [222, 358, 434, 543];
const COL = 26.5, ROW = 23.125;
const xAt = (c) => SCREEN[0] + c * COL, yAt = (r) => SCREEN[1] + r * ROW;
// a block of cells, columns c0 to c1 and rows r0 to r1 (grid lines, from the
// screen's corner): white, ruled in thin lines
const block = (c0, c1, r0, r1) => {
	const [x0, x1, y0, y1] = [xAt(c0), xAt(c1), yAt(r0), yAt(r1)];
	return {
		fill: poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]),
		rules: [
			...Array.from({ length: c1 - c0 + 1 }, (_, k) => line([xAt(c0 + k), y0 - 1], [xAt(c0 + k), y1 + 1], 2.2)),
			...Array.from({ length: r1 - r0 + 1 }, (_, k) => line([x0 - 1, yAt(r0 + k)], [x1 + 1, yAt(r0 + k)], 2.2)),
		],
	};
};
const cells = [
	block(0, 8, 0, 8), // the screen
	block(3, 8, -2, 0), // rows above
	block(-2, 0, 3, 7), // columns to the left
];
// the trace's outline of the old sheet above the screen, part of its ink
// sheet: white over it, up to the shelf's line
const oldOutline = poly([[262, 288], [428, 288], [428, 336], [262, 336]]);
const selection = poly([[xAt(0), yAt(1)], [xAt(1), yAt(1)], [xAt(1), yAt(6)], [xAt(0), yAt(6)]]);

// 7. tiny numbers in the cells, right-aligned, drawn in strokes as
// seven-segment digits so they stay paths. [column, row] → the number.
const SEGMENTS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
const digit = (ch, x, y, w = 3.6, h = 7) => {
	const p = { a: [[x, y], [x + w, y]], b: [[x + w, y], [x + w, y + h / 2]], c: [[x + w, y + h / 2], [x + w, y + h]], d: [[x, y + h], [x + w, y + h]], e: [[x, y + h / 2], [x, y + h]], f: [[x, y], [x, y + h / 2]], g: [[x, y + h / 2], [x + w, y + h / 2]] };
	return [...SEGMENTS[ch]].map((s) => line(...p[s], 1.3));
};
const number = (text, right, top) => [...text].reverse().flatMap((ch, i) => digit(ch, right - 4 - i * 5.4, top));
const CELLS = [
	[[1, 1], '12'], [[2, 1], '4'], [[4, 1], '30'], [[6, 1], '8'],
	[[2, 2], '6'], [[3, 2], '15'], [[5, 2], '3'], [[7, 2], '21'],
	[[1, 3], '9'], [[4, 3], '7'], [[6, 3], '42'],
	[[2, 4], '5'], [[3, 4], '18'], [[5, 4], '2'], [[7, 4], '6'],
	[[1, 5], '27'], [[4, 5], '9'], [[6, 5], '13'],
	[[2, 6], '3'], [[5, 6], '8'], [[7, 6], '50'],
	[[3, 7], '1'], [[6, 7], '4'],
	[[4, -2], '7'], [[6, -1], '2'], [[7, -2], '16'],
	[[-2, 4], '5'], [[-1, 6], '1'], [[-1, 3], '11'],
];
const numbers = CELLS.flatMap(([[c, r], text]) => number(text, xAt(c + 1) - 6, yAt(r) + 8));

// 8. the monitor's frame in ink, all the way round the screen, rounded at its
// outer corners
const frame =
	'M207 337L445 337Q452 337 452 344L452 553Q452 560 445 560L207 560Q200 560 200 553L200 344Q200 337 207 337Z' +
	`M${SCREEN[0]} ${SCREEN[1]}L${SCREEN[2]} ${SCREEN[1]}L${SCREEN[2]} ${SCREEN[3]}L${SCREEN[0]} ${SCREEN[3]}Z`;

// a floor: a grey shadow strip under the desk and chair, ragged at the ends
const floor =
	'M114 969L752 969C768 970 776 976 768 982C756 987 700 986 640 987L220 988C162 988 110 987 104 982C98 976 102 970 114 969Z';

const top = [
	...clear.map((d) => path(WHITE, d)),
	path(INK, desk),
	path(INK, bezel),
	...stand.map((d) => path(INK, d)),
	path(WHITE, feet),
	path(INK, legs),
	path(INK, thigh),
	...seatGap.map((d) => path(WHITE, d)),
	path(WHITE, oldOutline).replace('<path', '<path data-finish="edge"'),
	path(WHITE, cells[0].fill).replace('<path', '<path data-finish="edge"'),
	`<path fill="${INK}" fill-rule="evenodd" d="${frame}"/>`,
	...cells.slice(1).map((b) => path(WHITE, b.fill).replace('<path', '<path data-finish="edge"')),
	path('#C8C7C8', selection),
	...cells.flatMap((b) => b.rules).map((d) => path(INK, d).replace('<path', '<path data-finish="edge"')),
	...numbers.map((d) => path(INK, d).replace('<path', '<path data-finish="edge"')),
	path(INK, shoe(2.5)),
	path(WHITE, shoe()),
	path(WHITE, handShape),
	...handLine.map((d) => path(INK, d).replace('<path', '<path data-finish="edge"')),
	path(FLOOR, floor),
].join('');
svg = svg.replace(/<\/svg>\s*$/, `${top}</svg>\n`);

// 9. the wheels in the soft tint. The inside of the big wheel is a hole in
// the figure's ink sheet (the first path's contour 1): that exact contour,
// filled, goes under it. The back wheel shows only below the frame bar, where
// it opens onto the page, so it is traced from the
// inner edge of its rim. The castor is solid ink: a tinted disc on top, inset
// to leave its outline.
const WHEEL = '#C8C7C8';
const circle = ([x, y], r) => poly(Array.from({ length: 72 }, (_, k) => [x + r * Math.cos((k / 72) * 2 * Math.PI), y + r * Math.sin((k / 72) * 2 * Math.PI)]));
const sheet = readFileSync(SRC, 'utf8').match(/<path\b[^>]*\bd="([^"]+)"/)[1].split(/(?=M)/);
const lowerBack = poly([
	[436, 873], [577, 873], [578, 880], [581, 890], [585, 900], [591, 910], [597, 920], [604, 930],
	[594, 940], [581, 950], [560, 960], [530, 965], [499, 960], [478, 950], [465, 940], [456, 930],
	[449, 920], [444, 910], [440, 900], [438, 890], [436, 880],
]);
const under = [sheet[1], lowerBack].map((d) => path(WHEEL, d)).join('');
svg = svg.replace(/<path\b/, `${under}<path`);
svg = svg.replace(/<\/svg>\s*$/, `${path(WHEEL, circle([399, 935], 27))}</svg>\n`);

// 10. a face like Sarah's: a dot of an eye (his profile already has its
// nose; the mic's boom crosses where his mouth would be)
svg = svg.replace(/<\/svg>\s*$/, `${path(INK, circle([518, 353], 3.9)).replace('<path', '<path data-finish="edge"')}</svg>\n`);
writeFileSync(OUT, svg);
console.log('wrote', OUT.pathname, (svg.match(/<path\b/g) || []).length, 'paths');
