# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

This is [reveal.js](https://revealjs.com), the HTML presentation framework, plus `react/`, a separate `@revealjs/react` package that wraps core reveal.js in React components. The two are versioned, tested, and built independently but live in one repo (`react` depends on core via `file:..`).

## Common commands

### Core (repo root)

- `npm start` / `npm run dev` — starts Vite dev server (serves `index.html`, `demo.html`, `test/*.html` from repo root)
- `npm run build` — full build: TS check, core bundle (`js/index.ts` → `dist/reveal.js`/`.mjs`), styles, and every plugin bundle (highlight, markdown, math, notes, search, zoom)
- `npm run build:core` — core bundle + styles only, skips plugin bundles (faster iteration on core)
- `npm run build:styles` — CSS/SCSS only
- `npm run build:es5` — build then transpile to ES5 (`scripts/build-es5.js`)
- `npm test` — runs `scripts/test.js`: boots a Vite server on port 8009 and runs every `test/*.html` file through QUnit via Puppeteer. To run a single suite, open that file directly, e.g. add a temporary `console.log`/`.only` in the target `test/test-*.html`, or point Puppeteer at `http://localhost:8009/test/test-scroll.html` after running `npm start`.
- `npm run package` — zip a distributable release (`scripts/zip.js`)

### React wrapper (`react/`)

- `npm run react:build` / `npm run react:test` / `npm run react:demo` from repo root, or `cd react && npm run build|test|test:watch|demo`
- Tests use Vitest + Testing Library + jsdom (`react/vitest.config.ts`, setup in `react/src/__tests__/setup.ts`). Run one file: `cd react && npx vitest run src/components/deck.test.tsx`.
- `reveal.js` is linked via `file:..`, so core changes are picked up without publishing.

## Architecture

### Core (`js/`)

`js/reveal.js` is the framework entry point: a large factory function (`export default function(revealElement, options) {...}`) that builds one `Reveal` instance. It holds all mutable presentation state (current indices, config, DOM cache, transition/autoslide state) in closure variables, and delegates most behavior to controller instances constructed with a reference back to `Reveal` itself — this lets multiple independent Reveal instances coexist on one page (see `test/test-multiple-instances.html`).

- `js/controllers/*.js` — one controller per concern, each instantiated as `new Controller(Reveal)` in `reveal.js`: `slidecontent` (slide DOM state), `fragments`, `backgrounds`, `overview`, `autoanimate`, `scrollview`, `printview`, `keyboard`, `touch`, `pointer`, `progress`, `controls`, `location` (URL/hash sync), `notes` (speaker view), `overlay`, `focus`, `jumptoslide`, `slidenumber`, `plugins` (see below).
- `js/components/playback.js` — small UI component (autoslide play/pause control).
- `js/config.ts` — `defaultConfig` object; the source of truth for all user-facing config options.
- `js/utils/` — `util.ts` (DOM/misc helpers), `device.ts` (feature/platform detection), `loader.ts` (script/dependency loading used by the plugin system), `color.ts`, `constants.ts` (selectors, blacklists).
- Config precedence when a presentation starts (see `initialize()` in `js/reveal.js`): defaults → `Reveal.configure()` calls before init → constructor options → `initialize()` options → URL query params.
- `js/reveal.d.ts` — hand-maintained public type surface; `js/index.ts` is the package entry re-exporting the default-export factory.

### Plugins (`plugin/`)

Each subdirectory (`highlight`, `markdown`, `math`, `notes`, `search`, `zoom`) is bundled independently and exported from `package.json` as `reveal.js/plugin/<name>`. Plugins loaded via `js/controllers/plugins.js` are the standard extension mechanism — they're plain objects with an `id` and lifecycle hooks, registered via `Reveal.initialize({ plugins: [...] })`.

Newer plugins (e.g. `markdown`) are mid-migration to TypeScript: `index.ts` defines typed wrapper/exports while `plugin.js` still holds the runtime implementation, imported with a `@ts-expect-error` escape hatch. Don't "fix" that error by rewriting the runtime file unless doing the full JS→TS migration for that plugin.

Each plugin has its own `vite.config.ts` extending the root config's `appendExtension` helper; the root `npm run build` chains all of them.

### React wrapper (`react/`)

Full guidance lives in `react/AGENTS.md` — read it before touching `react/src/`. Key points:

- `Deck` (`react/src/components/deck.tsx`) owns the single `Reveal` instance per mount, config application, event wiring, and structure-level `sync()` calls. `sync()` is expensive and must only run when the slide *structure* changes (added/removed/reordered/regrouped), never for ordinary content updates.
- `Slide`, `Stack`, `Fragment`, `Code`, `Markdown` are the other public components (`react/src/components/`); shared logic is in `react/src/utils/slide-attributes.ts` and `react/src/utils/markdown.ts`.
- The React `Markdown` component reimplements the core `plugin/markdown` behavior (separators, notes, `.slide:`/`.element:` comment attributes) rather than depending on the plugin bundle — keep the two in sync intentionally, don't let them silently diverge.
- Tests are colocated (`*.test.tsx`) next to the component they cover; add/update them in the same change whenever sync/configure/markdown/highlight behavior changes.

## Code style

- Tabs for indentation, single-quoted strings in JS/TS (enforced loosely across the codebase; match the surrounding file).
- Plugins must not be submitted as core PRs — they belong in their own repos per `.github/CONTRIBUTING.md`; this only applies to net-new third-party plugins, not the first-party ones already in `plugin/`.
