// The speaker script (css/talk.css, @media print): prints the page to
// shots/print-a4.pdf and shots/print-letter.pdf, and checks that printing
// takes the scroll choreography off (no pins, every build whole, the notes
// out of their scenes) and puts it back afterwards, on the same beat.
// PAPER=a4 or PAPER=letter prints just one.
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch, sleep, SHOTS } from './cdp.mjs';
const PAGE = `http://localhost:${process.env.PORT || 8123}/index.html`;
const PAPERS = { a4: { paperWidth: 8.27, paperHeight: 11.69 }, letter: { paperWidth: 8.5, paperHeight: 11 } };
const papers = process.env.PAPER ? [process.env.PAPER] : Object.keys(PAPERS);
mkdirSync(SHOTS, { recursive: true });

const b = await launch({ width: 1440, height: 900 });
await b.goto(PAGE);
await b.eval('document.fonts.ready.then(() => true)');
await sleep(1500);

const failures = [];
const check = (ok, what) => {
	console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
	if (!ok) failures.push(what);
};

// a beat partway into the talk, to come back to
await b.eval(`location.hash = '#user-research/sarah'`);
await sleep(1500);
const before = await b.eval('({ y: Math.round(scrollY), hash: location.hash })');

// What the page looks like while it prints: printToPDF fires beforeprint
// and afterprint itself, so the state is captured from inside the first.
await b.eval(`
	window.__printState = null;
	window.addEventListener('beforeprint', () => {
		const scenes = [...document.querySelectorAll('main section[data-scene]')];
		window.__printState = {
			pins: document.querySelectorAll('.pin-spacer').length,
			notesInside: document.querySelectorAll('main section[data-scene] > aside.notes').length,
			notesAfter: scenes.filter((s) => s.nextElementSibling?.matches('aside.notes')).length,
			hiddenPieces: [...document.querySelectorAll('[data-piece], [data-part], .branching-avatar')]
				.filter((el) => el.style.opacity === '0' || el.style.visibility === 'hidden').length,
			transformed: [...document.querySelectorAll('.act-panel-inner')].filter((el) => el.style.transform).length,
		};
	}, { once: true });
	true`);

for (const paper of papers) {
	const { data } = await b.send('Page.printToPDF', { ...PAPERS[paper], preferCSSPageSize: false, printBackground: false, marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, displayHeaderFooter: false });
	const path = `${SHOTS}print-${paper}.pdf`;
	const pdf = Buffer.from(data, 'base64');
	writeFileSync(path, pdf);
	const pages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
	console.log(`wrote ${path} (${pages} pages)`);
}

const state = await b.eval('window.__printState');
check(state !== null, 'beforeprint fired');
if (state) {
	check(state.pins === 0, `no pin spacers while printing (${state.pins})`);
	check(state.notesInside === 0, `no notes left inside scenes (${state.notesInside})`);
	check(state.notesAfter > 24, `notes follow their scenes (${state.notesAfter})`);
	check(state.hiddenPieces === 0, `no build pieces left hidden (${state.hiddenPieces})`);
	check(state.transformed === 0, `no act rows left slid (${state.transformed})`);
}

await sleep(1000);
const after = await b.eval(`({
	y: Math.round(scrollY),
	hash: location.hash,
	pins: document.querySelectorAll('.pin-spacer').length,
	notesInside: document.querySelectorAll('main section[data-scene] > aside.notes').length,
})`);
check(after.pins > 0, `pins back after printing (${after.pins})`);
check(after.notesInside === state?.notesAfter, `notes back in their scenes (${after.notesInside})`);
check(after.hash === before.hash && Math.abs(after.y - before.y) < 4, `same beat after printing (${before.hash} ${before.y} → ${after.hash} ${after.y})`);
check(b.errors.length === 0, `no page errors${b.errors.length ? `: ${b.errors.join('; ')}` : ''}`);

process.exit(failures.length ? 1 : 0);
