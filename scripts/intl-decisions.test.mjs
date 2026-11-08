// node --test scripts/intl-decisions.test.mjs   (unit 2kd, rewritten by 2kj for Kevin 2026-11-08 "1 A 2 A 3 B 4 A")
// 1A: WELCOME15 is offered to EVERYONE (no far-band block; the far band only changes the floor).
// 3A/EXPEDITED: free standard + Adaptive Pricing + ONE optional buyer-paid "Expedited delivery".
// 3B: nineteen markets live through `liveWave`. Everything is exercised in BOTH states: the
// committed one and an injected wave (buildLive), because going live is a one-line data change.
import test from 'node:test';
import assert from 'node:assert/strict';
import raw from '../src/data/ship-countries.json' with { type: 'json' };
import {
	LIVE_COUNTRIES, PENDING_COUNTRIES, DELIVERY_ROUTES, buildLive, checkoutShippingForm,
	fastPriceCents, shippingDetailsForOffers,
} from '../src/lib/shipCountries.ts';
import { marginCheck, MIN_NET_USD, MIN_NET_FAR_USD } from '../src/lib/marginGuard.ts';
import { quote, EXPEDITED_DISCLAIMER } from '../src/lib/order-pricing.ts';
import * as marginGuard from '../src/lib/marginGuard.ts';
import fs from 'node:fs';

const WAVE = ['GB', 'DE', 'FR', 'ES', 'IT', 'IE', 'NL', 'NO', 'CH', 'CA', 'AU', 'NZ', 'MX', 'BR', 'IN', 'PH', 'ZA', 'JP', 'SG'];
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
	for (const no of ['AE', 'SA', 'NG', 'EG']) assert.equal(checkoutShippingForm(no, 1, wave), null, `${no} is not in the wave`);
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

test('EXPEDITED: ONE paid option after the free one, in every live country, with honest estimates', () => {
	for (const c of wave.filter((x) => x.code !== 'US')) {
		const f = checkoutShippingForm(c.code, 1, wave);
		assert.ok(c.fast, `${c.code} has an expedited option`);
		assert.equal(f[key(1, '[type]')], 'fixed_amount', c.code);
		assert.equal(Object.keys(f).filter((k) => /^shipping_options\[2\]/.test(k)).length, 0, 'never a third option');
		assert.equal(f[key(1, '[display_name]')], 'Expedited delivery', c.code);
		assert.equal(f['custom_text[submit][message]'], EXPEDITED_DISCLAIMER, `${c.code} disclaimer at checkout`);
		assert.ok(f[key(1, '[display_name]')].length <= 100, `${c.code} Stripe display_name cap`);
		assert.equal(f[key(1, '[fixed_amount][amount]')], fastPriceCents(c.fast.extra_usd, 1));
		assert.ok(f[key(1, '[delivery_estimate][maximum][value]')] < f[key(0, '[delivery_estimate][maximum][value]')], `${c.code} expedited max < standard max`);
		assert.ok(f[key(1, '[delivery_estimate][minimum][value]')] < f[key(0, '[delivery_estimate][minimum][value]')], `${c.code} expedited min < standard min`);
		// the two old separate options are gone, everywhere in the form
		assert.doesNotMatch(JSON.stringify(f), /Faster delivery|Priority printing/);
	}
	assert.equal(checkoutShippingForm('US', 1, wave)[key(1, '[type]')], undefined, 'US: free shipping only');
	assert.equal(checkoutShippingForm('US', 1, wave)['custom_text[submit][message]'], undefined);
	for (const [id, r] of Object.entries(DELIVERY_ROUTES)) {
		if (id.startsWith('_')) continue;
		assert.match(r.transitBasis, /^ESTIMATE/, `${id}: transit must be labelled an estimate`);
		assert.equal(r.fast.label, 'Expedited delivery', id);
	}
});

test('EXPEDITED: faster tracked shipping where a sane method exists, otherwise faster print only (transit unchanged); no 2-vs-10-day promise', () => {
	const PRINT_ONLY = ['MX', 'BR', 'NZ', 'IN', 'PH', 'ZA', 'JP', 'SG'];
	for (const code of PRINT_ONLY) {
		const c = wave.find((x) => x.code === code);
		assert.equal(c.fast.extra_usd, 9.9, code);
		assert.deepEqual(c.fast.transitDays, c.transitDays, `${code} transit unchanged`);
		assert.equal(fastPriceCents(c.fast.extra_usd, 1), 1199, `${code} $11.99 for one copy`);
	}
	for (const code of ['GB', 'DE', 'FR', 'ES', 'IT', 'IE', 'NL', 'NO', 'CH', 'CA', 'AU']) {
		assert.ok(wave.find((x) => x.code === code).fast.extra_usd > 9.9, `${code} carries a shipping-method delta on top of rush print`);
	}
	for (const c of wave.filter((x) => x.fast)) {
		assert.equal(c.fast.displayName, undefined, `${c.code}: short label only`);
		const f = checkoutShippingForm(c.code, 1, wave);
		assert.doesNotMatch(JSON.stringify(f), /2 days|1-2 business|instead of 5-10|guarantee(?!d)/i);
	}
	assert.match(EXPEDITED_DISCLAIMER, /estimates provided by our printer and carriers and are not guaranteed\.$/);
});

test('JSON-LD carries the free standard rate only: the expedited option and its price stay out of structured data', () => {
	const d = [].concat(shippingDetailsForOffers(wave));
	for (const c of wave) {
		const mine = d.filter((x) => x.shippingDestination.addressCountry === c.code);
		assert.equal(mine.length, 1, c.code);
		assert.equal(mine[0].shippingRate.value, '0');
		assert.equal(mine[0].name, 'Standard');
	}
	// committed state stays a single object, as before
	assert.equal(Array.isArray(shippingDetailsForOffers(live([]))), false);
});

test('EXPEDITED price: our added cost x 1.10 + Stripe fee on it, rounded UP to .99, scales per volume', () => {
	const table = { GB: 1599, DE: 2799, ES: 3399, CA: 1699, AU: 1499, MX: 1199 };
	for (const [code, cents] of Object.entries(table)) {
		const c = wave.find((x) => x.code === code);
		assert.equal(fastPriceCents(c.fast.extra_usd, 1), cents, code);
	}
	for (const c of wave.filter((x) => x.fast)) {
		for (const n of [1, 3, 20]) {
			const p = fastPriceCents(c.fast.extra_usd, n);
			assert.equal(p % 100, 99, 'ends in .99');
			const net = p / 100 - (p / 100 * 0.044 + 0.3);
			assert.ok(net >= 1.1 * c.fast.extra_usd * n - 1e-9, `${c.code} x${n}: net ${net} must cover extra x1.10`);
			assert.ok(p / 100 - 1 < (1.1 * c.fast.extra_usd * n + 0.3) / 0.956 + 1e-9, 'not rounded up by more than one price point');
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

test('1A: WELCOME15 is offered to everyone: no far-band block anywhere in the code', () => {
	for (const f of ['src/lib/marginGuard.ts', 'functions/dvc-checkout.ts', 'src/scripts/order-form.ts', 'src/components/OrderSummary.astro']) {
		const src = fs.readFileSync(f, 'utf8');
		assert.doesNotMatch(src, /welcomeOffered|data-far|dataset\.far|firstOffered/, f);
	}
	assert.ok(!('welcomeOffered' in marginGuard));
});

test('1A: the far band only changes the floor: $10 there, $20 everywhere else', () => {
	assert.equal(MIN_NET_USD, 20);
	assert.equal(MIN_NET_FAR_USD, 10);
	for (const c of wave.filter((x) => x.code !== 'US')) assert.equal(marginGuard.floorFor(c), c.farBand ? 10 : 20, c.code);
});

test('1A: the first-order offer counts everywhere (quote has no per-country switch)', () => {
	const lines = [{ cents: 9999, qty: 1 }];
	assert.equal(quote(lines, [{ min: 5, pct: 10 }]).best, 'first');
	assert.equal(quote(lines, [{ min: 5, pct: 10 }], true).best, 'first');
	assert.equal(quote([{ cents: 9999, qty: 5 }], [{ min: 5, pct: 20 }]).best, 'bulk');
	// per-unit rounding (international) matches what the server charges: unit x qty
	assert.equal(quote([{ cents: 7999, qty: 10 }], [], true).firstTotal, 6799 * 10);
});
