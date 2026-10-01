# Act-Panel Recede Animation & Keyboard Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Give each of the 8 top-level acts in `index.html` a GreenSock-style pin/fake-scroll/scale/fade "recede" transition (adapted from the official GSAP CodePen "Slides Pinning - Overscroll Solution", `https://codepen.io/GreenSock/pen/bGRdvMy`) as the user scrolls from one act into the next, give each act a distinct bold accent color, and add scene-to-scene keyboard navigation (ArrowUp/ArrowDown/ArrowLeft/ArrowRight) — without losing any content, without breaking the two existing nested pinned scenes ("Today's model" diagram, "Demo: same task, two people" scrub), and without regressing the baseline per-scene fade-up or the notes drawer.

**Architecture:** Wrap each `<section data-act>`'s children in a new `.act-panel-inner` div (mirroring the CodePen's `.section-inner`), and give the `data-act` section itself the `.act-panel` class (mirroring `.section`). A new block appended to `js/site.js` measures each `.act-panel-inner`'s height, computes the CodePen's `fakeScrollRatio`, sets a computed `marginBottom` on the panel, and builds a scrubbed `ScrollTrigger` timeline that (a) scrolls tall inner content up first if needed, then (b) scales the whole act-panel down and fades it out, over the last one-viewport-height of that act's scroll range — exactly the CodePen's algorithm, ported as-is. The last act (`backup-qa`) is excluded from this treatment, matching the CodePen's `panels.pop()`. Each act gets a `--act-accent` CSS custom property that headings/blockquotes/list-markers within it use instead of the global `--ink-600`. A new keyboard handler tracks the current in-view scene (reusing the existing per-scene `ScrollTrigger`s already built for the notes drawer) and jumps to the next/previous scene via `scrollIntoView`, guarded against interactive elements (video/audio/input/textarea/button/notes-drawer) stealing arrow-key focus.

**Tech Stack:** Same as the existing site — vanilla ES modules, GSAP + ScrollTrigger (already a dependency), no new dependencies needed for this plan.

**Starting state (verified on 2026-09-29, commit `df31b23`):** `index.html` has `<main>` containing 8 `<section data-act="...">` elements (slugs, in order: `hypothesis`, `user-research`, `limits-of-adaptability`, `personalization-over-adaptability`, `empathy-is-our-point`, `launching-is-creating`, `closing`, `backup-qa`), each containing several `<section data-scene="...">` children (35 total across all acts). `main section[data-act]` currently has `padding-block: 4rem` (no flex — that was removed in the prior bug-fix commit); scene-to-scene spacing within an act is `margin-bottom: 6rem` on `main section[data-act] > section[data-scene]:not(:last-child)`. `js/site.js` is 107 lines: baseline per-scene fade-up (lines ~1-20), notes drawer with per-scene `ScrollTrigger.create` scene-tracking (lines ~22-53), the "Today's model" pinned diagram sequence keyed off `[data-scene="todays-model"]` (lines ~55-79), and the "Demo: same task, two people" `ScrollTrigger.matchMedia` pinned scrub keyed off `[data-scene="demo-two-people"]` (lines ~80-107). There is currently **no heading color rule at all** in the stylesheet — `--r-heading-color`/`--r-main-color` are defined in `:root` but unused except inside the "Today's model" inline SVG's `fill="var(--r-main-color)"` text elements; headings render in the browser's inherited default (effectively black). This plan's accent-color task must ADD a heading-color rule, not assume one already exists to override.

**Content-parity requirement (non-negotiable, per every prior task in this conversion):** `scripts/content-inventory.mjs` already exists and extracts headings/paragraphs/list items/blockquotes/notes/media from `main section[data-scene]` elements. Its selector (`.slides > section, main > section, main section[data-scene]`) double-counts `data-act` wrapper elements as extra entries (a known, harmless, previously-documented artifact — see commit `1957583`'s message) — when running the parity check in this plan, always use a SCOPED comparison limited to `main section[data-scene]` only (see Task 1 for the exact reusable script), never the raw unscoped script output, to avoid chasing a false positive.

**Note on task granularity:** this is a UI/animation project. "Tests" mean the content-parity diff script, and manual/screenshot verification via headless Chrome + a hand-rolled CDP driver (Playwright's browser download is blocked in this sandbox; `chromium-cli` was unavailable in the session that authored this plan — check for it first, it may be available in yours). Every task that touches `index.html` or `js/site.js` must end with a screenshot-verified check, not just "the code looks right."

---

### Task 1: Reusable scoped content-inventory script

The existing `scripts/content-inventory.mjs` has the double-counting artifact described above. Rather than editing that script (which is relied on by its own historical commit messages as "the tool," and editing it risks silently changing what past commits' diffs meant), add a second, explicitly-scoped script for this plan's own use.

**Files:**
- Create: `scripts/content-inventory-scoped.mjs`

**Step 1: Write the scoped script**

```js
#!/usr/bin/env node
// Like content-inventory.mjs, but selects ONLY main section[data-scene] —
// avoids double-counting section[data-act] wrapper elements. Use this for
// all parity checks in docs/plans/2026-09-29-act-panel-recede-and-keyboard-nav.md.
//
// Usage: node scripts/content-inventory-scoped.mjs <file.html>

import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';

const file = process.argv[2];
if (!file) {
	console.error('Usage: node scripts/content-inventory-scoped.mjs <file.html>');
	process.exit(1);
}

const dom = new JSDOM(readFileSync(file, 'utf8'));
const doc = dom.window.document;

function normalize(text) {
	return text.replace(/\s+/g, ' ').trim();
}

const inventory = [];
const sections = doc.querySelectorAll('main section[data-scene]');

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
		if (p.closest('section') !== section) return;
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
		if (m.closest('section') !== section) return;
		const src = m.getAttribute('src');
		if (src) entry.media.push(src);
	});

	inventory.push(entry);
});

console.log(JSON.stringify(inventory, null, 2));
```

**Step 2: Establish the baseline**

Run: `node scripts/content-inventory-scoped.mjs index.html > /tmp/act-panel-plan-baseline.json`
Expected: `jq 'length' /tmp/act-panel-plan-baseline.json` prints `35`.

This baseline file is the ground truth every later task's parity check diffs against. Do not regenerate it after Task 2 onward — it must reflect the pre-this-plan state.

**Step 3: Commit**

```bash
git add scripts/content-inventory-scoped.mjs
git commit -m "Add scoped content-inventory script for act-panel plan parity checks"
```

---

### Task 2: Act-panel markup wrapper (no animation yet)

**Files:**
- Modify: `index.html`

**Step 1: Add `.act-panel` class and `.act-panel-inner` wrapper**

For each of the 8 `<section data-act="...">` elements, add `class="act-panel"` to the section tag itself (so it reads `<section data-act="hypothesis" class="act-panel">`), and wrap ALL of that section's existing children (the `<section data-scene>` elements) in a new `<div class="act-panel-inner">`. Do this for all 8 acts, including `backup-qa` (it gets the wrapper div for structural consistency even though Task 5 will exclude it from the pin/recede JS — keeping markup uniform avoids special-casing the DOM shape later).

Concretely, this transforms:
```html
<section data-act="hypothesis">
	<section data-scene="your-ui-is-not-my-ui">...</section>
	<section data-scene="ai-and-accessibility-today">...</section>
	<section data-scene="hypothesis">...</section>
</section>
```
into:
```html
<section data-act="hypothesis" class="act-panel">
	<div class="act-panel-inner">
		<section data-scene="your-ui-is-not-my-ui">...</section>
		<section data-scene="ai-and-accessibility-today">...</section>
		<section data-scene="hypothesis">...</section>
	</div>
</section>
```

Do this for all 8 acts. Read the actual current file to get each act's exact scene list right — do not guess scene counts/order from this plan's summary, verify against the real markup.

**Step 2: Move scene-spacing CSS to target the new wrapper**

The existing rule:
```css
main section[data-act] > section[data-scene]:not(:last-child) {
	margin-bottom: 6rem;
}
```
must become:
```css
main .act-panel-inner > section[data-scene]:not(:last-child) {
	margin-bottom: 6rem;
}
```
(since `section[data-scene]` is no longer a direct child of `section[data-act]` — it's now a child of `.act-panel-inner`). Also update:
```css
main section[data-act] {
	padding-block: 4rem;
}
```
This one can stay as-is (it still targets the right element, padding is still wanted on the outer act-panel), but double check visually in Step 3 that padding still reads correctly now that there's an extra wrapper div between it and the scenes.

**Step 3: Verify no visual regression yet (this task adds no animation)**

Run `npm start`, screenshot the top of the page and 2-3 scroll positions. Confirm scenes still render with the same spacing as before this change (the wrapper div is styleless/non-`display`-altering by default, so this should be a no-op visually — confirm it actually is).

**Step 4: Parity check**

```bash
node scripts/content-inventory-scoped.mjs index.html > /tmp/act-panel-task2.json
diff <(jq -S '[.[] | {headings, paragraphs, listItems, blockquotes, notes, media}]' /tmp/act-panel-plan-baseline.json) \
     <(jq -S '[.[] | {headings, paragraphs, listItems, blockquotes, notes, media}]' /tmp/act-panel-task2.json)
```
Expected: empty diff. This is a pure markup-wrapper change with zero text/media changes — if this diff is non-empty, something went wrong in Step 1, go fix it.

**Step 5: Stop dev server, commit**

```bash
git add index.html
git commit -m "Wrap act-panel children in .act-panel-inner for pin/recede animation"
```

---

### Task 3: 8-color accent palette

**Files:**
- Modify: `index.html`

**Step 1: Add the palette and heading-color rule**

Add to the `:root` block (near the existing `--ink-*` variables):
```css
--accent-hypothesis: #002ef4;
--accent-user-research: #c30063;
--accent-limits-of-adaptability: #a30000;
--accent-personalization-over-adaptability: #0a7d3c;
--accent-empathy-is-our-point: #6b21d8;
--accent-launching-is-creating: #a84400;
--accent-closing: #1a1a1a;
--accent-backup-qa: #007a72;
```

Add per-act scoping (one rule per act, setting a local `--act-accent` custom property):
```css
.act-panel[data-act="hypothesis"] { --act-accent: var(--accent-hypothesis); }
.act-panel[data-act="user-research"] { --act-accent: var(--accent-user-research); }
.act-panel[data-act="limits-of-adaptability"] { --act-accent: var(--accent-limits-of-adaptability); }
.act-panel[data-act="personalization-over-adaptability"] { --act-accent: var(--accent-personalization-over-adaptability); }
.act-panel[data-act="empathy-is-our-point"] { --act-accent: var(--accent-empathy-is-our-point); }
.act-panel[data-act="launching-is-creating"] { --act-accent: var(--accent-launching-is-creating); }
.act-panel[data-act="closing"] { --act-accent: var(--accent-closing); }
.act-panel[data-act="backup-qa"] { --act-accent: var(--accent-backup-qa); }
```

Add a heading-color rule (this is NEW — confirmed in this plan's "Starting state" section that no heading-color rule currently exists):
```css
main h1,
main h2,
main h3 {
	color: var(--act-accent, var(--ink-600));
}
```
(The `var(--act-accent, var(--ink-600))` fallback means any heading outside an `.act-panel` — none currently exist, but this is defensive — still gets the original blue rather than inheriting nothing.)

**Step 2: Rescope existing accent-colored rules to use `--act-accent`**

Change:
```css
main blockquote {
	...
	border-left: 2px solid var(--ink-500);
	...
}
```
to `border-left: 2px solid var(--act-accent, var(--ink-500));`.

Change:
```css
main ul li::marker {
	font-family: var(--r-mono-font);
	color: var(--ink-500);
}
```
to `color: var(--act-accent, var(--ink-500));`.

Leave `#notes-toggle`'s `color: var(--ink-600)` and `border: 1px solid var(--ink-500)` UNCHANGED — the notes toggle is a persistent global UI element outside any single act's visual identity, it should stay the fixed blueprint blue regardless of scroll position. Read the full current stylesheet before making these changes to confirm you're not missing another `--ink-500`/`--ink-600` usage that conceptually SHOULD also become act-scoped (e.g. check `h4`'s color, `main small`'s color — those use `--muted-color`, which is a stone/gray, not an ink color, so they intentionally stay neutral and should NOT be touched).

**Step 3: Verify visually**

Run `npm start`, screenshot one representative scene from each of the 8 acts (e.g. the first scene in each act). Confirm each act's heading, blockquote border (where a blockquote exists in that scene), and list markers (where a list exists) render in that act's assigned color. Cross-check hex values via `Runtime.evaluate` + `getComputedStyle` on an `h2` in at least 3 different acts to confirm the actual rendered `color` matches the intended hex (don't just eyeball screenshots for this — get the computed value).

**Step 4: Parity check**

Same scoped diff as Task 2 — this task only changes CSS (colors), no text/media, so the diff must still be empty.

**Step 5: Commit**

```bash
git add index.html
git commit -m "Add 8-color per-act accent palette"
```

---

### Task 4: Keyboard scene navigation

Do this task BEFORE Task 5 (the pin/recede animation), since keyboard nav only depends on the already-existing per-scene `ScrollTrigger` tracking from the original conversion (Task 5 of the prior plan, notes-drawer scene-tracking) — it has no dependency on the new act-panel pin mechanism, and verifying it against the simpler pre-pin/recede page first isolates any bugs to the keyboard logic alone rather than conflating them with the more complex Task 5 changes.

**Files:**
- Modify: `js/site.js`

**Step 1: Add shared current-scene tracking**

The existing notes-drawer code (already in `js/site.js`) has this pattern per scene:
```js
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
		onEnterBack: () => { /* same */ },
	});
});
```
Read the actual current file to get the exact existing code right, then EXTEND this same loop (don't add a parallel/duplicate `ScrollTrigger.create` per scene — modify the existing one) to also track a scene index:
```js
let currentSceneIndex = 0;

scenes.forEach((scene, sceneIndex) => {
	const notesEl = scene.querySelector('aside.notes');
	ScrollTrigger.create({
		trigger: scene,
		start: 'top center',
		end: 'bottom center',
		onEnter: () => {
			currentSceneIndex = sceneIndex;
			currentSceneNotes = notesEl ? notesEl.textContent.trim() : null;
			if (notesDrawer.classList.contains('is-open')) renderDrawer();
		},
		onEnterBack: () => {
			currentSceneIndex = sceneIndex;
			currentSceneNotes = notesEl ? notesEl.textContent.trim() : null;
			if (notesDrawer.classList.contains('is-open')) renderDrawer();
		},
	});
});
```

**Step 2: Add the keyboard handler**

Append after the existing notes-drawer code:
```js
const INTERACTIVE_TAGS = ['VIDEO', 'AUDIO', 'INPUT', 'TEXTAREA', 'BUTTON'];

function isInteractiveFocus() {
	const active = document.activeElement;
	if (!active) return false;
	if (INTERACTIVE_TAGS.includes(active.tagName)) return true;
	if (active.closest('#notes-drawer')) return true;
	return false;
}

window.addEventListener('keydown', (event) => {
	if (isInteractiveFocus()) return;

	let targetIndex = null;
	if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
		targetIndex = Math.min(currentSceneIndex + 1, scenes.length - 1);
	} else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
		targetIndex = Math.max(currentSceneIndex - 1, 0);
	}

	if (targetIndex !== null && targetIndex !== currentSceneIndex) {
		event.preventDefault();
		scenes[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
});
```

Note: `targetIndex !== currentSceneIndex` guards against a no-op `scrollIntoView` call at the first/last scene (when `Math.min`/`Math.max` clamp to the same value) — without it, pressing ArrowUp repeatedly at scene 0 would call `scrollIntoView` on the same already-in-view scene every time, which is harmless but pointless; the guard just avoids the redundant call.

**Step 3: Verify — basic navigation**

Using headless Chrome via CDP (check for `chromium-cli` first; otherwise the WebSocket/CDP fallback pattern used throughout this conversion's prior sessions — `--headless=new --remote-debugging-port=<free port>`, Node's native `WebSocket`, `Page.navigate`, `Input.dispatchKeyEvent` for `ArrowDown`/`ArrowUp`, `Runtime.evaluate` to check `window.scrollY` and which scene is nearest, `Page.captureScreenshot`):

1. Load the page, confirm `currentSceneIndex === 0` initially (check via `Runtime.evaluate` — note this variable is in module scope, not directly accessible from `window`; either temporarily expose it as `window.__debugCurrentSceneIndex = currentSceneIndex` for testing purposes only and remove before committing, OR verify indirectly by checking `scrollY` before/after each key press instead — prefer the indirect approach so no debug code needs to be added/removed).
2. Dispatch `ArrowDown` once, wait for the smooth scroll to settle (~500ms), confirm `scrollY` increased and the page has scrolled to approximately the second scene's position (check via `document.querySelectorAll('[data-scene]')[1].getBoundingClientRect().top` being near 0).
3. Dispatch `ArrowDown` several more times in sequence (with waits between), confirm each press advances exactly one scene (not skipping, not stalling).
4. Dispatch `ArrowUp` the same number of times, confirm it returns to the original scroll position (scene 0).
5. Navigate to the very first scene (scrollY = 0), dispatch `ArrowUp`, confirm nothing happens (scrollY stays 0, no error).
6. Navigate to the very last scene (`scrollIntoView` on `scenes[scenes.length - 1]` via `Runtime.evaluate` to set up this state), dispatch `ArrowDown`, confirm nothing happens (stays at the last scene).

**Step 4: Verify — focus guard**

1. Scroll to the "AI & Accessibility today" scene (has a `<video>`), click/focus the video element (via `Runtime.evaluate` calling `.focus()` on it, or a real click), dispatch `ArrowDown` — confirm the page does NOT scroll to the next scene (check `scrollY` is unchanged). This confirms the interactive-element guard works (native video behavior, e.g. seeking, is a browser-internal concern this task doesn't need to verify separately — only confirm scene-jump was suppressed).
2. Open the notes drawer (click `#notes-toggle`), focus something inside `#notes-drawer` if there's a focusable element inside it (there may not be — if the drawer has no focusable children, this specific sub-check can be skipped, note that in your report), dispatch `ArrowDown` — confirm no scene-jump occurs.
3. Click somewhere neutral (e.g. the `<main>` element itself, or `document.body`), dispatch `ArrowDown` — confirm normal scene-jump behavior resumes (proves the guard doesn't get "stuck" after checking an interactive element once).

**Step 5: Parity check**

This task only adds JS behavior, no markup/content changes — the scoped diff should be empty (confirm anyway, it's cheap insurance).

**Step 6: Commit**

```bash
git add js/site.js
git commit -m "Add scene-to-scene keyboard navigation with interactive-element guard"
```

---

### Task 5: Act-panel pin/fake-scroll/scale/fade recede animation

This is the highest-risk task in the plan — it's the direct port of the CodePen's core algorithm, and it has to compose correctly with two already-existing nested pins ("Today's model", "Demo: same task, two people").

**Files:**
- Modify: `js/site.js`

**Step 1: Read the reference algorithm one more time before writing code**

The exact source (already validated against the real CodePen by the user, who pasted it directly — this is not a reconstruction from memory):
```js
gsap.registerPlugin(ScrollTrigger);

var panels = gsap.utils.toArray(".section");
panels.pop();

panels.forEach((panel, i) => {
	let innerpanel = panel.querySelector(".section-inner");
	let panelHeight = innerpanel.offsetHeight;
	let windowHeight = window.innerHeight;
	let difference = panelHeight - windowHeight;
	let fakeScrollRatio = difference > 0 ? (difference / (difference + windowHeight)) : 0;

	if (fakeScrollRatio) {
		panel.style.marginBottom = panelHeight * fakeScrollRatio + "px";
	}

	let tl = gsap.timeline({
		scrollTrigger: {
			trigger: panel,
			start: "bottom bottom",
			end: () => fakeScrollRatio ? `+=${innerpanel.offsetHeight}` : "bottom top",
			pinSpacing: false,
			pin: true,
			scrub: true
		}
	});

	if (fakeScrollRatio) {
		tl.to(innerpanel, {yPercent: -100, y: window.innerHeight, duration: 1 / (1 - fakeScrollRatio) - 1, ease: "none"});
	}
	tl.fromTo(panel, {scale: 1, opacity: 1}, {scale: 0.7, opacity: 0.5, duration: 0.9})
		.to(panel, {opacity: 0, duration: 0.1});
});
```

**Step 2: Port it to this site's selectors, excluding the last act**

Append to `js/site.js`:
```js
const actPanels = gsap.utils.toArray('main .act-panel');
actPanels.pop(); // exclude the last act (backup-qa) — nothing follows it to recede into

actPanels.forEach((panel) => {
	const innerPanel = panel.querySelector('.act-panel-inner');
	const panelHeight = innerPanel.offsetHeight;
	const windowHeight = window.innerHeight;
	const difference = panelHeight - windowHeight;
	const fakeScrollRatio = difference > 0 ? difference / (difference + windowHeight) : 0;

	if (fakeScrollRatio) {
		panel.style.marginBottom = panelHeight * fakeScrollRatio + 'px';
	}

	const tl = gsap.timeline({
		scrollTrigger: {
			trigger: panel,
			start: 'bottom bottom',
			end: () => (fakeScrollRatio ? `+=${innerPanel.offsetHeight}` : 'bottom top'),
			pinSpacing: false,
			pin: true,
			scrub: true,
		},
	});

	if (fakeScrollRatio) {
		tl.to(innerPanel, {
			yPercent: -100,
			y: window.innerHeight,
			duration: 1 / (1 - fakeScrollRatio) - 1,
			ease: 'none',
		});
	}
	tl.fromTo(panel, { scale: 1, opacity: 1 }, { scale: 0.7, opacity: 0.5, duration: 0.9 }).to(panel, {
		opacity: 0,
		duration: 0.1,
	});
});
```

This is a direct, minimal-diff port — variable names translated to this codebase's `camelCase` convention, selectors changed to `.act-panel`/`.act-panel-inner`, otherwise unchanged. Do not "improve" or refactor the algorithm — port it faithfully first, verify it works, and only then consider adjustments if verification reveals a real problem.

**Step 3: Add minimal supporting CSS**

The CodePen's `.section` has `overflow: hidden; border-radius: 10px;` and its `.section-inner` has `height: 100%; overflow: hidden;`. This site's `.act-panel` currently has no `overflow` or sizing rules of its own (it relies on natural block flow). Add:
```css
.act-panel {
	overflow: hidden;
}

.act-panel-inner {
	overflow: hidden;
}
```
Do NOT add `border-radius` or force a `height` — this site's panels are meant to look like continuous page content while static, only becoming a distinct "receding card" during the transition itself; forcing a fixed height/rounded corners at all times would look wrong for the "calm reading" majority of the scroll (per the design conversation, recede should be a brief boundary event, not an always-visible card treatment). If verification in Step 4 reveals that omitting `border-radius`/forced sizing causes a visual problem the CodePen's own styling was solving, note it and ask before adding — don't assume.

**Step 4: Verify — basic recede at act boundaries**

Using the CDP screenshot approach:
1. Load the page, scroll to near the end of the FIRST act (`hypothesis` — the shortest act, 3 scenes, good first test case since it's less likely to trigger the tall-panel fake-scroll path). Screenshot at 3 points: just before the recede zone starts, mid-recede (panel visibly scaled down and partially transparent), and just after — confirm the "user-research" act's first scene appears cleanly with no leftover visual artifact from the receded "hypothesis" panel (e.g. no stray scaled/faded element still occupying space, no double-rendered content).
2. Repeat for at least one TALL act — "user-research" has 8 scenes and is the most likely to trigger `fakeScrollRatio > 0`. Confirm the inner-content fake-scroll phase happens FIRST (scenes within the act still scroll/reveal normally, at effectively 1:1 with user scroll input, up to the point where all its content has passed), and only THEN does the scale/fade recede happen over the final viewport-height. Screenshot at: early in the act (normal reading), late in the act just before recede, mid-recede, and after.
3. Confirm the LAST act (`backup-qa`) does NOT pin or recede at all — scroll through it and off the bottom of the page, confirm it just scrolls normally like Task 2/3's baseline behavior, un-animated by this task's new code.

**Step 5: Verify — nested pins still work (the highest-risk check in this whole plan)**

1. Scroll into the "limits-of-adaptability" act (contains "Today's model", the sequenced-diagram pinned scene) far enough to trigger that scene's own pin. Confirm the diagram sequence still stages in correctly (same check as the original conversion's Task 6 verification: pieces fade in with a stagger). Then continue scrolling — confirm the diagram's pin releases normally, AND that later, when this whole "limits-of-adaptability" act itself approaches ITS OWN recede zone (at the end of the act, likely after "Opportunities", the act's last scene), the outer act-panel recede plays correctly too, without the inner diagram pin having left the page in a broken/stuck state.
2. Do the equivalent check for "personalization-over-adaptability" (contains the "Demo: same task, two people" pinned scrub scene). Confirm the scrub still works (panels slide in from left/right in sync with scroll), then confirm the act's own outer recede still plays correctly afterward.
3. If either nested-pin scene behaves incorrectly (doesn't animate, animates but then the outer recede doesn't trigger, or the outer recede triggers prematurely/breaks the inner pin), STOP and report the exact symptom with screenshots — do not attempt a speculative fix without understanding the interaction first; this is exactly the kind of nested-ScrollTrigger interaction bug that needs root-cause investigation (check GSAP's ScrollTrigger docs/forums for "nested pin" guidance if you have web access) rather than trial-and-error patching.

**Step 6: Verify — keyboard nav still works with the new pin/recede layer active**

Re-run a subset of Task 4's keyboard verification (ArrowDown/Up basic navigation) now that Task 5's pins exist. Specifically confirm: pressing ArrowDown to jump from the last scene of one act to the first scene of the next act works correctly even when that jump lands inside (or just past) an active recede animation — `scrollIntoView` operates on layout position regardless of the GSAP `scale`/`opacity` transform, so this should already work per the design's reasoning, but confirm it actually does rather than trusting the theory.

**Step 7: Parity check**

```bash
node scripts/content-inventory-scoped.mjs index.html > /tmp/act-panel-task5.json
diff <(jq -S '[.[] | {headings, paragraphs, listItems, blockquotes, notes, media}]' /tmp/act-panel-plan-baseline.json) \
     <(jq -S '[.[] | {headings, paragraphs, listItems, blockquotes, notes, media}]' /tmp/act-panel-task5.json)
```
Expected: empty diff — this task changes JS/CSS only, no text/media content.

**Step 8: Stop dev server and any Chrome processes, commit**

```bash
git add index.html js/site.js
git commit -m "Add GSAP pin/fake-scroll/scale/fade recede animation per act, ported from GreenSock's Slides Pinning - Overscroll Solution CodePen"
```

---

### Task 6: Full-page final verification pass

**Files:** none (verification only, mirrors the original conversion's own Task 8)

**Step 1: Final scoped parity check**

Re-run the Task 5 diff command one more time against the current `index.html` — confirm still empty. This is the final content-loss gate for the whole plan.

**Step 2: Full scroll-through screenshot pass**

Screenshot at: top of page, mid-recede for EVERY act boundary (7 transitions: hypothesis→user-research, user-research→limits-of-adaptability, limits-of-adaptability→personalization-over-adaptability, personalization-over-adaptability→empathy-is-our-point, empathy-is-our-point→launching-is-creating, launching-is-creating→closing, closing→backup-qa), both nested-pin scenes mid-animation, and the bottom of the page. At each: confirm no blank/invisible content, confirm the dot-grid background and corner tick marks (from the earlier bug-fix commit `df31b23`) still render, confirm the notes-toggle button is visible and never overlaps content, confirm accent colors are visibly distinct act-to-act.

**Step 3: Keyboard nav full pass**

From the very top of the page, press ArrowDown repeatedly (35 times, with brief waits) and confirm it steps through every scene in order without getting stuck, skipping, or erroring, ending at the last scene of `backup-qa`. Then press ArrowUp the same number of times and confirm it returns to the top.

**Step 4: Report**

Summarize: content-parity status (must be "empty diff, confirmed"), whether all 7 act-transitions recede cleanly, whether both nested pins still work correctly inside the new outer recede mechanism, whether keyboard nav works end-to-end across the whole 35-scene sequence, and any issues found. If anything is wrong, stop and report rather than attempting fixes as part of this "verification only" task — per this conversion's established pattern (see the original plan's Task 8 and its follow-up fix commit `df31b23`), a real bug found here becomes its own follow-up fix, not something improvised inside a verification step.
