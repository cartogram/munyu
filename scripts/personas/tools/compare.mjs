// The trace beside the finished illustration, for a before-and-after look.
//   node scripts/personas/tools/compare.mjs <name> <out.png>
// (name as in media/personas/<name>.svg)
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { launch, sleep } from '../../cdp/cdp.mjs';
const [name, out] = process.argv.slice(2);
const dir = new URL('../../../media/personas/', import.meta.url).pathname;
const page = `<body style="margin:0;display:flex;background:#fff"><img src="file://${dir}traces/${name}.svg" width="800" height="800"><img src="file://${dir}${name}.svg" width="800" height="800"></body>`;
const html = join(mkdtempSync(join(tmpdir(), 'compare-')), 'page.html');
writeFileSync(html, page);
const b = await launch({ width: 1600, height: 800, port: 9383 });
await b.goto(`file://${html}`);
await sleep(800);
const { data } = await b.send('Page.captureScreenshot', { format: 'png' });
writeFileSync(out, Buffer.from(data, 'base64'));
await b.close();
process.exit(0);
