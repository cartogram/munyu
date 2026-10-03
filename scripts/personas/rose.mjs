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
let index = -1;
svg = svg.replace(/<path\b[^>]*?\/?>/g, (p) => (CURTAINS.has(++index) ? p.replace(/fill="[^"]+"/, `fill="${CURTAIN}"`) : p));

// a floor: a grey shadow strip under the rug, sofa and side table, ragged at the ends
const floor =
	'M128 936L930 936C946 937 954 943 946 949C934 954 880 953 820 954L240 955C180 955 126 954 120 949C114 943 116 937 128 936Z';

svg = svg.replace(/<\/svg>\s*$/, `${path(FLOOR, floor)}</svg>\n`);
writeFileSync(OUT, svg);
console.log('wrote', OUT.pathname, (svg.match(/<path\b/g) || []).length, 'paths');
