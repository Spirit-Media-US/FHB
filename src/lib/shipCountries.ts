// ONE shipping-country list (src/data/ship-countries.json) drives checkout, JSON-LD, the Merchant
// feed and the visible "ships to" copy (unit 2js, Kevin 2026-11-08). Imported, never retyped.
// Only `live` rows are exported for output; `pending` is exposed solely for the guard test.
import raw from '../data/ship-countries.json' with { type: 'json' };

export interface ShipCountry {
	code: string;
	name: string;
	printSite: string;
	shippingRate: { value: string; currency: string };
	handlingDays: [number, number];
	transitDays: [number, number];
}
export interface PendingCountry {
	status: 'PENDING';
	code: string;
	name: string;
	printSite: string | null;
	shippingRate: null;
	note?: string;
}

export const LIVE_COUNTRIES = raw.live as unknown as readonly ShipCountry[];
export const PENDING_COUNTRIES = raw.pending as unknown as readonly PendingCountry[];
export const PRINT_SITE_NAMES = raw.printSites as Record<string, string>;
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

/**
 * Stripe Checkout form fields for one destination country. Hosted Checkout cannot vary shipping
 * rates by address (dynamic shipping options are embedded-form/Elements only), so the buyer picks
 * the country BEFORE checkout and each Session allows exactly that country with that country's
 * rate. Returns null for a country that is not live (pending, unknown, missing).
 */
export function checkoutShippingForm(code: unknown): Record<string, string | number> | null {
	const c = countryFor(code);
	if (!c) return null;
	const p = 'shipping_options[0][shipping_rate_data]';
	return {
		'shipping_address_collection[allowed_countries][0]': c.code,
		// Phone is REQUIRED by Checkout when enabled; E.164 guaranteed except wallet payments.
		'phone_number_collection[enabled]': 'true',
		[`${p}[type]`]: 'fixed_amount',
		[`${p}[fixed_amount][amount]`]: cents(c.shippingRate.value),
		[`${p}[fixed_amount][currency]`]: c.shippingRate.currency.toLowerCase(),
		[`${p}[display_name]`]: cents(c.shippingRate.value) === 0 ? 'Free shipping' : 'Shipping',
		[`${p}[tax_behavior]`]: 'exclusive',
		[`${p}[tax_code]`]: 'txcd_92010001',
		[`${p}[delivery_estimate][minimum][unit]`]: 'business_day',
		[`${p}[delivery_estimate][minimum][value]`]: c.handlingDays[0] + c.transitDays[0],
		[`${p}[delivery_estimate][maximum][unit]`]: 'business_day',
		[`${p}[delivery_estimate][maximum][value]`]: c.handlingDays[1] + c.transitDays[1],
		// Shown above the address form: local format guidance + why we need a phone.
		'custom_text[shipping_address][message]':
			'Enter the address exactly as the local post or courier writes it, and a phone number with country code: international carriers often call to confirm delivery.',
	};
}

const q = (r: readonly [number, number]) => ({
	'@type': 'QuantitativeValue',
	minValue: r[0],
	maxValue: r[1],
	unitCode: 'DAY',
});

/** schema.org OfferShippingDetails, one per live country. */
export const offerShippingDetails = (c: ShipCountry) => ({
	'@type': 'OfferShippingDetails',
	shippingRate: {
		'@type': 'MonetaryAmount',
		value: c.shippingRate.value,
		currency: c.shippingRate.currency,
	},
	shippingDestination: { '@type': 'DefinedRegion', addressCountry: c.code },
	deliveryTime: {
		'@type': 'ShippingDeliveryTime',
		handlingTime: q(c.handlingDays),
		transitTime: q(c.transitDays),
	},
});
/** Single object when one country (back-compatible), array when several. */
export const shippingDetailsForOffers = () => {
	const l = LIVE_COUNTRIES.map(offerShippingDetails);
	return l.length === 1 ? l[0] : l;
};

/** Visible copy, derived from the live list so it can never claim a country we do not serve. */
export function shipsLine(): string {
	if (LIVE_COUNTRIES.length === 1)
		return `Free shipping across ${LIVE_COUNTRIES[0].name === 'United States' ? 'the United States' : LIVE_COUNTRIES[0].name}.`;
	const sites = [...new Set(LIVE_COUNTRIES.map((c) => PRINT_SITE_NAMES[c.printSite]))];
	const list = sites.length > 1 ? `${sites.slice(0, -1).join(', ')} and ${sites.at(-1)}` : sites[0];
	return `Ships worldwide from print sites in ${list}.`;
}
export const shipsToList = (): string => LIVE_COUNTRIES.map((c) => c.name).join(', ');
/** True when every live country ships free (today: US). Drives "Free shipping" wording. */
export const allFreeShipping = (): boolean =>
	LIVE_COUNTRIES.every((c) => Number(c.shippingRate.value) === 0);
/** Second visible line: the countries, only when there is more than one to list. */
export const shipsToSentence = (): string =>
	LIVE_COUNTRIES.length > 1 ? `Ships to: ${shipsToList()}.` : '';
