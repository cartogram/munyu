// Read the theme from its sources, so scripts never restate a value:
// tokens from css/talk.css, acts and personas from index.html.
import { readFileSync } from 'fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

export function tokens() {
	const css = read('css/talk.css');
	const acts = Object.fromEntries([...css.matchAll(/--act-([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2]]));
	const ramp = Object.fromEntries([...css.matchAll(/--ramp-([a-z]+):\s*([\d.]+)%\s*;/g)].map((m) => [m[1], +m[2] / 100]));
	return { acts, ramp };
}

// Each act's id and the source of its markup, in deck order.
export function acts() {
	return read('index.html')
		.split(/(?=<section data-act=")/)
		.slice(1)
		.map((html) => ({ id: html.match(/^<section data-act="([^"]+)"/)[1], html }));
}

// Every media file the deck uses, with the scene it sits in.
export function media() {
	return acts().flatMap((act) =>
		act.html
			.split(/(?=<section data-scene=")/)
			.slice(1)
			.flatMap((html) => {
				const scene = html.match(/^<section data-scene="([^"]+)"/)[1];
				return [...html.matchAll(/src="(media\/[^"]+)"/g)].map((m) => ({ path: m[1], scene, act: act.id }));
			}),
	);
}

// Every persona illustration in the deck: its file (the finished SVG; the
// deck shows the WebP rendered from it), scene and act.
export function personas() {
	return acts().flatMap((act) =>
		[...act.html.matchAll(/<section data-scene="([^"]+)"(?:(?!<section data-scene=)[\s\S])*?src="media\/personas\/([a-z-]+)\.webp"/g)].map(
			(m) => ({ scene: m[1], file: `${m[2]}.svg`, act: act.id }),
		),
	);
}
