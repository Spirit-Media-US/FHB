// /words-join — email/SMS list signup for the Messages from the Father series
// (Cloudflare Pages Function). Upserts the contact into the SMP GoHighLevel
// location and ADDS the series tag (two-step: upsert without tags, then the
// add-tags endpoint — GHL's upsert `tags` field REPLACES the tag set, which
// would wipe existing tags on long-standing contacts).
//
// NB: path is /words-join, not /api/* — the apex router proxies /api/* to the
// community app, so marketing functions live off that prefix (see review-api).

interface Env {
	GHL_API_TOKEN: string;
}

const GHL = 'https://services.leadconnectorhq.com';
const LOCATION_ID = 'oPP9m0hKJpU6cFB7yD9w'; // SMP main — all FHB sending runs through SMP GHL/LC
const SERIES_TAG = 'messages-from-the-father';

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
	const phoneRaw = clean(payload.phone).replace(/[^\d+]/g, '');
	const phone = /^\+?\d{10,15}$/.test(phoneRaw)
		? phoneRaw.startsWith('+')
			? phoneRaw
			: `+1${phoneRaw.slice(-10)}`
		: '';
	const page = clean(payload.page).slice(0, 120);

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
			...(phone ? { phone } : {}),
			source: `FHB Messages from the Father${page ? ` (${page})` : ''}`,
		}),
	});
	if (!upsertRes.ok) return json({ error: 'signup failed' }, 502);
	const upsert = (await upsertRes.json()) as { contact?: { id?: string } };
	const contactId = upsert?.contact?.id;
	if (!contactId) return json({ error: 'signup failed' }, 502);

	// Additive tagging — never touches the contact's existing tags.
	const tags = [SERIES_TAG, ...(phone ? [`${SERIES_TAG}-sms`] : [])];
	const tagRes = await fetch(`${GHL}/contacts/${contactId}/tags`, {
		method: 'POST',
		headers,
		body: JSON.stringify({ tags }),
	});
	if (!tagRes.ok) return json({ error: 'signup failed' }, 502);

	return json({ ok: true });
};
