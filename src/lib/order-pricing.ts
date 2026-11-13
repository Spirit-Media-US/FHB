import bookSkus from '../data/book-skus.json' with { type: 'json' };
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

/** Buyer-facing label and disclaimer for the paid faster option (Kevin 2026-11-08). The price itself is
 *  only ever the final amount, in Stripe's option and nowhere on the page; delivery times are estimates. */
export const EXPEDITED_LABEL = 'Expedited delivery';
export const EXPEDITED_DISCLAIMER =
	"Expedited delivery: your order is printed and dispatched sooner, with faster shipping where available. Delivery dates are estimates from our printer and carriers and can't be guaranteed, as delays outside our control can occur.";

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
	/**
	 * true for an international destination: the first-order discount is then taken off each unit
	 * (the server does the same, because Stripe's coupon would also discount the handling line),
	 * so it rounds per unit instead of once on the subtotal.
	 */
	firstPerUnit = false,
	/** false until the buyer's email is known to belong to a first order: never show a total the buyer will not pay (no-drip rule) */
	firstAvailable = true,
): Quote {
	const copies = lines.reduce((s, l) => s + l.qty * (l.books ?? 1), 0);
	const subtotal = lines.reduce((s, l) => s + l.cents * l.qty, 0);
	const bulkPct = tierPct(tiers, copies);
	const bulkTotal = lines.reduce((s, l) => s + unitAfter(l.cents, bulkPct) * l.qty, 0);
	// Stripe applies the percent-off coupon to the order subtotal and rounds the discount once.
	const firstTotal = firstPerUnit
		? lines.reduce((s, l) => s + unitAfter(l.cents, FIRST_ORDER_PCT) * l.qty, 0)
		: subtotal - Math.round((subtotal * FIRST_ORDER_PCT) / 100);
	const best =
		copies < 1
			? 'none'
			: firstAvailable && FIRST_ORDER_PCT > bulkPct
				? 'first'
				: bulkPct > 0
					? 'bulk'
					: 'none';
	return { copies, subtotal, bulkPct, bulkTotal, firstTotal, best };
}

// INTERNATIONAL HANDLING (Kevin 2026-11-08): a per-COPY fee outside the US, sized on the server by
// src/lib/marginGuard.ts so every copy nets the floor after the discount and Stripe's fee. The
// form must show it BEFORE checkout, so the build embeds a small table of the fee in cents (never
// the landed costs behind it) keyed by binding, volumes and the unit price actually paid. Pure
// data and arithmetic here: nothing in this file may import the country list or its costs.

/** Physical copies shipped for one SKU: the Large Print set is three volumes in one box. */
export const volumesFor = (slug: string): number => (slug.includes('-set-') ? 3 : 1);
/** Kevin's own book "Father's Heart - Beloved Identity" (96pp, 5 x 8 in paperback, ISBN 979-8-89307-239-6),
 *  sold through THIS checkout but not a Bible (Kevin 2026-11-10: "point Beloved Identity to FHB too. Build
 *  a checkout page to be fulfilled through ingram"). One list price, NO discount of any kind: it is not on
 *  the volume ladder, does not count toward a Bible tier, and the first-order 15% never touches it. */
export const BELOVED_SKU = 'beloved-identity-pb';
/** Every non-Bible book format sold through THIS checkout (FHB-BOOKS, Kevin 2026-11-13 L1959), read from
 *  src/data/book-skus.json (commerce half of src/data/books.json) so adding a book is data, not code. Per format: plain ISBN-13 and title for the Ingram
 *  order line, the spec to check it against, the net floor overseas (Beloved Identity: break-even, Kevin
 *  2026-11-10 kevin-decisions L1735 "2 A" -> floorUsd 0) and the key of its own measured landed cost in
 *  ship-countries.json (landed_cost_usd.<costKey>). */
export interface BookFormatRow {
	title: string;
	isbn: string;
	spec: string;
	floorUsd: number;
	costKey: string;
	format: string;
	bookSlug: string;
	/** Measured US per-copy print + ship cost (the US has no country-list cost row); null = unmeasured. */
	usCostUsd: number | null;
}
export const BOOK_SKUS: Record<string, BookFormatRow> = Object.fromEntries(
	Object.entries(bookSkus.skus as Record<string, Record<string, unknown>>).map(([sku, f]) => [
		sku,
		{
			title: f.ingram_title as string,
			isbn: f.isbn as string,
			spec: f.spec as string,
			floorUsd: (f.floor_usd as number) ?? 0,
			costKey: f.cost_key as string,
			format: f.format as string,
			bookSlug: f.book as string,
			usCostUsd: (f.us_cost_usd as number) ?? null,
		},
	]),
);
/** Discounts are Bibles-only (Kevin 2026-11-10): every book SKU is charged at list under every offer. */
export const DISCOUNT_EXEMPT: readonly string[] = Object.keys(BOOK_SKUS);
export const isDiscountExempt = (slug: string): boolean => DISCOUNT_EXEMPT.includes(slug);
/** The unit price in cents actually charged for `slug` after the cart's `pct` off: exempt SKUs stay at list. */
export const paidUnit = (slug: string, cents: number, pct: number): number =>
	isDiscountExempt(slug) ? cents : unitAfter(cents, pct);
/** Landed-cost key for a SKU: a book uses its OWN measured cost (books.json landed_key, e.g. 'bi' for Beloved
 *  Identity); a Bible is its binding from the SKU key (<slug>-hb | <slug>-pb). */
export const bindingFor = (slug: string): string =>
	BOOK_SKUS[slug]?.costKey ?? (slug.endsWith('-hb') ? 'hc' : 'pb');
/** Key into IntlRow.fees: the fee depends on binding, volumes in the box and the paid unit price. */
export const feeKey = (slug: string, paidCents: number): string =>
	`${bindingFor(slug)}${volumesFor(slug)}:${paidCents}`;

export interface IntlRow {
	name: string;
	/** "International handling", or "Import & handling" in the EU */
	label: string;
	/** feeKey -> fee in cents PER SKU UNIT (0 = none) */
	fees: Record<string, number>;
}
export interface Handling {
	/** total handling in cents for the whole basket */
	total: number;
	/** per SKU, for the price line: fee in cents per unit */
	perSku: Record<string, number>;
}
/** lines carry the LIST price; `pct` is the discount actually applied to the unit price. */
export function handlingFor(
	lines: { slug: string; cents: number; qty: number }[],
	pct: number,
	row: IntlRow | undefined,
): Handling {
	const perSku: Record<string, number> = {};
	let total = 0;
	if (row)
		for (const l of lines) {
			const fee = row.fees[feeKey(l.slug, unitAfter(l.cents, pct))];
			if (fee == null) throw new Error(`no handling fee for ${l.slug} at ${pct}%`);
			perSku[l.slug] = fee;
			total += fee * l.qty;
		}
	return { total, perSku };
}

// THE ORDER TALLY ON THE STRIPE SESSION ("sku:qty,sku:qty"). Stripe caps EACH metadata value at
// 500 characters, and one key holding the whole order failed every cart of ~35+ SKUs with a 502
// (82 pb SKUs = 1,138 chars, measured 2026-10-30). The tally is split at SKU boundaries across
// `breakdown`, `breakdown_2`, `breakdown_3`…, each under the cap; readers join it back with
// readBreakdown() (a session written before the split reads the same).
export const META_VALUE_MAX = 500;
/** Stripe refuses a Checkout session with more than 100 line items. */
export const MAX_LINE_ITEMS = 100;

export function breakdownKey(i: number): string {
	return i === 0 ? 'breakdown' : `breakdown_${i + 1}`;
}

/** metadata[key] -> value for the non-zero counts, every value at most META_VALUE_MAX chars. */
export function packBreakdown(counts: Record<string, number>): Record<string, string> {
	const chunks: string[] = [];
	let cur = '';
	for (const [k, n] of Object.entries(counts)) {
		if (!(n > 0)) continue;
		const p = `${k}:${n}`;
		if (cur && cur.length + 1 + p.length > META_VALUE_MAX) {
			chunks.push(cur);
			cur = p;
		} else {
			cur = cur ? `${cur},${p}` : p;
		}
	}
	if (cur) chunks.push(cur);
	const out: Record<string, string> = {};
	chunks.forEach((c, i) => {
		out[`metadata[${breakdownKey(i)}]`] = c;
	});
	return out;
}

/** The whole tally from a session's metadata. */
export function readBreakdown(m: Record<string, unknown> | null | undefined): string {
	const out: string[] = [];
	for (let i = 0; m?.[breakdownKey(i)]; i++) out.push(String(m[breakdownKey(i)]));
	return out.join(',');
}
