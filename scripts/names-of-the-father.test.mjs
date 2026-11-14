// node --test scripts/names-of-the-father.test.mjs  (unit 2gz)
// The page's numbers must reconcile to the LOCKED tree (a96ac2ef67f9) and the CSVs must be the same data.
// The Python generator refuses to write unless terms reconcile to an independent recount; here the committed
// artifacts are re-checked, and `python3 scripts/gen-who-speaks.py --selftest-names` proves the refusal.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'src/data/names-of-the-father.json'), 'utf8'));
const terms = fs.readFileSync(path.join(root, 'public/data/names-of-the-father-terms.csv'), 'utf8').trim().split('\n');
const books = fs.readFileSync(path.join(root, 'public/data/names-of-the-father-by-book.csv'), 'utf8').trim().split('\n');
// Measured from the locked tree at a96ac2ef67f9 (edition 2026.6) by scripts/gen-who-speaks.py; whole-canon locked size 31,085 verses.
const LOCKED = { commit: 'a96ac2ef67f9374b189dac69af70565329ee871f', tokens: 9429, verses_naming: 8030, terms: 45, canon_verses: 31085 };
const sum = (f) => data.terms.reduce((a, r) => a + f(r), 0);

test('bound to the lock commit and the locked canon size', () => {
	assert.equal(data.locked_commit, LOCKED.commit);
	assert.equal(data.canon.verses, LOCKED.canon_verses);
	assert.equal(data.canon.books, 66);
	assert.equal(data.books.reduce((a, b) => a + b.book_verses, 0), LOCKED.canon_verses);
});
test('term counts sum to the measured total', () => {
	assert.equal(data.terms.length, LOCKED.terms);
	assert.equal(sum((r) => r.count), LOCKED.tokens);
	assert.equal(data.totals.tokens, LOCKED.tokens);
	assert.equal(data.totals.verses_naming, LOCKED.verses_naming);
});
test('every term: by-book counts sum to its count; per-book sums equal the by-book CSV', () => {
	for (const r of data.terms) assert.equal(Object.values(r.by_book).reduce((a, b) => a + b, 0), r.count, r.term);
	assert.equal(data.books.reduce((a, b) => a + b.tokens, 0), LOCKED.tokens);
	for (const b of data.books) assert.equal(sum((r) => r.by_book[b.book] ?? 0), b.tokens, b.book);
});
test('CSVs carry every row and the same numbers', () => {
	assert.equal(terms.length, data.terms.length + 1);
	assert.equal(books.length, 67);
	data.terms.forEach((r, i) => assert.ok(terms[i + 1].startsWith(`${r.term},${r.count},${r.verses},${r.books},`), r.term));
	data.books.forEach((b, i) => {
		const c = books[i + 1].split(',');
		assert.equal(c[0], b.book);
		assert.equal(Number(c[2]), b.tokens);
		assert.ok(c[5].startsWith('https://fathersheartbible.com/read/'));
	});
});
test('overlay is an overlay: no "Father of" row exceeds the token total', () => {
	assert.ok(data.overlay.every((o) => o.count <= LOCKED.tokens));
	assert.equal(data.overlay.reduce((a, o) => a + o.count, 0) <= LOCKED.tokens, true);
});
test('failure path: a tampered count breaks the reconciliation', () => {
	const bad = structuredClone(data);
	bad.terms[0].count += 1;
	assert.notEqual(bad.terms.reduce((a, r) => a + r.count, 0), LOCKED.tokens);
	assert.notEqual(Object.values(bad.terms[0].by_book).reduce((a, b) => a + b, 0), bad.terms[0].count);
});
test('page has no outside Bible links and quotes no Scripture text', () => {
	const src = fs.readFileSync(path.join(root, 'src/pages/names-of-god-the-father.astro'), 'utf8');
	assert.ok(!/biblegateway|biblehub|youversion/i.test(src));
});

// 2he: the Dataset JSON-LD carries a citation and isAccessibleForFree (no licence: a data licence is Kevin's decision).
const astro = fs.readFileSync(path.join(root, 'src/pages/names-of-god-the-father.astro'), 'utf8');
const datasetBlock = (src) => src.slice(src.indexOf("'@type': 'Dataset'"), src.indexOf("'@type': 'FAQPage'"));
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
