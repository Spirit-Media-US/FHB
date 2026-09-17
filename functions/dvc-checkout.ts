// /dvc-checkout — Divine Voice Color print orders (Cloudflare Pages Function).
//
//   POST /dvc-checkout  { counts: { teen: 2, dads: 1, journaling: 1, … } }
//     → { url }            Stripe Checkout Session URL (redirect the browser)
//     → { error:"empty" }  nothing selected
//     → { disabled:true }  no Stripe key bound (dev / pre-launch)
//
// ONE checkout for every quantity, unlike the retired /print-checkout which had a
// 25-copy minimum (Kevin 2026-08-23: "1 check out with up to 9 individual bibles at
// full price then volume discounts added according to quantities ordered").
//
// The COMBINED total across every edition, colour and binding sets the tier — mix and
// match. Prices are authoritative HERE, server-side, so the browser cannot tamper with them.
//
// SHIPPING IS FREE and baked into the unit price. Chosen over a 5% discount because a
// discount would put our direct price below Amazon's list and invite Amazon to price-match;
// free shipping leaves list price intact everywhere and is worth more to the buyer.
//
// NB: path is /dvc-checkout, not /api/* — the apex router proxies /api/* to the community
// app, so this marketing function must live off that prefix.

interface Env {
	STRIPE_FHB_SECRET_KEY?: string;
}

const ASSETS = 'https://assets.spiritmediapublishing.com/FHB/print';

// Retail in cents. The fifteen 6x9 targeted editions share one price; the 8x10 journaling
// edition is its own.
//
// `books` is HOW MANY BOOKS THIS SKU PUTS IN THE BUYER'S HANDS, and it is what the volume
// ladder counts — not the number of line items. The Large Print set is three physical
// volumes, so one set moves the buyer three books up the ladder (Kevin 2026-09-16). Every
// other SKU is one book and omits the field.
const EDITIONS: Record<string, { title: string; retail: number; img: string; books?: number }> = {
	chosen: { title: 'Chosen Bible', retail: 9999, img: `${ASSETS}/dvc-chosen-600.webp` },
	couples: { title: 'Couple’s Bible', retail: 9999, img: `${ASSETS}/dvc-couples-600.webp` },
	dads: { title: 'Dad’s Bible', retail: 9999, img: `${ASSETS}/dvc-dads-600.webp` },
	'first-responders': {
		title: 'First Responder’s Bible',
		retail: 9999,
		img: `${ASSETS}/dvc-first-responders-600.webp`,
	},
	mens: { title: 'Men’s Bible', retail: 9999, img: `${ASSETS}/dvc-mens-600.webp` },
	moms: { title: 'Mom’s Bible', retail: 9999, img: `${ASSETS}/dvc-moms-600.webp` },
	pastors: { title: 'Pastor’s Bible', retail: 9999, img: `${ASSETS}/dvc-pastors-600.webp` },
	peace: { title: 'Peace Bible', retail: 9999, img: `${ASSETS}/dvc-peace-600.webp` },
	presidents: {
		title: 'President’s Bible',
		retail: 9999,
		img: `${ASSETS}/dvc-presidents-600.webp`,
	},
	recovery: { title: 'Recovery Bible', retail: 9999, img: `${ASSETS}/dvc-recovery-600.webp` },
	seekers: { title: 'Seeker’s Bible', retail: 9999, img: `${ASSETS}/dvc-seekers-600.webp` },
	seventeen: { title: 'Seventeen Bible', retail: 9999, img: `${ASSETS}/dvc-seventeen-600.webp` },
	soldiers: { title: 'Soldier’s Bible', retail: 9999, img: `${ASSETS}/dvc-soldiers-600.webp` },
	teen: { title: 'Teen Bible', retail: 9999, img: `${ASSETS}/dvc-teen-600.webp` },
	'worship-leaders': {
		title: 'Worship Leader’s Bible',
		retail: 9999,
		img: `${ASSETS}/dvc-worship-leaders-600.webp`,
	},
	journaling: {
		title: 'She Hears Her Father’s Voice — Journaling Bible',
		retail: 12499,
		img: `${ASSETS}/dvc-journaling-600.webp`,
	},

	// ── General Audience, added 2026-08-29 ──
	// The same Bible without an audience on the cover: three colours, two bindings, in
	// Regular Print (876pp). Large Print is now the three-volume set below. They join the
	// SAME mix-and-match ladder as the targeted editions — the combined total sets the tier.
	// MUST match src/pages/print.astro `generalSkus` and the PRICE map in its inline script.
	'general-regular-charcoal-pb': {
		title: 'Charcoal, Paperback',
		retail: 7999,
		img: `${ASSETS}/general-regular-charcoal-600.webp?v=2`,
	},
	'general-regular-charcoal-hb': {
		title: 'Charcoal, Hardback',
		retail: 9999,
		img: `${ASSETS}/general-regular-charcoal-600.webp?v=2`,
	},
	'general-regular-plum-pb': {
		title: 'Plum, Paperback',
		retail: 7999,
		img: `${ASSETS}/general-regular-plum-600.webp?v=2`,
	},
	'general-regular-plum-hb': {
		title: 'Plum, Hardback',
		retail: 9999,
		img: `${ASSETS}/general-regular-plum-600.webp?v=2`,
	},
	'general-regular-white-pb': {
		title: 'White, Paperback',
		retail: 7999,
		img: `${ASSETS}/general-regular-white-600.webp?v=2`,
	},
	'general-regular-white-hb': {
		title: 'White, Hardback',
		retail: 9999,
		img: `${ASSETS}/general-regular-white-600.webp?v=2`,
	},
	// ── Large Print, rebuilt as THREE VOLUMES 2026-09-17 ──
	// The single-volume Large Print (three cover colours, ISBNs 307-2/308-9/309-6/310-2/
	// 311-9/312-6) is RETIRED and its six SKUs are gone from this map. It was an ABRIDGED
	// book — 30 books in full text and the other 36 in selected passages — because the
	// complete text at 14pt does not fit one binding. The set is the complete Bible: one
	// cover colour per volume, and together all 66 books.
	// Prices are Kevin's, 2026-09-14, and live in
	// projects/fhb-print-bible/editions/ISBNS.json as the single source: Vol 3 is about half
	// the size of Vols 1 and 2 and is priced accordingly.
	'lp-vol1-pb': {
		title: 'Large Print Vol. 1, Genesis–Esther (Wheat), Paperback',
		retail: 9999,
		img: `${ASSETS}/lp-vol1-600.webp?v=1`,
	},
	'lp-vol1-hb': {
		title: 'Large Print Vol. 1, Genesis–Esther (Wheat), Hardback',
		retail: 11499,
		img: `${ASSETS}/lp-vol1-600.webp?v=1`,
	},
	'lp-vol2-pb': {
		title: 'Large Print Vol. 2, Job–Malachi (Sage), Paperback',
		retail: 9999,
		img: `${ASSETS}/lp-vol2-600.webp?v=1`,
	},
	'lp-vol2-hb': {
		title: 'Large Print Vol. 2, Job–Malachi (Sage), Hardback',
		retail: 11499,
		img: `${ASSETS}/lp-vol2-600.webp?v=1`,
	},
	'lp-vol3-pb': {
		title: 'Large Print Vol. 3, New Testament (Mist Blue), Paperback',
		retail: 7999,
		img: `${ASSETS}/lp-vol3-600.webp?v=1`,
	},
	'lp-vol3-hb': {
		title: 'Large Print Vol. 3, New Testament (Mist Blue), Hardback',
		retail: 9999,
		img: `${ASSETS}/lp-vol3-600.webp?v=1`,
	},
	// THE SET IS A NORMAL PRODUCT (Kevin 2026-09-16, dissolving D147). It carries its own
	// price and the SAME ladder as everything else — no better-of rule, no stacking rule, no
	// special case. The saving against buying the three volumes separately is simply the set
	// price, and LP_SET_NEVER_COSTS_MORE below asserts that it is a saving.
	'lp-set-pb': {
		title: 'Large Print — Complete Three-Volume Set, Paperback',
		retail: 24999,
		img: `${ASSETS}/lp-set-600.webp?v=1`,
		books: 3,
	},
	'lp-set-hb': {
		title: 'Large Print — Complete Three-Volume Set, Hardback',
		retail: 29999,
		img: `${ASSETS}/lp-set-600.webp?v=1`,
		books: 3,
	},
};

// The SET MUST NEVER COST MORE than the same three volumes bought separately, in either
// binding. Kevin's prices satisfy it today (299.99 < 329.97 HB, 249.99 < 279.97 PB), but a
// later edit to one volume's price could silently invert it, and a "set" that costs more
// than its parts is the kind of defect a buyer finds before we do. Checked at module load so
// a bad price cannot reach a checkout session, and asserted directly by the unit test.
export const setSavings = (binding: 'pb' | 'hb') => {
	const parts = (['lp-vol1', 'lp-vol2', 'lp-vol3'] as const).reduce(
		(s, v) => s + EDITIONS[`${v}-${binding}`].retail,
		0,
	);
	return parts - EDITIONS[`lp-set-${binding}`].retail;
};
for (const binding of ['pb', 'hb'] as const) {
	if (setSavings(binding) < 0) {
		throw new Error(
			`Large Print set (${binding}) costs more than its three volumes bought separately — ` +
				'fix the prices in projects/fhb-print-bible/editions/ISBNS.json and here.',
		);
	}
}

// Volume ladder. 1–9 pays full price; the published tiers stop at 250 because anyone
// buying 500+ negotiates directly, and publishing a 40% tier would permanently anchor the
// book at $59.99 (Kevin 2026-08-23, after reviewing category benchmarks).
// MUST match src/pages/print.astro `tiers`.
const TIERS: { min: number; pct: number }[] = [
	{ min: 250, pct: 30 },
	{ min: 100, pct: 25 },
	{ min: 50, pct: 20 },
	{ min: 25, pct: 15 },
	{ min: 10, pct: 10 },
	{ min: 1, pct: 0 },
];
const tierFor = (total: number) => TIERS.find((t) => total >= t.min) ?? null;

// Physical books have no book-specific Stripe tax code; General – Tangible Goods lets
// Stripe Tax apply each state's rules.
const TAX_CODE = 'txcd_99999999';

function encodeForm(obj: Record<string, string | number>): string {
	return Object.entries(obj)
		.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
		.join('&');
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { request, env } = context;
	const json = (body: unknown, status = 200) =>
		new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

	let payload: { counts?: Record<string, number> };
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'bad_request' }, 400);
	}

	const counts: Record<string, number> = {};
	for (const slug of Object.keys(EDITIONS)) {
		const n = Math.floor(Number(payload.counts?.[slug] ?? 0));
		if (!Number.isFinite(n) || n < 0) return json({ error: 'invalid_selection' }, 400);
		counts[slug] = n;
	}
	// THRESHOLDS COUNT BOOKS. Counting line items instead would let ten sets — thirty
	// books — sit below the 25-book tier, and would make the ladder mean something
	// different for the one SKU that is not a single book.
	const total = Object.entries(counts).reduce(
		(s, [slug, n]) => s + n * (EDITIONS[slug].books ?? 1),
		0,
	);
	const tier = tierFor(total);
	// tierFor covers everything from 1 upward, so a null here means an empty order.
	if (total < 1 || tier === null) return json({ error: 'empty' }, 400);

	if (!env.STRIPE_FHB_SECRET_KEY) {
		return json({ disabled: true, message: 'Checkout is not enabled yet.' });
	}

	// The apex router proxies this request, so new URL(request.url).origin resolves to
	// the raw Pages host and buyers were returned to fathersheartbible.pages.dev after
	// paying. Rewrite ONLY the production Pages host: preview deployments carry a
	// subdomain (dev.… / <hash>.…) and must keep sending their test purchases to
	// themselves, not to production.
	const reqUrl = new URL(request.url);
	const origin =
		reqUrl.hostname === 'fathersheartbible.pages.dev'
			? 'https://fathersheartbible.com'
			: reqUrl.origin;
	const form: Record<string, string | number> = {
		mode: 'payment',
		// /order re-reads the session from Stripe and shows the buyer what they bought.
		// This used to be /print?order=success, which print.astro never read — so a buyer
		// landed back on the same order form with no acknowledgement (found 2026-09-03).
		success_url: `${origin}/order?s={CHECKOUT_SESSION_ID}`,
		cancel_url: `${origin}/print?order=canceled`,
		'automatic_tax[enabled]': 'true',
		// Free shipping is baked into the unit price; the address is still collected for
		// tax calculation and fulfilment.
		'shipping_address_collection[allowed_countries][0]': 'US',
		'phone_number_collection[enabled]': 'true',
		'metadata[kind]': 'dvc_print',
		'metadata[total]': total,
		'metadata[pct_off]': tier.pct,
		'metadata[breakdown]': Object.entries(counts)
			.filter(([, n]) => n > 0)
			.map(([k, n]) => `${k}:${n}`)
			.join(','),
	};

	let li = 0;
	for (const [slug, qty] of Object.entries(counts)) {
		if (qty <= 0) continue;
		const e = EDITIONS[slug];
		const unit = Math.round((e.retail * (100 - tier.pct)) / 100);
		form[`line_items[${li}][quantity]`] = qty;
		form[`line_items[${li}][price_data][currency]`] = 'usd';
		form[`line_items[${li}][price_data][unit_amount]`] = unit;
		form[`line_items[${li}][price_data][tax_behavior]`] = 'exclusive';
		form[`line_items[${li}][price_data][product_data][name]`] =
			`Father’s Heart Bible™ — ${e.title}`;
		form[`line_items[${li}][price_data][product_data][description]`] =
			tier.pct > 0
				? `Divine Voice Color · Complete Bible · ${tier.pct}% volume discount · free shipping`
				: 'Divine Voice Color · Complete Bible · free shipping';
		form[`line_items[${li}][price_data][product_data][images][0]`] = e.img;
		form[`line_items[${li}][price_data][product_data][tax_code]`] = TAX_CODE;
		li++;
	}

	const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
		method: 'POST',
		headers: {
			authorization: `Bearer ${env.STRIPE_FHB_SECRET_KEY}`,
			'content-type': 'application/x-www-form-urlencoded',
		},
		body: encodeForm(form),
	});
	if (!res.ok) {
		return json({ error: 'stripe_error', detail: await res.text() }, 502);
	}
	const session = (await res.json()) as { url?: string };
	if (!session.url) return json({ error: 'no_session_url' }, 502);
	return json({ url: session.url });
};
