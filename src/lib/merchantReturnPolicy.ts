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
// UPDATE 2026-11-14 (Kevin "Follow best practice ... don't ask me", item 7 "make the data match /returns"): the
// public /returns page (Kevin 2026-11-09: a satisfaction guarantee, resolved privately, "don't send anything back
// until we have replied") states NO return method, no fee split and no refund type. Google requires markup to
// reflect the page, so those fields are no longer declared: only the 30-day window, countries and the link.
// The 11-08 internal terms above still guide how the team resolves a request; they are just not published here.
//
import { SHIP_CODES } from './shipCountries.ts';

// COUNTRIES come from ONE list. Keep applicableCountry equal to shippingDestination; the list lives in
// src/data/ship-countries.json; add a country THERE and both follow.
export const SHIP_COUNTRIES: readonly string[] = SHIP_CODES;
export const RETURN_DAYS = 30;
export const RETURNS_URL = 'https://fathersheartbible.com/returns/';

// Google: "applicableCountry ... You can specify up to 50 countries" PER MerchantReturnPolicy (GSC 2026-11-14:
// "applicableCountry can be defined at most 50 times"). The terms are the SAME for every country, so the list is
// split into several MerchantReturnPolicy objects of <=50 countries each (ship-countries.json order kept, so
// the first object is the main markets). Coverage stays equal to shippingDestination; nothing is dropped.
export const MAX_RETURN_COUNTRIES = 50;
const countryValue = (list: readonly string[]) => (list.length === 1 ? list[0] : [...list]);
export const returnPolicyFor = (list: readonly string[]) => ({
	'@type': 'MerchantReturnPolicy',
	applicableCountry: countryValue(list),
	returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
	merchantReturnDays: RETURN_DAYS,
	// returnFees (GSC 2026-11-14 'Missing field "returnFees"'; builder hand-off 2026-11-18, Kevin D130 + the /returns
	// promise "don't send anything back until we have replied"): the buyer never pays to return = FreeReturn.
	returnFees: 'https://schema.org/FreeReturn',
	merchantReturnLink: RETURNS_URL,
});
export const returnPolicyChunks = (
	list: readonly string[] = SHIP_COUNTRIES,
	size = MAX_RETURN_COUNTRIES,
) => {
	const out: ReturnType<typeof returnPolicyFor>[] = [];
	for (let i = 0; i < list.length; i += size) out.push(returnPolicyFor(list.slice(i, i + size)));
	return out;
};
const chunks = returnPolicyChunks();
// One object when the list fits, else an array of objects (each <=50 countries).
export const merchantReturnPolicy = chunks.length === 1 ? chunks[0] : chunks;

// shippingDestination for OfferShippingDetails: same country list.
export const shippingDestination = () =>
	SHIP_COUNTRIES.length === 1
		? { '@type': 'DefinedRegion', addressCountry: SHIP_COUNTRIES[0] }
		: SHIP_COUNTRIES.map((c) => ({ '@type': 'DefinedRegion', addressCountry: c }));
