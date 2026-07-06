// /print-checkout — bulk print-order checkout (Cloudflare Pages Function).
//
//   POST /print-checkout  { color: "plum"|"charcoal"|"white", tier: 10|50|100 }
//     → { url }            Stripe Checkout Session URL (redirect the browser)
//     → { disabled: true } when no Stripe key is bound (dev / not-yet-live)
//
// Physical goods: Stripe Checkout collects payment + a US shipping address;
// fulfillment is handled off-Stripe (POD / manual). Prices are authoritative
// HERE (server-side) so the browser can't tamper with amounts.
//
// NB: path is /print-checkout, not /api/* — the apex router proxies /api/* to
// the community app, so this marketing function must live off that prefix.
//
// ⚠️ BULK PRICES BELOW ARE PLACEHOLDERS — Kevin sets the real per-unit prices.
//    Single retail paperback is $39.99 (Amazon). Change PRICE_CENTS and redeploy.

interface Env {
	STRIPE_FHB_SECRET_KEY?: string;
}

const COLORS = ['plum', 'charcoal', 'white'] as const;
type Color = (typeof COLORS)[number];

// Best-practice church/ministry volume tiers (25/50/100/250), ~35–60% off the
// $39.99 retail, FREE SHIPPING baked into the per-unit price.
// ⚠️ Confirm these clear POD unit cost before go-live. MUST match print.astro `tiers`.
const PRICE_CENTS: Record<number, number> = {
	25: 2599, // ~35% off
	50: 2299, // ~43% off
	100: 2099, // ~48% off
	250: 1799, // ~55% off
};

// Physical books have no book-specific Stripe tax code; use General – Tangible
// Goods. Stripe Tax then applies each state's rules for tangible goods.
const TAX_CODE = 'txcd_99999999';

const COVER: Record<Color, string> = {
	plum: 'https://assets.spiritmediapublishing.com/FHB/print/edition-plum.webp',
	charcoal: 'https://assets.spiritmediapublishing.com/FHB/print/edition-charcoal.webp',
	white: 'https://assets.spiritmediapublishing.com/FHB/print/edition-white.webp',
};

function titleCase(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

// Stripe wants application/x-www-form-urlencoded with bracket notation.
function encodeForm(obj: Record<string, string | number>): string {
	return Object.entries(obj)
		.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
		.join('&');
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { request, env } = context;
	const json = (body: unknown, status = 200) =>
		new Response(JSON.stringify(body), {
			status,
			headers: { 'content-type': 'application/json' },
		});

	let payload: { color?: string; tier?: number };
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'bad_request' }, 400);
	}

	const color = payload.color as Color;
	const tier = Number(payload.tier);
	if (!COLORS.includes(color) || !PRICE_CENTS[tier]) {
		return json({ error: 'invalid_selection' }, 400);
	}

	// Gate: no key bound (dev / pre-launch) → tell the page to show "coming soon".
	if (!env.STRIPE_FHB_SECRET_KEY) {
		return json({ disabled: true, message: 'Bulk checkout is not enabled yet.' });
	}

	const origin = new URL(request.url).origin;
	const unit = PRICE_CENTS[tier];
	const form = encodeForm({
		mode: 'payment',
		success_url: `${origin}/print?order=success`,
		cancel_url: `${origin}/print?order=canceled`,
		// Stripe Tax auto-calculates sales tax from the shipping address.
		'automatic_tax[enabled]': 'true',
		'line_items[0][quantity]': tier,
		'line_items[0][price_data][currency]': 'usd',
		'line_items[0][price_data][unit_amount]': unit,
		// Prices are tax-exclusive (US convention) — tax is added on top at checkout.
		'line_items[0][price_data][tax_behavior]': 'exclusive',
		'line_items[0][price_data][product_data][name]': `Father's Heart Bible — ${titleCase(color)} Paperback`,
		'line_items[0][price_data][product_data][description]': `Bulk order of ${tier} copies (${titleCase(color)} edition) · Free shipping`,
		'line_items[0][price_data][product_data][images][0]': COVER[color],
		'line_items[0][price_data][product_data][tax_code]': TAX_CODE,
		// Free shipping (baked into the per-unit price); address still collected
		// for tax calculation + fulfillment.
		'shipping_address_collection[allowed_countries][0]': 'US',
		'phone_number_collection[enabled]': 'true',
		'metadata[kind]': 'print_bulk',
		'metadata[color]': color,
		'metadata[tier]': tier,
	});

	const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.STRIPE_FHB_SECRET_KEY}`,
			'Content-Type': 'application/x-www-form-urlencoded',
			'Stripe-Version': '2024-12-18.acacia',
		},
		body: form,
	});
	const data = (await res.json()) as { url?: string; error?: { message?: string } };
	if (!res.ok || !data.url) {
		return json({ error: 'stripe_error', detail: data.error?.message ?? 'unknown' }, 502);
	}
	return json({ url: data.url });
};
