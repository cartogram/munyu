// Bring the traced persona illustrations (media/personas/originals/) into one
// consistent set, written to media/personas/:
//   1. flatten gradients to their average colour, and fill-opacity against white
//   2. snap every colour to one shared ramp of the act colour, by lightness;
//      saturated colours (the yellow screens and light beams) become the accent
//   3. crop each to its drawing with the same padding, on a shared square frame
//      with the floor along the bottom, so the figures sit at a common scale
//   node scripts/normalize-personas.mjs [#hex]
import { readdirSync, readFileSync, writeFileSync } from 'fs';

const DIR = new URL('../media/personas/', import.meta.url);
const SRC = new URL('originals/', DIR);
const TINT = process.argv[2] || '#6e396a'; // the user-research act colour

// Shared ramp: how far each step is mixed towards white.
const RAMP = { ink: 0, deep: 0.3, accent: 0.5, soft: 0.72, wash: 0.9, paper: 1 };
const PAD = 0.06; // padding around the drawing, as a share of the frame

const NAMED = { black: '#000000', white: '#ffffff' };
const rgb = (hex) => {
	const h = (NAMED[hex] || hex).replace('#', '');
	const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
	return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const toHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const tint = rgb(TINT);
const mixWhite = (c, a) => c.map((v) => v * a + 255 * (1 - a));

function step([r, g, b]) {
	const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	if (max && (max - min) / max > 0.3 && l > 0.45) return 'accent';
	if (l < 0.3) return 'ink';
	if (l < 0.55) return 'deep';
	if (l < 0.8) return 'soft';
	if (l < 0.95) return 'wash';
	return 'paper';
}
const shade = (name) => toHex(tint.map((c) => c + (255 - c) * RAMP[name]));

function normalize(src) {
	// 1. average colour of each gradient
	const grads = {};
	for (const [, id, body] of src.matchAll(/<(?:linear|radial)Gradient[^>]*id="([^"]+)"[^>]*>(.*?)<\/(?:linear|radial)Gradient>/gs)) {
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
		const xs = nums.filter((_, i) => i % 2 === 0), ys = nums.filter((_, i) => i % 2 === 1);
		return { d, step: step(c), box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
	});

	// 3. the drawing's extent: everything that isn't paper
	const ink = paths.filter((p) => p.step !== 'paper');
	const [x0, y0, x1, y1] = [0, 1, 2, 3].map((i) => (i < 2 ? Math.min : Math.max)(...ink.map((p) => p.box[i])));
	const side = Math.max(x1 - x0, y1 - y0) / (1 - 2 * PAD);
	const vx = (x0 + x1) / 2 - side / 2;
	const vy = y1 + side * PAD - side; // floor sits on the bottom padding

	const body = paths.map((p) => `<path fill="${shade(p.step)}" d="${p.d}"/>`).join('');
	const vb = [vx, vy, side, side].map((v) => +v.toFixed(2)).join(' ');
	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>\n`;
}

for (const file of readdirSync(SRC).filter((f) => f.endsWith('.svg'))) {
	writeFileSync(new URL(file, DIR), normalize(readFileSync(new URL(file, SRC), 'utf8')));
	console.log(file);
}
