// Bring the traced persona illustrations (media/personas/originals/) into one
// consistent set, written to media/personas/:
//   1. flatten gradients to their average colour, and fill-opacity against white
//   2. snap every colour to the --ramp-* steps of its act's --act-* colour
//      (both in css/talk.css), by lightness; saturated colours (the yellow
//      screens and light beams) become the accent
//   3. crop each to its drawing with the same padding, on a shared square frame
//      with the floor along the bottom, so the figures sit at a common scale
//   4. for the illustrations in CUT_PAPER, a cut-paper finish after Stephanie
//      Wunderlich's collage work for Mailchimp: scissor-rough edges on every
//      shape, and on each larger coloured or paper piece a small cast shadow
//      and a paper grain, as if it were cut out and laid on the page
// Each illustration takes the colour of the act its scene sits in (index.html).
//   node scripts/normalize-personas.mjs
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { personas, tokens } from './theme.mjs';

const DIR = new URL('../media/personas/', import.meta.url);
const SRC = new URL('originals/', DIR);
const { acts: ACTS, ramp: RAMP } = tokens();
const PAD = 0.06; // padding around the drawing, as a share of the frame
const CUT_PAPER = new Set(['melody.svg', 'allana.svg', 'sinead.svg', 'rose.svg']); // rolling the finish out one at a time

const NAMED = { black: '#000000', white: '#ffffff' };
const rgb = (hex) => {
	const h = (NAMED[hex] || hex).replace('#', '');
	const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
	return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const toHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const mixWhite = (c, a) => c.map((v) => v * a + 255 * (1 - a));

function step([r, g, b]) {
	const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
	const max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	if (max && (max - min) / max > 0.3 && l > 0.45) return 'accent';
	if (l < 0.3) return 'ink';
	if (l < 0.55) return 'deep';
	if (l < 0.8) return 'soft';
	if (l < 0.95) return 'wash';
	return 'paper';
}
function normalize(src, act, cutPaper) {
	const tint = rgb(ACTS[act]);
	const shade = (name) => toHex(mixWhite(tint, RAMP[name]));

	// 1. average colour of each gradient
	const grads = {};
	for (const [, id, body] of src.matchAll(
		/<(?:linear|radial)Gradient[^>]*id="([^"]+)"[^>]*>(.*?)<\/(?:linear|radial)Gradient>/gs
	)) {
		const stops = [...body.matchAll(/stop-color="([^"]+)"/g)].map((m) => rgb(m[1]));
		grads[id] = stops[0].map((_, i) => stops.reduce((s, c) => s + c[i], 0) / stops.length);
	}

	// every path, with its flattened colour and the extent of its points
	const paths = [...src.matchAll(/<path\b([^>]*?)\/?>/g)].map(([, attrs]) => {
		const fill = attrs.match(/\bfill="([^"]+)"/)?.[1] ?? 'black';
		const url = fill.match(/^url\(#(.+)\)$/);
		let c = url ? grads[url[1]] : rgb(fill);
		const op = attrs.match(/\bfill-opacity="([^"]+)"/);
		if (op) c = mixWhite(c, +op[1]);
		const d = attrs.match(/\bd="([^"]+)"/)[1];
		const nums = d.match(/-?\d*\.?\d+/g).map(Number);
		const xs = nums.filter((_, i) => i % 2 === 0),
			ys = nums.filter((_, i) => i % 2 === 1);
		// rough area (shoelace over every point) against the box's perimeter:
		// low for strokes and slivers, high for pieces of paper
		let area = 0;
		for (let i = 0; i < xs.length; i++)
			area += xs[i] * ys[(i + 1) % ys.length] - xs[(i + 1) % xs.length] * ys[i];
		const box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
		const breadth = Math.abs(area) / 2 / (2 * (box[2] - box[0] + box[3] - box[1]) || 1);
		// light: the originals draw light (screens, beams) in a saturated yellow
		const max = Math.max(...c);
		const light = max > 0 && (max - Math.min(...c)) / max > 0.2;
		// keep an even-odd fill (a logo with holes); everything else is nonzero
		const rule = /\bfill-rule="evenodd"/.test(attrs) ? ' fill-rule="evenodd"' : '';
		return { d, step: step(c), box, breadth, light, rule };
	});

	// 3. the drawing's extent: everything that isn't paper
	const ink = paths.filter((p) => p.step !== 'paper');
	const [x0, y0, x1, y1] = [0, 1, 2, 3].map((i) =>
		(i < 2 ? Math.min : Math.max)(...ink.map((p) => p.box[i]))
	);
	const side = Math.max(x1 - x0, y1 - y0) / (1 - 2 * PAD);
	const vx = (x0 + x1) / 2 - side / 2;
	const vy = y1 + side * PAD - side; // floor sits on the bottom padding

	const vb = [vx, vy, side, side].map((v) => +v.toFixed(2)).join(' ');
	if (!cutPaper) {
		const body = paths.map((p) => `<path fill="${shade(p.step)}"${p.rule} d="${p.d}"/>`).join('');
		return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>\n`;
	}

	// 4. cut paper. The traced line work is mostly the ink sheet showing
	// through the gaps between the lighter pieces laid over it, so each piece
	// is trimmed back a little: the gaps widen into even strips of dark paper.
	// The few thin ink strokes on top are thickened to match. Pieces (broad
	// enough to be a cut shape, not a sliver) cast a shadow and carry a grain;
	// the ink carries a lighter fibre, so the strips read as paper too.
	// Light (a beam, a glow) isn't paper: its larger shapes are grown over
	// the ink instead of trimmed back, so they show no outline. Small light
	// shapes, like the tint in a pair of lenses, stay pieces, or growing them
	// would cover the frames they sit in.
	// Near-white paper (the wash and paper steps, unless it's light) is a
	// sheet: cut like a piece, but clean, with no grain.
	const pale = (p) => !p.light && (p.step === 'wash' || p.step === 'paper');
	// Small, compact details (eyes, nails, a pupil) only get the rough edge:
	// trimming the pieces and thickening the ink would double their outlines
	// and blunt them. Long thin shapes, like lines of text, aren't details.
	const detail = (p) => Math.max(p.box[2] - p.box[0], p.box[3] - p.box[1]) < 0.06 * side;
	const filter = (p) =>
		detail(p)
			? 'edge'
			: p.step === 'ink'
			? 'strip'
			: p.light && p.breadth > 8
				? 'glow'
				: p.breadth > 4
					? pale(p)
						? 'sheet'
						: 'piece'
					: 'edge';
	const body = paths
		.map((p) => `<path fill="${shade(p.step)}"${p.rule} filter="url(#${filter(p)})" d="${p.d}"/>`)
		.join('');
	// The wash: the lighter coloured pieces again, a little out of register,
	// spread and bled, like a watercolour layer printed off the cut paper. Each
	// piece's own area is cut out of it, so only the spill is left, and that is
	// multiplied over whatever it lands on: the page, the white pieces, the face.
	// colour and light spill; near-white paper doesn't, and nor do thin strips
	// or low bands like a floor shadow, which would smear along the ground
	const low = (p) => p.box[3] - p.box[1] < 0.04 * side;
	// nor does light (a beam, a screen): its spill read as a smudge
	const tinted = paths.filter(
		(p) => WASHED.includes(p.step) && !pale(p) && !low(p) && !p.light && p.breadth > 8
	);
	// one light tone for all of it, as a single wash would be: the pieces' own
	// colours would smear dark where the deep ones spill
	const wash = tinted
		.map((p) => `<path fill="${shade(CUT.wash.tone)}"${p.rule} d="${p.d}"/>`)
		.join('');
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"><defs>${cutPaperFilters([vx, vy, side], shade('ink'), [x0, y0, x1, y1])}</defs>${body}<g filter="url(#wash)" style="mix-blend-mode:multiply">${wash}</g></svg>\n`;
}

// Sizes are per mille of the frame, so every illustration gets the same look.
const CUT = {
	strip: 2, // how far pieces are trimmed back, and thin strokes thickened
	rough: 2, // edge wobble: enough to read as cut by hand, not sketched
	shadow: { dx: 0, dy: 0, blur: 10, opacity: 0 },
	grain: { frequency: 5, threshold: -0.9 }, // dark speck on the pieces
	fibre: { frequency: 1, opacity: 0.1 }, // light fibre on the ink
	// line weight, like a brush: a slow, broad wobble that moves the pieces
	// and the ink independently, so each strip swells and thins along its
	// length. scale is how far apart they drift; frequency how often.
	weight: { frequency: 0.01, scale: 5 },
	// the wash that spills from the lighter pieces: dx/dy is how far out of
	// register, spread how far it reaches past the edge, bleed how ragged that
	// edge is, opacity its strength (mottled, like pigment pooling), tone its
	// ramp step
	wash: { dx: -6, dy: -14, spread: 8, bleed: 20, blur: 2, opacity: 0.8, tone: 'soft' },
};
// ramp steps that get a wash. Off for now: every spill so far read as a
// smudge. To bring it back, list the steps, e.g. ['deep', 'accent', 'soft'].
const WASHED = [];

// One region for every shape, in the drawing's own units. The rough edge is
// one noise field for everything, so neighbouring edges wobble together and
// never open a gap. The weight wobble is one field for the pieces and another
// for the ink, so the strips between them vary in width.
function cutPaperFilters([x, y, side], ink, [dx0, dy0, dx1, dy1]) {
	const n = (v) => +v.toFixed(3);
	const u = side / 1000;
	const region = `filterUnits="userSpaceOnUse" x="${n(x - side * 0.05)}" y="${n(y - side * 0.05)}" width="${n(side * 1.1)}" height="${n(side * 1.1)}" color-interpolation-filters="sRGB"`;
	const [r, g, b] = rgb(ink).map((v) => n(v / 255));
	const edge = (
		from,
		layer
	) => `<feTurbulence type="fractalNoise" baseFrequency="${n(CUT.weight.frequency / u)}" numOctaves="1" seed="${layer}" result="drift"/>
<feDisplacementMap in="${from}" in2="drift" scale="${n(CUT.weight.scale * u)}" xChannelSelector="R" yChannelSelector="G" result="drifted"/>
<feTurbulence type="fractalNoise" baseFrequency="${n(0.03 / u)}" numOctaves="2" seed="4" result="warp"/>
<feDisplacementMap in="drifted" in2="warp" scale="${n(CUT.rough * u)}" xChannelSelector="R" yChannelSelector="G" result="cut"/>`;
	const PIECES = 21,
		INK = 37; // noise seeds for the weight wobble
	const shadow = (
		opacity
	) => `<feGaussianBlur in="cut" stdDeviation="${n(CUT.shadow.blur * u)}" result="blur"/>
<feOffset in="blur" dx="${n(CUT.shadow.dx * u)}" dy="${n(CUT.shadow.dy * u)}" result="offset"/>
<feFlood flood-color="${ink}" flood-opacity="${opacity}"/>
<feComposite in2="offset" operator="in" result="shadow"/>`;
	const W = CUT.wash;
	// the wash stays within the drawing: it may spill onto the page inside it,
	// never past its edges
	const within = `filterUnits="userSpaceOnUse" x="${n(dx0)}" y="${n(dy0)}" width="${n(dx1 - dx0)}" height="${n(dy1 - dy0)}" color-interpolation-filters="sRGB"`;
	return `<filter id="wash" ${within}>
<feOffset in="SourceGraphic" dx="${n(W.dx * u)}" dy="${n(W.dy * u)}" result="shifted"/>
<feMorphology in="shifted" operator="dilate" radius="${n(W.spread * u)}" result="spread"/>
<feTurbulence type="fractalNoise" baseFrequency="${n(0.012 / u)}" numOctaves="3" seed="51" result="bleedNoise"/>
<feDisplacementMap in="spread" in2="bleedNoise" scale="${n(W.bleed * u)}" xChannelSelector="R" yChannelSelector="G" result="bled"/>
<feGaussianBlur in="bled" stdDeviation="${n(W.blur * u)}" result="soft"/>
<feTurbulence type="fractalNoise" baseFrequency="${n(0.02 / u)}" numOctaves="2" seed="63" result="pool"/>
<feColorMatrix in="pool" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${n(W.opacity * 1.2)} 0 0 0 ${n(W.opacity * 0.4)}" result="poolAlpha"/>
<feComposite in="soft" in2="poolAlpha" operator="in" result="pooled"/>
<feMorphology in="SourceAlpha" operator="dilate" radius="${n((CUT.strip + 0.6) * u)}" result="covered"/>
<feComposite in="pooled" in2="covered" operator="out"/>
</filter>
<filter id="edge" ${region}>${edge('SourceGraphic', PIECES)}</filter>
${['piece', 'sheet', 'glow']
	.map(
		(id) => `<filter id="${id}" ${region}>
${
	id !== 'glow'
		? `<feMorphology in="SourceGraphic" operator="erode" radius="${n(CUT.strip * u)}" result="trimmed"/>`
		: // thickened and drifted exactly as the ink beneath it, so where only ink
			// lies under its edge the two match and no outline shows; a real line
			// between it and a neighbouring piece survives, as that piece is trimmed
			`<feMorphology in="SourceGraphic" operator="dilate" radius="${n((CUT.strip + 0.6) * u)}" result="trimmed"/>`
}
${edge('trimmed', id === 'glow' ? INK : PIECES)}${id === 'glow' ? '' : shadow(CUT.shadow.opacity)}
${
	id === 'sheet'
		? '' // near-white paper stays clean
		: `<feTurbulence type="fractalNoise" baseFrequency="${n(CUT.grain.frequency / u)}" numOctaves="2" seed="9" result="noise"/>
<feColorMatrix in="noise" type="matrix" values="0 0 0 0 ${r} 0 0 0 0 ${g} 0 0 0 0 ${b} 0.9 0 0 0 ${CUT.grain.threshold}" result="speck"/>
<feComposite in="speck" in2="cut" operator="in" result="grain"/>`
}
<feMerge>${id === 'glow' ? '' : '<feMergeNode in="shadow"/>'}<feMergeNode in="cut"/>${id === 'sheet' ? '' : '<feMergeNode in="grain"/>'}</feMerge>
</filter>`
	)
	.join('')}
<filter id="strip" ${region}>
<feMorphology in="SourceGraphic" operator="dilate" radius="${n(CUT.strip * u)}" result="thick"/>
${edge('thick', INK)}${shadow(CUT.shadow.opacity / 2)}
<feTurbulence type="fractalNoise" baseFrequency="${n(CUT.fibre.frequency / u)}" numOctaves="2" seed="13" result="noise"/>
<feColorMatrix in="noise" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 ${n(CUT.fibre.opacity * 4)} 0 0 0 ${n(-CUT.fibre.opacity * 2)}" result="fibre"/>
<feComposite in="fibre" in2="cut" operator="in" result="texture"/>
<feMerge><feMergeNode in="shadow"/><feMergeNode in="cut"/><feMergeNode in="texture"/></feMerge>
</filter>`.replace(/\n/g, '');
}

// --check: write nothing, exit 1 if any output is out of date
const check = process.argv.includes('--check');
let stale = 0;
for (const { file, act } of personas()) {
	const out = normalize(readFileSync(new URL(file, SRC), 'utf8'), act, CUT_PAPER.has(file));
	if (!check) {
		writeFileSync(new URL(file, DIR), out);
		console.log(`${file} · ${act} ${ACTS[act]}`);
	} else if (!existsSync(new URL(file, DIR)) || readFileSync(new URL(file, DIR), 'utf8') !== out) {
		console.error(`media/personas/${file} is out of date: run node scripts/normalize-personas.mjs`);
		stale++;
	}
}
if (stale) process.exit(1);
