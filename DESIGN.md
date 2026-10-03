# Design

The design rules for *Your UI is not my UI*, and why they are the way they are.

This file holds no values. Every colour, size and weight lives in one place,
and the rest of the repo reads it from there:

| What | Source of truth | Shown live in |
|---|---|---|
| Act colours (`--act-*`), illustration ramp (`--ramp-*`), fonts, type styles | `css/talk.css` | `system.html` |
| Acts, scenes, personas and which illustration each uses | `index.html` | `system.html` |
| Persona illustrations | `media/personas/originals/` → `npm run personas` → `media/personas/` | `system.html` |

`system.html` is the specimen. It styles every sample with the deck's own CSS
and builds its act colours, illustrations and slide templates from
`index.html` when it loads. To check a value, open the page; don't copy it here.

`npm run check` fails when these sources disagree. It runs on every pull
request (`.github/workflows/system.yml`) and as the first step of
`npm run build`, so an out-of-sync deploy fails. It catches:

- an act with no colour token, or a colour under AAA contrast
- a token that belongs to no act
- a slide template that names a scene that no longer exists
- a media file that's missing or isn't named for its scene (see *Media*)
- an illustration with no original, or one out of date with the tokens

## Media

Every file the deck uses is named for the scene it sits in, so you can
tell from the name where it's used:

- `media/<scene>-<what>.<ext>`: screencasts, clips, logos. For example,
  `media/rose-family-settings.mp4` is the clip in the `rose` scene.
- `media/personas/<scene>.webp`: the persona illustration for that scene,
  rendered from the finished `media/personas/<scene>.svg`, which is
  generated from `media/personas/originals/<scene>.svg`.

## Principles

**Presented from, not read.** The page is a live deck driven by keyboard or
clicker. Reading it as a scrolling page comes second. Every scene is a frame
of at least one viewport.

**One colour per act.** All of an act's text, rules, diagram strokes and
illustrations use its one colour on white. The colours are one family: the
same OKLCH lightness and chroma, varying only in hue. Every one passes WCAG
AAA (7:1) on white, so any of them can carry body text. A talk about
accessibility can't fall short of this.

**Two typefaces.** Aileron (sans) for titles, body, lists and meta. Libre
Baskerville (serif) for scene headlines and quotes. There's one italic, the
sub-meta. `<em>` stays upright.

**Slide units.** Everything inside a slide is sized in `--u`, one pixel of a
1920 × 1080 canvas scaled to the window. A slide keeps its proportions and
line breaks at any size. The chrome and the notes drawer stay in `rem`.
Phones get a fixed scale and read the deck as a column.

## Persona illustrations

Each persona scene is one frame that never scrolls. Name, lede, a cut-paper
divider and the interview quote sit centred in one half, and one
illustration of that person's setup fills the other: text left by default,
illustration left with `class="is-flipped"` on the scene. Phones stack the
text above the illustration. A clip shows as a turning "Play video" ring in
the slide's top-right corner. The illustrations form one set:

- **In the act's colour, as steps of a shared ramp.** Lightness maps to a
  ramp step, from ink through to paper. Saturated colours (screens, light)
  become the accent step, which keeps each scene's focal point. There are no
  gradients and no transparency.
- **At a common scale.** Each drawing is cropped to a square with equal
  padding, its floor on the bottom edge.
- **Straight on the card.** There's no ground or frame behind them.
- **Described.** Every illustration has `alt` text saying what the person is
  doing, not what the drawing looks like.

- **Cut paper, one at a time.** The illustrations listed in `CUT_PAPER` in
  `scripts/normalize-personas.mjs` get a collage finish.
  Lines become cut strips of uneven weight,
  edges are rough, and coloured pieces carry a grain. Light (beams, screens)
  isn't paper, so it shows no outline. Small details keep thin lines. The `CUT`
  table holds every setting. Run `npm run personas:watch` alongside
  `npm start` to see changes as you save.
- **Edited traces.** When a drawing needs changing, as Melody's did, the
  untouched trace sits in `media/personas/traces/` and
  `scripts/personas/<name>.mjs` applies the edits to it, writing
  `originals/<name>.svg`. The drawing helpers for those scripts are in
  `scripts/personas/draw.mjs`, and the tools for finding and checking shapes
  are in `scripts/personas/tools/`. The `persona-illustration` skill
  (`.claude/skills/`) walks through adding or changing an illustration, and
  covers animating one with GSAP.

### Adding or changing a persona

1. Put the traced SVG in `media/personas/originals/<name>.svg`.
2. In the persona's scene in `index.html`, inside `.persona`, add:
   ```html
   <div class="portrait-ground">
   	<img class="persona-portrait" src="media/personas/<name>.webp" alt="…" />
   </div>
   ```
3. Run `npm run personas`. It writes `media/personas/<name>.svg` in the
   colour of the act the scene sits in, then renders it to
   `media/personas/<name>.webp` in headless Chrome
   (`scripts/personas/render.mjs`). The deck shows the WebP: the cut-paper
   finish is SVG filters that are too slow to run while the slides scroll.
   `media/personas/rendered.json` records which SVG each WebP came from, so
   the check catches a stale one.
4. Run `npm run check`. The illustration then shows up in `system.html` on
   its own.

Moving a scene to another act, or changing an act colour or ramp step, needs
only step 3. The check fails until you do it.

### Adding an act

Add the `section[data-act]` to `index.html`, then in `css/talk.css` add an
`--act-<id>` token and an `.act-panel[data-act='<id>']` rule. The check
lists whatever is missing.

## Slide templates

Every scene uses one of the layouts in `system.html` → *Slide templates*
(title, act opener, statement, headline + body, headline + list, persona,
side by side, demo panels, Q&A, and so on). Each entry there points at a real
scene in `index.html`. Prefer an existing template to a new layout. If you
add one, point a template entry at a scene that uses it.

**Side by side** is the persona layout used for anything else: the scene's
`<h2>` and `<h4>`, then a `.persona` holding a `<p>` (in the quote's place)
and a `.portrait-ground` frame holding the media, such as a diagram. Text
sits left and media right; `class="is-flipped"` swaps them.
