// node --test scripts/llms-answer-pages.test.mjs
// Fails when ANY answer page under a covered type is missing from public/llms.txt or
// public/llms-full.txt (run the generator, or `npm run build`, to fix).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { collect, TYPES } from './llms-answer-pages.mjs';

const groups = collect();
const all = groups.flatMap((g) => g.entries);

test('covered types are non-empty and include the named 6ae pages', () => {
	for (const g of groups) assert.ok(g.entries.length > 0, `type "${g.label}" has no pages`);
	for (const u of ['/meaning/forsake/', '/meaning/folly/', '/meaning/consecrate/', '/meaning/sheol/',
		'/verses/thanksgiving/', '/verses/advent/', '/bible-in/ukraine/', '/bible-in/poland/',
		'/bible-in/romania/', '/old-testament/', '/new-testament/', '/books-of-the-bible/', '/global-bible-month/'])
		assert.ok(all.some((e) => e.url === u), `${u} not discovered`);
});

test('every src/pages folder of a covered type is registered', () => {
	// a NEW folder like src/pages/<type>/ with 3+ pages must be added to TYPES or consciously exempted
	const registered = new Set(TYPES.map((t) => t.dir).filter(Boolean));
	const exempt = new Set(['blog', 'bibles', 'print', 'read', 'the-fathers-heart-bible', 'te', 'words', 'glossary-review']);
	for (const d of fs.readdirSync('src/pages', { withFileTypes: true }).filter((x) => x.isDirectory())) {
		if (registered.has(d.name) || exempt.has(d.name)) continue;
		const n = fs.readdirSync(`src/pages/${d.name}`).filter((f) => f.endsWith('.astro') && !f.startsWith('[')).length;
		assert.ok(n < 3, `src/pages/${d.name}/ has ${n} pages but is not in TYPES (or the exempt list)`);
	}
});

for (const file of ['public/llms.txt', 'public/llms-full.txt']) {
	test(`${file} lists every answer page`, () => {
		const text = fs.readFileSync(file, 'utf8');
		const missing = all.filter((e) => !text.includes(`- ${e.url} `)).map((e) => e.url);
		assert.deepEqual(missing, [], `${missing.length} answer page(s) missing from ${file}: ${missing.join(', ')}`);
	});
}

test('every /meaning/ page has a real title and a non-empty answer line', () => {
	const entries = groups.find((g) => g.label === 'Bible words and what they mean').entries;
	// failure path: a page whose title/description the parser cannot read falls back to the slug / empty and fails here
	const bad = entries.filter((e) => !e.description || e.title === e.slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
	assert.deepEqual(bad.map((e) => e.url), [], 'meaning page(s) with unreadable title/description');
});
