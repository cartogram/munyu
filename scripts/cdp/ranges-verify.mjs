// Tall-scene free ranges: ↓/↑ page through them, snap leaves them alone.
import { launch, sleep } from './cdp.mjs';
import { settle } from './kbd.mjs';
const W = +(process.env.W || 1024), H = +(process.env.H || 420);
const b = await launch({ width: W, height: H });
await b.goto('http://localhost:8123/index.html');
const ranges = await b.eval(`window.__deck.freeRanges().map(r => ({ act: r.trigger.trigger.dataset.act, from: Math.round(r.trigger.start + r.from), to: Math.round(r.trigger.start + r.to) }))`);
console.log(ranges.length, 'ranges', JSON.stringify(ranges.slice(0, 6)));
const key = async (k) => { const c = { ArrowDown: 40, ArrowUp: 38 }[k]; for (const type of ['rawKeyDown', 'keyUp']) await b.send('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: c, nativeVirtualKeyCode: c }); };
let fails = 0;
const check = (n, ok, d) => { if (!ok) fails++; console.log(ok ? 'PASS' : 'FAIL', n, d); };
const r = ranges.reduce((a, x) => (x.to - x.from > a.to - a.from ? x : a));
console.log('longest', JSON.stringify(r));
await b.eval(`window.scrollTo(0, ${r.from})`); await sleep(500);
const seq = [];
for (let i = 0; i < 20; i++) { await key('ArrowDown'); const y = Math.round(await settle(b)); seq.push(y); if (y >= r.to) break; }
const expect = []; for (let y = r.from + H; y < r.to; y += H) expect.push(y); expect.push(r.to);
check('↓ pages through range by one viewport', JSON.stringify(seq) === JSON.stringify(expect), `got ${seq} want ${expect}`);
await key('ArrowUp'); const up = Math.round(await settle(b));
check('↑ pages back by one viewport', up === Math.max(r.to - H, r.from), `y=${up}`);
// Snap leaves a resting position inside the range alone.
const mid = Math.round((r.from + r.to) / 2);
await b.eval(`window.scrollTo(0, ${mid - 120})`); await sleep(400);
for (let i = 0; i < 2; i++) { await b.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 300, y: 200, deltaX: 0, deltaY: 60 }); await sleep(16); }
await sleep(1500);
const rest = await b.eval('Math.round(scrollY)');
check('snap does not move a rest inside the range', rest > r.from && rest < r.to && Math.abs(rest - mid) < 40, `y=${rest}`);
await b.shot('ranges-mid');
console.log('errors', JSON.stringify(b.errors), fails ? 'SOME FAILED' : 'ALL PASS');
process.exit(0);
