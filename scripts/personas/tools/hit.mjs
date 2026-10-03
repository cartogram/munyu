// Which paths' fills contain each point? An empty list is a hole: the page
// (or whatever is under the drawing) shows through there.
//   node scripts/personas/tools/hit.mjs <file.svg> x,y [x,y …]
import { readFileSync } from 'fs';
import { launch, sleep } from '../../cdp/cdp.mjs';
const [file, ...pts] = process.argv.slice(2);
const svg = readFileSync(file, 'utf8').replace(/<\?xml[^>]*>/, '');
const b = await launch({ width: 800, height: 600, port: 9381 });
await b.goto('about:blank');
await b.eval(`document.body.innerHTML = ${JSON.stringify(svg)}`);
await sleep(200);
const out = await b.eval(`(() => {
	const svg = document.querySelector('svg');
	const paths = [...svg.querySelectorAll('path')];
	return JSON.stringify(${JSON.stringify(pts)}.map((s) => {
		const [x, y] = s.split(',').map(Number);
		const p = svg.createSVGPoint(); p.x = x; p.y = y;
		return [s, paths.map((el, i) => (el.isPointInFill(p) ? i + ':' + (el.getAttribute('fill') || '') : null)).filter(Boolean)];
	}));
})()`);
for (const [p, hits] of JSON.parse(out)) console.log(p, hits.length ? hits.join(' ') : '(hole)');
await b.close();
process.exit(0);
