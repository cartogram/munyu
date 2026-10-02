# Your UI is not my UI

A talk by Simon Lenz & Matthew Seccafien, built as a single scrolling page.

```sh
npm install
npm start        # dev server on http://localhost:8000
npm run build    # static build into dist/
```

- `index.html` — the talk: every scene, with speaker notes in `<aside class="notes">`
- `system.html` — type, act colours, illustrations and every layout, rendered live from `index.html`
- `DESIGN.md` — the design rules; `npm run check` keeps the deck and the system in sync
- `css/talk.css` — all styles; `css/reset.css` — the reset it sits on
- `js/site.js` — GSAP ScrollTrigger scroll choreography, beat navigation, notes drawer
- `js/landscape.js` — the generated line fields on the act openers
- `media/`, `fonts/` — assets (`fonts/marjoree-trial/` is a trial licence and stays out of git)
- `scripts/cdp/` — headless-Chrome checks; run the dev server on port 8123 first (`npx vite --port 8123`), then e.g. `node scripts/cdp/nav-verify.mjs`
- `docs/plans/` — design and implementation notes
