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

import surface from '../src/data/books-surface.json' with { type: 'json' };
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
		assert.ok(!DISCOUNT_EXEMPT.includes(f.sku), `${f.sku}: books take the first-order 15% (Kevin 2026-11-14)`);
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

test('US first order: PB $15.99 + HB $24.99 lines with the first-order coupon, book metadata with ISBN/format/country/date', async () => {
	const r = await post({ counts: { [PB]: 2, [HB]: 1 }, country: 'US', email: 'new@buyer.org' });
	assert.equal(r.status, 200, JSON.stringify(r.json));
	assert.deepEqual(
		lines(r.s).map((x) => [x.qty, x.unit]),
		[
			[2, 1599],
			[1, 2499],
		],
	);
	assert.equal(r.s['discounts[0][promotion_code]'], 'promo_1', 'books take the first-order coupon (Kevin 2026-11-14)');
	assert.equal(r.s['metadata[book_lines]'], '2');
	assert.match(
		r.s['metadata[book_1]'],
		/isbn=9798893075595\|format=Paperback\|qty=2\|unit_cents=1599/,
	);
	// net per copy = 15.99 - 2.9% - 0.30 - 7.98 (measured US cost) = 7.2463; x2 = 14.49
	assert.match(r.s['metadata[book_1]'], /country=US\|date=\d{4}-\d{2}-\d{2}\|net_usd=14\.49$/);
	assert.match(r.s['metadata[book_2]'], /isbn=9798893075601\|format=Hardback/);
});

test('beside a Bible on a first order: one coupon covers both (same offer)', async () => {
	const r = await post({
		counts: { 'teen-pb': 1, [PB]: 1 },
		country: 'US',
		email: 'new@buyer.org',
	});
	assert.equal(r.status, 200, JSON.stringify(r.json));
	assert.equal(lines(r.s).find((x) => /Who Am I/.test(x.name)).unit, 1599);
	assert.equal(r.s['discounts[0][promotion_code]'], 'promo_1');
	assert.equal(r.s['metadata[book_lines]'], '1');
});

test('abroad (GB, measured wai_pb), first order: 15% off per unit + handling line, net measured in metadata', async () => {
	const r = await post({ counts: { [PB]: 1 }, country: 'GB', email: 'new@buyer.org' });
	assert.equal(r.status, 200, JSON.stringify(r.json));
	const l = lines(r.s);
	assert.equal(l.find((x) => /Who Am I/.test(x.name)).unit, 1359);
	assert.match(r.s['metadata[book_1]'], /country=GB\|date=\d{4}-\d{2}-\d{2}\|net_usd=\d+\.\d{2}$/);
});

test('reporting: a book sold on the Bible-cost fallback never reports a guessed net', async () => {
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
	const src = fs.readFileSync(new URL('../src/lib/storeEngine.ts', import.meta.url), 'utf8'); // catalogue: store engine (3fb)
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
	const src = fs.readFileSync(new URL('../src/lib/storeEngine.ts', import.meta.url), 'utf8'); // catalogue: store engine (3fb)
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
	// books surface off (books-surface.json): only the already-live book pages are built, and no /books index
	assert.ok(pages.length >= (surface.live ? 2 : surface.liveSlugs.length), `book pages built: ${pages.join(' ')}`);
	for (const slug of [...(surface.live ? [''] : []), ...pages]) {
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

test('3es F1/F3: Who Am I? title + offers InStock + no future datePublished', { skip: !surface.live && 'books surface off' }, () => {
	const html = fs.readFileSync(
		new URL('../dist/books/who-am-i/index.html', import.meta.url),
		'utf8',
	);
	assert.match(html, /<title>Who Am I\? Read-Aloud Devotional by Karen Inge Hailstones<\/title>/);
	assert.doesNotMatch(html, /"availability":"https:\/\/schema\.org\/(PreOrder|OutOfStock)"/);
	for (const [, d] of html.matchAll(/"datePublished":"([^"]+)"/g))
		assert.ok(new Date(d) <= new Date(), `future datePublished ${d}`);
});

// ORDER FORM ON THE PAGE (Kevin 2026-11-13 ~22:53Z L1999, "put the order form on the page" like
// /bibles/grandparents-bible/), ordering on the SMP store (L1990; contract 3fe). Every live book page carries the
// #order card with one price line and one counter per format, no one-line "per copy" price, and no off-site link.
test('every live book page has its order form ON the page: per-format price lines + counters, posting to SMP', () => {
	// The RIAB-standard order area (Kevin 2026-11-14 "This is the standard"; the SMP book page's box in FHB colours).
	for (const slug of ['beloved-identity', 'who-am-i'].filter((x) => surface.live || surface.liveSlugs.includes(x))) {
		const html = fs.readFileSync(new URL(`../dist/books/${slug}/index.html`, import.meta.url), 'utf8');
		assert.match(html, /<form id="order"[^>]*data-slug="[a-z0-9-]+"[^>]*data-status="live"/, `${slug}: order form on the page`);
		const skus = [...html.matchAll(/class="bo-qty__in"[^>]*name="([a-z0-9-]+)"/g)].map((m) => m[1]);
		assert.ok(skus.length >= 1, `${slug}: a quantity per format`);
		for (const sku of skus) assert.match(html, new RegExp(`data-sku="${sku}"`), `${slug}: ${sku} has its price row`);
		assert.match(html, /off first order \+ free standard shipping to \d+ countries/, `${slug}: the offer line`);
		assert.match(html, /aria-label="Keep shopping"/, `${slug}: Keep shopping`);
		// the first-order 15% needs the email (engine isFirstOrder): without it every book sells at list (2026-11-15 prod finding)
		assert.match(html, /<input[^>]*type="email"[^>]*name="email"[^>]*required/, `${slug}: email field for the first-order check`);
		assert.doesNotMatch(html, /hello@spiritmediapublishing\.com<|>[^<]*@spiritmediapublishing\.com/, `${slug}: no printed email address`);
		assert.doesNotMatch(html, /spiritmediapublishing\.com\/books\/[a-z0-9-]+\/buy\//, `${slug}: no hand-off to the SMP buy page`);
	}
	const src = fs.readFileSync(new URL('../src/components/BookOrder.astro', import.meta.url), 'utf8');
	// one store address for every FHB order box (Option C 2026-11-16): src/lib/storeOrigin.ts
	const store = fs.readFileSync(new URL('../src/lib/storeOrigin.ts', import.meta.url), 'utf8');
	assert.match(store, /https:\/\/spiritmediapublishing\.com'/, 'production orders on the SMP store');
	assert.match(src, /storeOrigin\(location\.hostname\)/, 'the book box uses the one store address');
	assert.match(src, /\/store-checkout`/, 'posts to SMP /store-checkout');
	assert.match(src, /const site = 'fhb'/, 'the sale records site=fhb');
	assert.match(src, /email: \(form\.querySelector\('\[data-email\]'\)/, 'the order sends the email');
});

// The on-page book form calls the SMP store cross-origin; the CSP must allow it on /books/* and ONLY there
// (2026-11-13: the first live test was blocked by the site-wide connect-src).
test('CSP: /books/* may connect to the SMP store; the site-wide policy may not', () => {
	const h = fs.readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
	const blocks = Object.fromEntries(
		h.split(/\n(?=\S)/).map((b) => [b.split('\n')[0].trim(), b]),
	);
	const connect = (b) => (b.match(/connect-src([^;]*)/) ?? [, ''])[1];
	assert.ok(blocks['/books/*'], '/books/* block exists');
	assert.match(blocks['/books/*'], /! Content-Security-Policy/);
	assert.match(connect(blocks['/books/*']), /https:\/\/spiritmediapublishing\.com/);
	assert.doesNotMatch(connect(blocks['/*']), /https:\/\/spiritmediapublishing\.com|spirit-media-publishing\.pages\.dev/);
	// Option C (2026-11-16): the Bible box pages order on the same store, so they carry the same allowance (prod + the
	// SMP dev preview storeOrigin.ts sends FHB previews to)
	const { STORE_PREVIEW } = { STORE_PREVIEW: 'https://dev.spirit-media-publishing.pages.dev' };
	for (const b of ['/books/*', '/bibles/*', '/print', '/print/*']) {
		assert.ok(blocks[b], `${b} block exists`);
		assert.match(blocks[b], /! Content-Security-Policy/, `${b} replaces the site policy`);
		assert.ok(connect(blocks[b]).includes(' https://spiritmediapublishing.com ') && connect(blocks[b]).includes(STORE_PREVIEW), `${b}: may connect to the store`);
	}
	assert.ok(fs.readFileSync(new URL('../src/lib/storeOrigin.ts', import.meta.url), 'utf8').includes(`'${STORE_PREVIEW}'`), 'CSP preview host = storeOrigin preview');
});

// DUPLICATE RULE (store-168 item 2; Kevin 2026-11-16 "SMP not FHB will be #1 retailer and distributor of FHB bibles,
// books, and SMP books"; brief: FH Bibles + FH books KEEP the FHB canonical for now — FHB has the measured reach; the SMP
// page for an FH book is the retail listing with rel=canonical -> FHB, asserted in SMP scripts/store-checkout.test.mjs).
// Revisit trigger (weekly store ledger): SMP Google impressions > FHB for 4 weeks -> flip that product.
// canonicalErrs() is the ONE check; the failure-path test proves it rejects a wrong canonical.
const canonicalErrs = (url, html, { product }) => {
	const got = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map((m) => m[1]);
	const errs = [];
	if (got.length !== 1) errs.push(`${url}: ${got.length} canonical tags`);
	else if (got[0] !== url) errs.push(`${url}: canonical ${got[0]} (must be self)`);
	if (product && !/"@type":\["Book","Product"\]/.test(html)) errs.push(`${url}: no Book+Product node`);
	if (product && !/"@type":"Offer"/.test(html)) errs.push(`${url}: no Offer`);
	return errs;
};
test('duplicate rule check FAILS on a wrong canonical or missing Product (proof the gate can reject)', () => {
	const u = 'https://fathersheartbible.com/books/who-am-i/';
	const ok = `<link rel="canonical" href="${u}"><script>{"@type":["Book","Product"],"offers":{"@type":"Offer"}}</script>`;
	assert.deepEqual(canonicalErrs(u, ok, { product: true }), []);
	assert.equal(canonicalErrs(u, ok.replace(u, 'https://spiritmediapublishing.com/books/who-am-i/'), { product: true }).length, 1, 'canonical -> SMP must fail');
	assert.equal(canonicalErrs(u, ok.replace('["Book","Product"]', '"Book"').replace('"Offer"', '"X"'), { product: true }).length, 2, 'no Product/Offer must fail');
	assert.equal(canonicalErrs(u, '<p></p>', { product: false }).length, 1, 'no canonical must fail');
});
test('FH books + FH Bible editions keep the FHB canonical (built pages)', { skip: !fs.existsSync(new URL('../dist/bibles/', import.meta.url)) && 'no dist' }, () => {
	const built = cat.books.filter((b) => fs.existsSync(new URL(`../dist/books/${b.slug}/index.html`, import.meta.url)));
	assert.ok(built.length >= 1, 'at least one FH book page built');
	for (const b of built) {
		const html = fs.readFileSync(new URL(`../dist/books/${b.slug}/index.html`, import.meta.url), 'utf8');
		const errs = canonicalErrs(`https://fathersheartbible.com/books/${b.slug}/`, html, { product: b.status === 'live' });
		assert.deepEqual(errs, [], errs.join('; '));
	}
	const bibles = fs.readdirSync(new URL('../dist/bibles/', import.meta.url)).filter((d) => /-bible$/.test(d));
	assert.ok(bibles.length >= 50, `only ${bibles.length} edition pages`);
	for (const d of bibles) {
		const html = fs.readFileSync(new URL(`../dist/bibles/${d}/index.html`, import.meta.url), 'utf8');
		const errs = canonicalErrs(`https://fathersheartbible.com/bibles/${d}/`, html, { product: false });
		assert.deepEqual(errs, [], errs.join('; '));
	}
});

// SELLABLE-39 (pmprint 2026-11-16, Kevin "1 store SMP. 2 shop windows FHB and SMP"): every registry row another site
// owns (owner_site smp) is SOLD by the engine with no books.json gate, so the row itself must carry what checkout needs:
// the 18 keys, a 13-digit ISBN, an integer list price > 0, and a checkout image that answers HTTP 200 at build time
// (Stripe shows it; a 404 is a broken checkout). Pure checker first so the failure path is proven offline.
const SMP_ROW_KEYS = ['owner_site', 'format', 'schema_format', 'isbn', 'isbn_display', 'list_cents', 'pages', 'trim', 'binding', 'checkout_title', 'checkout_name', 'checkout_desc', 'checkout_img', 'ingram_title', 'spec', 'floor_usd', 'cost_key', 'book'];
const smpRowErrs = (sku, r) => {
	const e = [];
	for (const k of SMP_ROW_KEYS) if (!(k in r)) e.push(`${sku}: missing key ${k}`);
	if (!/^97[89]\d{10}$/.test(String(r.isbn ?? ''))) e.push(`${sku}: isbn ${r.isbn}`);
	if (!Number.isInteger(r.list_cents) || r.list_cents <= 0) e.push(`${sku}: list_cents ${r.list_cents}`);
	if (!/^https:\/\/\S+$/.test(String(r.checkout_img ?? ''))) e.push(`${sku}: checkout_img ${r.checkout_img}`);
	return e;
};
const smpRows = Object.entries(SKU).filter(([, r]) => r.owner_site && r.owner_site !== 'fhb');
test('smp registry row checker FAILS on a missing ISBN, zero price or bad image (proof the gate can reject)', () => {
	const [sku, r] = smpRows[0];
	assert.deepEqual(smpRowErrs(sku, r), []);
	assert.equal(smpRowErrs(sku, { ...r, isbn: null }).length, 1, 'no ISBN must fail');
	assert.equal(smpRowErrs(sku, { ...r, list_cents: 0 }).length, 1, 'price 0 must fail');
	assert.equal(smpRowErrs(sku, { ...r, checkout_img: '' }).length, 1, 'no image must fail');
	const { book, ...short } = r;
	assert.equal(smpRowErrs(sku, short).length, 1, 'a missing key must fail');
});
test('every owner_site smp registry row: 18 keys, ISBN, list_cents > 0, unique ISBN', () => {
	assert.ok(smpRows.length >= 80, `only ${smpRows.length} smp rows`);
	const errs = smpRows.flatMap(([sku, r]) => smpRowErrs(sku, r));
	assert.deepEqual(errs, [], errs.join('; '));
	const isbns = Object.values(SKU).map((r) => r.isbn).filter(Boolean);
	assert.equal(new Set(isbns).size, isbns.length, 'an ISBN sits on two registry rows');
});
test('every owner_site smp checkout_img answers HTTP 200 (build-time network check)', async () => {
	const urls = [...new Set(smpRows.map(([, r]) => r.checkout_img))];
	const bad = [];
	for (let i = 0; i < urls.length; i += 8)
		await Promise.all(
			urls.slice(i, i + 8).map(async (u) => {
				let st = 0;
				for (let a = 0; a < 3 && st !== 200; a++)
					st = await fetch(u, { method: 'HEAD', signal: AbortSignal.timeout(10000) }).then((r) => r.status, () => 0);
				if (st !== 200) bad.push(`${u} -> ${st}`);
			}),
		);
	assert.deepEqual(bad, [], bad.join('; '));
});
