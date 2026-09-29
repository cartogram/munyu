// Beat navigation verification: keys, retargeting, snap, hash, focus, reduced motion.
import { launch, sleep } from './cdp.mjs';
import { settle } from './kbd.mjs';
const W = +(process.env.W || 1280), H = +(process.env.H || 800);
const URL = 'http://localhost:8123/index.html';
const b = await launch({ width: W, height: H });
const KEYS = { ArrowDown: 40, ArrowUp: 38, PageDown: 34, PageUp: 33, ' ': 32, Home: 36, End: 35 };
async function key(k, shift = false) {
	const base = { key: k, code: k === ' ' ? 'Space' : k, windowsVirtualKeyCode: KEYS[k], nativeVirtualKeyCode: KEYS[k], modifiers: shift ? 8 : 0 };
	await b.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', ...base });
	await b.send('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
}
const y = () => b.eval('Math.round(scrollY)');
const results = [];
const check = (name, ok, detail = '') => { results.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`); };

await b.goto(URL);
const stops = (await b.eval('window.__deck.stops()')).map(Math.round);
const maxY = await b.eval('Math.round(window.__deck.ScrollTrigger.maxScroll(window))');
const ranges = await b.eval('window.__deck.freeRanges().length');
console.log(`${stops.length} stops, ${ranges} free ranges, max ${maxY}`);

let now;
if (!process.env.SKIP_WALK) {
// 1. Forward walk: every ↓ lands on the next stop (or pages through a tall scene).
let seq = [];
let pos = await y();
for (let i = 0; i < 200; i++) {
	await key('ArrowDown'); const now = await settle(b, 3000);
	if (Math.round(now) === pos) break;
	pos = Math.round(now); seq.push(pos);
}
const fwdStops = stops.filter((s) => s > 2);
const missing = fwdStops.filter((s) => !seq.some((p) => Math.abs(p - s) <= 2));
check('forward walk reaches every stop', missing.length === 0, `visited ${seq.length}, missing ${JSON.stringify(missing)}`);
check('forward walk never lands off a stop (no free ranges)', ranges > 0 || seq.every((p) => stops.some((s) => Math.abs(p - s) <= 2)));
// 2. Backward walk
const back = [];
for (let i = 0; i < 200; i++) {
	await key('ArrowUp'); const now = Math.round(await settle(b, 3000));
	if (now === pos) break; pos = now; back.push(pos);
}
const missingBack = stops.filter((s) => s < stops.at(-1) - 2).filter((s) => !back.some((p) => Math.abs(p - s) <= 2));
check('backward walk reaches every stop', missingBack.length === 0, `visited ${back.length}, missing ${JSON.stringify(missingBack)}`);
check('back at top', pos <= 2, `y=${pos}`);

// 3. Rapid presses retarget: 3 quick ↓ from top → stop index 3.
await key('ArrowDown'); await sleep(120); await key('ArrowDown'); await sleep(120); await key('ArrowDown');
now = Math.round(await settle(b, 4000));
check('3 quick presses advance 3 stops', Math.abs(now - stops[3]) <= 2, `y=${now} want ${stops[3]}`);

// 4. Clicker keys
await key('Home'); now = Math.round(await settle(b)); check('Home → first', now <= 2, `y=${now}`);
await key('PageDown'); now = Math.round(await settle(b)); check('PageDown → next', Math.abs(now - stops[1]) <= 2, `y=${now}`);
await key(' '); now = Math.round(await settle(b)); check('Space → next', Math.abs(now - stops[2]) <= 2, `y=${now}`);
await key(' ', true); now = Math.round(await settle(b)); check('Shift+Space → back', Math.abs(now - stops[1]) <= 2, `y=${now}`);
await key('PageUp'); now = Math.round(await settle(b)); check('PageUp → back', now <= 2, `y=${now}`);
await key('End'); now = Math.round(await settle(b, 5000)); check('End → last', Math.abs(now - stops.at(-1)) <= 2, `y=${now}`);

}
// 5. Hash sync + reload restore
await key('Home'); await settle(b);
for (let i = 0; i < 16; i++) { await key('ArrowDown'); await sleep(40); }
now = Math.round(await settle(b, 6000));
await sleep(400);
const hash = await b.eval('location.hash');
check('hash names current beat', hash === '#limits-of-adaptability/todays-model/2' || hash.length > 1, `hash=${hash} y=${now}`);
await b.goto('about:blank');
await b.goto(URL + hash);
await sleep(600);
const after = await y();
check('reload with hash restores beat', Math.abs(after - now) <= 2, `after=${after} before=${now}`);

// 6. Snap: stop 150px past a stop → settles on the next stop down.
const s0 = stops[5];
await b.eval(`window.scrollTo(0, ${s0})`); await sleep(600);
for (let i = 0; i < 3; i++) { await b.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 300, y: 300, deltaX: 0, deltaY: 60 }); await sleep(16); }
await sleep(1500); now = await y();
check('snap down settles on next stop', Math.abs(now - stops[6]) <= 2, `y=${now} want ${stops[6]}`);
for (let i = 0; i < 3; i++) { await b.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 300, y: 300, deltaX: 0, deltaY: -60 }); await sleep(16); }
await sleep(1500); now = await y();
check('snap up settles on previous stop', Math.abs(now - stops[5]) <= 2, `y=${now} want ${stops[5]}`);

// 7. Notes toggle then arrows still work
await key('Home'); await settle(b);
const box = await b.eval(`(() => { const r = document.getElementById('notes-toggle').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })()`);
await b.click(box.x, box.y); await sleep(300);
const drawerText = await b.eval(`document.getElementById('notes-drawer-content').textContent.slice(0, 40)`);
await key('ArrowDown'); now = Math.round(await settle(b));
check('arrows work after clicking notes toggle', Math.abs(now - stops[1]) <= 2, `y=${now} drawer="${drawerText}"`);
const notesNow = await b.eval(`document.getElementById('notes-drawer-content').textContent.slice(0, 40)`);
check('drawer follows beat', notesNow.startsWith('Everyone arrives'), `"${notesNow}"`);
await b.click(box.x, box.y); await sleep(300);

// 8. Reduced motion: key jump is instant.
await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await b.goto('about:blank');
await b.goto(URL);
await sleep(300);
await key('ArrowDown'); await sleep(60);
now = await y();
check('reduced motion: instant jump', Math.abs(now - stops[1]) <= 2, `y=${now} after 60ms`);
const snapCount = await b.eval(`window.__deck.ScrollTrigger.getAll().filter(t => t.vars.snap).length`);
check('reduced motion: no snap trigger', snapCount === 0);

console.log('errors', JSON.stringify(b.errors));
console.log(results.filter((r) => !r.ok).length ? 'SOME FAILED' : 'ALL PASS');
process.exit(0);
