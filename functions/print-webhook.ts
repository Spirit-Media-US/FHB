// /print-webhook — Stripe webhook for bulk print orders (Cloudflare Pages Function).
//
// On `checkout.session.completed` for a print_bulk order, emails Kevin the
// order details (what to print + where to ship). Signature-verified with
// STRIPE_PRINT_WEBHOOK_SECRET. Always ACKs 2xx so Stripe doesn't retry-storm.
//
// NB: path is /print-webhook, not /api/* — the apex router proxies /api/* to
// the community app, so this marketing function lives off that prefix.

interface Env {
	STRIPE_PRINT_WEBHOOK_SECRET?: string;
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

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
	const ack = () => new Response('ok', { status: 200 });
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
	if (s?.metadata?.kind !== 'print_bulk') return ack();

	const email = s.customer_details?.email ?? '(no email)';
	const ship = s.shipping_details ?? s.customer_details ?? {};
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

	const text =
		`New bulk print order — Father's Heart Bible\n\n` +
		`Total: ${amount} (incl. tax ${tax})\n` +
		`Copies: ${m.total ?? '?'}  ·  Discount: ${m.pct_off ?? '?'}% off\n` +
		`Editions: ${m.breakdown ?? '?'}\n\n` +
		`Ship to:\n${name}\n${fmtAddr(ship.address)}\n\n` +
		`Customer email: ${email}\n` +
		`Phone: ${s.customer_details?.phone ?? '(none)'}\n` +
		`Stripe session: ${s.id ?? '?'}\n`;
	const html = `<pre style="font:14px/1.5 ui-monospace,monospace">${text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')}</pre>`;

	// Email the notification (fire-and-forget; still ACK Stripe regardless).
	if (env.MAILGUN_API_KEY) {
		const domain = env.MAILGUN_SENDING_DOMAIN || 'send.spiritmediapublishing.com';
		const body = new URLSearchParams();
		body.set('from', NOTIFY_FROM);
		body.set('to', env.PRINT_ORDER_NOTIFY_TO || NOTIFY_TO_DEFAULT);
		body.set('subject', `📚 Bulk order — ${m.total ?? '?'} copies · ${amount}`);
		body.set('text', text);
		body.set('html', html);
		body.set('o:tracking', 'no');
		try {
			await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
				method: 'POST',
				headers: {
					Authorization: `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}`,
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body,
			});
		} catch {
			/* swallow — Stripe still gets its ACK; retry not helpful for email */
		}
	}
	return ack();
};
