#!/usr/bin/env node
// PROPOSAL (Seat B) — reader sitemap generator for the MARKETING app (/srv/sites/FHB).
//
// WHY THIS EXISTS
// The live https://fathersheartbible.com/sitemap-0.xml is built by the MARKETING
// app (proved byte-identical to https://fathersheartbible.pages.dev/sitemap-0.xml).
// It enumerates the 1,190 ENGLISH /read chapters as @astrojs/sitemap `customPages`
// and lists ZERO non-English chapters. @astrojs/sitemap's built-in `i18n` option
// cannot express our URL shape (en = /read/<book>/<ch>, others = /read/<lang>/<book>/<ch>)
// and cannot emit xhtml:link alternates at all — so the reader gets its OWN
// hreflang-annotated sitemap file, generated here.
//
// INTENDED WIRING (marketing repo):
//   1. package.json build: ... && node scripts/gen-sitemap-read.mjs && astro build ...
//      (must run BEFORE astro build so the file lands in dist/ from public/)
//   2. astro.config.mjs: DELETE the `readPages` block + its spread from customPages —
//      this file becomes the single owner of every /read URL. Leaves /read/ itself
//      to the hub listing below.
//   3. public/robots.txt: add  Sitemap: https://fathersheartbible.com/sitemap-read.xml
//   4. Submit https://fathersheartbible.com/sitemap-read.xml to GSC + Bing
//      (Seat B owns the submission step).
//
// SOURCE OF TRUTH
//   Chapter existence: /home/deploy/bin/tools-api/pipelines/translation/output/
//     {locked,drafts}/            -> English
//     {locked,drafts}/<lang>/     -> other languages
//   (Same inputs the marketing app's scripts/sync-translations.mjs already reads,
//   and the same inputs community's sync uses — so build-time truth is shared.)
//
//   Which languages RENDER: `live: true` in /srv/sites/community/src/lib/languages.ts.
//   That registry lives in the OTHER repo, so LIVE_LANGS below is a deliberate
//   mirror. KNOWN COUPLING: flipping a language live in community requires updating
//   this list, or its chapters stay unlisted. Verified against the registry
//   2026-08-04: live = en, te, es, hi, ta;  pt + mr are live:false and 404 in
//   production (probed) — listing them would violate the never-list-a-404 rule.
//   2026-08-08: mr added — full canon complete, Gate A2 PASS, flipped live:true in
//   the community registry. mr 404s in production until BOTH apps deploy to main,
//   so these two changes must ship together (the live guard below enforces it).

import fs from 'node:fs';
import path from 'node:path';

const SITE = 'https://fathersheartbible.com';
const TRANSLATION_OUT = '/home/deploy/bin/tools-api/pipelines/translation/output';
// Which languages RENDER is decided by `live: true` in community's registry.
// This USED to be a hand-copied list, and the coupling bit repeatedly: flip a
// language live in community, forget this line, and its chapters silently never
// enter the sitemap or hreflang. Read the registry instead — both repos sit on
// the same box and the chrome sync already reads across, so this is the same
// build-time-truth pattern, not a new dependency.
//
// The literal fallback is the last-known-good list, used only if the registry
// cannot be read (a detached build elsewhere). It can go stale; the parse cannot.
//
// ⚠ CONSEQUENCE OF DERIVING THIS: flipping a language live in community no
// longer changes any FILE here, so nothing triggers an FHB rebuild and the
// sitemap silently keeps the old language set. Deploying community after a
// live-flip must be followed by an FHB deploy (an empty commit is enough).
// Both apps have always had to ship together for a language launch; this is
// the same rule, with the reason moved.
const LIVE_LANGS = (() => {
	const FALLBACK = ['en', 'te', 'es', 'hi', 'ta', 'mr', 'pt', 'ru', 'fr', 'id'];
	try {
		const src = fs.readFileSync('/srv/sites/community/src/lib/languages.ts', 'utf8');
		const live = [];
		for (const m of src.matchAll(/code:\s*"([a-z-]+)"[\s\S]{0,120}?live:\s*(true|false)/g)) {
			if (m[2] === 'true' && !live.includes(m[1])) live.push(m[1]);
		}
		if (live.length === 0) throw new Error('registry parsed to zero live languages');
		console.log(`[gen-sitemap-read] live languages from registry: ${live.join(', ')}`);
		return live;
	} catch (err) {
		console.warn(`[gen-sitemap-read] registry unreadable (${err.message}); using fallback list`);
		return FALLBACK;
	}
})();
const OUT = path.resolve(process.cwd(), 'public/sitemap-read.xml');

// The same live list, with each language's English name, for the PAGES (Kevin 2026-10-14:
// "Never allow read to get behind again"). src/data/receive.ts counts and links every live
// reader language from this file, so Home, About and /legacy/ follow the reader on the next
// build with no list to remember. Written only when the registry was read; the committed copy
// is the last-known-good for a build that cannot see the community repo.
try {
	const src = fs.readFileSync('/srv/sites/community/src/lib/languages.ts', 'utf8');
	const rows = [];
	for (const m of src.matchAll(
		/code:\s*"([a-z-]+)",\s*name:\s*"([^"]+)"[\s\S]{0,120}?live:\s*(true|false)/g,
	)) {
		if (m[3] === 'true' && !rows.some((r) => r.code === m[1]))
			rows.push({ code: m[1], name: m[2] });
	}
	const missing = LIVE_LANGS.filter((c) => !rows.some((r) => r.code === c));
	if (rows.length === 0 || missing.length > 0) {
		throw new Error(
			`names parsed for ${rows.length} of ${LIVE_LANGS.length} live languages (missing: ${missing.join(', ')})`,
		);
	}
	const file = path.resolve(process.cwd(), 'src/data/reader-languages.json');
	const next = `${JSON.stringify({ _source: 'GENERATED by scripts/gen-sitemap-read.mjs from /srv/sites/community/src/lib/languages.ts (live: true). Never hand-edit.', languages: rows }, null, '\t')}\n`;
	if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== next) fs.writeFileSync(file, next);
	console.log(`[gen-sitemap-read] reader-languages.json: ${rows.length} live languages`);
} catch (err) {
	console.error(`[gen-sitemap-read] reader-languages.json NOT refreshed: ${err.message}`);
	process.exit(1);
}

const slugify = (book) => book.toLowerCase().replace(/\s+/g, '-');

// Collect { slug: Set<chapterNumber> } for one language from locked/ + drafts/.
function collect(lang) {
	const roots =
		lang === 'en'
			? [path.join(TRANSLATION_OUT, 'locked'), path.join(TRANSLATION_OUT, 'drafts')]
			: [path.join(TRANSLATION_OUT, 'locked', lang), path.join(TRANSLATION_OUT, 'drafts', lang)];
	const books = new Map();
	for (const root of roots) {
		if (!fs.existsSync(root)) continue;
		for (const bookDir of fs.readdirSync(root)) {
			const abs = path.join(root, bookDir);
			if (!fs.statSync(abs).isDirectory()) continue;
			const slug = slugify(bookDir);
			if (!books.has(slug)) books.set(slug, new Set());
			for (const file of fs.readdirSync(abs)) {
				const m = /^0*(\d+)\.json$/.exec(file);
				if (m) books.get(slug).add(Number(m[1]));
			}
		}
	}
	return books;
}

// English uses reading_edition.json as its publish gate (a draft not listed there
// is NOT public) — mirror the existing astro.config logic exactly.
function englishGate(books) {
	const manifestPath = path.join(TRANSLATION_OUT, 'reading_edition.json');
	if (!fs.existsSync(manifestPath)) return books;
	// The marketing app's own src/content/bible/_manifest.json is the already-gated
	// artifact; prefer it when present (it is, post sync-translations).
	const synced = path.resolve(process.cwd(), 'src/content/bible/_manifest.json');
	if (!fs.existsSync(synced)) return books;
	const m = JSON.parse(fs.readFileSync(synced, 'utf8'));
	const gated = new Map();
	for (const [slug, entry] of Object.entries(m.books || {})) {
		const ch = new Set([...(entry.lockedChapters || []), ...(entry.readingEditionChapters || [])]);
		if (ch.size) gated.set(slug, ch);
	}
	return gated.size ? gated : books;
}

const byLang = new Map();
for (const lang of LIVE_LANGS) {
	let books = collect(lang);
	if (lang === 'en') books = englishGate(books);
	byLang.set(lang, books);
}

// URL for a chapter. English is the implicit default and has NO lang segment.
// D7 localized book-name URLs (community lib/slug-map.ts, phase 1 = es). The URL
// uses the language's own book token; the English key stays the data key. MUST
// mirror community's LOCALIZED_SLUG_LANGS + slug rule — read both from the
// community repo rather than keeping a second copy that can drift.
const LOCALIZED = (() => {
	try {
		const src = fs.readFileSync('/srv/sites/community/src/lib/slug-map.ts', 'utf8');
		const m = src.match(/LOCALIZED_SLUG_LANGS[^=]*=\s*\[([^\]]*)\]/);
		return m ? [...m[1].matchAll(/"([a-z-]+)"/g)].map((x) => x[1]) : [];
	} catch {
		return [];
	}
})();
const slugifyName = (name) =>
	name
		.normalize('NFKD')
		.replace(/\p{M}+/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
const LOCAL_SLUGS = new Map(); // lang -> Map(key -> local slug)
for (const lang of LOCALIZED) {
	try {
		const dict = JSON.parse(fs.readFileSync(`/srv/sites/community/src/i18n/${lang}.json`, 'utf8'));
		const t = new Map();
		const seen = new Set();
		for (const [key, name] of Object.entries(dict.books || {})) {
			const slug = slugifyName((dict.booksRomanized || {})[key] || name || '');
			if (!slug || seen.has(slug))
				throw new Error(`bad slug table for ${lang}: ${key} -> '${slug}'`);
			seen.add(slug);
			t.set(key, slug);
		}
		LOCAL_SLUGS.set(lang, t);
		console.log(`[gen-sitemap-read] localized book slugs: ${lang} (${t.size} books)`);
	} catch (err) {
		// Same fail-safe as the reader: a broken table means English keys, never a guessed slug.
		console.warn(
			`[gen-sitemap-read] ${lang} slug table unusable (${err.message}); using English keys`,
		);
	}
}
// SHIP-ORDER GUARD: only use a language's local slugs once PRODUCTION serves them.
// Community (which answers /read/es/juan/…) and this app deploy independently; a
// marketing deploy that lands first must keep English keys, or the live guard below
// would find every localized book 404 and silently drop the language (seen on the
// 2026-09-14 dev build: es 1189 -> 174). Probe one known book per language.
if (process.env.SITEMAP_SKIP_LIVE_CHECK !== '1') {
	for (const [lang, t] of [...LOCAL_SLUGS]) {
		const probe = `${SITE}/read/${lang}/${t.get('john') ?? [...t.values()][0]}/1/`;
		let ok = false;
		try {
			const r = await fetch(probe, { redirect: 'manual' });
			ok = r.status === 200;
		} catch {
			ok = false;
		}
		if (!ok) {
			LOCAL_SLUGS.delete(lang);
			console.warn(
				`[gen-sitemap-read] ${lang}: production does not serve localized slugs yet (${probe}) — using English keys`,
			);
		}
	}
}
const urlSlug = (lang, key) => LOCAL_SLUGS.get(lang)?.get(key) ?? key;

const chapterUrl = (lang, slug, n) =>
	lang === 'en'
		? `${SITE}/read/${urlSlug(lang, slug)}/${n}/`
		: `${SITE}/read/${lang}/${urlSlug(lang, slug)}/${n}/`;

// ── LIVE GUARD: never advertise a chapter production does not serve ──────────
// The chapter data above is the translation pipeline's BUILD-TIME output, which
// runs AHEAD of the community app that actually serves /read. On 2026-08-04 the
// translation seat added Hindi and Tamil Psalms; the community app had shipped
// hi/psalms but not ta/psalms, so a raw generation listed /read/ta/psalms/1/ —
// which 404s. Listing 404s is the one thing this sitemap must never do.
//
// So for every NON-English (lang, book) pair we probe ONE chapter in production.
// A book's chapters deploy together, so one probe settles the whole book — ~80
// requests, a few seconds. English is the canon and is never probed.
//
// Fail-open on a network/probe error (keep the book, warn loudly): a transient
// outage must not silently delete thousands of good URLs from the sitemap.
// Set SITEMAP_SKIP_LIVE_CHECK=1 to bypass entirely (offline builds).
const SKIP = process.env.SITEMAP_SKIP_LIVE_CHECK === '1';
async function pruneToLive() {
	if (SKIP) {
		console.warn('gen-sitemap-read: SITEMAP_SKIP_LIVE_CHECK=1 — live guard DISABLED');
		return;
	}
	const jobs = [];
	for (const [lang, books] of byLang) {
		if (lang === 'en') continue;
		for (const [slug, chapters] of books) {
			const probe = [...chapters].sort((a, b) => a - b)[0];
			jobs.push({ lang, slug, probe });
		}
	}
	let dropped = 0;
	let errors = 0;
	// Modest concurrency — this hits our own production edge.
	const QUEUE = [...jobs];
	const worker = async () => {
		while (QUEUE.length) {
			const j = QUEUE.shift();
			const url = chapterUrl(j.lang, j.slug, j.probe);
			try {
				const ac = new AbortController();
				const t = setTimeout(() => ac.abort(), 15000);
				const r = await fetch(url, { method: 'GET', signal: ac.signal });
				clearTimeout(t);
				if (r.status === 404) {
					byLang.get(j.lang).delete(j.slug);
					dropped++;
					console.warn(
						`gen-sitemap-read: DROPPED ${j.lang}/${j.slug} — ${url} is 404 in production ` +
							`(translated but not deployed to the reader yet)`,
					);
				} else if (!r.ok) {
					errors++;
					console.warn(`gen-sitemap-read: probe ${url} returned ${r.status} — keeping book`);
				}
			} catch (e) {
				errors++;
				console.warn(`gen-sitemap-read: probe failed for ${url} (${e.message}) — keeping book`);
			}
		}
	};
	await Promise.all(Array.from({ length: 6 }, worker));
	console.log(
		`gen-sitemap-read: live guard checked ${jobs.length} non-English books — ` +
			`${dropped} dropped, ${errors} inconclusive`,
	);
}
await pruneToLive();

// ── Reader entry links for /bibles/<lang>-bible (full-site audit M6, 2026-10-21) ──
// Each language's print-edition page linked only to /read/<lang>/, so the pages
// Google trusts most in that language passed nothing to its chapters, and the 64
// edition pages shared 53% of their text (audit M8). Here: a dozen well-known
// chapters per language, labelled with the language's OWN book names (community
// i18n) and its real URL (local slug, live-guarded above), so no link is a 301 or
// a 404. Written beside reader-languages.json; [slug].astro renders it.
// Psalm labels: ru/uk/el number by the Septuagint (community lib/psalm-numbering.ts);
// both psalms used here sit in the plain -1 range, ru shows theirs first.
const ENTRY_CHAPTERS = [
	['genesis', 1], ['psalms', 23], ['psalms', 91], ['proverbs', 3], ['isaiah', 53],
	['matthew', 5], ['luke', 15], ['john', 3], ['romans', 8], ['1-corinthians', 13],
	['ephesians', 1], ['revelation', 21],
];
const LXX = { ru: 'lxx-first', uk: 'ours-first', el: 'ours-first' };
try {
	const entry = {};
	for (const [lang, books] of byLang) {
		if (lang === 'en') continue;
		const dict = JSON.parse(fs.readFileSync(`/srv/sites/community/src/i18n/${lang}.json`, 'utf8'));
		const links = [];
		for (const [key, n] of ENTRY_CHAPTERS) {
			const name = (dict.books || {})[key];
			if (!name || !books.get(key)?.has(n)) continue;
			let num = String(n);
			if (key === 'psalms' && LXX[lang])
				num = LXX[lang] === 'lxx-first' ? `${n - 1} (${n})` : `${n} (${n - 1})`;
			links.push({ href: chapterUrl(lang, key, n).replace(SITE, ''), label: `${name} ${num}`, book: key, ch: n });
		}
		if (links.length) entry[lang] = links;
	}
	const file = path.resolve(process.cwd(), 'src/data/reader-entry-links.json');
	const next = `${JSON.stringify({ _source: 'GENERATED by scripts/gen-sitemap-read.mjs (live-guarded chapters, community i18n book names). Never hand-edit.', languages: entry }, null, '\t')}\n`;
	if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== next) fs.writeFileSync(file, next);
	console.log(`[gen-sitemap-read] reader-entry-links.json: ${Object.keys(entry).length} languages`);
} catch (err) {
	console.error(`[gen-sitemap-read] reader-entry-links.json NOT refreshed: ${err.message}`);
	process.exit(1);
}

// Group by <book>/<chapter> so every language sharing a chapter gets a mutually
// consistent set of xhtml:link alternates (Google requires the annotations be
// reciprocal). x-default -> English when English has the chapter.
const groups = new Map();
for (const [lang, books] of byLang) {
	for (const [slug, chapters] of books) {
		for (const n of chapters) {
			const key = `${slug}/${n}`;
			if (!groups.has(key)) groups.set(key, new Map());
			groups.get(key).set(lang, chapterUrl(lang, slug, n));
		}
	}
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ── <lastmod>, per chapter (2026-09-19) ──────────────────────────────────────────
// WHY THIS MATTERS MORE THAN IT LOOKS. This sitemap emitted <changefreq> and
// <priority> — the two hints Google has said publicly that it IGNORES — and no
// <lastmod>, the one it actually uses to schedule crawling. FHB publishes ~16,400
// reader URLs against a measured Googlebot budget of 6,060 requests/week: 0.39
// crawls per URL per week. At that ratio the budget is not merely small, it is spent
// BLIND — nothing distinguishes a chapter we rewrote this morning from one untouched
// since June, so re-crawls land on pages Google already has while 147 sampled URLs
// sit unreached at last_crawl=None.
//
// SOURCE: the reader data the site actually serves, which carries a per-chapter
// updatedAt (one file per BOOK, so ~66 reads per language rather than 16,400).
//
// NEVER GUESS A DATE. A sitemap claiming everything changed today is worse than one
// with no lastmod at all: Google learns the signal is noise and discounts it, and we
// would have spent the credibility we are trying to build. So if the reader data is
// missing, or a chapter has no updatedAt, the URL is emitted WITHOUT a lastmod.
// Absent is honest; invented is not.
const BIBLE_DATA = '/srv/sites/community/public/bible-data';
const lastmodCache = new Map(); // `${lang}/${slug}` -> Map(chapter -> 'YYYY-MM-DD')
let lastmodHits = 0;
let lastmodMisses = 0;

function bookLastmods(lang, slug) {
	const ck = `${lang}/${slug}`;
	if (lastmodCache.has(ck)) return lastmodCache.get(ck);
	const out = new Map();
	try {
		const doc = JSON.parse(fs.readFileSync(path.join(BIBLE_DATA, lang, `${slug}.json`), 'utf8'));
		for (const [n, ch] of Object.entries(doc.chapters || {})) {
			const raw = ch && ch.updatedAt;
			if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw))
				out.set(Number(n), raw.slice(0, 10));
		}
	} catch {
		/* no reader data for this book: emit no lastmod, never a guess */
	}
	lastmodCache.set(ck, out);
	return out;
}

function lastmodFor(lang, key) {
	const i = key.lastIndexOf('/');
	const d = bookLastmods(lang, key.slice(0, i)).get(Number(key.slice(i + 1)));
	if (d) {
		lastmodHits++;
		return `<lastmod>${d}</lastmod>`;
	}
	lastmodMisses++;
	return '';
}

const parts = [];
parts.push('<?xml version="1.0" encoding="UTF-8"?>');
parts.push(
	'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
);

// Reader hubs first (highest-value entry points), then chapters.
// EVERY live language's hub /read/<code>/ is listed (indexing audit 2026-10-17: 42 of 44
// hubs were in no sitemap — only /read/ and /read/en/ were). English owns /read/ + /read/en/;
// each other language's hub goes in its own segment. A language whose every book the live
// guard dropped has no chapters here and gets no hub either (never list a page we cannot
// vouch for).
const hubEntry = (u) =>
	`<url><loc>${esc(u)}</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`;
const hubsFor = (lang) =>
	lang === 'en'
		? [`${SITE}/read/`, `${SITE}/read/en/`]
		: byLang.get(lang)?.size
			? [`${SITE}/read/${lang}/`]
			: [];
const allHubs = LIVE_LANGS.flatMap(hubsFor);
for (const hub of allHubs) parts.push(hubEntry(hub));

// Deterministic order: canonical book order would need bible_structure.json; slug
// A→Z + numeric chapter is stable and adequate (order carries no ranking weight).
const keys = [...groups.keys()].sort((a, b) => {
	const [as, an] = a.split('/');
	const [bs, bn] = b.split('/');
	return as === bs ? Number(an) - Number(bn) : as.localeCompare(bs);
});

let count = 0;
const perLang = Object.fromEntries(LIVE_LANGS.map((l) => [l, 0]));
// Per-language segments — ON (D97, Kevin approved 2026-09-14). This constant IS the
// committed config; SITEMAP_SPLIT=0/1 overrides it for tests only.
// Emits public/sitemap-read-<lang>.xml (each <url> keeps the FULL alternate set, so
// hreflang stays reciprocal across files) + public/sitemap-read-index.xml, which
// robots.txt advertises, so GSC/Bing report indexing per language. sitemap-read.xml
// (the combined file) is still written unchanged: fhb-index-submit.py / IndexNow and
// fhb-submit-reader-sitemap.sh read it.
const SPLIT_BY_LANGUAGE = true;
const SPLIT = process.env.SITEMAP_SPLIT ? process.env.SITEMAP_SPLIT === '1' : SPLIT_BY_LANGUAGE;
const segs = new Map(LIVE_LANGS.map((l) => [l, []]));
// Each language's hub lives in its own segment (English: /read/ + /read/en/), so the
// segments together hold EVERY URL of the combined file (nothing lost when a console reads
// only the index).
if (SPLIT) {
	for (const l of LIVE_LANGS) for (const hub of hubsFor(l)) segs.get(l)?.push(hubEntry(hub));
}
for (const key of keys) {
	const langs = groups.get(key);
	const alts = [...langs.entries()]
		.map(([l, u]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${esc(u)}"/>`)
		.join('');
	const xdefault = langs.has('en')
		? `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(langs.get('en'))}"/>`
		: '';
	for (const [l, u] of langs) {
		const entry = `<url><loc>${esc(u)}</loc>${lastmodFor(l, key)}<changefreq>monthly</changefreq><priority>0.8</priority>${alts}${xdefault}</url>`;
		parts.push(entry);
		if (SPLIT) segs.get(l).push(entry);
		count++;
		perLang[l]++;
	}
}
parts.push('</urlset>');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
// sitemap-read.xml is written BELOW when SPLIT is on — as the INDEX, not the combined
// urlset. Writing the 26 MB combined file here first would hand Cloudflare a file it
// refuses (25 MiB hard cap) on every deploy, which is exactly the outage this fixes.
if (!SPLIT) fs.writeFileSync(OUT, parts.join(''));

if (SPLIT) {
	const HEAD =
		'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">';
	const index = [];
	for (const [l, entries] of segs) {
		if (!entries.length) continue; // never publish an empty segment
		const name = `sitemap-read-${l}.xml`;
		fs.writeFileSync(path.join(path.dirname(OUT), name), HEAD + entries.join('') + '</urlset>');
		index.push(`<sitemap><loc>${SITE}/${name}</loc></sitemap>`);
	}
	const indexXml =
		'<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
		index.join('') +
		'</sitemapindex>';
	fs.writeFileSync(path.join(path.dirname(OUT), 'sitemap-read-index.xml'), indexXml);
	// sitemap-read.xml IS THE INDEX NOW (2026-09-18). It was the combined urlset, and Russian
	// going 526 -> 1,189 chapters took it to 26,396,429 bytes against Cloudflare Pages' hard
	// 25 MiB per-file cap: every FHB deploy, marketing AND reader, failed on it.
	// The URL is kept, deliberately, rather than retired — llms.txt names it as the
	// authoritative machine-readable list, GSC and Bing have it registered, and
	// fhb-index-submit.py reads it. All of those keep working against an index: GSC and Bing
	// accept index files natively, and the submitter was taught to FOLLOW one FIRST, in a
	// separate change that landed before this line existed. That order is not incidental —
	// reversed, the weekly IndexNow ping would have collected 25 sitemap urls instead of
	// 15,199 chapter urls and reported success.
	// The segments together hold every url the combined file held (asserted just below), so
	// nothing is lost by the hop.
	fs.writeFileSync(OUT, indexXml);
	const segTotal = [...segs.values()].reduce((n, e) => n + e.length, 0);
	if (segTotal !== count + allHubs.length) {
		console.error(
			`gen-sitemap-read: SEGMENT TOTAL ${segTotal} != combined ${count + allHubs.length} — ` +
				'the index would publish fewer urls than the combined file held. Refusing.',
		);
		process.exit(1);
	}
	console.log(
		`gen-sitemap-read: SPLIT — ${index.length} segments holding ${segTotal} urls ` +
			`(${allHubs.length} language hubs); ` +
			'sitemap-read.xml and sitemap-read-index.xml both written as the index',
	);
}

// 50,000-URL / 50 MB sitemap limits: at ~2.6k URLs we are far inside both. If a
// future canon push crosses 45,000 URLs, shard by language here and emit an index.
// The limit is PER FILE. Split by language, each segment is one file (~1.2k urls), so the
// guard measures the largest segment, not the total — the total passed 45k at 41 languages
// (2026-10-15) while every file sat far inside the limit.
const largestFile = SPLIT ? Math.max(...[...segs.values()].map((e) => e.length)) : count;
if (largestFile > 45000) {
	console.error(`gen-sitemap-read: ${largestFile} URLs in one file — approaching the 50k limit, shard further.`);
	process.exit(1);
}
if (SPLIT) {
	for (const l of segs.keys()) {
		const f = path.join(path.dirname(OUT), `sitemap-read-${l}.xml`);
		if (fs.existsSync(f) && fs.statSync(f).size > 45 * 1024 * 1024) {
			console.error(`gen-sitemap-read: ${f} is over 45 MB — approaching the 50 MB sitemap limit.`);
			process.exit(1);
		}
	}
}

console.log(
	`gen-sitemap-read: ${count} reader URLs -> public/sitemap-read.xml  ` +
		Object.entries(perLang)
			.map(([l, n]) => `${l}=${n}`)
			.join(' '),
);

// Number of languages live on /read, set by the coverage block below and written into the
// prose "free to read online in N languages" by the counts block after it (W3 2026-10-21).
let READ_LANGUAGE_TOTAL = 0;
// ── llms.txt "Languages and coverage" (2026-10-07) ───────────────────────────────
// That section was hand-written and went stale: on 2026-10-07 it still told AI crawlers
// Portuguese, Marathi, French, Arabic … Vietnamese were "NOT yet published — their chapter
// URLs do not resolve", while every one was complete and live on /read. It is now rendered
// HERE, from the same post-probe chapter set this sitemap publishes, plus names and live
// flags from the community registry. Only the text between the GENERATED markers in
// public/llms.txt is replaced. FAIL-SAFE: unreadable registry or missing markers leave the
// file untouched (stale-but-honest beats a section listing nothing) with a warning.
{
	const LLMS = path.resolve(process.cwd(), 'public/llms.txt');
	const BEGIN =
		'<!-- GENERATED:languages (scripts/gen-sitemap-read.mjs — edit the script, not this block) -->';
	const END = '<!-- /GENERATED:languages -->';
	const FULL_CANON = 1189;
	try {
		const src = fs.readFileSync('/srv/sites/community/src/lib/languages.ts', 'utf8');
		const registry = [];
		for (const m of src.matchAll(
			/code:\s*"([a-z-]+)",\s*name:\s*"([^"]+)"[\s\S]{0,120}?live:\s*(true|false)/g,
		)) {
			if (!registry.some((r) => r.code === m[1])) registry.push({ code: m[1], name: m[2] });
		}
		const rows = [];
		for (const r of registry) {
			const books = byLang.get(r.code);
			const chapters = books ? [...books.values()].reduce((n, s) => n + s.size, 0) : 0;
			if (chapters) rows.push({ ...r, chapters, john1: groups.get('john/1')?.get(r.code) });
		}
		if (!rows.some((r) => r.code === 'en')) throw new Error('no English chapters');
		const unpublished = registry.filter((r) => !rows.some((x) => x.code === r.code));
		const complete = rows.filter((r) => r.chapters >= FULL_CANON);
		const partial = rows.filter((r) => r.chapters < FULL_CANON);
		const out = [
			BEGIN,
			'### Languages and coverage',
			'',
			`${rows.length} languages are published on /read. This section is regenerated from the reader sitemap on every deploy.`,
			'',
			'| Language | Code | Coverage | Chapters | John 1 |',
			'|---|---|---|---|---|',
			...rows.map(
				(r) =>
					`| ${r.name} | \`${r.code}\` | ${r.chapters >= FULL_CANON ? 'Complete Bible, 66 books' : 'Partial'} | ` +
					`${r.chapters.toLocaleString('en-US')} | ${r.john1 ? r.john1.replace(SITE, '') : '—'} |`,
			),
			'',
			'**/sitemap-read.xml is the authoritative, machine-readable list** — it is a sitemap index pointing to one sitemap per language, it is regenerated on every deploy, and it contains only chapter URLs that actually resolve.',
			'',
			partial.length === 0
				? `All ${complete.length} languages are complete: every chapter number in the book list below resolves in each of them.`
				: `${complete.map((r) => r.name).join(', ')} are complete: every chapter number in the book list below resolves. For ${partial.map((r) => r.name).join(', ')}, use /sitemap-read.xml for the chapters that resolve.`,
			'',
			'Some languages use their own book names in the URL (for example Spanish /read/es/juan/1/); the John 1 column shows the exact form for each.',
			'',
			unpublished.length
				? `Not yet published: ${unpublished.map((r) => r.name).join(', ')} — their chapter URLs do not resolve. Do not cite a URL for a language not listed in the table above.`
				: 'Do not cite a URL for a language not listed in the table above.',
			END,
		].join('\n');
		const cur = fs.readFileSync(LLMS, 'utf8');
		const a = cur.indexOf(BEGIN);
		const b = cur.indexOf(END);
		if (a === -1 || b < a) throw new Error('GENERATED:languages markers not found');
		const next = cur.slice(0, a) + out + cur.slice(b + END.length);
		if (next !== cur) fs.writeFileSync(LLMS, next);
		READ_LANGUAGE_TOTAL = rows.length;
		console.log(
			`gen-sitemap-read: llms.txt languages — ${rows.length} published, ` +
				`${unpublished.length} not yet (${unpublished.map((r) => r.code).join(', ') || 'none'})`,
		);
	} catch (err) {
		console.warn(
			`gen-sitemap-read: llms.txt languages NOT regenerated (${err.message}) — file left unchanged`,
		);
	}
}

// ── llms.txt / llms-full.txt typed language COUNTS (indexing audit 2026-10-17) ───
// The prose said "published in 35 languages" while the generated table said 44: a typed
// count goes stale the day a language ships. The print-language figure is now computed
// with the SAME rule the site pages use (src/data/receive.ts PRINT_LANGUAGE_TOTAL =
// English + every edition in src/data/edition-registry.json, which fhb-chain.py emits),
// and written into each "published in N languages" phrase. Fails LOUD (exit 1) if a phrase
// is missing, so a rewrite of the prose cannot silently orphan the number.
{
	const reg = JSON.parse(
		fs.readFileSync(path.resolve(process.cwd(), 'src/data/edition-registry.json'), 'utf8'),
	);
	const printTotal = (reg.editions || []).length + 1;
	if (printTotal < 2) {
		console.error('gen-sitemap-read: edition-registry.json has no editions — refusing to write a count');
		process.exit(1);
	}
	for (const name of ['llms.txt', 'llms-full.txt']) {
		const f = path.resolve(process.cwd(), 'public', name);
		const cur = fs.readFileSync(f, 'utf8');
		const re = /published in \d+ languages/g;
		const hits = cur.match(re) || [];
		if (hits.length === 0) {
			console.error(`gen-sitemap-read: ${name} has no "published in N languages" phrase to generate`);
			process.exit(1);
		}
		let next = cur.replace(re, `published in ${printTotal} languages`);
		// The print count alone read as "47 live? no, 37" to AI engines (plan W3, 2026-10-21).
		// The ONLINE count is the coverage table's own row count, written beside it. Fails
		// loud if the phrase is missing; skipped (file keeps its last good number, with a
		// warning) only if the coverage block could not run.
		const reRead = /free to read online in \d+ languages/g;
		const readHits = next.match(reRead) || [];
		if (readHits.length === 0) {
			console.error(`gen-sitemap-read: ${name} has no "free to read online in N languages" phrase to generate`);
			process.exit(1);
		}
		if (READ_LANGUAGE_TOTAL > 0) next = next.replace(reRead, `free to read online in ${READ_LANGUAGE_TOTAL} languages`);
		else console.warn(`gen-sitemap-read: ${name} — online language count NOT refreshed (coverage block failed)`);
		if (next !== cur) fs.writeFileSync(f, next);
		console.log(`gen-sitemap-read: ${name} — ${hits.length} print count(s) set to ${printTotal}, ${readHits.length} online count(s) set to ${READ_LANGUAGE_TOTAL || 'unchanged'}`);
	}
}
