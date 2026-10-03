// The deck shows each finished illustration as a WebP rendered from its SVG,
// not the SVG itself: the cut-paper finish is a stack of SVG filters
// (turbulence, displacement, morphology, blur, a multiply wash) that the
// browser would otherwise run every time it draws the illustration, which
// stalled scrolling. Rendered once here, in headless Chrome (the same
// renderer the deck runs in), at SIZE px square with its transparency.
//
// rendered.json records the hash of the SVG each WebP was made from, so
// `npm run check` can tell a stale WebP without running Chrome.
import { createHash } from 'crypto';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { launch, sleep } from '../cdp/cdp.mjs';

const SIZE = 2048; // the illustration fills a frame's height: room for 2× screens
const QUALITY = 85;
const DIR = new URL('../../media/personas/', import.meta.url);
const MANIFEST = new URL('rendered.json', DIR);

export const hash = (svg) => createHash('sha256').update(svg).digest('hex').slice(0, 16);
const manifest = () => (existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {});
const webp = (file) => new URL(file.replace(/\.svg$/, '.webp'), DIR);

// Whether <file>'s WebP was rendered from this SVG text.
export function isCurrent(file, svg) {
	return existsSync(webp(file)) && manifest()[file] === hash(svg);
}

// Renders the WebP for each { file, svg } that isn't current.
export async function render(items) {
	const todo = items.filter(({ file, svg }) => !isCurrent(file, svg));
	if (!todo.length) return;
	const b = await launch({ width: SIZE, height: SIZE, port: 9399 });
	await b.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
	const done = manifest();
	for (const { file, svg } of todo) {
		await b.goto(new URL(file, DIR).href);
		await b.eval(`(() => { const s = document.documentElement; s.setAttribute('width', ${SIZE}); s.setAttribute('height', ${SIZE}); })()`);
		await sleep(500);
		const { data } = await b.send('Page.captureScreenshot', { format: 'webp', quality: QUALITY, clip: { x: 0, y: 0, width: SIZE, height: SIZE, scale: 1 } });
		writeFileSync(webp(file), Buffer.from(data, 'base64'));
		done[file] = hash(svg);
		console.log(`${file.replace(/\.svg$/, '.webp')} · rendered`);
	}
	writeFileSync(MANIFEST, `${JSON.stringify(Object.fromEntries(Object.entries(done).sort()), null, '\t')}\n`);
	await b.close();
}
