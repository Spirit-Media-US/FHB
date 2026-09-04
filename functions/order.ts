// /order — session-verified order confirmation and status lookup.
//
//   GET /order?s=<checkout_session_id>   → the buyer's order, read live from Stripe
//   GET /order                           → a form to paste an order reference into
//
// Why this exists: until 2026-09-03 the print checkout's success_url was
// /print?order=success, and print.astro never read that parameter — so a buyer
// paid and was returned to the same order form with no acknowledgement at all.
// A customer wrote in saying "I don't know if it went through or not." This page
// is what he should have landed on.
//
// Stripe stays the source of truth; nothing is cached and nothing is mirrored, so
// what a buyer sees here is the live state of their order, including shipping
// details we add later via metadata.
//
// NB: path is /order, not /api/* — the apex router proxies /api/* to the
// community app, so this marketing function must live off that prefix.

interface Env {
	STRIPE_FHB_SECRET_KEY?: string;
}

const SUPPORT = 'hello@spiritmediapublishing.com';

const TITLES: Record<string, string> = {
	chosen: 'Chosen Bible',
	couples: 'Couple’s Bible',
	dads: 'Dad’s Bible',
	'first-responders': 'First Responder’s Bible',
	mens: 'Men’s Bible',
	moms: 'Mom’s Bible',
	pastors: 'Pastor’s Bible',
	peace: 'Peace Bible',
	presidents: 'President’s Bible',
	recovery: 'Recovery Bible',
	seekers: 'Seeker’s Bible',
	seventeen: 'Seventeen Bible',
	soldiers: 'Soldier’s Bible',
	teen: 'Teen Bible',
	'worship-leaders': 'Worship Leader’s Bible',
	journaling: 'She Hears Her Father’s Voice — Journaling Bible',
};

function skuTitle(sku: string): string {
	if (TITLES[sku]) return `${TITLES[sku]} — Divine Voice Color`;
	const m = /^general-(regular|largeprint)-(charcoal|plum|white)-(pb|hb)$/.exec(sku);
	if (!m) return sku;
	const [, size, colour, binding] = m;
	return `Father’s Heart Bible — ${size === 'largeprint' ? 'Large Print' : 'Regular Print'}, ${
		colour.charAt(0).toUpperCase() + colour.slice(1)
	}, ${binding === 'hb' ? 'Hardback' : 'Paperback'}`;
}

const esc = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const page = (body: string, status = 200) =>
	new Response(
		`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Your order — Father's Heart Bible</title><style>
body{font-family:system-ui,-apple-system,sans-serif;background:#faf6f2;color:#1a1c1c;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;padding:1.5rem}
.card{max-width:38rem;width:100%;background:#fff;border:1px solid #e4bdc4;border-radius:1rem;padding:2.5rem}
h1{font-size:1.6rem;margin:0 0 .5rem;line-height:1.25}
p{color:#5b3f46;line-height:1.6}
dl{margin:1.5rem 0 0;border-top:1px solid #f0e2e5;padding-top:1.25rem}
dt{font-size:.75rem;text-transform:uppercase;letter-spacing:.1em;color:#9b7f86;margin-top:1rem}
dd{margin:.25rem 0 0;color:#1a1c1c}
ul{margin:.25rem 0 0;padding-left:1.1rem;color:#1a1c1c}
code{background:#faf6f2;padding:.15rem .4rem;border-radius:.3rem;font-size:.85em;word-break:break-all}
address{font-style:normal;white-space:pre-line}
a.btn{display:inline-block;background:#b60057;color:#fff;text-decoration:none;font-weight:700;padding:.85rem 1.8rem;border-radius:999px;margin-top:1.5rem}
input{width:100%;box-sizing:border-box;padding:.7rem .9rem;border:1.5px solid #e4bdc4;border-radius:.5rem;font-size:1rem;margin:.5rem 0 1rem}
button{background:#b60057;color:#fff;border:0;font-weight:700;padding:.8rem 1.8rem;border-radius:999px;font-size:1rem;cursor:pointer}
.badge{display:inline-block;background:#eef7ee;color:#1f6b30;border-radius:999px;padding:.3rem .8rem;font-size:.8rem;font-weight:700}
</style></head><body><div class="card">${body}</div></body></html>`,
		{
			status,
			headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
		},
	);

const lookupForm = (msg = '') =>
	page(
		`<h1>Look up your order</h1><p>${
			msg || 'Paste the order reference from your confirmation email.'
		}</p><form method="GET" action="/order"><label for="s">Order reference</label><input id="s" name="s" placeholder="cs_live_…" autocomplete="off" required><button type="submit">Find my order</button></form><p style="margin-top:1.5rem;font-size:.9rem">Can’t find it? Email <a href="mailto:${SUPPORT}">${SUPPORT}</a> and we’ll look it up for you.</p>`,
	);

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
	const url = new URL(request.url);
	const sid = (url.searchParams.get('s') || '').trim();

	if (!sid) return lookupForm();
	// Shape-check before spending a Stripe call, and so nothing odd reaches the API.
	if (!/^cs_[A-Za-z0-9_]+$/.test(sid)) {
		return lookupForm('That doesn’t look like an order reference. It begins with “cs_”.');
	}
	if (!env.STRIPE_FHB_SECRET_KEY) {
		return page(
			`<h1>Your order is safe</h1><p>We can’t show the details right now, but your payment went through and we have your order. Email <a href="mailto:${SUPPORT}">${SUPPORT}</a> if you’d like confirmation in writing.</p>`,
		);
	}

	const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sid)}`, {
		headers: { Authorization: `Bearer ${env.STRIPE_FHB_SECRET_KEY}` },
	});
	if (!r.ok) {
		return lookupForm(
			'We couldn’t find an order with that reference. Check it against your confirmation email.',
		);
	}
	const s = (await r.json()) as any;
	if (s.payment_status !== 'paid') {
		return page(
			`<h1>This order isn’t complete</h1><p>We found the reference, but no payment was taken — most likely the checkout was closed before finishing. Nothing has been charged.</p><a class="btn" href="/print">Return to the order form →</a>`,
		);
	}

	const m = s.metadata ?? {};
	const ship = s.collected_information?.shipping_details ?? s.shipping_details ?? {};
	const a = ship.address ?? s.customer_details?.address ?? null;
	const amount = ((s.amount_total ?? 0) / 100).toLocaleString('en-US', {
		style: 'currency',
		currency: (s.currency ?? 'usd').toUpperCase(),
	});
	const items = String(m.breakdown ?? '')
		.split(/[,\s]+/)
		.filter(Boolean)
		.map((part: string) => {
			const i = part.lastIndexOf(':');
			return i < 0
				? `<li>${esc(skuTitle(part))}</li>`
				: `<li>${esc(part.slice(i + 1))} × ${esc(skuTitle(part.slice(0, i)))}</li>`;
		})
		.join('');

	const addr = a
		? esc(
				[a.line1, a.line2, `${a.city ?? ''}, ${a.state ?? ''} ${a.postal_code ?? ''}`.trim()]
					.filter(Boolean)
					.join('\n'),
			)
		: '';

	// Set by fhb-order-ship.py when the parcel goes out.
	const tracking = m.tracking ? esc(String(m.tracking)) : '';
	const carrier = m.carrier ? esc(String(m.carrier)) : '';
	const shippedBlock = tracking
		? `<dt>Shipped</dt><dd>${carrier ? `${carrier} · ` : ''}tracking <code>${tracking}</code></dd>`
		: `<dt>Status</dt><dd>Paid and in production. Shipping is free and most orders arrive within 7–10 days.</dd>`;

	return page(
		`<span class="badge">Order confirmed</span>
<h1>Thank you — we have your order.</h1>
<p>A confirmation has been emailed to ${esc(s.customer_details?.email ?? 'you')}. Keep the reference below if you need to ask us anything about it.</p>
<dl>
<dt>What you ordered</dt><dd><ul>${items || '<li>Father’s Heart Bible</li>'}</ul></dd>
<dt>Total paid</dt><dd>${esc(amount)}</dd>
${addr ? `<dt>Shipping to</dt><dd><address>${esc(ship.name ?? '')}\n${addr}</address></dd>` : ''}
${shippedBlock}
<dt>Order reference</dt><dd><code>${esc(sid)}</code></dd>
</dl>
<p style="margin-top:1.5rem;font-size:.9rem">Need to change something? Email <a href="mailto:${SUPPORT}?subject=Order%20${encodeURIComponent(sid)}">${SUPPORT}</a> with your reference and we’ll sort it out.</p>`,
	);
};
