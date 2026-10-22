// The two fishbowls' edits to their traced illustration, written to
// originals/one-interface-cant-fit-everyone.svg, which normalize-personas.mjs
// then tints and finishes: the same bowl for a small fish and a big one. The
// table ends on the right, with no edge to its top there and no leg, like
// Molly's and Michael's, and stands on a floor. Coordinates are the trace's
// 1024 canvas.
//   node scripts/personas/one-interface-cant-fit-everyone.mjs && npm run personas
import { WHITE, DEEP, SOFT, WASH, path, poly, over, eachPath, floor, readTrace, write } from './draw.mjs';

const SRC = new URL('../../media/personas/traces/one-interface-cant-fit-everyone.svg', import.meta.url);
const OUT = new URL('../../media/personas/originals/one-interface-cant-fit-everyone.svg', import.meta.url);

let svg = readTrace(SRC);

// 0. the fish are drawn in orange, which the finish would take for light
// (no outline, grown over the ink) and lose their linework under. They're
// not light: each colour becomes the grey of its own lightness, so it snaps
// to the ramp like any other shape (the body soft, its shadows deeper).
const grey = (hex) => {
	const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	if (!max || (max - min) / max <= 0.3) return hex;
	const v = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b).toString(16).padStart(2, '0');
	return `#${v}${v}${v}`;
};
svg = eachPath(svg, (i, p) => p.replace(/fill="(#[0-9A-Fa-f]{6})"/, (m, hex) => `fill="${grey(hex)}"`));

// 0b. flatter, like the rest of the set: the trace's fine shading goes (the
// speckled light in the small bowl's water, the scales and shadows across
// the big fish and its tail); the water in both bowls becomes one pale
// tone; each fish's body is one deep tone, its fins a soft one
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, k) => a + k);
const SHADING = new Set([...range(10, 36), 43, 44, ...range(48, 61), 68, ...range(76, 80), ...range(86, 91), ...range(95, 98), 101, ...range(103, 108)]);
const WATER = new Set([9, 70, 74, 75, 92]), BODY = new Set([38, 45, 46]), FINS = new Set([41, 42, 73, 82, 83, 85, 93, 94, 99, 100]);
const fill = (p, c) => p.replace(/fill="[^"]+"/, `fill="${c}"`);
svg = eachPath(svg, (i, p) => {
	if (SHADING.has(i)) return '';
	if (WATER.has(i)) return fill(p, WASH);
	if (BODY.has(i)) return fill(p, DEEP);
	if (FINS.has(i)) return fill(p, SOFT);
	return p;
});

// 1. the right leg goes: white from just under the table top to the floor,
// over its shadow under the top too
const leg = poly([[838, 630.5], [914, 630.5], [914, 888], [838, 888]]);
// 2. the top's right-hand edge goes, so the table runs on past the picture
const end = poly([[949, 586], [964, 586], [964, 633], [949, 633]]);
// 3. a floor under the legs
const ground = floor(100, 960, 882);

svg = over(svg, [path(WHITE, leg, 'edge'), path(WHITE, end, 'edge'), path(SOFT, ground)]);
write(OUT, svg);
