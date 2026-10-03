// List an SVG's paths, split into contours, with fill and bounding box.
//   node scripts/personas/tools/inspect.mjs <file.svg> [minSize] [x0,y0,x1,y1]
// minSize hides contours smaller than that in both directions; the box keeps
// only contours inside it. Index "12.3" is path 12, contour 3 (its 3rd "M").
import { readFileSync } from 'fs';
const [file, minSize = 0, within] = process.argv.slice(2);
const src = readFileSync(file, 'utf8');
const box = within?.split(',').map(Number);
const grads = {};
for (const [, id, body] of src.matchAll(/<(?:linear|radial)Gradient[^>]*id="([^"]+)"[^>]*>(.*?)<\/(?:linear|radial)Gradient>/gs))
	grads[id] = [...body.matchAll(/stop-color="([^"]+)"/g)].map((m) => m[1]).join('→');
[...src.matchAll(/<path\b([^>]*?)\/?>/g)].forEach(([, a], i) => {
	const fill = a.match(/\bfill="([^"]+)"/)?.[1] ?? 'black';
	const shown = fill.startsWith('url') ? grads[fill.match(/#([^)]+)/)[1]] : fill;
	const d = a.match(/\bd="([^"]+)"/)?.[1];
	if (!d) return;
	const subs = d.split(/(?=M)/);
	subs.forEach((s, j) => {
		const n = (s.match(/-?\d*\.?\d+/g) || []).map(Number);
		const xs = n.filter((_, k) => k % 2 === 0), ys = n.filter((_, k) => k % 2 === 1);
		const b = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(Math.round);
		if (b[2] - b[0] < +minSize && b[3] - b[1] < +minSize) return;
		if (box && !(b[0] >= box[0] && b[1] >= box[1] && b[2] <= box[2] && b[3] <= box[3])) return;
		console.log(`${i}.${j}`, shown, b.join(','), `(${subs.length} contours)`);
	});
});
