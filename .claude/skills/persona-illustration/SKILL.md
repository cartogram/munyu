---
name: persona-illustration
description: Add or change an illustration in the talk's persona set — from a trace the user supplies or from a description, drawn and edited as SVG in the set's cut-paper style, then tinted, finished and wired into a scene. Use when the user wants a new illustration, wants to change one (a face, hands, a chair, a cloud…), describes a scene to be drawn, or asks for an illustration to be animated.
---

# Persona illustrations

The talk's illustrations are one set: flat cut-paper scenes in each act's
colour. Read
`DESIGN.md` (*Persona illustrations*) first: it holds the rules. This skill is
the workflow.

## How the pipeline works

```
media/personas/traces/<scene>.svg      untouched source (a trace, or a drawing you write)
  └ scripts/personas/<scene>.mjs       that illustration's edits, by code
     → media/personas/originals/<scene>.svg
        └ scripts/normalize-personas.mjs   tint, ramp, crop, cut-paper finish
           → media/personas/<scene>.svg     the finished drawing
              └ scripts/personas/render.mjs  rendered once in headless Chrome
                 → media/personas/<scene>.webp   what index.html uses
                 → <scene>-768.webp, <scene>-1280.webp   its srcset's smaller copies
```

The deck shows the WebP, not the SVG: the cut-paper filters are too slow to
run while the slides scroll. `npm run personas` re-renders a WebP only when
its SVG changed, and `media/personas/rendered.json` lets `npm run check`
catch a stale one.

- `<scene>` is the `data-scene` the illustration sits in. `npm run check`
  enforces the name.
- **Never edit `originals/` or `media/personas/*.svg` by hand.** Change the
  edit script or the normalize settings, then regenerate:
  `node scripts/personas/<scene>.mjs && npm run personas`.
- `npm run personas:watch` with `npm start` regenerates on save and reloads
  the page.

### What the normalize step does, and why it matters when drawing

- **Colour by lightness.** Every colour snaps to a `--ramp-*` step of the act
  colour by lightness: black → ink, mid greys → deep and soft, near-white →
  wash and paper. Draw in greys (`INK`, `DEEP`, `SOFT`, `WASH`, `WHITE` in
  `draw.mjs`), never in the act colour.
- **Saturated colour is light.** A saturated, light colour (`LIGHT` in
  `draw.mjs`, the traces' yellow) becomes the accent step and is treated as
  light: no outline, grown over the ink. Use it for screens, beams and lamps.
- **Only fill and outline survive.** Each path keeps just its fill, its `d`
  and `fill-rule`. Strokes, gradients, opacity, `transform`, `<g>` and other
  attributes are dropped. Draw strokes as filled strips with `line`, `curve`
  and `outline`, and transform coordinates yourself.
- **The cut-paper finish.** The finish trims coloured pieces back, thickens
  ink into strips, wobbles edges and adds grain. Plan for it:
  - **Gaps:** keep white gaps between dark areas 6+ units wide, or they close
    up.
  - **Patches:** a white patch that hides something needs
    `data-finish="edge"`, so it keeps its exact size, and must reach 2–3
    units past what it hides. Otherwise the trim shows its outline.
  - **Fine lines:** small details and fine linework (eyes, numbers, grids)
    take `data-finish="edge"` to keep their drawn weight.
- **Fading a shape.** `data-opacity="0.6"` fades a shape, finish and all,
  without changing its ramp step (the bespoke slide's crowd of faded bubbles).
  It's the one exception to colour by lightness, so use it sparingly.
- **Per-illustration settings.** `CUT_FOR` overrides the `CUT` settings for
  one illustration. Amelia's finer trace uses thinner strips, for example.

## The visual language

These are the conventions the set has settled on. Match them:

| | |
|---|---|
| Faces | a dot of an eye (r ≈ 4), a pointed nose out of the profile, a small curved mouth. No brows, no cheeks. Sunglasses where the persona wears them. Faces from behind get nothing. |
| Hands | white, outlined; fingers as one zigzag line of rounded loops; a slimmer loop along the top for the thumb |
| Feet | trousers end at a clean hem; white outlined shoes, a pointed toe, a small heel |
| Floor | a grey strip under everything that stands (`floor()` in `draw.mjs`); none for top-down views |
| Furniture | tables end on the right, with no right-hand edge or leg; chairs are a dark or faded back, like Amelia's |
| Weather, screens | clouds as separate cut pieces in different tones, overlapping with a white edge; screens and beams as light |
| Pattern | prints as dots of a lighter tone straight on the dark (Rose's scarf), never a mid-tone base |
| Contrast | dark against dark always gets a white gap (leg against seat, sweater against chair) |

## Adding an illustration

1. **Agree the scene.** Settle which scene it goes in and what it shows,
   tied to the persona's notes in `index.html`. If the user names a scene
   that already has an illustration, ask whether to replace it or swap.
2. **Get a source**, in one of two ways:
   - **A trace the user provides:** copy it to `traces/<scene>.svg`, without
     its `<metadata>` (it embeds C2PA data).
   - **A description:** write the drawing yourself as
     `scripts/personas/<scene>.mjs` building from an empty 1024 × 1024 canvas
     (`traces/<scene>.svg` is then just `<svg viewBox="0 0 1024 1024"></svg>`).
     Compose it from big simple shapes in a strict back-to-front order:
     background pieces, furniture, figure, details. Keep it flat, with
     exaggerated proportions and few parts, like the references.
   For a person as a head-and-shoulders bust (an avatar, a medallion),
   reuse `scripts/personas/busts.mjs`: Rose, Myron, Sarah and an unnamed
   someone, used by `demo-two-people.mjs`.
3. **Write the edit script** with `scripts/personas/draw.mjs`
   (`poly`, `line`, `curve`, `circle`, `ellipse`, `outline`, `path`,
   `eachPath`, `under`, `over`, `floor`). Start each from a comment
   describing what it changes. Edits by path index go in one `eachPath` pass,
   because indices shift once anything is removed.
4. **Register it:** add `<scene>.svg` to `CUT_PAPER` in
   `normalize-personas.mjs`. Then, in `index.html`, inside the scene's
   `.persona` (wrapping the quote if the scene has none):
   ```html
   <div class="portrait-ground">
   	<img
   		class="persona-portrait"
   		src="media/personas/<scene>.webp"
   		srcset="media/personas/<scene>-768.webp 768w, media/personas/<scene>-1280.webp 1280w, media/personas/<scene>.webp 2048w"
   		sizes="(max-width: 699px) 50vw, min(42vw, 70vh)"
   		alt="…" width="2048" height="2048"
   	/>
   </div>
   ```
   The `alt` says what the person is doing, not what the drawing looks like.
5. **Regenerate and check:**
   `node scripts/personas/<scene>.mjs && npm run personas && npm run check`.
6. **Look before you say it's done** (see *Seeing your work*). Every edit
   gets a render. Check both the edited original and the finished
   illustration, because the finish changes edges.

## Changing an illustration

Find the shapes, change them in the edit script, regenerate, look.

- `node scripts/personas/tools/inspect.mjs <svg> [minSize] [x0,y0,x1,y1]`
  lists paths and their contours (`12.3` is path 12, contour 3) with fill
  and box.
- `node scripts/personas/tools/hit.mjs <svg> x,y …` shows which paths cover
  a point. `(hole)` means the page shows through. Traces are often one big
  ink sheet with holes, and many "white" areas are holes in it.
- To **remove** a shape: drop it by index, or paint over it (an `edge` patch,
  bigger than the shape).
- To **tint** a hole (a wheel, a window): put the fill `under` the trace.
  It then shows only through the hole. Use the hole's own contour from the
  trace for an exact fit; drawn circles never match a traced rim.
- To **recolour** a trace path: change its fill in `eachPath`.

## Seeing your work

Coordinates guessed from a downscaled render are routinely wrong by 10–20
units. Measure before you draw:

- `node scripts/personas/tools/crop.mjs <svg> <out.png> <x,y,w,h> [step]`
  renders a gridded close-up in the SVG's own units. Read it with the Read
  tool, place shapes against the grid, and crop again to confirm.
- `node scripts/personas/tools/compare.mjs <scene> <out.png>` puts the trace
  next to the finished illustration.
- Write PNGs to a scratch or temp directory, never into the repo.
- The user may watch the dev server instead. Don't send renders they didn't
  ask for, but always look at your own.

## Animation (GSAP)

The deck already runs GSAP (`js/site.js`), so illustrations can move: steam
drifting off a coffee, lightning flashing, cells filling in on Myron's
spreadsheet, a beam pulsing. Back to Sarah is the worked example: its
screen's lines write out, its rainbow comes out band by band, and the sun's
rays turn.

1. **Name the parts.** In the edit script, tag the shapes that move with
   `data-part="<name>"` (back-to-sarah.mjs has a `part()` helper).
   `normalize-personas.mjs` keeps each run of a part's shapes as a
   `<g data-part>` in the finished SVG.
2. **Inline the drawing.** Import the finished SVG with `?raw` and swap it
   for the `<img>` with `inlineArt()`, which keeps the `alt` as `role="img"`
   and `aria-label` and prefixes the filter ids with the image's first class.
   Give the `<img>` a class of its own first (`back-to-sarah-illustration
   persona-portrait`), or two inline drawings share a prefix and one uses
   the other's filters.
3. **Lift out what moves.** Any change inside an SVG repaints all of it,
   filters and all: a turning sun alone took a third of frames over 20ms.
   `layers()` moves the named parts into copies of the drawing laid exactly
   over it (or under it, for parts the drawing covers), and CSS composites
   each layer (`will-change: transform`), so only the small layers repaint.

Then animate in `js/site.js`, beside the scroll choreography:

- **Triggers:** scenes slide sideways inside a pinned card, so watch the
  drawing with an `IntersectionObserver`: play on entry, set it back on exit.
- **Properties:** move only `transform` and `opacity`. GSAP sets an SVG
  part's origin from its own box (`transformOrigin: '50% 50%'`); don't add
  `transform-box: fill-box` too, or the origin is applied twice.
- **Feel:** keep it subtle and slow. These are paper pieces, so think of a
  gentle sway or a flutter, never a bounce. A loop should be seamless (the
  sun's eightfold rays turn an eighth of a turn).
- **Reduced motion:** honour `prefers-reduced-motion`, and skip the lite
  deck: don't inline at all, so they keep the still WebP.
- **Check it:** compare idle frame times and `scripts/cdp/perf-scroll.mjs`
  with and without the animation.

## Before you finish

- `npm run check` passes, and so does `npm run build` (the check runs first).
- You've looked at the finished illustration at full size, and close up
  wherever you edited.
- The scene's `alt` text matches the new drawing.
- `system.html` shows the illustration. It picks up any `.persona-portrait`
  in `index.html` by itself.
- If the change taught the set something new (a convention, a finish
  setting), add it to this skill's *visual language* table or to `DESIGN.md`.
