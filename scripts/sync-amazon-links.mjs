#!/usr/bin/env node
import { writeFileSync } from 'node:fs';
/**
 * Pull each FHB edition's Amazon links from the SMP bookstore into src/data/amazon-links.json.
 *
 * ONE MASTER. The bookstore's Sanity `book` documents are where Kevin's team maintains these
 * links (they were filled in on 2026-09-16), and spiritmediapublishing.com/bookstore renders
 * straight from them. /print must not become a second place where an ASIN is typed — a second
 * master IS the bug. This script copies them at build time, keyed by the print page's own
 * edition slug, and the page reads only the copy.
 *
 * The join is `fhb-edition-<slug>` (plus `fhb-ebook-intimate-translation` for the eBook), which
 * is how the bookstore documents were created. A slug that does not resolve is reported and
 * left out rather than guessed: an edition with no link keeps its "coming soon" state, which is
 * the same thing the page already does for a listing that has not appeared.
 *
 * Re-run:  node scripts/sync-amazon-links.mjs
 */
import { createClient } from '@sanity/client';

const client = createClient({
	projectId: 'pmowd8uo',
	dataset: 'production',
	apiVersion: '2024-01-01',
	useCdn: false,
});

const SLUGS = [
	'chosen',
	'couples',
	'dads',
	'first-responders',
	'mens',
	'moms',
	'pastors',
	'peace',
	'presidents',
	'recovery',
	'seekers',
	'seventeen',
	'soldiers',
	'teen',
	'worship-leaders',
	'journaling',
];

// The Large Print volumes are their own bookstore documents (fhb-lp-vol1/2), created
// 2026-09-17 when their listings were found by ISBN. Vol 3 has no listing yet — Ingram
// rejected its paperback (D134) and Kevin ruled the button stays inactive (D164) — so there
// is deliberately no fhb-lp-vol3 to join to, and the page keeps its unlinked state.
const LP_KEYS = { 'lp-vol1': 'fhb-lp-vol1', 'lp-vol2': 'fhb-lp-vol2' };

const docs = await client.fetch(`*[_type == "book" && _id in $ids]{_id, amazon, formats}`, {
	ids: [
		...SLUGS.map((s) => `fhb-edition-${s}`),
		...Object.values(LP_KEYS),
		'fhb-ebook-intimate-translation',
	],
});
const byId = Object.fromEntries(docs.map((d) => [d._id, d]));

const out = {};
const missing = [];
for (const slug of SLUGS) {
	const doc = byId[`fhb-edition-${slug}`];
	// `amazon` is the edition's primary listing; `formats` carries the per-binding ASINs. Both
	// are copied so the page can offer the binding a buyer is actually looking at.
	if (!doc?.amazon) {
		missing.push(slug);
		continue;
	}
	out[slug] = { url: doc.amazon, formats: doc.formats ?? {} };
}
for (const [key, id] of Object.entries(LP_KEYS)) {
	const doc = byId[id];
	if (!doc?.amazon) {
		missing.push(key);
		continue;
	}
	out[key] = { url: doc.amazon, formats: doc.formats ?? {} };
}

const ebook = byId['fhb-ebook-intimate-translation'];
if (ebook?.amazon) out.ebook = { url: ebook.amazon, formats: ebook.formats ?? {} };

writeFileSync(
	new URL('../src/data/amazon-links.json', import.meta.url),
	JSON.stringify(out, null, '\t') + '\n',
);
console.log(`amazon-links.json: ${Object.keys(out).length} editions`);
if (missing.length) console.log(`no listing yet (left unlinked): ${missing.join(', ')}`);
