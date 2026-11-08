// ONE schema.org return policy for every PAID Offer the site emits (edition pages incl.
// workExample bindings, /print, GroupBible print offers). Imported, never retyped.
//
// Kevin D130 (2026-10-28): "Our return policy for merchants is on our metadata sheets: Yes,
// return and destory." (sheet line: "Returnable? | Yes and destroy"), and 2026-11-08: "Why does
// anything need to change. If so, we should follow all industry best practices."
// Policy (published at /returns/): 30 days from delivery, full refund to the original payment
// method, the customer does NOT ship the book back (keep or destroy it), free replacement or
// refund for a damaged/misprinted copy, eBooks refunded within 30 days if the file won't open.
//
// WHY THIS SHAPE (Google "Return policy" structured data, checked 2026-11-08):
//  - returnPolicyCategory allowed values: MerchantReturnFiniteReturnWindow | NotPermitted |
//    UnlimitedWindow. "Unspecified" is NOT allowed (why commit 32638f8 was removed in abbb8ec).
//  - FiniteReturnWindow REQUIRES merchantReturnDays.
//  - returnMethod allowed values: ReturnAtKiosk | ReturnByMail | ReturnInStore. KeepProduct is
//    NOT listed, and the docs say nothing about a refund with no return. returnMethod is only
//    RECOMMENDED, so it is OMITTED: a false ReturnByMail would misstate the policy, KeepProduct
//    is invalid. The no-ship-back detail lives on the /returns/ page (merchantReturnLink).
//  - returnFees FreeReturn = "no charge to the consumer to return the product" (true: nothing
//    is shipped back). refundType FullRefund.
//
import { SHIP_CODES } from './shipCountries.ts';

// COUNTRIES come from ONE list. Keep applicableCountry equal to shippingDestination; the list lives in
// src/data/ship-countries.json; add a country THERE and both follow.
export const SHIP_COUNTRIES: readonly string[] = SHIP_CODES;
export const RETURN_DAYS = 30;
export const RETURNS_URL = 'https://fathersheartbible.com/returns/';

const countryValue = (list: readonly string[]) => (list.length === 1 ? list[0] : [...list]);

export const merchantReturnPolicy = {
	'@type': 'MerchantReturnPolicy',
	applicableCountry: countryValue(SHIP_COUNTRIES),
	returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
	merchantReturnDays: RETURN_DAYS,
	returnFees: 'https://schema.org/FreeReturn',
	refundType: 'https://schema.org/FullRefund',
	merchantReturnLink: RETURNS_URL,
};

// shippingDestination for OfferShippingDetails: same country list.
export const shippingDestination = () =>
	SHIP_COUNTRIES.length === 1
		? { '@type': 'DefinedRegion', addressCountry: SHIP_COUNTRIES[0] }
		: SHIP_COUNTRIES.map((c) => ({ '@type': 'DefinedRegion', addressCountry: c }));
