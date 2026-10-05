# Handoff: the branching demo, in the deck

Paste everything below the line into the next session.

---

You're picking up a talk deck mid-build. The job: **replace the placeholder
"Demo: same task, two people" scene with the branching demo**, restyled to the
deck and stepped by the deck's scroll/beat navigation. Nothing has been built
yet. Settle the open questions below with me, then build it.

## Where to work

- Worktree: `/Users/matt/src/Cartogram/munyu/.claude/worktrees/demo`, branch
  `worktree-demo`, based on `main` at `49588d7`. It's a git worktree: stay in
  it, don't `cd` to the main checkout.
- Read `CLAUDE.md` and `DESIGN.md` first. The deck is plain HTML/CSS plus GSAP
  (`index.html`, `css/talk.css`, `js/site.js`), served and built by Vite:
  `npm start` (port 8000), `npm run build`.
- `npm run check` must pass, and is also the first step of `npm run build`.
  Cloudflare deploys `main`, and every branch gets a preview build.
- The user watches the dev server. Don't send them screenshots they didn't
  ask for, but do look at your own work: `scripts/cdp/cdp.mjs` drives
  headless Chrome (see the `scripts/cdp/*.mjs` checks).

## The scene to replace

`index.html`, act `personalization-over-adaptability`, scene
`data-scene="demo-two-people"`, headed *Demo: same task, two people*. It
currently holds two placeholder `.demo-panel`s (Person A, Person B). Its notes
say to swap in "the real split-screen animation": the same task (the DeepL
translation UI) generated as two completely different interfaces for two very
different people. `js/site.js` reveals the two panels one per ↓
(`STEPPED_SCENES['demo-two-people']`). The `.demo-panels` / `.demo-panel`
styles live in `css/talk.css`, and the next scene's notes
(`ui-equals-f-intent-empathy`) mention moving content depending on the demo.

## The source: the branching demo

The demo is a standalone page from the still-open
**PR #4** (`theme/branching-demo-light`), file `demo-branching.html`. Get it
with:

```sh
git fetch origin theme/branching-demo-light
git show origin/theme/branching-demo-light:demo-branching.html
```

(PR #5 deleted it from `main` while stripping reveal.js. PR #4 still restyles
the file and conflicts with `main`. Once this work lands, PR #4 can be closed.)

What it is: one 1000 × 680 SVG, with an "Expand" button and CSS
keyframes plus `setTimeout`s for the motion.

- **Top:** the shared action, *"Action: I'd like to translate this text"*.
- **Two isometric "card-stock" UI plates,** top face plus two shaded side
  faces:
  - **Rose (left):** a translator UI, EN → DE text panels.
  - **Myron (right):** a voice-only UI, a mic with pulsing rings, waveforms
    and "Listening…".
- **On Expand,** four context layers spring down beneath each plate, one
  every 550 ms:
  1. *Capabilities & preferences*: Rose "Prioritize readability", Myron
     "Prioritize speech"
  2. *User context*: "On the move, low light" / "Hands occupied"
  3. *Memory & history*: "Translated 40+ times" / "Frequent voice user"
  4. *+ More*: dashed and muted, no example
- **Shared labels** for each layer sit between the stacks.
- **A thread** (a breadboard-style trace) draws down each stack from the UI,
  detouring to "pin" the layer-2 and layer-3 examples. It stops at layer 3.
- **Geometry:** isometric matrix `matrix(0.86603,0.5,-0.86603,0.5,cx,cy)`,
  `cx` 220 (Rose) and 780 (Myron), layers 66 px apart from `cy` 240. The
  plate paths are precomputed in its script.
- **Style:** a blue ink palette, monospace uppercase labels, a dot grid and a
  frame. None of that fits the deck any more.

An older, darker version had a third "generic" stack that slid in from the
right; the current one has two.

## The plan so far (proposed, not yet agreed with the user)

- **Inline SVG:** move the demo into the scene as inline SVG, like *Today's
  model* (`data-scene="todays-model"` in `index.html`: an inline SVG with
  `data-piece` groups, coloured with `var(--act-color)` / `var(--muted-color)`).
- **Restyle to the deck:**
  - colour: the act's colour (`--act-color`) and its ramp (`--ramp-*`
    mixes, see the tokens at the top of `css/talk.css`) instead of the blue;
  - type: the deck's fonts and meta style instead of monospace;
  - remove the dot grid, the frame and the button.
- **Step it with the deck:** register the scene in `STEPPED_SCENES` in
  `js/site.js` with its own steps function, like `todaysModelSteps`. The two
  UIs are there on arrival; each ↓ then springs one layer under both plates,
  with its shared label, examples and thread segment. That's four steps.
- **Motion:**
  - drive it with GSAP tweens on the act timeline instead of CSS keyframes
    and timers, so scrubbing backwards undoes it cleanly;
  - honour `reduceMotion` the way `todaysModelSteps` does (fade in place, no
    spring);
  - the mic's pulsing rings can stay an ambient CSS loop, off under
    `prefers-reduced-motion`.
- **Clean up:**
  - delete the `.demo-panel(s)` markup and CSS if nothing else uses them;
  - rewrite the scene's speaker notes;
  - check the next scene's notes.
- **Check it:**
  - `npm run check` and `npm run build`;
  - the existing headless checks still pass, in particular
    `scripts/cdp/nav-verify.mjs`, because adding steps changes the beat
    count;
  - phones (< 700 px): the scene reads as a column there.

## Open questions to settle with the user first

1. **Personas:** keep Rose and Myron, or use the scene's Person A/B? The
   personas in the deck (`user-research` act) are Melody, Matthew, Sinead,
   Allana, Rose and Myron. A *(stressed, dark backgrounds, subway, one hand,
   barometric headache)* reads like Sinead plus Rose, and B *(tremor,
   keyboard-first)* like none of them exactly.
2. **The UIs on the plates:** the DeepL task is translation. Keep a
   translator and a voice UI, or design two UIs that fit the chosen personas
   (e.g. calm and dark for A, big keyboard-first targets for B)?
3. **Order:** do the UIs appear first and then the layers explain them (as
   now), or do the layers build up first and the UI arrive last, as their
   result?
4. **Illustrations:** should the persona illustrations
   (`media/personas/<scene>.svg`) appear beside each stack? The
   `persona-illustration` skill covers adding or animating them.
5. **Layer count:** is four layers, *+ more* included, still right?
