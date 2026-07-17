// /print-checkout — bulk print-order checkout (Cloudflare Pages Function).
//
//   POST /print-checkout  { counts: { plum, charcoal, white,
//                                     plum_hb, charcoal_hb, white_hb } }
//     → { url }            Stripe Checkout Session URL (redirect the browser)
//     → { error:"below_minimum" } when combined total < 25
//     → { disabled: true } when no Stripe key is bound (dev / not-yet-live)
//
// The COMBINED total across all editions AND bindings sets the volume tier
// (mix & match). ONE consistent discount ladder (10–40%) applies to both
// bindings, each priced off its own retail — paperback $39.99, hardback
// $44.99. One Stripe line item per edition+binding ordered. Physical goods:
// Checkout collects
// payment + a US shipping address; fulfillment is off-Stripe (POD / manual).
// Prices are authoritative HERE (server-side) so the browser can't tamper.
//
// NB: path is /print-checkout, not /api/* — the apex router proxies /api/* to
// the community app, so this marketing function must live off that prefix.

interface Env {
	STRIPE_FHB_SECRET_KEY?: string;
}

const COLORS = ['plum', 'charcoal', 'white'] as const;
type Color = (typeof COLORS)[number];
const BINDINGS = ['pb', 'hb'] as const;
type Binding = (typeof BINDINGS)[number];

// POD print cost: paperback $12.41/unit, hardback $20.10/unit; free shipping
// baked into the per-unit prices. 25-copy combined minimum.
// MUST match src/pages/print.astro `tiers`.
const MIN_QTY = 25;
const TIERS: { min: number; pct: number; pb: number; hb: number }[] = [
	{ min: 1000, pct: 40, pb: 2399, hb: 2699 },
	{ min: 500, pct: 35, pb: 2599, hb: 2924 },
	{ min: 250, pct: 30, pb: 2799, hb: 3149 },
	{ min: 100, pct: 25, pb: 2999, hb: 3374 },
	{ min: 50, pct: 20, pb: 3199, hb: 3599 },
	{ min: 25, pct: 15, pb: 3399, hb: 3824 },
];
const tierFor = (total: number) => TIERS.find((t) => total >= t.min) ?? null;

// Physical books have no book-specific Stripe tax code; use General – Tangible
// Goods. Stripe Tax then applies each state's rules for tangible goods.
const TAX_CODE = 'txcd_99999999';

const COVER: Record<Color, string> = {
	plum: 'https://assets.spiritmediapublishing.com/FHB/print/edition-plum.webp',
	charcoal: 'https://assets.spiritmediapublishing.com/FHB/print/edition-charcoal.webp',
	white: 'https://assets.spiritmediapublishing.com/FHB/print/edition-white.webp',
};

const BINDING_LABEL: Record<Binding, string> = { pb: 'Paperback', hb: 'Hardback' };

// Request-payload key for a color+binding ("plum", "plum_hb", …).
// Product lines: Compact + Large Print. LP prices identically to Compact (same
// retail), so it just adds SKUs — LP paperback/hardback both bulk-orderable now.
const LINES = ['compact', 'lp'] as const;
type Line = (typeof LINES)[number];
const keyFor = (c: Color, b: Binding, line: Line = 'compact'): string => {
	const base = b === 'pb' ? c : `${c}_hb`;
	return line === 'lp' ? `lp_${base}` : base;
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

	let payload: { counts?: Record<string, number> };
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'bad_request' }, 400);
	}

	// Normalize per-line+edition+binding counts (mix-and-match; Compact + Large Print).
	const counts: Record<string, number> = {};
	for (const line of LINES) {
		for (const b of BINDINGS) {
			for (const c of COLORS) {
				const k = keyFor(c, b, line);
				const n = Math.floor(Number(payload.counts?.[k] ?? 0));
				if (!Number.isFinite(n) || n < 0) return json({ error: 'invalid_selection' }, 400);
				counts[k] = n;
			}
		}
	}
	const total = Object.values(counts).reduce((s, n) => s + n, 0);
	const tier = tierFor(total);
	if (total < MIN_QTY || tier === null) {
		return json({ error: 'below_minimum', min: MIN_QTY }, 400);
	}

	// Gate: no key bound (dev / pre-launch) → tell the page to show "coming soon".
	if (!env.STRIPE_FHB_SECRET_KEY) {
		return json({ disabled: true, message: 'Bulk checkout is not enabled yet.' });
	}

	const origin = new URL(request.url).origin;
	const form: Record<string, string | number> = {
		mode: 'payment',
		success_url: `${origin}/print?order=success`,
		cancel_url: `${origin}/print?order=canceled`,
		// Stripe Tax auto-calculates sales tax from the shipping address.
		'automatic_tax[enabled]': 'true',
		// Free shipping (baked into the per-unit price); address still collected
		// for tax calculation + fulfillment.
		'shipping_address_collection[allowed_countries][0]': 'US',
		'phone_number_collection[enabled]': 'true',
		'metadata[kind]': 'print_bulk',
		'metadata[total]': total,
		'metadata[pct_off]': tier.pct,
		'metadata[breakdown]': Object.entries(counts)
			.filter(([, n]) => n > 0)
			.map(([k, n]) => `${k}:${n}`)
			.join(','),
	};
	// One line item per line+edition+binding ordered, each at its binding's
	// volume-tier unit price (LP prices identically to Compact).
	let li = 0;
	for (const line of LINES) {
		for (const b of BINDINGS) {
			for (const c of COLORS) {
				const qty = counts[keyFor(c, b, line)];
				if (qty <= 0) continue;
				const p = `line_items[${li}]`;
				form[`${p}[quantity]`] = qty;
				form[`${p}[price_data][currency]`] = 'usd';
				form[`${p}[price_data][unit_amount]`] = tier[b];
				form[`${p}[price_data][tax_behavior]`] = 'exclusive';
				form[`${p}[price_data][product_data][name]`] =
					`Father's Heart Bible${line === 'lp' ? ' Large Print' : ''} — ${titleCase(c)} ${BINDING_LABEL[b]}`;
				form[`${p}[price_data][product_data][description]`] =
					`Bulk (${total} copies, ${tier.pct}% off) · Free shipping`;
				form[`${p}[price_data][product_data][images][0]`] = COVER[c];
				form[`${p}[price_data][product_data][tax_code]`] = TAX_CODE;
				li++;
			}
		}
	}
	const formStr = encodeForm(form);

	const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.STRIPE_FHB_SECRET_KEY}`,
			'Content-Type': 'application/x-www-form-urlencoded',
			'Stripe-Version': '2024-12-18.acacia',
		},
		body: formStr,
	});
	const data = (await res.json()) as { url?: string; error?: { message?: string } };
	if (!res.ok || !data.url) {
		return json({ error: 'stripe_error', detail: data.error?.message ?? 'unknown' }, 502);
	}
	return json({ url: data.url });
};
