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

// the spreadsheet: its grid (path 4, ink with the cells cut out) keeps its
// drawn weight rather than thickening into strips, and the slivers of grey the
// trace left along its lines (5 to 22, bar three small filled blocks) go
const GRID = 4;
const SLIVERS = new Set(Array.from({ length: 18 }, (_, i) => 5 + i).filter((i) => ![6, 8, 10].includes(i)));
let index = -1;
svg = svg.replace(/<path\b[^>]*?\/?>/g, (p) => {
	index++;
	if (SLIVERS.has(index)) return '';
	if (index === GRID) return p.replace('<path', '<path data-finish="edge"');
	return p;
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
	poly([[391, 557], [441, 557], [441, 591], [391, 591]]),
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

// 6. tiny numbers in the spreadsheet's cells, right-aligned, drawn in strokes
// as seven-segment digits so they stay paths
const SEGMENTS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
const digit = (ch, x, y, w = 3.6, h = 7) => {
	const p = { a: [[x, y], [x + w, y]], b: [[x + w, y], [x + w, y + h / 2]], c: [[x + w, y + h / 2], [x + w, y + h]], d: [[x, y + h], [x + w, y + h]], e: [[x, y + h / 2], [x, y + h]], f: [[x, y], [x, y + h / 2]], g: [[x, y + h / 2], [x + w, y + h / 2]] };
	return [...SEGMENTS[ch]].map((s) => line(...p[s], 1.3));
};
const number = (text, right, top) => [...text].reverse().flatMap((ch, i) => digit(ch, right - 4 - i * 5.4, top));
// cell (its box in the trace) → the number in it
const CELLS = [
	[[364, 377, 427, 414], '4'], [[391, 415, 427, 437], '6'], [[390, 438, 428, 486], '3'],
	[[364, 487, 428, 511], '2'], [[254, 462, 312, 511], '9'], [[312, 487, 336, 511], '7'],
	[[336, 487, 364, 510], '1'], [[364, 438, 390, 462], '8'], [[336, 462, 364, 487], '9'],
	[[312, 438, 336, 462], '5'], [[365, 415, 391, 437], '8'], [[364, 462, 390, 486], '3'],
];
const numbers = CELLS.flatMap(([[, y0, x1]], i) => number(CELLS[i][1], x1 - 3, y0 + 5));

// 7. the screen's border filled in ink: the frame between its outer edge and
// the screen, open on the right where it runs behind his head
const frame =
	'M207 337L446 337L446 560L207 560Q200 560 200 553L200 344Q200 337 207 337Z' +
	'M222 358L446 358L446 543L222 543Z';

// the dark block in the screen's top-left corner, a selected range, in the
// soft tone, so it doesn't merge with the dark frame around it
const selection = poly([[223, 359], [311, 359], [311, 412], [249, 412], [249, 462], [223, 462]]);

// 8. the spreadsheet spills out of the screen, like the windows popping out of
// Sinead's laptop: more rows above it and more columns to its left, white
// cells ruled in thin lines over the frame and past it
const block = (xs, ys) => {
	const [x0, x1, y0, y1] = [xs[0], xs.at(-1), ys[0], ys.at(-1)];
	return {
		fill: poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]),
		rules: [...xs.map((x) => line([x, y0 - 1], [x, y1 + 1], 2.2)), ...ys.map((y) => line([x0 - 1, y], [x1 + 1, y], 2.2))],
	};
};
const spills = [
	block([312, 336, 364, 390, 437], [296, 316, 337, 358]), // rows above
	block([160, 186, 222, 248], [438, 462, 487, 511]), // columns to the left
];
const spillNumbers = [...number('2', 386, 341), ...number('7', 433, 320), ...number('5', 218, 466), ...number('1', 182, 491)];

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
	...numbers.map((d) => path(INK, d).replace('<path', '<path data-finish="edge"')),
	path('#C8C7C8', selection),
	`<path fill="${INK}" fill-rule="evenodd" d="${frame}"/>`,
	...spills.flatMap((s) => [path(WHITE, s.fill), ...s.rules.map((d) => path(INK, d).replace('<path', '<path data-finish="edge"'))]),
	...spillNumbers.map((d) => path(INK, d).replace('<path', '<path data-finish="edge"')),
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
writeFileSync(OUT, svg);
console.log('wrote', OUT.pathname, (svg.match(/<path\b/g) || []).length, 'paths');
