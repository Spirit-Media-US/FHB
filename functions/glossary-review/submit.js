// POST /api/glossary-review — native reviewers submit approval or corrections
// for a language's FHB key-term glossary (/glossary-review/<lang> pages).
// GET  /api/glossary-review — aggregate per-language status for the index badges.
//
// MULTIPLE reviews per language are welcome (Kevin 2026-07-22: engagement
// builder) — every submission is stored individually and the index shows
// counts (✓n approvals · ✎n corrections), not a single collapsed state.
//
// Each submission triggers:
//   1. GHL contact upsert (FHB location) + verdict tag + full note.
//   2. Summary email to Kevin (SMP location = authenticated sender).
//   3. Thank-you email to the REVIEWER (SMP location, silent-DND footer per
//      SMP email policy).
//   4. Corrections → a GHL task on the contact so follow-up can't be lost.
//   5. KV record powering the live index badges AND the Bethel beachhead
//      dispatcher (an approval is the starting gun for that language's
//      Genesis+John translation run).

const FHB_LOCATION_ID = 'w9rV5XqCu0vCP39MFseG';
const SMP_LOCATION_ID = 'oPP9m0hKJpU6cFB7yD9w';
const GHL = 'https://services.leadconnectorhq.com';
// SMP main-location silent-DND unsubscribe trigger link (MANDATORY on every
// SMP email — smp-email-silent-dnd policy).
const UNSUB = '{{trigger_link.PmEH5lDUfxquhrEgntGY}}';

const json = (obj, status = 200) =>
	new Response(JSON.stringify(obj), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

const ghlHeaders = (token) => ({
	Authorization: `Bearer ${token}`,
	Version: '2021-07-28',
	'Content-Type': 'application/json',
});

function validate(body) {
	const lang = String(body.lang || '').toLowerCase();
	const name = String(body.name || '')
		.trim()
		.slice(0, 120);
	const email = String(body.email || '')
		.trim()
		.slice(0, 200);
	const verdict = body.verdict === 'approved' ? 'approved' : 'corrections';
	const notes = String(body.notes || '').slice(0, 8000);
	if (!/^[a-z]{2,4}$/.test(lang) || !name || !/.+@.+\..+/.test(email)) {
		return { error: 'Name, valid email, and language are required.' };
	}
	if (verdict === 'corrections' && !notes.trim()) {
		return { error: 'Please describe the corrections needed.' };
	}
	return {
		lang,
		language: String(body.language || '').slice(0, 60),
		name,
		email,
		verdict,
		notes,
	};
}

async function recordInGhl(env, r) {
	const headers = ghlHeaders(env.GHL_TOKEN_FHB);
	const up = await fetch(`${GHL}/contacts/upsert`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			locationId: FHB_LOCATION_ID,
			name: r.name,
			email: r.email,
			source: 'glossary-review',
			tags: ['glossary-reviewer', `glossary-${r.lang}-${r.verdict}`],
		}),
	});
	if (!up.ok) return null;
	const contactId = (await up.json())?.contact?.id;
	if (!contactId) return null;
	await fetch(`${GHL}/contacts/${contactId}/notes`, {
		method: 'POST',
		headers,
		body: JSON.stringify({
			body:
				`GLOSSARY REVIEW — ${r.language} (${r.lang})\n` +
				`Verdict: ${r.verdict.toUpperCase()}\nReviewer: ${r.name} <${r.email}>\n` +
				`Page: https://fathersheartbible.com/glossary-review/${r.lang}/\n\n` +
				(r.notes.trim() ? `Corrections / notes:\n${r.notes}` : 'No notes — approved as drafted.'),
		}),
	}).catch(() => {});
	// Trigger 3: corrections become a GHL task so follow-up can't be lost.
	if (r.verdict === 'corrections') {
		const due = new Date(Date.now() + 3 * 864e5).toISOString();
		await fetch(`${GHL}/contacts/${contactId}/tasks`, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				title: `Apply glossary corrections — ${r.language}`,
				body: r.notes.slice(0, 2000),
				dueDate: due,
				completed: false,
			}),
		}).catch(() => {});
	}
	return contactId;
}

async function smpContact(env, email, name) {
	const up = await fetch(`${GHL}/contacts/upsert`, {
		method: 'POST',
		headers: ghlHeaders(env.GHL_TOKEN_SMP),
		body: JSON.stringify({
			locationId: SMP_LOCATION_ID,
			email,
			name,
			tags: ['glossary-reviewer'],
		}),
	});
	return up.ok ? (await up.json())?.contact?.id : null;
}

async function sendEmail(env, contactId, subject, html) {
	if (!contactId) return;
	await fetch(`${GHL}/conversations/messages`, {
		method: 'POST',
		headers: ghlHeaders(env.GHL_TOKEN_SMP),
		body: JSON.stringify({ type: 'Email', contactId, subject, html }),
	}).catch(() => {});
}

const esc = (s) => String(s).replace(/</g, '&lt;').replace(/\n/g, '<br>');

export async function onRequestPost({ request, env }) {
	if (!env.GHL_TOKEN_FHB) return json({ ok: false, error: 'Server not configured.' }, 500);
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ ok: false, error: 'Invalid request.' }, 400);
	}
	const r = validate(body);
	if (r.error) return json({ ok: false, error: r.error }, 400);

	await recordInGhl(env, r);

	// KV: one record PER SUBMISSION (multiple reviewers per language welcome).
	try {
		await env.GLOSSARY_KV.put(
			`sub:${r.lang}:${Date.now()}`,
			JSON.stringify({ verdict: r.verdict, name: r.name, at: new Date().toISOString() }),
		);
	} catch {}

	// Trigger: summary email to Kevin (every submission).
	const kevinId = await smpContact(env, 'kevin@spiritmediapublishing.com', 'Kevin White').catch(
		() => null,
	);
	await sendEmail(
		env,
		kevinId,
		`Glossary ${r.verdict === 'approved' ? 'APPROVED ✓' : 'corrections ✎'} — ${r.language} (${r.lang})`,
		`<p><strong>${esc(r.language)}</strong> glossary review received.</p>` +
			`<p>Verdict: <strong>${r.verdict.toUpperCase()}</strong><br>` +
			`Reviewer: ${esc(r.name)} &lt;${esc(r.email)}&gt;<br>` +
			`Page: <a href="https://fathersheartbible.com/glossary-review/${r.lang}/">glossary-review/${r.lang}</a></p>` +
			(r.notes.trim()
				? `<p><strong>Notes:</strong><br>${esc(r.notes)}</p>`
				: '<p>No notes — approved as drafted.</p>'),
	);

	// Trigger 2: thank-you to the reviewer (silent-DND footer, SMP policy).
	const reviewerId = await smpContact(env, r.email, r.name).catch(() => null);
	await sendEmail(
		env,
		reviewerId,
		`Thank you — your ${r.language} review of the Father's Heart Bible glossary`,
		`<p>Dear ${esc(r.name)},</p>` +
			`<p>Thank you for reviewing the ${esc(r.language)} key-term glossary for the Father's Heart Bible™. ` +
			(r.verdict === 'approved'
				? `Your approval opens the door for ${esc(r.language)} Scripture translation to begin — the book of Genesis and the Gospel of John are first.`
				: `Your corrections are exactly what this review exists for — they will be applied and you may be asked to take one more look.`) +
			`</p><p>Because of you, readers in your language will meet our Father in words that sound like home.</p>` +
			`<p>With gratitude,<br>Kevin White<br>Father's Heart Bible™</p>` +
			`<div style="height:144px"></div>` +
			`<p style="font-size:12px;color:#888">Want to change how you receive these emails?<br>` +
			`You can <a href="${UNSUB}"><strong>unsubscribe from this list.</strong></a></p>`,
	);

	return json({ ok: true });
}
