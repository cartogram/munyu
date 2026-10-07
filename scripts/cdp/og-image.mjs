// The share image (public/og-image.jpg): the title slide at 1200×630, without
// the notes toggle or the pointer. Rerun when the title slide changes.
import { writeFileSync } from 'node:fs';
import { launch, sleep } from './cdp.mjs';
const PAGE = `http://localhost:${process.env.PORT || 8123}/index.html`;
const b = await launch({ width: 1200, height: 630 });
await b.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await b.goto(PAGE);
await b.eval('document.fonts.ready.then(() => true)');
await sleep(1500);
await b.eval(`document.getElementById('deck-cursor').style.display = 'none'; document.getElementById('notes-toggle').style.visibility = 'hidden'`);
await sleep(300);
const { data } = await b.send('Page.captureScreenshot', { format: 'jpeg', quality: 88 });
writeFileSync(new URL('../../public/og-image.jpg', import.meta.url), Buffer.from(data, 'base64'));
console.log('wrote public/og-image.jpg');
process.exit(0);
