// MARGIN FLOOR AT CHECKOUT (unit 2jz, Kevin 2026-11-08: "I also do not want us to pay to send
// people bibles. We need to make a profit off each sale not go upside down.").
//
// A discount (WELCOME15 first order, or a volume tier) is DROPPED for an order when it would
// push the expected net per copy below MIN_NET_USD. The sale itself is never blocked.
//
//   net per copy = charged price - (4.4% x price + $0.30 Stripe international) - landed cost
//
// The landed cost comes from the ONE country list (src/data/ship-countries.json, `live` rows
// only, `landed_cost_usd`). US is outside the guard: it ships free inside the unit price and its
// behaviour is unchanged. A live non-US country with no landed cost fails closed (no discount).
//
// Pure functions, no I/O: functions/dvc-checkout.ts calls them, scripts/margin-guard.test.mjs
// exercises them (with injected rows, because pending countries are never read by checkout).
import { LIVE_COUNTRIES, type ShipCountry } from './shipCountries.ts';

/** Floor for expected net per copy, USD. Kevin may change it; it is the only place it lives. */
export const MIN_NET_USD = 13.0;
export const STRIPE_INTL_PCT = 0.044;
export const STRIPE_FIXED_USD = 0.3;

/** Physical copies shipped for one SKU: the Large Print set is three volumes in one box. */
export const volumesFor = (slug: string): number => (slug.includes('-set-') ? 3 : 1);
/** Binding from the SKU key (<slug>-hb | <slug>-pb). */
export const bindingFor = (slug: string): 'hc' | 'pb' => (slug.endsWith('-hb') ? 'hc' : 'pb');

/** Net USD for ONE SKU unit charged at `priceCents`; null = landed cost unknown. */
export function netPerItemUsd(
	slug: string,
	priceCents: number,
	country: Pick<ShipCountry, 'landed_cost_usd'>,
): number | null {
	const lc = country.landed_cost_usd;
	if (!lc) return null;
	const price = priceCents / 100;
	const landed = lc[bindingFor(slug)] * volumesFor(slug);
	return price - (price * STRIPE_INTL_PCT + STRIPE_FIXED_USD) - landed;
}

export interface MarginResult {
	ok: boolean;
	/** why the discount was refused, for the log; empty when ok */
	reason: string;
	worst: { slug: string; net: number } | null;
}

/**
 * Would charging every line at `unitCents(retail)` keep every copy at or above `floor`?
 * lines: SKU key, list price in cents. `unitCents` maps a list price to the price actually
 * paid (volume tier rounds per unit; the coupon takes a percent off).
 */
export function marginCheck(
	lines: { slug: string; retail: number }[],
	pct: number,
	code: string,
	rows: readonly ShipCountry[] = LIVE_COUNTRIES,
	floor = MIN_NET_USD,
): MarginResult {
	if (pct <= 0 || code.toUpperCase() === 'US') return { ok: true, reason: '', worst: null };
	const c = rows.find((r) => r.code === code.toUpperCase());
	if (!c?.landed_cost_usd) return { ok: false, reason: `no landed cost for ${code}`, worst: null };
	let worst: MarginResult['worst'] = null;
	for (const l of lines) {
		const paid = Math.round((l.retail * (100 - pct)) / 100);
		const net = netPerItemUsd(l.slug, paid, c) as number;
		if (!worst || net < worst.net) worst = { slug: l.slug, net };
	}
	if (worst && worst.net < floor)
		return {
			ok: false,
			reason: `${pct}% off ${worst.slug} to ${code} nets $${worst.net.toFixed(2)} < $${floor.toFixed(2)}`,
			worst,
		};
	return { ok: true, reason: '', worst };
}
