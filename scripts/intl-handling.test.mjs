// node --test scripts/intl-handling.test.mjs   (unit 2kj, Kevin 2026-11-08 "1 A 2 A 3 B 4 A" + expedited)
// INTERNATIONAL HANDLING: a per-COPY fee per country, sized so every copy nets >= $20 ($10 in the
// far band) after the 15% discount and Stripe's 4.4% + $0.30, EU +EUR 3 duty; shown on the form
// BEFORE checkout and as its own Stripe line; US shows none. Plus the 19 live countries and the
// single "Expedited delivery" option. The dist/ checks read the built pages (run after astro build).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import raw from '../src/data/ship-countries.json' with { type: 'json' };
import {
	LIVE_COUNTRIES, PENDING_COUNTRIES, buildLive, checkoutShippingForm, fastPriceCents, shipsLine,
} from '../src/lib/shipCountries.ts';
import {
	EU_CODES, EU_DUTY_EUR, EU_DUTY_USD, MIN_NET_FAR_USD, MIN_NET_USD, floorFor, handlingFeeCents,
	handlingLabel, handlingTable, marginCheck, netPerItemUsd, shippingDetailsFor,
} from '../src/lib/marginGuard.ts';
import { EXPEDITED_DISCLAIMER, FIRST_ORDER_PCT, feeKey, handlingFor, unitAfter } from '../src/lib/order-pricing.ts';
import { PRINT_TIERS } from '../src/data/print-tiers.ts';

const LIVE19 = ['GB', 'DE', 'FR', 'ES', 'IT', 'IE', 'NL', 'NO', 'CH', 'CA', 'AU', 'NZ', 'MX', 'BR', 'IN', 'PH', 'ZA', 'JP', 'SG'];
// AE, SA, NG are NOT live, but their rows are measured/priced: exercised through an injected wave.
const ALL = buildLive(raw.live, PENDING_COUNTRIES, [...LIVE19, 'AE', 'NG']);
const row = (c) => ALL.find((x) => x.code === c);
const HC = 'moms-hb', PB = 'moms-pb';
const HC_FIRST = unitAfter(9999, 15), PB_FIRST = unitAfter(7999, 15);
const usd = (cents) => (cents / 100).toFixed(2);
const feeUsd = (code, slug, paid) => handlingFeeCents(slug, paid, row(code)) / 100;

test('3B: exactly the 19 markets are live (US + the wave), AE SA NG are not', () => {
	assert.equal(LIVE19.length, 19);
	assert.deepEqual(raw.liveWave, LIVE19);
	assert.deepEqual(LIVE_COUNTRIES.map((c) => c.code), ['US', ...LIVE19]);
	for (const no of ['AE', 'SA', 'NG']) assert.ok(!LIVE_COUNTRIES.some((c) => c.code === no), `${no} must not be live`);
	for (const c of LIVE_COUNTRIES.filter((x) => x.code !== 'US')) {
		assert.ok(c.landed_cost_usd, `${c.code} needs landed_cost_usd`);
		assert.ok(c.landed_cost_usd.hc > 0 && c.landed_cost_usd.pb > 0, c.code);
		assert.ok(checkoutShippingForm(c.code, 1), `${c.code} reaches Stripe`);
	}
});

test('3B: zone-inferred landed costs are flagged INFERRED in the data (basis ZONE_MAX)', () => {
	const inferred = LIVE19.filter((c) => row(c).landed_cost_usd.basis === 'ZONE_MAX').sort();
	assert.deepEqual(inferred, ['BR', 'CH', 'FR', 'IE', 'IT', 'JP', 'NL', 'NO', 'NZ', 'SG', 'ZA']);
	const measured = LIVE19.filter((c) => row(c).landed_cost_usd.basis === 'MEASURED').sort();
	assert.deepEqual(measured, ['AU', 'CA', 'DE', 'ES', 'GB', 'IN', 'MX', 'PH']);
});

test('fee per copy by country, discounted first order (HC $84.99, PB $67.99): the PM worked table', () => {
	assert.equal(HC_FIRST, 8499);
	assert.equal(PB_FIRST, 6799);
	const want = {
		GB: [0, 0], AU: [0, 0], CA: [0, 0], ES: [0, 6.99], DE: [2.99, 9.99], MX: [1.99, 8.99],
		IN: [2.99, 8.99], NG: [2.99, 8.99], PH: [2.99, 8.99], AE: [2.99, 8.99],
		// not in the PM's list: computed by the same rule
		FR: [2.99, 9.99], IT: [2.99, 9.99], IE: [2.99, 9.99], NL: [2.99, 9.99], NO: [0, 5.99], CH: [0, 5.99],
		NZ: [2.99, 8.99], BR: [1.99, 8.99], ZA: [2.99, 8.99], JP: [2.99, 8.99], SG: [2.99, 8.99],
	};
	for (const [c, [h, p]] of Object.entries(want)) {
		assert.equal(feeUsd(c, HC, HC_FIRST), h, `${c} hardback`);
		assert.equal(feeUsd(c, PB, PB_FIRST), p, `${c} paperback`);
	}
	assert.equal(handlingFeeCents(HC, HC_FIRST, { code: 'US', landed_cost_usd: { hc: 99, pb: 99 } }), 0, 'US shows no fee');
});

test('fee is exactly .99, is the SMALLEST that holds the floor, and scales per copy', () => {
	for (const c of ALL.filter((x) => x.code !== 'US')) {
		for (const [slug, list] of [[HC, 9999], [PB, 7999], ['lp-set-pb', 24999], ['x-hb', 11499]]) {
			for (const pct of [0, 10, 15, 20, 25, 30]) {
				const paid = unitAfter(list, pct);
				const fee = handlingFeeCents(slug, paid, c);
				const floor = floorFor(c);
				assert.ok(netPerItemUsd(slug, paid, c, fee) >= floor - 1e-9, `${c.code} ${slug} ${pct}% floor`);
				if (fee > 0) {
					assert.equal(fee % 100, 99, 'ends in .99');
					assert.ok(netPerItemUsd(slug, paid, c, fee - 100) < floor, `${c.code} ${slug} ${pct}%: one price point lower would miss the floor`);
				} else assert.ok(netPerItemUsd(slug, paid, c, 0) >= floor - 1e-9, 'fee 0 only where the floor is met');
			}
		}
	}
});

test('floors met for HC and PB, WITH the 15% and WITHOUT it (repeat buyer), every live country', () => {
	for (const c of LIVE_COUNTRIES.filter((x) => x.code !== 'US')) {
		for (const [slug, list] of [[HC, 9999], [PB, 7999]]) {
			for (const paid of [unitAfter(list, 15), list]) {
				const net = netPerItemUsd(slug, paid, c, handlingFeeCents(slug, paid, c));
				assert.ok(net >= (c.farBand ? 10 : 20) - 1e-9, `${c.code} ${slug} paid ${paid}: net ${net.toFixed(2)}`);
			}
		}
		// the same rule through the order-level backstop
		assert.equal(marginCheck([{ slug: HC, retail: 9999 }, { slug: PB, retail: 7999 }], 15, c.code).ok, true, c.code);
		assert.equal(marginCheck([{ slug: HC, retail: 9999 }, { slug: PB, retail: 7999 }], 0, c.code).ok, true, c.code);
	}
	// without the discount the fee is computed on the undiscounted price: smaller, and still floor-safe
	assert.equal(feeUsd('DE', HC, 9999), 0);
	assert.equal(feeUsd('IN', PB, 7999), 0);
	for (const c of LIVE_COUNTRIES.filter((x) => x.code !== 'US')) {
		assert.ok(handlingFeeCents(PB, 7999, c) <= handlingFeeCents(PB, PB_FIRST, c), `${c.code}: fee never rises with the price`);
	}
});

test('floor constants and far-band floor', () => {
	assert.equal(MIN_NET_USD, 20);
	assert.equal(MIN_NET_FAR_USD, 10);
	for (const c of ['IN', 'PH', 'ZA', 'JP', 'SG', 'NZ']) assert.equal(floorFor(row(c)), 10, c);
	for (const c of ['GB', 'DE', 'AU', 'CA', 'MX', 'BR']) assert.equal(floorFor(row(c)), 20, c);
});

test('EU: EUR 3 per-item duty is in the cost, and the label is "Import & handling" only in the EU', () => {
	assert.equal(EU_DUTY_EUR, 3);
	assert.ok(Math.abs(EU_DUTY_USD - 3 / 0.89566) < 1e-9);
	assert.ok(Math.abs(EU_DUTY_USD - 3.35) < 0.01);
	for (const c of ['DE', 'FR', 'ES', 'IT', 'IE', 'NL']) {
		assert.ok(EU_CODES.includes(c));
		assert.equal(handlingLabel(c), 'Import & handling', c);
	}
	for (const c of ['GB', 'NO', 'CH', 'CA', 'AU', 'IN', 'MX', 'JP', 'US']) assert.equal(handlingLabel(c), 'International handling', c);
	// the duty is what raises the EU fee: DE net before the fee is lower by exactly the duty
	const de = row('DE');
	const noDuty = { ...de, code: 'XX' };
	assert.ok(Math.abs(netPerItemUsd(HC, HC_FIRST, noDuty) - netPerItemUsd(HC, HC_FIRST, de) - EU_DUTY_USD) < 1e-9);
	// a set is three items: three duties
	assert.ok(Math.abs(netPerItemUsd('lp-set-pb', 20000, noDuty) - netPerItemUsd('lp-set-pb', 20000, de) - 3 * EU_DUTY_USD) < 1e-9);
});

test('the fee table the forms embed equals the server rule and carries no landed costs', () => {
	// every distinct price point in the catalog (the dist test below checks the real page config)
	const prices = { 'a-hb': 9999, 'a-pb': 7999, 'b-hb': 11499, 'lp-set-hb': 29999, 'lp-set-pb': 24999 };
	const pcts = [FIRST_ORDER_PCT, ...PRINT_TIERS.map((t) => t.pct)];
	const t = handlingTable(prices, pcts, ALL);
	assert.deepEqual(Object.keys(t).sort(), [...LIVE19, 'AE', 'NG'].sort());
	assert.ok(!('US' in t), 'US has no entry: no fee shown');
	for (const [code, r] of Object.entries(t)) {
		assert.equal(r.label, handlingLabel(code));
		assert.ok(Object.keys(r.fees).length > 0 && Object.keys(r.fees).length < 60, `${code} stays small`);
		for (const [slug, list] of Object.entries(prices))
			for (const pct of [0, ...pcts]) {
				const paid = unitAfter(list, pct);
				assert.equal(r.fees[feeKey(slug, paid)], handlingFeeCents(slug, paid, row(code)), `${code} ${slug} ${pct}%`);
			}
	}
	assert.doesNotMatch(JSON.stringify(t), /landed|73\.34|63\.17|59\.53/);
	// the form's arithmetic: total handling scales with quantity
	const lines = [{ slug: HC, cents: 9999, qty: 3 }, { slug: PB, cents: 7999, qty: 2 }];
	const h = handlingFor(lines, 15, t.IN);
	assert.equal(h.total, 299 * 3 + 899 * 2);
	assert.equal(handlingFor(lines, 15, undefined).total, 0, 'US: no row, no fee');
});

// ---- the handler, end to end with Stripe mocked ----
const decode = (b) => new URLSearchParams(b);
async function checkout({ country, counts, email = 'a@b.co', repeat = false }) {
	let body = '';
	globalThis.fetch = async (url, init) => {
		const u = String(url);
		const j = (o) => new Response(JSON.stringify(o), { status: 200 });
		if (u.includes('promotion_codes')) return j({ data: [{ id: 'promo_1', coupon: { valid: true, percent_off: 15 } }] });
		if (u.includes('checkout/sessions') && init?.method === 'POST') { body = init.body; return j({ url: 'https://stripe.test/x' }); }
		if (u.includes('checkout/sessions')) return j({ data: repeat ? [{ payment_status: 'paid' }] : [] });
		return j({ data: [] });
	};
	const { onRequestPost } = await import('../functions/dvc-checkout.ts');
	const res = await onRequestPost({ request: new Request('https://x.test/dvc-checkout', { method: 'POST', body: JSON.stringify({ counts, email, country }) }), env: { STRIPE_FHB_SECRET_KEY: 'sk_test' } });
	const out = { status: res.status, json: await res.json(), form: body ? decode(body) : null };
	return out;
}
const lineItems = (f) => {
	const out = [];
	for (let i = 0; f.get(`line_items[${i}][quantity]`); i++)
		out.push({ qty: Number(f.get(`line_items[${i}][quantity]`)), unit: Number(f.get(`line_items[${i}][price_data][unit_amount]`)), name: f.get(`line_items[${i}][price_data][product_data][name]`), desc: f.get(`line_items[${i}][price_data][product_data][description]`) });
	return out;
};
const feeLines = (f) => lineItems(f).filter((l) => /handling/i.test(l.name));

test('Stripe: the fee is its own line item PER COPY, never discounted, no coupon outside the US', async () => {
	const r = await checkout({ country: 'IN', counts: { 'moms-hb': 3, 'moms-pb': 2 } });
	assert.equal(r.status, 200);
	const lines = lineItems(r.form);
	assert.equal(lines.length, 4);
	assert.deepEqual([lines[0].unit, lines[0].qty], [8499, 3]); // 15% off the unit, first order
	assert.deepEqual([lines[1].unit, lines[1].qty], [6799, 2]);
	const fees = feeLines(r.form);
	assert.equal(fees.length, 2);
	assert.deepEqual(fees.map((x) => [x.name, x.unit, x.qty]).sort(), [['International handling', 299, 3], ['International handling', 899, 2]]);
	assert.match(fees[0].desc, /hardback copy · India/);
	assert.equal(r.form.get('discounts[0][promotion_code]'), null, 'a coupon would discount the fee line too');
	assert.equal(r.form.get('adaptive_pricing[enabled]'), 'true', 'Adaptive Pricing covers every line');
	assert.equal(r.form.get('line_items[2][price_data][currency]'), 'usd');
	assert.equal(r.form.get('shipping_options[0][shipping_rate_data][fixed_amount][amount]'), '0');
	assert.equal(r.form.get('metadata[handling_cents]'), String(299 * 3 + 899 * 2));
	// the order nets the floor, fee included
	const net = [[HC, 8499, 3], [PB, 6799, 2]].reduce((s, [slug, p, n]) => s + n * netPerItemUsd(slug, p, row('IN'), handlingFeeCents(slug, p, row('IN'))), 0);
	assert.ok(net >= 5 * MIN_NET_FAR_USD - 1e-9);
});

test('Stripe: EU label is "Import & handling"; UK, AU, CA and Spain hardback have no fee line', async () => {
	const de = await checkout({ country: 'DE', counts: { 'moms-hb': 1 } });
	assert.deepEqual(feeLines(de.form).map((x) => [x.name, x.unit, x.qty]), [['Import & handling', 299, 1]]);
	const ch = await checkout({ country: 'CH', counts: { 'moms-pb': 1 } });
	assert.deepEqual(feeLines(ch.form).map((x) => [x.name, x.unit]), [['International handling', 599]]);
	for (const [country, counts] of [['GB', { 'moms-hb': 1, 'moms-pb': 1 }], ['AU', { 'moms-pb': 1 }], ['CA', { 'moms-hb': 1 }], ['ES', { 'moms-hb': 1 }]]) {
		const r = await checkout({ country, counts });
		assert.equal(r.status, 200, country);
		assert.equal(feeLines(r.form).length, 0, `${country}: floor already met`);
	}
});

test('Stripe: US shows no fee and keeps WELCOME15 as the coupon (unchanged)', async () => {
	const r = await checkout({ country: 'US', counts: { 'moms-hb': 2 } });
	assert.equal(feeLines(r.form).length, 0);
	assert.equal(r.form.get('discounts[0][promotion_code]'), 'promo_1');
	assert.equal(lineItems(r.form)[0].unit, 9999, 'list price, coupon takes the 15%');
});

test('1A: WELCOME15 is offered in the far band too; a repeat buyer pays list and a fee on the undiscounted price', async () => {
	const first = await checkout({ country: 'PH', counts: { 'moms-pb': 1 } });
	assert.equal(lineItems(first.form)[0].unit, 6799);
	assert.equal(feeLines(first.form)[0].unit, 899);
	const again = await checkout({ country: 'PH', counts: { 'moms-pb': 1 }, repeat: true });
	assert.equal(lineItems(again.form)[0].unit, 7999, 'repeat buyer: no 15%');
	assert.equal(again.form.get('discounts[0][promotion_code]'), null);
	assert.equal(feeLines(again.form).length, 0, 'undiscounted price already clears the $10 floor');
	for (const r of [first, again]) {
		const p = Number(lineItems(r.form)[0].unit), f = feeLines(r.form)[0]?.unit ?? 0;
		assert.ok(netPerItemUsd(PB, p, row('PH'), f) >= 10 - 1e-9);
	}
});

test('backstop: a country with no landed cost is refused, never sold below an unknown floor', () => {
	assert.equal(marginCheck([{ slug: HC, retail: 9999 }], 0, 'DE', [{ code: 'DE' }]).ok, false);
	assert.equal(handlingFeeCents(HC, HC_FIRST, { code: 'DE' }), 0);
	assert.equal(marginCheck([{ slug: HC, retail: 9999 }], 0, 'ZZ', ALL).ok, false);
});

test('Stripe: pending / non-wave countries (AE SA NG) are refused', async () => {
	for (const country of ['AE', 'SA', 'NG', 'ZZ']) {
		const r = await checkout({ country, counts: { 'moms-hb': 1 } });
		assert.equal(r.status, 400, country);
		assert.equal(r.json.error, 'country_not_served');
	}
});

test('EXPEDITED: through the handler, one extra shipping option, scaled per copy, free standard stays the default', async () => {
	const r = await checkout({ country: 'DE', counts: { 'moms-hb': 3 } });
	const p = 'shipping_options';
	assert.equal(r.form.get(`${p}[0][shipping_rate_data][fixed_amount][amount]`), '0');
	assert.equal(r.form.get(`${p}[0][shipping_rate_data][display_name]`), 'Free standard shipping');
	assert.match(r.form.get(`${p}[1][shipping_rate_data][display_name]`), /^Expedited delivery/);
	assert.equal(r.form.get(`${p}[2][shipping_rate_data][display_name]`), null, 'ONE expedited option');
	assert.equal(Number(r.form.get(`${p}[1][shipping_rate_data][fixed_amount][amount]`)), fastPriceCents(row('DE').fast.extra_usd, 3));
	assert.ok(!/Faster delivery|Priority printing/.test(r.form.toString()));
});

test('copy: no "duty paid" promise, the fee is disclosed, never Amazon or Barnes & Noble', () => {
	assert.match(shipsLine(), /handling fee/);
	assert.doesNotMatch(shipsLine(), /duty paid/i);
	for (const f of ['src/lib/shipCountries.ts', 'src/lib/marginGuard.ts', 'src/components/OrderSummary.astro', 'src/scripts/order-form.ts']) {
		assert.doesNotMatch(fs.readFileSync(f, 'utf8').replace(/\/\/.*$|\/\*[\s\S]*?\*\//gm, ''), /amazon|barnes|duty paid/i, f);
	}
});

// ---- built output: the fee is on the page BEFORE checkout ----
const DIST_PAGE = 'dist/bibles/spanish-bible/index.html';
test('dist: edition order block carries the fee table, the per-price fee slots and the fee summary line', () => {
	assert.ok(fs.existsSync(DIST_PAGE), 'dist/ missing: run the build first');
	const h = fs.readFileSync(DIST_PAGE, 'utf8');
	const cfg = JSON.parse(h.match(/data-order="([^"]*)"/)[1].replaceAll('&#34;', '"').replaceAll('&quot;', '"').replaceAll('&#38;', '&').replaceAll('&amp;', '&'));
	assert.deepEqual(Object.keys(cfg.intl).sort(), [...LIVE19].sort());
	assert.equal(cfg.intl.IN.label, 'International handling');
	assert.equal(cfg.intl.DE.label, 'Import & handling');
	assert.match(h, /data-fee-sku="[a-z0-9-]+-pb"[^>]*data-fee-full/);
	assert.match(h, /data-fee-sku="[a-z0-9-]+-hb"/);
	assert.match(h, /data-sum-fee-label/);
	assert.match(h, /data-sum-fee-amt/);
	assert.doesNotMatch(h, /data-far=/);
	for (const f of ['dist/print/order/index.html', 'dist/print/index.html']) {
		const p = fs.readFileSync(f, 'utf8');
		assert.match(p, /data-fee-sku=/, f);
		assert.match(p, /data-sum-fee-amt/, f);
		assert.doesNotMatch(p, /landed_cost|"landed"/, f);
	}
	assert.doesNotMatch(h, /landed_cost|"hc":73|"pb":63/, 'no landed costs on the page');
});

test('dist + jsdom: choosing a country shows "+ $fee international handling (Country)" and the total, before checkout', async (t) => {
	assert.ok(fs.existsSync(DIST_PAGE), 'dist/ missing: run the build first');
	let JSDOM, build;
	try { ({ JSDOM } = await import('jsdom')); ({ build } = await import('esbuild')); } catch { return t.skip('jsdom/esbuild not installed'); }
	const out = await build({ entryPoints: ['src/scripts/order-form.ts'], bundle: true, write: false, format: 'iife', platform: 'browser' });
	const html = fs.readFileSync(DIST_PAGE, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
	const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://fathersheartbible.com/bibles/spanish-bible/' });
	const w = dom.window, d = w.document;
	w.eval(out.outputFiles[0].text);
	const root = d.querySelector('[data-order]');
	const cfg = JSON.parse(root.dataset.order);
	const hb = Object.keys(cfg.prices).find((k) => k.endsWith('-hb')), pb = Object.keys(cfg.prices).find((k) => k.endsWith('-pb'));
	const setQty = (sku, n) => { const el = d.querySelector(`.qty-in[data-slug="${sku}"]`); el.value = String(n); el.dispatchEvent(new w.Event('input', { bubbles: true })); };
	const pick = (code) => { const s = d.querySelector('[data-country]'); s.value = code; s.dispatchEvent(new w.Event('change', { bubbles: true })); };
	const feeEl = (sku) => [...d.querySelectorAll(`[data-fee-sku="${sku}"][data-fee-full]`)][0];
	const txt = (sel) => d.querySelector(sel).textContent;
	const hbList = Math.round(cfg.prices[hb] * 100), pbList = Math.round(cfg.prices[pb] * 100);

	const answers = { value: { first: true } };
	let asked = [];
	w.fetch = async (url, init) => { asked.push(JSON.parse(init.body)); return { json: async () => answers.value }; };
	const email = d.querySelector('[data-email]');
	const typeEmail = async (v) => { email.value = v; email.dispatchEvent(new w.Event('change', { bubbles: true })); await new Promise((r) => setTimeout(r, 20)); };
	const offer = () => d.querySelector('[data-offer-label]');
	const firstHb = unitAfter(hbList, 15);

	pick('US');
	setQty(hb, 2);
	assert.equal(feeEl(hb).hidden, true, 'US shows no fee');
	assert.equal(d.querySelector('[data-sum-fee]').hidden, true);

	// BEFORE an email: list price + fee for the country, and only a promise of the 15%
	pick('IN');
	assert.equal(feeEl(hb).hidden, false);
	assert.equal(feeEl(hb).textContent, `+ $${usd(handlingFeeCents(hb, firstHb, row('IN')))} international handling (India)`, 'price-line fee sits on the first-order price shown beside it');
	assert.equal(d.querySelector('[data-sum-disc]').hidden, true, 'no discount counted before the email is checked');
	assert.equal(offer().textContent, 'First order? 15% off at checkout.');
	assert.equal(asked.length, 0);
	const feeList = handlingFeeCents(hb, hbList, row('IN'));
	assert.equal(txt('[data-sum-total]').replace(/,/g, ''), `$${usd(hbList * 2 + feeList * 2)}`, 'total = list price + fee: never understated');

	// a first-order email: the server (existing check) says yes -> 15% off the unit + the fee sized on it
	await typeEmail('new@buyer.co');
	assert.deepEqual(asked.at(-1), { firstOrderCheck: true, email: 'new@buyer.co' });
	assert.equal(offer().textContent, '15% off your first order');
	assert.equal(d.querySelector('[data-sum-disc]').hidden, false);
	const feeFirst = handlingFeeCents(hb, firstHb, row('IN'));
	assert.equal(feeFirst, 299);
	assert.equal(txt('[data-sum-fee-amt]'), `$${usd(feeFirst * 2)}`, 'per copy x quantity');
	assert.equal(txt('[data-sum-fee-label]'), 'International handling (India)');
	assert.equal(txt('[data-sum-total]').replace(/,/g, ''), `$${usd(firstHb * 2 + feeFirst * 2)}`);

	// editing the email forgets the answer; a repeat buyer sees list price and no offer at all
	email.value = 'x';
	email.dispatchEvent(new w.Event('input', { bubbles: true }));
	assert.equal(offer().textContent, 'First order? 15% off at checkout.');
	answers.value = { first: false };
	await typeEmail('old@buyer.co');
	assert.equal(d.querySelector('[data-offer]').hidden, true, 'repeat buyer: no offer shown');
	assert.equal(d.querySelector('[data-sum-disc]').hidden, true);
	assert.equal(txt('[data-sum-total]').replace(/,/g, ''), `$${usd(hbList * 2 + feeList * 2)}`);

	// a failed check never lowers the total
	w.fetch = async () => { throw new Error('offline'); };
	await typeEmail('again@buyer.co');
	assert.equal(offer().textContent, 'First order? 15% off at checkout.');
	assert.equal(txt('[data-sum-total]').replace(/,/g, ''), `$${usd(hbList * 2 + feeList * 2)}`);

	// EU label, and a country with no fee at all
	answers.value = { first: true };
	w.fetch = async (u, init) => { asked.push(JSON.parse(init.body)); return { json: async () => answers.value }; };
	await typeEmail('new2@buyer.co');
	pick('DE');
	assert.match(feeEl(hb).textContent, /import & handling \(Germany\)$/);
	assert.equal(txt('[data-sum-fee-label]'), 'Import & handling (Germany)');
	pick('GB');
	assert.equal(feeEl(hb).hidden, true, 'GB: floor met, no fee');
	assert.equal(d.querySelector('[data-sum-fee]').hidden, true);
	assert.equal(txt('[data-sum-total]').replace(/,/g, ''), `$${usd(firstHb * 2)}`);
});

test('server: the first-order check answers yes/no from the same rule checkout uses, and creates nothing', async () => {
	const ask = async (email, repeat) => {
		let posted = false;
		globalThis.fetch = async (url, init) => {
			const u = String(url);
			const j = (o) => new Response(JSON.stringify(o), { status: 200 });
			if (u.includes('promotion_codes')) return j({ data: [{ id: 'promo_1', coupon: { valid: true, percent_off: 15 } }] });
			if (u.includes('checkout/sessions') && init?.method === 'POST') { posted = true; return j({ url: 'x' }); }
			if (u.includes('checkout/sessions')) return j({ data: repeat ? [{ payment_status: 'paid' }] : [] });
			return j({ data: [] });
		};
		const { onRequestPost } = await import('../functions/dvc-checkout.ts');
		const r = await onRequestPost({ request: new Request('https://x.test/dvc-checkout', { method: 'POST', body: JSON.stringify({ firstOrderCheck: true, email }) }), env: { STRIPE_FHB_SECRET_KEY: 'sk_test' } });
		return { body: await r.json(), posted, cache: r.headers.get('cache-control') };
	};
	assert.deepEqual((await ask('a@b.co', false)).body, { first: true });
	assert.deepEqual((await ask('a@b.co', true)).body, { first: false });
	assert.deepEqual((await ask('not-an-email', false)).body, { first: false });
	const r = await ask('a@b.co', false);
	assert.equal(r.posted, false, 'no Checkout Session is created');
	assert.equal(r.cache, 'no-store');
});

test('Google sees the handling fee: Standard rate = free rate + the fee at LIST price, same as checkout charges a non-discounted buyer', () => {
	// today every list price clears the floor, so the rate stays 0 ...
	for (const [slug, usdPrice] of [['x-hb', 99.99], ['x-pb', 79.99], ['x-hb', 114.99], ['lp-set-pb', 249.99], ['lp-set-hb', 299.99]]) {
		const d = [].concat(shippingDetailsFor({ slug, listUsd: usdPrice }, ALL.filter((c) => LIVE19.includes(c.code) || c.code === 'US')));
		for (const x of d) {
			const c = row(x.shippingDestination.addressCountry);
			const fee = c.code === 'US' ? 0 : handlingFeeCents(slug, Math.round(usdPrice * 100), c);
			assert.equal(x.shippingRate.value, fee > 0 ? (fee / 100).toFixed(2) : '0', `${c.code} ${slug}`);
		}
	}
	// ... and the same function is what the checkout handler charges at list price
	assert.equal(handlingFeeCents('x-pb', 7999, row('PH')), 0);
	// a cheaper item would carry a fee, and it reaches the rate
	const cheap = [].concat(shippingDetailsFor({ slug: 'x-pb', listUsd: 40 }, ALL));
	const ph = cheap.find((x) => x.shippingDestination.addressCountry === 'PH');
	assert.equal(ph.shippingRate.value, (handlingFeeCents('x-pb', 4000, row('PH')) / 100).toFixed(2));
	assert.ok(Number(ph.shippingRate.value) > 0);
	assert.equal(cheap.find((x) => x.shippingDestination.addressCountry === 'US').shippingRate.value, '0');
	assert.equal(cheap.find((x) => x.shippingDestination.addressCountry === 'GB').shippingRate.value, (handlingFeeCents('x-pb', 4000, row('GB')) / 100).toFixed(2) === '0.00' ? '0' : (handlingFeeCents('x-pb', 4000, row('GB')) / 100).toFixed(2));
	assert.ok(![].concat(cheap).some((x) => /Expedited/i.test(JSON.stringify(x))), 'expedited stays out of structured data');
});

test('/returns covers every country we ship to', () => {
	const src = fs.readFileSync('src/pages/returns.astro', 'utf8');
	assert.doesNotMatch(src, /within the United States/);
	assert.match(src, /shipped to any country we ship to/);
});

// ---- Kevin 2026-11-08: the buyer never sees our cost or the markup behind Expedited delivery ----
const walk = (d, ok, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = `${d}/${e.name}`; e.isDirectory() ? walk(f, ok, out) : ok(e.name) && out.push(f); } return out; };
const COSTS = [...new Set(Object.values(raw.deliveryRoutes).filter((r) => r?.fast).map((r) => r.fast.extra_usd))];
const FORMULA = /extra_usd|FAST_MARKUP|fastPrice|markup|mark-up|cost \+ 10|cost plus|added cost|\+ ?10 ?%|1\.1 ?\*|\* ?1\.1\b/i;

test('dist: no cost, markup or formula for Expedited delivery in any page, bundle or structured data', () => {
	assert.ok(fs.existsSync('dist'), 'dist/ missing: run the build first');
	assert.ok(COSTS.length >= 3 && COSTS.includes(9.9), 'the cost table was read');
	const files = walk('dist', (n) => /\.(html|js|mjs|json|xml|txt)$/.test(n)).filter((f) => !f.startsWith('dist/studio/')); // dist/studio = the Sanity Studio's own vendor code
	assert.ok(files.length > 100);
	for (const f of files) {
		const t = fs.readFileSync(f, 'utf8');
		const pageish = /\.html$/.test(f)
			? [...t.matchAll(/<script[^>]*>([\s\S]*?)<\/script>|data-order="([^"]*)"/g)].map((m) => m[1] ?? m[2]).join('\n')
			: t;
		for (const c of COSTS) assert.ok(!new RegExp(`(?<![\\d.])${String(c).replace('.', '\\.')}(?![\\d])`).test(pageish), `${f} carries the cost figure ${c}`);
		if (/\.html$/.test(f) && !/bibles\/|print\/|returns/.test(f)) continue;
		assert.doesNotMatch(t.replace(/<style[\s\S]*?<\/style>/g, ''), FORMULA, `${f} reveals the formula`);
	}
});

test('client bundle for the order form carries no cost, markup or formula', async () => {
	const { build } = await import('esbuild');
	const out = await build({ entryPoints: ['src/scripts/order-form.ts'], bundle: true, write: false, format: 'iife', platform: 'browser' });
	const js = out.outputFiles[0].text;
	assert.doesNotMatch(js, FORMULA);
	assert.doesNotMatch(js, /ship-countries|landed|deliveryRoutes|fastPriceCents/);
	for (const c of COSTS) assert.ok(!js.includes(String(c)), `bundle carries ${c}`);
});

test('dist: the expedited disclaimer is on the order form and /returns; no "2 days vs 10 days" promise', () => {
	const form = fs.readFileSync(DIST_PAGE, 'utf8');
	const dec = (t) => t.replaceAll('&#39;', "'").replaceAll('&#x27;', "'").replaceAll('&amp;', '&');
	const D = EXPEDITED_DISCLAIMER;
	assert.ok(form.includes('data-expedited-note'));
	assert.ok(dec(form).includes(D), 'disclaimer text beside the option on the order form');
	assert.match(form, /shown when you choose it at checkout/);
	assert.ok(dec(fs.readFileSync('dist/returns/index.html', 'utf8')).includes(D), '/returns carries the disclaimer');
	for (const f of [DIST_PAGE, 'dist/returns/index.html', 'dist/print/order/index.html']) {
		const t = fs.readFileSync(f, 'utf8').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '');
		assert.doesNotMatch(t, /1-2 (business )?days|instead of 5-10|2 days (vs|versus|instead)/i, f);
	}
});
