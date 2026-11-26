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
import {
	BOOK_SKUS,
	bindingFor,
	FIRST_ORDER_PCT,
	feeKey,
	type IntlRow,
	isHardbackRow,
	paidUnit,
	unitAfter,
	volumesFor,
} from './order-pricing.ts';
import {
	type Forwarder,
	LIVE_COUNTRIES,
	offerShippingDetails,
	type ShipCountry,
} from './shipCountries.ts';

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

/**
 * FORWARDER ROUTE (Ukraine / Nova Poshta, Kevin 2026-11-25; a SHIP-TO COUNTRY rule, Kevin 2026-11-26 L3025): the route
 * when `slug` rides it to `c`, else null. The route's `scope` is the one product setting: 'all' = every physical SKU
 * (books + Bibles), 'bibles' = every SKU that is not a book (BOOK_SKUS); outside the scope a SKU keeps the country's costs.
 */
export const forwarderFor = (
	slug: string,
	c: { forwarder?: Forwarder } | undefined,
): Forwarder | null => {
	const fw = c?.forwarder;
	if (!fw) return null;
	if (fw.scope === 'all') return fw;
	return fw.scope === 'bibles' && !BOOK_SKUS[slug] ? fw : null;
};

/**
 * Landed USD for one copy of `slug` sent to the forwarder: its MEASURED row in `landed_usd`; else, for a book, the
 * per-book model (Ingram print at the route's print site + the route's ship_usd) x (1 + sales tax); else null (refused).
 */
export function forwarderLandedUsd(slug: string, fw: Forwarder): number | null {
	const own = fw.landed_usd[slug];
	if (typeof own === 'number') return own;
	if (!BOOK_SKUS[slug]) return null;
	const print = modelPrintUsd(slug, fw.printSite);
	return print == null ? null : round2((print + fw.ship_usd) * (1 + fw.sales_tax_rate));
}

/** The net floor for one SKU in a destination: the country's floor, except a book with its own (Beloved Identity: break-even)
 *  and a forwarder-route SKU (a book's own floor, else the route's floor, AFTER the per-order credit). */
export const floorForSku = (
	slug: string,
	c: Pick<ShipCountry, 'farBand'> & { forwarder?: Forwarder },
): number => {
	const fw = forwarderFor(slug, c);
	if (fw) return BOOK_SKUS[slug]?.floorUsd ?? fw.floor_usd;
	return BOOK_SKUS[slug]?.floorUsd ?? floorFor(c);
};

// PER-BOOK COST MODEL (Kevin 2026-11-24: "This needs to get fixed NOW! Our site is saying ships to 223 countries but then
// is it charging $50 a book to do so?"). Until today a book with no measured cost for a country was sized at that
// country's 6x9 BIBLE cost (~890 pp): Forever Changed (214 pp) was charged as a Bible, UK $37.01 a copy against a real
// ~$10. Now a book without its own measured landed_cost_usd.<cost_key> is priced from its OWN specs by the model in
// ship-countries.json landedCost.model (its _readme has the method + sources): Ingram print by site x binding x
// interior x page count, plus the country's MEASURED shipping at the book's estimated weight; a country outside the
// measured grid takes the max over its zone's grid countries. The Bible cost of the same binding stays the CEILING
// (a book never costs more than a Bible), and a book the model cannot read (no page count, no trim) keeps the Bible
// cost, the old conservative bound. Calibration against every measured cost: scripts/book-cost-model.test.mjs.
interface PrintSite {
	cur: string;
	handling: number;
	pb_bw: [number, number];
	hb_bw: [number, number];
	pb_color: [number, number];
	hb_color: [number, number];
	jacket: number;
}
export interface CostModel {
	printSafety: number;
	print: Record<string, PrintSite>;
	gsm: { bw: number; color: number };
	cover: { pb: number; hb: number; hbj: number };
	defaultTrimIn2: number;
	heavySlope: number;
	grid: Record<string, { site: string; knots: [number, number][] }>;
	zones: Record<string, string[]>;
	/** Server-only spec facts for a row whose book-skus.json fields are blank (source per entry in its `basis`). */
	specs?: Record<
		string,
		{ pages?: number; trim?: string; interior?: 'bw' | 'color'; basis?: string }
	>;
}
const LC = raw.landedCost as unknown as {
	fx: Record<string, number>;
	model?: CostModel;
};
export const COST_MODEL: CostModel | undefined = LC.model;
const FX: Record<string, number> = {
	USD: 1,
	GBP: LC.fx.USD_GBP,
	EUR: LC.fx.USD_EUR,
	AUD: LC.fx.USD_AUD,
};
/** code -> { zone, landed_cost_usd } for every country row (pending holds every country, live or not). */
const ROWS = new Map(
	(
		raw.pending as unknown as {
			code: string;
			zone?: string;
			landed_cost_usd?: Record<string, unknown>;
		}[]
	).map((r) => [r.code, r]),
);
/** 'pb' | 'hb' | 'hbj' (jacketed case laminate) from the row's own format/binding text. */
export function bookKind(slug: string): 'pb' | 'hb' | 'hbj' | null {
	const b = BOOK_SKUS[slug];
	if (!b) return null;
	if (/jacket/i.test(b.binding) && !/no jacket/i.test(b.binding)) return 'hbj';
	return isHardbackRow(b) ? 'hb' : 'pb';
}
const dims = (t: string | null): [number, number] | null => {
	const m = String(t ?? '').match(/[\d.]+/g);
	return m && m.length >= 2 ? [Number(m[0]), Number(m[1])] : null;
};
/** Interior class: the row's explicit `interior`, else colour when its spec/format says so, else colour for a
 *  picture-book shape (both sides >= 8 in, <= 120 pp: the costlier class, so an unknown never under-prices), else B&W. */
export function interiorOf(slug: string): 'bw' | 'color' {
	const b = BOOK_SKUS[slug];
	const o = COST_MODEL?.specs?.[slug]?.interior;
	if (o === 'bw' || o === 'color') return o;
	if (b?.interior === 'bw' || b?.interior === 'color') return b.interior;
	if (/colou?r/i.test(`${b?.spec ?? ''} ${b?.format ?? ''}`)) return 'color';
	const d = dims(trimOf(slug));
	const p = pagesOf(slug);
	return d && Math.min(d[0], d[1]) >= 8 && p != null && p <= 120 ? 'color' : 'bw';
}
/** The row's page count, else the same book's other format's (a hardback row often omits it). */
export function pagesOf(slug: string): number | null {
	const b = BOOK_SKUS[slug];
	if (!b) return null;
	const o = COST_MODEL?.specs?.[slug]?.pages;
	if (o) return o;
	if (b.pages) return b.pages;
	const sib = Object.values(BOOK_SKUS).find((r) => r.bookSlug === b.bookSlug && r.pages);
	return sib?.pages ?? null;
}
/** The row's trim, else the model's spec fact, else the same book's other format's trim (formats share a trim). */
export function trimOf(slug: string): string | null {
	const b = BOOK_SKUS[slug];
	if (!b) return null;
	const o = COST_MODEL?.specs?.[slug]?.trim;
	if (o) return o;
	if (dims(b.trim)) return b.trim;
	const sib = Object.values(BOOK_SKUS).find((r) => r.bookSlug === b.bookSlug && dims(r.trim));
	return sib?.trim ?? null;
}
/** Estimated shipped weight in kg: interior leaves + cover/case, from trim, pages and interior class. */
export function bookWeightKg(slug: string, m: CostModel | undefined = COST_MODEL): number | null {
	const kind = bookKind(slug);
	const p = pagesOf(slug);
	const d = dims(trimOf(slug));
	if (!m || !kind || !p || !d) return null;
	const a = d[0] * d[1] * 0.00064516;
	return (p / 2) * a * m.gsm[interiorOf(slug)] + 2 * a * m.cover[kind];
}
/** Ingram print + handling for one copy at a print site, USD (model x printSafety). */
export function modelPrintUsd(
	slug: string,
	site: string,
	m: CostModel | undefined = COST_MODEL,
): number | null {
	const kind = bookKind(slug);
	const p = pagesOf(slug);
	const s = m?.print[site];
	if (!m || !s || !kind || !p || !dims(trimOf(slug))) return null;
	const [fixed, per] = s[`${kind === 'pb' ? 'pb' : 'hb'}_${interiorOf(slug)}`];
	const local = (fixed + per * p + (kind === 'hbj' ? s.jacket : 0)) * m.printSafety + s.handling;
	return local / FX[s.cur];
}
/** Measured shipping for weight `w` in a grid country: interpolate the knots, flat below the first, +heavySlope past the last. */
export function shipAtKg(knots: [number, number][], w: number, heavySlope: number): number {
	if (w <= knots[0][0]) return knots[0][1];
	for (let i = 1; i < knots.length; i++) {
		const [w0, s0] = knots[i - 1];
		const [w1, s1] = knots[i];
		if (w <= w1) return s0 + ((s1 - s0) * (w - w0)) / (w1 - w0);
	}
	const [wl, sl] = knots[knots.length - 1];
	return sl + heavySlope * (w - wl);
}
/** Modelled landed cost in a GRID country (one with measured book shipping), USD; null = not modelled. */
export function gridLandedUsd(
	slug: string,
	code: string,
	m: CostModel | undefined = COST_MODEL,
): number | null {
	const g = m?.grid[code];
	const w = bookWeightKg(slug, m);
	if (!m || !g || w == null) return null;
	const print = modelPrintUsd(slug, g.site, m);
	return print == null ? null : print + shipAtKg(g.knots, w, m.heavySlope);
}
const round2 = (n: number) => Math.round(n * 100) / 100;
/**
 * Landed cost for a book with NO own measured cost in `code`, USD: the grid model there, else the MAX over the
 * country's zone grid countries (each member: the book's own measured cost there, else its model). null = cannot model.
 */
export function modelledLandedUsd(
	slug: string,
	code: string,
	m: CostModel | undefined = COST_MODEL,
): number | null {
	const book = BOOK_SKUS[slug];
	if (!m || !book) return null;
	const cc = code.toUpperCase();
	const members = m.grid[cc] ? [cc] : (m.zones[ROWS.get(cc)?.zone ?? ''] ?? []);
	const costs = members.map((mc) => memberCost(slug, book.costKey, mc, cc, m));
	// no partial max: a member the book cannot be priced in leaves the country unmodelled
	if (!costs.length || costs.some((v) => v == null)) return null;
	return round2(Math.max(...(costs as number[])));
}
/** One zone member's cost for the book: its own measured cost there (outside the asked country), else the grid model. */
function memberCost(
	slug: string,
	costKey: string | null | undefined,
	member: string,
	asked: string,
	m: CostModel,
): number | null {
	const own =
		costKey && member !== asked ? ROWS.get(member)?.landed_cost_usd?.[costKey] : undefined;
	return typeof own === 'number' ? own : gridLandedUsd(slug, member, m);
}

/**
 * Landed cost for one unit of `slug`: its own measured cost; else (a book, with the destination `code`) the per-book
 * model, never above the country's Bible cost of the same binding; else that Bible cost (the old conservative bound).
 */
export function landedUnitCost(
	slug: string,
	lc: Record<string, unknown> | undefined,
	code?: string,
): number | null {
	if (!lc) return null;
	const book = BOOK_SKUS[slug];
	// own = a Bible's binding row, or a book's OWN cost key; a book without one never reads the Bible row as "own"
	const own = book ? (book.costKey ? lc[book.costKey] : undefined) : lc[bindingFor(slug)];
	if (typeof own === 'number') return own;
	if (!book) return null;
	const fallback = lc[isHardbackRow(book) ? 'hc' : 'pb'];
	const bible = typeof fallback === 'number' ? fallback : null;
	const modelled = code ? modelledLandedUsd(slug, code) : null;
	if (modelled == null) return bible;
	return bible == null ? modelled : Math.min(modelled, bible);
}

/** Net USD for ONE SKU unit charged at `priceCents` plus `feeCents` handling; null = landed cost unknown. */
export function netPerItemUsd(
	slug: string,
	priceCents: number,
	country: Pick<ShipCountry, 'landed_cost_usd'> & { code?: string; forwarder?: Forwarder },
	feeCents = 0,
): number | null {
	// FORWARDER ROUTE: the SKU's own MEASURED landed cost to the forwarder (tax included), Stripe's fee on the list price
	// and the WHOLE per-order credit, exactly the method of the route's source CSV (conservative for a multi-copy order:
	// each copy carries the full credit). A Bible with no measured route cost has no net: the sale is refused.
	const fw = forwarderFor(slug, country);
	if (fw) {
		const landed = forwarderLandedUsd(slug, fw);
		if (landed == null) return null;
		const list = (priceCents + feeCents) / 100;
		return list - (list * STRIPE_INTL_PCT + STRIPE_FIXED_USD) - landed - fw.credit_cents / 100;
	}
	const lc = country.landed_cost_usd;
	if (!lc) return null;
	const v = volumesFor(slug);
	const charged = (priceCents + feeCents) / 100;
	const duty = country.code && isEu(country.code) ? EU_DUTY_USD * v : 0;
	// ONE ENGINE (Kevin 2026-11-15: "we do what our engine does per the engine not per book"): a book uses its
	// own measured landed cost where one exists, else the per-book cost model (its own specs, Kevin 2026-11-24),
	// capped at the country's Bible cost for the same binding.
	const unitCost = landedUnitCost(slug, lc, country.code);
	if (unitCost == null) return null;
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
	country: Pick<ShipCountry, 'landed_cost_usd' | 'farBand'> & {
		code?: string;
		forwarder?: Forwarder;
	},
): number {
	if (country.code?.toUpperCase() === 'US' || !country.landed_cost_usd) return 0;
	// a forwarder-route Bible never carries a handling fee: below its floor it is refused (marginCheck), not priced up.
	// A forwarder-route BOOK (scope 'all') keeps the books' handling fee, sized on its net AFTER the credit (PENDING RULING
	// pmshipping 2026-11-26: without it 59 of 60 book SKUs net < $0 to Ukraine and would be refused).
	if (forwarderFor(slug, country) && !BOOK_SKUS[slug]) return 0;
	const noFee = netPerItemUsd(slug, paidCents, country, 0);
	if (noFee == null) return 0; // no cost for this SKU here: the caller refuses the sale (fail closed)
	const short = floorForSku(slug, country) - noFee; // USD of net still missing
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
				const paid = paidUnit(slug, list, pct, pct === FIRST_ORDER_PCT);
				fees[feeKey(slug, paid)] = handlingFeeCents(slug, paid, c);
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
	/** true when `pct` is the first-order 15% (books take only that, Kevin 2026-11-14) */
	firstOrder = false,
): MarginResult {
	if (code.toUpperCase() === 'US') return { ok: true, reason: '', worst: null };
	const c = rows.find((r) => r.code === code.toUpperCase());
	if (!c?.landed_cost_usd) return { ok: false, reason: `no landed cost for ${code}`, worst: null };
	let worst: MarginResult['worst'] = null;
	let need = floor ?? floorFor(c);
	for (const l of lines) {
		const lineNeed = floor ?? floorForSku(l.slug, c);
		const paid = paidUnit(l.slug, l.retail, pct, firstOrder);
		const net = netPerItemUsd(l.slug, paid, c, handlingFeeCents(l.slug, paid, c));
		if (net == null)
			return { ok: false, reason: `no landed cost for ${l.slug} to ${code}`, worst: null };
		// worst = the line furthest BELOW its own floor (a break-even book and a $20-floor Bible differ)
		if (!worst || net - lineNeed < worst.net - need) {
			worst = { slug: l.slug, net };
			need = lineNeed;
		}
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
