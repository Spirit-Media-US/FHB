// node --test scripts/native-meta.test.mjs   (unit 2jw)
// FHB language-edition pages (/bibles/<lang>-bible/) carry their metadata in their OWN language.
//  1. DATA (always): every language edition JSON whose language has a reviewed native description
//     (community src/i18n/<code>.json seoLanding.description) must carry exactly that as seo.description
//     with seo.native = true — never the English boilerplate.
//  2. BUILT SITE (when dist/ exists; set NATIVE_META_REQUIRE_DIST=1 to make it mandatory): per native
//     page: meta description == og:description, <= 160 chars, not English boilerplate; og:locale is
//     the language's Facebook locale (absent only when src/lib/og-locale.ts has none); JSON-LD Book
//     name is the native edition title and inLanguage is the language; <html lang> stays "en".
//     Editions WITHOUT a native source are left untouched (en_US, English description).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const I18N = process.env.COMMUNITY_I18N || '/srv/sites/community/src/i18n';
const BOILER = /^Father's Heart Bible in /;
const editions = fs
	.readdirSync(path.join(root, 'src/data/editions'))
	.filter((f) => f.endsWith('.json'))
	.map((f) => JSON.parse(fs.readFileSync(path.join(root, 'src/data/editions', f), 'utf8')))
	.filter((e) => e.kind === 'language');
const nativeSource = (code) => {
	const p = path.join(I18N, `${code}.json`);
	if (!fs.existsSync(p)) return null;
	const d = JSON.parse(fs.readFileSync(p, 'utf8')).seoLanding?.description;
	return typeof d === 'string' && d.trim() ? d.trim() : null;
};
const ogMap = Object.fromEntries(
	[...fs.readFileSync(path.join(root, 'src/lib/og-locale.ts'), 'utf8').matchAll(/^\t'?([a-z-]+)'?: '([a-z]{2}_[A-Z]{2})',$/gm)].map((m) => [m[1], m[2]]),
);
const bcp = (c) => c.replace(/-(\w+)$/, (_m, r) => '-' + (r.length === 4 ? r[0].toUpperCase() + r.slice(1) : r.toUpperCase()));

test('there are language editions and a community source to compare against', () => {
	assert.ok(editions.length >= 39, `only ${editions.length} language editions`);
	assert.ok(fs.existsSync(I18N), `community i18n not found at ${I18N}`);
});

test('data: every edition with a native source carries it (no English description)', () => {
	const bad = [];
	for (const e of editions) {
		const src = nativeSource(e.lang);
		if (!src) continue;
		if (e.seo?.description !== src || e.seo?.native !== true || BOILER.test(e.seo?.description || ''))
			bad.push(e.lang);
	}
	assert.deepEqual(bad, [], `English/stale description although a native source exists: ${bad}`);
});

test('data: editions without a source are not flagged native', () => {
	const bad = editions.filter((e) => !nativeSource(e.lang) && e.seo?.native).map((e) => e.lang);
	assert.deepEqual(bad, []);
});

const dist = path.join(root, 'dist/bibles');
const haveDist = fs.existsSync(dist);
test('built site exists when required', { skip: !process.env.NATIVE_META_REQUIRE_DIST }, () => {
	assert.ok(haveDist, 'dist/bibles missing — run the build first');
});
test('built site: native metadata and og:locale per language page', { skip: !haveDist }, () => {
	const meta = (h, re) => (h.match(re) || [])[1];
	const problems = [];
	let checked = 0;
	for (const e of editions) {
		const f = path.join(dist, `${e.slug}-bible`, 'index.html');
		if (!fs.existsSync(f)) { problems.push(`${e.lang}: page not built`); continue; }
		const h = fs.readFileSync(f, 'utf8');
		const desc = meta(h, /<meta name="description" content="([^"]*)"/);
		const ogd = meta(h, /<meta property="og:description" content="([^"]*)"/);
		const loc = meta(h, /<meta property="og:locale" content="([^"]*)"/);
		const book = [...h.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)]
			.map((m) => { try { return JSON.parse(m[1]); } catch { return null; } })
			.find((j) => j && j['@id']?.endsWith('#book'));
		if (!book) { problems.push(`${e.lang}: no Book JSON-LD`); continue; }
		if (nativeSource(e.lang)) {
			checked++;
			if (BOILER.test(desc || '')) problems.push(`${e.lang}: English description`);
			if (!desc || desc.length > 160) problems.push(`${e.lang}: description length ${desc?.length}`);
			if (desc !== ogd) problems.push(`${e.lang}: og:description != description`);
			if (loc !== ogMap[e.lang.toLowerCase()] && !(loc === undefined && !ogMap[e.lang.toLowerCase()]))
				problems.push(`${e.lang}: og:locale ${loc} != ${ogMap[e.lang]}`);
			if (book.name !== e.name) problems.push(`${e.lang}: JSON-LD name ${book.name}`);
			if (book.inLanguage !== bcp(e.lang)) problems.push(`${e.lang}: inLanguage ${book.inLanguage}`);
		} else {
			if (loc !== 'en_US') problems.push(`${e.lang}: control og:locale changed to ${loc}`);
			if (book.inLanguage !== e.lang) problems.push(`${e.lang}: control inLanguage changed`);
		}
		if (!/<html lang="en"/.test(h)) problems.push(`${e.lang}: html lang changed`);
	}
	assert.ok(checked >= 39, `only ${checked} native pages checked`);
	assert.deepEqual(problems, []);
});
