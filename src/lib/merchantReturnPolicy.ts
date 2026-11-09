// ONE schema.org return policy for every PAID Offer the site emits (edition pages incl.
// workExample bindings, /print, GroupBible print offers). Imported, never retyped.
//
// Kevin ruling 2026-11-08 ~21:4xZ, decision 1A ("1 A"): "30 days, full refund, keep or destroy the
// copy for damaged, misprinted or lost books; change-of-mind returns sent back unread, refunded on
// arrival." (Earlier D130 2026-10-28 "return and destroy" is superseded for change-of-mind.)
// Policy (published at /returns/): 30 days from delivery; damaged/misprinted/lost = full refund or
// free replacement, keep or destroy the copy; change of mind = book sent back unread at the buyer's
// cost, full refund on arrival; eBooks refunded within 30 days if the file won't open.
//
// WHY THIS SHAPE (Google "Return policy" structured data, re-read 2026-11-08):
//  - returnPolicyCategory: MerchantReturnFiniteReturnWindow REQUIRES merchantReturnDays. "Unspecified"
//    is NOT allowed.
//  - returnMethod allowed: ReturnAtKiosk | ReturnByMail | ReturnInStore. ReturnByMail is now true
//    (change-of-mind books are mailed back). KeepProduct is NOT allowed.
//  - returnFees values: FreeReturn | ReturnFeesCustomerResponsibility | ReturnShippingFees.
//    Top-level returnFees = ReturnFeesCustomerResponsibility (change of mind, buyer's cost).
//  - The docs list customerRemorseReturnFees and itemDefectReturnFees ("a specific type of return
//    fee if returned due to customer remorse / for defect products"), so the defect case is
//    declared FreeReturn separately. refundType FullRefund.
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
	returnMethod: 'https://schema.org/ReturnByMail',
	returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
	customerRemorseReturnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
	itemDefectReturnFees: 'https://schema.org/FreeReturn',
	refundType: 'https://schema.org/FullRefund',
	merchantReturnLink: RETURNS_URL,
};

// shippingDestination for OfferShippingDetails: same country list.
export const shippingDestination = () =>
	SHIP_COUNTRIES.length === 1
		? { '@type': 'DefinedRegion', addressCountry: SHIP_COUNTRIES[0] }
		: SHIP_COUNTRIES.map((c) => ({ '@type': 'DefinedRegion', addressCountry: c }));
