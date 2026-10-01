// Shared keyboard-nav helpers.
import { sleep } from './cdp.mjs';

// Wait until scrollY has been stable for 300ms (smooth scroll finished).
export async function settle(b, timeout = 4000) {
	let last = await b.eval('scrollY'), stableSince = Date.now(), t0 = Date.now();
	while (Date.now() - t0 < timeout) {
		await sleep(50);
		const y = await b.eval('scrollY');
		if (y !== last) { last = y; stableSince = Date.now(); }
		else if (Date.now() - stableSince > 300) break;
	}
	await sleep(150);
	return last;
}

// Index of the scene whose top is nearest the viewport top, and its offset.
export const nearest = `(() => {
	const tops = [...document.querySelectorAll('main section[data-scene]')].map((s) => s.getBoundingClientRect().top);
	let best = 0;
	tops.forEach((t, i) => { if (Math.abs(t) < Math.abs(tops[best])) best = i; });
	return { idx: best, top: Math.round(tops[best]), y: Math.round(scrollY), maxY: document.documentElement.scrollHeight - innerHeight };
})()`;

export async function press(b, key) {
	await b.key(key);
	await settle(b);
	return b.eval(nearest);
}
