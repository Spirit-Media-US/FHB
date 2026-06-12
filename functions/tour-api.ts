// /tour-api — records welcome-tour responses (Cloudflare Pages Function).
//
//   POST /tour-api { response, step?, path? }
//     response ∈ offered | accepted | declined | completed | skipped
//   → inserts a row into Supabase `fhb_tour_events` (service-role, server-side).
//
// Lets us see whether the onboarding tour is wanted (accepted vs declined vs
// completed rates) without shipping any analytics/gtag to the browser — FHB is
// CF-Web-Analytics only. Path is /tour-api (not /api/*) because the apex router
// proxies /api/* to the community app; marketing functions live off that prefix.

interface Env {
	SUPABASE_FHB_URL: string;
	SUPABASE_FHB_SERVICE_ROLE_KEY: string;
}

const RESPONSES = ['offered', 'accepted', 'declined', 'completed', 'skipped'];

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
	let body: { response?: string; step?: number; path?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'bad-json' }, 400);
	}

	const response = String(body.response || '');
	if (!RESPONSES.includes(response)) return json({ error: 'bad-response' }, 400);

	const step = Number.isFinite(body.step) ? Math.trunc(body.step as number) : null;
	const path = typeof body.path === 'string' ? body.path.slice(0, 200) : null;
	const ua = (request.headers.get('user-agent') || '').slice(0, 300);

	const res = await fetch(`${env.SUPABASE_FHB_URL}/rest/v1/fhb_tour_events`, {
		method: 'POST',
		headers: {
			apikey: env.SUPABASE_FHB_SERVICE_ROLE_KEY,
			authorization: `Bearer ${env.SUPABASE_FHB_SERVICE_ROLE_KEY}`,
			'content-type': 'application/json',
			prefer: 'return=minimal',
		},
		body: JSON.stringify({ response, step, path, ua }),
	});

	if (!res.ok) return json({ error: 'store-failed' }, 502);
	return json({ ok: true });
};

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
	});
}
