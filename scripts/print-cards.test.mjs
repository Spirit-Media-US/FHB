// node --test scripts/print-cards.test.mjs — the /print card rules (src/lib/print-cards.mjs).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { directTarget, hasLookInside } from '../src/lib/print-cards.mjs';

const root = new URL('../', import.meta.url);
const roster = JSON.parse(readFileSync(new URL('src/data/language-roster.json', root)));
const manifest = JSON.parse(readFileSync(new URL('src/data/lookinside.json', root)));
// language-editions.ts langSlug, the same rule
const langSlug = (english) =>
	english
		.replace(/\s*\(.*\)/, '')
		.toLowerCase()
		.replace(/[^a-z]+/g, '-');
const langs = roster.languages.filter((l) => l.code !== 'en');

test('the card reads the SAME key the edition chain publishes Look inside under', () => {
	for (const l of langs)
		assert.equal(l.slug, langSlug(l.english), `${l.code}: roster slug != card slug`);
});

test('a language WITHOUT sample pages gains Look inside the moment its manifest entry publishes', () => {
	const missing = langs.filter((l) => !hasLookInside(manifest, l.slug));
	assert.ok(missing.length > 0, 'expected some languages still without a Look inside');
	for (const l of missing) {
		// what publish_lookinside.py writes for an edition: {count, pages:[{file,label,w,h}]}
		const published = {
			...manifest,
			[l.slug]: { count: 1, pages: [{ file: `${l.slug}/p1.webp`, label: '1', w: 800, h: 1200 }] },
		};
		assert.equal(hasLookInside(published, l.slug), true, `${l.code} did not switch on`);
	}
	// and an entry with no pages never shows an empty viewer
	assert.equal(hasLookInside({ x: { count: 0, pages: [] } }, 'x'), false);
});

test('every card has a live Buy Direct target, never the checkout for an edition it cannot sell', () => {
	assert.equal(directTarget({ sold: true, slug: 'spanish', built: true }), '#bulk-order');
	assert.equal(
		directTarget({ sold: false, slug: 'anaang', built: true }),
		'/bibles/anaang-bible/#order',
	);
	assert.equal(directTarget({ sold: false, slug: 'x', built: false }), null);
});
