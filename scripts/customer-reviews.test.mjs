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

// ---- /order MOVED to SMP (map smp-store-one-home-v1 move 4, Kevin 2026-11-20 ~18:51Z "2 this needs to be moved") ----
// The order page, and its Google Customer Reviews opt-in, now render on spiritmediapublishing.com/order (SMP
// scripts/customer-reviews.test.mjs). FHB /order only redirects there, so it can never carry the opt-in itself.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gcr-'));
const out = path.join(dir, 'order.mjs');
await build({ entryPoints: ['functions/order.ts'], bundle: true, format: 'esm', platform: 'neutral', outfile: out, logLevel: 'silent', loader: { '.json': 'json' } });
const { onRequestGet } = await import(out);
test('/order on FHB redirects to the one SMP order page (query kept) and renders no page, so no Google script', async () => {
	const r = await onRequestGet({ request: new Request('https://fathersheartbible.com/order?s=cs_live_a1B2c3'), env: {} });
	assert.equal(r.status, 302);
	assert.equal(r.headers.get('location'), 'https://spiritmediapublishing.com/order?s=cs_live_a1B2c3');
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
