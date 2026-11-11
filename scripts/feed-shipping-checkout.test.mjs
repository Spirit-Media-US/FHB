// Unit 2sw: the Merchant feed's shipping price per country == what /dvc-checkout charges for ONE copy of
// that item to that country (shipping option + per-copy "Import & handling" lines) at list price, for every
// live country x every item in dist/merchant-feed.xml. Oracle = the real handler (Stripe mocked), not a
// re-derivation. Reads dist/ (run after astro build). The feed price is the LIST price, so the repeat-buyer
// (no first-order discount) checkout is the comparison; US must stay free.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LIVE_COUNTRIES } from '../src/lib/shipCountries.ts';
import { perCopyHandlingCents, shippingDetailsFor } from '../src/lib/marginGuard.ts';

const xml = fs.readFileSync('dist/merchant-feed.xml', 'utf8');
const feed = new Map(); // `${id}|${cc}` -> cents
for (const it of xml.matchAll(/<item>(.*?)<\/item>/gs)) {
	const id = /<g:id>(.*?)<\/g:id>/.exec(it[1])[1];
	for (const b of it[1].matchAll(/<g:country>([A-Z]{2})<\/g:country>.*?<g:price>(\d+\.\d\d) USD<\/g:price>/g))
		feed.set(`${id}|${b[1]}`, Math.round(Number(b[2]) * 100));
}
const ids = [...new Set([...feed.keys()].map((k) => k.split('|')[0]))];

async function checkoutOneCopy(slug, country) {
	let body = '';
	globalThis.fetch = async (url, init) => {
		const u = String(url);
		const j = (o) => new Response(JSON.stringify(o), { status: 200 });
		if (u.includes('promotion_codes')) return j({ data: [{ id: 'p', coupon: { valid: true, percent_off: 15 } }] });
		if (u.includes('checkout/sessions') && init?.method === 'POST') { body = init.body; return j({ url: 'https://stripe.test/x' }); }
		if (u.includes('checkout/sessions')) return j({ data: [{ payment_status: 'paid' }] }); // repeat buyer: list price
		return j({ data: [] });
	};
	const { onRequestPost } = await import('../functions/dvc-checkout.ts');
	const res = await onRequestPost({ request: new Request('https://x.test/dvc-checkout', { method: 'POST', body: JSON.stringify({ counts: { [slug]: 1 }, email: 'r@b.co', country }) }), env: { STRIPE_FHB_SECRET_KEY: 'sk_test' } });
	assert.equal(res.status, 200, `${slug} ${country} checkout`);
	const f = new URLSearchParams(body);
	assert.equal(f.get('line_items[0][price_data][unit_amount]') !== null, true);
	let total = Number(f.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'));
	for (let i = 1; f.get(`line_items[${i}][quantity]`); i++)
		if (/handling/i.test(f.get(`line_items[${i}][price_data][product_data][name]`)))
			total += Number(f.get(`line_items[${i}][price_data][unit_amount]`)) * Number(f.get(`line_items[${i}][quantity]`));
	return total;
}
const mismatches = (feedMap, oracle) => [...feedMap].filter(([k, v]) => v !== oracle.get(k)).map(([k]) => k);

const oracle = new Map();
test('feed shipping == checkout (1 copy, list price) for every live country x every item', async () => {
	assert.ok(ids.length >= 100 && LIVE_COUNTRIES.length >= 20, 'feed has the items and countries');
	for (const id of ids)
		for (const c of LIVE_COUNTRIES) {
			assert.ok(feed.has(`${id}|${c.code}`), `${id} has a ${c.code} block`);
			oracle.set(`${id}|${c.code}`, await checkoutOneCopy(id, c.code));
		}
	assert.deepEqual(mismatches(feed, oracle), []);
	for (const id of ids) assert.equal(feed.get(`${id}|US`), 0, 'US stays free');
});
test('defect injection: a feed price one cent off checkout is caught', () => {
	const bad = new Map(feed);
	const k = [...bad.keys()].find((x) => !x.endsWith('|US'));
	bad.set(k, bad.get(k) + 1);
	assert.deepEqual(mismatches(bad, oracle), [k]);
});
test('a country where handling is NOT zero at list: JSON-LD/feed shipping = rate + the checkout fee', () => {
	const dear = { ...LIVE_COUNTRIES.find((c) => c.code === 'IN'), landed_cost_usd: { hc: 90, pb: 90, bi: 20 } };
	const fee = perCopyHandlingCents('moms-hb', 9999, 0, dear);
	assert.ok(fee > 0);
	const d = shippingDetailsFor({ slug: 'moms-hb', listUsd: 99.99 }, [dear]);
	assert.equal(Math.round(Number(d.shippingRate.value) * 100), Math.round(Number(dear.shippingRate.value) * 100) + fee);
	const cheaper = { ...dear, landed_cost_usd: { hc: 80, pb: 80, bi: 20 } };
	assert.notEqual(perCopyHandlingCents('moms-hb', 9999, 0, cheaper), fee, 'changing one fee input changes the price');
});
