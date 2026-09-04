// /print-webhook — Stripe webhook for every store sale (Cloudflare Pages Function).
//
// On `checkout.session.completed` it emails us the fulfilment details and the buyer
// their confirmation, then stamps `notified_at` on the session so an order nobody was
// told about can be found later. Covers all three kinds the store creates:
// `dvc_print` (the live /print checkout), `print_bulk` (the retired 25-copy path) and
// `ebook_direct`. Signature-verified with STRIPE_PRINT_WEBHOOK_SECRET.
//
// It ACKs 2xx for anything it deliberately ignores, but answers 5xx when an email
// genuinely failed, so Stripe redelivers instead of the order vanishing quietly.
//
// NB: path is /print-webhook, not /api/* — the apex router proxies /api/* to
// the community app, so this marketing function lives off that prefix.

interface Env {
	STRIPE_PRINT_WEBHOOK_SECRET?: string;
	// Also used to stamp notified_at back onto the session (see markNotified).
	STRIPE_FHB_SECRET_KEY?: string;
	MAILGUN_API_KEY?: string;
	MAILGUN_SENDING_DOMAIN?: string;
	PRINT_ORDER_NOTIFY_TO?: string;
}

const NOTIFY_FROM = 'FHB Orders <orders@send.spiritmediapublishing.com>';
const NOTIFY_TO_DEFAULT = 'kevin@spiritmediapublishing.com';

function hexToBytes(hex: string): Uint8Array | null {
	if (hex.length % 2 !== 0) return null;
	const out = new Uint8Array(hex.length / 2);
	for (let i = 0; i < out.length; i++) {
		const b = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
		if (Number.isNaN(b)) return null;
		out[i] = b;
	}
	return out;
}
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}

// Verify Stripe's "t=…,v1=…" signature over "<t>.<rawBody>" (HMAC-SHA256).
async function verify(raw: string, header: string, secret: string): Promise<boolean> {
	const parts = Object.fromEntries(
		header.split(',').map((s) => s.trim().split('=', 2) as [string, string]),
	);
	const t = Number(parts.t);
	if (!Number.isFinite(t) || Math.abs(Math.floor(Date.now() / 1000) - t) > 300) return false;
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const sig = new Uint8Array(
		await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${raw}`)),
	);
	const v1 = hexToBytes(parts.v1 ?? '');
	return !!v1 && timingSafeEqual(sig, v1);
}

function fmtAddr(a: Record<string, string> | null | undefined): string {
	if (!a) return '(no address)';
	return [
		a.line1,
		a.line2,
		`${a.city ?? ''}, ${a.state ?? ''} ${a.postal_code ?? ''}`.trim(),
		a.country,
	]
		.filter(Boolean)
		.join('\n');
}

// metadata.breakdown is the raw SKU tally dvc-checkout writes ("dads:1",
// "general-largeprint-plum-hb:2"). Fine in the internal notification, wrong in a
// customer's confirmation — turn it into something a buyer recognises.
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
	const c = colour.charAt(0).toUpperCase() + colour.slice(1);
	return `Father’s Heart Bible — ${size === 'largeprint' ? 'Large Print' : 'Regular Print'}, ${c}, ${binding === 'hb' ? 'Hardback' : 'Paperback'}`;
}

function fmtOrder(breakdown: string | undefined): string {
	if (!breakdown) return 'Father’s Heart Bible';
	return breakdown
		.split(/[,\s]+/)
		.filter(Boolean)
		.map((part) => {
			const i = part.lastIndexOf(':');
			if (i < 0) return `  ${skuTitle(part)}`;
			const qty = part.slice(i + 1);
			return `  ${qty} × ${skuTitle(part.slice(0, i))}`;
		})
		.join('\n');
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
	const ack = () => new Response('ok', { status: 200 });
	// A 5xx makes Stripe redeliver this event with backoff for up to 3 days. Used only
	// when an email actually failed: the old code swallowed that, so a Mailgun outage
	// meant an order nobody was ever told about. If one of the two sends succeeded, the
	// retry re-sends it — a duplicate confirmation is a far smaller harm than a lost
	// order, and the reconciler (fhb-order-reconcile.py) catches anything that stays
	// unsent past the retry window.
	const retry = () => new Response('email failed — please retry', { status: 500 });
	const raw = await request.text();
	const sig = request.headers.get('stripe-signature') ?? '';

	if (!env.STRIPE_PRINT_WEBHOOK_SECRET) return ack(); // not configured yet
	if (!(await verify(raw, sig, env.STRIPE_PRINT_WEBHOOK_SECRET))) {
		return new Response('bad signature', { status: 400 });
	}

	let event: any;
	try {
		event = JSON.parse(raw);
	} catch {
		return ack();
	}
	if (event?.type !== 'checkout.session.completed') return ack();
	const s = event.data?.object ?? {};
	// Both checkout paths land here: the retired 25-copy /print-checkout stamps
	// `print_bulk`, the live /dvc-checkout stamps `dvc_print`. Matching only the
	// former meant NO /print order notified anyone between the mix-and-match
	// rewrite and 2026-09-03, when a customer asked why he got no confirmation.
	// eBook sales (`ebook_direct`) reached this endpoint too and were dropped: no
	// notification to us, no record, and the buyer's only route to their download
	// was the success page — close that tab and the link was gone, because no email
	// ever carried it. Handled below, before the print-shaped fields are read.
	const kind = s?.metadata?.kind;
	if (kind !== 'print_bulk' && kind !== 'dvc_print' && kind !== 'ebook_direct') return ack();

	const email = s.customer_details?.email ?? '(no email)';
	// Stripe moved the collected address to collected_information.shipping_details;
	// top-level shipping_details is null on current API versions. Try newest first.
	const ship =
		s.collected_information?.shipping_details ?? s.shipping_details ?? s.customer_details ?? {};
	const name = ship.name ?? s.customer_details?.name ?? '(no name)';
	const amount = ((s.amount_total ?? 0) / 100).toLocaleString('en-US', {
		style: 'currency',
		currency: (s.currency ?? 'usd').toUpperCase(),
	});
	const tax = s.total_details?.amount_tax
		? (s.total_details.amount_tax / 100).toLocaleString('en-US', {
				style: 'currency',
				currency: 'USD',
			})
		: '$0.00';
	const m = s.metadata ?? {};

	// Stamp the session once its emails are away. This is what makes an un-notified
	// order *findable*: fhb-order-reconcile.py sweeps paid sessions missing
	// `notified_at` and sends them itself. Stripe holds the mark, so there is no
	// second ledger to drift out of step with the orders it describes. Best-effort —
	// a failed stamp only costs a duplicate send from the reconciler, never a miss.
	const markNotified = async () => {
		if (!env.STRIPE_FHB_SECRET_KEY || !s.id) return;
		try {
			await fetch(`https://api.stripe.com/v1/checkout/sessions/${s.id}`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${env.STRIPE_FHB_SECRET_KEY}`,
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					'metadata[notified_at]': new Date().toISOString(),
				}),
			});
		} catch {
			/* the reconciler is the backstop */
		}
	};

	// Returns whether the message was actually accepted, so a failed send can be
	// escalated rather than swallowed (see the retry note at the end of the handler).
	const send = async (to: string, subject: string, body: string, replyTo?: string) => {
		if (!env.MAILGUN_API_KEY) return false;
		const domain = env.MAILGUN_SENDING_DOMAIN || 'send.spiritmediapublishing.com';
		const form = new URLSearchParams();
		form.set('from', NOTIFY_FROM);
		form.set('to', to);
		form.set('subject', subject);
		form.set('text', body);
		form.set(
			'html',
			`<pre style="font:14px/1.5 ui-monospace,monospace">${body
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')}</pre>`,
		);
		form.set('o:tracking', 'no');
		if (replyTo) form.set('h:Reply-To', replyTo);
		try {
			const r = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
				method: 'POST',
				headers: {
					Authorization: `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}`,
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: form,
			});
			return r.ok;
		} catch {
			return false;
		}
	};

	// eBook: no address, no production run — the buyer needs their download link in
	// writing, because the success page is otherwise the only place it ever appears.
	if (kind === 'ebook_direct') {
		const link = `https://fathersheartbible.com/ebook-download?s=${encodeURIComponent(s.id ?? '')}`;
		const okKevin = await send(
			env.PRINT_ORDER_NOTIFY_TO || NOTIFY_TO_DEFAULT,
			`📖 eBook sale — ${amount}`,
			`New eBook sale — Father's Heart Bible\n\n` +
				`Total: ${amount}\nCustomer email: ${email}\nStripe session: ${s.id ?? '?'}\n`,
			email !== '(no email)' ? email : undefined,
		);
		const okCust =
			email === '(no email)' ||
			(await send(
				email,
				'Your Father’s Heart Bible eBook',
				`Thank you — your eBook is ready.\n\n` +
					`Download it here (the link stays valid, so keep this email):\n${link}\n\n` +
					`It's a DRM-free EPUB — open it in Apple Books, Google Play Books, Kindle,\n` +
					`or any reader. Total paid: ${amount}\n\n` +
					`Order reference: ${s.id ?? '?'}\n\n` +
					`Trouble opening it? Just reply to this email.\n\nSpirit Media Publishing\n`,
				NOTIFY_TO_DEFAULT,
			));
		if (okKevin && okCust) {
			await markNotified();
			return ack();
		}
		return retry();
	}

	const text =
		`New print order — Father's Heart Bible\n\n` +
		`Total: ${amount} (incl. tax ${tax})\n` +
		`Copies: ${m.total ?? '?'}  ·  Discount: ${m.pct_off ?? '?'}% off\n` +
		`Editions:\n${fmtOrder(m.breakdown)}\n\n` +
		`Ship to:\n${name}\n${fmtAddr(ship.address)}\n\n` +
		`Customer email: ${email}\n` +
		`Phone: ${s.customer_details?.phone ?? '(none)'}\n` +
		`Stripe session: ${s.id ?? '?'}\n`;
	// The buyer's own confirmation. Until 2026-09-03 we sent the customer NOTHING —
	// Stripe's payment receipt was the only thing they ever received, so a buyer had
	// no confirmation their ORDER (as opposed to their payment) existed.
	const custText =
		`Thank you — we've received your order.\n\n` +
		`What you ordered:\n${fmtOrder(m.breakdown)}\n\n` +
		`Total paid: ${amount}\n` +
		`Order reference: ${s.id ?? '?'}\n\n` +
		`Shipping to:\n${name}\n${fmtAddr(ship.address)}\n\n` +
		(Number(m.total) > 9
			? `Shipping is free. Larger bulk orders take about 3–4 weeks to reach you.\n\n`
			: `Shipping is free, and most orders arrive within 7–10 days.\n\n`) +
		`Need to change or ask about this order? Just reply to this email and it comes\n` +
		`straight to us — please include your order reference above.\n\n` +
		`Spirit Media Publishing\n`;

	const okKevin = await send(
		env.PRINT_ORDER_NOTIFY_TO || NOTIFY_TO_DEFAULT,
		`📚 Print order — ${m.total ?? '?'} copies · ${amount}`,
		text,
		email !== '(no email)' ? email : undefined,
	);
	const okCust =
		email === '(no email)' ||
		(await send(email, `Your Father’s Heart Bible order — ${amount}`, custText, NOTIFY_TO_DEFAULT));

	if (okKevin && okCust) {
		await markNotified();
		return ack();
	}
	return retry();
};
