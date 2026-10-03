// Allana's edits to her traced illustration, written to originals/allana.svg,
// which normalize-personas.mjs then tints and finishes: the face on her call
// drawn like Sinead's, two dots of eyes and a small mouth (still glum).
// Coordinates are the trace's 1024 canvas.
//   node scripts/personas/allana.mjs && npm run personas
import { readFileSync, writeFileSync } from 'fs';
const SRC = new URL('../../media/personas/traces/allana.svg', import.meta.url);
const OUT = new URL('../../media/personas/originals/allana.svg', import.meta.url);
const INK = '#000000', WHITE = '#FEFEFE';
const f = (v) => +v.toFixed(1);
const poly = (pts) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
const circle = ([x, y], r) => poly(Array.from({ length: 36 }, (_, k) => [x + r * Math.cos((k / 36) * 2 * Math.PI), y + r * Math.sin((k / 36) * 2 * Math.PI)]));
const path = (fill, d, finish) => `<path fill="${fill}"${finish ? ` data-finish="${finish}"` : ''} d="${d}"/>`;

let svg = readFileSync(SRC, 'utf8').replace(/<metadata>.*?<\/metadata>/s, '');

// white over the closed eyes, the brows and the frown; the nose stays
const clear = [
	poly([[468, 340], [497, 340], [497, 373], [468, 373]]), // left brow and eye
	poly([[497, 340], [512, 340], [512, 361], [497, 361]]), // where the brow met the nose: the nose now starts below
	poly([[513, 340], [552, 340], [552, 373], [513, 373]]), // right brow and eye
	poly([[486, 404], [522, 404], [522, 418], [486, 418]]), // the frown
];
// the eyes, as dots, and a small down-turned mouth
const face = [
	circle([483, 366], 4.2),
	circle([529, 366], 4.2),
	poly([[497, 413.5], [501, 410.6], [505, 410], [509, 410.6], [513, 413.5], [513, 415.6], [509, 413], [505, 412.4], [501, 413], [497, 415.6]]),
];

const top = [...clear.map((d) => path(WHITE, d)), ...face.map((d) => path(INK, d, 'edge'))].join('');
svg = svg.replace(/<\/svg>\s*$/, `${top}</svg>\n`);
writeFileSync(OUT, svg);
console.log('wrote', OUT.pathname, (svg.match(/<path\b/g) || []).length, 'paths');
