// Screenshot every beat, then tile into contact sheets with ffmpeg.
import { launch, SHOTS } from './cdp.mjs';
import { execSync } from 'child_process';
const W = +(process.env.W || 1280), H = +(process.env.H || 800), tag = process.env.TAG || `${W}`;
const b = await launch({ width: W, height: H });
await b.goto('http://localhost:8123/index.html');
const beats = await b.eval(`window.__deck.beats().map(x => ({ id: x.id, pos: Math.round(x.trigger.start + x.time) }))`);
execSync(`rm -f ${SHOTS}beat-${tag}-*.png`);
let i = 0;
for (const x of beats) {
	await b.scrollTo(x.pos, 250);
	await b.shot(`beat-${tag}-${String(i++).padStart(3, '0')}`);
}
execSync(`cd ${SHOTS} && ffmpeg -loglevel error -y -pattern_type glob -i 'beat-${tag}-*.png' -vf "scale=640:-1,tile=4x3:padding=6:color=gray" sheet-${tag}-%02d.png`);
console.log(beats.map((x, k) => `${k} ${x.id}`).join('\n'));
process.exit(0);
