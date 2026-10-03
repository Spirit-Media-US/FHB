// ONE PRICING RULE for every print order form and for the server that charges it
// (functions/dvc-checkout.ts imports this file). Kevin 2026-10-03.
//
// Two discounts exist and they NEVER combine — the buyer gets whichever saves more:
//   · the volume ladder (PRINT_TIERS / dvc-checkout TIERS), counted across the whole basket
//   · 15% off a buyer's FIRST order (Stripe promotion code WELCOME15, auto-applied)
// A tie goes to the volume tier, which needs no first-order check.
//
// The first-order percentage is THIS ONE VALUE. Kevin reviews the offer monthly; changing it
// is a one-line edit here plus the coupon behind WELCOME15 in Stripe (the server refuses to
// apply a code whose coupon disagrees with this number, so the two cannot drift silently).

export const FIRST_ORDER_PCT = 15;
export const FIRST_ORDER_CODE = 'WELCOME15';
export const FIRST_ORDER_LABEL = `${FIRST_ORDER_PCT}% off your first order`;
export const FIRST_ORDER_FINE = 'Can’t be combined with other discounts. Best discount applies.';

export interface Tier {
	min: number;
	pct: number;
}

export const tierPct = (tiers: Tier[], copies: number) =>
	[...tiers].sort((a, b) => b.min - a.min).find((t) => copies >= t.min)?.pct ?? 0;

/** The volume-discounted UNIT in cents — rounded per unit, then multiplied, because Stripe is
 *  charged a per-unit amount. */
export const unitAfter = (cents: number, pct: number) => Math.round((cents * (100 - pct)) / 100);

/** The first-order price of ONE copy, for display beside the list price. */
export const firstOrderUnit = (cents: number) =>
	cents - Math.round((cents * FIRST_ORDER_PCT) / 100);

export interface Quote {
	copies: number;
	subtotal: number;
	bulkPct: number;
	bulkTotal: number;
	firstTotal: number;
	/** which discount the buyer gets if this is their first order */
	best: 'first' | 'bulk' | 'none';
}

/** lines: list-price cents, quantity and ladder weight per SKU. All amounts in cents. */
export function quote(
	lines: { cents: number; qty: number; books?: number }[],
	tiers: Tier[],
): Quote {
	const copies = lines.reduce((s, l) => s + l.qty * (l.books ?? 1), 0);
	const subtotal = lines.reduce((s, l) => s + l.cents * l.qty, 0);
	const bulkPct = tierPct(tiers, copies);
	const bulkTotal = lines.reduce((s, l) => s + unitAfter(l.cents, bulkPct) * l.qty, 0);
	// Stripe applies the percent-off coupon to the order subtotal and rounds the discount once.
	const firstTotal = subtotal - Math.round((subtotal * FIRST_ORDER_PCT) / 100);
	const best =
		copies < 1 ? 'none' : FIRST_ORDER_PCT > bulkPct ? 'first' : bulkPct > 0 ? 'bulk' : 'none';
	return { copies, subtotal, bulkPct, bulkTotal, firstTotal, best };
}
