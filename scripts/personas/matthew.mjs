// Matthew's edits to his traced illustration, written to originals/matthew.svg,
// which normalize-personas.mjs then tints and finishes: the table ends on the
// right without a leg, like Melody's and Sinead's. Coordinates are the
// trace's 1024 canvas.   node scripts/personas/matthew.mjs && npm run personas
import { readFileSync, writeFileSync } from 'fs';
const SRC = new URL('../../media/personas/traces/matthew.svg', import.meta.url);
const OUT = new URL('../../media/personas/originals/matthew.svg', import.meta.url);
const WHITE = '#FEFEFE';
const path = (fill, d) => `<path fill="${fill}" d="${d}"/>`;

let svg = readFileSync(SRC, 'utf8').replace(/<metadata>.*?<\/metadata>/s, '');

// the right table leg is part of the figure's ink sheet, so it's painted out:
// from just under the table top to the floor
const leg = 'M815 582.5L843 582.5L843 940L815 940Z';

svg = svg.replace(/<\/svg>\s*$/, `${path(WHITE, leg)}</svg>\n`);
writeFileSync(OUT, svg);
console.log('wrote', OUT.pathname, (svg.match(/<path\b/g) || []).length, 'paths');
