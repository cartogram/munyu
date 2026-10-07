# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

"Your UI is not my UI", a talk built as one scrolling HTML page (`index.html`). It started life as a reveal.js clone, but none of reveal.js remains: the page is plain HTML/CSS plus GSAP, served and built by Vite.

## Commands

- `npm start` / `npm run dev`: Vite dev server on port 8000 (override with `--port`)
- `npm run build`: `npm run check`, then a static build of `index.html` and `system.html` into `dist/`
- `npm run check`: fails if the deck, the theme tokens, the media names and the persona illustrations disagree (also runs in CI, `.github/workflows/system.yml`)
- `npm run personas`: regenerate `media/personas/*.svg` from `media/personas/originals/`
- `scripts/cdp/*.mjs`: headless-Chrome verification scripts (beat navigation, cards, ranges, resize, mobile). They expect a dev server on port 8123 (`npx vite --port 8123`), e.g. `node scripts/cdp/nav-verify.mjs`.

## Structure

- `index.html`: the content. Acts are `main > section[data-act].act-panel`; each scene is a `section[data-scene]`; speaker notes live in `aside.notes` and feed the notes drawer.
- `js/site.js`: scroll choreography (GSAP ScrollTrigger), beat stops, keyboard navigation, hash sync, notes drawer, reduced-motion handling.
- `css/talk.css`: all styles and the type system, including the act openers' grained gradients (one per act) and chapter numbers; the theme tokens (`--act-*`, `--ramp-*`) sit at the top of `:root`. `css/reset.css` is the reset.
- `system.html`: the live specimen — type, act colours, illustrations and every layout, built from `css/talk.css` and `index.html` at runtime.
- `DESIGN.md`: the design rules and how to add a persona, act or media file. Read it before changing the look.
- `scripts/personas/`: each persona illustration's edits (`<scene>.mjs`), the shared drawing helpers (`draw.mjs`) and tools to inspect and render SVGs (`tools/`). Use the `persona-illustration` skill to add, change or animate an illustration.
- `public/`: the favicon, the Apple touch icon and the share image, copied as-is to the site root. The share image is the title slide at 1200×630; regenerate it with `node scripts/cdp/og-image.mjs` (dev server on 8123) when the title slide changes.
- `docs/plans/`: design and implementation notes for the scrollytelling build.

## Code style

- Tabs for indentation, single-quoted strings in JS; match the surrounding file.

## Copy

- The talk's title is "Your UI is not my UI", in sentence case, everywhere: slides, `<title>`, meta tags, README, `package.json`.
- Every heading (act titles, scene `h2`s, UI labels) is sentence case: capitalise the first word, proper names and acronyms (AI, UI, API), nothing else.
