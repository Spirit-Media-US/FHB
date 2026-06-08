// POST /api/review — public review submission endpoint (Cloudflare Pages Function).
//
// Flow: honeypot → validate → Turnstile verify → soft rate-limit → insert as
// `pending` via the Supabase service role. A Bethel cron (fhb-review-moderate.mjs)
// runs the AI moderation pass and flips clean rows to `published` within ~1 min.
//
// Env (set as CF Pages project vars — see scripts side / CLAUDE notes):
//   SUPABASE_FHB_URL, SUPABASE_FHB_SERVICE_ROLE_KEY, TURNSTILE_SECRET_FHB
//   REVIEW_IP_SALT (optional — salts the stored IP hash)

interface Env {
	SUPABASE_FHB_URL: string;
	SUPABASE_FHB_SERVICE_ROLE_KEY: string;
	TURNSTILE_SECRET_FHB: string;
	REVIEW_IP_SALT?: string;
}

interface Payload {
	first_name?: string;
	location?: string;
	stars?: number;
	title?: string;
	body?: string;
	email?: string;
	website?: string; // honeypot — real users never fill this
	turnstileToken?: string;
}

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	});

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

async function sha256(input: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { request, env } = context;

	let payload: Payload;
	try {
		payload = await request.json();
	} catch {
		return json({ ok: false, error: 'bad_request' }, 400);
	}

	// Honeypot — silently accept (so bots think they succeeded) but drop.
	if (clean(payload.website)) return json({ ok: true });

	const first_name = clean(payload.first_name).slice(0, 50);
	const location = clean(payload.location).slice(0, 80);
	const title = clean(payload.title).slice(0, 100);
	const body = clean(payload.body).slice(0, 2000);
	const email = clean(payload.email).slice(0, 120);
	const stars = Number(payload.stars);

	if (!first_name || !location || !title || !body) {
		return json({ ok: false, error: 'missing_fields' }, 400);
	}
	if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
		return json({ ok: false, error: 'bad_stars' }, 400);
	}
	if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
		return json({ ok: false, error: 'bad_email' }, 400);
	}

	// Turnstile verification.
	const token = clean(payload.turnstileToken);
	if (!token) return json({ ok: false, error: 'turnstile_missing' }, 400);
	const ip = request.headers.get('CF-Connecting-IP') || '';
	const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ secret: env.TURNSTILE_SECRET_FHB, response: token, remoteip: ip }),
	})
		.then((r) => r.json() as Promise<{ success: boolean }>)
		.catch(() => ({ success: false }));
	if (!verify.success) return json({ ok: false, error: 'turnstile_failed' }, 403);

	const country_code = request.headers.get('CF-IPCountry') || null;
	const ip_hash = ip ? await sha256(`${env.REVIEW_IP_SALT || 'fhb'}:${ip}`) : null;

	const base = env.SUPABASE_FHB_URL.replace(/\/$/, '');
	const headers = {
		apikey: env.SUPABASE_FHB_SERVICE_ROLE_KEY,
		authorization: `Bearer ${env.SUPABASE_FHB_SERVICE_ROLE_KEY}`,
		'content-type': 'application/json',
	};

	// Soft rate-limit: max 5 submissions per IP per 10 minutes.
	if (ip_hash) {
		const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
		const countRes = await fetch(
			`${base}/rest/v1/fhb_reviews?select=id&ip_hash=eq.${ip_hash}&created_at=gte.${since}`,
			{ headers: { ...headers, prefer: 'count=exact' } },
		);
		const range = countRes.headers.get('content-range') || '';
		const total = Number(range.split('/')[1] || '0');
		if (total >= 5) return json({ ok: false, error: 'rate_limited' }, 429);
	}

	const insert = await fetch(`${base}/rest/v1/fhb_reviews`, {
		method: 'POST',
		headers: { ...headers, prefer: 'return=minimal' },
		body: JSON.stringify({
			first_name,
			location,
			country_code,
			stars,
			title,
			body,
			email: email || null,
			ip_hash,
			status: 'pending',
		}),
	});

	if (!insert.ok) {
		return json({ ok: false, error: 'insert_failed' }, 502);
	}

	return json({ ok: true });
};
