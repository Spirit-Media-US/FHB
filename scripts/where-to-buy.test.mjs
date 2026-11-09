// node --test scripts/where-to-buy.test.mjs — /where-to-buy/ (Kevin 2026-11-09, ruling 1A).
// Data rules (src/data/retailer-links.json) + page rules (src/pages/where-to-buy.astro, and dist/ when built).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const isbns = JSON.parse(read('src/data/isbn-list.json'));
const links = JSON.parse(read('src/data/retailer-links.json'));
const digits = (s) => s.replace(/\D/g, '');

// edition id -> { hb, pb } exactly as the page derives them from isbn-list.json
const catalog = new Map();
for (const g of isbns.general) catalog.set(`general-${g.colour.toLowerCase()}`, g);
for (const v of isbns.largePrint) catalog.set(`lp-vol${v.vol}`, v);
catalog.set('journaling', isbns.journaling);
for (const a of isbns.audience) catalog.set(`audience-${a.slug}`, a);
for (const l of isbns.languages.filter((x) => x.onSale)) catalog.set(`lang-${l.code}`, l);

test('every catalog edition has a hardcover and a paperback ISBN-13', () => {
	assert.ok(catalog.size >= 60, `catalog has only ${catalog.size} editions`);
	for (const [id, e] of catalog) {
		for (const f of ['hb', 'pb']) assert.match(digits(e[f] ?? ''), /^979\d{10}$/, `${id} ${f}`);
	}
});

test('every link entry belongs to a catalog edition (no orphan links)', () => {
	for (const id of Object.keys(links.print)) assert.ok(catalog.has(id), `retailer-links.json has ${id}, not in isbn-list.json`);
});

test('a Barnes & Noble link carries the ISBN of the binding it is filed under', () => {
	let n = 0;
	for (const [id, rl] of Object.entries(links.print)) {
		for (const [fmt, url] of Object.entries(rl.bn ?? {})) {
			const e = catalog.get(id);
			const want = digits(fmt === 'hardback' ? e.hb : e.pb);
			assert.ok(url.includes(`ean=${want}`), `${id} ${fmt}: ${url} is not ISBN ${want}`);
			n++;
		}
	}
	assert.ok(n > 100, `only ${n} B&N links`);
});

test('no link that failed verification, no blocked retailer with links, only https on known hosts', () => {
	const hosts = {
		amazon: /^https:\/\/www\.amazon\.com\/dp\/B0[0-9A-Z]{8}$/,
		bn: /^https:\/\/www\.barnesandnoble\.com\/w\//,
		google: /^https:\/\/play\.google\.com\/store\/(books|audiobooks)\/details\?id=/,
	};
	const all = [];
	for (const rl of Object.values(links.print)) for (const [rt, m] of Object.entries(rl)) for (const u of Object.values(m)) all.push([rt, u]);
	for (const m of Object.values(links.digital)) for (const row of Object.values(m)) for (const [rt, u] of Object.entries(row)) all.push([rt, u]);
	assert.ok(all.length > 150);
	for (const [rt, u] of all) {
		assert.ok(hosts[rt], `a ${rt} link was kept although that retailer was not verifiable: ${u}`);
		assert.match(u, hosts[rt], `${rt} link has an unexpected shape: ${u}`);
	}
	const v = links.verification;
	assert.equal(v.bn.ok, v.bn.checked, 'a B&N link failed verification and was kept');
	for (const rt of ['walmart', 'kobo', 'apple']) assert.notEqual(v[rt].status, 'ok', `${rt} must be documented as not collected`);
	for (const s of v.amazon.isbnReadBackSample) assert.ok(s.asin && s.isbn13);
});

test('the Amazon read-back sample matches the catalog ISBNs', () => {
	const want = {
		'general-charcoal hardcover': () => catalog.get('general-charcoal').hb,
		'general-charcoal paperback': () => catalog.get('general-charcoal').pb,
		'journaling hardcover': () => catalog.get('journaling').hb,
		'lang-am hardcover': () => catalog.get('lang-am').hb,
		'audience-athletes paperback': () => catalog.get('audience-athletes').pb,
	};
	for (const s of links.verification.amazon.isbnReadBackSample) assert.equal(digits(s.isbn13), digits(want[s.matches_catalog]()), s.matches_catalog);
});

test('the buy-direct banner comes first: before every catalog row and every retailer link', () => {
	const src = read('src/pages/where-to-buy.astro');
	const banner = src.indexOf('id="buy-direct-banner"');
	const toggle = src.indexOf('id="wtb"');
	assert.ok(banner > 0 && toggle > banner, 'banner must precede the catalog');
	assert.match(src.slice(banner, toggle), /href="\/print\/"[^>]*>15% off 1st order \+ Free Shipping</);
	if (existsSync(new URL('dist/where-to-buy/index.html', root))) {
		const html = read('dist/where-to-buy/index.html');
		const b = html.indexOf('id="buy-direct-banner"');
		assert.ok(b > 0);
		for (const host of ['amazon.com/dp/', 'barnesandnoble.com/w/', 'play.google.com/store']) assert.ok(html.indexOf(host) > b, `${host} link before the banner`);
		assert.ok(!/"@type":"(Offer|AggregateOffer|Product)"/.test(html), 'no Product/Offer schema on the retailer page');
		assert.ok(!/<meta[^>]*noindex/i.test(html), 'page must be indexable');
	}
});
