# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

"Your UI is not my UI", a talk built as one scrolling HTML page (`index.html`). It started life as a reveal.js clone, but none of reveal.js remains: the page is plain HTML/CSS plus GSAP, served and built by Vite.

## Commands

- `npm start` / `npm run dev`: Vite dev server on port 8000 (override with `--port`)
- `npm run build`: static build of `index.html` and `type-system.html` into `dist/`
- `scripts/cdp/*.mjs`: headless-Chrome verification scripts (beat navigation, cards, ranges, resize, mobile). They expect a dev server on port 8123 (`npx vite --port 8123`), e.g. `node scripts/cdp/nav-verify.mjs`.

## Structure

- `index.html`: the content. Acts are `main > section[data-act].act-panel`; each scene is a `section[data-scene]`; speaker notes live in `aside.notes` and feed the notes drawer.
- `js/site.js`: scroll choreography (GSAP ScrollTrigger), beat stops, keyboard navigation, hash sync, notes drawer, reduced-motion handling.
- `js/landscape.js`: seeded SVG line fields for the act openers and the title.
- `css/talk.css`: all styles and the type system; `css/reset.css` is the reset.
- `type-system.html`: renders every layout from the live `index.html` (fetched at runtime).
- `docs/plans/`: design and implementation notes for the scrollytelling build.

## Code style

- Tabs for indentation, single-quoted strings in JS; match the surrounding file.
