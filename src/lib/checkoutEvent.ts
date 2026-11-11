// Order-button click / checkout-start event (unit 2rz, 2026-11-11).
// One first-party beacon to the EXISTING /_evt sink (the apex router's event sink that already
// carries audio_play / audio_complete). Aggregate dimensions only: NO email, name, address or IP,
// no cart prices. Destination country is the shipping <select> value (a 2-letter code), not geo-IP.
import { bindingFor } from './order-pricing.ts';

export const CHECKOUT_EVENT_KIND = 'checkout_start';

export type CheckoutEvent = {
	kind: typeof CHECKOUT_EVENT_KIND;
	path: string;
	editions: string[];
	binding: 'hc' | 'pb' | 'bi' | 'mixed';
	qty: '1' | '2-4' | '5-9' | '10-24' | '25+';
	dest: string;
	lang: string;
	ref: string;
};

export const qtyBucket = (n: number): CheckoutEvent['qty'] =>
	n <= 1 ? '1' : n <= 4 ? '2-4' : n <= 9 ? '5-9' : n <= 24 ? '10-24' : '25+';

/** Build the payload from the cart `counts` (sku -> qty). Pure; no DOM. */
export function buildCheckoutEvent(
	counts: Record<string, number>,
	o: { path: string; dest?: string; lang?: string },
): CheckoutEvent {
	const skus = Object.entries(counts).filter(([, n]) => n > 0);
	const bindings = new Set(skus.map(([k]) => bindingFor(k)));
	const editions = [...new Set(skus.map(([k]) => k.replace(/-(hb|pb)$/, '')))].slice(0, 8);
	const total = skus.reduce((s, [, n]) => s + n, 0);
	const path = String(o.path || '/').slice(0, 80);
	return {
		kind: CHECKOUT_EVENT_KIND,
		path,
		editions,
		binding: bindings.size === 1 ? [...bindings][0] : 'mixed',
		qty: qtyBucket(total),
		dest: /^[A-Za-z]{2}$/.test(o.dest ?? '') ? (o.dest as string).toUpperCase() : 'US',
		lang: String(o.lang || 'en').slice(0, 8),
		ref: path.slice(0, 40), // the sink's existing per-ref tally
	};
}

/** Fire-and-forget; telemetry must never block or break checkout. */
export function sendCheckoutEvent(
	ev: CheckoutEvent,
	nav: { sendBeacon?: (u: string, d: Blob) => boolean } = navigator,
): void {
	try {
		const body = JSON.stringify(ev);
		if (nav.sendBeacon) nav.sendBeacon('/_evt', new Blob([body], { type: 'application/json' }));
		else fetch('/_evt', { method: 'POST', body, keepalive: true }).catch(() => {});
	} catch {
		/* ignore */
	}
}
