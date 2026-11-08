#!/usr/bin/env node
/**
 * merchant-feed-verify.mjs — proves the Merchant feed says what the live pages say.
 * Checks per item: link returns 200; feed price == the price in that SKU's Offer in the page's
 * live JSON-LD (and gtin, availability agree); GTIN is a valid ISBN-13 (978/979 + checksum);
 * image returns 200; required fields present; ids unique. EXITS NONZERO on any failure.
 * --selftest: corrupts one price in memory and asserts the check fires (a gate that never
 * rejected anything is unproven). Usage: node scripts/merchant-feed-verify.mjs [feed.xml] [--selftest] [--json out]
 */
import { readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const file = args.find((a) => a.endsWith('.xml')) ?? 'dist/merchant-feed.xml';
const xml = readFileSync(file, 'utf8');
const un = (s) => s.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const tag = (b, t) => { const m = new RegExp(`<${t}>(.*?)</${t}>`, 's').exec(b); return m ? un(m[1]) : ''; };
const items = [...xml.matchAll(/<item>(.*?)<\/item>/gs)].map((m) => ({
	id: tag(m[1], 'g:id'), title: tag(m[1], 'title'), link: tag(m[1], 'link'), image: tag(m[1], 'g:image_link'),
	price: tag(m[1], 'g:price'), availability: tag(m[1], 'g:availability'), gtin: tag(m[1], 'g:gtin'),
	brand: tag(m[1], 'g:brand'), condition: tag(m[1], 'g:condition'), desc: tag(m[1], 'description'),
	cat: tag(m[1], 'g:google_product_category'), ship: tag(m[1], 'g:shipping'),
}));

const isbn13 = (g) => /^97[89]\d{10}$/.test(g) &&
	[...g].reduce((s, c, i) => s + Number(c) * (i % 2 ? 3 : 1), 0) % 10 === 0;

const cache = new Map();
const get = async (u, method = 'GET') => {
	const k = method + u;
	if (!cache.has(k)) cache.set(k, fetch(u, { method, redirect: 'follow' }).then(async (r) => ({ status: r.status, body: method === 'GET' ? await r.text() : '' })).catch((e) => ({ status: 0, body: '', err: String(e) })));
	return cache.get(k);
};
const offersOf = (html) => {
	const out = new Map();
	const walk = (n) => {
		if (Array.isArray(n)) return n.forEach(walk);
		if (!n || typeof n !== 'object') return;
		if (n.offers?.sku) out.set(n.offers.sku, n.offers);
		Object.values(n).forEach(walk);
	};
	for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)) { try { walk(JSON.parse(m[1])); } catch {} }
	return out;
};

async function run(list) {
	const fails = [];
	const seen = new Set();
	for (const i of list) {
		const bad = (m) => fails.push(`${i.id}: ${m}`);
		if (seen.has(i.id)) bad('duplicate id'); seen.add(i.id);
		for (const f of ['id', 'title', 'desc', 'link', 'image', 'price', 'gtin', 'brand', 'cat', 'ship']) if (!i[f]) bad(`missing ${f}`);
		if (i.condition !== 'new') bad('condition not new');
		if (!isbn13(i.gtin)) bad(`GTIN ${i.gtin} not a valid ISBN-13`);
		if (!/^\d+\.\d\d USD$/.test(i.price)) bad(`price format ${i.price}`);
		const pg = await get(i.link);
		if (pg.status !== 200) { bad(`link ${i.link} -> ${pg.status}`); continue; }
		const o = offersOf(pg.body).get(i.id);
		if (!o) bad(`no Offer for sku ${i.id} in live page JSON-LD`);
		else {
			if (`${o.price} ${o.priceCurrency}` !== i.price) bad(`price feed "${i.price}" != page "${o.price} ${o.priceCurrency}"`);
			if (o.gtin13 !== i.gtin) bad(`gtin feed ${i.gtin} != page ${o.gtin13}`);
			if (!o.availability.endsWith('InStock') || i.availability !== 'in_stock') bad('availability mismatch');
		}
		const im = await get(i.image, 'HEAD');
		if (im.status !== 200) bad(`image ${i.image} -> ${im.status}`);
	}
	return fails;
}

if (args.includes('--selftest')) {
	const t = structuredClone(items.slice(0, 2));
	t[0].price = '1.23 USD';
	const f = await run(t);
	const ok = f.some((x) => x.includes('price feed'));
	console.log(ok ? `selftest OK: wrong price rejected (${f[0]})` : 'selftest FAILED: wrong price NOT caught');
	process.exit(ok ? 0 : 1);
}
const fails = await run(items);
const result = { feed: file, items: items.length, links: new Set(items.map((i) => i.link)).size, failures: fails.length, failureList: fails.slice(0, 200) };
if (args.includes('--json')) writeFileSync(args[args.indexOf('--json') + 1], JSON.stringify(result, null, 1));
console.log(`merchant-feed-verify: ${items.length} items, ${result.links} pages, ${fails.length} failures`);
fails.slice(0, 40).forEach((f) => console.log('  FAIL', f));
process.exit(fails.length ? 1 : 0);
