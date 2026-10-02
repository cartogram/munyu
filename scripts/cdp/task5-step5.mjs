import { launch } from './cdp.mjs';
import { exposeST, actTriggers } from './st.mjs';

const b = await launch();
await b.goto('http://localhost:8123/index.html');
await exposeST(b);
const acts = await b.eval(actTriggers);

// Visible text blocks: inside viewport, effective opacity (product over ancestors) > 0.05.
const visibleText = `(() => {
	const eff = (el) => { let o = 1; for (; el && el !== document.body; el = el.parentElement) o *= +getComputedStyle(el).opacity; return o; };
	return [...document.querySelectorAll('main h2, main p, main li, main blockquote, main img, main video, main svg')].filter((el) => {
		if (el.closest('aside.notes')) return false;
		const r = el.getBoundingClientRect();
		return r.bottom > 0 && r.top < innerHeight && r.height > 0 && eff(el) > 0.05;
	}).length;
})()`;

// --- Blank-screen scan across the whole page
const maxY = await b.eval('document.documentElement.scrollHeight - innerHeight');
const blanks = [];
let run = null;
for (let y = 0; y <= maxY; y += 100) {
	await b.scrollTo(y, 120);
	const n = await b.eval(visibleText);
	if (n === 0) { if (!run) run = [y, y]; else run[1] = y; }
	else if (run) { blanks.push(run); run = null; }
}
if (run) blanks.push(run);
const actAt = (y) => acts.find((a) => y >= a.start && y <= a.end)?.act || '(outside recede)';
console.log(`blank-screen ranges (step 100px, maxY ${maxY}):`);
blanks.forEach(([a, z]) => console.log(`   ${a}..${z} (${z - a + 100}px) in recede of ${actAt(a)}`));
console.log('total blank px ~', blanks.reduce((s, [a, z]) => s + z - a + 100, 0));

// --- Nested pin 1: Today's model
const tm = await b.eval(`(() => { const t = __ST.getAll().find((t) => t.trigger?.dataset?.scene === 'todays-model' && t.pin); return { start: Math.round(t.start), end: Math.round(t.end) }; })()`);
const pieces = `(() => { const s = document.querySelector('[data-scene="todays-model"]'); const ps = [...s.querySelectorAll('.diagram-piece')]; return { n: ps.length, visible: ps.filter((p) => +getComputedStyle(p).opacity > 0.95).length, sceneTop: Math.round(s.getBoundingClientRect().top), pos: getComputedStyle(s).position }; })()`;
console.log(`\ntodays-model pin ${tm.start}..${tm.end}; limits act recede ${acts[2].start}..${acts[2].end}`);
for (const [label, y, wait] of [['pre', tm.start - 100, 800], ['entered', tm.start + 50, 1800], ['mid', tm.start + 300, 800], ['released', tm.end + 100, 800]]) {
	await b.scrollTo(y, wait);
	console.log(`   ${label} y=${y}`, JSON.stringify(await b.eval(pieces)), 'visibleText', await b.eval(visibleText));
	await b.shot(`task5-tm-${label}`);
}
for (const f of [0.1, 0.3, 0.6, 0.9]) {
	const y = Math.round(acts[2].start + (acts[2].end - acts[2].start) * f);
	await b.scrollTo(y, 800);
	console.log(`   limits recede ${f * 100}% y=${y}`, JSON.stringify(await b.eval(pieces)), 'visibleText', await b.eval(visibleText));
	await b.shot(`task5-limits-recede-${f * 100}`);
}

// --- Nested pin 2: Demo scrub
const dm = await b.eval(`(() => { const t = __ST.getAll().find((t) => t.trigger?.dataset?.scene === 'demo-two-people' && t.pin); return { start: Math.round(t.start), end: Math.round(t.end) }; })()`);
const panels = `(() => { const s = document.querySelector('[data-scene="demo-two-people"]'); const [a, c] = [s.querySelector('.demo-panel-a'), s.querySelector('.demo-panel-b')]; const x = (el) => getComputedStyle(el).transform; return { a: x(a), b: x(c), sceneTop: Math.round(s.getBoundingClientRect().top), pos: getComputedStyle(s).position }; })()`;
console.log(`\ndemo pin ${dm.start}..${dm.end}; personalization act recede ${acts[3].start}..${acts[3].end}`);
for (const f of [-0.2, 0, 0.5, 1, 1.2]) {
	const y = Math.round(dm.start + (dm.end - dm.start) * f);
	await b.scrollTo(y, 900);
	console.log(`   demo ${f * 100}% y=${y}`, JSON.stringify(await b.eval(panels)), 'visibleText', await b.eval(visibleText));
	await b.shot(`task5-demo-${f * 100}`);
}
for (const f of [0.1, 0.3, 0.6, 0.9]) {
	const y = Math.round(acts[3].start + (acts[3].end - acts[3].start) * f);
	await b.scrollTo(y, 800);
	console.log(`   personalization recede ${f * 100}% y=${y}`, 'visibleText', await b.eval(visibleText));
	await b.shot(`task5-pers-recede-${f * 100}`);
}
console.log('errors:', b.errors.length ? b.errors : 'none');
await b.close();
