// ONE shipping-country list (src/data/ship-countries.json) drives checkout, JSON-LD, the Merchant
// feed and the visible "ships to" copy (unit 2js, Kevin 2026-11-08). Imported, never retyped.
// Only `live` rows are exported for output; `pending` is exposed solely for the guard test.
import raw from '../data/ship-countries.json' with { type: 'json' };
import { EXPEDITED_DISCLAIMER } from './order-pricing.ts';

export interface ShipCountry {
	code: string;
	name: string;
	printSite: string;
	shippingRate: { value: string; currency: string };
	handlingDays: [number, number];
	transitDays: [number, number];
	/** Landed Ingram cost per copy (USD, tracked + duty-paid). Absent on US (free shipping baked in). */
	landed_cost_usd?: LandedCost;
	/** True in the farthest shipping band: net floor $10 per copy instead of $20 (Kevin 2026-11-08, 1A). */
	farBand?: boolean;
	/** Optional buyer-paid "Expedited delivery"; absent/null = not offered for this country. */
	fast?: FastOption | null;
}
export interface FastOption {
	label: string;
	/** Full buyer-facing name at checkout; defaults to the label (the disclaimer lives in custom_text, Stripe caps names at 100 chars). */
	displayName?: string;
	/** OUR extra cost per copy, USD (rush print delta + faster tracked duty-paid method delta). */
	extra_usd: number;
	handlingDays: [number, number];
	transitDays: [number, number];
}
export interface LandedCost {
	hc: number;
	pb: number;
	basis: 'MEASURED' | 'ZONE_MAX';
}
export interface PendingCountry {
	status: 'PENDING';
	code: string;
	name: string;
	printSite: string | null;
	shippingRate: null;
	handlingDays?: null;
	transitDays?: null;
	/** Zone for pricing: Europe+UK | Middle East | Americas (non-US) | Asia-Pacific | Africa. */
	zone?: string;
	printSiteBasis?: 'MEASURED' | 'INFERRED';
	/** Measured IngramSpark qty-1 cost at the chosen site (hardcover EN / paperback ES), null = UNMEASURED. */
	ingram_cost_hc?: Record<string, unknown> | null;
	ingram_cost_pb?: Record<string, unknown> | null;
	ingram_cost_status?: 'MEASURED' | 'UNMEASURED';
	landed_cost_usd?: LandedCost;
	far_band?: boolean;
	/** Key into deliveryRoutes: dispatch + transit estimate + optional faster option. */
	route?: string;
	note?: string;
}
export interface DeliveryRoute {
	handlingDays: [number, number];
	transitDays: [number, number];
	fast: FastOption | null;
}

export const PENDING_COUNTRIES = raw.pending as unknown as readonly PendingCountry[];
export const PRINT_SITE_NAMES = raw.printSites as Record<string, string>;
export const DELIVERY_ROUTES = raw.deliveryRoutes as unknown as Record<string, DeliveryRoute>;

/**
 * THE LIVE SWITCH. `liveWave` in ship-countries.json lists the PENDING country codes that are live;
 * adding a code is the whole launch (one-line data change). Everything else (checkout, JSON-LD,
 * Merchant feed, copy) reads LIVE_COUNTRIES, so it follows. Pure and exported so a test can
 * exercise both states. An unknown, duplicate or US code throws: the build fails closed.
 */
export function buildLive(
	live: readonly ShipCountry[],
	pending: readonly PendingCountry[],
	wave: readonly string[],
	routes: Record<string, DeliveryRoute> = DELIVERY_ROUTES,
): ShipCountry[] {
	const out: ShipCountry[] = live.map((c) => ({ ...c, farBand: false, fast: null }));
	for (const code of wave) {
		const p = pending.find((r) => r.code === code);
		if (!p) throw new Error(`liveWave: ${code} is not a pending country`);
		if (out.some((c) => c.code === code))
			throw new Error(`liveWave: ${code} is listed twice or already live`);
		const r = p.route ? routes[p.route] : undefined;
		if (!r || !p.printSite) throw new Error(`liveWave: ${code} has no route/printSite`);
		out.push({
			code: p.code,
			name: p.name,
			printSite: p.printSite,
			shippingRate: { value: '0', currency: 'USD' },
			handlingDays: r.handlingDays,
			transitDays: r.transitDays,
			landed_cost_usd: p.landed_cost_usd,
			farBand: p.far_band === true,
			fast: r.fast,
		});
	}
	return out;
}

export const LIVE_COUNTRIES = buildLive(
	raw.live as unknown as readonly ShipCountry[],
	PENDING_COUNTRIES,
	(raw as { liveWave?: string[] }).liveWave ?? [],
);
export const SHIP_CODES: readonly string[] = LIVE_COUNTRIES.map((c) => c.code);

/** A live row is complete only when every field a checkout/schema/feed needs is present. */
export function validateRow(c: Partial<ShipCountry>): string[] {
	const e: string[] = [];
	if (!/^[A-Z]{2}$/.test(c.code ?? '')) e.push('code must be ISO 3166-1 alpha-2');
	if (!c.name) e.push('name');
	if (!c.printSite || !(c.printSite in PRINT_SITE_NAMES)) e.push('printSite must be US|UK|AU|UAE');
	if (
		!c.shippingRate ||
		!/^\d+(\.\d{1,2})?$/.test(c.shippingRate.value) ||
		!/^[A-Z]{3}$/.test(c.shippingRate.currency)
	)
		e.push('shippingRate {value,currency}');
	for (const k of ['handlingDays', 'transitDays'] as const) {
		const r = c[k];
		if (!Array.isArray(r) || r.length !== 2 || !(r[0] >= 0 && r[1] >= r[0]))
			e.push(`${k} [min,max]`);
	}
	return e;
}

export const countryFor = (code: unknown): ShipCountry | undefined =>
	typeof code === 'string' ? LIVE_COUNTRIES.find((c) => c.code === code.toUpperCase()) : undefined;

const cents = (v: string) => Math.round(Number(v) * 100);

// EXPEDITED DELIVERY PRICE (Kevin 2026-11-08: "pay extra for expedited delivery (1 line item - cost)
// which covers faster print and shipping where available. This should cover our added cost + 10%").
// price = our extra cost x copies x 1.10, grossed up for the Stripe fee on it
// (4.4% + $0.30, the same constants as the margin floor), rounded UP to a .99 price point.
// A flat per-order rate cannot follow the cart, so checkout passes the copy count and the extra
// scales with it: a 20-copy order never has us paying for the rush.
export const FAST_MARKUP = 1.1;
const STRIPE_PCT = 0.044;
const STRIPE_FIXED = 0.3;
export function fastPriceCents(extraUsdPerCopy: number, copies = 1): number {
	const gross =
		(FAST_MARKUP * extraUsdPerCopy * Math.max(1, copies) + STRIPE_FIXED) / (1 - STRIPE_PCT);
	// Smallest n + 0.99 that is >= gross; the epsilon stops float noise bumping an exact .99 a dollar.
	const n = Math.ceil(gross - 0.99 - 1e-9);
	return n * 100 + 99;
}

/**
 * Stripe Checkout form fields for one destination country. Hosted Checkout cannot vary shipping
 * rates by address (dynamic shipping options are embedded-form/Elements only), so the buyer picks
 * the country BEFORE checkout and each Session allows exactly that country with that country's
 * rates: option 0 is FREE standard shipping (the default), option 1, where the country has one,
 * is the buyer-paid "Expedited delivery". Adaptive Pricing is on (3A): one price in local currency.
 * `copies` = physical volumes in the cart, for the faster option's price. Returns null for a
 * country that is not live (pending, unknown, missing).
 */
export function checkoutShippingForm(
	code: unknown,
	copies = 1,
	countries: readonly ShipCountry[] = LIVE_COUNTRIES,
): Record<string, string | number> | null {
	const c =
		typeof code === 'string' ? countries.find((x) => x.code === code.toUpperCase()) : undefined;
	if (!c) return null;
	const opt = (
		i: number,
		name: string,
		amount: number,
		hd: readonly [number, number],
		td: readonly [number, number],
	) => {
		const p = `shipping_options[${i}][shipping_rate_data]`;
		return {
			[`${p}[type]`]: 'fixed_amount',
			[`${p}[fixed_amount][amount]`]: amount,
			[`${p}[fixed_amount][currency]`]: c.shippingRate.currency.toLowerCase(),
			[`${p}[display_name]`]: name,
			[`${p}[tax_behavior]`]: 'exclusive',
			[`${p}[tax_code]`]: 'txcd_92010001',
			[`${p}[delivery_estimate][minimum][unit]`]: 'business_day',
			[`${p}[delivery_estimate][minimum][value]`]: hd[0] + td[0],
			[`${p}[delivery_estimate][maximum][unit]`]: 'business_day',
			[`${p}[delivery_estimate][maximum][value]`]: hd[1] + td[1],
		};
	};
	const free = cents(c.shippingRate.value) === 0;
	return {
		'shipping_address_collection[allowed_countries][0]': c.code,
		// Phone is REQUIRED by Checkout when enabled; E.164 guaranteed except wallet payments.
		'phone_number_collection[enabled]': 'true',
		// 3A: one price in the buyer's local currency (tested compatible: aeo-state/fhb-adaptive-pricing-2ka-20261108.json).
		'adaptive_pricing[enabled]': 'true',
		...opt(
			0,
			free ? (c.code === 'US' ? 'Free shipping' : 'Free standard shipping') : 'Shipping',
			cents(c.shippingRate.value),
			c.handlingDays,
			c.transitDays,
		),
		...(c.fast
			? opt(
					1,
					c.fast.displayName ?? c.fast.label,
					fastPriceCents(c.fast.extra_usd, copies),
					c.fast.handlingDays,
					c.fast.transitDays,
				)
			: {}),
		// Shown above the address form: local format guidance + why we need a phone.
		'custom_text[shipping_address][message]':
			'Enter the address exactly as the local post or courier writes it, and a phone number with country code: international carriers often call to confirm delivery.',
		// The expedited disclaimer, beside the buyer's final click (only where the option exists).
		...(c.fast ? { 'custom_text[submit][message]': EXPEDITED_DISCLAIMER } : {}),
	};
}

const q = (r: readonly [number, number]) => ({
	'@type': 'QuantitativeValue',
	minValue: r[0],
	maxValue: r[1],
	unitCode: 'DAY',
});

/** schema.org OfferShippingDetails for one rate: free standard (default, listed first) or the faster option. */
const detail = (
	c: ShipCountry,
	name: string,
	value: string,
	hd: readonly [number, number],
	td: readonly [number, number],
) => ({
	'@type': 'OfferShippingDetails',
	name,
	shippingRate: { '@type': 'MonetaryAmount', value, currency: c.shippingRate.currency },
	shippingDestination: { '@type': 'DefinedRegion', addressCountry: c.code },
	deliveryTime: {
		'@type': 'ShippingDeliveryTime',
		handlingTime: q(hd),
		transitTime: q(td),
	},
});
/** The default (free standard) detail for one country. */
export const offerShippingDetails = (c: ShipCountry, handlingCents = 0) =>
	detail(
		c,
		'Standard',
		// The per-copy International handling fee at LIST price is part of what Google sees as the
		// shipping rate (Kevin 2026-11-08, PM ruling); unchanged where list price already clears the floor.
		handlingCents > 0
			? ((cents(c.shippingRate.value) + handlingCents) / 100).toFixed(2)
			: c.shippingRate.value,
		c.handlingDays,
		c.transitDays,
	);
/**
 * Every OfferShippingDetails for one country: the free standard rate only. The paid expedited option
 * is a checkout-time choice priced per order; its price (and anything behind it) never goes into the
 * page's structured data (Kevin 2026-11-08).
 */
export const offerShippingDetailsAll = (c: ShipCountry) => [offerShippingDetails(c)];
/** Single object when one detail overall (back-compatible), array otherwise. */
export const shippingDetailsForOffers = (countries: readonly ShipCountry[] = LIVE_COUNTRIES) => {
	const l = countries.flatMap(offerShippingDetailsAll);
	return l.length === 1 ? l[0] : l;
};

/** Visible copy, derived from the live list so it can never claim a country we do not serve. */
export function shipsLine(): string {
	if (LIVE_COUNTRIES.length === 1)
		return `Free shipping across ${LIVE_COUNTRIES[0].name === 'United States' ? 'the United States' : LIVE_COUNTRIES[0].name}.`;
	const sites = [...new Set(LIVE_COUNTRIES.map((c) => PRINT_SITE_NAMES[c.printSite]))];
	const list = sites.length > 1 ? `${sites.slice(0, -1).join(', ')} and ${sites.at(-1)}` : sites[0];
	const fast = LIVE_COUNTRIES.some((c) => c.fast)
		? ' Optional expedited delivery is offered at checkout.'
		: '';
	// Outside the US a per-copy handling fee applies where our cost needs it; say so wherever the
	// shipping promise is made (no drip pricing: the exact fee shows on the order form before checkout).
	const fee = LIVE_COUNTRIES.some((c) => c.code !== 'US')
		? ' Outside the United States any international handling fee for your country is shown on the order form before checkout.'
		: '';
	return `Free standard shipping worldwide from print sites in ${list}.${fee}${fast}`;
}
export const shipsToList = (): string => LIVE_COUNTRIES.map((c) => c.name).join(', ');
/** True when every live country ships free (today: US). Drives "Free shipping" wording. */
export const allFreeShipping = (): boolean =>
	LIVE_COUNTRIES.every((c) => Number(c.shippingRate.value) === 0);
/** Second visible line: the countries, only when there is more than one to list. */
export const shipsToSentence = (): string =>
	LIVE_COUNTRIES.length > 1 ? `Ships to: ${shipsToList()}.` : '';
