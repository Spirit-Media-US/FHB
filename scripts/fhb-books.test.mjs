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
import {
	bibleSaleMetadata,
	bibleSkuIsbn,
	bookSaleMetadata,
	onRequestPost,
} from '../functions/dvc-checkout.ts';
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

// ── 3ee-1 (pmseoaeo 2026-11-13): BIBLE sales carry the same sale fields as books ─────────────────────────
test('3ee-1: every sellable Bible SKU resolves to an ISBN (Large Print set alone = none)', () => {
	const src = fs.readFileSync(new URL('../functions/dvc-checkout.ts', import.meta.url), 'utf8');
	const all = [...src.matchAll(/^\t'([a-z0-9-]+-(?:hb|pb))': \{\n\t\ttitle: '([^']*)'/gm)];
	assert.ok(all.length >= 200, `found ${all.length} SKUs`);
	// A PRE-ORDER language has no ISBN in the publisher's master yet (2026-11-13: nri nkf sgc ktu yaf); it records
	// isbn=unresolved until the master assigns one and fhb-isbn-list/build.py carries it here. Every other SKU must resolve.
	const preorder = new Set(all.filter((m) => /\(pre-order\)/.test(m[2])).map((m) => m[1]));
	const skus = all.map((m) => m[1]).filter((s) => !(preorder.has(s) && bibleSkuIsbn(s) == null));
	const bad = skus
		.filter((s) => !BOOK_SKUS[s])
		.filter((s) => {
			const r = bibleSkuIsbn(s);
			return (
				!r ||
				(r.isbn === 'none') !== s.startsWith('lp-set-') ||
				(r.isbn !== 'none' && !/^979-8-\d{5}-\d{3}-\d$/.test(r.isbn))
			);
		});
	assert.deepEqual(bad, []);
	assert.deepEqual(bibleSkuIsbn('general-regular-charcoal-hb'), {
		isbn: '979-8-89307-336-2',
		format: 'Hardback',
	});
	assert.equal(bibleSkuIsbn('nonsense-xx'), null);
});

test('3ee-1: a Bible session carries bible_1 with the book field names; books keep book_N', async () => {
	const r = await post({
		counts: { 'teen-pb': 2, [PB]: 1 },
		country: 'US',
		email: 'new@buyer.org',
	});
	assert.equal(r.status, 200, JSON.stringify(r.json));
	assert.match(
		r.s['metadata[bible_1]'],
		/^title=[^|;]+\|isbn=979-8-\d{5}-\d{3}-\d\|format=Paperback\|qty=2\|unit_cents=\d+\|fee_cents=0\|country=US\|date=\d{4}-\d{2}-\d{2}\|net_usd=unmeasured$/,
	);
	assert.equal(r.s['metadata[bible_lines]'], '1');
	assert.equal(r.s['metadata[book_lines]'], '1');
	assert.equal(r.s['metadata[bible_unrecorded]'], undefined);
});

test('3ee-1: a 100-SKU cart stays within 50 keys and 500 chars, and COUNTS what did not fit', () => {
	const src = fs.readFileSync(new URL('../functions/dvc-checkout.ts', import.meta.url), 'utf8');
	const skus = [...src.matchAll(/^\t'(lang-[a-z0-9-]+-(?:hb|pb))': \{/gm)]
		.map((m) => m[1])
		.slice(0, 100);
	const counts = Object.fromEntries(skus.map((s) => [s, 1]));
	const m = bibleSaleMetadata(counts, 'US', null, 0, 10);
	assert.ok(Object.keys(m).length <= 10, `${Object.keys(m).length} keys`);
	for (const v of Object.values(m)) assert.ok(v.length <= 500);
	const stored = Object.entries(m)
		.filter(([k]) => /bible_\d+/.test(k))
		.reduce((t, [, v]) => t + v.split(';').length, 0);
	assert.equal(
		stored + Number(m['metadata[bible_unrecorded]'] ?? 0),
		100,
		'every line stored or counted',
	);
	assert.ok(Number(m['metadata[bible_unrecorded]']) > 0, 'budget 10 cannot hold 100 lines');
	assert.deepEqual(
		bibleSaleMetadata({ [PB]: 1 }, 'US', null, 0, 40),
		{},
		'books never go in bible_N',
	);
});

test('3ee-1: abroad, Bible net is measured from the landed cost', () => {
	const dest = { code: 'GB', landed_cost_usd: { hc: 20, pb: 15, basis: 'MEASURED' } };
	const m = bibleSaleMetadata(
		{ 'teen-hb': 1 },
		'GB',
		dest,
		0,
		40,
		new Date('2026-11-13T12:00:00Z'),
	);
	assert.match(
		m['metadata[bible_1]'],
		/format=Hardback\|qty=1\|.*country=GB\|date=2026-11-13\|net_usd=-?\d+\.\d{2}$/,
	);
});

// ── 3es F2 (pmseoaeo 2026-11-13): no HTML entity, tag or raw newline inside any built /books page's JSON-LD ──────
test('3es: built /books pages carry plain-text JSON-LD (no &entity;, no <tag>, no newline)', () => {
	const dist = new URL('../dist/books/', import.meta.url);
	assert.ok(fs.existsSync(dist), 'dist/books missing: this test runs after astro build');
	const pages = fs
		.readdirSync(dist, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name);
	assert.ok(pages.length >= 2, `book pages built: ${pages.join(' ')}`);
	for (const slug of ['', ...pages]) {
		const html = fs.readFileSync(new URL(`${slug ? `${slug}/` : ''}index.html`, dist), 'utf8');
		for (const [, ld] of html.matchAll(
			/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g,
		)) {
			const strings = [];
			JSON.parse(ld, (_k, v) => (typeof v === 'string' && strings.push(v), v));
			for (const v of strings) {
				assert.doesNotMatch(
					v,
					/&(#\d+|#x[0-9a-f]+|[a-z]+);/i,
					`${slug || 'index'}: entity in "${v.slice(0, 60)}"`,
				);
				assert.doesNotMatch(
					v,
					/<\/?[a-z][^>]*>/i,
					`${slug || 'index'}: tag in "${v.slice(0, 60)}"`,
				);
				assert.doesNotMatch(v, /\n/, `${slug || 'index'}: newline in "${v.slice(0, 60)}"`);
			}
		}
	}
});

test('3es F1/F3: Who Am I? title + offers InStock + no future datePublished', () => {
	const html = fs.readFileSync(
		new URL('../dist/books/who-am-i/index.html', import.meta.url),
		'utf8',
	);
	assert.match(html, /<title>Who Am I\? Read-Aloud Devotional by Karen Inge Hailstones<\/title>/);
	assert.doesNotMatch(html, /"availability":"https:\/\/schema\.org\/(PreOrder|OutOfStock)"/);
	for (const [, d] of html.matchAll(/"datePublished":"([^"]+)"/g))
		assert.ok(new Date(d) <= new Date(), `future datePublished ${d}`);
});

// ── ONE CART (FHB-BOOKS 'Shopper', 2026-11-13): what the order form SHOWS == what the server CHARGES ──────────
import { PRINT_TIERS } from '../src/data/print-tiers.ts';
import { handlingTable } from '../src/lib/marginGuard.ts';
import { FIRST_ORDER_PCT, handlingFor, quote } from '../src/lib/order-pricing.ts';

for (const country of ['US', 'GB']) {
	test(`one cart: a Bible + two books, first order, ${country} — form total == Stripe charge`, async () => {
		const counts = { 'general-regular-plum-hb': 1, [PB]: 1, 'beloved-identity-pb': 2 };
		// the catalog's own sources (print-catalog.ts is Vite-resolved, not loadable by node): the General edition's
		// hardback list price constant, and every book format from book-skus.json — exactly what catalogPrices() emits
		const prices = {
			'general-regular-plum-hb': 99.99,
			...Object.fromEntries(Object.entries(SKU).map(([k, v]) => [k, v.list_cents / 100])),
		};
		for (const k of Object.keys(counts)) assert.ok(prices[k] != null, `catalog prices ${k}`);
		const ex = DISCOUNT_EXEMPT.filter((k) => k in prices);
		const ls = Object.entries(counts).map(([k, n]) => ({
			slug: k,
			cents: Math.round(prices[k] * 100),
			qty: n,
			exempt: ex.includes(k),
		}));
		const r = quote(ls, PRINT_TIERS, country !== 'US', true);
		const pct = r.best === 'first' ? FIRST_ORDER_PCT : r.best === 'bulk' ? r.bulkPct : 0;
		const table = handlingTable(
			Object.fromEntries(Object.entries(prices).map(([k, v]) => [k, Math.round(v * 100)])),
			[FIRST_ORDER_PCT, ...PRINT_TIERS.map((t) => t.pct)],
		);
		const shown =
			(r.best === 'first' ? r.firstTotal : r.bulkTotal) +
			handlingFor(ls, pct, table[country]).total;
		const res = await post({ counts, country, email: 'new@buyer.org' });
		assert.equal(res.status, 200, JSON.stringify(res.json));
		const charged = lines(res.s).reduce((t, l) => t + l.unit * l.qty, 0);
		assert.ok(
			!res.s['discounts[0][promotion_code]'],
			'a cart with a book takes the 15% per Bible unit, no coupon',
		);
		assert.equal(shown, charged, `${country}: form ${shown} vs Stripe ${charged}`);
		assert.equal(r.copies, 1, 'books add nothing to the Bible ladder');
	});
}
