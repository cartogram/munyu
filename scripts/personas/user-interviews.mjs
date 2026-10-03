// The User Interviews illustration, drawn from a description rather than a
// trace, written to originals/user-interviews.svg, which
// normalize-personas.mjs then tints and finishes. Two browser windows
// overlapping: behind, a week's calendar with one interview blocked out on
// each of six days, Rose's highlighted, with its title in a card beside it;
// in front, lower left, a video call split into two stacked tiles, each just
// an initial in a circle, M above S, as a call shows a camera that's off.
// Words are Aileron Black outlined to paths (opentype.js), as the finish
// keeps only paths. Coordinates are a 1024 canvas.
//   node scripts/personas/user-interviews.mjs && npm run personas
import { readFileSync } from 'fs';
import opentype from 'opentype.js';
import { DEEP, INK, SOFT, WASH, WHITE, circle, path, poly, write } from './draw.mjs';

const OUT = new URL('../../media/personas/originals/user-interviews.svg', import.meta.url);
const FONT = readFileSync(new URL('../../fonts/aileron/Aileron-Black.otf', import.meta.url));
const font = opentype.parse(FONT.buffer.slice(FONT.byteOffset, FONT.byteOffset + FONT.byteLength));
// Rose's interview, the scene's focal point: saturated enough for the finish
// to take it as the accent step (draw.mjs's LIGHT is too pale and lands on
// the wash)
const LIGHT = '#F5C842';

// A word or line set in Aileron Black, left-aligned on its baseline at x, y.
// Fine lettering keeps its drawn weight (edge), or the finish would fatten it.
// opentype.js 2.0 misreads some of this font's glyphs (the t) into NaN, which
// silently ends the path there, so a bad outline stops the script instead.
const words = (fill, text, x, y, size) => {
	const d = font.getPath(text, x, y, size).toPathData(1);
	if (d.includes('NaN')) throw new Error(`"${text}" didn't outline cleanly (NaN in its path)`);
	return path(fill, d, 'edge');
};
const width = (text, size) => font.getAdvanceWidth(text, size);

// A rounded rectangle as a polygon (the finish reads boxes from point pairs,
// so no arc commands).
const rrect = (x, y, w, h, r) => {
	const corner = (cx, cy, a0) => Array.from({ length: 7 }, (_, k) => {
		const t = ((a0 + k * 15) * Math.PI) / 180;
		return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
	});
	return poly([...corner(x + w - r, y + r, -90), ...corner(x + w - r, y + h - r, 0), ...corner(x + r, y + h - r, 90), ...corner(x + r, y + r, 180)]);
};

const shapes = [];
const add = (...s) => shapes.push(...s);

// A browser window: a dark frame with a title bar (three dots and an address
// bar), and its page, white, inset within it. Returns the page's box.
const browser = (x, y, w, h) => {
	add(path(INK, rrect(x, y, w, h, 18)));
	[0, 1, 2].forEach((i) => add(path(WHITE, circle([x + 30 + i * 26, y + 26], 8, 24), 'edge')));
	add(path(WASH, rrect(x + 118, y + 14, w - 140, 24, 12)));
	const page = [x + 12, y + 52, w - 24, h - 64];
	add(path(WHITE, rrect(...page, 8)));
	return page;
};

// 1. the calendar, behind: six day columns with a time gutter, a day initial
// atop each column, and the hour lines
const [cx, cy, cw, ch] = browser(330, 60, 664, 760);
const gutter = 40, head = 52;
const col = (cw - gutter) / 6;
const colX = (i) => cx + gutter + i * col;
['M', 'T', 'W', 'T', 'F', 'S'].forEach((d, i) => add(words(INK, d, colX(i) + col / 2 - width(d, 26) / 2, cy + 38, 26)));
for (let h = 0; h < 8; h++) {
	const y = cy + head + 12 + h * ((ch - head - 24) / 7);
	add(path(SOFT, poly([[cx + gutter - 10, y - 1.5], [cx + cw - 10, y - 1.5], [cx + cw - 10, y + 1.5], [cx + gutter - 10, y + 1.5]]), 'edge'));
	add(path(SOFT, poly([[cx + 10, y - 1.5], [cx + 26, y - 1.5], [cx + 26, y + 1.5], [cx + 10, y + 1.5]]), 'edge'));
}
for (let i = 1; i < 6; i++) {
	const x = colX(i);
	add(path(SOFT, poly([[x - 1.5, cy + head], [x + 1.5, cy + head], [x + 1.5, cy + ch - 10], [x - 1.5, cy + ch - 10]]), 'edge'));
}

// one interview a day, at different times; Tuesday's is Rose's, in the
// accent: the scene's focal point. Her card covers Wednesday to Saturday
// from her slot to about halfway down, so the others sit clear of it, and
// Monday's sits above the call window
const slots = [[0.08, 0.13], [0.14, 0.13], [0.62, 0.13], [0.8, 0.12], [0.5, 0.13], [0.7, 0.13]];
const ROSE = 1;
const span = ch - head - 24;
const block = (i) => {
	const [at, len] = slots[i];
	return [colX(i) + 8, cy + head + 12 + at * span, col - 16, len * span];
};
// the others stay light, so Rose's is the strongest block on the page
slots.forEach((_, i) => add(path(i === ROSE ? LIGHT : i % 2 ? WASH : SOFT, rrect(...block(i), 10))));

// 2. Rose's interview, named in a card beside her block, joined to it
const [bx, by, bw] = block(ROSE);
const card = { x: bx + bw + 24, y: by - 10, w: 300, h: 156 };
add(path(LIGHT, poly([[bx + bw - 4, by + 30], [card.x + 6, by + 16], [card.x + 6, by + 52]])));
add(path(INK, rrect(card.x - 7, card.y - 7, card.w + 14, card.h + 14, 18)));
add(path(LIGHT, rrect(card.x, card.y, card.w, card.h, 12)));
add(words(INK, 'Rose', card.x + 22, card.y + 52, 38));
add(words(INK, 'AI Accessibility', card.x + 22, card.y + 98, 28));
add(words(INK, 'Interview', card.x + 22, card.y + 132, 28));

// 3. the video call, in front, lower left, edged in white where its frame
// crosses the calendar's: two tiles stacked, each an initial in a circle,
// and the controls
const call = { x: 30, y: 440, w: 410, h: 560 };
add(path(WHITE, rrect(call.x - 9, call.y - 9, call.w + 18, call.h + 18, 26), 'edge'));
const [vx, vy, vw, vh] = browser(call.x, call.y, call.w, call.h);
const barH = 52;
const tileH = (vh - barH - 10) / 2;
const tiles = [
	{ initial: 'M', y: vy, tone: SOFT, disc: DEEP, letter: WHITE },
	{ initial: 'S', y: vy + tileH + 10, tone: DEEP, disc: SOFT, letter: INK },
];
for (const t of tiles) {
	add(path(t.tone, poly([[vx, t.y], [vx + vw, t.y], [vx + vw, t.y + tileH], [vx, t.y + tileH]])));
	const centre = [vx + vw / 2, t.y + tileH / 2];
	add(path(t.disc, circle(centre, 66, 72)));
	// the initial centred on the disc: half its advance across, and its
	// baseline a little over a third of the size below the centre
	const size = 76;
	add(words(t.letter, t.initial, centre[0] - width(t.initial, size) / 2, centre[1] + size * 0.36, size));
}
// the call's controls: a dark bar with mute, camera and leave
const barY = vy + vh - barH;
add(path(INK, poly([[vx, barY], [vx + vw, barY], [vx + vw, vy + vh], [vx, vy + vh]])));
[-60, 0, 60].forEach((dx, i) => add(path(i === 2 ? SOFT : WASH, circle([vx + vw / 2 + dx, barY + 26], 15, 32))));

write(OUT, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${shapes.join('')}</svg>\n`);
