// Rose's edits to her traced illustration, written to originals/rose.svg,
// which normalize-personas.mjs then tints and finishes: lighter curtains, and
// a floor like the others'. Coordinates are the trace's 1024 canvas.
//   node scripts/personas/rose.mjs && npm run personas
import { readFileSync, writeFileSync } from 'fs';
const SRC = new URL('../../media/personas/traces/rose.svg', import.meta.url);
const OUT = new URL('../../media/personas/originals/rose.svg', import.meta.url);
const FLOOR = '#C8C7C8';
const path = (fill, d) => `<path fill="${fill}" d="${d}"/>`;

let svg = readFileSync(SRC, 'utf8').replace(/<metadata>.*?<\/metadata>/s, '');

// lighter curtains: the two panels (paths 1 and 12) a step paler, the wash step
const CURTAINS = new Set([1, 12]), CURTAIN = '#DCDBDD';

// the scarf: its knitted zigzags go, its tan pieces become a mid tone, and it
// is dotted all over in a lighter one, like printed cloth
const SCARF_BOX = [255, 550, 450, 795];
const SCARF_BASE = ['#D2BC9A', '#CAB592'], SCARF_PATTERN = ['#836E54', '#625143', '#B8A383', '#4E4237'];
const DOT = '#BDBCBD'; // the soft step

const inBox = (d, [x0, y0, x1, y1]) => {
	const n = d.match(/-?\d*\.?\d+/g).map(Number);
	return n.every((v, i) => (i % 2 ? v >= y0 && v <= y1 : v >= x0 && v <= x1));
};
const scarfPieces = [];
let index = -1;
svg = svg.replace(/<path\b[^>]*?\/?>/g, (p) => {
	index++;
	if (CURTAINS.has(index)) return p.replace(/fill="[^"]+"/, `fill="${CURTAIN}"`);
	const fill = p.match(/\bfill="([^"]+)"/)?.[1]?.toUpperCase();
	const d = p.match(/\bd="([^"]+)"/)?.[1];
	if (!d || !inBox(d, SCARF_BOX)) return p;
	if (SCARF_PATTERN.includes(fill)) return '';
	if (SCARF_BASE.includes(fill)) {
		// no mid tone: the scarf is only its dots, on her dark sweater
		scarfPieces.push(d);
		return '<path data-scarf/>';
	}
	return p;
});

// dots: a staggered grid, nudged a little so it reads as printed by hand,
// keeping each dot whose centre falls inside a piece of the scarf
const f = (v) => +v.toFixed(1);
function flatten(d) {
	// absolute M/L/C/Z, as the tracer writes them, to polygons
	const polys = [];
	let cur = [], x = 0, y = 0;
	for (const [, cmd, args] of d.matchAll(/([MLCZ])([^MLCZ]*)/g)) {
		const n = (args.match(/-?\d*\.?\d+/g) || []).map(Number);
		if (cmd === 'M') (cur = [[n[0], n[1]]]), polys.push(cur), ([x, y] = n);
		else if (cmd === 'L') for (let i = 0; i < n.length; i += 2) cur.push([n[i], n[i + 1]]), ([x, y] = [n[i], n[i + 1]]);
		else if (cmd === 'C')
			for (let i = 0; i < n.length; i += 6) {
				const [x1, y1, x2, y2, x3, y3] = n.slice(i, i + 6);
				for (let t = 0.125; t <= 1; t += 0.125) {
					const u = 1 - t;
					cur.push([u ** 3 * x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t ** 3 * x3, u ** 3 * y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t ** 3 * y3]);
				}
				[x, y] = [x3, y3];
			}
	}
	return polys;
}
const inside = (polys, [px, py]) => {
	let hit = false;
	for (const poly of polys)
		for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
			const [xi, yi] = poly[i], [xj, yj] = poly[j];
			if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) hit = !hit;
		}
	return hit;
};
const shapes = scarfPieces.map(flatten);
const nudge = (i, j, k) => ((Math.sin(i * 12.9898 + j * 78.233 + k * 37.719) * 43758.5453) % 1) * 1.4;
const dots = [];
const STEP = 7.5, R = 2.5;
for (let j = 0, y = SCARF_BOX[1]; y <= SCARF_BOX[3]; j++, y += STEP * 0.87)
	for (let i = 0, x = SCARF_BOX[0] + (j % 2) * (STEP / 2); x <= SCARF_BOX[2]; i++, x += STEP) {
		const c = [x + nudge(i, j, 1), y + nudge(i, j, 2)];
		if (!shapes.some((s) => inside(s, c))) continue;
		const r = R + nudge(i, j, 3) * 0.3;
		const pts = Array.from({ length: 10 }, (_, k) => [c[0] + r * Math.cos((k / 10) * 2 * Math.PI), c[1] + r * Math.sin((k / 10) * 2 * Math.PI)]);
		dots.push(path(DOT, 'M' + pts.map(([a, b]) => `${f(a)} ${f(b)}`).join('L') + 'Z'));
	}
// on top of the scarf's last piece, under whatever was drawn over it (her hands, the needles)
const at = svg.lastIndexOf('<path data-scarf/>');
svg = svg.slice(0, at) + dots.join('') + svg.slice(at);
svg = svg.replaceAll('<path data-scarf/>', '');

// a floor: a grey shadow strip under the rug, sofa and side table, ragged at the ends
const floor =
	'M128 936L930 936C946 937 954 943 946 949C934 954 880 953 820 954L240 955C180 955 126 954 120 949C114 943 116 937 128 936Z';

// no nose: white over the little curl under her glasses
const noNose = 'M336.5 388L339.5 383.4L344.5 381.6L347.4 382.9L350.6 383.7L350 385.4L346 388.9L343.4 389.2L337.6 390.2Z';

svg = svg.replace(/<\/svg>\s*$/, `${path('#FDFDFD', noNose)}${path(FLOOR, floor)}</svg>\n`);
writeFileSync(OUT, svg);
console.log('wrote', OUT.pathname, (svg.match(/<path\b/g) || []).length, 'paths');
