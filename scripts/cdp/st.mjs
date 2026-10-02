// Expose the page's own ScrollTrigger instance as window.__ST (test-side only).
export async function exposeST(b) {
	await b.eval(`(async () => {
		const src = await (await fetch('/js/site.js')).text();
		const url = src.match(/from\\s+["']([^"']*gsap_ScrollTrigger[^"']*)["']/)[1];
		window.__ST = (await import(url)).ScrollTrigger;
		return url;
	})()`);
}

// Summary of every act-panel recede trigger.
export const actTriggers = `window.__ST.getAll().filter((t) => t.trigger?.classList?.contains('act-panel')).map((t) => ({
	act: t.trigger.dataset.act,
	start: Math.round(t.start),
	end: Math.round(t.end),
	innerH: t.trigger.querySelector('.act-panel-inner').offsetHeight,
	marginBottom: t.trigger.style.marginBottom,
}))`;

// What is visibly on screen: each act-panel's rect, transform, opacity, and
// which scenes' headings are within the viewport (after all transforms).
export const visible = `(() => {
	const acts = [...document.querySelectorAll('main .act-panel')].map((a) => {
		const r = a.getBoundingClientRect();
		const cs = getComputedStyle(a);
		const inner = a.querySelector('.act-panel-inner');
		return {
			act: a.dataset.act,
			top: Math.round(r.top), bottom: Math.round(r.bottom),
			scale: +(window.gsap ? 0 : 0) || cs.transform,
			opacity: +(+cs.opacity).toFixed(2),
			innerY: getComputedStyle(inner).transform,
			pos: cs.position,
		};
	}).filter((a) => a.bottom > 0 && a.top < innerHeight);
	const headings = [...document.querySelectorAll('main section[data-scene]')].map((s) => {
		const h = s.querySelector('h1,h2,h3');
		const r = (h || s).getBoundingClientRect();
		return { scene: s.dataset.scene, top: Math.round(r.top) };
	}).filter((h) => h.top > -40 && h.top < innerHeight);
	return { y: Math.round(scrollY), acts, headings };
})()`;
