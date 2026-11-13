// node --test scripts/store-engine-parity.test.mjs   (SMP store engine Phase 2, plan 3fb, pmseoaeo 2026-11-13)
// PARITY GATE for the engine extraction: the Stripe Checkout request /dvc-checkout sends for a fixed set of carts must
// stay BYTE-IDENTICAL (body, and the order of every Stripe call) to the golden recorded BEFORE the extraction.
// Record the golden on the pre-extraction code only:  STORE_ENGINE_GOLDEN=write node --test scripts/store-engine-parity.test.mjs

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const GOLDEN = new URL('./fixtures/store-engine-golden.json', import.meta.url);
export const CARTS = [
	{
		id: 'bible-us-volume',
		counts: { 'moms-hb': 12 },
		email: 'x@y.co',
		country: 'US',
		repeat: true,
	},
	{ id: 'bible-us-first-order', counts: { 'moms-hb': 1 }, email: 'new@y.co', country: 'US' },
	{ id: 'book-us', counts: { 'who-am-i-pb': 2 }, email: 'new@y.co', country: 'US' },
	{
		id: 'mixed-us-first-order',
		counts: { 'moms-pb': 1, 'beloved-identity-pb': 1, 'who-am-i-hb': 1 },
		email: 'new@y.co',
		country: 'US',
		returnPath: '/books/who-am-i/',
	},
	{ id: 'far-band-first-order', counts: { 'moms-hb': 3 }, email: 'new@y.co', country: 'PH' },
	{ id: 'far-band-bulk-refused', counts: { 'moms-hb': 10 }, email: 'new@y.co', country: 'PH' },
	{
		id: 'intl-gb-mixed-handling',
		counts: { 'moms-hb': 2, 'moms-pb': 3 },
		email: 'new@y.co',
		country: 'GB',
		returnPath: '/print/order/',
	},
	{
		id: 'intl-gb-volume-repeat',
		counts: { 'moms-pb': 30 },
		email: 'x@y.co',
		country: 'GB',
		repeat: true,
	},
	{ id: 'book-abroad', counts: { 'beloved-identity-pb': 1 }, email: 'new@y.co', country: 'DE' },
	{ id: 'empty', counts: {}, email: 'new@y.co', country: 'US' },
	{
		id: 'no-email',
		counts: { 'moms-pb': 5 },
		email: '',
		country: 'US',
		returnPath: '/bibles/spanish-bible/',
	},
];

async function run(c) {
	const calls = [];
	let body = '';
	globalThis.fetch = async (url, init) => {
		const u = String(url);
		calls.push(`${init?.method ?? 'GET'} ${u}`);
		const j = (o) => new Response(JSON.stringify(o), { status: 200 });
		if (u.includes('promotion_codes'))
			return j({ data: [{ id: 'promo_1', coupon: { valid: true, percent_off: 15 } }] });
		if (u.includes('checkout/sessions') && init?.method === 'POST') {
			body = init.body;
			return j({ url: 'https://stripe.test/x' });
		}
		if (u.includes('checkout/sessions'))
			return j({ data: c.repeat ? [{ payment_status: 'paid' }] : [] });
		return j({ data: [] });
	};
	const { onRequestPost } = await import('../functions/dvc-checkout.ts');
	const res = await onRequestPost({
		request: new Request('https://fathersheartbible.pages.dev/dvc-checkout', {
			method: 'POST',
			body: JSON.stringify({
				counts: c.counts,
				email: c.email,
				country: c.country,
				returnPath: c.returnPath,
			}),
		}),
		env: { STRIPE_FHB_SECRET_KEY: 'sk_test' },
	});
	return { status: res.status, json: await res.json(), calls, body };
}

test('store engine parity: every fixed cart sends the byte-identical Stripe request', async () => {
	const got = {};
	for (const c of CARTS) got[c.id] = await run(c);
	if (process.env.STORE_ENGINE_GOLDEN === 'write') {
		fs.writeFileSync(GOLDEN, `${JSON.stringify(got, null, 1)}\n`);
		return;
	}
	const want = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
	assert.deepEqual(Object.keys(got), Object.keys(want));
	for (const id of Object.keys(want)) assert.deepEqual(got[id], want[id], `cart ${id} changed`);
});

test('store engine parity: the golden covers a session, a refusal and every rule path', () => {
	const want = JSON.parse(fs.readFileSync(GOLDEN, 'utf8'));
	const has = (id, s) => want[id].body.includes(s);
	assert.ok(has('bible-us-volume', 'metadata%5Boffer%5D=volume'), 'volume tier');
	assert.ok(has('bible-us-first-order', 'promotion_code%5D=promo_1'), 'US first-order coupon');
	assert.ok(has('mixed-us-first-order', 'book_'), 'book sale metadata');
	assert.equal(want['far-band-bulk-refused'].json.error, 'bulk_quote_required');
	assert.ok(has('intl-gb-mixed-handling', 'txcd_92010001'), 'handling line');
	assert.equal(want.empty.json.error, 'empty');
});
