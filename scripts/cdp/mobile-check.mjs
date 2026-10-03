import { launch } from './cdp.mjs';
for (const w of [320, 375, 414]) {
	const b = await launch({ width: w, height: 740, port: 9333 + w });
	await b.goto(`http://localhost:${process.env.PORT || 8123}/index.html`);
	console.log(w, await b.eval(`JSON.stringify({
		titles: [...document.querySelectorAll('.act-title')].map(h => { const r = document.createRange(); r.selectNodeContents(h); const rr = r.getBoundingClientRect(); return h.textContent.slice(0, 15) + ' ' + getComputedStyle(h).fontSize + ' L' + Math.round(rr.left) + ' R' + Math.round(rr.right); }),
		h2: getComputedStyle(document.querySelector('main section[data-scene] h2')).fontSize,
		overflowX: document.documentElement.scrollWidth - innerWidth,
	})`));
	await b.close();
}
process.exit(0);
