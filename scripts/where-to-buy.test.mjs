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
	walmart: /^https:\/\/www\.walmart\.com\/ip\/[^?#]+\/\d+$/,
	kobo: /^https:\/\/www\.kobo\.com\/[a-z-]+\/[a-z]{2}\/(ebook|audiobook)\/[^?#]+$/,
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
	walled.print['journaling'] = { ...walled.print['journaling'], walmart: { hardback: 'https://www.walmart.com/search?q=9798893073164' } };
	assert.ok(problems(isbns, walled).some((p) => /walmart hardback: unexpected URL/.test(p)));
});

test('verification records: B&N all verified; Walmart/Kobo found via Google results (product pages are behind a human check); Apple counted; Amazon sample matches', () => {
	const v = links.verification;
	assert.equal(v.bn.ok, v.bn.checked);
	for (const rt of ['walmart', 'kobo']) assert.equal(v[rt].status, 'google-verified', rt);
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
	assert.match(src.slice(banner, src.indexOf('id="wtb"')), /href="\/print\/"[^>]*>\{DIRECT\}</);
	if (!existsSync(new URL('dist/where-to-buy/index.html', root))) return;
	const html = read('dist/where-to-buy/index.html').replace(/ data-astro-cid-\w+/g, '');
	const b = html.indexOf('id="buy-direct-banner"');
	assert.ok(b > 0);
	for (const host of ['amazon.com/dp/', 'barnesandnoble.com/w/', 'play.google.com/store', 'books.apple.com']) assert.ok(html.indexOf(host) > b, `${host} before the banner`);
	assert.ok(html.indexOf('class="ed"') > b, 'first card before the banner');
	assert.ok(!/"@type":"(Offer|AggregateOffer|Product)"/.test(html));
	assert.ok(!/<meta[^>]*noindex/i.test(html));
});

test('built cards: cover left with size + lazy + alt, ISBNs under binding columns, Buy direct first, only stores with links, digital on the language card', () => {
	if (!existsSync(new URL('dist/where-to-buy/index.html', root))) return;
	const html = read('dist/where-to-buy/index.html').replace(/ data-astro-cid-\w+/g, '');
	assert.ok(!/Not listed/.test(html), 'no "Not listed" rows');
	assert.ok(!/id="digital"/.test(html) && !/Digital editions<\/span>/.test(html.replace(/<caption>.*?<\/caption>/g, '')), 'no separate digital section');
	const catalog = buildCatalog(isbns);
	const cards = html.match(/<article class="ed" [\s\S]*?<\/article>/g) ?? [];
	assert.equal(cards.length, catalog.size + 1, 'one card per print edition + the Large Print set');
	const order = links.retailers.map((r) => r.key);
	const rowsOf = (t) => [...t.matchAll(/<tr class="rt[^"]*" data-rt="([a-z]+)">([\s\S]*?)<\/tr>/g)];
	for (const c of cards) {
		const id = c.match(/data-edition="([^"]+)"/)[1];
		const img = c.match(/<img [^>]*>/)?.[0] ?? '';
		assert.match(img, /src="https:\/\/assets\.spiritmediapublishing\.com\/FHB\/print\//, 'cover from the existing card art');
		assert.match(img, /width="600"/);
		assert.match(img, /height="\d+"/);
		assert.match(img, /loading="lazy"/);
		assert.match(img, /alt="[^"]{8,}"/);
		assert.ok(c.indexOf('class="ed-cover"') < c.indexOf('class="ed-head"'), 'cover first');
		// Kevin 2026-11-09: ONE column grid per card, digital IN the Hardback/Paperback columns, lined up.
		const tables = c.match(/<table [\s\S]*?<\/table>/g) ?? [];
		assert.equal(tables.length, 1, `${id}: one table per card`);
		assert.match(tables[0], /<colgroup><col class="c-rt"><col class="c-a"><col class="c-b"><\/colgroup>/, `${id}: fixed 3-column grid`);
		for (const tr of tables[0].match(/<tr[\s\S]*?<\/tr>/g) ?? []) assert.equal((tr.match(/<t[hd][ >]/g) ?? []).length, 3, `${id}: every row has 3 cells`);
		const bodies = tables[0].match(/<tbody[\s\S]*?<\/tbody>/g) ?? [];
		const printT = bodies.find((t) => !t.startsWith('<tbody class="ed-dig"')) && tables[0].includes('<thead>') ? tables[0].replace(/<tbody class="ed-dig"[\s\S]*?<\/tbody>/, '') : undefined;
		const digT = bodies.find((t) => t.startsWith('<tbody class="ed-dig"'));
		if (id === 'digital-en') assert.ok(!printT, 'English eBook card has no print table');
		else if (id === 'lp-set') {
			const rows = rowsOf(printT);
			assert.deepEqual(rows.map((r) => r[1]), ['direct'], 'set: Buy direct only');
			assert.equal((rows[0][2].match(/href="\/bibles\/lp-set-bible\/#order"/g) ?? []).length, 2, 'set: both bindings order the set direct');
		} else {
			const e = catalog.get(id);
			assert.ok(printT.includes(`Hardback<span class="th-isbn">ISBN ${e.hb}</span>`), `${id}: hardback ISBN under its header`);
			assert.ok(printT.includes(`Paperback<span class="th-isbn">ISBN ${e.pb}</span>`), `${id}: paperback ISBN under its header`);
			const rows = rowsOf(printT);
			assert.equal(rows[0][1], 'direct', 'Buy direct row first');
			assert.ok(rows[0][2].includes('15% off 1st order + Free Shipping'));
			const keys = rows.slice(1).map((r) => r[1]);
			for (const [, k, body] of rows.slice(1)) assert.match(body, /<a href="https:\/\//, `${id}: ${k} row without a link`);
			assert.deepEqual(keys, order.filter((k) => Object.keys(links.print[id]?.[k] ?? {}).length > 0), `${id}: rows = stores with verified links`);
			// Walmart rows exist only where a verified product link exists.
			const wm = rows.find((r) => r[1] === 'walmart');
			assert.equal(!!wm, Object.keys(links.print[id]?.walmart ?? {}).length > 0, `${id}: Walmart row iff verified Walmart link`);
		}
		const code = id === 'digital-en' || id.startsWith('general-') ? 'en' : id.startsWith('lang-') ? id.slice(5) : null;
		const hasDigital = code && ['ebook', 'listening', 'audiobook'].some((k) => links.digital[k]?.[code]);
		assert.equal(!!digT, !!hasDigital, `${id}: digital table iff the language has digital editions`);
		if (digT) for (const [, k, body] of rowsOf(digT).filter((r) => r[1] !== 'direct')) assert.match(body, /<a href="https:\/\//, `${id} digital ${k} row without a link`);
	}
	// every digital link in the data is on its language's own card
	for (const [kind, m] of Object.entries(links.digital)) for (const [code, row] of Object.entries(m)) {
		const ids = code === 'en' ? [...isbns.general.map((g) => `general-${g.colour.toLowerCase()}`)] : [`lang-${code}`];
		for (const eid of ids) {
			const card = cards.find((c) => c.includes(`data-edition="${eid}"`));
			assert.ok(card, `${kind} ${code}: no card ${eid}`);
			for (const u of Object.values(row)) assert.ok(card.includes(u), `${kind} ${code}: ${u} not on ${eid}`);
		}
	}
	const langOrder = (html.match(/data-edition="(?:lang-[\w-]+|digital-en)"/g) ?? []).length;
	assert.equal(langOrder, isbns.languages.filter((l) => l.onSale).length);
	assert.ok(!html.includes('data-edition="digital-en"'), 'no separate English card (Kevin 4 B)');
	const buttons = [...html.matchAll(/<button type="button" data-rt="([a-z]+)"/g)].map((m) => m[1]);
	assert.deepEqual(buttons.slice(0, 2), ['direct', 'all'], 'Buy direct first, marked Preferred');
	assert.match(html, /data-rt="direct"[^>]*class="wtb-pref">Buy direct <span class="wtb-badge">Preferred<\/span>/);
	const hasKobo = Object.values(links.digital).some((m) => Object.values(m).some((r) => r.kobo));
	assert.equal(buttons.includes('kobo'), hasKobo, 'Kobo button iff a Kobo link exists');
	for (const k of ['amazon', 'bn', 'walmart', 'apple', 'google']) assert.ok(buttons.includes(k), `${k} button`);
	// the filter's card list: a card advertises exactly the stores it has links for
	const es = cards.find((c) => c.includes('data-edition="lang-es"'));
	assert.match(es, /data-stores="[^"]*\bgoogle\b/);
});

test('no href on the built page is a search page, and every Walmart href is a product page', () => {
	if (!existsSync(new URL('dist/where-to-buy/index.html', root))) return;
	const html = read('dist/where-to-buy/index.html');
	const hrefs = [...html.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
	assert.ok(hrefs.length > 100);
	for (const h of hrefs) assert.ok(!h.includes('/search?'), `search link: ${h}`);
	const wm = hrefs.filter((h) => h.includes('walmart.com'));
	assert.ok(wm.length > 0, 'Walmart links present');
	for (const h of wm) assert.match(h, /^https:\/\/www\.walmart\.com\/ip\/[^?#]+\/\d+$/);
});
