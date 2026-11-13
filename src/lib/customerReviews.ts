// Google Customer Reviews opt-in for the order confirmation page (/order) ONLY.
// Kevin approved 2026-11-10 (kevin-decisions.md, "1A 1. Turn on Google Customer Reviews?"), unit 2qy.
// Merchant Center account 5891954461 signed the GCR program agreement 2026-11-10.
//
// Everything here is derived from the COMPLETED Stripe Checkout session read server-side by
// functions/order.ts, never from query params. The module is omitted (returns null) whenever any
// required value is missing or unverifiable: no invented dates, no placeholder emails, and no
// test-mode sessions (livemode false), so Google never receives a fake order.
//
// Docs followed: https://support.google.com/merchants/answer/7106244 (opt-in module).
import { countryFor } from './shipCountries.ts';

export const GCR_MERCHANT_ID = 5891954461;

/** The subset of a Stripe Checkout session this module reads. */
export interface GcrSession {
	id?: string;
	livemode?: boolean;
	payment_status?: string;
	created?: number;
	customer_details?: { email?: string | null; address?: { country?: string | null } | null } | null;
	collected_information?: {
		shipping_details?: { address?: { country?: string | null } | null } | null;
	} | null;
	shipping_details?: { address?: { country?: string | null } | null } | null;
	/** Present when the session was fetched with expand[]=shipping_cost.shipping_rate. */
	shipping_cost?: {
		shipping_rate?:
			| {
					delivery_estimate?: { maximum?: { unit?: string; value?: number } | null } | null;
			  }
			| string
			| null;
	} | null;
}

export interface OptInParams {
	merchant_id: number;
	order_id: string;
	email: string;
	delivery_country: string;
	estimated_delivery_date: string;
}

/** Add business days (Mon-Fri, UTC; no holiday calendar) to a date and return YYYY-MM-DD. */
export function addBusinessDays(from: Date, days: number): string {
	const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
	let left = Math.max(0, Math.floor(days));
	while (left > 0) {
		d.setUTCDate(d.getUTCDate() + 1);
		const w = d.getUTCDay();
		if (w !== 0 && w !== 6) left--;
	}
	return d.toISOString().slice(0, 10);
}

/**
 * Business days from order to delivery, as the checkout itself stated them. Order of trust:
 * (1) the shipping rate the buyer actually chose (its delivery_estimate.maximum, in business days),
 * (2) the country's standard estimate in ship-countries.json (handling max + transit max),
 * else null: the caller omits the module rather than invent a date.
 */
export function deliveryBusinessDays(s: GcrSession, country: string): number | null {
	const rate = s.shipping_cost?.shipping_rate;
	if (rate && typeof rate === 'object') {
		const m = rate.delivery_estimate?.maximum;
		if (m && m.unit === 'business_day' && Number.isFinite(m.value) && (m.value as number) > 0)
			return m.value as number;
	}
	const c = countryFor(country);
	if (!c) return null;
	const days = c.handlingDays[1] + c.transitDays[1];
	return days > 0 ? days : null;
}

/** The opt-in parameters for a paid, live-mode session, or null when the module must be omitted. */
export function buildOptIn(s: GcrSession): OptInParams | null {
	if (s.livemode !== true || s.payment_status !== 'paid') return null;
	const id = typeof s.id === 'string' ? s.id : '';
	if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return null;
	const email = (s.customer_details?.email ?? '').trim();
	if (!/^[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+$/.test(email)) return null;
	const raw =
		s.collected_information?.shipping_details?.address?.country ??
		s.shipping_details?.address?.country ??
		s.customer_details?.address?.country ??
		'';
	const country = raw.toUpperCase();
	if (!/^[A-Z]{2}$/.test(country) || country === 'ZZ') return null;
	if (!Number.isFinite(s.created) || !s.created) return null;
	const days = deliveryBusinessDays(s, country);
	if (days === null) return null;
	return {
		merchant_id: GCR_MERCHANT_ID,
		order_id: id,
		email,
		delivery_country: country,
		estimated_delivery_date: addBusinessDays(new Date((s.created as number) * 1000), days),
	};
}

/** Google's snippet with server-computed values. JSON is escaped so a value can never close the script tag. */
export function optInSnippet(p: OptInParams): string {
	const json = JSON.stringify(p)
		.replace(/</g, '\\u003c')
		.replace(/>/g, '\\u003e')
		.replace(/&/g, '\\u0026')
		.replace(/\u2028/g, '\\u2028')
		.replace(/\u2029/g, '\\u2029');
	return `<script src="https://apis.google.com/js/platform.js?onload=renderOptIn" async defer></script>
<script>
window.renderOptIn = function () {
  window.gapi.load('surveyoptin', function () {
    window.gapi.surveyoptin.render(${json});
  });
};
</script>`;
}
