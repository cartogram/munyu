// Rose, a year later: her own illustration (originals/rose.svg, from
// rose.mjs) with the knitting put down and her iPad in her hands, and on it
// the app she built for herself. A map's zoom circle lifts part of its
// screen out over the curtains: a slider for her energy budget, and the game
// it picks. Written to originals/rose-a-year-later.svg for
// normalize-personas.mjs to tint and finish. Coordinates are the trace's
// 1024 canvas.
//   node scripts/personas/rose.mjs && node scripts/personas/rose-a-year-later.mjs && npm run personas
import { readFileSync } from 'fs';
import { INK, WHITE, DEEP, SOFT, WASH, poly, line, circle, path, eachPath, over, write } from './draw.mjs';
import { rounded, outlined, offset } from './busts.mjs';

const SRC = new URL('../../media/personas/originals/rose.svg', import.meta.url);
const OUT = new URL('../../media/personas/originals/rose-a-year-later.svg', import.meta.url);

let svg = readFileSync(SRC, 'utf8');

// a ring: two contours, the inner one cut out
const ring = (c, r, w) => `<path fill="${INK}" fill-rule="evenodd" data-finish="edge" d="${circle(c, r + w, 144)}${circle(c, r, 144)}"/>`;

// 1. the iPad, held up in her right hand and tilted a little, its screen
// dimmed for her eyes, and on it the slider and the game it picks, small.
// Built level and turned about its centre.
const IPAD = { c: [458, 522], w: 150, h: 108, deg: -10 };
const turn = ([x, y]) => {
	const a = (IPAD.deg * Math.PI) / 180, [cx, cy] = IPAD.c;
	return [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)];
};
const tp = (pts) => pts.map(turn);
// a straight strip from p to q, w wide, turned with the iPad
const strip = ([x0, y0], [x1, y1], w) => poly(tp([[x0, y0 - w / 2], [x1, y1 - w / 2], [x1, y1 + w / 2], [x0, y0 + w / 2]]));
const [ix, iy] = [IPAD.c[0] - IPAD.w / 2, IPAD.c[1] - IPAD.h / 2];
const sx = ix + 10, sy = iy + 10, sw = IPAD.w - 20, sh = IPAD.h - 20;
const slider = [sx + 22, sy + 34, sw - 44]; // the slider's track: x, y, length
const body = tp(rounded(ix, iy, IPAD.w, IPAD.h, 12));
const ipad = [
	// a white gap round it, where it's held against her dark sweater
	path(WHITE, poly(offset(body, 12)), 'edge'),
	...outlined(INK, body, 6),
	path(DEEP, poly(tp(rounded(sx, sy, sw, sh, 4))), 'edge'),
	// its title, the slider and the game below
	path(SOFT, strip([sx + 14, sy + 14], [sx + 60, sy + 14], 5), 'edge'),
	path(SOFT, strip([slider[0], slider[1]], [slider[0] + slider[2], slider[1]], 5), 'edge'),
	path(WHITE, circle(turn([slider[0] + slider[2] * 0.35, slider[1]]), 6, 24), 'edge'),
	path(SOFT, poly(tp(rounded(sx + 22, sy + 52, sw - 44, 26, 4))), 'edge'),
];
// her hand, its outline and fingers: lifted out and laid back over the
// iPad, which goes over everything else (the sofa's back included), so her
// fingers hold its edge
const HAND = new Set([16, 20, 31, 32, 33, 34]);
const hand = [];
const CURTAIN = 12;

// the zoom's circles (3, below): a small one round the slider on her
// screen, and out over the curtains a big one; the two lines that touch
// both, as a map's inset has, run behind the iPad and the sofa's back, so
// they leave the iPad's edge and show over the curtains
const small = { c: turn([slider[0] + slider[2] * 0.5, slider[1] + 8]), r: 30 };
const big = { c: [790, 290], r: 176 };
const RIM = 8;
const tangents = () => {
	const [x1, y1] = small.c, [x2, y2] = big.c, r1 = small.r + 2, r2 = big.r + RIM;
	const d = Math.hypot(x2 - x1, y2 - y1), th = Math.atan2(y2 - y1, x2 - x1), b = Math.acos((r1 - r2) / d);
	return [th + b, th - b].map((a) => [[x1 + r1 * Math.cos(a), y1 + r1 * Math.sin(a)], [x2 + r2 * Math.cos(a), y2 + r2 * Math.sin(a)]]);
};
// 2. the knitting goes: the needle across her, the white bundle of knitting
// under her hand and its outline, the strands of yarn down to the laptop,
// and the scarf's dots and fringe
const KNITTING = new Set([26, 27, 28, 29, 30, 35, 37, 40, 236, 339, 340, 341, 342, 348, 349, 350, 353, 354, 357, 360]);
const SCARF = [250, 540, 460, 790];
const inBox = (p, [x0, y0, x1, y1]) => {
	const n = (p.match(/\bd="([^"]+)"/)?.[1].match(/-?\d*\.?\d+/g) || []).map(Number);
	return n.length && n.every((v, i) => (i % 2 ? v >= y0 && v <= y1 : v >= x0 && v <= x1));
};
svg = eachPath(svg, (i, p) => {
	if (KNITTING.has(i)) return '';
	if (/fill="#(BDBCBD|DCDBDD)"/i.test(p) && inBox(p, SCARF)) return '';
	if (HAND.has(i)) return hand.push(p), '';
	// the zoom's lines go in over the curtains (12 is the second panel), so
	// the sofa's back, drawn after, runs in front of them
	if (i === CURTAIN) return p + tangents().map(([p0, q]) => path(INK, line(p0, q, 4), 'edge')).join('');
	return p;
});

// 3. the zoom: on top, the small circle on her screen and the big one with
// that part of the screen, large
const [bx, by] = big.c;
const zoom = [
	...ipad,
	...hand,
	ring(small.c, small.r, 4),
	path(INK, circle(big.c, big.r + RIM, 144)),
	path(DEEP, circle(big.c, big.r, 144)),
	// the app's title, with a battery for the energy budget beside it
	...outlined(WASH, rounded(bx - 112, by - 112, 34, 18, 3), 4),
	path(WASH, poly(rounded(bx - 76, by - 107, 6, 8, 1)), 'edge'),
	path(SOFT, line([bx - 60, by - 103], [bx + 50, by - 103], 12), 'edge'),
	// the slider: its track, the budget so far filled in, and the knob
	path(SOFT, line([bx - 120, by - 30], [bx + 120, by - 30], 22)),
	path(WHITE, line([bx - 120, by - 30], [bx - 36, by - 30], 22)),
	path(INK, circle([bx - 36, by - 30], 30, 48)),
	path(WHITE, circle([bx - 36, by - 30], 24, 48)),
	// low and high, at either end
	path(SOFT, line([bx - 120, by + 12], [bx - 92, by + 12], 8), 'edge'),
	path(SOFT, line([bx + 92, by + 12], [bx + 120, by + 12], 8), 'edge'),
	// the game it picks for that much energy: its cover and title
	path(SOFT, poly(rounded(bx - 100, by + 44, 200, 64, 10))),
	path(WASH, poly(rounded(bx - 88, by + 54, 44, 44, 6)), 'edge'),
	path(WASH, line([bx - 30, by + 66], [bx + 70, by + 66], 10), 'edge'),
	path(WASH, line([bx - 30, by + 86], [bx + 30, by + 86], 8), 'edge'),
];
svg = over(svg, zoom);

write(OUT, svg);
