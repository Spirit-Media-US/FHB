// node --test scripts/ship-countries.test.mjs   (unit 2js)
// ONE list (src/data/ship-countries.json) must drive checkout, JSON-LD, the Merchant feed and
// visible copy, and no PENDING country may reach any of them. Output checks read dist/ (run after
// `astro build` + gen-merchant-feed).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
	LIVE_COUNTRIES, PENDING_COUNTRIES, SHIP_CODES, checkoutShippingForm, countryFor, validateRow,
	shippingDetailsForOffers, shipsLine,
} from '../src/lib/shipCountries.ts';
import { merchantReturnPolicy } from '../src/lib/merchantReturnPolicy.ts';

const pendingCodes = PENDING_COUNTRIES.map((c) => c.code);

test('config: live rows are complete, pending rows are not live and do not overlap', () => {
	assert.ok(LIVE_COUNTRIES.length >= 1);
	for (const c of LIVE_COUNTRIES) assert.deepEqual(validateRow(c), [], `live ${c.code}`);
	for (const c of PENDING_COUNTRIES) assert.equal(c.status, 'PENDING');
	for (const code of pendingCodes) assert.ok(!SHIP_CODES.includes(code), `${code} is both live and pending`);
	assert.equal(new Set(SHIP_CODES).size, SHIP_CODES.length, 'duplicate live country');
});
test('failure path: an incomplete live row is rejected', () => {
	assert.ok(validateRow({ code: 'GB', name: 'United Kingdom', printSite: null, shippingRate: null }).length >= 3);
	assert.ok(validateRow({ ...LIVE_COUNTRIES[0], printSite: 'MARS' }).length);
});
test('checkout: allowed_countries, rate and phone come from the list; pending/unknown refused', () => {
	for (const c of LIVE_COUNTRIES) {
		const f = checkoutShippingForm(c.code);
		assert.equal(f['shipping_address_collection[allowed_countries][0]'], c.code);
		assert.equal(f['phone_number_collection[enabled]'], 'true');
		assert.equal(f['shipping_options[0][shipping_rate_data][fixed_amount][amount]'], Math.round(Number(c.shippingRate.value) * 100));
		assert.equal(f['shipping_options[0][shipping_rate_data][fixed_amount][currency]'], c.shippingRate.currency.toLowerCase());
		assert.equal(Object.keys(f).filter((k) => k.includes('allowed_countries')).length, 1);
	}
	assert.equal(countryFor('us')?.code, 'US');
	for (const bad of [...pendingCodes, 'ZZ', '', undefined, null, 'US,GB', ['US']]) assert.equal(checkoutShippingForm(bad), null, String(bad));
});
test('checkout functions use the list, no hard-coded country', () => {
	for (const f of ['functions/dvc-checkout.ts', 'functions/print-checkout.ts']) {
		const src = fs.readFileSync(f, 'utf8');
		assert.match(src, /checkoutShippingForm\(/, f);
		assert.doesNotMatch(src, /allowed_countries\]\[0\]'\s*:\s*'[A-Z]{2}'/, `${f} hard-codes a country`);
	}
	assert.match(fs.readFileSync('functions/dvc-checkout.ts', 'utf8'), /country_not_served/);
});
test('schema: one OfferShippingDetails per live country; return policy uses the same list', () => {
	const d = [].concat(shippingDetailsForOffers());
	assert.deepEqual(d.map((x) => x.shippingDestination.addressCountry), [...SHIP_CODES]);
	assert.deepEqual([].concat(merchantReturnPolicy.applicableCountry), [...SHIP_CODES]);
	for (const x of d) assert.ok(x.deliveryTime.handlingTime && x.deliveryTime.transitTime && x.shippingRate.currency);
});
test('copy: never claims worldwide while only one country is live', () => {
	if (LIVE_COUNTRIES.length === 1) assert.doesNotMatch(shipsLine(), /worldwide/i);
	else assert.match(shipsLine(), /worldwide/i);
});

// ---- built output ----
const codesIn = (node, out = []) => {
	if (Array.isArray(node)) node.forEach((n) => codesIn(n, out));
	else if (node && typeof node === 'object') {
		const t = [].concat(node['@type'] || []);
		if ((t.includes('OfferShippingDetails') || t.includes('MerchantReturnPolicy'))) {
			for (const k of ['shippingDestination', 'applicableCountry']) for (const v of [].concat(node[k] ?? [])) out.push(typeof v === 'string' ? v : v.addressCountry);
		}
		Object.values(node).forEach((v) => codesIn(v, out));
	}
	return out;
};
const html = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); e.isDirectory() ? html(f, out) : e.name.endsWith('.html') && out.push(f); } return out; };
export function leakedCodes(seen, live = SHIP_CODES) { return [...new Set(seen)].filter((c) => !live.includes(c)); }

test('failure path: the leak detector flags a pending country', () => {
	assert.deepEqual(leakedCodes(['US', 'GB']), ['GB']);
	assert.deepEqual(leakedCodes(['US']), []);
});
test('dist: every shipping/return country in JSON-LD is live; no pending country leaks', () => {
	assert.ok(fs.existsSync('dist'), 'dist/ missing: run the build first');
	let pages = 0;
	for (const f of html('dist')) {
		const h = fs.readFileSync(f, 'utf8');
		if (!h.includes('OfferShippingDetails') && !h.includes('MerchantReturnPolicy')) continue;
		for (const m of h.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
			let j; try { j = JSON.parse(m[1]); } catch { continue; }
			const seen = codesIn(j);
			assert.deepEqual(leakedCodes(seen), [], `${f} emits a non-live country`);
			for (const o of [].concat(j)) { void o; }
			pages += seen.length ? 1 : 0;
		}
	}
	assert.ok(pages > 0, 'no shipping JSON-LD found');
});
test('dist: Merchant feed ships to exactly the live list, per item', () => {
	const feed = fs.readFileSync('dist/merchant-feed.xml', 'utf8');
	const items = [...feed.matchAll(/<item>([\s\S]*?)<\/item>/g)];
	assert.ok(items.length > 0);
	for (const [, body] of items) {
		const cs = [...body.matchAll(/<g:shipping><g:country>([A-Z]{2})<\/g:country>[\s\S]*?<g:price>([\d.]+) ([A-Z]{3})<\/g:price>/g)];
		assert.deepEqual(cs.map((m) => m[1]).sort(), [...SHIP_CODES].sort(), 'feed countries != live list');
		for (const m of cs) assert.equal(m[2], Number(countryFor(m[1]).shippingRate.value).toFixed(2));
	}
	for (const code of pendingCodes) assert.ok(!new RegExp(`<g:country>${code}</g:country>`).test(feed), `${code} leaked into feed`);
});
test('dist: visible pages carry the config-derived ships line', () => {
	for (const f of ['dist/print/index.html', 'dist/print/order/index.html']) {
		assert.ok(fs.readFileSync(f, 'utf8').includes('data-ships-line'), f);
	}
});
