// Recolour the persona illustrations into shades of one hue: each colour keeps
// its lightness, so black becomes the full act colour and white stays white.
//   node scripts/tint-personas.mjs [#hex]
import { readdirSync, readFileSync, writeFileSync } from 'fs';

const DIR = new URL('../media/personas/', import.meta.url);
const SRC = new URL('originals/', DIR);
const TINT = process.argv[2] || '#6e396a'; // the user-research act colour

const NAMED = { black: '#000000', white: '#ffffff' };
const rgb = (hex) => {
	const h = (NAMED[hex] || hex).replace('#', '');
	const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
	return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
};
const toHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
const tint = rgb(TINT);

// Perceived lightness 0..1, then a little gamma so mid-tones read as purple rather than wash out.
// Saturated colours (the yellow screens and light beams) are the accent of each scene: they
// would otherwise come out as a pale wash, so they get a fixed mid tint instead.
function shade(hex) {
	const [r, g, b] = rgb(hex);
	const l = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
	const max = Math.max(r, g, b), min = Math.min(r, g, b);
	const sat = max ? (max - min) / max : 0;
	const t = sat > 0.3 && l > 0.45 ? 0.45 + 0.35 * (l - 0.45) : Math.pow(l, 1.6);
	return toHex(tint.map((c) => c + (255 - c) * t));
}

for (const file of readdirSync(SRC).filter((f) => f.endsWith('.svg'))) {
	const svg = readFileSync(new URL(file, SRC), 'utf8')
		.replace(
			/((?:fill|stroke|stop-color)\s*[=:]\s*["']?)(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|black|white)\b/g,
			(_, attr, hex) => attr + shade(hex),
		)
		// paths with no fill default to black
		.replace(/<path(?![^>]*\bfill=)/g, `<path fill="${shade('#000000')}"`);
	writeFileSync(new URL(file, DIR), svg);
	console.log(file);
}
