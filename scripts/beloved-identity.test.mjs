// node --test scripts/beloved-identity.test.mjs
// Beloved Identity (Kevin 2026-11-10) sold through the SAME /dvc-checkout as the Bibles: one list price,
// no discount of any kind, no effect on any Bible tier, and a fulfilment email that carries the Ingram ISBN.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { onRequestPost } from '../functions/dvc-checkout.ts';
import { onRequestPost as webhook } from '../functions/print-webhook.ts';
import { LIVE_COUNTRIES } from '../src/lib/shipCountries.ts';
import { handlingFeeCents, marginCheck, netPerItemUsd } from '../src/lib/marginGuard.ts';
import { BELOVED_SKU, BOOK_SKUS, unitAfter } from '../src/lib/order-pricing.ts';

const BI = BELOVED_SKU;
const BIBLE = 'teen-pb'; // a $79.99 paperback Bible
const BIBLE_LIST = 7999;

async function post(body) {
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
			env: { STRIPE_FHB_SECRET_KEY: 'sk_test_x' },
		});
		return { status: res.status, json: await res.json(), s: sessions[0], n: sessions.length };
	} finally {
		globalThis.fetch = realFetch;
	}
}
// the Stripe line item for a SKU's display name
const lines = (s) => {
	const out = [];
	for (let i = 0; s[`line_items[${i}][quantity]`]; i++)
		out.push({
			qty: Number(s[`line_items[${i}][quantity]`]),
			unit: Number(s[`line_items[${i}][price_data][unit_amount]`]),
			name: s[`line_items[${i}][price_data][product_data][name]`],
		});
	return out;
};
const isBi = (l) => /Beloved Identity/.test(l.name);

test('facts: SKU, ISBN and list price are the measured ones', () => {
	assert.equal(BI, 'beloved-identity-pb');
	assert.equal(BOOK_SKUS[BI].isbn, '9798893072396');
	const src = fs.readFileSync(new URL('../functions/dvc-checkout.ts', import.meta.url), 'utf8');
	assert.match(src, /\[BELOVED_SKU\]: \{[^}]*?retail: 999,/s);
});

test('1 copy: $9.99, one line, no discount, no coupon', async () => {
	const r = await post({ counts: { [BI]: 1 }, country: 'US', email: 'new@buyer.org' });
	assert.equal(r.status, 200, JSON.stringify(r.json));
	const l = lines(r.s);
	assert.equal(l.length, 1);
	assert.deepEqual([l[0].qty, l[0].unit], [1, 999]);
	assert.match(l[0].name, /Beloved Identity/);
	assert.equal(r.s['discounts[0][promotion_code]'], undefined, 'no first-order coupon on the book');
	assert.equal(r.s['metadata[pct_off]'], '0');
	assert.equal(r.s['metadata[offer]'], 'none');
	assert.equal(r.s['metadata[total]'], '1');
	assert.equal(r.s['metadata[breakdown]'], `${BI}:1`);
});

test('3 copies: 3 x $9.99 = $29.97, no discount', async () => {
	const r = await post({ counts: { [BI]: 3 }, country: 'US', email: 'new@buyer.org' });
	const l = lines(r.s);
	assert.deepEqual([l[0].qty, l[0].unit, l[0].qty * l[0].unit], [3, 999, 2997]);
	assert.equal(r.s['metadata[pct_off]'], '0');
});

test('does NOT count toward the Bible ladder: 12 copies is still $9.99 each, 0% off', async () => {
	const r = await post({ counts: { [BI]: 12 }, country: 'US' });
	assert.equal(lines(r.s)[0].unit, 999);
	assert.equal(r.s['metadata[pct_off]'], '0');
	assert.equal(r.s['metadata[ladder_total]'], '0');
	assert.equal(r.s['metadata[total]'], '12');
});

test('9 Bibles + 1 Beloved: the book does not push the Bibles to the 10% tier', async () => {
	const r = await post({ counts: { [BIBLE]: 9, [BI]: 1 }, country: 'US' });
	const bible = lines(r.s).find((l) => !isBi(l));
	assert.equal(bible.unit, BIBLE_LIST, 'Bible still at list');
	assert.equal(r.s['metadata[pct_off]'], '0');
	assert.equal(lines(r.s).find(isBi).unit, 999);
});

test('every Bible tier is unchanged by the book being in the cart (and absent)', async () => {
	for (const [n, pct] of [[1, 0], [9, 0], [10, 10], [25, 15], [50, 20], [100, 25], [250, 30]]) {
		const alone = await post({ counts: { [BIBLE]: n }, country: 'US' });
		const withBook = await post({ counts: { [BIBLE]: n, [BI]: 5 }, country: 'US' });
		assert.equal(alone.s['metadata[pct_off]'], String(pct), `${n} Bibles alone`);
		assert.equal(withBook.s['metadata[pct_off]'], String(pct), `${n} Bibles + 5 books`);
		const a = lines(alone.s)[0].unit;
		const b = lines(withBook.s).find((l) => !isBi(l)).unit;
		assert.equal(a, unitAfter(BIBLE_LIST, pct));
		assert.equal(b, a, `${n}: Bible unit identical with the book in the cart`);
		assert.equal(lines(withBook.s).find(isBi).unit, 999, `${n}: book stays $9.99`);
	}
});

test('first-order 15% still applies to a Bible, per unit, and never to the book', async () => {
	const bibleOnly = await post({ counts: { [BIBLE]: 1 }, country: 'US', email: 'new@buyer.org' });
	assert.equal(bibleOnly.s['discounts[0][promotion_code]'], 'promo_1', 'Bible-only cart: unchanged coupon path');
	assert.equal(lines(bibleOnly.s)[0].unit, BIBLE_LIST);
	const mixed = await post({ counts: { [BIBLE]: 1, [BI]: 2 }, country: 'US', email: 'new@buyer.org' });
	assert.equal(mixed.s['discounts[0][promotion_code]'], undefined, 'no order-wide coupon that would discount the book');
	assert.equal(lines(mixed.s).find((l) => !isBi(l)).unit, unitAfter(BIBLE_LIST, 15));
	assert.equal(lines(mixed.s).find(isBi).unit, 999);
	assert.equal(mixed.s['metadata[offer]'], 'first_order');
});

test('empty and bad carts still refused', async () => {
	assert.equal((await post({ counts: {} })).json.error, 'empty');
	assert.equal((await post({ counts: { [BI]: 0 } })).json.error, 'empty');
	assert.equal((await post({ counts: { [BI]: -1 } })).json.error, 'invalid_selection');
});

const NEAR = LIVE_COUNTRIES.find((c) => c.code === 'DE');
const FAR = LIVE_COUNTRIES.find((c) => c.farBand);
test('international: a per-copy fee is sized off the MEASURED book cost', async () => {
	const fee = handlingFeeCents(BI, 999, NEAR);
	assert.ok(fee > 0);
	const r = await post({ counts: { [BI]: 2 }, country: NEAR.code });
	assert.equal(r.status, 200, JSON.stringify(r.json));
	const l = lines(r.s);
	assert.deepEqual([l[0].unit, l[0].qty], [999, 2]);
	assert.deepEqual([l[1].unit, l[1].qty], [fee, 2], 'handling line = fee x copies');
});
test('international: far band 10+ copies is a bulk quote, the book included', async () => {
	assert.equal((await post({ counts: { [BI]: 10 }, country: FAR.code })).json.error, 'bulk_quote_required');
});
test('FAILURE PATH: a country with no measured book cost fails closed, never priced off a Bible cost', () => {
	const row = { ...NEAR, landed_cost_usd: { hc: 40, pb: 30, basis: 'MEASURED' } }; // no `bi`
	const m = marginCheck([{ slug: BI, retail: 999 }], 0, row.code, [row]);
	assert.equal(m.ok, false);
	assert.match(m.reason, /no landed cost for beloved-identity-pb/);
});

test('every live country the page offers has a measured book cost', () => {
	for (const c of LIVE_COUNTRIES) if (c.code !== 'US') assert.ok(c.landed_cost_usd?.bi > 0, c.code);
});

// ── the paid order becomes an Ingram order ──
async function fulfilment(breakdown, country = 'US') {
	const secret = 'whsec_test';
	const event = JSON.stringify({
		type: 'checkout.session.completed',
		data: { object: {
			id: 'cs_test_beloved', amount_total: 2997, currency: 'usd', total_details: { amount_tax: 0 },
			metadata: { kind: 'dvc_print', total: '3', ladder_total: '0', pct_off: '0', offer: 'none', breakdown },
			customer_details: { email: 'reader@example.com', phone: '+15555550123', name: 'Ann Reader' },
			collected_information: { shipping_details: { name: 'Ann Reader', address: { line1: '1 Main St', city: 'Austin', state: 'TX', postal_code: '78701', country } } },
		} },
	});
	const t = Math.floor(Date.now() / 1000);
	const sig = crypto.createHmac('sha256', secret).update(`${t}.${event}`).digest('hex');
	const sent = [];
	const realFetch = globalThis.fetch;
	globalThis.fetch = async (url, init) => {
		if (String(url).includes('mailgun')) { sent.push(Object.fromEntries(init.body)); return new Response('{}', { status: 200 }); }
		return new Response('{}', { status: 200 });
	};
	try {
		const res = await webhook({
			request: new Request('https://x/print-webhook', { method: 'POST', body: event, headers: { 'stripe-signature': `t=${t},v1=${sig}` } }),
			env: { STRIPE_PRINT_WEBHOOK_SECRET: secret, MAILGUN_API_KEY: 'k', PRINT_ORDER_NOTIFY_TO: 'orders@test' },
		});
		return { status: res.status, sent };
	} finally { globalThis.fetch = realFetch; }
}
test('webhook: the fulfilment email carries ISBN, quantity, address, phone and the Ingram print site', async () => {
	const { status, sent } = await fulfilment(`${BI}:3`);
	assert.equal(status, 200);
	const body = sent.find((m) => m.to === 'orders@test').text;
	if (process.env.SHOW_MESSAGE) console.log(`\n----- FULFILMENT EMAIL -----\nSubject: ${sent[0].subject}\n\n${body}`);
	for (const want of ['ISBN 9798893072396 × 3', 'Beloved Identity', '96pp, 5 x 8 in', 'Ann Reader', '1 Main St', 'Austin, TX 78701', '+15555550123', 'Ingram print site for US: US', 'Copies: 3']) assert.ok(body.includes(want), want);
	assert.ok(!body.includes('MISSING'));
	assert.match(sent[0].subject, /3 copies/);
});
test('webhook: a Bible-only order has no Ingram book lines (unchanged)', async () => {
	const { sent } = await fulfilment('teen-pb:1');
	assert.ok(!sent[0].text.includes('Ingram order lines'));
});

// ── OVERSEAS = per-country BREAK-EVEN fee (Kevin 2026-11-10, kevin-decisions L1735 "2 A") ──
const WANT = { GB: 0, AU: 199, SG: 299, NO: 399, CH: 399, BR: 399, CA: 499, MX: 499, JP: 499, DE: 599, FR: 599, IT: 599, ES: 699, NL: 699, IN: 699, PH: 699, ZA: 699, NZ: 699, IE: 899 };
const byCode = (c) => LIVE_COUNTRIES.find((r) => r.code === c);
test('break-even: the 1-copy fee per country is the agreed table', () => {
	assert.deepEqual(Object.keys(WANT).sort(), LIVE_COUNTRIES.filter((c) => c.code !== 'US').map((c) => c.code).sort());
	for (const [c, fee] of Object.entries(WANT)) assert.equal(handlingFeeCents(BI, 999, byCode(c)), fee, c);
});
test('break-even: with the fee every country nets >= $0 and the fee is the smallest x.99 that does', () => {
	for (const c of LIVE_COUNTRIES.filter((r) => r.code !== 'US')) {
		const f = handlingFeeCents(BI, 999, c);
		assert.ok(netPerItemUsd(BI, 999, c, f) >= -1e-9, c.code);
		if (f > 0) assert.ok(netPerItemUsd(BI, 999, c, f - 100) < 0, `${c.code}: one dollar less would lose money`);
		assert.ok(f === 0 || f % 100 === 99, c.code);
	}
});
test('checkout: 1 copy and 3 copies carry the break-even fee per copy', async () => {
	for (const [c, fee] of Object.entries(WANT)) {
		for (const qty of [1, 3]) {
			const r = await post({ counts: { [BI]: qty }, country: c });
			assert.equal(r.status, 200, `${c} ${JSON.stringify(r.json)}`);
			const l = lines(r.s);
			assert.deepEqual([l[0].unit, l[0].qty], [999, qty], c);
			if (fee === 0) assert.equal(l.length, 1, `${c}: no handling line`);
			else assert.deepEqual([l[1].unit, l[1].qty], [fee, qty], `${c} x${qty}`);
		}
	}
});
test('FAILURE PATH: a country with no measured book cost is refused with a message, not priced by the Bible rule', async () => {
	const real = byCode('DE').landed_cost_usd;
	const saved = real.bi;
	delete real.bi;
	try {
		const r = await post({ counts: { [BI]: 1 }, country: 'DE' });
		assert.equal(r.status, 400);
		assert.equal(r.json.error, 'country_not_served');
		assert.match(r.json.message, /book/i);
		assert.equal(r.n, 0, 'no Stripe session');
		assert.equal(handlingFeeCents(BI, 999, byCode('DE')), 0); // never a Bible-rule fee
	} finally { real.bi = saved; }
});
test('Bible pricing and floor are byte-identical: fee/net numbers pinned', () => {
	const pin = { GB: [3701, 2099], DE: [5020, 2999], PH: [6317, 1799] }; // [pb landed cents, expected fee at $79.99 list only if > 0]
	for (const [c, [cents]] of Object.entries(pin)) assert.equal(Math.round(byCode(c).landed_cost_usd.pb * 100), cents);
	for (const c of LIVE_COUNTRIES.filter((r) => r.code !== 'US')) {
		const f = handlingFeeCents(BIBLE, BIBLE_LIST, c);
		const floor = c.farBand ? 10 : 20;
		assert.ok(netPerItemUsd(BIBLE, BIBLE_LIST, c, f) >= floor - 1e-9, c.code);
		assert.ok(f === 0 || netPerItemUsd(BIBLE, BIBLE_LIST, c, f - 100) < floor, `${c.code}: Bible fee still the smallest that meets the floor`);
	}
});
test('Bible-only cart overseas: unchanged (fee from the Bible floor, no book line)', async () => {
	const r = await post({ counts: { [BIBLE]: 2 }, country: 'PH' });
	const l = lines(r.s);
	assert.equal(r.status, 200);
	const fee = handlingFeeCents(BIBLE, unitAfter(BIBLE_LIST, 0), byCode('PH'));
	assert.deepEqual([l[0].qty, l[0].unit], [2, BIBLE_LIST]);
	if (fee > 0) assert.deepEqual([l[1].unit, l[1].qty], [fee, 2]);
	assert.ok(!l.some(isBi));
});
test('mixed cart overseas: the Bible keeps its floor fee, the book its break-even fee', async () => {
	const r = await post({ counts: { [BIBLE]: 1, [BI]: 2 }, country: 'DE' });
	assert.equal(r.status, 200, JSON.stringify(r.json));
	const l = lines(r.s);
	const bibleFee = handlingFeeCents(BIBLE, BIBLE_LIST, byCode('DE'));
	const bookFee = WANT.DE;
	const handling = l.filter((x) => /handling/i.test(x.name));
	assert.ok(handling.some((h) => h.unit === bookFee && h.qty === 2), 'book fee x2');
	if (bibleFee > 0) assert.ok(handling.some((h) => h.unit === bibleFee && h.qty === 1), 'Bible fee x1');
	assert.equal(l.find(isBi).unit, 999);
});
