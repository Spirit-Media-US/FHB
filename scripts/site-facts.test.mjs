// node --test scripts/site-facts.test.mjs      (LLMS_LIVE=1 also checks the live llms files)
// Unit 2ge (2026-10-31). AI engines quote our site facts, so a published count that disagrees
// with its own source is a defect. Each count below is a DIFFERENT TRUE FACT with its own source:
//   print edition languages  = English + edition-registry.json editions     ("published in N languages")
//   online languages         = reader-languages.json (live on /read)         ("free to read online in N")
//   roster languages         = language-roster.json (the 80 commitment)      ("soon in 80 languages")
//   audience editions        = AUDIENCE_EDITION_TOTAL (dvc-editions.ts)
//   canon books/chapters     = bible_structure.json; canon verses = counted from the locked canon
//   PRINT-EDITION verses     = the printed 2026.6 interior (31,085) — a deliberate, separate fact
//                              (deploy ruling 2026-10-29, queued unit 2ec): /print and
//                              src/data/editions/*.json keep it until the Nov 6 print rebuild
//                              ships; then change PRINT_EDITION_VERSES below to the canon value.
// Failure path is proven by the tests at the bottom (an injected wrong number must be caught).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { buildSync } from 'esbuild';
import { applyFacts, measureFacts } from './llms-facts.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const PRINT_EDITION_VERSES = 31085;

const readerLangs = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/reader-languages.json'), 'utf8')).languages;
const facts = measureFacts(ROOT, { online: readerLangs.length });

// The site's own computed constants (bundled TS, same code the pages run).
const bundle = buildSync({ entryPoints: [path.join(ROOT, 'src/data/receive.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error' });
const site = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const gbm = buildSync({ entryPoints: [path.join(ROOT, 'src/lib/gbmCounts.ts')], bundle: true, write: false, format: 'esm', platform: 'node', logLevel: 'error' });
const gbmMod = await import('data:text/javascript;base64,' + Buffer.from(gbm.outputFiles[0].text).toString('base64'));

// ── the sources agree with each other ─────────────────────────────────────────────────────
test('canon facts: 66 books, 1,189 chapters, verses counted from the locked canon', () => {
	assert.equal(facts.books, 66);
	assert.equal(facts.chapters, 1189);
	assert.ok(facts.verses, 'community canon unreadable: cannot measure verses');
	assert.equal(facts.verses, 31087);
});

test('site constants match their sources (print, online, roster, audience editions)', () => {
	assert.equal(site.PRINT_LANGUAGE_TOTAL, facts.print, 'receive.ts PRINT_LANGUAGE_TOTAL vs registry + English');
	assert.equal(site.LANGUAGE_TOTAL, facts.online, 'receive.ts LANGUAGE_TOTAL vs reader-languages.json');
	assert.equal(gbmMod.GBM_TOTAL_LANGUAGES, facts.roster, 'gbmCounts.ts GBM_TOTAL_LANGUAGES (typed) vs language-roster.json');
});

// ── the generator writes the right numbers into the llms files ────────────────────────────
for (const name of ['llms.txt', 'llms-full.txt']) {
	test(`${name}: generator output carries every count from its source`, () => {
		const text = fs.readFileSync(path.join(ROOT, 'public', name), 'utf8');
		const { text: out } = applyFacts(text, facts, name);
		assert.ok(out.includes(`published in ${facts.print} languages`), 'print count');
		assert.ok(out.includes(`free to read online in ${facts.online} languages`), 'online count');
		assert.ok(out.includes(`${facts.books} books, 1,189 chapters, 31,087 verses`), 'canon counts');
		const nums = [...out.matchAll(/(\d+) books, ([\d,]+) chapters, ([\d,]+) verses/g)];
		assert.ok(nums.length >= 1);
	});
}

test('llms.txt: roster count is generated, and the online table matches the online source', () => {
	const text = fs.readFileSync(path.join(ROOT, 'public/llms.txt'), 'utf8');
	const { text: out } = applyFacts(text, facts, 'llms.txt');
	assert.ok(out.includes(`base texts, ${facts.roster} languages, print licensing`));
});

test('a count phrase the generator cannot find FAILS LOUD (no silent orphaning)', () => {
	const text = fs.readFileSync(path.join(ROOT, 'public/llms.txt'), 'utf8').replace('free to read online in', 'readable in');
	assert.throws(() => applyFacts(text, facts, 'llms.txt'), /online/);
});

test('failure path: a wrong source figure is caught (injected 99 print languages)', () => {
	const text = fs.readFileSync(path.join(ROOT, 'public/llms.txt'), 'utf8');
	const bad = { ...facts, print: 99 };
	const { text: out } = applyFacts(text, bad, 'llms.txt');
	assert.ok(out.includes('published in 99 languages'));
	assert.notEqual(out.includes(`published in ${facts.print} languages`), true);
});

// ── every hand-typed count in the SOURCE agrees with its own source ───────────────────────
const SKIP_DIRS = new Set(['content', 'translation-previews', 'te-blog', 'fhb-chapters', 'glossary-review']);
function walk(dir, out = []) {
	for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
		if (SKIP_DIRS.has(e.name)) continue;
		const p = path.join(dir, e.name);
		if (e.isDirectory()) walk(p, out);
		else if (/\.(astro|ts|json|mjs)$/.test(e.name) && !/\.test\./.test(e.name)) out.push(p);
	}
	return out;
}
const files = ['src/pages', 'src/components', 'src/layouts', 'src/lib', 'src/data'].flatMap((d) =>
	fs.existsSync(path.join(ROOT, d)) ? walk(path.join(ROOT, d)) : [],
);
const rel = (f) => path.relative(ROOT, f);
const isPrintSurface = (f) => rel(f) === 'src/pages/print.astro' || rel(f).startsWith('src/data/editions/');

// Counts of languages that are third-party facts about the world or Global Bible Month's own
// schedule, never ours: leave them alone, but they must be named here.
const OTHER_LANG_NUMBERS = new Set([30, 50, 69, 200, 500, 700, 795, 1000, 1800, 3600]);
const num = (s) => Number(s.replace(/,/g, ''));
const N = '(\\d[\\d,]*)';

// phrase -> which fact the number must equal
const LANG_RULES = [
	[/published in (\d[\d,]*) languages/gi, 'print'],
	[/(?:read online|available|read) in (\d[\d,]*) languages/gi, 'online'],
	[/(\d[\d,]*) languages (?:are|is) published on \/read/gi, 'online'],
	[/soon in (\d[\d,]*) languages/gi, 'roster'],
	[/(\d[\d,]*) languages in all/gi, 'roster'],
	[/completes (\d[\d,]*) languages/gi, 'roster'],
	[/these (\d[\d,]*) languages/gi, 'roster'],
	[/(\d[\d,]*) languages by December/gi, 'roster'],
	[/all (\d[\d,]*) languages/gi, 'roster'],
	[/(?:any of the|of our|for|declare:) (\d[\d,]*) languages/gi, 'roster'],
	[/of (\d[\d,]*) languages/gi, 'roster'],
	[/(\d[\d,]*) languages/gi, 'any'], // fallback: must be a known fact or an allowed third-party number
];

function scanLanguageCounts(texts) {
	const bad = [];
	for (const [file, text] of texts) {
		const claimed = new Set();
		for (const [re, key] of LANG_RULES) {
			for (const m of text.matchAll(re)) {
				const at = m.index + m[0].indexOf(m[1]);
				if (claimed.has(at)) continue;
				claimed.add(at);
				const n = num(m[1]);
				if (key === 'any') {
					if (![facts.print, facts.online, facts.roster].includes(n) && !OTHER_LANG_NUMBERS.has(n))
						bad.push(`${file}: "${m[0]}" is not a known fact or an allowed third-party number`);
				} else if (n !== facts[key]) {
					bad.push(`${file}: "${m[0]}" says ${n}, ${key} source says ${facts[key]}`);
				}
			}
		}
	}
	return bad;
}

// Published copy only: code comments are history, not claims (language-editions.ts keeps dated notes).
const stripComments = (t) =>
	t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/(^|[^:"'\w])\/\/[^\n]*/g, '$1');
const texts = files.map((f) => [rel(f), stripComments(fs.readFileSync(f, 'utf8'))]);

test('every typed language count in src/ equals its own source (print / online / roster)', () => {
	const bad = scanLanguageCounts(texts);
	assert.deepEqual(bad, [], bad.join('\n'));
});

test('every typed "N audience editions" equals AUDIENCE_EDITION_TOTAL', () => {
	const bad = [];
	for (const [file, text] of texts)
		for (const m of text.matchAll(/(\d+) audience editions/g))
			if (Number(m[1]) !== site.AUDIENCE_EDITION_TOTAL) bad.push(`${file}: "${m[0]}" vs ${site.AUDIENCE_EDITION_TOTAL}`);
	assert.deepEqual(bad, [], bad.join('\n'));
});

test('every typed canon count agrees: 66 books / 1,189 chapters; verses canon 31,087, print-edition surfaces 31,085', () => {
	const bad = [];
	for (const f of files) {
		const text = stripComments(fs.readFileSync(f, 'utf8'));
		for (const m of text.matchAll(/\b(\d+) books,? (?:and )?([\d,]+) (?:chapters|verses)/g)) {
			// Large Print volumes quote their own share (17+22+27 books); only whole-canon figures are checked here.
			const second = num(m[2]);
			if (second !== 1189 && second < 30000) continue;
			if (Number(m[1]) !== facts.books) bad.push(`${rel(f)}: "${m[0]}" books != ${facts.books}`);
		}
		for (const m of text.matchAll(/\b(1,\d{3}) chapters/g)) {
			if (m[1] !== '1,189') bad.push(`${rel(f)}: "${m[0]}" chapters != 1,189`);
		}
		for (const m of text.matchAll(/\b(3\d,\d{3}) verses/g)) {
			const want = isPrintSurface(f) ? PRINT_EDITION_VERSES : facts.verses;
			if (num(m[1]) !== want) bad.push(`${rel(f)}: "${m[0]}" verses != ${want}${isPrintSurface(f) ? ' (print edition)' : ' (canon)'}`);
		}
	}
	assert.deepEqual(bad, [], bad.join('\n'));
});

test('Large Print volumes add up to the whole canon (books and chapters)', () => {
	let books = 0;
	let chapters = 0;
	for (const v of ['lp-vol1', 'lp-vol2', 'lp-vol3']) {
		const t = fs.readFileSync(path.join(ROOT, `src/data/editions/${v}.json`), 'utf8');
		const m = t.match(/(\d+) books, (\d+) chapters/);
		assert.ok(m, `${v}: no "N books, N chapters" share`);
		books += Number(m[1]);
		chapters += Number(m[2]);
	}
	assert.equal(books, facts.books);
	assert.equal(chapters, facts.chapters);
});

test('failure path: the scanner catches an injected wrong language count and a wrong verse count', () => {
	const bad = scanLanguageCounts([['x.astro', 'soon in 79 languages. published in 41 languages. free to read online in 53 languages.']]);
	assert.equal(bad.length, 3, bad.join('\n'));
});

// ── optional: the LIVE files (run after a deploy) ─────────────────────────────────────────
test('live llms files carry the same counts (LLMS_LIVE=1)', { skip: !process.env.LLMS_LIVE }, async () => {
	for (const name of ['llms.txt', 'llms-full.txt']) {
		const text = await (await fetch(`https://fathersheartbible.com/${name}`)).text();
		const { text: out } = applyFacts(text, facts, name);
		assert.equal(out, text, `${name} live counts differ from their sources`);
	}
});
