// A zoomed close-up of an SVG with a coordinate grid, for placing shapes.
//   node scripts/personas/tools/crop.mjs <file.svg> <out.png> <x,y,w,h> [step]
// x,y,w,h is in the SVG's own units; step is the grid spacing (red every 5th).
// The PNG is 1200 px wide, as tall as the box's proportions need.
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { launch, sleep } from '../../cdp/cdp.mjs';
const [file, out, box, step = 10] = process.argv.slice(2);
const [x0, y0, w, h] = box.split(',').map(Number);
const W = 1200, H = Math.round((W * h) / w);
const fs = w / 60;
let grid = '';
for (let v = Math.ceil(x0 / step) * step; v <= x0 + w; v += +step) {
	const major = !(Math.round(v / step) % 5);
	grid += `<line x1="${v}" y1="${y0}" x2="${v}" y2="${y0 + h}" stroke="${major ? '#f00a' : '#0bf8'}" stroke-width="${w / 1500}"/>`;
	if (major) grid += `<text x="${v + fs / 6}" y="${y0 + fs}" font-size="${fs}" fill="red">${v}</text>`;
}
for (let v = Math.ceil(y0 / step) * step; v <= y0 + h; v += +step) {
	const major = !(Math.round(v / step) % 5);
	grid += `<line x1="${x0}" y1="${v}" x2="${x0 + w}" y2="${v}" stroke="${major ? '#f00a' : '#0bf8'}" stroke-width="${w / 1500}"/>`;
	if (major) grid += `<text x="${x0 + fs / 6}" y="${v - fs / 6}" font-size="${fs}" fill="red">${v}</text>`;
}
const page = `<body style="margin:0;background:#fff"><svg width="${W}" height="${H}" viewBox="${x0} ${y0} ${w} ${h}"><image href="file://${resolve(file)}" x="0" y="0" width="1024" height="1024"/>${grid}</svg></body>`;
const b = await launch({ width: W, height: H, port: 9382 });
const html = join(mkdtempSync(join(tmpdir(), 'crop-')), 'page.html');
writeFileSync(html, page);
await b.goto(`file://${html}`);
await sleep(600);
const { data } = await b.send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(data, 'base64'));
await b.close();
process.exit(0);
