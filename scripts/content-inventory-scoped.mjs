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
