// FAR-BAND BULK QUOTE (unit 2kx; Kevin 2026-11-09, kevin-decisions.md: "Let's do request a bulk
// quote for expensive countries."). For a country flagged far_band in src/data/ship-countries.json:
//   · web orders get the first-order 15% only, never the volume ladder;
//   · an order of BULK_QUOTE_MIN or more physical copies is NOT sold through checkout. The order
//     form offers "Request a bulk quote" instead, priced later on real Ingram bulk shipping.
// ONE rule, imported by the server (functions/dvc-checkout.ts) and the form (src/scripts/order-form.ts)
// so the page and the charge cannot disagree. Pure: no country list or cost is imported here.

export const BULK_QUOTE_MIN = 10;
export const BULK_QUOTE_EMAIL = 'hello@spiritmediapublishing.com';

/** True when this order must go through a quote, not checkout. `copies` = physical volumes. */
export const bulkQuoteRequired = (farBand: boolean | undefined, copies: number): boolean =>
	farBand === true && copies >= BULK_QUOTE_MIN;

/** The volume-tier percent that may apply: none at all in the far band. */
export const tierPctFor = (farBand: boolean | undefined, tierPct: number): number =>
	farBand === true ? 0 : tierPct;

export const BULK_QUOTE_COPY = {
	title: 'Request a bulk quote',
	note: `Orders of ${BULK_QUOTE_MIN} or more copies to this country are quoted individually, based on the actual cost of shipping a bulk order there. Tell us what you need and we will reply by email with a quote.`,
	error: `Orders of ${BULK_QUOTE_MIN} or more copies to this country are quoted individually. Please use Request a bulk quote.`,
};

/** mailto: link with the request prefilled: name, email, country, editions and quantity. */
export function bulkQuoteMailto(f: {
	name: string;
	email: string;
	country: string;
	editions: { title: string; qty: number }[];
	copies: number;
}): string {
	const subject = `Bulk quote request: ${f.copies} copies to ${f.country}`;
	const body = [
		'Hello,',
		'',
		'I would like a bulk quote for Father’s Heart Bible.',
		'',
		`Name: ${f.name}`,
		`Email: ${f.email}`,
		`Country: ${f.country}`,
		`Total copies: ${f.copies}`,
		'Editions:',
		...f.editions.map((e) => `- ${e.qty} x ${e.title}`),
	].join('\n');
	return `mailto:${BULK_QUOTE_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
