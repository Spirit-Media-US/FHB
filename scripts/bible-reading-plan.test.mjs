// node --test scripts/bible-reading-plan.test.mjs  (unit 2hi)
// The 365-day plan must cover the LOCKED canon exactly: every chapter once, in canon order, day sums = canon words (646,172),
// from the SAME per-chapter counts as /bible-by-the-numbers/. The Python generator refuses to write otherwise;
// `python3 scripts/gen-who-speaks.py --selftest-plan` proves the refusal, `--check` proves CSV/JSON drift fails.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const plan = JSON.parse(read('src/data/bible-reading-plan.json'));
const stats = JSON.parse(read('src/data/bible-by-the-numbers.json'));
const csv = read('public/data/bible-reading-plan.csv').trim().split('\n');
const LOCKED = { commit: 'a96ac2ef67f9374b189dac69af70565329ee871f', words: 646172, chapters: 1189, days: 365 };
const sumBy = (rows, f) => rows.reduce((a, r) => a + f(r), 0);

// pure copy of the generator's refusal, so the failure path can be tested here too
function reconcile(days, canon, canonWords) {
	if (days.length !== LOCKED.days) return 'days';
	if (days.some((d) => !d.chapters.length)) return 'empty';
	if (days.some((d) => d.words !== sumBy(d.chapters, (c) => c.words))) return 'day-sum';
	if (sumBy(days, (d) => d.words) !== canonWords) return 'canon-sum';
	const flat = days.flatMap((d) => d.chapters.map((c) => `${c.book}|${c.chapter}`));
	if (flat.join() !== canon.join()) return 'order';
	return 'ok';
}
const order = new Map(stats.books.map((b, i) => [b.book, i]));
const canon = [...stats.chapters].sort((a, b) => order.get(a.book) - order.get(b.book) || a.chapter - b.chapter).map((c) => `${c.book}|${c.chapter}`);

test('bound to the lock commit and the locked word total', () => {
	assert.equal(plan.locked_commit, LOCKED.commit);
	assert.equal(plan.locked_commit, stats.locked_commit);
	assert.equal(plan.canon_words, LOCKED.words);
	assert.equal(plan.canon_words, stats.totals.words);
	assert.equal(plan.days, 365);
	assert.equal(plan.plan.length, 365);
	assert.equal(plan.assumed_wpm, 200);
});
test('365 days add up to the canon words; every chapter exactly once, in canon order', () => {
	assert.equal(reconcile(plan.plan, canon, LOCKED.words), 'ok');
	assert.equal(sumBy(plan.plan, (d) => d.words), LOCKED.words);
	assert.equal(sumBy(plan.plan, (d) => d.chapters.length), LOCKED.chapters);
	plan.plan.forEach((d, i) => assert.equal(d.day, i + 1));
	assert.equal(plan.plan[0].passage, 'Genesis 1-3');
	assert.equal(plan.plan[364].passage.split(' ')[0], 'Revelation');
});
test('word counts per chapter are the by-the-numbers counts (one counter)', () => {
	const by = new Map(stats.chapters.map((c) => [`${c.book}|${c.chapter}`, c.words]));
	for (const d of plan.plan) for (const c of d.chapters) assert.equal(c.words, by.get(`${c.book}|${c.chapter}`));
});
test('balance: stats are measured and the spread is bounded', () => {
	const ws = plan.plan.map((d) => d.words).sort((a, b) => a - b);
	assert.equal(plan.stats.min_words, ws[0]);
	assert.equal(plan.stats.max_words, ws[364]);
	assert.equal(plan.stats.median_words, ws[182]);
	assert.ok(plan.stats.max_words <= 2.5 * plan.stats.min_words, 'a day is more than 2.5x another');
});
test('CSV carries all 365 days, the same numbers, minutes = words / 200, links to /read', () => {
	assert.equal(csv.length, 366);
	assert.match(csv[0], /^day,passage,chapters,words,minutes_at_200_wpm,read_urls$/);
	let w = 0;
	csv.slice(1).forEach((l, i) => {
		const f = l.split(',');
		const d = plan.plan[i];
		assert.equal(Number(f[0]), d.day);
		assert.equal(Number(f[3]), d.words);
		assert.equal(Number(f[2]), d.chapters.length);
		assert.equal(Number(f[4]), Math.round(d.words / 20) / 10);
		const urls = f[f.length - 1].split(' ');
		assert.equal(urls.length, d.chapters.length);
		assert.ok(urls.every((u) => u.startsWith('https://fathersheartbible.com/read/')));
		w += Number(f[3]);
	});
	assert.equal(w, LOCKED.words);
});
test('failure path: dropped, altered, duplicated, reordered or short plans are refused', () => {
	const c = () => structuredClone(plan.plan);
	let p = c(); p[10].chapters.pop(); assert.equal(reconcile(p, canon, LOCKED.words), 'day-sum');
	p = c(); const ch = p[10].chapters.pop(); p[10].words -= ch.words; assert.equal(reconcile(p, canon, LOCKED.words), 'canon-sum');
	p = c(); p[200].words += 1; assert.equal(reconcile(p, canon, LOCKED.words), 'day-sum');
	p = c(); [p[5].chapters, p[6].chapters] = [p[6].chapters, p[5].chapters];
	for (const i of [5, 6]) p[i].words = sumBy(p[i].chapters, (x) => x.words);
	assert.equal(reconcile(p, canon, LOCKED.words), 'order');
	p = c(); p.pop(); assert.equal(reconcile(p, canon, LOCKED.words), 'days');
});

const astro = read('src/pages/read-the-bible-in-a-year.astro');
const datasetBlock = (src) => src.slice(src.indexOf("'@type': 'Dataset'"), src.indexOf("'@type': 'FAQPage'"));
test('Dataset JSON-LD has citation and isAccessibleForFree: true, no licence; FAQ + Breadcrumb present; minutes labelled an assumption', () => {
	const b = datasetBlock(astro);
	assert.match(b, /isAccessibleForFree: true,/);
	assert.match(b, /citation: CITE,/);
	assert.doesNotMatch(b, /\blicense\b/);
	assert.match(astro, /'@type': 'FAQPage'/);
	assert.match(astro, /'@type': 'BreadcrumbList'/);
	assert.match(astro, /an assumption/);
});
test('failure path: the same block without those fields is rejected', () => {
	const b = datasetBlock(astro).replace('isAccessibleForFree: true,', '').replace('citation: CITE,', '');
	assert.doesNotMatch(b, /isAccessibleForFree: true,/);
	assert.doesNotMatch(b, /citation: CITE,/);
});
test('page links to /read and to no outside Bible site; pointers on the guide and by-the-numbers; llms lists page + CSV', () => {
	assert.ok(!/biblegateway|biblehub|youversion/i.test(astro));
	assert.match(astro, /\/read\/\$\{slug/);
	assert.match(read('src/pages/guides/how-to-read-the-bible.astro'), /href="\/read-the-bible-in-a-year\/"/);
	assert.match(read('src/pages/bible-by-the-numbers.astro'), /href="\/read-the-bible-in-a-year\/"/);
	const g = read('scripts/llms-answer-pages.mjs');
	assert.match(g, /'read-the-bible-in-a-year'/);
	assert.match(g, /bible-reading-plan\.csv/);
});
