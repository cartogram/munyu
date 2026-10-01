# GSAP scrollytelling conversion — design

Date: 2026-09-28
Branch: `theme/making-software-accessibility-talk`

## Goal

Convert `index.html` from a reveal.js slide deck into a single long-scroll,
GSAP-animated page, keeping the existing blueprint theme (dot grid, cobalt
ink, Departure Mono, Helvetica) and losing none of the talk's content.
`accessibility-talk.html` stays as-is — a reveal.js deck — as the live
presentation fallback. This is a full replacement of `index.html` only.

## Non-goals

- No change to `accessibility-talk.html` or the reveal.js core/plugins it
  depends on.
- No premium GSAP plugins (SplitText, ScrollSmoother) — core GSAP +
  ScrollTrigger only.
- No real mockups for the "Demo: same task, two people" scene yet — it
  stays a styled placeholder; only the pin/scroll mechanics get built now.
- No autoplay-on-scroll for existing `<video>` elements — controls stay
  manual.

## Architecture

**New/changed files:**

- `index.html` — rewritten markup: `<main>` containing one
  `<section data-scene="...">` per current slide, grouped under
  `<section data-act="...">` wrappers matching the deck's 7 thematic
  blocks. Drops all reveal.js-specific tags (`dist/reveal.css`,
  `dist/reveal.js`, plugin scripts, `Reveal.initialize(...)`). Keeps the
  existing inline theme `<style>` block unchanged (it's presentation-only,
  no reveal.js coupling).
- `js/site.js` (new ES module) — GSAP + ScrollTrigger registration and all
  scroll-driven behavior: baseline scene reveals, the pinned diagram
  sequence, the pinned demo scene, `matchMedia` mobile fallback, and the
  notes-drawer scene-tracking logic.
- `package.json` — add `gsap` as a real dependency; loaded via
  `<script type="module" src="/js/site.js">`, bundled by the existing Vite
  setup with no config changes needed.
- Old reveal.js files remain untouched in the repo (still power
  `accessibility-talk.html`).

## Content model

Every current `<section>` maps 1:1 to a `data-scene` section. Each keeps:

- Its heading(s) (`h2`/`h3`/`h4`) and body content (`p`, `ul`, `blockquote`,
  media) verbatim.
- Its speaker notes as **real DOM**, not comments:
  `<aside class="notes" hidden>...</aside>`, sourced from the current
  `<aside class="notes">` content. This is the single source of truth the
  notes drawer reads from — no duplication.

**Content-parity safeguard:** before considering the conversion done,
extract a structured inventory (every heading, paragraph, list item,
blockquote, notes block, and media `src`) from the current `index.html`
and diff it against the same extraction from the new markup. Any gap gets
fixed before marking a batch complete — this is a required verification
step, not a nice-to-have.

**Dropped (reveal.js plumbing only, no content):** `r-stretch` classes,
fragment/stack classes, progress bar, slide-number chrome,
`data-transition-speed`, the `Reveal.initialize()` config block.

## Animation choreography

**Baseline (most scenes):** fade + 24px slide-up on heading/body, via
`ScrollTrigger` firing when the scene's top crosses ~75% viewport height.
`toggleActions: "play none none reverse"` so it replays on scroll-back.
No pin, no scrub — cheap and consistent.

**Section dividers** (the 7 thematic block headers, e.g. "User Research"):
same baseline treatment, no special pinned moment — a quick visual
breather, styled as an uppercase mono full-width label.

**Three scenes get extra treatment on top of the baseline:**

1. **"Today's model" diagram** — short pin while the SVG's dashed boxes
   animate in sequence (screen reader → voice control → zoom → dark mode →
   base block) via a single GSAP timeline with staggered children. Pin
   releases once the sequence finishes.
2. **"Demo: same task, two people"** — the signature pinned moment. Pins
   the viewport; Person A panel enters from the left, Person B from the
   right (or equivalent divergence), with `scrub: true` so progress tracks
   scroll position directly rather than autoplaying. Content stays the
   existing placeholder copy — only the mechanic is new.
3. **Title/hero** — baseline treatment only, nothing extra (explicitly
   descoped during design).

## Notes drawer

- Fixed bottom-right toggle button: `[ NOTES ▸ ]`, styled in the existing
  blueprint chrome (hairline border, cobalt ink, mono font).
- Clicking slides out a right-edge drawer via plain CSS
  `transition: transform` (no GSAP needed for a simple click-toggle).
- While open, the drawer shows the notes for whichever scene is currently
  in view. Each scene's existing `ScrollTrigger` instance updates a
  "current scene" pointer on enter; the drawer re-renders its content from
  that scene's `<aside class="notes">` DOM on change.

## Layout & responsive

- Content column caps at a comfortable reading width (~640–700px) for
  prose, matching makingsoftware.com; diagram/demo scenes can run wider.
- Generous vertical rhythm between scenes rather than forced 100vh
  slide-height blocks — sections are as tall as their content plus
  consistent margin.
- Dot grid, corner ticks, hairline frame stay fixed-scale decorative
  chrome — no special responsive handling needed.
- Mobile fallback for the pinned demo scene: below ~700px,
  `ScrollTrigger.matchMedia()` disables the pin and side-by-side layout,
  falling back to the baseline fade-up with panels stacked vertically.

## Verification

- Structured content-inventory diff (headings/paragraphs/list
  items/blockquotes/notes/media) between old and new markup — required
  before calling any implementation batch done.
- Manual scroll-through in a real browser (not just headless screenshot)
  to confirm pin/scrub feel isn't janky, since that's inherently a feel
  judgment headless tooling can't make.
- Mobile-width check (resize/matchMedia breakpoint) to confirm the demo
  scene's fallback actually engages and doesn't leave a half-pinned state.
