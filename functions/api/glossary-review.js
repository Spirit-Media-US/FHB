// POST /api/glossary-review — native reviewers submit approval or corrections
// for a language's FHB key-term glossary (/glossary-review/<lang> pages).
// Upserts the reviewer as a GHL contact in the FHB location, tags the verdict
// (glossary-<lang>-approved | glossary-<lang>-corrections), and stores the
// full submission as a contact note. Token lives in the Pages environment
// (env.GHL_TOKEN_FHB) — never in the browser. Pattern: SMP author-survey.

const FHB_LOCATION_ID = 'w9rV5XqCu0vCP39MFseG';
const GHL = 'https://services.leadconnectorhq.com';

const json = (obj, status = 200) =>
	new Response(JSON.stringify(obj), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

export async function onRequestPost({ request, env }) {
	const token = env.GHL_TOKEN_FHB;
	if (!token) return json({ ok: false, error: 'Server not configured.' }, 500);

	let body;
	try {
		body = await request.json();
	} catch {
		return json({ ok: false, error: 'Invalid request.' }, 400);
	}

	const lang = String(body.lang || '').toLowerCase();
	const language = String(body.language || '').slice(0, 60);
	const name = String(body.name || '')
		.trim()
		.slice(0, 120);
	const email = String(body.email || '')
		.trim()
		.slice(0, 200);
	const verdict = body.verdict === 'approved' ? 'approved' : 'corrections';
	const notes = String(body.notes || '').slice(0, 8000);

	if (!/^[a-z]{2,4}$/.test(lang) || !name || !/.+@.+\..+/.test(email)) {
		return json({ ok: false, error: 'Name, valid email, and language are required.' }, 400);
	}
	if (verdict === 'corrections' && !notes.trim()) {
		return json({ ok: false, error: 'Please describe the corrections needed.' }, 400);
	}

	const headers = {
		Authorization: `Bearer ${token}`,
		Version: '2021-07-28',
		'Content-Type': 'application/json',
	};

	// Upsert the reviewer with verdict tags.
	const up = await fetch(`${GHL}/contacts/upsert`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			locationId: FHB_LOCATION_ID,
			name,
			email,
			source: 'glossary-review',
			tags: ['glossary-reviewer', `glossary-${lang}-${verdict}`],
		}),
	});
	if (!up.ok) return json({ ok: false, error: 'Could not record the review.' }, 502);
	const contactId = (await up.json())?.contact?.id;

	// Full submission as a contact note (Kevin reads these in GHL).
	if (contactId) {
		await fetch(`${GHL}/contacts/${contactId}/notes`, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				body:
					`GLOSSARY REVIEW — ${language} (${lang})\n` +
					`Verdict: ${verdict.toUpperCase()}\n` +
					`Reviewer: ${name} <${email}>\n` +
					`Page: https://fathersheartbible.com/glossary-review/${lang}/\n\n` +
					(notes.trim() ? `Corrections / notes:\n${notes}` : 'No notes — approved as drafted.'),
			}),
		}).catch(() => {});
	}

	return json({ ok: true });
}
