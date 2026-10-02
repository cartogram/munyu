import { launch, sleep } from './cdp.mjs';
import { settle, nearest, press } from './kbd.mjs';

const b = await launch();
await b.goto('http://localhost:8123/index.html');
const n = await b.eval(`document.querySelectorAll('main section[data-scene]').length`);

const N = 12;
console.log(`--- 1-4: step down ${N}, up ${N}`);
console.log('start', JSON.stringify(await b.eval(nearest)));
let bad = 0;
for (let i = 1; i <= N; i++) {
	const r = await press(b, 'ArrowDown');
	const ok = r.idx === i - 1 && Math.abs(r.top) <= 1;
	if (!ok) bad++;
	console.log(`down#${i} expect ${i - 1}`, JSON.stringify(r), ok ? 'ok' : 'MISMATCH');
}
for (let i = 1; i <= N; i++) {
	const r = await press(b, 'ArrowUp');
	const ok = r.idx === Math.max(N - 1 - i, 0) && Math.abs(r.top) <= 1;
	if (!ok) bad++;
	console.log(`up#${i} expect ${Math.max(N - 1 - i, 0)}`, JSON.stringify(r), ok ? 'ok' : 'MISMATCH');
}
console.log(bad ? `${bad} MISMATCHES` : 'ALL STEPS OK');

console.log('--- 5: ArrowUp at top');
await b.scrollTo(0); await settle(b);
const top = await press(b, 'ArrowUp');
console.log(JSON.stringify(top), top.y === 0 ? 'ok (stayed at 0)' : 'MOVED');

console.log('--- 6: ArrowDown at last scene');
await b.eval(`document.querySelectorAll('main section[data-scene]')[${n - 1}].scrollIntoView({block: 'start'})`);
const before = await settle(b);
const last = await press(b, 'ArrowDown');
console.log(`before y=${before}`, JSON.stringify(last), last.y === before ? 'ok (stayed)' : 'MOVED');

console.log('--- focus guard: video');
await b.eval(`document.querySelector('[data-scene="ai-accessibility-today"]').scrollIntoView({block: 'start'})`);
await settle(b);
await b.eval(`document.querySelector('[data-scene="ai-accessibility-today"] video').focus()`);
const vBefore = await b.eval(`({ y: Math.round(scrollY), active: document.activeElement.tagName })`);
const vAfter = await press(b, 'ArrowDown');
console.log('active', vBefore.active, `before y=${vBefore.y}`, JSON.stringify(vAfter), vAfter.y === vBefore.y ? 'ok (suppressed)' : 'SCROLLED');

console.log('--- focus guard: notes drawer');
const toggle = await b.eval(`(() => { const r = document.getElementById('notes-toggle').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
await b.click(...toggle);
await sleep(400);
const drawer = await b.eval(`({ open: document.getElementById('notes-drawer').classList.contains('is-open'), focusable: document.querySelectorAll('#notes-drawer a, #notes-drawer button, #notes-drawer input, #notes-drawer [tabindex]').length, active: document.activeElement.tagName + '#' + document.activeElement.id })`);
console.log('drawer', JSON.stringify(drawer));
const tBefore = await b.eval('Math.round(scrollY)');
const tAfter = await press(b, 'ArrowDown');
console.log(`toggle focused: before y=${tBefore}`, JSON.stringify(tAfter), tAfter.y === tBefore ? 'ok (suppressed: BUTTON focused)' : 'SCROLLED');

console.log('--- guard releases after clicking neutral area');
await b.click(640, 400);
await sleep(200);
const act = await b.eval(`document.activeElement.tagName`);
const rBefore = await b.eval('Math.round(scrollY)');
const rAfter = await press(b, 'ArrowDown');
console.log(`active=${act} before y=${rBefore}`, JSON.stringify(rAfter), rAfter.y !== rBefore ? 'ok (resumed)' : 'STUCK');

console.log('errors:', b.errors.length ? b.errors : 'none');
await b.close();
