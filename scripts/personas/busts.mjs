// The people's head-and-shoulders busts, turned to the right like Rose's
// portrait, and the shape helpers they're drawn with. Each bust is drawn at
// S times the size first sketched, about the head's centre, and returns its
// shapes in drawing order. Used by the branching demo's avatars
// (demo-two-people.mjs).
import { INK, WHITE, DEEP, SOFT, poly, line, circle, ellipse, curve, path } from './draw.mjs';

export const LINE = 7; // outline weight, close to the traced set's after the finish

// a rounded rectangle's outline points, clockwise from the top-left corner
export const rounded = (x, y, w, h, r, n = 6) => {
	const arc = (cx, cy, from) =>
		Array.from({ length: n + 1 }, (_, k) => {
			const a = ((from + (90 * k) / n) * Math.PI) / 180;
			return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
		});
	return [...arc(x + r, y + r, 180), ...arc(x + w - r, y + r, 270), ...arc(x + w - r, y + h - r, 0), ...arc(x + r, y + h - r, 90)];
};
// the points of a polygon path (poly, circle, ellipse), to outline or edit
export const points = (d) => {
	const n = d.match(/-?\d+\.?\d*/g).map(Number);
	return Array.from({ length: n.length / 2 }, (_, i) => [n[2 * i], n[2 * i + 1]]);
};
// a polygon grown outwards by d (shrunk, for a negative d), each corner moved
// along the bisector of its two edges' outward normals
export const offset = (pts, d) => {
	const area = pts.reduce((a, [x, y], i) => a + x * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * y, 0);
	const s = area > 0 ? -1 : 1; // which side of each edge is outside
	const normal = ([x0, y0], [x1, y1]) => {
		const len = Math.hypot(x1 - x0, y1 - y0) || 1;
		return [(s * -(y1 - y0)) / len, (s * (x1 - x0)) / len];
	};
	return pts.map((p, i) => {
		const a = normal(pts[(i - 1 + pts.length) % pts.length], p), b = normal(p, pts[(i + 1) % pts.length]);
		const m = [a[0] + b[0], a[1] + b[1]], len = Math.hypot(...m) || 1;
		const k = d / Math.max(0.4, (m[0] * a[0] + m[1] * a[1]) / len);
		return [p[0] + (m[0] / len) * k, p[1] + (m[1] / len) * k];
	});
};
// a closed curve through every point (Catmull-Rom), n points per span
export const smooth = (pts, n = 6) =>
	pts.flatMap((p1, i) => {
		const at = (k) => pts[(i + k + pts.length) % pts.length];
		const [p0, p2, p3] = [at(-1), at(1), at(2)];
		return Array.from({ length: n }, (_, j) => {
			const t = j / n, t2 = t * t, t3 = t2 * t;
			return [0, 1].map(
				(c) => 0.5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t3),
			);
		});
	});
// a piece with an ink outline: an ink sheet under it, a line's width bigger,
// as the traced illustrations are cut
export const outlined = (fill, pts, w = LINE, ink = INK) => [path(ink, poly(offset(pts, w))), path(fill, poly(pts))];

export function rose(hx, hy, S) {
	const shapes = [], add = (...s) => shapes.push(...s.flat());
	const at = (dx, dy) => [hx + dx * S, hy + dy * S];
	// her dark sweater: rounded shoulders, cut straight across like a bust
	add(path(INK, poly(rounded(...at(-128, 84), 266 * S, 120 * S, 64 * S).map(([x, y]) => [x, Math.min(y, hy + 150 * S)]))));
	// neck, behind the chin
	add(outlined(WHITE, [at(-14, 40), at(20, 40), at(22, 98), at(-16, 98)]));
	// the low bun at the back of her head, tied off with a light band
	add(path(INK, ellipse([...at(-74, 16), 30 * S, 24 * S, -12])));
	add(path(SOFT, poly([at(-50, 2), at(-40, -2), at(-32, 30), at(-42, 34)])));
	// hair: a dark cap over the top and back of the head
	add(path(INK, ellipse([...at(-6, -8), 60 * S, 58 * S])));
	// face: the front of the head, below the hairline, with a pointed nose out
	// of the profile and the chin dropping below the hair
	add(outlined(WHITE, smooth([
		at(-12, -24), at(18, -42), at(44, -44), at(52, -18), at(54, 6), at(68, 20), at(54, 26),
		at(50, 44), at(30, 60), at(6, 64), at(-14, 54), at(-24, 30), at(-22, 4),
	])));
	// dark glasses: a lens each side of the nose's bridge, and the arm back to the ear
	add(path(INK, ellipse([...at(20, 0), 22 * S, 15 * S, -4])));
	add(path(INK, ellipse([...at(54, -2), 9 * S, 14 * S, -4])));
	add(path(INK, line(at(40, -4), at(48, -4), 6 * S)));
	add(path(INK, line(at(-20, -4), at(0, -2), 6 * S)));
	// a small smile
	add(path(INK, curve(at(22, 38), at(34, 46), at(46, 36), 5 * S), 'edge'));
	return shapes;
}

export function myron(hx, hy, S) {
	const shapes = [], add = (...s) => shapes.push(...s.flat());
	const at = (dx, dy) => [hx + dx * S, hy + dy * S];
	// his light shirt: rounded shoulders, cut straight across like a bust
	add(outlined(WHITE, rounded(...at(-128, 84), 266 * S, 120 * S, 64 * S).map(([x, y]) => [x, Math.min(y, hy + 150 * S)])));
	// an open collar
	add(path(INK, line(at(-12, 92), at(4, 112), 5 * S)), path(INK, line(at(20, 92), at(4, 112), 5 * S)));
	// neck, behind the chin
	add(outlined(WHITE, [at(-14, 40), at(20, 40), at(22, 96), at(-16, 96)]));
	// short dark hair, over the top and back of the head
	add(path(INK, ellipse([...at(-4, -14), 58 * S, 52 * S])));
	// face, with a pointed nose out of the profile
	add(outlined(WHITE, smooth([
		at(-18, -26), at(16, -46), at(46, -40), at(54, -14), at(56, 8), at(70, 22), at(56, 28),
		at(52, 46), at(32, 62), at(6, 66), at(-14, 56), at(-26, 30), at(-24, 0),
	])));
	// a dot of an eye and a small smile
	add(path(INK, circle(at(34, -6), 4.5 * S, 24), 'edge'));
	add(path(INK, curve(at(26, 36), at(34, 42), at(42, 34), 5 * S), 'edge'));
	// his headset: an earcup over the ear, and the boom round to his mouth
	add(path(INK, line(at(-8, 20), at(44, 52), 6 * S)));
	add(outlined(SOFT, points(circle(at(-14, 6), 16 * S, 36)), 6));
	add(outlined(SOFT, points(circle(at(50, 54), 8 * S, 24)), 5));
	return shapes;
}


export function sarah(hx, hy, S) {
	const shapes = [], add = (...s) => shapes.push(...s.flat());
	const at = (dx, dy) => [hx + dx * S, hy + dy * S];
	// her sweater, a step lighter than Rose's: rounded shoulders, cut straight
	// across like a bust
	add(path(DEEP, poly(rounded(...at(-128, 84), 266 * S, 120 * S, 64 * S).map(([x, y]) => [x, Math.min(y, hy + 150 * S)]))));
	// neck, behind the chin
	add(outlined(WHITE, [at(-14, 40), at(20, 40), at(22, 98), at(-16, 98)]));
	// the high bun on the back of her head
	add(path(INK, ellipse([...at(-48, -46), 26 * S, 23 * S, -30])));
	// hair: a dark cap over the top and back of the head
	add(path(INK, ellipse([...at(-6, -10), 60 * S, 56 * S])));
	// face, with a pointed nose out of the profile
	add(outlined(WHITE, smooth([
		at(-12, -24), at(18, -42), at(44, -42), at(52, -16), at(54, 6), at(68, 20), at(54, 26),
		at(50, 44), at(30, 60), at(6, 64), at(-14, 54), at(-24, 30), at(-22, 4),
	])));
	// a dot of an eye and a small smile
	add(path(INK, circle(at(32, -4), 4.5 * S, 24), 'edge'));
	add(path(INK, curve(at(24, 36), at(32, 42), at(40, 34), 5 * S), 'edge'));
	return shapes;
}

// someone: no one in particular, a plain head and shoulders with no face
export function someone(hx, hy, S) {
	const shapes = [], add = (...s) => shapes.push(...s.flat());
	const at = (dx, dy) => [hx + dx * S, hy + dy * S];
	add(path(SOFT, poly(rounded(...at(-128, 84), 266 * S, 120 * S, 64 * S).map(([x, y]) => [x, Math.min(y, hy + 150 * S)]))));
	add(path(SOFT, poly([at(-14, 40), at(20, 40), at(22, 98), at(-16, 98)])));
	add(path(SOFT, ellipse([...at(4, 6), 60 * S, 64 * S])));
	return shapes;
}
