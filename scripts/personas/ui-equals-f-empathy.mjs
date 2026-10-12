// The empathy slide's three medallions, drawn from scratch and written to
// originals/ui-equals-f-empathy.svg for normalize-personas.mjs to tint and
// finish: Rose, Myron and Sarah, each as a head-and-shoulders bust
// (busts.mjs) in a round wash frame with an ink rim, side by side. The
// busts are cut a little inside the rim, so a gap of wash keeps their dark
// sweaters off it.
//   node scripts/personas/ui-equals-f-empathy.mjs
import { INK, WASH, poly, circle, path, write } from './draw.mjs';
import { LINE, points, rose, myron, sarah } from './busts.mjs';

const OUT = new URL('../../media/personas/originals/ui-equals-f-empathy.svg', import.meta.url);
const R = 110; // the frame's radius
const PITCH = 360; // from one medallion's centre to the next, across the 1024 canvas, wide
// enough apart for a column of text under each
const GAP = 8; // the wash between a bust and the rim
const S = R / 117; // the busts' scale: big enough that the frame cuts their shoulders

// a polygon cut to the disc at c of radius r: its edges split finely, and
// every point outside moved onto the rim, so a piece that crosses the rim
// follows it
const clip = (pts, [cx, cy], r) =>
	pts
		.flatMap((p, i) => {
			const q = pts[(i + 1) % pts.length];
			const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / 4));
			return Array.from({ length: n }, (_, k) => [p[0] + ((q[0] - p[0]) * k) / n, p[1] + ((q[1] - p[1]) * k) / n]);
		})
		.map(([x, y]) => {
			const d = Math.hypot(x - cx, y - cy);
			return d > r ? [cx + ((x - cx) * r) / d, cy + ((y - cy) * r) / d] : [x, y];
		});

const shapes = [];
[rose, myron, sarah].forEach((bust, n) => {
	const c = [512 + (n - 1) * PITCH, 512];
	// the rim and the wash behind the bust
	shapes.push(path(INK, circle(c, R + LINE, 144)), path(WASH, circle(c, R, 144)));
	// the bust, its head a little above the frame's centre
	for (const el of bust(c[0] - 0.06 * R, c[1] - 0.21 * R, S)) {
		shapes.push(el.replace(/ d="([^"]+)"/, (m, d) => ` d="${poly(clip(points(d), c, R - GAP))}"`));
	}
});

write(OUT, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">${shapes.join('')}</svg>\n`);
