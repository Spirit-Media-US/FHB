// node --test scripts/who-speaks.test.mjs  (unit 2gm)
// The page's numbers must reconcile to the LOCKED whole-canon figures and the CSV must be the same data.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'src/data/who-speaks.json'), 'utf8'));
const csv = fs.readFileSync(path.join(root, 'public/data/who-speaks-by-book.csv'), 'utf8').trim().split('\n');
const sum = (k) => data.rows.reduce((a, r) => a + r[k], 0);
// Locked whole-canon figures (edition 2026.6), as printed in public/llms.txt and the edition data.
const LOCKED = { father_words: 128579, father_verses: 5615, son_words: 35725, son_verses: 2053, spirit_words: 95, spirit_verses: 10 };

test('66 books, canon verses match the locked figure', () => {
	assert.equal(data.rows.length, 66);
	assert.equal(sum('book_verses'), data.canon.verses);
});
for (const [k, v] of Object.entries(LOCKED)) {
	test(`book rows sum to locked ${k}`, () => assert.equal(sum(k), v));
}
test('totals block equals the locked figures', () => {
	assert.equal(data.totals.father.words, LOCKED.father_words);
	assert.equal(data.totals.son.verses, LOCKED.son_verses);
});
test('CSV carries every row and the same numbers', () => {
	assert.equal(csv.length, 67);
	const head = csv[0].split(',');
	csv.slice(1).forEach((line, i) => {
		const c = line.split(',');
		const r = data.rows[i];
		assert.equal(c[0], r.book);
		for (const k of Object.keys(LOCKED)) assert.equal(Number(c[head.indexOf(k)]), r[k], `${r.book} ${k}`);
		assert.ok(c[head.indexOf('read_url')].startsWith('https://fathersheartbible.com/read/'));
	});
});
test('failure path: a tampered row breaks the reconciliation', () => {
	const bad = structuredClone(data);
	bad.rows[0].father_words += 1;
	assert.notEqual(bad.rows.reduce((a, r) => a + r.father_words, 0), LOCKED.father_words);
});
test('page has no outside Bible links and uses the trademark form', () => {
	const src = fs.readFileSync(path.join(root, 'src/pages/who-speaks-in-scripture.astro'), 'utf8');
	assert.ok(!/biblegateway|biblehub|youversion/i.test(src));
	// keywords (searcher wording, plain form on purpose) are exempt, single-line or multi-line array
	const body = src
		.replace(/\/\/[^\n]*\n/g, '')
		.replace(/keywords:\s*\[[\s\S]*?\]/g, '')
		.split('\n')
		.filter((l) => !l.includes('keywords:'))
		.join('\n');
	assert.ok(!/Divine Voice Color/.test(body.replace(/Divine Voice™ Color/g, '')));
});

// 2he: the Dataset JSON-LD carries a citation and isAccessibleForFree (no licence: a data licence is Kevin's decision).
const astro = fs.readFileSync(path.join(root, 'src/pages/who-speaks-in-scripture.astro'), 'utf8');
const datasetBlock = (src) => src.slice(src.indexOf("'@type': 'Dataset'"), src.indexOf("'@type': 'FAQPage'") > 0 ? src.indexOf("'@type': 'FAQPage'") : undefined);
test('Dataset JSON-LD has citation and isAccessibleForFree: true, and licence only /copyright/', () => {
	const b = datasetBlock(astro);
	assert.match(b, /isAccessibleForFree: true,/);
	assert.match(b, /citation: CITE,/);
	// 3ad (pmseoaeo 11-13): license may ONLY point at the existing all-rights-reserved /copyright/ terms (grants no
	// new rights). A permissive/CC data licence is still Kevin's decision (2he) and fails here.
	for (const m of b.matchAll(/license:\s*'([^']*)'/g)) assert.equal(m[1], 'https://fathersheartbible.com/copyright/');
	assert.doesNotMatch(b, /creativecommons|opendatacommons|\bCC[- ]?BY\b|\bCC0\b/i);
	assert.match(astro, /const CITE = `/);
});
test('failure path: the same block without those fields is rejected', () => {
	const b = datasetBlock(astro).replace('isAccessibleForFree: true,', '').replace('citation: CITE,', '');
	assert.doesNotMatch(b, /isAccessibleForFree: true,/);
	assert.doesNotMatch(b, /citation: CITE,/);
});
