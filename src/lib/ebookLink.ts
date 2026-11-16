// THE SIGNED EBOOK DOWNLOAD LINK (Kevin 2026-11-16 "We point to our own ebook sales"). One module, used by the
// signer (functions/print-webhook.ts, the buyer's email; functions/ebook-download.ts, the success redirect) and the
// verifier (functions/ebook-download.ts). Mirrored in bin/fhb-order-reconcile.py (the email backstop).
//
//   <window origin>/ebook-download?s=<checkout session>&e=<ebook sku>&t=<sig>
//   sig = base64url(HMAC-SHA256(K, "<session>.<sku>")),  K = HMAC-SHA256(STRIPE_PRINT_WEBHOOK_SECRET, PURPOSE)
//
// The key is DERIVED from the store's webhook secret (already bound wherever the signer and verifier run), so no new
// secret exists to provision, leak or forget; PURPOSE keeps the derived key useless for anything but this link.
// A valid signature is necessary, never sufficient: the verifier ALSO re-reads the session from Stripe and serves
// only when it is paid, is an ebook_direct sale, and sold exactly this SKU (sessionGrantsEbook).
export const PURPOSE = 'smp-ebook-download-link-v1';
const enc = new TextEncoder();
const b64url = (b: ArrayBuffer) =>
	btoa(String.fromCharCode(...new Uint8Array(b)))
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
async function hmac(key: Uint8Array | string, msg: string): Promise<ArrayBuffer> {
	const k = await crypto.subtle.importKey(
		'raw',
		typeof key === 'string' ? enc.encode(key) : key,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	return crypto.subtle.sign('HMAC', k, enc.encode(msg));
}
export const SID_RE = /^cs_(live|test)_[A-Za-z0-9]{10,200}$/;
export const SKU_RE = /^[a-z0-9-]{3,120}$/;
export const SIG_RE = /^[A-Za-z0-9_-]{43}$/;
/** The signature for (session, sku), or null when there is no secret or the inputs are malformed. */
export async function signEbookLink(
	secret: string | undefined,
	sid: string,
	sku: string,
): Promise<string | null> {
	if (!secret || !SID_RE.test(sid) || !SKU_RE.test(sku)) return null;
	const k = new Uint8Array(await hmac(secret, PURPOSE));
	return b64url(await hmac(k, `${sid}.${sku}`));
}
/** Constant-time check of a link's signature. Any malformed part = false (no Stripe call is ever made for it). */
export async function verifyEbookLink(
	secret: string | undefined,
	sid: string,
	sku: string,
	sig: string,
): Promise<boolean> {
	if (!SIG_RE.test(sig)) return false;
	const want = await signEbookLink(secret, sid, sku);
	if (!want) return false;
	let d = 0;
	for (let i = 0; i < want.length; i++) d |= want.charCodeAt(i) ^ sig.charCodeAt(i);
	return d === 0;
}
/** The shop window's own origin (Option C: SMP sales are delivered on SMP, FHB sales on FHB). */
export const windowOrigin = (window: string | undefined) =>
	window === 'smp' ? 'https://spiritmediapublishing.com' : 'https://fathersheartbible.com';
export async function ebookLinkUrl(
	secret: string | undefined,
	origin: string,
	sid: string,
	sku: string,
): Promise<string | null> {
	const t = await signEbookLink(secret, sid, sku);
	return t
		? `${origin}/ebook-download?s=${encodeURIComponent(sid)}&e=${encodeURIComponent(sku)}&t=${t}`
		: null;
}
/** Does this Stripe Checkout Session (as Stripe returns it) entitle its holder to `sku`? */
export function sessionGrantsEbook(
	s: { id?: string; payment_status?: string; metadata?: Record<string, string> | null } | null,
	sid: string,
	sku: string,
): boolean {
	return (
		!!s &&
		s.id === sid &&
		s.payment_status === 'paid' &&
		s.metadata?.kind === 'ebook_direct' &&
		s.metadata?.ebook_sku === sku
	);
}
