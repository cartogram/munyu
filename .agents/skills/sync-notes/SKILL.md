---
name: sync-notes
description: Sync Matt's speaker notes from the deck (index.html) into the feldnotes Obsidian vault, without losing edits made in the vault. Use when the user asks to sync to Obsidian, update the vault, push the notes to feldnotes, or rebuild the speaker notes file.
---

# Sync the speaker notes to Obsidian

`scripts/notes-to-feldnotes.py` rebuilds Matt's speaker notes in the vault
(`../feldnotes/01 Projects/Your UI is not my UI/Your UI is not my UI - Speaker Notes.md`)
from the notes in `index.html`. It overwrites everything below the file's
header, so an edit made in the vault and never carried into the deck would be
lost. The deck is the source of truth; the vault is a copy. This skill makes
sure nothing is lost on the way.

## Steps

1. **Preview.** Run `python3 scripts/notes-to-feldnotes.py --check`. It writes
   nothing, prints a unified diff (`-` vault, `+` deck) and exits 1 if a sync
   would change the file. The header's date is left out of the diff. If it
   says *in sync with the deck*, there is nothing to do: say so and stop.

2. **Attribute every `-` line.** A `-` line is either older deck text (the
   deck has moved on since the last sync) or an edit made in the vault.
   - The last sync's date is in the vault header: *Pulled from the deck … on
     YYYY-MM-DD*.
   - For each changed passage, take a distinctive phrase from the `-` side and
     run `git log -S'<phrase>' --format='%h %ad %s' --date=short -- index.html`
     (also try `qa.html` for questions). If the phrase was in the deck and a
     commit after the last sync removed or changed it, it's older deck text.
   - If the phrase never appears in the deck's history, it was written in the
     vault.

3. **Carry vault edits into the deck.** For each vault edit, make the same
   change in `index.html` (in the scene's `aside.notes`, keeping the markup:
   `<p>`, `<em>` for emphasis, `.cue`, `<small>` sources), then re-run
   `--check` until the only differences are deck changes. If an edit's place
   in the deck is unclear, or it conflicts with a newer deck edit, ask the
   user before choosing.

4. **Sync.** Run `python3 scripts/notes-to-feldnotes.py`. It prints *updated*
   or *already in sync*.

5. **Report.** Summarise what changed in the vault by scene (e.g. "5.1 Apps
   aren't built for you: rewritten notes"), list any vault edits that were
   carried into the deck, and note anything left out on purpose.

## What the sync includes, and what it doesn't

- Every scene where Matt speaks: the slide's text (`[!abstract] Slide`), Simon's
  lead-in where he hands over (folded `[!quote]-`), and Matt's script, with
  cues as `*[…]*`. Scenes only Simon speaks are skipped.
- Not the drawer's bullets (`ul.notes-bullets`): the vault keeps the script.
- Not the Q&A: it lives in `qa.html` and isn't synced.

## Don'ts

- Don't commit in the feldnotes repo. It often has unrelated work in progress;
  leave committing it to the user.
- Don't edit the vault file by hand to "fix" a difference. Fix the deck, then
  sync.
