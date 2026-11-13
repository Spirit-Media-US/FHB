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

import {
	allowCheck,
	answerBody,
	constantTime,
	emailTag,
	type FirstStatus,
	sameOrigin,
} from '../src/lib/firstOrderGuard.ts';
import { FIRST_ORDER_CODE, FIRST_ORDER_PCT } from '../src/lib/order-pricing.ts';
import { checkoutForm, EMAIL_RE, encodeForm, type OrderPayload } from '../src/lib/storeEngine.ts';

// The catalogue, prices and sale metadata live in the SMP store engine (plan 3fb Phase 2); re-exported so every
// existing importer of this file keeps working.
export {
	bibleSaleMetadata,
	bibleSkuIsbn,
	bookSaleMetadata,
	STRIPE_META_KEYS_MAX,
	setSavings,
} from '../src/lib/storeEngine.ts';

interface Env {
	STRIPE_FHB_SECRET_KEY?: string;
}

// FIRST ORDER, 15% (Kevin 2026-10-03; WELCOME15). Stripe's own first_time_transaction check
// cannot be trusted alone: every guest checkout creates a FRESH Customer, so a repeat buyer
// always looks new to it (MEASURED 2026-10-03: a session pre-applying the code for an email
// with two paid orders was created at the discounted total). So the server decides, from the
// store's own record: a prior PAID Checkout Session under this email, or a succeeded charge on
// a Customer with this email, means it is not a first order. The session-list email filter is
// case-sensitive, so the address is tried as typed and lowercased. Any lookup failure answers
// "not first" — the buyer still gets the volume tier; we never give the offer on a guess.
async function isFirstOrder(email: string, key: string): Promise<boolean> {
	const get = async (path: string) => {
		const r = await fetch(`https://api.stripe.com/v1/${path}`, {
			headers: { authorization: `Bearer ${key}` },
		});
		if (!r.ok) throw new Error(`stripe ${r.status}`);
		return (await r.json()) as { data: Record<string, unknown>[] };
	};
	try {
		for (const e of new Set([email, email.toLowerCase()])) {
			const s = await get(
				`checkout/sessions?status=complete&limit=10&customer_details[email]=${encodeURIComponent(e)}`,
			);
			if (s.data.some((x) => x.payment_status === 'paid')) return false;
		}
		const c = await get(
			`customers/search?limit=10&query=${encodeURIComponent(`email:'${email.toLowerCase()}'`)}`,
		);
		for (const cust of c.data) {
			const ch = await get(`charges?limit=10&customer=${cust.id}`);
			if (ch.data.some((x) => x.paid === true && x.status === 'succeeded')) return false;
		}
		return true;
	} catch {
		return false;
	}
}

/** The live WELCOME15 promotion code, only if its coupon still says FIRST_ORDER_PCT. */
async function firstOrderPromo(key: string): Promise<string | null> {
	try {
		const r = await fetch(
			`https://api.stripe.com/v1/promotion_codes?active=true&limit=1&code=${FIRST_ORDER_CODE}`,
			{ headers: { authorization: `Bearer ${key}` } },
		);
		if (!r.ok) return null;
		const d = (await r.json()) as {
			data: { id: string; coupon?: { percent_off?: number; valid?: boolean } }[];
		};
		const p = d.data[0];
		return p && p.coupon?.valid && p.coupon.percent_off === FIRST_ORDER_PCT ? p.id : null;
	} catch {
		return null;
	}
}

// ── 3ef-1 (pmseoaeo 2026-11-13; evidence aeo-state/checkout-expiry-3ef-20261113.json) ──────────────────────────────
// The browser's checkout_start beacon counted 3 starts on days Stripe created 13 sessions: 57 of 94 expired sessions
// were scripted bursts, probes or tests, and 20 POSTs that died with a 502 left no trace at all. Every POST that is
// not the order form's first-order lookup now reports ITSELF, server-side, to the same /_evt sink (kind
// checkout_server): tag site|qa, HTTP status, error code, path. Aggregate only — no email, no cart, no IP.
// qa = what ONE request shows: a *.pages.dev preview host, an example.* email, an x-fhb-qa header, or a scripted /
// headless user agent. Bursts need several requests to see; the daily ledger classifies those from Stripe timestamps.
const QA_UA = /headless|playwright|puppeteer|python|curl|wget|node-fetch|undici|go-http|java\//i;
export function checkoutTag(
	host: string,
	email: string,
	ua: string,
	qaHeader: string | null,
): 'site' | 'qa' {
	return host.endsWith('.pages.dev') ||
		/@example\.(com|org|net)$/i.test(email) ||
		!!qaHeader ||
		QA_UA.test(ua)
		? 'qa'
		: 'site';
}
export async function checkoutReport(
	request: Request,
	res: Response,
	body: Record<string, unknown> | null,
) {
	if (body?.firstOrderCheck) return null; // the order form's "is this a first order?" lookup creates no session
	let reason = '';
	if (res.status >= 400) {
		const j = (await res
			.clone()
			.json()
			.catch(() => null)) as { error?: string } | null;
		reason = String(j?.error ?? `http_${res.status}`);
	}
	const host = new URL(request.url).hostname;
	return {
		kind: 'checkout_server',
		tag: checkoutTag(
			host,
			String(body?.email ?? ''),
			request.headers.get('user-agent') ?? '',
			request.headers.get('x-fhb-qa'),
		),
		status: res.status,
		reason,
		path: String(body?.returnPath ?? '').slice(0, 60),
	};
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const body = (await context.request
		.clone()
		.json()
		.catch(() => null)) as Record<string, unknown> | null;
	let res: Response;
	try {
		res = await handlePost(context);
	} catch (e) {
		res = new Response(JSON.stringify({ error: 'exception' }), {
			status: 500,
			headers: { 'content-type': 'application/json' },
		});
		console.error('dvc-checkout threw', e);
	}
	if (typeof context.waitUntil === 'function') {
		const ev = await checkoutReport(context.request, res, body);
		if (ev)
			context.waitUntil(
				fetch('https://fathersheartbible.com/_evt', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify(ev),
				}).catch(() => undefined),
			);
	}
	return res;
};

const handlePost: PagesFunction<Env> = async (context) => {
	const { request, env } = context;
	const json = (body: unknown, status = 200) =>
		new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

	let payload: OrderPayload;
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'bad_request' }, 400);
	}

	// The order form asks before checkout whether this email gets WELCOME15, so the total it shows is
	// the total the buyer will pay (no understated totals). Same check checkout itself uses; fails
	// to "not first", never to a discount. Answers only yes/no, and creates nothing.
	if (payload.firstOrderCheck) {
		const headers = { 'content-type': 'application/json', 'cache-control': 'no-store' };
		const reply = (status: FirstStatus) => new Response(answerBody(status), { headers });
		// Same-origin only: the order form on our own pages is the sole legitimate caller.
		if (!sameOrigin(request.headers)) {
			return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers });
		}
		return constantTime(async () => {
			const em = String(payload.email ?? '')
				.trim()
				.toLowerCase();
			if (!env.STRIPE_FHB_SECRET_KEY || em.length > 254 || !EMAIL_RE.test(em)) {
				return reply('unknown');
			}
			const tag = await emailTag(em);
			const ip = request.headers.get('cf-connecting-ip') ?? '';
			// No cache to count in = no way to limit = fail closed to "unknown" (list price).
			const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
			const ok = cache ? await allowCheck(cache, ip, tag) : false;
			if (!ok) {
				console.log(`first-order-check limited tag=${tag}`);
				return reply('unknown');
			}
			const first =
				(await isFirstOrder(em, env.STRIPE_FHB_SECRET_KEY)) &&
				(await firstOrderPromo(env.STRIPE_FHB_SECRET_KEY)) !== null;
			return reply(first ? 'first' : 'repeat');
		});
	}

	const r = await checkoutForm(payload, request.url, {
		enabled: Boolean(env.STRIPE_FHB_SECRET_KEY),
		isFirstOrder: (em) => isFirstOrder(em, env.STRIPE_FHB_SECRET_KEY as string),
		firstOrderPromo: () => firstOrderPromo(env.STRIPE_FHB_SECRET_KEY as string),
	});
	if (!('form' in r)) return json(r.body, r.status);
	const { form } = r;
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
