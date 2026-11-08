// node --test scripts/bibles-hreflang.test.mjs   (unit 2jx)
// hreflang across /bibles/ language-edition pages: head + sitemap, from ONE source (src/lib/bibles-hreflang.mjs),
// verified by the EXISTING checker bin/fhb-hreflang-check.py --bibles-dist. A synthetic dist proves the checker
// FAILS on a missing return link and on a code that disagrees with inLanguage; the real dist/ is checked when present.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { biblesCluster, alternatesFor, sitemapLinksFor } from '../src/lib/bibles-hreflang-fs.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EDITIONS = path.join(root, 'src/data/editions');
const CHECK = process.env.FHB_HREFLANG_CHECK || '/home/deploy/bin/fhb-hreflang-check.py';
const check = (dist) => spawnSync('python3', [CHECK, '--bibles-dist', dist, '--editions', EDITIONS], { encoding: 'utf8' });

const all = fs.readdirSync(EDITIONS).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(EDITIONS, f), 'utf8')));
const langs = all.filter((e) => e.kind === 'language');
const audience = all.filter((e) => e.slug && e.listing && e.hook && e.kind !== 'language' && e.slug !== 'fathers-heart');

test('cluster = English + every language edition; audience editions excluded', () => {
	const c = biblesCluster();
	assert.equal(c.length, langs.length + 1);
	assert.equal(c[0].hreflang, 'en');
	assert.equal(new Set(c.map((r) => r.hreflang)).size, c.length);
	for (const a of audience) assert.deepEqual(alternatesFor(a.slug), [], `${a.slug} must carry no hreflang`);
	assert.equal(alternatesFor('simplified-chinese').find((a) => a.hreflang === 'zh-Hans')?.href.endsWith('/bibles/simplified-chinese-bible/'), true);
});

// ---- synthetic dist ----
function synth(mutate) {
	const dist = fs.mkdtempSync(path.join(os.tmpdir(), 'hreflang-'));
	const c = biblesCluster();
	const urls = [];
	const pages = [...c.map((r) => r.slug), ...audience.map((a) => a.slug)];
	for (const slug of pages) {
		const url = `https://fathersheartbible.com/bibles/${slug}-bible/`;
		const row = c.find((r) => r.slug === slug);
		let alts = alternatesFor(slug);
		let inLang = row ? row.hreflang : 'en';
		if (mutate) ({ alts, inLang } = mutate(slug, alts, inLang));
		const head = [`<link rel="canonical" href="${url}">`, ...alts.map((a) => `<link rel="alternate" hreflang="${a.hreflang}" href="${a.href}">`)].join('');
		fs.mkdirSync(path.join(dist, 'bibles', `${slug}-bible`), { recursive: true });
		fs.writeFileSync(path.join(dist, 'bibles', `${slug}-bible`, 'index.html'), `<html><head>${head}</head><body><script>{"inLanguage":"${inLang}"}</script></body></html>`);
		const links = (sitemapLinksFor(url) || []).map((l) => `<xhtml:link rel="alternate" hreflang="${l.lang}" href="${l.url}"/>`).join('');
		urls.push(`<url><loc>${url}</loc>${links}</url>`);
	}
	fs.writeFileSync(path.join(dist, 'sitemap-0.xml'), `<urlset>${urls.join('')}</urlset>`);
	return dist;
}
const rm = (d) => fs.rmSync(d, { recursive: true, force: true });

test('checker passes on a correct synthetic dist', () => {
	const d = synth();
	const r = check(d);
	rm(d);
	assert.equal(r.status, 0, r.stdout + r.stderr);
});
test('checker FAILS when one page loses a return link', () => {
	const d = synth((slug, alts, il) => (slug === 'korean' ? { alts: alts.filter((a) => a.hreflang !== 'es'), inLang: il } : { alts, inLang: il }));
	const r = check(d);
	rm(d);
	assert.equal(r.status, 1);
	assert.match(r.stdout, /B4 .*korean/);
});
test('checker FAILS when a hreflang code disagrees with inLanguage', () => {
	const d = synth((slug, alts, il) => ({ alts, inLang: slug === 'spanish' ? 'pt' : il }));
	const r = check(d);
	rm(d);
	assert.equal(r.status, 1);
	assert.match(r.stdout, /B6 .*spanish/);
});
test('checker FAILS when an audience page carries hreflang', () => {
	const d = synth((slug, alts, il) => (slug === audience[0].slug ? { alts: alternatesFor('spanish'), inLang: il } : { alts, inLang: il }));
	const r = check(d);
	rm(d);
	assert.equal(r.status, 1);
});

// ---- real build, when dist/ exists ----
const realDist = path.join(root, 'dist');
test('built dist: head + sitemap clean', { skip: !fs.existsSync(path.join(realDist, 'bibles')) && !process.env.HREFLANG_REQUIRE_DIST }, () => {
	const r = check(realDist);
	assert.equal(r.status, 0, r.stdout + r.stderr);
});
