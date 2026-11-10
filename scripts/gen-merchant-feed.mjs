#!/usr/bin/env node
/**
 * gen-merchant-feed.mjs — Google Merchant Center product feed for the FHB print editions.
 * Unit 2je (Kevin 2026-11-08: when someone searches FHB, the site must show as a retailer).
 *
 * SOURCE OF TRUTH = the BUILT edition pages' own Product/Offer JSON-LD (dist/bibles/<slug>/),
 * which src/pages/bibles/[slug].astro emits one-per-binding and pricing-verify.mjs check 11
 * already gates against the checkout. The feed therefore cannot say anything the page does not,
 * and only editions that carry an Offer (ISBN + a working order form) appear: reserve-only and
 * pre-order editions declare no Offer, so they are excluded by construction.
 *
 * Runs AFTER `astro build` (writes dist/merchant-feed.xml). Nothing is submitted anywhere:
 * the file is just served at /merchant-feed.xml; registering it in Merchant Center is a later,
 * Kevin-gated step. Validate with scripts/merchant-feed-verify.mjs.
 * Unit 2ra: the SAME item list also emits dist/merchant-feed-openai.jsonl (OpenAI/ChatGPT merchant
 * product feed, https://developers.openai.com/commerce/specs/feed, read 2026-11-10): one JSON object per
 * line, the 9 required fields (item_id,title,description,url,brand,seller_name,image_url,availability,
 * price) plus gtin, condition, group_id, product_category, target_countries, store_country. Same
 * ids/prices/availability/links/images/GTINs as the XML by construction; scripts/openai-feed.test.mjs
 * enforces parity. NOT submitted anywhere (application is unit 2rb).
 * Usage: node scripts/gen-merchant-feed.mjs [--out dist/merchant-feed.xml]
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';

const DIST = 'dist';
const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : `${DIST}/merchant-feed.xml`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const BIND = { 'https://schema.org/Hardcover': 'Hardcover', 'https://schema.org/Paperback': 'Paperback' };

const items = new Map();
const walk = (n, ctx) => {
	if (Array.isArray(n)) return n.forEach((x) => walk(x, ctx));
	if (!n || typeof n !== 'object') return;
	const offer = n.offers && !Array.isArray(n.offers) ? n.offers : undefined;
	if (offer && offer.sku && offer.gtin13) {
		const fmt = BIND[n.bookFormat];
		if (!items.has(offer.sku))
			items.set(offer.sku, {
				id: offer.sku,
				title: `${n.name.replace(/ \((Hardcover|Paperback)\)$/, '')}${fmt ? ` (${fmt})` : ''}`,
				description: (n.description || ctx.desc || n.name).replace(/\s+/g, ' ').trim().slice(0, 4900),
				link: offer.url,
				image: n.image || ctx.image,
				price: offer.price,
				currency: offer.priceCurrency,
				availability: offer.availability,
				condition: offer.itemCondition,
				gtin: offer.gtin13,
				group: ctx.slug,
				ship: offer.shippingDetails,
			});
	}
	for (const v of Object.values(n)) walk(v, ctx);
};

for (const d of readdirSync(`${DIST}/bibles`).sort()) {
	const f = `${DIST}/bibles/${d}/index.html`;
	if (!existsSync(f)) continue;
	const html = readFileSync(f, 'utf8');
	for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)) {
		let j;
		try { j = JSON.parse(m[1]); } catch { continue; }
		walk(j, { slug: d, desc: j.description, image: j.image });
	}
}

const num = (q, k) => q?.[k] ?? '';
const rows = [...items.values()].map((i) => {
	// One <g:shipping> per OfferShippingDetails, i.e. one per LIVE country in
	// src/data/ship-countries.json (the page JSON-LD is built from it). No shipping in the page = no
	// shipping in the feed: fail loudly rather than invent a US default.
	const details = [].concat(i.ship ?? []);
	if (!details.length) throw new Error(`merchant-feed: ${i.id} has no shippingDetails in its page JSON-LD`);
	const ship = details
		.map((d) => {
			const dt = d.deliveryTime;
			const cc = [].concat(d.shippingDestination)[0]?.addressCountry;
			return `<g:shipping><g:country>${esc(cc)}</g:country><g:service>${esc(d.name ?? "Standard")}</g:service><g:price>${Number(d.shippingRate?.value ?? 0).toFixed(2)} ${esc(d.shippingRate?.currency ?? 'USD')}</g:price>` +
				`<g:min_handling_time>${num(dt?.handlingTime, 'minValue')}</g:min_handling_time><g:max_handling_time>${num(dt?.handlingTime, 'maxValue')}</g:max_handling_time>` +
				`<g:min_transit_time>${num(dt?.transitTime, 'minValue')}</g:min_transit_time><g:max_transit_time>${num(dt?.transitTime, 'maxValue')}</g:max_transit_time></g:shipping>`;
		})
		.join('\n');
	return `<item>
<g:id>${esc(i.id)}</g:id>
<title>${esc(i.title)}</title>
<description>${esc(i.description)}</description>
<link>${esc(i.link)}</link>
<g:image_link>${esc(i.image)}</g:image_link>
<g:price>${esc(i.price)} ${esc(i.currency)}</g:price>
<g:availability>${i.availability.endsWith('InStock') ? 'in_stock' : 'out_of_stock'}</g:availability>
<g:condition>new</g:condition>
<g:gtin>${esc(i.gtin)}</g:gtin>
<g:brand>Father's Heart Bible</g:brand>
<g:identifier_exists>yes</g:identifier_exists>
<g:google_product_category>Media &gt; Books</g:google_product_category>
<g:product_type>Bibles</g:product_type>
<g:item_group_id>${esc(i.group)}</g:item_group_id>
${ship}
</item>`;
});
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>Father's Heart Bible — print editions</title>
<link>https://fathersheartbible.com/</link>
<description>Father's Heart Bible print editions, ordered direct at fathersheartbible.com</description>
${rows.join('\n')}
</channel>
</rss>
`;
writeFileSync(OUT, xml);
const OUT_JSONL = OUT.replace(/\.xml$/, '') + '-openai.jsonl';
const AVAIL = (a) => (a.endsWith('InStock') ? 'in_stock' : 'out_of_stock');
const jsonl = [...items.values()].map((i) => JSON.stringify({
	item_id: String(i.id),
	title: i.title,
	description: i.description,
	url: i.link,
	brand: "Father's Heart Bible",
	seller_name: 'Spirit Media Publishing',
	image_url: i.image,
	availability: AVAIL(i.availability),
	price: `${i.price} ${i.currency}`,
	gtin: String(i.gtin),
	condition: 'new',
	group_id: i.group,
	product_category: 'Media > Books',
	target_countries: ['US'],
	store_country: 'US',
})).join('\n') + '\n';
writeFileSync(OUT_JSONL, jsonl);
console.log(`merchant-feed: ${items.size} records -> ${OUT_JSONL}`);
console.log(`merchant-feed: ${rows.length} items -> ${OUT}`);
