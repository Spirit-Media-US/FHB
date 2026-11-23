// BUILD-CHECK: searched "author sites link test sameAs" (bin/tool-inventory.py 2026-11-16) + scripts/*.test.mjs ->
//   nearest is scripts/xsite-links.test.mjs (anchors' target/labels, not which URLs are allowed or the JSON-LD).
// NEAREST: scripts/xsite-links.test.mjs (same anchor parsing; importing it would re-run its tests, so a short copy).
// NOT-REUSED-BECAUSE: xsite checks HOW a link opens; this checks WHICH author URLs may render and that the JSON-LD
//   Person matches them. A test, not a runner (nothing written).
// APPROVED-BY: pmprint brief pmprint-author-sites-20261116.md (Kevin 2026-11-16 "Can you search and link to other sites
//   including author businesses"; "1 yes 2 yes 3 yes 4 yes and should we add metadate for these links").
//
// node --test scripts/author-sites.test.mjs   (reads dist/, so run after astro build). Identical file in SMP and FHB.
//   1. the data file holds CERTAIN rows only (a POSSIBLE row there fails the build)
//   2. every link in a book page's author-sites row is a CERTAIN url of THAT page's author
//   3. no POSSIBLE url (the pmseoaeo list, or any non-CERTAIN row) appears anywhere on a book page
//   4. no author link carries rel=nofollow (or ugc/sponsored)
//   5. JSON-LD author Person (metadata model, src/lib/author-sites.mjs authorLd):
//      a. sameAs holds only Website/LinkedIn/Facebook/Instagram/YouTube entries
//      b. Business/Ministry entries are Organizations under worksFor and never in sameAs
//      c. sameAs + worksFor urls == the rendered set; url == the main Website
// The last test plants one bad case per rule and asserts each rule catches it BY NAME.
// AUTHOR_SITES_DATA=<file> / AUTHOR_SITES_DIST=<dir> point the run at an injected copy (proof the gate fails for real).
// AUTHOR_SITES_POSSIBLE=<file> adds a POSSIBLE list (default: aeo-state/smp-author-sites-possible-20261116.json).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { authorLd, authorSites, ORG, SAME_AS } from '../src/lib/author-sites.mjs';

const DATA = path.resolve(
	process.env.AUTHOR_SITES_DATA ||
		(fs.existsSync('src/data/books/author-sites.json') ? 'src/data/books/author-sites.json' : 'src/data/author-sites.json'),
);
const DIST = path.resolve(process.env.AUTHOR_SITES_DIST || process.env.XSITE_DIST || 'dist');
const POSSIBLE_FILE =
	process.env.AUTHOR_SITES_POSSIBLE || '/home/deploy/aeo-state/smp-author-sites-possible-20261116.json';

const attr = (a, n) => {
	const m = new RegExp(`\\s${n}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(a);
	return m ? (m[1] ?? m[2] ?? m[3]) : null;
};
const anchors = (html) =>
	[...html.replace(/<(script|template|style)\b[\s\S]*?<\/\1>/gi, '').matchAll(/<a\b([^>]*)>/gi)].map((m) => ({
		href: attr(m[1], 'href') ?? '',
		rel: attr(m[1], 'rel') ?? '',
	}));
const norm = (u) => String(u ?? '').replace(/&amp;/g, '&').trim();
const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);

export function dataErrors(table) {
	const errs = [];
	for (const [author, row] of Object.entries(table)) {
		if (author.startsWith('_')) continue;
		for (const s of row?.sites ?? []) {
			if (s.grade !== 'CERTAIN') errs.push(`[rule 1] ${author}: ${s.grade} row in the data file: ${s.url}`);
		}
	}
	return errs;
}
/** Every url that must NEVER render: the POSSIBLE list + any non-CERTAIN row in the table. */
export function possibleUrls(table, file = POSSIBLE_FILE) {
	const out = new Set();
	const add = (t) => {
		for (const [a, row] of Object.entries(t ?? {})) {
			if (a.startsWith('_')) continue;
			for (const s of row?.sites ?? []) if (s.grade !== 'CERTAIN' && s.url) out.add(norm(s.url));
		}
	};
	add(table);
	if (file && fs.existsSync(file)) add(JSON.parse(fs.readFileSync(file, 'utf8')));
	return out;
}
const bookLd = (html) => {
	for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
		try {
			const j = JSON.parse(m[1]);
			if (String(j['@id'] ?? '').endsWith('#book')) return j;
		} catch {}
	}
	return null;
};
/** The author-sites rows on a page: [{author, links[]}] (BookMirror and the plain block both use data-author-sites). */
export function rowsOn(html) {
	const out = [];
	for (const m of html.matchAll(/<div[^>]*\sdata-author-sites="([^"]*)"[^>]*>([\s\S]*?)<\/div>/g)) {
		out.push({ author: m[1].replace(/&#39;/g, "'").replace(/&amp;/g, '&'), links: anchors(m[2]) });
	}
	return out;
}
/** Rules 2-5 on one built page. Returns error strings ([] = clean), each tagged with its rule. */
export function pageErrors(html, table, possible) {
	const errs = [];
	const rows = rowsOn(html);
	const ld = bookLd(html);
	const author = ld?.author?.name ?? rows[0]?.author ?? null;
	const sites = authorSites(author, table);
	const byUrl = new Map(sites.map((s) => [s.url, s]));
	const rendered = new Set();
	for (const r of rows) {
		if (author && r.author !== author) errs.push(`[rule 2] row for "${r.author}" on a page by "${author}"`);
		for (const a of r.links) {
			const h = norm(a.href);
			rendered.add(h);
			if (!byUrl.has(h)) errs.push(`[rule 2] rendered link not a CERTAIN entry of ${author}: ${h}`);
			if (/\b(nofollow|ugc|sponsored)\b/i.test(a.rel)) errs.push(`[rule 4] nofollow on author link: ${h} rel="${a.rel}"`);
		}
	}
	for (const a of anchors(html)) if (possible.has(norm(a.href))) errs.push(`[rule 3] POSSIBLE url rendered: ${a.href}`);
	if (ld) {
		const p = ld.author ?? {};
		const sameAs = arr(p.sameAs).map(norm);
		const orgs = arr(p.worksFor);
		for (const u of sameAs) {
			const s = byUrl.get(u);
			if (!s || !SAME_AS.has(s.label)) errs.push(`[rule 5a] sameAs holds a non-profile entry: ${u} (${s?.label ?? 'not in data'})`);
		}
		for (const o of orgs) {
			const s = byUrl.get(norm(o?.url));
			if (o?.['@type'] !== 'Organization' || !s || !ORG.has(s.label))
				errs.push(`[rule 5b] worksFor is not a Business/Ministry Organization: ${JSON.stringify(o)}`);
		}
		for (const s of sites.filter((x) => ORG.has(x.label))) {
			if (sameAs.includes(s.url)) errs.push(`[rule 5b] ${s.label} in sameAs: ${s.url}`);
			if (!orgs.some((o) => norm(o?.url) === s.url)) errs.push(`[rule 5b] ${s.label} missing from worksFor: ${s.url}`);
		}
		const ldSet = [...new Set([...sameAs, ...orgs.map((o) => norm(o?.url))])].sort();
		const shown = [...rendered].sort();
		if (JSON.stringify(ldSet) !== JSON.stringify(shown))
			errs.push(`[rule 5c] JSON-LD sameAs+worksFor ${JSON.stringify(ldSet)} != rendered ${JSON.stringify(shown)}`);
		const want = authorLd(author, table).url;
		// FHB: books.json may carry its own author.url (Kevin White -> kevinwhite.us); author-sites wins when it has one.
		if (want !== undefined ? p.url !== want : p.url && ORG.has(byUrl.get(norm(p.url))?.label))
			errs.push(`[rule 5c] JSON-LD Person.url ${p.url} != main Website ${want}`);
	}
	return errs;
}

const bookPages = () => {
	const dir = path.join(DIST, 'books');
	return fs.existsSync(dir)
		? fs
				.readdirSync(dir)
				.map((d) => path.join(dir, d, 'index.html'))
				.filter((f) => fs.existsSync(f))
		: [];
};

const table = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const possible = possibleUrls(table);

test('1. the author-sites data file holds CERTAIN rows only', () => {
	assert.deepEqual(dataErrors(table), []);
});

test('2-5. book pages: author links CERTAIN only, no POSSIBLE, no nofollow, JSON-LD sameAs/worksFor/url == rendered', () => {
	const pages = bookPages();
	assert.ok(pages.length > 0, `no built book pages under ${DIST}/books`);
	let withLinks = 0;
	let links = 0;
	const authors = new Set();
	const errs = [];
	for (const f of pages) {
		const html = fs.readFileSync(f, 'utf8');
		const rows = rowsOn(html);
		if (rows.some((r) => r.links.length)) {
			withLinks++;
			rows.forEach((r) => authors.add(r.author));
		}
		links += rows.reduce((n, r) => n + r.links.length, 0);
		for (const e of pageErrors(html, table, possible)) errs.push(`${path.relative(DIST, f)}: ${e}`);
	}
	console.log(
		`# author-sites: ${pages.length} book pages, ${withLinks} with author links (${authors.size} authors), ${links} links, ${possible.size} POSSIBLE urls barred`,
	);
	assert.deepEqual(errs, []);
});

test('injected failures are each caught by their own rule', () => {
	const A = 'Test Author';
	const W = 'https://example.org/site';
	const F = 'https://www.facebook.com/testauthor';
	const B = 'https://example.org/business';
	const M = 'https://example.org/maybe';
	const t = {
		[A]: {
			sites: [
				{ label: 'Website', name: 'site', url: W, grade: 'CERTAIN' },
				{ label: 'Facebook', name: 'fb', url: F, grade: 'CERTAIN' },
				{ label: 'Business', name: 'Biz', url: B, evidence: 'founder of Biz', grade: 'CERTAIN' },
				{ label: 'Business', name: 'maybe', url: M, grade: 'POSSIBLE' },
			],
		},
	};
	const good = authorLd(A, t);
	// the reader: POSSIBLE never returned; model = url Website, sameAs profiles, business as worksFor Organization
	assert.deepEqual(good, {
		url: W,
		sameAs: [W, F],
		worksFor: { '@type': 'Organization', name: 'Biz', url: B, founder: { '@type': 'Person', name: A } },
	});
	const ld = (person) =>
		`<script type="application/ld+json">${JSON.stringify({ '@id': 'x#book', author: { '@type': 'Person', name: A, ...person } })}</script>`;
	const row = (links) =>
		`<div class="mt-4" data-author-sites="${A}"><ul>${links.map(([h, rel = 'noopener']) => `<li><a href="${h}" target="_blank" rel="${rel}">x</a></li>`).join('')}</ul></div>`;
	const P = possibleUrls(t, null);
	const has = (errs, rule) => assert.ok(errs.some((e) => e.startsWith(rule)), `${rule} missed:\n${errs.join('\n')}`);
	const okRow = [[W], [F], [B]];
	// clean page passes
	assert.deepEqual(pageErrors(ld(good) + row(okRow), t, P), []);
	// rule 1: a POSSIBLE row in the data file
	has(dataErrors(t), '[rule 1]');
	// rules 2 + 3: the POSSIBLE link rendered
	const e23 = pageErrors(ld(good) + row([...okRow, [M]]), t, P);
	has(e23, '[rule 2]');
	has(e23, '[rule 3]');
	// rule 4: nofollow on an author link
	has(pageErrors(ld(good) + row([[W, 'nofollow noopener'], [F], [B]]), t, P), '[rule 4]');
	// rule 5a: a business url in sameAs
	has(pageErrors(ld({ ...good, sameAs: [W, F, B] }) + row(okRow), t, P), '[rule 5a]');
	// rule 5b: the business missing from worksFor (dropped)
	const { worksFor, ...noOrg } = good;
	has(pageErrors(ld(noOrg) + row(okRow), t, P), '[rule 5b]');
	// rule 5c: sameAs drifts from the rendered set; url not the main Website
	has(pageErrors(ld({ ...good, sameAs: [W] }) + row(okRow), t, P), '[rule 5c]');
	has(pageErrors(ld({ ...good, url: B }) + row(okRow), t, P), '[rule 5c]');
});
