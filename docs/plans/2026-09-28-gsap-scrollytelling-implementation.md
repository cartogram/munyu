# GSAP Scrollytelling Conversion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace `index.html`'s reveal.js slide deck with a single long-scroll, GSAP-animated page that preserves every piece of content (headings, body copy, list items, blockquotes, media, speaker notes) from the current deck, per `docs/plans/2026-09-28-gsap-scrollytelling-design.md`.

**Architecture:** New semantic markup (`<main><section data-scene>...`) replaces the reveal.js `<div class="reveal"><div class="slides">` structure in `index.html`. A new `js/site.js` ES module (bundled by the existing Vite setup) drives all scroll behavior via GSAP + ScrollTrigger: a baseline fade/slide-up for most scenes, a short pinned sequence for the "Today's model" diagram, a full pinned scrub for the "Demo: same task, two people" scene, and scene-tracking for a notes drawer. `accessibility-talk.html` and all reveal.js files are untouched. A Node script (`scripts/content-inventory.mjs`) extracts a structured content inventory from both the old and new markup so parity can be diffed mechanically rather than eyeballed.

**Tech Stack:** Vite (existing), GSAP + ScrollTrigger (new npm dependency), jsdom (new devDependency, for the inventory script), vanilla ES modules, no framework.

**Content baseline (verified against current `index.html` on 2026-09-28 — this is what "lose nothing" is checked against):** 35 `<section>` elements across 8 acts (Hypothesis; User Research; Limits of Adaptability; Personalization over Adaptability; Empathy is our Point; What if Launching an App Means Creating an App; Closing; Backup Q&A). 7 media files: `media/Kazam_screencast_00147.mp4`, `media/image41.png`, `media/image36.png`, `media/image27.jpg`, `media/DEEPL-GR_3-5_Everyone-in-the-family-has-incompatible-settings_1.mp4`, `media/image40.png`. Every section has speaker notes except the two title-only repeats and "Thank you!".

**Note on task granularity:** this is a UI/animation project, not a unit-testable backend. "Tests" below mean: the content-inventory diff script (mechanical parity check), and manual verification via the browser screenshot workflow already used earlier in this session (headless Chrome + CDP driver, since Playwright's browser download is blocked in this sandbox — see prior session notes). There is no conventional assertion-based test suite to write.

---

### Task 1: Content inventory script

**Files:**
- Create: `scripts/content-inventory.mjs`
- Modify: `package.json` (add `jsdom` devDependency)

**Step 1: Install jsdom**

Run: `npm install --save-dev jsdom`
Expected: adds `jsdom` to `devDependencies` in `package.json`, updates `package-lock.json`.

**Step 2: Write the inventory script**

```js
#!/usr/bin/env node
// Extracts a structured content inventory (headings, paragraphs, list items,
// blockquotes, notes, media src) from a deck/page HTML file, for diffing
// old vs. new markup. See docs/plans/2026-09-28-gsap-scrollytelling-design.md,
// "Content-parity safeguard".
//
// Usage: node scripts/content-inventory.mjs <file.html>

import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

const file = process.argv[2];
if (!file) {
	console.error('Usage: node scripts/content-inventory.mjs <file.html>');
	process.exit(1);
}

const dom = new JSDOM(readFileSync(file, 'utf8'));
const doc = dom.window.document;

function normalize(text) {
	return text.replace(/\s+/g, ' ').trim();
}

const inventory = [];

const sections = doc.querySelectorAll(
	'.slides > section, main > section, main section[data-scene]'
);

sections.forEach((section, i) => {
	const entry = {
		index: i,
		headings: [],
		paragraphs: [],
		listItems: [],
		blockquotes: [],
		notes: [],
		media: [],
	};

	section.querySelectorAll(':scope h1, :scope h2, :scope h3, :scope h4').forEach((h) => {
		entry.headings.push(normalize(h.textContent));
	});

	section.querySelectorAll('p').forEach((p) => {
		if (p.closest('aside.notes')) return;
		if (p.closest('section') !== section) return; // skip nested sections, if any
		entry.paragraphs.push(normalize(p.textContent));
	});

	section.querySelectorAll('li').forEach((li) => {
		if (li.closest('aside.notes')) return;
		if (li.closest('section') !== section) return;
		entry.listItems.push(normalize(li.textContent));
	});

	section.querySelectorAll('blockquote').forEach((bq) => {
		if (bq.closest('section') !== section) return;
		entry.blockquotes.push(normalize(bq.textContent));
	});

	section.querySelectorAll('aside.notes').forEach((notes) => {
		entry.notes.push(normalize(notes.textContent));
	});

	section.querySelectorAll('img, video, source').forEach((m) => {
		const src = m.getAttribute('src');
		if (src) entry.media.push(src);
	});

	inventory.push(entry);
});

console.log(JSON.stringify(inventory, null, 2));
```

**Step 3: Run it against the current index.html to establish the baseline**

Run: `node scripts/content-inventory.mjs index.html > /tmp/inventory-before.json`
Expected: valid JSON array with 35 entries (one per `<section>`), matching the content baseline noted above. Spot check: `jq 'length' /tmp/inventory-before.json` prints `35`; `jq '[.[].media] | flatten' /tmp/inventory-before.json` prints the 6 media paths (note: `dist/reveal.js` etc. are `<script src>`, not matched by the `img, video, source` selector, so they won't appear — that's correct, they're plumbing not content).

**Step 4: Commit**

```bash
git add scripts/content-inventory.mjs package.json package-lock.json
git commit -m "Add content-inventory script for old/new markup parity checks"
```

---

### Task 2: Add GSAP dependency

**Files:**
- Modify: `package.json`

**Step 1: Install gsap**

Run: `npm install gsap`
Expected: adds `gsap` to `dependencies` (not devDependencies — it ships in the built page).

**Step 2: Verify Vite can resolve it**

Create a throwaway `/tmp/gsap-check.mjs`... actually simpler: verify via existing Vite dev server once `js/site.js` exists (Task 4). Skip a standalone check here — Task 4's dev-server smoke test covers this.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add gsap dependency"
```

---

### Task 3: Rewrite index.html markup (structure + content, no animation yet)

This is the biggest task. Do it in one pass but verify immediately after with the inventory diff — don't let the animation work (Tasks 4-7) start on top of an unverified rewrite.

**Files:**
- Modify: `index.html` (full rewrite of `<body>`; `<head>`'s theme `<style>` block stays as-is)

**Step 1: Back up current file for the parity diff**

The Task 1 baseline (`/tmp/inventory-before.json`) already captures this. Nothing new to do here, just don't lose that file before Step 4.

**Step 2: Replace reveal.js document plumbing**

In `<head>`: remove `<link rel="stylesheet" href="dist/reveal.css">`, `<link rel="stylesheet" href="dist/theme/white.css" id="theme">`, and the highlight.js plugin stylesheet link (no code blocks in this content, confirmed by absence of `<pre><code>` in current `index.html`). Keep the existing inline `<style>` block (theme variables, dot grid, fonts, etc.) — it has zero reveal.js coupling.

At the end of `<body>`: remove `<script src="dist/reveal.js">`, `<script src="dist/plugin/notes.js">`, `<script src="dist/plugin/highlight.js">`, and the `Reveal.initialize(...)` block. Add `<script type="module" src="/js/site.js"></script>` instead (file created in Task 4 — reference is forward-looking, fine to add now).

**Step 3: Replace `<div class="reveal"><div class="slides">` with `<main>`**

Structure:

```html
<body>
	<main>
		<section data-act="hypothesis">
			<!-- scenes for: Your UI is not my UI (title), AI & Accessibility today, Hypothesis -->
		</section>
		<section data-act="user-research">
			<!-- scenes for: User Interviews, Melody, Matthew, Sinead, No Revolution, Allana, Rose, Myron -->
		</section>
		<section data-act="limits-of-adaptability">
			<!-- scenes for: Today's model, Opportunities -->
		</section>
		<section data-act="personalization-over-adaptability">
			<!-- scenes for the 3 "Your UI is not my UI" variants, Demo: same task two people -->
		</section>
		<section data-act="empathy-is-our-point">
			<!-- scenes for: [UI]=f([Intent],[Empathy]), Observations of existing state, What is gained? -->
		</section>
		<section data-act="launching-is-creating">
			<!-- scenes for: What if launching an app..., Focus shifts from UI to API, Applications are no longer a commodity, Revisiting: 8 months later, Is Rose's failure..., Whose context is it?, "But a UI that keeps changing...", Key takeaways, Back to Sinead -->
		</section>
		<section data-act="closing">
			<!-- scene for: Thank you! -->
		</section>
		<section data-act="backup-qa">
			<!-- scenes for: Backup — Q&A, and the 3 anticipated-objection scenes -->
		</section>
	</main>

	<button id="notes-toggle" type="button" aria-expanded="false" aria-controls="notes-drawer">
		[ NOTES &#9656; ]
	</button>
	<aside id="notes-drawer" hidden>
		<div id="notes-drawer-content"></div>
	</aside>

	<script type="module" src="/js/site.js"></script>
</body>
```

Exact `data-act` slugs above match the act boundaries currently marked by HTML comments in `index.html` (`SECTION 1: HYPOTHESIS` → `hypothesis`, etc., plus `CLOSING` → `closing` and `BACKUP: Q&A ANTICIPATED OBJECTIONS` → `backup-qa`). Use these exact strings — Task 6/7's JS selects scenes by act for grouping.

**Step 4: Convert each `<section>` to `<section data-scene>` with notes as real (hidden) DOM**

For every one of the 35 current sections: change `<section>` to `<section data-scene>` (scene name not load-bearing for logic — index-based tracking is enough, but add a short kebab-case `data-scene="melody"`-style value per section for readability/debugging, derived from its first heading). Keep heading/body/media exactly as-is. Change `<aside class="notes">` to `<aside class="notes" hidden>` — content unchanged, just add the `hidden` attribute so it's real DOM (readable by the notes drawer) but not visually rendered inline.

Do **not** touch the "Today's model" SVG or the "Demo: same task, two people" panel markup in this task — copy them over verbatim. Their animation-specific markup changes (if any) happen in Tasks 6 and 7.

Drop reveal.js-only attributes with no content value if present on any section (none currently observed via grep, but double check): `data-transition-speed`, `class="r-stretch"` on non-SVG/non-video elements where it was purely a reveal.js sizing hook. Where `r-stretch` is used on the SVG (`Today's model`) or on `<video>` elements, replace with a plain CSS class or inline max-width/height that achieves the same "fit within viewport" sizing — do not just delete it, since it does have a real layout effect (constrains oversized media). Simplest replacement: `style="max-width: 100%; height: auto;"` on the SVG/video, matching what `r-stretch` accomplished in reveal.js's context.

**Step 4b: Add baseline scene/layout CSS**

Add to the existing inline `<style>` block (don't create a new stylesheet — keep the theme in one place):

```css
main {
	max-width: 700px;
	margin: 0 auto;
	padding: 4rem 1.5rem;
}

main section[data-act] {
	display: flex;
	flex-direction: column;
	gap: 6rem;
	padding-block: 4rem;
}

main section[data-scene] {
	opacity: 0;
	transform: translateY(24px);
}

main section[data-scene].is-wide {
	max-width: none;
	margin-inline: calc(50% - 50vw);
	padding-inline: 1.5rem;
}

#notes-toggle {
	position: fixed;
	bottom: 1.5rem;
	right: 1.5rem;
	z-index: 30;
	font-family: var(--r-mono-font);
	font-size: 0.75rem;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	background: var(--r-background-color);
	color: var(--ink-600);
	border: 1px solid var(--ink-500);
	padding: 0.5em 0.9em;
	cursor: pointer;
}

#notes-drawer {
	position: fixed;
	top: 0;
	right: 0;
	height: 100%;
	width: min(360px, 90vw);
	background: var(--r-background-color);
	border-left: 1px solid var(--ink-300);
	padding: 5rem 1.5rem 1.5rem;
	overflow-y: auto;
	transform: translateX(100%);
	transition: transform 0.25s ease;
	z-index: 25;
	font-family: var(--r-mono-font);
	font-size: 0.8rem;
	line-height: 1.5;
}

#notes-drawer.is-open {
	transform: translateX(0);
}

#notes-drawer[hidden] {
	display: block; /* override default display:none so the transition can animate out; visibility handled by is-open + off-screen transform instead */
}
```

Note: using `[hidden] { display: block }` plus a transform is intentional — the drawer needs to exist off-screen (for the slide-in transition) rather than being removed from layout, so don't rely on the `hidden` attribute for show/hide; that's what `.is-open` is for. Remove the `hidden` attribute in HTML in favor of starting `.is-open`-less (off-screen by default) — simplify Step 3's markup: drop `hidden` from `<aside id="notes-drawer" hidden>`, just start without `.is-open`.

**Step 5: Run the inventory diff**

Run:
```bash
node scripts/content-inventory.mjs index.html > /tmp/inventory-after.json
diff <(jq -S '[.[] | {headings, paragraphs, listItems, blockquotes, notes, media}]' /tmp/inventory-before.json) \
     <(jq -S '[.[] | {headings, paragraphs, listItems, blockquotes, notes, media}]' /tmp/inventory-after.json)
```
Expected: **empty diff**. If not empty, the output shows exactly which section's content changed — fix `index.html` until this is clean before proceeding. This is the "lose nothing" gate; do not skip or weaken it.

**Step 6: Manual visual smoke test**

Run: `npm start` (Vite dev server), open the printed local URL, confirm the page renders top-to-bottom with all text visible (scenes will look "sunken"/faded per the baseline CSS above since no JS is un-hiding them yet — that's expected, Task 4 fixes it). Confirm no console errors. Stop the dev server after (`lsof -ti:<port> -sTCP:LISTEN | xargs -r kill`, per this repo's session conventions — don't leave background servers running between tasks).

**Step 7: Commit**

```bash
git add index.html
git commit -m "Rewrite index.html as scrollytelling markup, drop reveal.js plumbing

All 35 scenes and their speaker notes carry over verbatim, verified via
scripts/content-inventory.mjs (empty diff against pre-rewrite baseline)."
```

---

### Task 4: GSAP setup + baseline scene reveal animation

**Files:**
- Create: `js/site.js`

**Step 1: Write the baseline reveal**

```js
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const scenes = gsap.utils.toArray('main section[data-scene]');

scenes.forEach((scene) => {
	gsap.to(scene, {
		opacity: 1,
		y: 0,
		duration: 0.6,
		ease: 'power2.out',
		scrollTrigger: {
			trigger: scene,
			start: 'top 75%',
			toggleActions: 'play none none reverse',
		},
	});
});
```

Note: the CSS in Task 3 sets initial `opacity: 0; transform: translateY(24px)` via plain CSS, and this animates `opacity`/`y` (GSAP's shorthand for `translateY`) — GSAP will read the computed transform and animate from there correctly since it's the first thing touching that property.

**Step 2: Wire up the script tag and verify it loads**

`index.html` already has `<script type="module" src="/js/site.js"></script>` from Task 3. Run `npm start`, open the page, open browser devtools console: confirm no errors, confirm `gsap` and `ScrollTrigger` are not "not defined" (module import resolved). Scroll the page: confirm each scene fades/slides in as it crosses ~75% viewport height, and reverses if you scroll back up above that scene.

**Step 3: Screenshot-verify with the CDP driver**

Reuse the CDP driver approach from earlier in this session (`/tmp/cdp-drive.mjs` pattern — headless Chrome via `--remote-debugging-port`, since Playwright's browser download is blocked in this sandbox). Capture one screenshot at page load (top of page, first scene visible) and one after simulating a scroll (`Input.dispatchMouseEvent` wheel events, or `Page.evaluate` with `window.scrollTo`) partway down. Confirm visually: top scene visible, a scene further down is NOT yet visible (still faded/offset) if scroll didn't reach it, and IS visible if scroll passed its trigger point.

**Step 4: Commit**

```bash
git add js/site.js
git commit -m "Add GSAP baseline scroll-reveal animation for all scenes"
```

---

### Task 5: Notes drawer

**Files:**
- Modify: `js/site.js`

**Step 1: Write the drawer logic**

```js
const notesToggle = document.getElementById('notes-toggle');
const notesDrawer = document.getElementById('notes-drawer');
const notesDrawerContent = document.getElementById('notes-drawer-content');

let currentSceneNotes = null;

function renderDrawer() {
	notesDrawerContent.textContent = currentSceneNotes || 'No notes for this section.';
}

scenes.forEach((scene) => {
	const notesEl = scene.querySelector('aside.notes');
	ScrollTrigger.create({
		trigger: scene,
		start: 'top center',
		end: 'bottom center',
		onEnter: () => {
			currentSceneNotes = notesEl ? notesEl.textContent.trim() : null;
			if (notesDrawer.classList.contains('is-open')) renderDrawer();
		},
		onEnterBack: () => {
			currentSceneNotes = notesEl ? notesEl.textContent.trim() : null;
			if (notesDrawer.classList.contains('is-open')) renderDrawer();
		},
	});
});

notesToggle.addEventListener('click', () => {
	const isOpen = notesDrawer.classList.toggle('is-open');
	notesToggle.setAttribute('aria-expanded', String(isOpen));
	if (isOpen) renderDrawer();
});
```

This reuses the same `scenes` array and adds a second, independent `ScrollTrigger.create` per scene (separate from the Task 4 `gsap.to(...)` tween's own trigger) purely for scene-tracking — no visual animation attached to this one, just the `onEnter`/`onEnterBack` callbacks updating `currentSceneNotes`.

**Step 2: Manual verification**

`npm start`, open the page, click `[ NOTES ▸ ]` — drawer should slide in from the right showing the current (top) scene's notes. Scroll down — with the drawer still open, confirm the displayed notes update as you cross into each new scene. Scroll back up — confirm notes revert via `onEnterBack`. Close the drawer (click toggle again) — confirm it slides out.

**Step 3: Commit**

```bash
git add js/site.js
git commit -m "Add notes drawer synced to current scroll-position scene"
```

---

### Task 6: "Today's model" diagram — pinned sequenced reveal

**Files:**
- Modify: `index.html` (the "Today's model" section only — add stable selectors)
- Modify: `js/site.js`

**Step 1: Add stable class hooks to the SVG's animatable pieces**

In `index.html`, on the "Today's model" section's SVG, add a shared class to the animatable groups so JS can select them without brittle `nth-child` selectors. Wrap each rect+text pair that should animate together. Concretely, add `class="diagram-piece"` to: both screen-reader `<rect>`s (they animate together as one "piece" — treat the pair as index 0, matching the visual grouping), the screen-reader `<text>` label, then similarly for voice-control/zoom/dark-mode `<rect>`+`<text>` pairs, and finally the base `<rect>`+`<text>`. Simplest concrete approach: wrap each visual group in an `<g class="diagram-piece">...</g>` — SVG `<g>` doesn't affect rendering/layout, just groups for selection and transform purposes. There are 5 groups total: screen-reader-stack, voice-control, zoom, dark-mode, base.

**Step 2: Write the pinned sequence**

```js
const diagramSection = document.querySelector('[data-scene="todays-model"]');
if (diagramSection) {
	const pieces = diagramSection.querySelectorAll('.diagram-piece');
	gsap.set(pieces, { opacity: 0, y: 12 });

	ScrollTrigger.create({
		trigger: diagramSection,
		start: 'top top',
		end: '+=600',
		pin: true,
		onEnter: () => {
			gsap.to(pieces, {
				opacity: 1,
				y: 0,
				duration: 0.4,
				stagger: 0.2,
				ease: 'power1.out',
			});
		},
	});
}
```

This requires the "Today's model" `<section>` from Task 3 to actually carry `data-scene="todays-model"` — confirm that slug was used (per Task 3 Step 4's naming convention); adjust the selector here if a different slug was chosen.

**Step 3: Manual verification**

`npm start`, scroll to the "Today's model" section: confirm the page pins (stops scrolling) briefly while the 5 diagram pieces fade/slide in one at a time (staggered), then releases and normal scroll resumes. Scroll back up through it: confirm no janky re-trigger loop (pin should release cleanly going both directions — if `ScrollTrigger` re-fires `onEnter` oddly on scroll-back, add `onLeaveBack` to reset pieces to hidden via `gsap.set`, mirroring `onEnter`).

**Step 4: Commit**

```bash
git add index.html js/site.js
git commit -m "Add pinned sequenced reveal for the Today's model diagram"
```

---

### Task 7: "Demo: same task, two people" — pinned scrub with mobile fallback

**Files:**
- Modify: `index.html` (add stable classes to the two panels)
- Modify: `js/site.js`

**Step 1: Add stable classes to the two panels**

In `index.html`, on the "Demo: same task, two people" section, add `class="demo-panel demo-panel-a"` and `class="demo-panel demo-panel-b"` to the two `<div>`s currently styled inline as `flex: 1; border: ...`. Keep their existing inline styles (border/padding/radius) — just add the class for JS/CSS targeting. Wrap both in a container `<div class="demo-panels">` if not already effectively wrapped (check current markup — the `display:flex; gap:1.5rem` div is that wrapper; add `class="demo-panels"` to it instead of relying on the inline style, then move `display:flex; gap:1.5rem` into the stylesheet under that class for consistency with the rest of the codebase's convention of classes over inline styles for anything JS touches).

**Step 2: Write the pinned scrub with matchMedia**

```js
ScrollTrigger.matchMedia({
	'(min-width: 700px)': function () {
		const demoSection = document.querySelector('[data-scene="demo-two-people"]');
		if (!demoSection) return;
		const panelA = demoSection.querySelector('.demo-panel-a');
		const panelB = demoSection.querySelector('.demo-panel-b');

		gsap.set(panelA, { xPercent: -110 });
		gsap.set(panelB, { xPercent: 110 });

		ScrollTrigger.create({
			trigger: demoSection,
			start: 'top top',
			end: '+=500',
			pin: true,
			scrub: true,
			animation: gsap.to([panelA, panelB], {
				xPercent: 0,
				ease: 'none',
			}),
		});
	},
	'(max-width: 699px)': function () {
		// Below the breakpoint: no pin, no split entrance — the baseline
		// scene reveal from Task 4 already handles this scene like any
		// other, panels stack vertically via existing responsive CSS.
	},
});
```

`ScrollTrigger.matchMedia` automatically tears down the desktop instance's triggers/pins if the viewport crosses the breakpoint (e.g. window resize during a live demo/testing) — no manual cleanup needed, that's what the API is for.

**Step 3: Add the stacking fallback CSS**

In the theme `<style>` block:

```css
.demo-panels {
	display: flex;
	gap: 1.5rem;
}

@media (max-width: 699px) {
	.demo-panels {
		flex-direction: column;
	}
}
```

**Step 4: Manual verification — desktop width**

`npm start`, resize browser window to >700px wide, scroll to the demo section: confirm it pins, and scrolling further (not just waiting) scrubs the two panels in from opposite sides in sync with scroll position — scrolling back up should reverse the panels back out, since `scrub: true` ties directly to scroll position (no separate scroll-back handling needed, unlike Task 6's discrete `onEnter`).

**Step 5: Manual verification — mobile width**

Resize browser to <700px wide (or use device toolbar emulation), reload, scroll to the demo section: confirm NO pinning occurs, panels are stacked vertically, and the section just does the normal Task 4 fade-up like any other scene.

**Step 6: Commit**

```bash
git add index.html js/site.js
git commit -m "Add pinned scrub demo scene with mobile fallback via matchMedia"
```

---

### Task 8: Final content-parity re-check and full-deck screenshot pass

**Files:** none (verification only)

**Step 1: Re-run the inventory diff**

Run the same diff command from Task 3 Step 5, but this time comparing the ORIGINAL pre-rewrite baseline (`/tmp/inventory-before.json`, still valid — content didn't change in Tasks 4-7, only markup structure/classes around it) against the current `index.html` after all animation work:

```bash
node scripts/content-inventory.mjs index.html > /tmp/inventory-final.json
diff <(jq -S '[.[] | {headings, paragraphs, listItems, blockquotes, notes, media}]' /tmp/inventory-before.json) \
     <(jq -S '[.[] | {headings, paragraphs, listItems, blockquotes, notes, media}]' /tmp/inventory-final.json)
```
Expected: still an empty diff. Tasks 6-7 added classes/wrapper elements but should not have changed any text content or media src values — if this diff is non-empty, something regressed and must be fixed before this task is considered done.

**Step 2: Full scroll-through screenshot pass**

Using the CDP driver pattern, capture screenshots at ~6-8 scroll positions spanning the full page height (top, each act boundary roughly, the two pinned scenes mid-animation, bottom). Visually confirm: no section renders blank/invisible (the specific failure mode hit and fixed earlier in this session, caused by padding interfering with reveal.js's centering math — different root cause here since reveal.js is gone, but still worth explicitly checking), dot grid and corner ticks still render, notes drawer button is visible and doesn't overlap content at any scroll position.

**Step 3: Update the design doc's status (optional, if useful for future reference)**

If any deviations from the original design doc were made during implementation (e.g. a different pin `end` distance than planned, a CSS approach that changed), add a short "Implementation notes" section at the bottom of `docs/plans/2026-09-28-gsap-scrollytelling-design.md` noting what changed and why. Skip this step if nothing deviated.

**Step 4: Final commit (if Step 3 produced changes)**

```bash
git add docs/plans/2026-09-28-gsap-scrollytelling-design.md
git commit -m "Note implementation deviations from GSAP scrollytelling design"
```
