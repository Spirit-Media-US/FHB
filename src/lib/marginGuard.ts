// MARGIN FLOOR AT CHECKOUT (unit 2jz) + INTERNATIONAL HANDLING (unit 2kj).
//
// Kevin 2026-11-08: "I also do not want us to pay to send people bibles. We need to make a profit
// off each sale not go upside down." and, same day, ruling 1A: ONE worldwide price, the 15%
// first-order discount for EVERYONE, free standard shipping, and a per-COPY "International
// handling" fee per country so that every copy nets at least $20 ($10 in the far band) after the
// discount and Stripe's fee. The fee is SIZED, not guessed:
//
//   net per copy = (paid + fee) - (4.4% x (paid + fee) + $0.30 Stripe) - landed cost - EU duty
//   fee          = smallest x.99 that makes net >= floor; 0 where the floor is already met
//
// `paid` is the unit price actually charged (after the discount that applies), so a repeat buyer
// without the 15% gets the fee computed on the undiscounted price and the floor holds either way.
// The landed cost comes from the ONE country list (src/data/ship-countries.json, `landed_cost_usd`);
// EU countries add the EUR 3 per-item customs duty on books (Council Regulation 2026/382).
// US is outside the guard: it ships free inside the unit price and shows no fee.
//
// The margin check below stays as the BACKSTOP: a discount is dropped for an order whenever the
// order, fee included, would net under the floor, and a destination with no landed cost fails
// closed. The sale is never made below floor.
//
// Pure functions, no I/O: functions/dvc-checkout.ts calls them, scripts/margin-guard.test.mjs
// exercises them (with injected rows, because pending countries are never read by checkout).
import raw from '../data/ship-countries.json' with { type: 'json' };
import { bindingFor, type IntlRow, paidUnit, unitAfter, volumesFor } from './order-pricing.ts';
import { LIVE_COUNTRIES, offerShippingDetails, type ShipCountry } from './shipCountries.ts';

export { bindingFor, volumesFor };

/** Floor for expected net per copy, USD (Kevin 2026-11-08 "1A": $20 minimum profit per book; was $13). Kevin may change it; it is the only place it lives. */
export const MIN_NET_USD = 20.0;
/** Floor in the far band (Africa, Middle East, Asia-Pacific but AU) where freight is dearest (Kevin 2026-11-08, 1A: $10). */
export const MIN_NET_FAR_USD = 10.0;
export const STRIPE_INTL_PCT = 0.044;
export const STRIPE_FIXED_USD = 0.3;

/** EU member states (the EUR 3 per-item customs duty applies to books shipped to them). NO, CH, GB are not. */
export const EU_CODES: readonly string[] = [
	'AT',
	'BE',
	'BG',
	'HR',
	'CY',
	'CZ',
	'DK',
	'EE',
	'FI',
	'FR',
	'DE',
	'GR',
	'HU',
	'IE',
	'IT',
	'LV',
	'LT',
	'LU',
	'MT',
	'NL',
	'PL',
	'PT',
	'RO',
	'SK',
	'SI',
	'ES',
	'SE',
];
/** EU customs duty per item, EUR (Council Regulation 2026/382), converted at the fx the cost table uses. */
export const EU_DUTY_EUR = 3;
const USD_EUR = (raw.landedCost as { fx: { USD_EUR: number } }).fx.USD_EUR;
export const EU_DUTY_USD = EU_DUTY_EUR / USD_EUR;
export const isEu = (code: string): boolean => EU_CODES.includes(code.toUpperCase());

/** Buyer-facing name of the per-copy fee (Kevin 2026-11-08, 2A). */
export const handlingLabel = (code: string): string =>
	isEu(code) ? 'Import & handling' : 'International handling';

/** The net floor for a destination: far band $10, everywhere else $20. */
export const floorFor = (c: Pick<ShipCountry, 'farBand'>): number =>
	c.farBand === true ? MIN_NET_FAR_USD : MIN_NET_USD;

/** Net USD for ONE SKU unit charged at `priceCents` plus `feeCents` handling; null = landed cost unknown. */
export function netPerItemUsd(
	slug: string,
	priceCents: number,
	country: Pick<ShipCountry, 'landed_cost_usd'> & { code?: string },
	feeCents = 0,
): number | null {
	const lc = country.landed_cost_usd;
	if (!lc) return null;
	const v = volumesFor(slug);
	const charged = (priceCents + feeCents) / 100;
	const duty = country.code && isEu(country.code) ? EU_DUTY_USD * v : 0;
	const unitCost = lc[bindingFor(slug)];
	if (unitCost == null) return null; // e.g. Beloved Identity in a country with no measured cost
	return charged - (charged * STRIPE_INTL_PCT + STRIPE_FIXED_USD) - unitCost * v - duty;
}

/**
 * The handling fee in cents for ONE SKU unit of price `paidCents` shipped to `country`: the smallest
 * x.99 that lifts net per copy to the floor; 0 when the price already clears it. US and a country
 * with no landed cost return 0 (the caller fails closed on the latter).
 */
export function handlingFeeCents(
	slug: string,
	paidCents: number,
	country: Pick<ShipCountry, 'landed_cost_usd' | 'farBand'> & { code?: string },
): number {
	if (country.code?.toUpperCase() === 'US' || !country.landed_cost_usd) return 0;
	const noFee = netPerItemUsd(slug, paidCents, country, 0);
	if (noFee == null) return 0; // no cost for this SKU here: the caller refuses the sale (fail closed)
	const short = floorFor(country) - noFee; // USD of net still missing
	if (short <= 1e-9) return 0;
	const needCents = (short / (1 - STRIPE_INTL_PCT)) * 100; // the fee itself is charged Stripe's cut too
	return Math.max(0, Math.ceil((needCents - 99) / 100 - 1e-9)) * 100 + 99;
}

/**
 * The fee table the order forms embed so the fee shows BEFORE checkout. For each live non-US
 * country: feeKey (binding, volumes, paid unit price) -> fee cents, for every SKU price at every
 * discount level a buyer can reach (none, the first-order 15%, each volume tier). Costs stay on
 * the server; only the resulting fee reaches the page.
 */
export function handlingTable(
	skuCents: Record<string, number>,
	pcts: readonly number[],
	rows: readonly ShipCountry[] = LIVE_COUNTRIES,
): Record<string, IntlRow> {
	const out: Record<string, IntlRow> = {};
	for (const c of rows) {
		if (c.code === 'US') continue;
		const fees: Record<string, number> = {};
		for (const [slug, list] of Object.entries(skuCents))
			for (const pct of new Set([0, ...pcts])) {
				const paid = paidUnit(slug, list, pct);
				fees[`${bindingFor(slug)}${volumesFor(slug)}:${paid}`] = handlingFeeCents(slug, paid, c);
			}
		out[c.code] = { name: c.name, label: handlingLabel(c.code), fees };
	}
	return out;
}

export interface MarginResult {
	ok: boolean;
	/** why the discount was refused, for the log; empty when ok */
	reason: string;
	worst: { slug: string; net: number } | null;
}

/**
 * BACKSTOP. Would charging every line at the price after `pct` off, PLUS its handling fee, keep
 * every copy at or above the destination's floor? lines: SKU key, list price in cents.
 * A destination with no landed cost fails closed (no sale below an unknown floor).
 */
export function marginCheck(
	lines: { slug: string; retail: number }[],
	pct: number,
	code: string,
	rows: readonly ShipCountry[] = LIVE_COUNTRIES,
	floor?: number,
): MarginResult {
	if (code.toUpperCase() === 'US') return { ok: true, reason: '', worst: null };
	const c = rows.find((r) => r.code === code.toUpperCase());
	if (!c?.landed_cost_usd) return { ok: false, reason: `no landed cost for ${code}`, worst: null };
	const need = floor ?? floorFor(c);
	let worst: MarginResult['worst'] = null;
	for (const l of lines) {
		const paid = paidUnit(l.slug, l.retail, pct);
		const net = netPerItemUsd(l.slug, paid, c, handlingFeeCents(l.slug, paid, c));
		if (net == null)
			return { ok: false, reason: `no landed cost for ${l.slug} to ${code}`, worst: null };
		if (!worst || net < worst.net) worst = { slug: l.slug, net };
	}
	if (worst && worst.net < need - 1e-9)
		return {
			ok: false,
			reason: `${pct}% off ${worst.slug} to ${code} nets $${worst.net.toFixed(2)} < $${need.toFixed(2)} even with handling`,
			worst,
		};
	return { ok: true, reason: '', worst };
}

/**
 * OfferShippingDetails for ONE offer (a SKU at its list price): per live country, the free standard
 * rate PLUS that country's handling fee at LIST price, so what Google sees equals what checkout
 * charges a buyer without the first-order discount. Zero where list price already clears the floor
 * (all of today's price points). Expedited stays out of structured data. `item` absent = no
 * per-copy fee (an aggregate offer that spans SKUs).
 */
export function shippingDetailsFor(
	item?: { slug: string; listUsd: number },
	countries: readonly ShipCountry[] = LIVE_COUNTRIES,
) {
	const l = countries.map((c) =>
		offerShippingDetails(
			c,
			item ? handlingFeeCents(item.slug, Math.round(item.listUsd * 100), c) : 0,
		),
	);
	return l.length === 1 ? l[0] : l;
}
