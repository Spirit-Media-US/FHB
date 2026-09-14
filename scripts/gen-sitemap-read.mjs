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
		const src = fs.readFileSync(
			'/srv/sites/community/src/lib/languages.ts',
			'utf8',
		);
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
  name.normalize('NFKD').replace(/\p{M}+/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const LOCAL_SLUGS = new Map(); // lang -> Map(key -> local slug)
for (const lang of LOCALIZED) {
  try {
    const dict = JSON.parse(fs.readFileSync(`/srv/sites/community/src/i18n/${lang}.json`, 'utf8'));
    const t = new Map();
    const seen = new Set();
    for (const [key, name] of Object.entries(dict.books || {})) {
      const slug = slugifyName((dict.booksRomanized || {})[key] || name || '');
      if (!slug || seen.has(slug)) throw new Error(`bad slug table for ${lang}: ${key} -> '${slug}'`);
      seen.add(slug);
      t.set(key, slug);
    }
    LOCAL_SLUGS.set(lang, t);
    console.log(`[gen-sitemap-read] localized book slugs: ${lang} (${t.size} books)`);
  } catch (err) {
    // Same fail-safe as the reader: a broken table means English keys, never a guessed slug.
    console.warn(`[gen-sitemap-read] ${lang} slug table unusable (${err.message}); using English keys`);
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
      console.warn(`[gen-sitemap-read] ${lang}: production does not serve localized slugs yet (${probe}) — using English keys`);
    }
  }
}
const urlSlug = (lang, key) => LOCAL_SLUGS.get(lang)?.get(key) ?? key;

const chapterUrl = (lang, slug, n) =>
  lang === 'en' ? `${SITE}/read/${urlSlug(lang, slug)}/${n}/` : `${SITE}/read/${lang}/${urlSlug(lang, slug)}/${n}/`;

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

const parts = [];
parts.push('<?xml version="1.0" encoding="UTF-8"?>');
parts.push(
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
);

// Reader hubs first (highest-value entry points), then chapters.
for (const hub of [`${SITE}/read/`, `${SITE}/read/en/`]) {
  parts.push(`<url><loc>${esc(hub)}</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`);
}

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
// The reader hubs live in the English segment, so the segments together hold EVERY
// URL of the combined file (nothing lost when a console reads only the index).
if (SPLIT && segs.has('en')) {
  for (const hub of [`${SITE}/read/`, `${SITE}/read/en/`]) {
    segs.get('en').push(`<url><loc>${esc(hub)}</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>`);
  }
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
    const entry = `<url><loc>${esc(u)}</loc><changefreq>monthly</changefreq><priority>0.8</priority>${alts}${xdefault}</url>`;
    parts.push(entry);
    if (SPLIT) segs.get(l).push(entry);
    count++;
    perLang[l]++;
  }
}
parts.push('</urlset>');

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, parts.join(''));

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
  fs.writeFileSync(
    path.join(path.dirname(OUT), 'sitemap-read-index.xml'),
    '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
      index.join('') +
      '</sitemapindex>',
  );
  console.log(`gen-sitemap-read: SPLIT — ${index.length} segments + sitemap-read-index.xml`);
}

// 50,000-URL / 50 MB sitemap limits: at ~2.6k URLs we are far inside both. If a
// future canon push crosses 45,000 URLs, shard by language here and emit an index.
if (count > 45000) {
  console.error(`gen-sitemap-read: ${count} URLs — approaching the 50k limit, shard by language.`);
  process.exit(1);
}

console.log(
  `gen-sitemap-read: ${count} reader URLs -> public/sitemap-read.xml  ` +
    Object.entries(perLang).map(([l, n]) => `${l}=${n}`).join(' '),
);
