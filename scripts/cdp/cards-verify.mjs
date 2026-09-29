// Pen-card verification: triggers, beats, blank scan, slide-over shots.
import { launch } from './cdp.mjs';
const W = +(process.env.W || 1280), H = +(process.env.H || 800);
const b = await launch({ width: W, height: H });
await b.goto('http://localhost:8123/index.html');
await new Promise((r) => setTimeout(r, 800));
const tag = process.env.TAG || `${W}`;

const info = await b.eval(`(() => {
	const d = window.__deck;
	const trig = d.ScrollTrigger.getAll().filter(t => t.pin).map(t => ({ act: t.trigger.dataset.act, start: Math.round(t.start), end: Math.round(t.end), innerH: t.trigger.querySelector('.act-panel-inner').offsetHeight, mb: t.trigger.style.marginBottom }));
	const beats = d.beats().map(x => ({ id: x.id, pos: Math.round(x.trigger.start + x.time) }));
	const ranges = d.freeRanges().map(r => ({ act: r.trigger.trigger.dataset.act, from: Math.round(r.trigger.start + r.from), to: Math.round(r.trigger.start + r.to) }));
	return { trig, beats, ranges, max: document.documentElement.scrollHeight - innerHeight };
})()`);
console.log('page max scroll', info.max);
console.table(info.trig);
console.log('beats', info.beats.length, 'free ranges', JSON.stringify(info.ranges));

// Topmost visible text at viewport sample points (occlusion-aware via elementFromPoint).
const probe = `(() => {
	const hits = new Set();
	for (let y = 20; y < innerHeight; y += 24) for (let x = 20; x < innerWidth; x += 40) {
		const el = document.elementFromPoint(x, y);
		const t = el && el.closest('h1,h2,h3,h4,p,li,blockquote,img,video,svg');
		if (t && t.closest('main') && +getComputedStyle(t).opacity > 0.05) hits.add(t);
	}
	return hits.size;
})()`;
const blanks = []; let run = null;
for (let y = 0; y <= info.max; y += 100) {
	await b.scrollTo(y, 60);
	const n = await b.eval(probe);
	if (n === 0) { if (!run) run = [y, y]; else run[1] = y; } else if (run) { blanks.push(run); run = null; }
}
if (run) blanks.push(run);
console.log('blank runs', JSON.stringify(blanks));

// Slide-over mid-points: half a card into each non-last act's trailing hold.
for (const t of info.trig.slice(0, -1)) {
	await b.scrollTo(t.end - H / 2, 400);
	await b.shot(`cards-${tag}-slide-${t.act}`);
}
// Openers
for (const x of info.beats.filter(x => !x.id.includes('/'))) {
	await b.scrollTo(x.pos, 400);
	await b.shot(`cards-${tag}-open-${x.id}`);
}
// Stepped reveals
for (const x of info.beats.filter(x => /todays-model|demo-two-people/.test(x.id))) {
	await b.scrollTo(x.pos, 400);
	await b.shot(`cards-${tag}-step-${x.id.replace(/\//g, '_')}`);
}
console.log('errors', JSON.stringify(b.errors));
process.exit(0);
