// system.html: generated sections are populated and the page logs no errors.
import { launch, sleep } from './cdp.mjs';
const b = await launch({ width: 1440, height: 900, port: 9351 });
await b.goto(`http://localhost:${process.env.PORT || 8125}/system.html`);
await sleep(1500);
console.log(await b.eval(`JSON.stringify({
	swatches: [...document.querySelectorAll('.ts-swatch-name')].map((n) => n.textContent),
	ramp: [...document.querySelectorAll('.ts-ramp-step')].map((s) => s.textContent.trim()),
	illustrations: [...document.querySelectorAll('.ts-illustrations figure')].map((f) => ({ name: f.querySelector('strong').textContent, w: Math.round(f.getBoundingClientRect().width), loaded: f.querySelector('img').naturalWidth > 0 })),
	weights: [...document.querySelectorAll('[data-weights]')].map((w) => w.textContent),
	templates: document.querySelectorAll('.ts-template').length,
	viewport: innerWidth,
})`));
console.log('errors', JSON.stringify(b.errors));
process.exit(0);
