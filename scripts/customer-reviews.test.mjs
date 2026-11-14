// node --test scripts/customer-reviews.test.mjs   (unit 2qy, Google Customer Reviews opt-in)
// No test-mode Stripe exists in this repo and a real order is never placed, so /order is exercised by
// bundling functions/order.ts and feeding it recorded/mocked Checkout Session objects through a stubbed fetch.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { addBusinessDays, buildOptIn, optInSnippet, GCR_MERCHANT_ID } from '../src/lib/customerReviews.ts';

const T = Date.UTC(2026, 10, 10, 21, 0, 0) / 1000; // Tue 2026-11-10 21:00Z
const sess = (o = {}) => ({
	id: 'cs_live_a1B2c3',
	livemode: true,
	payment_status: 'paid',
	created: T,
	customer_details: { email: 'buyer@example.com', address: { country: 'US' } },
	collected_information: { shipping_details: { name: 'A B', address: { line1: '1 Main', city: 'Austin', state: 'TX', postal_code: '78701', country: 'US' } } },
	metadata: {},
	amount_total: 9999,
	currency: 'usd',
	...o,
});

test('business days skip weekends: Tue + 10 = Tue two weeks later', () => {
	assert.equal(addBusinessDays(new Date(T * 1000), 10), '2026-11-24');
	assert.equal(addBusinessDays(new Date(Date.UTC(2026, 10, 13)), 1), '2026-11-16'); // Fri -> Mon
	assert.equal(addBusinessDays(new Date(Date.UTC(2026, 10, 14)), 1), '2026-11-16'); // Sat -> Mon
});

test('US paid live session: order date + 10 business days (handling 3 + transit 7)', () => {
	const o = buildOptIn(sess());
	assert.deepEqual(o, {
		merchant_id: GCR_MERCHANT_ID, order_id: 'cs_live_a1B2c3', email: 'buyer@example.com',
		delivery_country: 'US', estimated_delivery_date: '2026-11-24',
	});
});

test('the estimate the checkout stated (expanded shipping rate) wins over the country default', () => {
	const o = buildOptIn(sess({ shipping_cost: { shipping_rate: { delivery_estimate: { maximum: { unit: 'business_day', value: 4 } } } } }));
	assert.equal(o.estimated_delivery_date, '2026-11-16');
});

test('module omitted, never invented: test mode, unpaid, no email, bad id, unknown country, ZZ, no date', () => {
	assert.equal(buildOptIn(sess({ livemode: false })), null);
	assert.equal(buildOptIn(sess({ payment_status: 'unpaid' })), null);
	assert.equal(buildOptIn(sess({ customer_details: { email: null } })), null);
	assert.equal(buildOptIn(sess({ customer_details: { email: 'not-an-email' } })), null);
	assert.equal(buildOptIn(sess({ id: 'x"><script>' })), null);
	assert.equal(buildOptIn(sess({ collected_information: { shipping_details: { address: { country: 'ZZ' } } } })), null);
	assert.equal(buildOptIn(sess({ created: 0 })), null);
	// a country we do not ship to and whose rate carries no estimate: no date, so no module
	assert.equal(buildOptIn(sess({ collected_information: { shipping_details: { address: { country: 'KP' } } } })), null);
});

test('snippet cannot be broken out of by a hostile value', () => {
	const s = optInSnippet({ merchant_id: 1, order_id: 'cs_x', email: 'a@b.co</script><img src=x onerror=1>', delivery_country: 'US', estimated_delivery_date: '2026-01-01' });
	assert.equal((s.match(/<\/script>/g) || []).length, 2);
	assert.ok(!s.includes('<img'));
});

// ---- the real /order function against a mocked Stripe ----
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gcr-'));
const out = path.join(dir, 'order.mjs');
await build({ entryPoints: ['functions/order.ts'], bundle: true, format: 'esm', platform: 'neutral', outfile: out, logLevel: 'silent', loader: { '.json': 'json' } });
const { onRequestGet } = await import(out);
const render = async (session, { status = 200 } = {}) => {
	const seen = [];
	const f = globalThis.fetch;
	globalThis.fetch = async (u, init) => { seen.push({ u: String(u), init }); return new Response(JSON.stringify(session), { status }); };
	try {
		const r = await onRequestGet({ request: new Request('https://x.test/order?s=cs_live_a1B2c3'), env: { STRIPE_FHB_SECRET_KEY: 'sk_test_dummy' } });
		return { html: await r.text(), seen };
	} finally { globalThis.fetch = f; }
};

test('/order renders the module once, with server-side values, after the card', async () => {
	const { html, seen } = await render(sess());
	assert.match(html, /^<!doctype html>/);
	assert.equal((html.match(/apis\.google\.com\/js\/platform\.js\?onload=renderOptIn/g) || []).length, 1);
	assert.match(html, /gapi\.surveyoptin\.render\(\{"merchant_id":5891954461,"order_id":"cs_live_a1B2c3","email":"buyer@example\.com","delivery_country":"US","estimated_delivery_date":"2026-11-24"\}\)/);
	assert.ok(html.indexOf('platform.js') > html.indexOf('Order reference') && html.indexOf('platform.js') < html.indexOf('</body>'));
	assert.match(seen[0].u, /\/checkout\/sessions\/cs_live_a1B2c3\?expand\[\]=shipping_cost\.shipping_rate$/);
});

test('/order with a test-mode session, an unpaid one, the lookup form, or a missing session carries no Google script', async () => {
	assert.ok(!(await render(sess({ livemode: false }))).html.includes('apis.google.com'));
	assert.ok(!(await render(sess({ payment_status: 'unpaid' }))).html.includes('apis.google.com'));
	assert.ok(!(await render({}, { status: 404 })).html.includes('apis.google.com'));
	const r = await onRequestGet({ request: new Request('https://x.test/order'), env: {} });
	assert.ok(!(await r.text()).includes('apis.google.com'));
});

test('Google hosts are allowed by the /order CSP only', () => {
	const h = fs.readFileSync('public/_headers', 'utf8');
	const csp = (blk) => blk.split('\n').find((l) => l.trim().startsWith('Content-Security-Policy:'));
	const blocks = h.split(/\n(?=\S)/);
	const star = blocks.find((b) => b.startsWith('/*\n'));
	assert.ok(!csp(star).includes('google'), '/* policy must stay Google-free');
	for (const p of ['/order\n', '/order/\n']) {
		const b = blocks.find((x) => x.startsWith(p));
		assert.ok(b && b.includes('! Content-Security-Policy'), p);
		assert.match(csp(b), /script-src[^;]*https:\/\/apis\.google\.com/);
		assert.match(csp(b), /frame-src[^;]*https:\/\/www\.google\.com/);
	}
});

test('no other source file loads the Google opt-in script', () => {
	const hits = [];
	const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
		if (['node_modules', 'dist', '.git', '.astro'].includes(e.name)) continue;
		const p = path.join(d, e.name);
		if (e.isDirectory()) walk(p); else if (/\.(ts|astro|js|mjs|html)$/.test(e.name) && !p.includes('.test.') && fs.readFileSync(p, 'utf8').includes('js/platform.js?onload=renderOptIn')) hits.push(p);
	} };
	walk('src'); walk('functions'); walk('public');
	assert.deepEqual(hits, ['src/lib/customerReviews.ts']);
});
