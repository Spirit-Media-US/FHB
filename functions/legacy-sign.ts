// /legacy-sign — signs the Father's Heart Legacy commitment on /legacy/ (Cloudflare Pages
// Function, Kevin 2026-10-13). Same shape as /words-join: upsert the contact into the SMP
// GoHighLevel location, then ADD a tag (never the upsert `tags` field, which REPLACES the
// set). No money, no membership: a name and an email under a commitment.
// NB: path is /legacy-sign, not /api/* — the apex router proxies /api/* to the community app.

interface Env {
	GHL_API_TOKEN: string;
}

const GHL = 'https://services.leadconnectorhq.com';
const LOCATION_ID = 'oPP9m0hKJpU6cFB7yD9w'; // SMP main — all FHB sending runs through SMP GHL/LC
const SIGNED_TAG = 'fhb-legacy-signed';

const json = (data: unknown, status = 200) =>
	new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	});

const clean = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
	let payload: Record<string, unknown>;
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'invalid JSON' }, 400);
	}

	// Honeypot filled → pretend success, do nothing.
	if (clean(payload.website)) return json({ ok: true });

	const email = clean(payload.email).toLowerCase();
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
		return json({ error: 'invalid email' }, 400);
	}
	const name = clean(payload.name).replace(/\s+/g, ' ').slice(0, 80);
	if (name.length < 2) return json({ error: 'name required' }, 400);

	const headers = {
		Authorization: `Bearer ${env.GHL_API_TOKEN}`,
		Version: '2021-07-28',
		'content-type': 'application/json',
	};

	const upsertRes = await fetch(`${GHL}/contacts/upsert`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			locationId: LOCATION_ID,
			email,
			name,
			source: "FHB Father's Heart Legacy (signed)",
		}),
	});
	if (!upsertRes.ok) return json({ error: 'signing failed' }, 502);
	const upsert = (await upsertRes.json()) as { contact?: { id?: string } };
	const contactId = upsert?.contact?.id;
	if (!contactId) return json({ error: 'signing failed' }, 502);

	// Additive tagging — never touches the contact's existing tags.
	const tagRes = await fetch(`${GHL}/contacts/${contactId}/tags`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ tags: [SIGNED_TAG] }),
	});
	if (!tagRes.ok) return json({ error: 'signing failed' }, 502);

	return json({ ok: true });
};
