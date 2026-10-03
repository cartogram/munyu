// Persona scenes fit one frame at desktop sizes: the scene is the card's
// height and its last element ends inside the frame's bottom padding.
import { launch, sleep } from './cdp.mjs';
let failed = false;
for (const [width, height, port] of [[1920, 1080, 9371], [1440, 900, 9372], [1280, 680, 9373]]) {
	const b = await launch({ width, height, port });
	await b.goto(`http://localhost:${process.env.PORT || 8123}/index.html`);
	await sleep(2500);
	const scenes = JSON.parse(await b.eval(`JSON.stringify([...document.querySelectorAll('main section[data-scene]:has(> .persona)')].map((s) => {
		const card = s.closest('.act-panel');
		const pad = parseFloat(getComputedStyle(s).paddingBottom);
		const media = [...s.querySelectorAll('.persona > :is(.portrait-ground, .video-play)')].map((m) => Math.round(m.getBoundingClientRect().height));
		const last = s.querySelector('.persona').lastElementChild.getBoundingClientRect().bottom;
		return { scene: s.dataset.scene, fits: s.offsetHeight <= card.clientHeight && last <= s.getBoundingClientRect().bottom - pad + 1, media };
	}))`));
	for (const s of scenes) {
		if (!s.fits) failed = true;
		console.log(`${s.fits ? 'PASS' : 'FAIL'} ${width}×${height} ${s.scene} media=${s.media.join('/')}`);
	}
	if (b.errors.length) console.log('errors', JSON.stringify(b.errors));
	await b.close();
}
console.log(failed ? 'SOME FAILED' : 'ALL PASSED');
process.exit(0);
