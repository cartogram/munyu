# Handoff: act-panel transitions — design refinement

Paste everything below the line into the next session.

---

You're picking up a scrollytelling page mid-design. The mechanics are partly built; I want to **refine the design of the act-to-act transition before building more**, then implement whatever we settle on. Start with design exploration and ask me questions — don't jump straight to code.

## Where to work

- Worktree: `/Users/matt/src/Cartogram/munyu/.worktrees/making-software-theme`, branch `theme/making-software-accessibility-talk`. It's a git worktree — stay in it, don't `cd` to the main checkout.
- The page: `index.html` (inline `<style>` theme + markup) and `js/site.js` (all GSAP/ScrollTrigger behavior). Vite dev server: `node_modules/.bin/vite --port 8123 --strictPort`.
- GSAP 3.15.0, core + ScrollTrigger only (no premium plugins — see non-goals in the design doc).

## What the page is

A talk ("Your UI is not my UI", on AI and accessibility) converted from a reveal.js deck to one long scrolling page. `<main>` holds 8 acts (`section[data-act].act-panel` > `div.act-panel-inner` > `section[data-scene]`), 35 scenes total:

| # | act | scenes | notes |
|---|---|---|---|
| 1 | hypothesis | 3 | ~940px tall |
| 2 | user-research | 8 | ~3070px |
| 3 | limits-of-adaptability | 2 | contains **"Today's model"** — pinned, staged SVG diagram |
| 4 | personalization-over-adaptability | 4 | contains **"Demo: same task, two people"** — pinned scrub, panels slide in from L/R (≥700px only) |
| 5 | empathy-is-our-point | 3 | ~480px |
| 6 | launching-is-creating | 8 | ~2340px |
| 7 | closing | 3 | ~610px |
| 8 | backup-qa | 4 | last act, excluded from transition |

Viewport used for testing: 1280×800.

## Read these first

1. `docs/plans/2026-09-28-gsap-scrollytelling-design.md` — original design: blueprint theme, baseline fade-up, the two pinned scenes, notes drawer, non-goals.
2. `docs/plans/2026-09-29-act-panel-recede-and-keyboard-nav.md` — the plan that was just executed (Tasks 1–4 done, 5 stopped, 6 not started).
3. `git log -6` — commit messages record why things are the way they are (notably `df31b23` on flex vs pin-spacers, and `cfb2242` on keyboard nav).

## Done and committed

- `bcc72c9` `scripts/content-inventory-scoped.mjs` — content-parity tool (see constraints).
- `cddbf57` `.act-panel` / `.act-panel-inner` wrapper markup; verified pixel-identical to before.
- `ea4eaa5` 8-color per-act accent palette via `--act-accent` (headings, blockquote borders, list markers). Colors: hypothesis `#002ef4`, user-research `#c30063`, limits `#a30000`, personalization `#0a7d3c`, empathy `#6b21d8`, launching `#a84400`, closing `#1a1a1a`, backup-qa `#007a72`. Global chrome (dot grid, corner ticks, notes toggle) intentionally stays cobalt.
- `cfb2242` Keyboard nav (arrows) with an interactive-focus guard. **Deviates from the plan on purpose:** targets are computed from scene positions at keypress time (`sceneScrollTop` = rect top + scrollY − gsap `y`), not from the notes drawer's center-line triggers — those skipped scenes and got stuck. Also, `scrollIntoView` measures *transformed* boxes, so anything that transforms scenes/acts (scale, yPercent) will throw targets off. Keep that in mind for any transition design.

## Uncommitted: the recede attempt (Task 5) — and why it failed

`js/site.js` (+39 lines at the end) and `index.html` (+8, `overflow: hidden` on `.act-panel` and `.act-panel-inner`) hold a faithful port of the GreenSock CodePen **"Slides Pinning – Overscroll Solution"** — https://codepen.io/GreenSock/pen/bGRdvMy. Reference JS as validated against the pen:

```js
var panels = gsap.utils.toArray(".section");
panels.pop();
panels.forEach((panel, i) => {
	let innerpanel = panel.querySelector(".section-inner");
	let panelHeight = innerpanel.offsetHeight;
	let windowHeight = window.innerHeight;
	let difference = panelHeight - windowHeight;
	let fakeScrollRatio = difference > 0 ? (difference / (difference + windowHeight)) : 0;
	if (fakeScrollRatio) panel.style.marginBottom = panelHeight * fakeScrollRatio + "px";
	let tl = gsap.timeline({ scrollTrigger: {
		trigger: panel, start: "bottom bottom",
		end: () => fakeScrollRatio ? `+=${innerpanel.offsetHeight}` : "bottom top",
		pinSpacing: false, pin: true, scrub: true } });
	if (fakeScrollRatio) tl.to(innerpanel, {yPercent: -100, y: window.innerHeight, duration: 1 / (1 - fakeScrollRatio) - 1, ease: "none"});
	tl.fromTo(panel, {scale: 1, opacity: 1}, {scale: 0.7, opacity: 0.5, duration: 0.9}).to(panel, {opacity: 0, duration: 0.1});
});
```

Verified results (headless Chrome, measured + screenshots in `scripts/cdp/shots/`):

1. **Short acts recede nicely** (`task5-hyp-mid.png`): hypothesis scales to ~0.79 and fades while the next act rises. This is the feel I'm after.
2. **Tall acts go blank for long stretches.** ~3,700px of scrolling shows only the dot grid (user-research 1,900px — `task5-ur-50.png`; launching-is-creating 1,000px; smaller in limits and personalization — `task5-limits-recede-60.png`). Cause: the pen presumably assumes a viewport-height card with internally scrolling content; here acts are natural-height, so by `start: "bottom bottom"` the content has already scrolled past and the fake-scroll phase translates it further into empty space. Page height also grew 12,369 → 17,760px from the added margins.
3. **Both nested pins break, same root cause.** The recede's `fromTo` renders immediately, so every `.act-panel` carries a non-`none` transform from page load. A transformed ancestor becomes the containing block for `position: fixed`, so ScrollTrigger's pinned scenes position relative to the act, not the viewport:
   - "Today's model" pins at left 580 instead of 290 (the act's own left offset doubled) and is clipped by `overflow: hidden` (`task5-tm-pre5.png` vs `task5-tm-post5.png`, `task5-tm-entered.png`).
   - "Demo" disappears mid-scrub (top −1112px, `task5-demo-50.png`). Its pin (scroll ~9985–10485) also sits *entirely inside* its act's recede range (~9900–11413), so it overlaps the outer animation in time, not just in DOM.
   - "Today's model" pin ends before its act's recede starts, so only the offset/clipping bites there.

Decide with me whether to keep, rework, or revert this uncommitted code.

## The design questions I want to work through

- **What should the act boundary feel like?** Options on the table (add others): (a) recede-only — keep the scale/fade, drop the fake-scroll phase, play it over the last ~1 viewport of each act; (b) viewport-height cards with internally scrolling content, closer to the pen; (c) something lighter that doesn't pin whole acts at all (e.g. only the act's *last scene* recedes, or a divider moment). Weigh each against: tall acts, the two nested pins, keyboard nav, reduced-motion, mobile.
- **Nested pins:** candidate fixes to evaluate, not assume — `pinReparent: true` on the inner pins (moves the pinned element to `<body>` while pinned, escaping transformed ancestors), `pinnedContainer` on triggers inside a pinned act, avoiding any transform on `.act-panel` until its recede actually starts (`immediateRender: false` / `clearProps`), or restructuring so inner and outer pins never overlap in time.
- **Accent palette:** does one bold color per act read well in practice? Closing is near-black (`#1a1a1a`) — intentional finale or muddy?
- **Reduced motion:** nothing respects `prefers-reduced-motion` yet — ironic for an accessibility talk. Use `gsap.matchMedia()`.

## Pre-existing issues found (not caused by this work, not fixed)

- `aside.notes` text renders inline on the page (it should be hidden and only shown in the notes drawer).
- `h2`s render at body text size — no heading scale in the theme.
- After clicking the notes toggle, the button keeps focus, so arrow-key nav is suppressed until you click elsewhere (a side-effect of the plan's BUTTON guard).

## Constraints (non-negotiable)

- **Content parity:** any change touching `index.html` must end with an empty diff:
  ```bash
  node scripts/content-inventory-scoped.mjs index.html > /tmp/now.json
  diff <(jq -S '[.[] | {headings, paragraphs, listItems, blockquotes, notes, media}]' scripts/cdp/act-panel-plan-baseline.json) \
       <(jq -S '[.[] | {headings, paragraphs, listItems, blockquotes, notes, media}]' /tmp/now.json)
  ```
  Use the *scoped* script, not `scripts/content-inventory.mjs` (it double-counts `data-act` wrappers).
- Don't break the two nested pinned scenes, the baseline per-scene fade-up, the notes drawer, keyboard nav, or the <700px demo fallback.
- Verify with screenshots/measurements, not "the code looks right". Kill any Chrome/Vite you start before moving on.
- Root-cause pin interaction bugs before fixing — no trial-and-error patching.
- Commit per logical change; end commit messages with:
  ```
  🤖 Generated with [Claude Code](https://claude.com/claude-code)

  Co-Authored-By: Claude <noreply@anthropic.com>
  ```

## Tooling

- `chromium-cli` and Playwright's browser aren't available. Use `scripts/cdp/` (untracked, copied from the previous session): `cdp.mjs` drives headless system Chrome over CDP with Node's native WebSocket (`launch`, `goto`, `eval`, `key`, `click`, `scrollTo`, `shot`; kills Chrome on exit). `st.mjs` exposes the page's own ScrollTrigger instance as `window.__ST` (test-side only) plus act-trigger and visible-content probes. `kbd.mjs` has settle/press helpers. `task4-verify.mjs`, `task5-step4.mjs`, `task5-step5.mjs` are the previous verification runs — `task5-step5.mjs` includes a whole-page blank-screen scan worth re-running after any transition change.

## Skills & references

- **GSAP official skills** (GreenSock), installed locally at `~/.claude/plugins/marketplaces/gsap-skills/skills/` — load `gsap-scrolltrigger` (pinning, scrub, pinSpacing, pinType), `gsap-timeline` (sequencing/position parameter), `gsap-core` (`gsap.matchMedia()` for reduced-motion/responsive), `gsap-performance`. If they aren't loaded as skills in your session, read their `SKILL.md` files directly. Note they don't cover `pinReparent` / `pinnedContainer` — use the docs below for those.
- ScrollTrigger docs (pin, pinReparent, pinnedContainer, pinSpacing, refresh order): https://gsap.com/docs/v3/Plugins/ScrollTrigger/
- Common ScrollTrigger mistakes (nesting, creation order, pin gotchas): https://gsap.com/resources/st-mistakes/
- Transition inspiration: GreenSock "Slides Pinning – Overscroll Solution" — https://codepen.io/GreenSock/pen/bGRdvMy
- Visual theme inspiration: https://makingsoftware.com (blueprint/technical-manual look — dot grid, cobalt ink, Departure Mono, corner ticks, plate frames).
- Superpowers skills that fit this work: `superpowers:brainstorming` (start here for the design refinement), `superpowers:writing-plans`, `superpowers:systematic-debugging` (for pin interactions), `superpowers:verification-before-completion`.
