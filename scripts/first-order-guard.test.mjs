// node --test scripts/first-order-guard.test.mjs   (unit 2kk)
import test from 'node:test';
import assert from 'node:assert/strict';
import {
	allowCheck, answerBody, constantTime, emailTag, firstStateFrom, sameOrigin,
	MAX_PER_IP, MAX_PER_EMAIL, WINDOW_SECONDS,
} from '../src/lib/firstOrderGuard.ts';
import { quote } from '../src/lib/order-pricing.ts';
import fs from 'node:fs';

// In-memory stand-in for caches.default, honouring max-age so expiry is testable.
const fakeCache = () => {
	const m = new Map();
	return {
		m,
		async match(req) { const v = m.get(req.url); return v ? new Response(v) : undefined; },
		async put(req, res) { m.set(req.url, await res.text()); },
	};
};
const H = (o) => ({ get: (n) => o[n] ?? null });

test('limited after N per IP; the N+1th is refused', async () => {
	const c = fakeCache();
	for (let i = 0; i < MAX_PER_IP; i++) assert.equal(await allowCheck(c, '1.2.3.4', `t${i}`, 1000), true, `check ${i}`);
	assert.equal(await allowCheck(c, '1.2.3.4', 'tnew', 1000), false);
	assert.equal(await allowCheck(c, '5.6.7.8', 'tnew', 1000), true, 'other IP unaffected');
});

test('limited after N per email, even across IPs', async () => {
	const c = fakeCache();
	for (let i = 0; i < MAX_PER_EMAIL; i++) assert.equal(await allowCheck(c, `9.9.9.${i}`, 'same', 1000), true);
	assert.equal(await allowCheck(c, '9.9.9.99', 'same', 1000), false);
});

test('window expires', async () => {
	const c = fakeCache();
	for (let i = 0; i < MAX_PER_IP; i++) await allowCheck(c, '1.1.1.1', `t${i}`, 0);
	assert.equal(await allowCheck(c, '1.1.1.1', 'x', 1000), false);
	assert.equal(await allowCheck(c, '1.1.1.1', 'x', WINDOW_SECONDS * 1000 + 1), true);
});

test('unknown when limited: same body shape as yes/no, and the form reads it as unknown', () => {
	const shapes = ['first', 'repeat', 'unknown'].map((s) => Object.keys(JSON.parse(answerBody(s))).join());
	assert.deepEqual(new Set(shapes), new Set(['status']));
	assert.equal(firstStateFrom(JSON.parse(answerBody('unknown'))), 'unknown');
	assert.equal(firstStateFrom(JSON.parse(answerBody('first'))), 'first');
	assert.equal(firstStateFrom(JSON.parse(answerBody('repeat'))), 'repeat');
	for (const bad of [null, {}, { first: true }, { status: 'yes' }, 'x']) assert.equal(firstStateFrom(bad), 'unknown');
});

test('cross-origin / missing-origin requests are refused; ours and previews pass', () => {
	assert.equal(sameOrigin(H({ origin: 'https://evil.example' })), false);
	assert.equal(sameOrigin(H({ origin: 'https://fathersheartbible.com.evil.example' })), false);
	assert.equal(sameOrigin(H({ origin: 'https://evilfathersheartbible.pages.dev' })), false);
	assert.equal(sameOrigin(H({ origin: 'http://fathersheartbible.com' })), false);
	assert.equal(sameOrigin(H({})), false);
	assert.equal(sameOrigin(H({ origin: 'null' })), false);
	assert.equal(sameOrigin(H({ origin: 'https://fathersheartbible.com' })), true);
	assert.equal(sameOrigin(H({ origin: 'https://www.fathersheartbible.com' })), true);
	assert.equal(sameOrigin(H({ origin: 'https://dev.fathersheartbible.pages.dev' })), true);
	assert.equal(sameOrigin(H({ referer: 'https://fathersheartbible.com/print' })), true);
	assert.equal(sameOrigin(H({ referer: 'https://evil.example/https://fathersheartbible.com' })), false);
});

test('form still shows the list price on unknown', () => {
	const lines = [{ cents: 3000, qty: 1 }];
	const probe = (() => { try { return quote(lines, [], false, firstStateFrom({ status: 'unknown' }) === 'first'); } catch { return null; } })();
	assert.ok(probe, 'quote ran');
	assert.equal(probe.best, 'none', 'no discount applied while unknown');
	assert.equal(probe.bulkTotal, probe.subtotal);
	assert.equal(probe.subtotal, 3000);
	assert.equal(quote(lines, [], false, true).best, 'first', 'control: the discount does apply once first is confirmed');
	const src = fs.readFileSync(new URL('../src/scripts/order-form.ts', import.meta.url), 'utf8');
	assert.match(src, /firstState = firstStateFrom\(d\)/);
	assert.match(src, /firstState = 'unknown';\s*\}\s*render\(\)/s);
});

test('email tag is short, stable, case-insensitive and not the address', async () => {
	const t = await emailTag(' A@B.com ');
	assert.equal(t, await emailTag('a@b.com'));
	assert.match(t, /^[0-9a-f]{12}$/);
});

test('constant time: fast work is padded to the floor', async () => {
	const t0 = Date.now();
	await constantTime(async () => 1, 120);
	assert.ok(Date.now() - t0 >= 110);
});

test('handler never logs a raw email and gates before Stripe', () => {
	const src = fs.readFileSync(new URL('../functions/dvc-checkout.ts', import.meta.url), 'utf8');
	const blk = src.slice(src.indexOf('if (payload.firstOrderCheck)'), src.indexOf('const counts: Record'));
	assert.ok(blk.indexOf('sameOrigin') < blk.indexOf('isFirstOrder'));
	assert.ok(blk.indexOf('allowCheck') < blk.indexOf('isFirstOrder'));
	for (const l of blk.split('\n').filter((x) => x.includes('console.'))) assert.doesNotMatch(l, /\bem\b|email/);
});

// ---- the real handler, end to end (Stripe mocked, caches faked) ----
const callHandler = async ({ origin, email = 'a@b.co', ip = '7.7.7.7' }) => {
	const { onRequestPost } = await import('../functions/dvc-checkout.ts');
	const headers = { 'cf-connecting-ip': ip };
	if (origin) headers.origin = origin;
	return onRequestPost({
		request: new Request('https://x.test/dvc-checkout', { method: 'POST', headers, body: JSON.stringify({ firstOrderCheck: true, email }) }),
		env: { STRIPE_FHB_SECRET_KEY: 'sk_test' },
	});
};
const mockStripe = () => {
	const calls = [];
	globalThis.fetch = async (url) => {
		calls.push(String(url));
		const j = (o) => new Response(JSON.stringify(o));
		if (String(url).includes('promotion_codes')) return j({ data: [{ id: 'p', coupon: { valid: true, percent_off: 15 } }] });
		return j({ data: [] });
	};
	return calls;
};

test('handler: cross-origin is refused with 403 before Stripe is touched', async () => {
	const calls = mockStripe();
	globalThis.caches = { default: fakeCache() };
	for (const origin of ['https://evil.example', undefined]) {
		const r = await callHandler({ origin });
		assert.equal(r.status, 403);
		assert.deepEqual(await r.json(), { error: 'forbidden' });
	}
	assert.equal(calls.length, 0);
});

test('handler: after N checks from one IP the answer is "unknown" in the same shape, with no Stripe call', async () => {
	const calls = mockStripe();
	globalThis.caches = { default: fakeCache() };
	const ok = 'https://fathersheartbible.com';
	for (let i = 0; i < MAX_PER_IP; i++) {
		const r = await callHandler({ origin: ok, email: `u${i}@b.co` });
		assert.equal(r.status, 200);
		assert.deepEqual(await r.json(), { status: 'first' });
	}
	const before = calls.length;
	const t0 = Date.now();
	const r = await callHandler({ origin: ok, email: 'late@b.co' });
	assert.equal(r.status, 200);
	assert.deepEqual(await r.json(), { status: 'unknown' });
	assert.equal(calls.length, before, 'limited: Stripe never asked');
	assert.ok(Date.now() - t0 >= 850, 'limited answer is padded to the same floor');
});
