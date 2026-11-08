// Abuse guard for the firstOrderCheck mode of /dvc-checkout (unit 2kk).
//
// That mode answers "has this email paid before?", which is an email-enumeration oracle if left
// open. Four defences, all here so they are unit-testable without Cloudflare:
//   1. same-origin only (Origin, else Referer, must be our host or a preview host)
//   2. soft rate limit per client IP and per email (hash only, never the raw address)
//   3. ONE response shape for yes / no / limited: { status: 'first' | 'repeat' | 'unknown' }
//   4. a constant minimum duration, so timing does not separate the three outcomes
//
// LIMITER STORAGE: no KV / D1 / Durable Object is bound to the marketing Pages project (no wrangler
// config, Env holds only the Stripe key) and none may be added (paid binding). So counters live in
// the Cache API (caches.default): free, TTL-bounded, and NOT a module-scope Map, so it cannot grow
// inside the isolate (rules/worker-memory-and-caches.md). It is a SOFT limiter: the cache is
// per-data-centre and get/put is not atomic, so a determined distributed attacker gets more than N
// probes. It stops casual and single-origin enumeration, and every limited answer is "unknown".

export const WINDOW_SECONDS = 600;
export const MAX_PER_IP = 10;
export const MAX_PER_EMAIL = 5;
/** every firstOrderCheck answer takes at least this long, whatever the outcome */
export const MIN_RESPONSE_MS = 900;

export type FirstStatus = 'first' | 'repeat' | 'unknown';

const HOST_OK = (h: string) =>
	h === 'fathersheartbible.com' ||
	h === 'www.fathersheartbible.com' ||
	h === 'fathersheartbible.pages.dev' ||
	h.endsWith('.fathersheartbible.pages.dev');

/** True only when the request names an allowed origin. A missing Origin AND Referer is refused. */
export function sameOrigin(headers: { get(n: string): string | null }): boolean {
	const src = headers.get('origin') ?? headers.get('referer');
	if (!src) return false;
	try {
		const u = new URL(src);
		return u.protocol === 'https:' && HOST_OK(u.hostname);
	} catch {
		return false;
	}
}

/** Short, non-reversible tag for logs and limiter keys. Never log the address itself. */
export async function emailTag(email: string): Promise<string> {
	const d = await crypto.subtle.digest(
		'SHA-256',
		new TextEncoder().encode(email.trim().toLowerCase()),
	);
	return [...new Uint8Array(d)]
		.slice(0, 6)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

interface CacheLike {
	match(req: Request): Promise<Response | undefined>;
	put(req: Request, res: Response): Promise<void>;
}

async function bump(cache: CacheLike, key: string, max: number, now: number): Promise<boolean> {
	const req = new Request(`https://firstorder-rl.invalid/${key}`);
	let n = 0;
	let start = now;
	try {
		const hit = await cache.match(req);
		if (hit) {
			const d = (await hit.json()) as { n: number; start: number };
			if (now - d.start < WINDOW_SECONDS * 1000) {
				n = d.n;
				start = d.start;
			}
		}
	} catch {
		/* cache unavailable: treat as a fresh window */
	}
	if (n >= max) return false;
	const left = Math.max(1, Math.ceil(WINDOW_SECONDS - (now - start) / 1000));
	try {
		await cache.put(
			req,
			new Response(JSON.stringify({ n: n + 1, start }), {
				headers: { 'cache-control': `public, max-age=${left}` },
			}),
		);
	} catch {
		/* soft limiter: a failed put only loosens it */
	}
	return true;
}

/** Counts one check against both limits. false = limited. Both are always counted. */
export async function allowCheck(
	cache: CacheLike,
	ip: string,
	tag: string,
	now = Date.now(),
): Promise<boolean> {
	const a = await bump(cache, `ip/${encodeURIComponent(ip || 'none')}`, MAX_PER_IP, now);
	const b = await bump(cache, `em/${tag}`, MAX_PER_EMAIL, now);
	return a && b;
}

/** Runs `work`, then waits so the whole call lasts at least MIN_RESPONSE_MS. */
export async function constantTime<T>(work: () => Promise<T>, minMs = MIN_RESPONSE_MS): Promise<T> {
	const t0 = Date.now();
	const out = await work();
	const left = minMs - (Date.now() - t0);
	if (left > 0) await new Promise((r) => setTimeout(r, left));
	return out;
}

/** The one response body for every outcome. */
export const answerBody = (status: FirstStatus) => JSON.stringify({ status });

/** What the order form should believe. Anything unrecognised is 'unknown' (list price). */
export function firstStateFrom(d: unknown): FirstStatus {
	const s = (d as { status?: unknown } | null)?.status;
	return s === 'first' || s === 'repeat' ? s : 'unknown';
}
