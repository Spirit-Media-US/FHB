// node --test scripts/where-to-buy.test.mjs — /where-to-buy/ (Kevin 2026-11-09, ruling 1A + the card/table revision).
// Data rules (src/data/retailer-links.json vs src/data/isbn-list.json) + page rules (source, and dist/ when built).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const isbns = JSON.parse(read('src/data/isbn-list.json'));
const links = JSON.parse(read('src/data/retailer-links.json'));
const digits = (s) => String(s ?? '').replace(/\D/g, '');

const buildCatalog = (data) => {
	const c = new Map();
	for (const g of data.general) c.set(`general-${g.colour.toLowerCase()}`, g);
	for (const v of data.largePrint) c.set(`lp-vol${v.vol}`, v);
	c.set('journaling', data.journaling);
	for (const a of data.audience) c.set(`audience-${a.slug}`, a);
	for (const l of data.languages.filter((x) => x.onSale)) c.set(`lang-${l.code}`, l);
	return c;
};

const HOSTS = {
	amazon: /^https:\/\/www\.amazon\.com\/dp\/B0[0-9A-Z]{8}$/,
	bn: /^https:\/\/www\.barnesandnoble\.com\/w\//,
	google: /^https:\/\/play\.google\.com\/store\/(books|audiobooks)\/details\?id=/,
	apple: /^https:\/\/books\.apple\.com\/us\/(book|audiobook)\//,
};

// Every rule about the data in ONE function, so the failure path can feed it a bad copy.
function problems(isbnData, linkData) {
	const out = [];
	const catalog = buildCatalog(isbnData);
	for (const [id, e] of catalog) {
		for (const f of ['hb', 'pb']) if (!/^979\d{10}$/.test(digits(e[f]))) out.push(`${id} ${f}: bad ISBN-13 "${e[f]}"`);
	}
	for (const [id, rl] of Object.entries(linkData.print)) {
		const e = catalog.get(id);
		if (!e) {
			out.push(`orphan link entry ${id}`);
			continue;
		}
		for (const [rt, m] of Object.entries(rl)) {
			if (!HOSTS[rt]) out.push(`${id}: ${rt} link kept although that retailer is not verifiable`);
			for (const [fmt, url] of Object.entries(m)) {
				if (!HOSTS[rt]?.test(url)) out.push(`${id} ${rt} ${fmt}: unexpected URL ${url}`);
				if (rt === 'bn') {
					const want = digits(fmt === 'hardback' ? e.hb : e.pb);
					if (!url.includes(`ean=${want}`)) out.push(`${id} bn ${fmt}: URL is not ISBN ${want}`);
				}
			}
		}
	}
	for (const m of Object.values(linkData.digital)) for (const row of Object.values(m)) for (const [rt, u] of Object.entries(row)) if (!HOSTS[rt]?.test(u)) out.push(`digital ${rt}: unexpected URL ${u}`);
	return out;
}

test('real data passes every rule, with a catalog of 60+ editions', () => {
	assert.ok(buildCatalog(isbns).size >= 60);
	assert.deepEqual(problems(isbns, links), []);
});

test('FAILURE PATH: a bad ISBN in the data fails the test', () => {
	const bad = structuredClone(isbns);
	bad.general[0].hb = '979-8-89307-33';
	assert.ok(problems(bad, links).some((p) => /bad ISBN-13/.test(p)));
	const wrongEan = structuredClone(links);
	const id = Object.keys(wrongEan.print).find((k) => wrongEan.print[k].bn?.hardback);
	wrongEan.print[id].bn.hardback = wrongEan.print[id].bn.hardback.replace(/ean=\d+/, 'ean=9790000000000');
	assert.ok(problems(isbns, wrongEan).some((p) => /URL is not ISBN/.test(p)));
	const walled = structuredClone(links);
	walled.print['journaling'] = { ...walled.print['journaling'], walmart: { hardback: 'https://www.walmart.com/ip/x/1' } };
	assert.ok(problems(isbns, walled).some((p) => /walmart link kept/.test(p)));
});

test('verification records: B&N all verified; Walmart/Kobo documented as blocked; Apple counted; Amazon sample matches', () => {
	const v = links.verification;
	assert.equal(v.bn.ok, v.bn.checked);
	for (const rt of ['walmart', 'kobo']) assert.equal(v[rt].status, 'blocked', rt);
	const apple = Object.values(links.digital).flatMap((m) => Object.values(m)).filter((r) => r.apple).length;
	assert.equal(v.apple.links, apple);
	const catalog = buildCatalog(isbns);
	const want = { 'general-charcoal hardcover': catalog.get('general-charcoal').hb, 'general-charcoal paperback': catalog.get('general-charcoal').pb, 'journaling hardcover': catalog.get('journaling').hb, 'lang-am hardcover': catalog.get('lang-am').hb, 'audience-athletes paperback': catalog.get('audience-athletes').pb };
	for (const s of v.amazon.isbnReadBackSample) assert.equal(digits(s.isbn13), digits(want[s.matches_catalog]), s.matches_catalog);
});

test('retailer rows come in the order Amazon, B&N, Walmart, Kobo, Apple Books, Google Play', () => {
	assert.deepEqual(links.retailers.map((r) => r.key), ['amazon', 'bn', 'walmart', 'kobo', 'apple', 'google']);
});

test('the buy-direct banner comes first: before every card and every retailer link', () => {
	const src = read('src/pages/where-to-buy.astro');
	const banner = src.indexOf('id="buy-direct-banner"');
	assert.ok(banner > 0 && src.indexOf('id="wtb"') > banner);
	assert.match(src.slice(banner, src.indexOf('id="wtb"')), /href="\/print\/"[^>]*>15% off 1st order \+ Free Shipping</);
	if (!existsSync(new URL('dist/where-to-buy/index.html', root))) return;
	const html = read('dist/where-to-buy/index.html').replace(/ data-astro-cid-\w+/g, '');
	const b = html.indexOf('id="buy-direct-banner"');
	assert.ok(b > 0);
	for (const host of ['amazon.com/dp/', 'barnesandnoble.com/w/', 'play.google.com/store', 'books.apple.com']) assert.ok(html.indexOf(host) > b, `${host} before the banner`);
	assert.ok(html.indexOf('class="ed"') > b, 'first card before the banner');
	assert.ok(!/"@type":"(Offer|AggregateOffer|Product)"/.test(html));
	assert.ok(!/<meta[^>]*noindex/i.test(html));
});

test('built cards: cover left with size + lazy + alt, Retailer|Hardback|Paperback table, Buy direct row first', () => {
	if (!existsSync(new URL('dist/where-to-buy/index.html', root))) return;
	const html = read('dist/where-to-buy/index.html').replace(/ data-astro-cid-\w+/g, '');
	const cards = html.match(/<article class="ed" [\s\S]*?<\/article>/g) ?? [];
	assert.equal(cards.length, buildCatalog(isbns).size, 'one card per edition, both bindings in it');
	for (const c of cards) {
		const img = c.match(/<img [^>]*>/)?.[0] ?? '';
		assert.match(img, /src="https:\/\/assets\.spiritmediapublishing\.com\/FHB\/print\//, 'cover from the existing card art');
		assert.match(img, /width="600"/);
		assert.match(img, /height="\d+"/);
		assert.match(img, /loading="lazy"/);
		assert.match(img, /alt="[^"]{8,}"/);
		assert.ok(c.indexOf('class="ed-cover"') < c.indexOf('class="ed-head"'), 'cover first (left)');
		assert.match(c, /<th scope="col">Retailer<\/th><th scope="col">Hardback<\/th><th scope="col">Paperback<\/th>/);
		const rows = [...c.matchAll(/<tr class="rt[^"]*" data-rt="([a-z]+)"/g)].map((m) => m[1]);
		assert.deepEqual(rows, ['direct', 'amazon', 'bn', 'walmart', 'kobo', 'apple', 'google']);
	}
	assert.ok(html.split('class="ed ed-digital"').length > 20, 'digital cards present');
});
