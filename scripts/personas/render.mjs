// The deck shows each finished illustration as a WebP rendered from its SVG,
// not the SVG itself: the cut-paper finish is a stack of SVG filters
// (turbulence, displacement, morphology, blur, a multiply wash) that the
// browser would otherwise run every time it draws the illustration, which
// stalled scrolling. Rendered once here, in headless Chrome (the same
// renderer the deck runs in), at SIZE px square with its transparency.
//
// Smaller copies (<name>-768.webp, <name>-1280.webp) are scaled down from it
// for index.html's srcset, so a phone decodes a fraction of the pixels: a
// 2048px square takes 16MB of memory once drawn.
//
// rendered.json records the hash of the SVG each WebP was made from, so
// `npm run check` can tell a stale WebP without running Chrome.
import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { launch, sleep } from '../cdp/cdp.mjs';

const SIZE = 2048; // the illustration fills a frame's height: room for 2× screens
const QUALITY = 85;
export const WIDTHS = [768, 1280]; // the smaller copies, beside the SIZE original
const DIR = new URL('../../media/personas/', import.meta.url);
const MANIFEST = new URL('rendered.json', DIR);

export const hash = (svg) => createHash('sha256').update(svg).digest('hex').slice(0, 16);
const manifest = () => (existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {});
const webp = (file, width) => new URL(file.replace(/\.svg$/, width ? `-${width}.webp` : '.webp'), DIR);

// Whether <file>'s WebPs were rendered from this SVG text.
export function isCurrent(file, svg) {
	return [undefined, ...WIDTHS].every((width) => existsSync(webp(file, width))) && manifest()[file] === hash(svg);
}

// Renders the WebP for each { file, svg } that isn't current, then makes any
// smaller copies that are missing or older than their original.
export async function render(items) {
	const done = manifest();
	const stale = items.filter(({ file, svg }) => !existsSync(webp(file)) || done[file] !== hash(svg));
	const copy = items.filter((item) => stale.includes(item) || WIDTHS.some((width) => !existsSync(webp(item.file, width))));
	if (!copy.length) return;
	const b = await launch({ width: SIZE, height: SIZE, port: 9399 });
	await b.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
	for (const { file, svg } of stale) {
		await b.goto(new URL(file, DIR).href);
		await b.eval(`(() => { const s = document.documentElement; s.setAttribute('width', ${SIZE}); s.setAttribute('height', ${SIZE}); })()`);
		await sleep(500);
		const { data } = await b.send('Page.captureScreenshot', { format: 'webp', quality: QUALITY, clip: { x: 0, y: 0, width: SIZE, height: SIZE, scale: 1 } });
		writeFileSync(webp(file), Buffer.from(data, 'base64'));
		done[file] = hash(svg);
		console.log(`${file.replace(/\.svg$/, '.webp')} · rendered`);
	}
	// each smaller copy, drawn down from the original on a canvas, in an HTML
	// page (the SVG documents above can't make one)
	await b.goto('about:blank');
	for (const { file } of copy) {
		const original = readFileSync(webp(file)).toString('base64');
		for (const width of WIDTHS) {
			const small = await b.eval(`new Promise((resolve, reject) => {
				const img = new Image();
				img.onerror = reject;
				img.onload = () => {
					const canvas = document.createElement('canvas');
					canvas.width = canvas.height = ${width};
					const ctx = canvas.getContext('2d');
					ctx.imageSmoothingQuality = 'high';
					ctx.drawImage(img, 0, 0, ${width}, ${width});
					resolve(canvas.toDataURL('image/webp', ${QUALITY / 100}).split(',')[1]);
				};
				img.src = 'data:image/webp;base64,${original}';
			})`);
			writeFileSync(webp(file, width), Buffer.from(small, 'base64'));
		}
		console.log(`${file.replace(/\.svg$/, '.webp')} · ${WIDTHS.join('px, ')}px copies`);
	}
	writeFileSync(MANIFEST, `${JSON.stringify(Object.fromEntries(Object.entries(done).sort()), null, '\t')}\n`);
	await b.close();
}
