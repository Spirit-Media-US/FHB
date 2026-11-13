// BUILD-CHECK: tool-inventory.py "books checkout test" 2026-11-13; nearest = scripts/beloved-identity.test.mjs.
// NEAREST: scripts/beloved-identity.test.mjs (same /dvc-checkout harness, Beloved Identity only).
// NOT-REUSED-BECAUSE: that file is one book's contract; this covers the books.json CATALOGUE contract and every
//   data-only book (Who Am I? first) without turning Beloved's file into a catalogue test.
// APPROVED-BY: Kevin 2026-11-13 FHB-BOOKS scope APPROVED (kevin-decisions L1959), via pmseoaeo directive.
//
// node --test scripts/fhb-books.test.mjs
// FHB-BOOKS: every book is a src/data/books.json row sold through the SAME /dvc-checkout as the Bibles. Proves for
// Who Am I? (the first data-only book): list price per format, no discount beside a Bible (Bibles-only 15%, Kevin
// 2026-11-10), Stripe book-sale metadata for author reporting (title, ISBN, format, country, date, net), and
// fail-closed abroad until its own landed cost is measured. Also the catalogue contract.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { bookSaleMetadata, onRequestPost } from '../functions/dvc-checkout.ts';
import { BOOK_SKUS, DISCOUNT_EXEMPT } from '../src/lib/order-pricing.ts';

const cat = JSON.parse(fs.readFileSync(new URL('../src/data/books.json', import.meta.url), 'utf8'));
const SKU = JSON.parse(
	fs.readFileSync(new URL('../src/data/book-skus.json', import.meta.url), 'utf8'),
).skus;
for (const b of cat.books)
	b.formats = b.formats.map((sku) => ({ sku, ...SKU[sku], landed_key: SKU[sku].cost_key }));
const PB = 'who-am-i-pb';
const HB = 'who-am-i-hb';

async function post(body) {
	const sessions = [];
	const realFetch = globalThis.fetch;
	globalThis.fetch = async (url, init) => {
		url = String(url);
		if (url.includes('/checkout/sessions') && init?.method === 'POST') {
			sessions.push(Object.fromEntries(new URLSearchParams(init.body)));
			return new Response(JSON.stringify({ url: 'https://stripe.test/c' }), { status: 200 });
		}
		if (url.includes('promotion_codes'))
			return new Response(
				JSON.stringify({ data: [{ id: 'promo_1', coupon: { valid: true, percent_off: 15 } }] }),
			);
		return new Response(JSON.stringify({ data: [] }));
	};
	try {
		const res = await onRequestPost({
			request: new Request('https://fathersheartbible.com/dvc-checkout', {
				method: 'POST',
				body: JSON.stringify(body),
			}),
			env: { STRIPE_FHB_SECRET_KEY: 'sk_test_x' },
		});
		return { status: res.status, json: await res.json(), s: sessions[0] };
	} finally {
		globalThis.fetch = realFetch;
	}
}
const lines = (s) => {
	const out = [];
	for (let i = 0; s[`line_items[${i}][quantity]`]; i++)
		out.push({
			qty: Number(s[`line_items[${i}][quantity]`]),
			unit: Number(s[`line_items[${i}][price_data][unit_amount]`]),
			name: s[`line_items[${i}][price_data][product_data][name]`],
		});
	return out;
};

test('catalogue contract: every format carries what checkout, Ingram and the page need', () => {
	const need = [
		'sku',
		'format',
		'isbn',
		'list_cents',
		'pages',
		'landed_key',
		'checkout_title',
		'checkout_name',
		'checkout_desc',
		'checkout_img',
		'ingram_title',
		'spec',
	];
	for (const b of cat.books)
		for (const f of b.formats)
			for (const k of need)
				assert.ok(f[k] != null && f[k] !== '', `${b.slug} ${f.sku} missing ${k}`);
	const all = cat.books.flatMap((b) => b.formats);
	assert.equal(new Set(all.map((f) => f.sku)).size, all.length, 'duplicate SKU');
	for (const f of all)
		assert.ok(DISCOUNT_EXEMPT.includes(f.sku), `${f.sku} must be discount-exempt`);
});

test('Who Am I? facts are the spec sheet ones', () => {
	assert.equal(BOOK_SKUS[PB].isbn, '9798893075595');
	assert.equal(BOOK_SKUS[HB].isbn, '9798893075601');
	const fmt = cat.books.find((b) => b.slug === 'who-am-i').formats;
	assert.deepEqual(
		fmt.map((f) => f.list_cents),
		[1599, 2499],
	);
});

test('US: PB $15.99 + HB $24.99 at list, no coupon, book metadata with ISBN/format/country/date', async () => {
	const r = await post({ counts: { [PB]: 2, [HB]: 1 }, country: 'US', email: 'new@buyer.org' });
	assert.equal(r.status, 200, JSON.stringify(r.json));
	assert.deepEqual(
		lines(r.s).map((x) => [x.qty, x.unit]),
		[
			[2, 1599],
			[1, 2499],
		],
	);
	assert.equal(r.s['discounts[0][promotion_code]'], undefined, 'no first-order coupon on books');
	assert.equal(r.s['metadata[book_lines]'], '2');
	assert.match(
		r.s['metadata[book_1]'],
		/isbn=9798893075595\|format=Paperback\|qty=2\|unit_cents=1599/,
	);
	// net per copy = 15.99 - 2.9% - 0.30 - 7.98 (measured US cost) = 7.2463; x2 = 14.49
	assert.match(r.s['metadata[book_1]'], /country=US\|date=\d{4}-\d{2}-\d{2}\|net_usd=14\.49$/);
	assert.match(r.s['metadata[book_2]'], /isbn=9798893075601\|format=Hardback/);
});

test('beside a Bible the book stays at list (Bibles-only discount)', async () => {
	const r = await post({
		counts: { 'teen-pb': 1, [PB]: 1 },
		country: 'US',
		email: 'new@buyer.org',
	});
	assert.equal(r.status, 200, JSON.stringify(r.json));
	assert.equal(lines(r.s).find((x) => /Who Am I/.test(x.name)).unit, 1599);
	assert.equal(r.s['metadata[book_lines]'], '1');
});

test('abroad (GB, measured wai_pb): list price + handling line, net measured in metadata', async () => {
	const r = await post({ counts: { [PB]: 1 }, country: 'GB', email: 'new@buyer.org' });
	assert.equal(r.status, 200, JSON.stringify(r.json));
	const l = lines(r.s);
	assert.equal(l.find((x) => /Who Am I/.test(x.name)).unit, 1599);
	assert.match(r.s['metadata[book_1]'], /country=GB\|date=\d{4}-\d{2}-\d{2}\|net_usd=\d+\.\d{2}$/);
});

test('fail closed: a book with no measured cost for a country is refused there', async () => {
	const dest = { code: 'DE', landed_cost_usd: { hc: 20, pb: 15, basis: 'MEASURED' } };
	const m = bookSaleMetadata({ [PB]: 1 }, 'DE', dest, 0);
	assert.match(m['metadata[book_1]'], /net_usd=unmeasured$/, 'no cost row -> never a guessed net');
});

test('bookSaleMetadata: net measured where a landed cost exists; nothing for a Bible-only cart', () => {
	assert.match(
		bookSaleMetadata({ 'beloved-identity-pb': 1 }, 'US', null, 0)['metadata[book_1]'],
		/net_usd=unmeasured$/,
	);
	const dest = {
		code: 'DE',
		landed_cost_usd: { hc: 20, pb: 15, bi: 8, wai_pb: 13, basis: 'MEASURED' },
	};
	const m = bookSaleMetadata({ [PB]: 1 }, 'DE', dest, 0, new Date('2026-11-13T12:00:00Z'));
	assert.match(m['metadata[book_1]'], /country=DE\|date=2026-11-13\|net_usd=-?\d+\.\d{2}$/);
	assert.deepEqual(bookSaleMetadata({ 'teen-pb': 3 }, 'US', null, 15), {});
});
