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
           → media/personas/<scene>.svg     what index.html uses
```

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
- **Per-illustration settings.** `CUT_FOR` overrides the `CUT` settings for
  one illustration. Allana's finer trace uses thinner strips, for example.

## The visual language

These are the conventions the set has settled on. Match them:

| | |
|---|---|
| Faces | a dot of an eye (r ≈ 4), a pointed nose out of the profile, a small curved mouth. No brows, no cheeks. Sunglasses where the persona wears them. Faces from behind get nothing. |
| Hands | white, outlined; fingers as one zigzag line of rounded loops; a slimmer loop along the top for the thumb |
| Feet | trousers end at a clean hem; white outlined shoes, a pointed toe, a small heel |
| Floor | a grey strip under everything that stands (`floor()` in `draw.mjs`); none for top-down views |
| Furniture | tables end on the right, with no right-hand edge or leg; chairs are a dark or faded back, like Allana's |
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
   	<img class="persona-portrait" src="media/personas/<scene>.svg" alt="…" />
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
spreadsheet, a beam pulsing. Two things stand in the way today, and the first
animation needs to solve both:

1. **Names don't survive.** The normalize step drops every attribute but
   fill, `d` and `fill-rule`, so there's nothing to target. Let edit scripts
   tag shapes with `data-part="<name>"` (e.g. `steam`, `bolt`), and have
   `normalize-personas.mjs` carry `data-part` through to the output. Shapes
   that move together can then be wrapped in a `<g data-part>` in the output.
2. **Images can't be animated.** The scenes use `<img>`, which scripts can't
   reach into. Load the illustration inline instead: fetch the SVG and
   replace the `<img>` with it, keeping the `alt` as the SVG's `role="img"`
   and `aria-label`.

Then animate in `js/site.js`, beside the scroll choreography:

- **Triggers:** start each animation when its scene comes into view, with
  the same ScrollTrigger setup the scenes use.
- **Properties:** move only `transform` and `opacity`, with
  `transform-box: fill-box` so shapes turn and scale about themselves.
- **Feel:** keep it subtle and slow. These are paper pieces, so think of a
  gentle sway or a flutter, never a bounce.
- **Reduced motion:** honour `prefers-reduced-motion` the way `site.js`
  already does. No movement, with the still drawing as the end state.
- **Filters:** the cut-paper filters are expensive to repaint. Animate whole
  pieces, not their filtered edges, and check it stays smooth on a slow
  machine.

## Before you finish

- `npm run check` passes, and so does `npm run build` (the check runs first).
- You've looked at the finished illustration at full size, and close up
  wherever you edited.
- The scene's `alt` text matches the new drawing.
- `system.html` shows the illustration. It picks up any `.persona-portrait`
  in `index.html` by itself.
- If the change taught the set something new (a convention, a finish
  setting), add it to this skill's *visual language* table or to `DESIGN.md`.
