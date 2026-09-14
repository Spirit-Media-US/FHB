// /ebook-download — session-verified delivery of the direct-sale eBook.
//   GET /ebook-download?s=<checkout_session_id>            → thank-you page + download button
//   GET /ebook-download?s=<checkout_session_id>&dl=epub    → streams the EPUB (attachment)
// Verifies with Stripe that the session is PAID before serving. The file lives in
// a private R2 bucket (FHB_EBOOK); nothing is public. DRM-free (social-watermarking
// TODO: stamp the buyer email — kept simple for v1).

import EBOOK from './ebook-current.json';

interface Env {
	STRIPE_FHB_SECRET_KEY?: string;
	FHB_EBOOK?: R2Bucket;
}

// Which object ships is decided by the eBook RECORD (projects/fhb-ebook/epub-manifest.json),
// not by this file: ebook-current.json is a derived view written by
// bin/fhb-ebook-config.py --write, and a daily reconcile checks the R2 object's sha256
// against the record. Next edition = promote -> upload to the new key -> --write.
// (Until 2026-09-14 this hard-coded the v21 key and served a pre-2026.6 book.)
const EPUB_KEY: string = EBOOK.key;
const EPUB_NAME: string = EBOOK.filename;

async function sessionPaid(env: Env, sid: string): Promise<boolean> {
	if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) return false;
	const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sid}`, {
		headers: { Authorization: `Bearer ${env.STRIPE_FHB_SECRET_KEY}` },
	});
	if (!r.ok) return false;
	const s = (await r.json()) as { payment_status?: string; metadata?: { kind?: string } };
	return s.payment_status === 'paid' && s.metadata?.kind === 'ebook_direct';
}

const page = (body: string) =>
	new Response(
		`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Your Father's Heart Bible eBook</title><style>body{font-family:system-ui,-apple-system,sans-serif;background:#faf6f2;color:#1a1c1c;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:1.5rem}.card{max-width:34rem;text-align:center;background:#fff;border:1px solid #e4bdc4;border-radius:1rem;padding:2.5rem}a.btn{display:inline-block;background:#b60057;color:#fff;text-decoration:none;font-weight:700;padding:0.85rem 1.8rem;border-radius:999px;margin-top:1rem}h1{font-size:1.6rem;margin:0 0 0.5rem}p{color:#5b3f46;line-height:1.6}</style></head><body><div class="card">${body}</div></body></html>`,
		{ headers: { 'content-type': 'text/html; charset=utf-8' } },
	);

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
	const url = new URL(request.url);
	const sid = url.searchParams.get('s') || '';
	const dl = url.searchParams.get('dl');

	if (!env.STRIPE_FHB_SECRET_KEY || !env.FHB_EBOOK) {
		return page(
			'<h1>Almost there</h1><p>Direct downloads are being switched on. Please check back shortly — your purchase is safe.</p>',
		);
	}
	if (!(await sessionPaid(env, sid))) {
		return page(
			'<h1>We couldn’t verify that purchase</h1><p>This download link is invalid or expired. If you just bought the eBook and see this, email <a href="mailto:hello@spiritmediapublishing.com">hello@spiritmediapublishing.com</a> and we’ll sort it out.</p>',
		);
	}

	if (dl === 'epub') {
		const obj = await env.FHB_EBOOK.get(EPUB_KEY);
		if (!obj)
			return page(
				'<h1>File temporarily unavailable</h1><p>Please email <a href="mailto:hello@spiritmediapublishing.com">hello@spiritmediapublishing.com</a>.</p>',
			);
		return new Response(obj.body, {
			headers: {
				'content-type': 'application/epub+zip',
				'content-disposition': `attachment; filename="${EPUB_NAME}"`,
				'cache-control': 'no-store',
			},
		});
	}

	// Thank-you page with the download button (re-verifies on click).
	return page(
		`<h1>Thank you — welcome home</h1><p>Your Father’s Heart Bible eBook is ready. It’s a DRM-free EPUB — open it in Apple Books, Google Play Books, Kindle, or any reader.</p><a class="btn" href="/ebook-download?s=${encodeURIComponent(sid)}&dl=epub">Download EPUB →</a>`,
	);
};
