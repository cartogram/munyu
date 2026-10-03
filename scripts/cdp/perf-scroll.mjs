// Scroll performance: scrolls the whole deck a fixed step per frame and
// reports frame times, where the slow frames are (by frame of the deck), what
// the browser spent its time on (Performance.getMetrics), and the scripts the
// Long Animation Frame API blames for the slow ones.
//   node scripts/cdp/perf-scroll.mjs [step px per frame, default 24]
// Optional env: FROM=<beat id> starts there (e.g. user-research), SPAN=<px>
// scrolls only that far, CSS='<rules>' injects a stylesheet first (to test
// one change at a time), QUIET=1 skips the per-frame breakdown, and
// MAX_SLOW=<share, e.g. 0.05> fails the run (exit 1) if more frames than that
// take over 20ms.
// Headless Chrome has no GPU, so absolute times run high; compare runs.
import { launch, sleep } from './cdp.mjs';

const STEP = Number(process.argv[2]) || 24;
const b = await launch({ width: 1920, height: 1080, port: 9391 });
await b.send('Performance.enable', { timeDomain: 'timeTicks' });
const { FROM, SPAN, CSS, QUIET } = process.env;
await b.goto(`http://localhost:${process.env.PORT || 8123}/index.html${FROM ? `#${FROM}` : ''}`);
await sleep(2500);
if (CSS) await b.eval(`document.head.insertAdjacentHTML('beforeend', ${JSON.stringify(`<style>${CSS}</style>`)})`);
await sleep(500);

const metrics = async () => Object.fromEntries((await b.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const before = await metrics();

const run = JSON.parse(await b.eval(`new Promise((resolve) => {
	const loafs = [];
	new PerformanceObserver((list) => loafs.push(...list.getEntries())).observe({ type: 'long-animation-frame', buffered: false });
	const frames = [];
	const max = Math.min(document.documentElement.scrollHeight - innerHeight, scrollY + ${Number(SPAN) || 1e9});
	let last = performance.now();
	const tick = (now) => {
		frames.push({ dt: now - last, y: scrollY });
		last = now;
		if (scrollY >= max) {
			setTimeout(() => resolve(JSON.stringify({ frames, max, loafs: loafs.map((l) => ({
				start: l.startTime, duration: l.duration, blocking: l.blockingDuration,
				render: l.renderStart ? l.startTime + l.duration - l.renderStart : 0,
				styleLayout: l.styleAndLayoutStart ? l.startTime + l.duration - l.styleAndLayoutStart : 0,
				scripts: l.scripts.map((s) => ({ fn: s.sourceFunctionName, src: (s.sourceURL || '').split('/').pop() + ':' + s.sourceCharPosition, invoker: s.invoker, duration: Math.round(s.duration), forced: Math.round(s.forcedStyleAndLayoutDuration) })),
			})) })), 500);
			return;
		}
		window.scrollTo(0, Math.min(max, scrollY + ${STEP}));
		requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
})`));

const after = await metrics();
const delta = (k) => Math.round((after[k] - before[k]) * 1000);

const dts = run.frames.slice(1).map((f) => f.dt).sort((a, c) => a - c);
const pct = (p) => dts[Math.floor((dts.length - 1) * p)].toFixed(1);
console.log(`frames ${dts.length}  page ${run.max}px  step ${STEP}px`);
console.log(`frame ms  p50 ${pct(0.5)}  p90 ${pct(0.9)}  p99 ${pct(0.99)}  max ${dts.at(-1).toFixed(1)}  >20ms ${dts.filter((d) => d > 20).length}  >50ms ${dts.filter((d) => d > 50).length}`);
console.log(`main thread ms  task ${delta('TaskDuration')}  script ${delta('ScriptDuration')}  style ${delta('RecalcStyleDuration')} (${after.RecalcStyleCount - before.RecalcStyleCount}×)  layout ${delta('LayoutDuration')} (${after.LayoutCount - before.LayoutCount}×)`);

// Where the slow frames are: name the deck frame on screen at each one's scroll
// position, by looking after the run.
const slow = QUIET ? [] : run.frames.filter((f) => f.dt > 20);
const where = new Map();
for (const f of slow) {
	await b.eval(`window.scrollTo(0, ${f.y})`);
	await sleep(30);
	const name = await b.eval(`(() => {
		const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
		const frame = el?.closest('section[data-scene], .act-opener');
		const act = el?.closest('.act-panel')?.dataset.act;
		return (act ?? '?') + '/' + (frame?.dataset.scene ?? 'opener');
	})()`);
	const w = where.get(name) ?? { n: 0, ms: 0 };
	w.n += 1;
	w.ms += f.dt;
	where.set(name, w);
}
console.log('\nslow frames (>20ms) by deck frame:');
[...where].sort((a, c) => c[1].ms - a[1].ms).slice(0, 15).forEach(([name, w]) => console.log(`  ${String(w.n).padStart(4)}  ${Math.round(w.ms).toString().padStart(6)}ms  ${name}`));

// Long animation frames: total split, and the scripts they blame.
const sum = (xs, k) => Math.round(xs.reduce((s, x) => s + x[k], 0));
console.log(`\nlong animation frames ${run.loafs.length}  total ${sum(run.loafs, 'duration')}ms  render ${sum(run.loafs, 'render')}ms  style+layout ${sum(run.loafs, 'styleLayout')}ms`);
const byScript = new Map();
run.loafs.flatMap((l) => l.scripts).forEach((s) => {
	const key = `${s.invoker} → ${s.fn || '(anon)'} @ ${s.src}`;
	const e = byScript.get(key) ?? { n: 0, ms: 0, forced: 0 };
	e.n += 1;
	e.ms += s.duration;
	e.forced += s.forced;
	byScript.set(key, e);
});
[...byScript].sort((a, c) => c[1].ms - a[1].ms).slice(0, 12).forEach(([k, e]) => console.log(`  ${String(e.n).padStart(4)}×  ${String(e.ms).padStart(6)}ms  forced layout ${String(e.forced).padStart(5)}ms  ${k}`));
if (b.errors.length) console.log('errors', JSON.stringify(b.errors));
const share = dts.filter((d) => d > 20).length / dts.length;
if (process.env.MAX_SLOW) {
	const ok = share <= Number(process.env.MAX_SLOW);
	console.log(`${ok ? 'PASS' : 'FAIL'} slow frames ${(share * 100).toFixed(1)}% (max ${Number(process.env.MAX_SLOW) * 100}%)`);
	process.exit(ok ? 0 : 1);
}
process.exit(0);
