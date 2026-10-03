// Fail when the deck, the theme tokens and system.html disagree, so the
// system page can't quietly fall out of date.   node scripts/check-system.mjs
import { existsSync, readFileSync } from 'fs';
import { execFileSync } from 'child_process';
import { acts, media, personas, tokens } from './theme.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const css = read('css/talk.css');
const system = read('system.html');
const { acts: actTokens, ramp } = tokens();
const deck = acts();
const errors = [];

// WCAG contrast against white
function contrast(hex) {
	const [r, g, b] = [1, 3, 5].map((i) => {
		const c = parseInt(hex.slice(i, i + 2), 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 1.05 / (0.2126 * r + 0.7152 * g + 0.0722 * b + 0.05);
}

// every act has a token, a card rule, and AAA contrast; no token is orphaned
for (const { id } of deck) {
	const hex = actTokens[id];
	if (!hex) errors.push(`act "${id}" has no --act-${id} token in css/talk.css`);
	else if (contrast(hex) < 7) errors.push(`--act-${id} ${hex} is ${contrast(hex).toFixed(2)}:1 on white, under AAA (7:1)`);
	if (!css.includes(`.act-panel[data-act='${id}']`)) errors.push(`act "${id}" has no .act-panel[data-act='${id}'] rule in css/talk.css`);
}
for (const id of Object.keys(actTokens)) {
	if (!deck.some((a) => a.id === id)) errors.push(`--act-${id} is not an act in index.html`);
}
if (!Object.keys(ramp).length) errors.push('no --ramp-* tokens in css/talk.css');

// every slide template in system.html points at a real act and scene
for (const [, entry] of system.matchAll(/^\s*\{ name: (.*) \},?$/gm)) {
	const act = entry.match(/act: '([^']+)'/)?.[1];
	const scene = entry.match(/scene: '([^']+)'/)?.[1];
	const html = deck.find((a) => a.id === act)?.html;
	if (!html) errors.push(`system.html template ${entry.split(',')[0]} names act "${act}", which isn't in index.html`);
	else if (scene && !html.includes(`data-scene="${scene}"`)) errors.push(`system.html template ${entry.split(',')[0]} names scene "${scene}", which isn't in act "${act}"`);
}

// every media file exists and is named for its scene: media/<scene>-<what>.<ext>,
// or media/personas/<scene>.webp for an illustration
for (const { path, scene } of media()) {
	if (!existsSync(new URL(`../${path}`, import.meta.url))) errors.push(`${scene}: ${path} is missing`);
	const name = path.replace(/^media\//, '');
	const ok = name.startsWith('personas/') ? name === `personas/${scene}.webp` : name.startsWith(`${scene}-`);
	if (!ok) errors.push(`${scene}: ${path} should be named ${name.startsWith('personas/') ? `media/personas/${scene}.webp` : `media/${scene}-<what>.<ext>`}`);
}

// every illustration has its original, and the generated files are current
for (const { file, scene } of personas()) {
	if (!existsSync(new URL(`../media/personas/originals/${file}`, import.meta.url))) errors.push(`${scene}: media/personas/originals/${file} is missing`);
}
try {
	execFileSync('node', [new URL('normalize-personas.mjs', import.meta.url).pathname, '--check'], { stdio: 'pipe' });
} catch (e) {
	errors.push(e.stderr.toString().trim());
}

if (errors.length) {
	console.error(errors.map((e) => `✗ ${e}`).join('\n'));
	process.exit(1);
}
console.log(`✓ system in sync: ${deck.length} acts, ${Object.keys(ramp).length} ramp steps, ${personas().length} illustrations, ${media().length} media files`);
