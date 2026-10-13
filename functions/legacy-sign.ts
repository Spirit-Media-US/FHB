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

	// Their copy by email (Kevin 2026-10-13: the statement, their name, the date, from Kevin
	// and Shelly). Sent through GHL LC Email on the warmed mail. sender. A failed send never
	// fails the signing — the name is already recorded.
	const signedOn = new Date().toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		timeZone: 'America/New_York',
	});
	const esc = (t: string) =>
		t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	let emailed = false;
	try {
		const mailRes = await fetch(`${GHL}/conversations/messages`, {
			method: 'POST',
			headers,
			body: JSON.stringify({
				type: 'Email',
				locationId: LOCATION_ID,
				contactId,
				emailFrom: 'Kevin and Shelly White <kevin@mail.spiritmediapublishing.com>',
				subject: 'Sharing the Father is my life legacy',
				html: legacyEmail(esc(name), signedOn),
			}),
		});
		emailed = mailRes.ok;
	} catch {
		emailed = false;
	}

	return json({ ok: true, emailed });
};

// The emailed copy. Footer = the SMP silent-DND unsubscribe line, ~144px below the signature.
const legacyEmail = (
	name: string,
	signedOn: string,
) => `<div style="max-width:560px;margin:0 auto;padding:32px 24px;font-family:Georgia,'Times New Roman',serif;color:#2b2326;">
<p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#b8005c;">Father&rsquo;s Heart Legacy</p>
<h1 style="margin:0 0 24px;font-size:28px;line-height:1.25;font-weight:normal;">Sharing the Father is my life legacy.</h1>
<p style="margin:0 0 14px;font-size:18px;line-height:1.55;">Our Father is the greatest gift I have ever received.</p>
<p style="margin:0 0 14px;font-size:18px;line-height:1.55;">I live to share His love, and to invite others to open their hearts to Him.</p>
<p style="margin:0 0 28px;font-size:18px;line-height:1.55;">Sharing the Father is my life legacy.</p>
<p style="margin:0;font-size:20px;line-height:1.4;border-top:1px solid #e6dfe1;padding-top:18px;">${name}</p>
<p style="margin:4px 0 32px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#6b5d62;">${signedOn}</p>
<p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#2b2326;">Welcome home,</p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#2b2326;">Kevin and Shelly White<br />Father&rsquo;s Heart Bible&trade; &middot; <a href="https://fathersheartbible.com/legacy/" style="color:#b8005c;">fathersheartbible.com/legacy</a></p>
<p style="margin:144px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#8a7d82;text-align:center;">Want to change how you receive these emails? You can <a href="{{trigger_link.PmEH5lDUfxquhrEgntGY}}" style="color:#8a7d82;">unsubscribe from this list</a>.</p>
</div>`;
