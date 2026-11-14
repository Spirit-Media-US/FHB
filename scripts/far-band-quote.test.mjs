// node --test scripts/far-band-quote.test.mjs   (unit 2kx; Kevin 2026-11-09 "request a bulk quote for expensive countries")
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { bulkQuoteRequired, tierPctFor, bulkQuoteMailto, BULK_QUOTE_MIN, BULK_QUOTE_EMAIL } from '../src/lib/farBand.ts';
import { LIVE_COUNTRIES } from '../src/lib/shipCountries.ts';
import { onRequestPost } from '../functions/dvc-checkout.ts';

const FAR = LIVE_COUNTRIES.filter((c) => c.farBand).map((c) => c.code);
const NEAR = LIVE_COUNTRIES.filter((c) => !c.farBand && c.code !== 'US').map((c) => c.code);
const SKU = 'general-regular-plum-pb'; // any EDITIONS slug; resolved below

test('the far band is non-empty and is data-driven', () => {
	assert.ok(FAR.length >= 1 && NEAR.length >= 1);
});

test('rule: far band, 10+ copies required; 9 not; non-far never', () => {
	assert.equal(BULK_QUOTE_MIN, 10);
	assert.equal(bulkQuoteRequired(true, 10), true);
	assert.equal(bulkQuoteRequired(true, 9), false);
	assert.equal(bulkQuoteRequired(false, 10), false);
	assert.equal(bulkQuoteRequired(false, 500), false);
	assert.equal(bulkQuoteRequired(undefined, 500), false);
	assert.equal(tierPctFor(true, 30), 0);
	assert.equal(tierPctFor(false, 30), 30);
});

test('mailto goes to hello@, prefilled with name, email, country, editions, quantity', () => {
	const u = bulkQuoteMailto({ name: 'Ana', email: 'a@b.co', country: 'Japan', editions: [{ title: 'Spanish (Hardback)', qty: 12 }], copies: 12 });
	assert.ok(u.startsWith(`mailto:${BULK_QUOTE_EMAIL}?subject=`));
	const body = decodeURIComponent(u.split('&body=')[1]);
	for (const t of ['Name: Ana', 'Email: a@b.co', 'Country: Japan', 'Total copies: 12', '- 12 x Spanish (Hardback)']) assert.ok(body.includes(t), t);
});

// ── the real handler, with Stripe stubbed ──
const slug = (() => {
	const src = fs.readFileSync(new URL('../src/lib/storeEngine.ts', import.meta.url), 'utf8'); // the catalogue lives in the store engine (3fb)
	return /'([a-z0-9-]+-pb)':\s*\{/.exec(src)?.[1];
})();

async function post(body, { key = 'sk_test_x' } = {}) {
	const sessions = [];
	const realFetch = globalThis.fetch;
	globalThis.fetch = async (url, init) => {
		url = String(url);
		if (url.includes('/checkout/sessions') && init?.method === 'POST') {
			sessions.push(Object.fromEntries(new URLSearchParams(init.body)));
			return new Response(JSON.stringify({ url: 'https://stripe.test/c' }), { status: 200 });
		}
		if (url.includes('promotion_codes')) return new Response(JSON.stringify({ data: [{ id: 'promo_1', coupon: { valid: true, percent_off: 15 } }] }));
		return new Response(JSON.stringify({ data: [] })); // no prior orders: a first order
	};
	try {
		const res = await onRequestPost({
			request: new Request('https://fathersheartbible.com/dvc-checkout', { method: 'POST', body: JSON.stringify(body) }),
			env: key ? { STRIPE_FHB_SECRET_KEY: key } : {},
		});
		return { status: res.status, json: await res.json(), sessions };
	} finally {
		globalThis.fetch = realFetch;
	}
}

test('found a paperback slug to drive the handler', () => assert.ok(slug, 'no -pb slug found'));

test('FAILURE PATH: far band, qty 10 refused server-side, nothing sent to Stripe', async () => {
	for (const country of FAR) {
		const r = await post({ counts: { [slug]: BULK_QUOTE_MIN }, country, email: 'new@buyer.org' });
		assert.equal(r.status, 400, country);
		assert.equal(r.json.error, 'bulk_quote_required', country);
		assert.equal(r.sessions.length, 0, `${country}: no Stripe session`);
	}
});

test('far band qty 10 is refused even with no Stripe key bound (before the key gate)', async () => {
	const r = await post({ counts: { [slug]: 25 }, country: FAR[0] }, { key: '' });
	assert.equal(r.json.error, 'bulk_quote_required');
});

test('far band qty 9: a session is made with the first-order 15% only, no volume tier', async () => {
	const r = await post({ counts: { [slug]: 9 }, country: FAR[0], email: 'new@buyer.org' });
	assert.equal(r.status, 200, JSON.stringify(r.json));
	assert.equal(r.sessions.length, 1);
	const s = r.sessions[0];
	assert.equal(s['metadata[pct_off]'], '15');
	assert.equal(s['metadata[offer]'], 'first_order');
});

test('far band qty 9, repeat/unknown buyer: no discount at all (the ladder never applies)', async () => {
	const r = await post({ counts: { [slug]: 9 }, country: FAR[0] }); // no email -> no first-order offer
	assert.equal(r.status, 200, JSON.stringify(r.json));
	assert.equal(r.sessions[0]['metadata[pct_off]'], '0');
	assert.equal(r.sessions[0]['metadata[offer]'], 'none');
});

test('non-far-band qty 10 is unchanged: sells through checkout with the volume tier', async () => {
	for (const country of [...NEAR.slice(0, 3), 'US']) {
		const r = await post({ counts: { [slug]: 10 }, country });
		assert.equal(r.status, 200, `${country} ${JSON.stringify(r.json)}`);
		assert.equal(r.sessions.length, 1, country);
	}
	const us = await post({ counts: { [slug]: 10 }, country: 'US' });
	assert.equal(us.sessions[0]['metadata[pct_off]'], '10');
});
