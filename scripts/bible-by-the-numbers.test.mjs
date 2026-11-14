// node --test scripts/bible-by-the-numbers.test.mjs  (unit 2hh)
// The page's numbers must reconcile to the LOCKED tree (a96ac2ef67f9) and the CSVs must be the same data.
// The Python generator refuses to write unless the figures reconcile to an independent recount;
// `python3 scripts/gen-who-speaks.py --selftest-stats` proves the refusal, `--check` proves CSV/JSON drift fails.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const data = JSON.parse(read('src/data/bible-by-the-numbers.json'));
const bookCsv = read('public/data/bible-by-the-numbers-by-book.csv').trim().split('\n');
const chapCsv = read('public/data/bible-by-the-numbers-by-chapter.csv').trim().split('\n');
// Measured from the locked tree at a96ac2ef67f9 (edition 2026.6) by scripts/gen-who-speaks.py; locked whole-canon size 31,085 verses, 1,189 chapters.
const LOCKED = { commit: 'a96ac2ef67f9374b189dac69af70565329ee871f', chapters: 1189, verses: 31085, words: 646172 };
const sumBy = (rows, f) => rows.reduce((a, r) => a + f(r), 0);

test('bound to the lock commit and the locked canon size', () => {
	assert.equal(data.locked_commit, LOCKED.commit);
	assert.equal(data.canon.verses, LOCKED.verses);
	assert.equal(data.totals.chapters, LOCKED.chapters);
	assert.equal(data.totals.verses, LOCKED.verses);
	assert.equal(data.totals.words, LOCKED.words);
	assert.equal(data.books.length, 66);
});
test('chapters, verses and words add up: chapters -> books -> totals, OT + NT = whole', () => {
	assert.equal(data.chapters.length, LOCKED.chapters);
	for (const b of data.books) {
		const cs = data.chapters.filter((c) => c.book === b.book);
		assert.equal(cs.length, b.chapters, b.book);
		assert.equal(sumBy(cs, (c) => c.verses), b.verses, b.book);
		assert.equal(sumBy(cs, (c) => c.words), b.words, b.book);
	}
	assert.equal(sumBy(data.books, (b) => b.words), LOCKED.words);
	assert.equal(data.totals.ot.words + data.totals.nt.words, LOCKED.words);
	assert.equal(data.totals.ot.verses + data.totals.nt.verses, LOCKED.verses);
	assert.equal(data.totals.ot.chapters + data.totals.nt.chapters, LOCKED.chapters);
});
test('extremes are the measured ones', () => {
	assert.deepEqual(data.extremes.chapter_by_words.longest.map((c) => `${c.book} ${c.chapter}`), ['Psalms 119']);
	assert.deepEqual(data.extremes.chapter_by_words.shortest.map((c) => `${c.book} ${c.chapter}`), ['Psalms 117']);
	assert.deepEqual(data.extremes.verse_by_words.longest.map((c) => `${c.book} ${c.chapter}:${c.verse}`), ['2 Kings 6:32']);
	assert.equal(data.extremes.verse_by_words.shortest.length, 8);
	assert.deepEqual(data.extremes.verse_by_chars.shortest.map((c) => `${c.book} ${c.chapter}:${c.verse}`), ['Job 3:2']);
	assert.deepEqual(data.extremes.book_by_words.longest.map((b) => b.book), ['Psalms']);
	assert.deepEqual(data.extremes.book_by_words.shortest.map((b) => b.book), ['2 John']);
});
test('skipped verse numbers: 16 listed, 17 short of the usual 31,102, the page says so', () => {
	assert.equal(sumBy(data.skipped_numbers, (s) => s.numbers.length), 16);
	assert.equal(31102 - data.totals.verses, 17);
});
test('CSVs carry every row and the same numbers', () => {
	assert.equal(bookCsv.length, 67);
	data.books.forEach((b, i) => {
		const c = bookCsv[i + 1].split(',');
		assert.equal(c[0], b.book);
		assert.equal(Number(c[2]), b.chapters);
		assert.equal(Number(c[3]), b.verses);
		assert.equal(Number(c[4]), b.words);
		assert.ok(c[7].startsWith('https://fathersheartbible.com/read/'));
	});
	assert.equal(chapCsv.length, LOCKED.chapters + 1);
	let w = 0;
	chapCsv.slice(1).forEach((l, i) => {
		const c = l.split(',');
		assert.equal(c[0], data.chapters[i].book);
		assert.equal(Number(c[3]), data.chapters[i].words);
		w += Number(c[3]);
	});
	assert.equal(w, LOCKED.words);
});
test('failure path: a tampered count breaks the reconciliation', () => {
	const bad = structuredClone(data);
	bad.books[0].words += 1;
	assert.notEqual(sumBy(bad.books, (b) => b.words), LOCKED.words);
	assert.notEqual(sumBy(bad.chapters.filter((c) => c.book === bad.books[0].book), (c) => c.words), bad.books[0].words);
});

const astro = read('src/pages/bible-by-the-numbers.astro');
const datasetBlock = (src) => src.slice(src.indexOf("'@type': 'Dataset'"), src.indexOf("'@type': 'FAQPage'"));
test('Dataset JSON-LD has citation and isAccessibleForFree: true, licence only /copyright/; FAQ + Breadcrumb present', () => {
	const b = datasetBlock(astro);
	assert.match(b, /isAccessibleForFree: true,/);
	assert.match(b, /citation: CITE,/);
	// 3ad (pmseoaeo 11-13): license may ONLY point at the existing all-rights-reserved /copyright/ terms (grants no
	// new rights). A permissive/CC data licence is still Kevin's decision (2he) and fails here.
	for (const m of b.matchAll(/license:\s*'([^']*)'/g)) assert.equal(m[1], 'https://fathersheartbible.com/copyright/');
	assert.doesNotMatch(b, /creativecommons|opendatacommons|\bCC[- ]?BY\b|\bCC0\b/i);
	assert.match(astro, /const CITE = `/);
	assert.match(astro, /'@type': 'FAQPage'/);
	assert.match(astro, /'@type': 'BreadcrumbList'/);
	assert.match(b, /bible-by-the-numbers-by-book\.csv|CSV_BOOK_URL/);
});
test('failure path: the same block without those fields is rejected', () => {
	const b = datasetBlock(astro).replace('isAccessibleForFree: true,', '').replace('citation: CITE,', '');
	assert.doesNotMatch(b, /isAccessibleForFree: true,/);
	assert.doesNotMatch(b, /citation: CITE,/);
});
test('page links to /read, to the two sibling data pages, and to no outside Bible site', () => {
	assert.ok(!/biblegateway|biblehub|youversion/i.test(astro));
	assert.match(astro, /\/who-speaks-in-scripture\//);
	assert.match(astro, /\/names-of-god-the-father\//);
	assert.match(astro, /\/read\/\$\{slug/);
});
test('books-of-the-bible carries the pointer; the llms generator lists the page and both CSVs', () => {
	assert.match(read('src/pages/books-of-the-bible.astro'), /href="\/bible-by-the-numbers\/"/);
	const g = read('scripts/llms-answer-pages.mjs');
	assert.match(g, /'bible-by-the-numbers'/);
	assert.match(g, /bible-by-the-numbers-by-book\.csv/);
	assert.match(g, /bible-by-the-numbers-by-chapter\.csv/);
});
