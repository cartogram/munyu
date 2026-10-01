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
