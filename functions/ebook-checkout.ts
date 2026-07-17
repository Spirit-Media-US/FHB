// /ebook-checkout — direct eBook sale ($7.49). Creates a Stripe Checkout session;
// on success Stripe redirects to /ebook-download?s={CHECKOUT_SESSION_ID}, which
// verifies the payment and streams the DRM-free EPUB from R2. Reuses the same
// Stripe key as the bulk-print checkout. Gated: if the key OR the eBook R2 bucket
// isn't bound (dev / pre-launch), returns { disabled:true } so the button falls
// back to "grab it on Amazon meanwhile" rather than selling something undeliverable.
//
// NB: path is /ebook-checkout (not /api/*) — the apex router proxies /api/* to the
// community app, so this marketing function must live off that prefix.

interface Env {
	STRIPE_FHB_SECRET_KEY?: string;
	FHB_EBOOK?: R2Bucket; // bucket holding fathers-heart-bible.epub (private)
}

const PRICE = 749; // $7.49 in cents — direct price (Amazon Kindle is $9.99)
// Stripe tax code for electronically-supplied books/e-books. Confirm in the
// Stripe dashboard for your jurisdictions before heavy volume.
const TAX_CODE = 'txcd_10202001';

function encodeForm(obj: Record<string, string | number>): string {
	return Object.entries(obj)
		.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
		.join('&');
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { request, env } = context;
	const json = (body: unknown, status = 200) =>
		new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

	// Gate: need both the Stripe key AND the eBook bucket, or we can't deliver.
	if (!env.STRIPE_FHB_SECRET_KEY || !env.FHB_EBOOK) {
		return json({ disabled: true, message: 'Direct download is not enabled yet.' });
	}

	const origin = new URL(request.url).origin;
	const form: Record<string, string | number> = {
		mode: 'payment',
		success_url: `${origin}/ebook-download?s={CHECKOUT_SESSION_ID}`,
		cancel_url: `${origin}/print?ebook=canceled`,
		'automatic_tax[enabled]': 'true',
		billing_address_collection: 'required', // digital goods → address drives tax
		customer_creation: 'always',
		'metadata[kind]': 'ebook_direct',
		'line_items[0][quantity]': 1,
		'line_items[0][price_data][currency]': 'usd',
		'line_items[0][price_data][unit_amount]': PRICE,
		'line_items[0][price_data][tax_behavior]': 'exclusive',
		'line_items[0][price_data][product_data][name]': "Father's Heart Bible — eBook",
		'line_items[0][price_data][product_data][description]':
			'Instant download · DRM-free EPUB · An Intimate Translation',
		'line_items[0][price_data][product_data][tax_code]': TAX_CODE,
	};

	const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.STRIPE_FHB_SECRET_KEY}`,
			'content-type': 'application/x-www-form-urlencoded',
		},
		body: encodeForm(form),
	});
	if (!res.ok) {
		return json({ error: 'stripe_error' }, 502);
	}
	const session = (await res.json()) as { url?: string };
	if (!session.url) return json({ error: 'no_session_url' }, 502);
	return json({ url: session.url });
};
