// /review-api — public review wall API (Cloudflare Pages Function).
//
//   GET  /review-api?stats=1        → { readers, countries, countryList }
//   GET  /review-api?featured=1     → [ featured reviews + reaction counts ]
//   GET  /review-api?offset=&country=  → [ published reviews + reaction counts ]
//   POST /review-api                → submit a review (Turnstile-gated)
//   POST /review-api {action:"react"} → love/like/dislike a review (toggle)
//
// All Supabase access happens server-side with the service-role key (never
// shipped to the browser); reads use the email-free `fhb_reviews_public` view.
// The static page stays secret-free and has no build-time env dependency.
// A Bethel cron (fhb-review-moderate.mjs) moderates pending rows → published.
//
// NB: path is /review-api, not /api/* — the apex router proxies /api/* to the
// community app, so the marketing function must live off that prefix.

interface Env {
	SUPABASE_FHB_URL: string;
	SUPABASE_FHB_SERVICE_ROLE_KEY: string;
	TURNSTILE_SECRET_FHB: string;
	REVIEW_IP_SALT?: string;
}

interface Payload {
	action?: string;
	first_name?: string;
	location?: string;
	stars?: number;
	title?: string;
	body?: string;
	email?: string;
	website?: string; // honeypot
	turnstileToken?: string;
	// react action
	review_id?: string;
	voter?: string;
	kind?: string;
}

const PAGE_SIZE = 20;
const KINDS = ['love', 'like', 'dislike'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// review_id -> {love, like, dislike}
async function reactionCounts(base: string, headers: Record<string, string>, ids: string[]) {
	const out: Record<string, { love: number; like: number; dislike: number }> = {};
	for (const id of ids) out[id] = { love: 0, like: 0, dislike: 0 };
	if (!ids.length) return out;
	const inList = ids.map((i) => `"${i}"`).join(',');
	const rows = await fetch(
		`${base}/rest/v1/fhb_review_reaction_counts?review_id=in.(${inList})&select=review_id,kind,n`,
		{ headers },
	)
		.then((r) => r.json() as Promise<{ review_id: string; kind: string; n: number }[]>)
		.catch(() => []);
	for (const r of rows) {
		if (out[r.review_id] && KINDS.includes(r.kind)) out[r.review_id][r.kind] = r.n;
	}
	return out;
}

async function withReactions(base: string, headers: Record<string, string>, rows: any[]) {
	if (!Array.isArray(rows) || !rows.length) return rows;
	const counts = await reactionCounts(
		base,
		headers,
		rows.map((r) => r.id),
	);
	return rows.map((r) => ({ ...r, reactions: counts[r.id] || { love: 0, like: 0, dislike: 0 } }));
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
		return json(await withReactions(base, headers, rows), 200, 'public, max-age=20');
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
	return json(await withReactions(base, headers, rows), 200, 'public, max-age=15');
};

// ── React (love / like / dislike), toggle on repeat ────────────────────────
async function handleReact(payload: Payload, env: Env) {
	const review_id = clean(payload.review_id);
	const voter = clean(payload.voter).slice(0, 64);
	const kind = clean(payload.kind);
	if (!UUID_RE.test(review_id) || !voter || !KINDS.includes(kind)) {
		return json({ ok: false, error: 'bad_react' }, 400);
	}
	const { base, headers } = sb(env);
	const v = encodeURIComponent(voter);
	const existing = await fetch(
		`${base}/rest/v1/fhb_review_reactions?review_id=eq.${review_id}&voter=eq.${v}&select=id,kind`,
		{ headers },
	)
		.then((r) => r.json() as Promise<{ id: string; kind: string }[]>)
		.catch(() => []);

	let mine: string | null = kind;
	if (existing.length) {
		if (existing[0].kind === kind) {
			await fetch(`${base}/rest/v1/fhb_review_reactions?id=eq.${existing[0].id}`, {
				method: 'DELETE',
				headers: { ...headers, prefer: 'return=minimal' },
			});
			mine = null; // toggled off
		} else {
			await fetch(`${base}/rest/v1/fhb_review_reactions?id=eq.${existing[0].id}`, {
				method: 'PATCH',
				headers: { ...headers, prefer: 'return=minimal' },
				body: JSON.stringify({ kind }),
			});
		}
	} else {
		await fetch(`${base}/rest/v1/fhb_review_reactions`, {
			method: 'POST',
			headers: { ...headers, prefer: 'return=minimal' },
			body: JSON.stringify({ review_id, voter, kind }),
		});
	}
	const counts = await reactionCounts(base, headers, [review_id]);
	return json({ ok: true, reactions: counts[review_id], mine });
}

// ── Submit ───────────────────────────────────────────────────────────────
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
	let payload: Payload;
	try {
		payload = await request.json();
	} catch {
		return json({ ok: false, error: 'bad_request' }, 400);
	}

	if (payload.action === 'react') return handleReact(payload, env);

	// Review submission moved to the authenticated /api/review-submit endpoint
	// (FH Family magic-link sign-in). This endpoint no longer accepts ungated
	// submissions — that would bypass the accountability gate.
	return json({ ok: false, error: 'use_review_submit' }, 410);
};
