// The sprinkle jar's edits to its traced illustration, written to
// originals/your-ui-is-not-my-ui-personalization.svg, which
// normalize-personas.mjs then tints and finishes: a spoon pours sprinkles
// into a jar labelled Personalizations. Coordinates are the trace's 1024
// canvas.
//   node scripts/personas/your-ui-is-not-my-ui-personalization.mjs && npm run personas
import { WHITE, DEEP, SOFT, path, poly, over, eachPath, floor, readTrace, write } from './draw.mjs';

const SRC = new URL('../../media/personas/traces/your-ui-is-not-my-ui-personalization.svg', import.meta.url);
const OUT = new URL('../../media/personas/originals/your-ui-is-not-my-ui-personalization.svg', import.meta.url);

let svg = readTrace(SRC);

// 1. the sprinkles are orange and yellow, which the finish would take for
// light (no outline, grown over the ink), as the fish's orange was. They're
// not light, so each gets a grey: by lightness alone they'd land on the
// palest steps and read as empty rings, so a step darker. The orange ones
// deep, the light orange and yellow ones soft, beside the black ones in
// ink: three tones mixed, like Rose's scarf. The three gradients (two dark
// sprinkles, a glint on the glass) get a flat fill, as only a flat fill
// survives.
const SPRINKLE = { '#F78945': DEEP, '#F7AF48': SOFT, '#FDD251': SOFT };
const grey = (hex) => SPRINKLE[hex.toUpperCase()] ?? hex;
const GRADIENT = { gradient_0: '#000000', gradient_1: '#000000', gradient_2: '#E8E8E8' };
// 2. no ground: the trace starts on a white square the size of the canvas,
// which would sit opaque on the slide and cover anything beside it. In its
// place, behind everything, a floor under the jar, so the jar stands on it
// and the spilt sprinkles lie on top.
const ground = path(SOFT, floor(300, 740, 912));
// 3. the sprinkles are only ~10 units across, and the label's letters are
// fine lines: the full finish would trim each sprinkle to a ring of ink
// round a sliver of colour, and thicken the letters. Every shape under 70
// units keeps its drawn weight (the edge finish); the jar and spoon, and
// the glass's streaks, get the full finish, as the fishbowls do.
const SMALL = 70;
const size = (p) => {
	const n = (p.match(/ d="([^"]*)"/)[1].match(/-?[\d.]+/g) || []).map(Number);
	const xs = n.filter((_, k) => k % 2 === 0), ys = n.filter((_, k) => k % 2 === 1);
	return Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
};
svg = eachPath(svg, (i, p) => {
	if (i === 0) return ground;
	p = p
		.replace(/fill="url\(#(gradient_\d)\)"/, (m, id) => `fill="${GRADIENT[id]}"`)
		.replace(/fill="(#[0-9A-Fa-f]{6})"/, (m, hex) => `fill="${grey(hex)}"`);
	return size(p) < SMALL ? p.replace('<path ', '<path data-finish="edge" ') : p;
});

// 4. no horizon line: the set stands things on a floor strip instead. It's
// part of the jar's ink sheet, so it's painted out either side of the jar,
// stopping short of the glass's outline.
const lineLeft = poly([[50, 832], [324.5, 832], [324.5, 846], [50, 846]]);
const lineRight = poly([[706.5, 830], [956, 830], [956, 845], [706.5, 845]]);
svg = over(svg, [path(WHITE, lineLeft, 'edge'), path(WHITE, lineRight, 'edge')]);
write(OUT, svg);
