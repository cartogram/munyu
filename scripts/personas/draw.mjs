// Drawing helpers for the persona edit scripts (scripts/personas/<name>.mjs).
// Every shape is a filled path, so normalize-personas.mjs can tint and finish
// it; strokes are drawn as filled strips. Coordinates are the trace's canvas.
import { readFileSync, writeFileSync } from 'fs';

export const INK = '#000000';
export const WHITE = '#FEFEFE';
// greys that land on the ramp's steps (the act colour mixed towards white)
export const DEEP = '#6A6A6A';
export const SOFT = '#C8C7C8';
export const WASH = '#DCDBDD';
// saturated, so the finish treats it as light: no outline, the accent step
export const LIGHT = '#FDEABF';

const f = (v) => +v.toFixed(1);

/** A closed polygon. */
export const poly = (pts) => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';

/** A straight stroke of width w, as a filled strip. */
export const line = ([x0, y0], [x1, y1], w = 4) => {
	const len = Math.hypot(x1 - x0, y1 - y0), nx = (-(y1 - y0) / len) * (w / 2), ny = ((x1 - x0) / len) * (w / 2);
	return poly([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]]);
};

/** A circle, smooth enough to sit inside a traced rim. */
export const circle = ([x, y], r, n = 72) => poly(Array.from({ length: n }, (_, k) => [x + r * Math.cos((k / n) * 2 * Math.PI), y + r * Math.sin((k / n) * 2 * Math.PI)]));

/** An ellipse, rotated by deg. */
export const ellipse = ([cx, cy, rx, ry, deg = 0], n = 36) => {
	const a = (deg * Math.PI) / 180;
	return poly(Array.from({ length: n }, (_, k) => {
		const t = (k / n) * 2 * Math.PI, x = rx * Math.cos(t), y = ry * Math.sin(t);
		return [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
	}));
};

/** A stroke along a quadratic curve, tapered at the ends unless taper is false. */
export const curve = ([x0, y0], [cx, cy], [x1, y1], w, taper = true) => {
	const pt = (t) => [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1];
	const n = 16, left = [], right = [];
	for (let i = 0; i <= n; i++) {
		const t = i / n, [x, y] = pt(t), [ax, ay] = pt(Math.min(t + 0.01, 1)), [bx, by] = pt(Math.max(t - 0.01, 0));
		const len = Math.hypot(ax - bx, ay - by) || 1;
		const half = taper ? (w / 2) * Math.sin(Math.PI * Math.min(Math.max(t, 0.1), 0.9)) : w / 2;
		const nx = (-(ay - by) / len) * half, ny = ((ax - bx) / len) * half;
		left.push([x + nx, y + ny]);
		right.unshift([x - nx, y - ny]);
	}
	return poly([...left, ...right]);
};

/** A polyline as even strokes with round joints (outlines of drawn shapes). */
export const outline = (pts, w) => [
	...pts.slice(1).map((p, i) => line(pts[i], p, w)),
	...pts.slice(1, -1).map((p) => circle(p, w / 2, 12)),
];

/**
 * A path element. finish names its treatment outright, overriding the
 * automatic one: 'edge' keeps its exact size (patches, fine lines, small
 * details), 'glow' grows it over the ink like light, 'piece', 'sheet', 'strip'.
 */
export const path = (fill, d, finish) => `<path fill="${fill}"${finish ? ` data-finish="${finish}"` : ''} d="${d}"/>`;

/** The trace, without the generator's embedded metadata. */
export const readTrace = (url) => readFileSync(url, 'utf8').replace(/<metadata>.*?<\/metadata>/s, '');

/** Paths at the bottom of the drawing, under the trace (shows through its holes). */
export const under = (svg, shapes) => svg.replace(/<path\b/, `${shapes.join('')}<path`);

/** Paths on top of everything. */
export const over = (svg, shapes) => svg.replace(/<\/svg>\s*$/, `${shapes.join('')}</svg>\n`);

/**
 * Change trace paths by index in one pass: fn(index, pathElement) returns the
 * element to keep (or a changed one), '' to drop it.
 */
export const eachPath = (svg, fn) => {
	let i = -1;
	return svg.replace(/<path\b[^>]*?\/?>/g, (p) => fn(++i, p));
};

/** A grey floor strip, ragged at the ends, from x0 to x1 just under y. */
export const floor = (x0, x1, y) =>
	`M${x0 + 12} ${y}L${x1 - 12} ${y}C${x1 + 4} ${y + 1} ${x1 + 12} ${y + 7} ${x1 + 4} ${y + 13}` +
	`C${x1 - 8} ${y + 18} ${x1 - 60} ${y + 17} ${x1 - 120} ${y + 18}L${x0 + 110} ${y + 19}` +
	`C${x0 + 50} ${y + 19} ${x0 - 2} ${y + 18} ${x0 - 8} ${y + 13}C${x0 - 14} ${y + 7} ${x0 - 10} ${y + 1} ${x0 + 12} ${y}Z`;

export const write = (url, svg) => {
	writeFileSync(url, svg);
	console.log('wrote', url.pathname, (svg.match(/<path\b/g) || []).length, 'paths');
};
