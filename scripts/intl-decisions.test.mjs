// node --test scripts/intl-decisions.test.mjs   (unit 2kd, Kevin 2026-11-08 "1 A, 2 A, 3 A")
// 2A far-band: no WELCOME15. 3A: free standard + Adaptive Pricing + optional buyer-paid
// "Faster delivery". Everything is exercised in BOTH states: committed (US only) and a launched
// wave (buildLive with an injected liveWave), because going live is a one-line data change.
import test from 'node:test';
import assert from 'node:assert/strict';
import raw from '../src/data/ship-countries.json' with { type: 'json' };
import {
	LIVE_COUNTRIES, PENDING_COUNTRIES, DELIVERY_ROUTES, buildLive, checkoutShippingForm,
	fastPriceCents, shippingDetailsForOffers,
} from '../src/lib/shipCountries.ts';
import { welcomeOffered, marginCheck, MIN_NET_USD } from '../src/lib/marginGuard.ts';
import { quote } from '../src/lib/order-pricing.ts';

const WAVE = ['GB', 'DE', 'ES', 'FR', 'CA', 'MX', 'AU', 'NZ', 'PH', 'IN', 'NG', 'AE'];
const live = (wave) => buildLive(raw.live, PENDING_COUNTRIES, wave);
const wave = live(WAVE);
const P = 'shipping_options';
const key = (i, k) => `${P}[${i}][shipping_rate_data]${k}`;

test('committed state: liveWave is the only switch; with it empty only US is live, no faster option', () => {
	const base = live([]);
	assert.deepEqual(base.map((c) => c.code), ['US']);
	assert.equal(base[0].fast, null);
	const f = checkoutShippingForm('US', 1, base);
	assert.equal(f['adaptive_pricing[enabled]'], 'true');
	assert.equal(f[key(1, '[type]')], undefined, 'US has a single shipping option');
	assert.equal(f[key(0, '[fixed_amount][amount]')], 0);
	assert.equal(checkoutShippingForm('GB', 1, base), null);
	assert.equal(raw.liveWave.every((c) => PENDING_COUNTRIES.some((p) => p.code === c)), true);
	// the live module state matches the data: liveWave countries + US, in order
	assert.deepEqual(LIVE_COUNTRIES.map((c) => c.code), ['US', ...raw.liveWave]);
});

test('liveWave fails closed: unknown, duplicate, US, or unrouted codes throw', () => {
	for (const bad of [['ZZ'], ['GB', 'GB'], ['US']]) assert.throws(() => live(bad), /liveWave/, JSON.stringify(bad));
	assert.throws(() => buildLive(raw.live, [{ code: 'GB', name: 'x', printSite: 'UK', route: 'NOPE' }], ['GB']), /route/);
});

test('launched state: wave countries live, others still refused', () => {
	assert.deepEqual(wave.map((c) => c.code), ['US', ...WAVE]);
	assert.ok(checkoutShippingForm('PH', 1, wave));
	assert.equal(checkoutShippingForm('JP', 1, wave), null, 'JP is not in the wave');
});

test('3A: free standard is option 0 (default) and Adaptive Pricing is on, in every live country', () => {
	for (const c of wave) {
		const f = checkoutShippingForm(c.code, 1, wave);
		assert.equal(f['adaptive_pricing[enabled]'], 'true', c.code);
		assert.equal(f[key(0, '[fixed_amount][amount]')], 0, `${c.code} standard must be free`);
		assert.equal(f[key(0, '[fixed_amount][currency]')], 'usd');
		assert.equal(f[key(0, '[tax_behavior]')], 'exclusive');
		assert.equal(f['phone_number_collection[enabled]'], 'true');
	}
});

test('3A: faster option present exactly where the route has one, after the free one, with honest estimates', () => {
	const withFast = new Set(wave.filter((c) => c.fast).map((c) => c.code));
	assert.deepEqual([...withFast].sort(), [...WAVE].sort(), 'every wave country now has a faster option');
	for (const c of wave) {
		const f = checkoutShippingForm(c.code, 1, wave);
		assert.equal(f[key(1, '[type]')] !== undefined, withFast.has(c.code), c.code);
		assert.equal(Object.keys(f).filter((k) => /^shipping_options\[2\]/.test(k)).length, 0);
		if (!c.fast) continue;
		assert.match(f[key(1, '[display_name]')], c.fast.label === 'Priority printing' ? /^Priority printing/ : /^Faster delivery/);
		assert.equal(f[key(1, '[fixed_amount][amount]')], fastPriceCents(c.fast.extra_usd, 1));
		// dispatch 1-2 vs 5-10 business days, transit added on top, and faster must really be faster
		assert.ok(f[key(1, '[delivery_estimate][maximum][value]')] < f[key(0, '[delivery_estimate][maximum][value]')], `${c.code} fast max < standard max`);
		assert.ok(f[key(1, '[delivery_estimate][minimum][value]')] < f[key(0, '[delivery_estimate][minimum][value]')], `${c.code} fast min < standard min`);
	}
	for (const [id, r] of Object.entries(DELIVERY_ROUTES)) {
		if (id.startsWith('_')) continue;
		assert.match(r.transitBasis, /^ESTIMATE/, `${id}: transit must be labelled an estimate`);
	}
});

test('3A: JSON-LD carries both options per country, the free one first', () => {
	const d = [].concat(shippingDetailsForOffers(wave));
	for (const c of wave) {
		const mine = d.filter((x) => x.shippingDestination.addressCountry === c.code);
		assert.equal(mine.length, c.fast ? 2 : 1, c.code);
		assert.equal(mine[0].shippingRate.value, '0');
		assert.equal(mine[0].name, 'Standard');
		if (c.fast) {
			assert.equal(mine[1].name, c.fast.label);
			assert.equal(mine[1].shippingRate.value, (fastPriceCents(c.fast.extra_usd, 1) / 100).toFixed(2));
			assert.deepEqual([mine[1].deliveryTime.handlingTime.minValue, mine[1].deliveryTime.handlingTime.maxValue], c.fast.handlingDays);
		}
	}
	// committed state stays a single object, as before
	assert.equal(Array.isArray(shippingDetailsForOffers(live([]))), false);
});

test('priority printing (rush print only): MX, other Americas and far band; honest label; transit unchanged', () => {
	const PRINT_ONLY = ['MX', 'PH', 'IN', 'NG', 'AE'];
	const w = live([...WAVE, 'BR', 'EG', 'ZA']); // NZ already in WAVE
	const want = 'Priority printing \u2014 ships in 1-2 business days instead of 5-10; delivery time otherwise the same.';
	for (const code of [...PRINT_ONLY, 'NZ', 'BR', 'EG', 'ZA']) {
		const c = w.find((x) => x.code === code);
		assert.equal(c.fast.label, 'Priority printing', code);
		assert.equal(c.fast.extra_usd, 9.9);
		const f = checkoutShippingForm(code, 1, w);
		assert.equal(f[key(1, '[display_name]')], want);
		assert.ok(f[key(1, '[display_name]')].length <= 100, 'Stripe display_name cap');
		assert.equal(f[key(1, '[fixed_amount][amount]')], 1299, `${code} $12.99 for one copy`);
		// transit identical, dispatch 1-2 vs 5-10
		assert.deepEqual(c.fast.transitDays, c.transitDays, `${code} transit unchanged`);
		assert.deepEqual(c.fast.handlingDays, [1, 2]);
		assert.deepEqual(c.handlingDays, [5, 10]);
	}
	assert.ok(fastPriceCents(9.9, 3) > 1299, 'scales per volume');
	// routes with a real faster shipping method keep the Faster delivery label
	for (const code of ['GB', 'DE', 'ES', 'CA', 'AU', 'FR']) assert.equal(wave.find((x) => x.code === code).fast.label, 'Faster delivery', code);
});

test('faster price: extra x 1.15 + Stripe fee, rounded UP to .99, scales with copies; fixed table', () => {
	const table = { GB: 1699, DE: 2899, ES: 3499, CA: 1799, AU: 1599 };
	for (const [code, cents] of Object.entries(table)) {
		const c = wave.find((x) => x.code === code);
		assert.equal(fastPriceCents(c.fast.extra_usd, 1), cents, code);
	}
	for (const c of wave.filter((x) => x.fast)) {
		for (const n of [1, 3, 20]) {
			const p = fastPriceCents(c.fast.extra_usd, n);
			assert.equal(p % 100, 99, 'ends in .99');
			const net = p / 100 - (p / 100 * 0.044 + 0.3);
			assert.ok(net >= 1.15 * c.fast.extra_usd * n - 1e-9, `${c.code} x${n}: net ${net} must cover extra x1.15`);
			assert.ok(p / 100 - 1 < (1.15 * c.fast.extra_usd * n + 0.3) / 0.956 + 1e-9, 'not rounded up by more than one price point');
		}
		assert.ok(fastPriceCents(c.fast.extra_usd, 3) > fastPriceCents(c.fast.extra_usd, 1));
	}
	assert.equal(fastPriceCents(0, 1), 99, 'no cost: smallest .99');
});

test('2A: far-band flag follows the zone rule for every pending country', () => {
	for (const r of PENDING_COUNTRIES) {
		const far = r.zone === 'Africa' || r.zone === 'Middle East' || (r.zone === 'Asia-Pacific' && r.code !== 'AU');
		assert.equal(r.far_band, far, r.code);
	}
	for (const c of ['PH', 'IN', 'NG', 'AE', 'JP', 'NZ', 'EG', 'ZA']) assert.equal(PENDING_COUNTRIES.find((r) => r.code === c).far_band, true, c);
	for (const c of ['AU', 'GB', 'DE', 'MX', 'CA', 'BR']) assert.equal(PENDING_COUNTRIES.find((r) => r.code === c).far_band, false, c);
});

test('2A: WELCOME15 is never offered in the far band, offered elsewhere; US unchanged', () => {
	for (const c of ['PH', 'IN', 'NG', 'AE', 'NZ']) assert.equal(welcomeOffered(c, wave), false, c);
	for (const c of ['GB', 'DE', 'ES', 'CA', 'MX', 'AU', 'US', 'us']) assert.equal(welcomeOffered(c, wave), true, c);
	assert.equal(welcomeOffered('JP', wave), false, 'not live: never offered');
	assert.equal(welcomeOffered('ZZ', wave), false);
	// explicit rule, not just the margin check: a far-band row that WOULD pass the floor is still refused
	const rich = wave.map((c) => (c.code === 'PH' ? { ...c, landed_cost_usd: { hc: 5, pb: 5, basis: 'MEASURED' } } : c));
	assert.equal(marginCheck([{ slug: 'moms-hb', retail: 9999 }], 15, 'PH', rich).ok, true, 'margin alone would allow it');
	assert.equal(welcomeOffered('PH', rich), false, 'zone flag still refuses');
});

test('2A: every sale clears the $20 floor where WELCOME15 is offered (hardcover and paperback, all measured wave rows)', () => {
	for (const c of wave.filter((x) => x.code !== 'US' && welcomeOffered(x.code, wave))) {
		for (const l of [{ slug: 'moms-hb', retail: 9999 }, { slug: 'moms-pb', retail: 7999 }]) {
			const m = marginCheck([l], 15, c.code, wave);
			// either the guard drops the discount (not offered) or net >= floor
			if (m.ok) assert.ok(m.worst.net >= MIN_NET_USD, `${c.code} ${l.slug}`);
		}
	}
});

test('2A: the first-order offer is neither counted nor shown when firstOffered=false', () => {
	const lines = [{ cents: 9999, qty: 1 }];
	assert.equal(quote(lines, [{ min: 5, pct: 10 }]).best, 'first');
	const q = quote(lines, [{ min: 5, pct: 10 }], false);
	assert.equal(q.best, 'none');
	assert.equal(quote([{ cents: 9999, qty: 5 }], [{ min: 5, pct: 10 }], false).best, 'bulk');
});
