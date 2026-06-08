// /api/reviews — public review wall API (Cloudflare Pages Function).
//
//   GET  /api/reviews?stats=1        → { readers, countries, countryList }
//   GET  /api/reviews?featured=1     → [ featured reviews ]
//   GET  /api/reviews?offset=&country=  → [ published reviews, newest first ]
//   POST /api/reviews                → submit a review (Turnstile-gated)
//
// All Supabase access happens server-side with the service-role key (never
// shipped to the browser); reads use the email-free `fhb_reviews_public` view.
// The static page stays secret-free and has no build-time env dependency.
// A Bethel cron (fhb-review-moderate.mjs) moderates pending rows → published.

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
	website?: string; // honeypot
	turnstileToken?: string;
}

const PAGE_SIZE = 20;

const json = (data: unknown, status = 200, cache = '') =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json', ...(cache ? { 'cache-control': cache } : {}) },
	});

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

async function sha256(input: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
	return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function sb(env: Env) {
	const base = env.SUPABASE_FHB_URL.replace(/\/$/, '');
	const headers = {
		apikey: env.SUPABASE_FHB_SERVICE_ROLE_KEY,
		authorization: `Bearer ${env.SUPABASE_FHB_SERVICE_ROLE_KEY}`,
		'content-type': 'application/json',
	};
	return { base, headers };
}

// ── Reads ────────────────────────────────────────────────────────────────
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
	const url = new URL(request.url);
	const { base, headers } = sb(env);

	if (url.searchParams.get('stats')) {
		const stats = await fetch(`${base}/rest/v1/rpc/fhb_review_stats`, {
			method: 'POST',
			headers,
			body: '{}',
		})
			.then((r) => r.json() as Promise<{ readers: number; countries: number }>)
			.catch(() => ({ readers: 0, countries: 0 }));
		const codes = await fetch(`${base}/rest/v1/fhb_reviews_public?select=country_code`, { headers })
			.then((r) => r.json() as Promise<{ country_code: string | null }[]>)
			.catch(() => []);
		const countryList = [...new Set(codes.map((r) => r.country_code).filter(Boolean))].sort();
		return json({ ...stats, countryList }, 200, 'public, max-age=30');
	}

	if (url.searchParams.get('featured')) {
		const rows = await fetch(
			`${base}/rest/v1/fhb_reviews_public?featured=eq.true&order=created_at.desc&limit=4`,
			{ headers },
		)
			.then((r) => r.json())
			.catch(() => []);
		return json(rows, 200, 'public, max-age=30');
	}

	const offset = Math.max(0, Number.parseInt(url.searchParams.get('offset') || '0', 10) || 0);
	const country = (url.searchParams.get('country') || '')
		.replace(/[^A-Za-z]/g, '')
		.slice(0, 2)
		.toUpperCase();
	let q = `fhb_reviews_public?order=created_at.desc&limit=${PAGE_SIZE}&offset=${offset}`;
	if (country) q += `&country_code=eq.${country}`;
	const rows = await fetch(`${base}/rest/v1/${q}`, { headers })
		.then((r) => r.json())
		.catch(() => []);
	return json(rows, 200, 'public, max-age=15');
};

// ── Submit ───────────────────────────────────────────────────────────────
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
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

	if (!first_name || !location || !title || !body)
		return json({ ok: false, error: 'missing_fields' }, 400);
	if (!Number.isInteger(stars) || stars < 1 || stars > 5)
		return json({ ok: false, error: 'bad_stars' }, 400);
	if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
		return json({ ok: false, error: 'bad_email' }, 400);

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
	const { base, headers } = sb(env);

	// Soft rate-limit: max 5 submissions per IP per 10 minutes.
	if (ip_hash) {
		const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
		const countRes = await fetch(
			`${base}/rest/v1/fhb_reviews?select=id&ip_hash=eq.${ip_hash}&created_at=gte.${since}`,
			{ headers: { ...headers, prefer: 'count=exact' } },
		);
		const total = Number((countRes.headers.get('content-range') || '').split('/')[1] || '0');
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
	if (!insert.ok) return json({ ok: false, error: 'insert_failed' }, 502);
	return json({ ok: true });
};
