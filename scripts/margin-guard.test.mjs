// node --test scripts/margin-guard.test.mjs   (unit 2jz)
// Margin floor: a discount that would push net per copy under MIN_NET_USD is dropped, never the sale.
import test from 'node:test';
import assert from 'node:assert/strict';
import raw from '../src/data/ship-countries.json' with { type: 'json' };
import { MIN_NET_USD, marginCheck, netPerItemUsd, volumesFor } from '../src/lib/marginGuard.ts';

// Pending countries are never read by checkout, so the pure guard is exercised on ALL rows.
const ROWS = [...raw.live, ...raw.pending];
const row = (c) => ROWS.find((r) => r.code === c);
const pb = [{ slug: 'moms-pb', retail: 7999 }];
const hc = [{ slug: 'moms-hb', retail: 9999 }];

test('data: the ten measured countries carry the measured landed USD', () => {
	const want = { GB: [41.91, 37.01], AU: [39.71, 36.32], CA: [47.37, 39.3], ES: [56.38, 47.25], DE: [59.53, 50.2], MX: [62.46, 52.93], IN: [73.34, 63.17], NG: [73.34, 63.17], PH: [73.34, 63.17], AE: [73.34, 63.17] };
	for (const [c, [h, p]] of Object.entries(want)) {
		const l = row(c).landed_cost_usd;
		assert.deepEqual([l.hc, l.pb, l.basis], [h, p, 'MEASURED'], c);
	}
});
test('data: every pending country has landed cost; unmeasured = its zone max', () => {
	const zmax = {};
	for (const r of raw.pending) if (r.landed_cost_usd.basis === 'MEASURED') { const z = (zmax[r.zone] ??= { hc: 0, pb: 0 }); z.hc = Math.max(z.hc, r.landed_cost_usd.hc); z.pb = Math.max(z.pb, r.landed_cost_usd.pb); }
	for (const r of raw.pending) {
		assert.ok(r.landed_cost_usd, r.code);
		if (r.landed_cost_usd.basis === 'ZONE_MAX') assert.deepEqual({ hc: r.landed_cost_usd.hc, pb: r.landed_cost_usd.pb }, zmax[r.zone], r.code);
	}
	assert.deepEqual(raw.landedCost.zoneMax, zmax);
});
test('net formula: price - (4.4% + $0.30) - landed', () => {
	assert.ok(Math.abs(netPerItemUsd('moms-pb', 7999, row('PH')) - (79.99 - (79.99 * 0.044 + 0.3) - 63.17)) < 1e-9);
	assert.equal(volumesFor('lp-set-pb'), 3);
	assert.equal(volumesFor('moms-pb'), 1);
});
test('far-zone paperback with WELCOME15 drops the discount', () => {
	const m = marginCheck(pb, 15, 'PH', ROWS);
	assert.equal(m.ok, false);
	assert.match(m.reason, /nets \$/);
	assert.equal(marginCheck(pb, 0, 'PH', ROWS).ok, true); // full price is never refused
});
test('UK hardcover with WELCOME15 keeps it', () => {
	assert.equal(marginCheck(hc, 15, 'GB', ROWS).ok, true);
});
test('US behaviour unchanged: always ok, any discount', () => {
	for (const pct of [10, 15, 30]) assert.equal(marginCheck(pb, pct, 'US').ok, true);
	assert.equal(marginCheck(pb, 15, 'us', ROWS).ok, true);
});
test('failure path: unknown / cost-less destination fails closed (no discount), never throws', () => {
	assert.equal(marginCheck(pb, 15, 'ZZ', ROWS).ok, false);
	assert.equal(marginCheck(pb, 15, 'GB', [{ code: 'GB' }]).ok, false);
});
test('volume tier is dropped too when it breaks the floor; a set counts three volumes', () => {
	assert.equal(marginCheck(pb, 10, 'PH', ROWS).ok, false);
	assert.equal(marginCheck([{ slug: 'lp-set-pb', retail: 24999 }], 15, 'GB', ROWS).ok, true);
	assert.equal(marginCheck([{ slug: 'lp-set-pb', retail: 24999 }], 30, 'PH', ROWS).ok, false); // 3 x $63.17 landed
});
test('floor constant', () => assert.equal(MIN_NET_USD, 20));

// ---- handler: US WELCOME15 still applied, end to end with Stripe mocked ----
test('dvc-checkout US first order still gets WELCOME15 (unchanged)', async () => {
	let body = '';
	globalThis.fetch = async (url, init) => {
		const u = String(url);
		const j = (o) => new Response(JSON.stringify(o), { status: 200 });
		if (u.includes('promotion_codes')) return j({ data: [{ id: 'promo_1', coupon: { valid: true, percent_off: 15 } }] });
		if (u.includes('checkout/sessions') && init?.method === 'POST') { body = init.body; return j({ url: 'https://stripe.test/x' }); }
		return j({ data: [] });
	};
	const { onRequestPost } = await import('../functions/dvc-checkout.ts');
	const mk = (country) => onRequestPost({ request: new Request('https://x.test/dvc-checkout', { method: 'POST', body: JSON.stringify({ counts: { 'moms-pb': 1 }, email: 'a@b.co', country }) }), env: { STRIPE_FHB_SECRET_KEY: 'sk_test' } });
	const r = await mk('US');
	assert.equal((await r.json()).url, 'https://stripe.test/x');
	assert.match(decodeURIComponent(body), /discounts\[0\]\[promotion_code\]=promo_1/);
	assert.match(decodeURIComponent(body), /adaptive_pricing\[enabled\]=true/); // 3A, unit 2kd
	assert.doesNotMatch(decodeURIComponent(body), /shipping_options\[1\]/); // US: no faster option
	const { SHIP_CODES } = await import('../src/lib/shipCountries.ts');
	if (!SHIP_CODES.includes('PH')) {
		const r2 = await mk('PH'); // pending country: refused outright, never reaches Stripe
		assert.equal(r2.status, 400);
	} else {
		body = '';
		await mk('PH'); // live far-band country (after the wave): WELCOME15 is never applied there
		assert.doesNotMatch(decodeURIComponent(body), /discounts\[0\]/);
	}
});

test('floor $20 (Kevin 1A): WELCOME15 outcomes per binding at list price', () => {
	const hb = [{ slug: 'moms-hb', retail: 9999 }], pbk = [{ slug: 'moms-pb', retail: 7999 }];
	for (const c of ['GB', 'AU', 'CA']) { assert.equal(marginCheck(hb, 15, c, ROWS).ok, true, `${c} hc`); assert.equal(marginCheck(pbk, 15, c, ROWS).ok, true, `${c} pb`); }
	for (const c of ['DE', 'ES', 'MX']) assert.equal(marginCheck(pbk, 15, c, ROWS).ok, false, `${c} pb drops`);
	assert.equal(marginCheck(hb, 15, 'MX', ROWS).ok, false, 'MX hc drops');
	assert.equal(marginCheck(hb, 15, 'DE', ROWS).ok, true);
	assert.equal(marginCheck(hb, 15, 'ES', ROWS).ok, true);
});
