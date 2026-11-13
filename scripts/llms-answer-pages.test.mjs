// node --test scripts/llms-answer-pages.test.mjs
// Fails when the generator would leave ANY answer page under a covered type out of llms.txt / llms-full.txt.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { collect, TYPES, render, renderFor, apply, LLMS_TXT_DESC_MAX } from './llms-answer-pages.mjs';

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
	// 2sq: the old "<3 pages passes" loophole is gone; a folder is registered, or exempt WITH a reason. (Individual pages
	// inside non-registered folders are checked one by one by the sitemap-parity test below.)
	const exempt = {
		blog: 'posts come from Sanity at build (no src/pages file per post); the /blog/ index is listed by the parity test',
		bibles: 'one dynamic route; every edition page is listed by editionGroup() (2sr, tested below)',
		print: 'print/order is registered as a page; the /print/ hub is hand-listed',
		read: 'the reader is owned by the community app and /sitemap-read.xml',
		'the-fathers-heart-bible': 'two long-form pages, checked individually by the parity test',
		te: 'Telugu blog mirror, dynamic route over Sanity posts',
		words: 'legacy folder, no pages',
		books: 'book pages are registered individually',
		data: 'CSV/JSON endpoints (.ts), not pages; the CSV downloads are listed via DATA_FILES',
		legacy: 'noindex redirect shims',
		'glossary-review': 'noindex native-reviewer pages, excluded from the sitemap',
	};
	for (const d of fs.readdirSync('src/pages', { withFileTypes: true }).filter((x) => x.isDirectory())) {
		if (registered.has(d.name)) continue;
		assert.ok(exempt[d.name], `src/pages/${d.name}/ is not in TYPES and not in the exempt list (give a reason)`);
	}
});

// ---- 2sq (2026-11-11): SITEMAP PARITY. Every marketing page is in the generated llms.txt or EXEMPT with a reason. ----
const generated = apply(fs.readFileSync('public/llms.txt', 'utf8'), renderFor('public/llms.txt', groups));
// url -> reason. Only pages a visitor/AI engine would not look for in an answer index, or noindex/legal boilerplate.
export const PAGE_EXEMPT = {
	'/404/': 'error page, not in the sitemap',
	'/glossary-review/': 'noindex reviewer hub, filtered out of the sitemap',
	'/legacy/youversion/': 'noindex legacy shim',
	'/review/': 'noindex internal review page',
	'/privacy/': 'legal boilerplate, linked from every footer',
	'/terms/': 'legal boilerplate, linked from every footer',
	'/returns/': 'policy boilerplate, linked from every footer',
	'/bibles/': 'edition hub (2xz): only a directory of the /bibles/<slug>-bible/ pages that llms.txt already names one by one; llms.txt sits at its 70 KB cap',
};
function staticRoutes(dir = 'src/pages', rel = '') {
	const out = [];
	for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
		if (f.name.startsWith('[')) continue; // dynamic routes: bibles/ (listed from data), blog/ (Sanity), te/blog
		if (f.isDirectory()) out.push(...staticRoutes(`${dir}/${f.name}`, `${rel}${f.name}/`));
		else if (f.name.endsWith('.astro')) {
			const r = (rel + f.name.replace(/\.astro$/, '')).replace(/(^|\/)index$/, '');
			out.push(`/${r}${r ? '/' : ''}`);
		}
	}
	return out;
}
const listed = (u) => new RegExp(`(^|[\\s(\`])${u.replace(/\/$/, '')}/?(?=[\\s).,:\`]|$)`, 'm').test(generated);

test('sitemap parity: every marketing page is listed in llms.txt or exempt with a reason', () => {
	const routes = staticRoutes();
	assert.ok(routes.length > 30, 'route walk found too few pages');
	const missing = routes.filter((u) => !listed(u) && !PAGE_EXEMPT[u]);
	assert.deepEqual(missing, [], `${missing.length} page(s) neither listed in llms.txt nor exempt: ${missing.join(', ')}`);
	for (const [u, why] of Object.entries(PAGE_EXEMPT)) assert.ok(why.length > 10, `${u} exempt without a reason`);
	assert.ok(routes.includes('/books/beloved-identity/') && listed('/books/beloved-identity/'), 'beloved-identity not listed');
});

test('sitemap parity: the exempt list holds no stale or already-listed page', () => {
	const routes = new Set(staticRoutes());
	for (const u of Object.keys(PAGE_EXEMPT)) assert.ok(routes.has(u), `exempt ${u} is not a page any more`);
});

test("hand-written 'Reader home' line points at /read/ (the canonical URL, /read is a 301)", () => {
	assert.match(generated, /Reader home: \/read\/(\s|$)/m);
	assert.doesNotMatch(generated, /Reader home: \/read(\s|$)/m);
});

// ---- 2sr: every /bibles/<slug>-bible/ edition page is listed (generated from the edition data) ----
import { editionGroup } from './llms-answer-pages.mjs';
test('every /bibles edition page is in llms.txt (hand-written audience list or generated group)', () => {
	const eds = [];
	for (const f of fs.readdirSync('src/data/editions').filter((x) => /^[a-z0-9-]+\.json$/.test(x))) {
		const e = JSON.parse(fs.readFileSync(`src/data/editions/${f}`, 'utf8'));
		if (e && typeof e.slug === 'string' && e.listing && e.hook) eds.push(`/bibles/${e.slug}-bible/`);
	}
	assert.ok(eds.length > 90, `expected ~100 edition pages, found ${eds.length}`);
	const missing = eds.filter((u) => !generated.includes(u));
	assert.deepEqual(missing, [], `${missing.length} /bibles page(s) not in generated llms.txt`);
	const g = editionGroup();
	assert.ok(g.entries.length > 70 && g.entries.every((e) => e.title && e.description));
});

test('generated llms.txt stays under 70 KB', () => {
	assert.ok(Buffer.byteLength(generated) < 70000, `llms.txt would be ${Buffer.byteLength(generated)} bytes`);
});
// 3bo: llms.txt descriptions are cut to LLMS_TXT_DESC_MAX; llms-full.txt keeps them whole (failure path: an uncut
// description in llms.txt, or a cut one in llms-full.txt, fails here).
test('llms.txt descriptions are capped, llms-full.txt descriptions are whole', () => {
	const long = all.filter((e) => e.description && [...e.description].length > LLMS_TXT_DESC_MAX);
	assert.ok(long.length > 0, 'fixture: some answer page has a long description');
	const idx = renderFor('public/llms.txt', groups), full = renderFor('public/llms-full.txt', groups);
	for (const e of long) {
		assert.ok(!idx.includes(e.description), `${e.url}: full description still in llms.txt`);
		assert.ok(full.includes(e.description), `${e.url}: description cut in llms-full.txt`);
	}
	for (const l of idx.split('\n').filter((x) => x.startsWith('- '))) {
		const d = l.split(' — ').slice(1).join(' — ').split('. ').slice(1).join('. ');
		assert.ok([...d].length <= LLMS_TXT_DESC_MAX, `over cap: ${l.slice(0, 80)}`);
	}
});

// 2hm (2026-11-01): these assert on GENERATOR OUTPUT (apply(committed file, render(groups)) is exactly what
// the build writes), NOT on the committed file's current contents. The committed public/llms*.txt are refreshed
// only by the post-live regen (fhb-announce-drift); lanes must not commit them (10-28 'Nothing to deploy'
// failure), so a test on the committed copy fails on every clean dev checkout whenever a page merges.
for (const file of ['public/llms.txt', 'public/llms-full.txt']) {
	test(`generator output for ${file} lists every answer page`, () => {
		const text = apply(fs.readFileSync(file, 'utf8'), renderFor(file, groups));
		const missing = all.filter((e) => !text.includes(`- ${e.url} `)).map((e) => e.url);
		assert.deepEqual(missing, [], `${missing.length} answer page(s) missing from generated ${file}: ${missing.join(', ')}`);
	});
}

test('every /meaning/ page has a real title and a non-empty answer line', () => {
	const entries = groups.find((g) => g.label === 'Bible words and what they mean').entries;
	// failure path: a page whose title/description the parser cannot read falls back to the slug / empty and fails here
	const bad = entries.filter((e) => !e.description || e.title === e.slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()));
	assert.deepEqual(bad.map((e) => e.url), [], 'meaning page(s) with unreadable title/description');
});

// ---- 2he (2026-11-01): pages that wrap their text in fitTitle()/fitDescription() ----
import os from 'node:os';
import path from 'node:path';
import { meta, DATA_FILES } from './llms-answer-pages.mjs';

test('meta() reads title/description written through fitTitle()/fitDescription() (fixture)', () => {
	const d = fs.mkdtempSync(path.join(os.tmpdir(), 'llms-2he-'));
	const f = path.join(d, 'p.astro');
	fs.writeFileSync(f, "---\nconst TITLE = fitTitle(\"Fixture Page: It's Wrapped\");\nconst DESCRIPTION = fitDescription(\n\t'A wrapped description that must be read.',\n);\n---\n");
	const m = meta(f, d);
	assert.equal(m.title, "Fixture Page: It's Wrapped");
	assert.equal(m.description, 'A wrapped description that must be read.');
});

test('every answer page has a description (none is a bare title)', () => {
	assert.deepEqual(all.filter((e) => !e.description).map((e) => e.url), []);
});

test('original-data pages and their 6 CSVs are listed, with the page title and derived descriptions', () => {
	for (const u of ['/who-speaks-in-scripture/', '/names-of-god-the-father/', '/bible-by-the-numbers/', '/read-the-bible-in-a-year/']) {
		const e = all.find((x) => x.url === u);
		assert.ok(e, `${u} not discovered`);
		assert.ok(e.title.length > 20 && e.description.length > 60, `${u} title/description not read`);
	}
	assert.equal(DATA_FILES.length, 6);
	for (const f of DATA_FILES) assert.ok(all.some((e) => e.url === `/${f.replace(/^public\//, '')}` && /rows\. Columns:/.test(e.description)), `${f} not listed`);
	const out = render(groups);
	assert.equal((out.match(/- \/names-of-god-the-father\/ /g) || []).length, 1);
	assert.equal((out.match(/\.csv /g) || []).length, 6);
});
