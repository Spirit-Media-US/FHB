// node --test scripts/window-confirmations.test.mjs — Option C items 8 + 9 (Kevin 2026-11-16 "1A"; CONTACT US rule).
// 8: the buyer's confirmation is branded by the session's shop window (metadata[window], item 1): subject + sign-off
//    only; the body is the same. 9: the buyer's emails Reply-To hello@; /order shows a "Contact us" button, never the
//    address; Kevin's internal notification is unchanged (his address, Reply-To = the buyer).
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { build } from 'esbuild';
import { buyerBrand, NOTIFY_FROM, SIGNATURE, onRequestPost as webhook } from '../functions/print-webhook.ts';

const secret = 'whsec_test';
export async function confirm(metadata, { email = 'buyer@test', amount = 3198, kind = 'dvc_print' } = {}) {
	const event = JSON.stringify({
		type: 'checkout.session.completed',
		data: { object: { id: 'cs_test_window', amount_total: amount, currency: 'usd', customer_details: { email, phone: '+15555550123' },
			metadata: { kind, total: '2', pct_off: '0', offer: 'none', breakdown: 'moms-pb:2', ...metadata },
			collected_information: { shipping_details: { name: 'Ann Reader', address: { line1: '1 Main St', city: 'Austin', state: 'TX', postal_code: '78701', country: 'US' } } } } },
	});
	const t = Math.floor(Date.now() / 1000);
	const sig = crypto.createHmac('sha256', secret).update(`${t}.${event}`).digest('hex');
	const sent = [];
	const real = globalThis.fetch;
	globalThis.fetch = async (url, init) => {
		if (String(url).includes('mailgun')) sent.push(Object.fromEntries(init.body));
		return new Response('{}', { status: 200 });
	};
	try {
		const res = await webhook({
			request: new Request('https://x/print-webhook', { method: 'POST', body: event, headers: { 'stripe-signature': `t=${t},v1=${sig}` } }),
			env: { STRIPE_PRINT_WEBHOOK_SECRET: secret, MAILGUN_API_KEY: 'k', PRINT_ORDER_NOTIFY_TO: 'orders@test' },
		});
		return { status: res.status, kevin: sent.find((m) => m.to === 'orders@test'), buyer: sent.find((m) => m.to === email) };
	} finally {
		globalThis.fetch = real;
	}
}

// ONE STORE (Kevin 2026-11-20 ~16:07Z "the store is NOW Spirit Media Publishing whether it is FHB or not"): every buyer
// confirmation, from either shop window, is "Your Spirit Media Publishing order" with no window line; product names stay.
test('one store: FHB-window AND SMP-window orders both -> Spirit Media Publishing subject, no window line', async () => {
	const fhb = await confirm({ site: 'fhb', window: 'fhb', family: 'bible' });
	assert.equal(fhb.status, 200);
	const smp = await confirm({ site: 'smp', window: 'smp', family: 'smp_book' });
	const riab = await confirm({}, {}); // an untagged session (the RIAB case that read FHB)
	for (const r of [fhb, smp, riab]) {
		assert.equal(r.buyer.subject, 'Your Spirit Media Publishing order — $31.98');
		assert.ok(r.buyer.text.endsWith(`straight to us — please include your order reference above.\n\n${SIGNATURE}\n`), 'no window line');
		assert.doesNotMatch(`${r.buyer.subject}\n${r.buyer.text.split('What you ordered:')[0]}`, /Father.s Heart Bible/, 'FHB never named as the seller');
		assert.doesNotMatch(r.buyer.text, /Father’s Heart Bible · Spirit Media Publishing/);
	}
	assert.equal(fhb.buyer.text, smp.buyer.text, 'same body from both windows');
	if (process.env.SHOW_MESSAGE) for (const m of [fhb.buyer, smp.buyer]) console.log(`\n--- ${m.subject} ---\n${m.text}`);
});

test('item 8: a session from before the tags is branded by its site (smp/vaneure -> SMP; fhb or none -> FHB)', () => {
	assert.equal(buyerBrand({ site: 'smp' }, '$1').window, 'smp');
	assert.equal(buyerBrand({ site: 'vaneure' }, '$1').window, 'smp');
	assert.equal(buyerBrand({ site: 'fhb' }, '$1').window, 'fhb');
	assert.equal(buyerBrand({}, '$1').window, 'fhb');
	assert.equal(buyerBrand({ site: 'smp', window: 'fhb' }, '$1').window, 'fhb', 'the window tag wins');
});

test('item 9: buyer emails Reply-To hello@; Kevin’s notification unchanged (his inbox, Reply-To the buyer)', async () => {
	const r = await confirm({ site: 'fhb', window: 'fhb', family: 'bible' });
	assert.equal(r.buyer['h:Reply-To'], 'hello@spiritmediapublishing.com');
	assert.equal(r.kevin['h:Reply-To'], 'buyer@test');
	assert.match(r.kevin.subject, /^📚 Print order — 2 copies · \$31\.98$/);
	assert.ok(r.kevin.text.startsWith('New print order — Spirit Media Publishing\n\nShop window: fathersheartbible.com\n'), 'FHB-window order: one store heading');
	const smp = await confirm({ site: 'vaneure', window: 'smp', family: 'book' });
	assert.ok(smp.kevin.text.startsWith('New print order — Spirit Media Publishing\n\nShop window: spiritmediapublishing.com\n'), 'an SMP-window order (RIAB) is headed SMP, not FHB');
	assert.doesNotMatch(`${r.kevin.text}${smp.kevin.text}`.split('Editions:')[0], /Father.s Heart Bible/, 'notice heading never names FHB as the store');
	const e = await confirm({ site: 'fhb', window: 'fhb', family: 'bible_ebook' }, { kind: 'ebook_direct', amount: 749 });
	assert.equal(e.buyer['h:Reply-To'], 'hello@spiritmediapublishing.com');
	assert.equal(e.buyer.subject, 'Your eBook — Father’s Heart Bible', 'product named, not the store');
	assert.ok(e.buyer.text.endsWith(`Trouble opening it? Just reply to this email.\n\n${SIGNATURE}\n`), 'no FHB window line');
	assert.equal(e.kevin['h:Reply-To'], 'buyer@test');
});

// ---- item 9: /order shows a Contact us BUTTON; the address is never printed ----
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ord-'));
const out = path.join(dir, 'order.mjs');
await build({ entryPoints: ['functions/order.ts'], bundle: true, format: 'esm', platform: 'neutral', outfile: out, logLevel: 'silent', loader: { '.json': 'json' } });
const { onRequestGet } = await import(out);
const printedAddress = (html) => html.replace(/href="[^"]*"/g, '').includes('@spiritmediapublishing.com');
test('item 9: every /order state has the Contact us button and never prints the address', async () => {
	const f = globalThis.fetch;
	globalThis.fetch = async () => new Response(JSON.stringify({ id: 'cs_test_a1B2c3', payment_status: 'paid', amount_total: 3198, currency: 'usd', customer_details: { email: 'b@example.com' }, metadata: { breakdown: 'moms-pb:2' } }));
	try {
		const pages = {
			paid: await onRequestGet({ request: new Request('https://x.test/order?s=cs_test_a1B2c3'), env: { STRIPE_FHB_SECRET_KEY: 'k' } }),
			lookup: await onRequestGet({ request: new Request('https://x.test/order'), env: { STRIPE_FHB_SECRET_KEY: 'k' } }),
			nokey: await onRequestGet({ request: new Request('https://x.test/order?s=cs_test_a1B2c3'), env: {} }),
		};
		for (const [k, r] of Object.entries(pages)) {
			const html = await r.text();
			assert.match(html, /<a class="contact" href="mailto:hello@spiritmediapublishing\.com[^"]*">Contact us<\/a>/, `${k}: button`);
			assert.equal(printedAddress(html), false, `${k}: address printed`);
		}
		assert.equal(printedAddress('<p>Email <a href="mailto:hello@spiritmediapublishing.com">hello@spiritmediapublishing.com</a></p>'), true, 'the check catches a printed address');
	} finally {
		globalThis.fetch = f;
	}
});

// ---- item 10 (Kevin 2026-11-16): From "SMP Orders" on every order email; the 7-line address signature on every buyer email
const SEVEN = ['Spirit Media Publishing', '205 S Academy St Unit 3251', 'Cary, NC 27519', 'USA', 'Tel. 1-888-800-3744', 'spiritmediapublishing.com', 'fathersheartbible.com'];
const endsWithSeven = (text) => text.trimEnd().split('\n').slice(-7).join('\n') === SEVEN.join('\n');
test('item 10: every order email is From "SMP Orders"; every buyer email ends with the 7 signature lines in order', async () => {
	assert.equal(NOTIFY_FROM, 'SMP Orders <orders@send.spiritmediapublishing.com>');
	const all = [
		await confirm({ site: 'fhb', window: 'fhb', family: 'bible' }),
		await confirm({ site: 'smp', window: 'smp', family: 'smp_book' }),
		await confirm({ site: 'fhb', window: 'fhb', family: 'bible_ebook' }, { kind: 'ebook_direct', amount: 749 }),
	];
	for (const r of all) {
		for (const m of [r.buyer, r.kevin]) assert.match(m.from, /^SMP Orders </, `${m.subject}: From name`);
		assert.ok(endsWithSeven(r.buyer.text), `${r.buyer.subject}: signature`);
		assert.ok(r.buyer.html.includes('205 S Academy St Unit 3251'), `${r.buyer.subject}: html part too`);
	}
	// FAILURE PATH: the check rejects a missing, reordered or partial signature
	assert.equal(endsWithSeven('Thanks\n\nSpirit Media Publishing\n'), false);
	assert.equal(endsWithSeven(`x\n${[...SEVEN].reverse().join('\n')}\n`), false);
	assert.equal(endsWithSeven(`x\n${SEVEN.slice(0, 6).join('\n')}\n`), false);
});

// ---- Kevin 2026-11-16 15:42Z "we do not need: Spirit Media Publishing · spiritmediapublishing.com above the signature"
test('NO window line above the signature on ANY buyer email (both windows, print and eBook)', async () => {
	const all = [
		await confirm({ site: 'smp', window: 'smp', family: 'smp_book' }),
		await confirm({ site: 'fhb', window: 'fhb', family: 'bible' }),
		await confirm({ site: 'fhb', window: 'fhb', family: 'bible_ebook' }, { kind: 'ebook_direct', amount: 749 }),
	];
	for (const r of all) {
		assert.doesNotMatch(r.buyer.text, /Spirit Media Publishing · spiritmediapublishing\.com|Father’s Heart Bible · Spirit Media Publishing/, `${r.buyer.subject}: no window line`);
		assert.equal(r.buyer.text.split('Spirit Media Publishing\n205 S Academy').length, 2, `${r.buyer.subject}: the signature once`);
	}
	assert.equal(buyerBrand({ window: 'smp' }, '$1').signoff, '');
	assert.equal(buyerBrand({ window: 'fhb' }, '$1').signoff, '');
});

// ── DIRECT EBOOK SALES (Kevin 2026-11-16 "We point to our own ebook sales") ──────────────────────────────────────────
// The eBook email is one of the window confirmations, so its proof lives here. There is NO Stripe test-mode key for the
// store account (every key on Bethel is live), so nothing here charges a card: the flow is proven against a recorded
// checkout.session.completed fixture (scripts/fixtures/ebook-session-completed.json) with Stripe, Mailgun and R2
// stubbed. Proves: the engine's eBook form (no shipping, first-order 15%, tags, mixed-cart and KDP Select refusals); the
// webhook emails the buyer a SIGNED link on the SMP window; that link downloads the file; and the download REFUSES an
// unpaid session, an unknown session, a tampered signature (with no Stripe call) and a signature lifted onto another
// SKU. The Bible eBook's v1 path is unchanged.
import ebookFiles from '../src/data/ebook-files.json' with { type: 'json' };
import bookSkus from '../src/data/book-skus.json' with { type: 'json' };
import EBOOK from '../functions/ebook-current.json' with { type: 'json' };
import { onRequestGet as download } from '../functions/ebook-download.ts';
import { sessionGrantsEbook, signEbookLink, verifyEbookLink, windowOrigin } from '../src/lib/ebookLink.ts';
import {
	EBOOK_SKUS,
	ebookCheckoutForm,
	ebookForBook,
	ebookOnSale,
	familyOf,
	storeTagErrors,
	storeTags,
} from '../src/lib/storeEngine.ts';

const FIX = JSON.parse(fs.readFileSync(new URL('./fixtures/ebook-session-completed.json', import.meta.url), 'utf8'));
const SESSION = FIX.data.object;
const SID = SESSION.id;
const SKU = 'fixture-book-ebook';
const WHSEC = 'whsec_fixture_only';
// the test-only registry row + file the fixture sells (never in the committed data)
EBOOK_SKUS[SKU] = { title: 'Fixture Book', isbn: '9790000000000', listCents: 599, bookSlug: 'fixture-book', img: null, selectUntil: null };
ebookFiles.files[SKU] = { key: 'fixture-book-v1.epub', filename: 'Fixture-Book.epub' };
const EPUB_BYTES = 'PK\u0003\u0004fixture-epub';
const deps = (first = false) => ({ enabled: true, isFirstOrder: async () => first, firstOrderPromo: async () => (first ? 'promo_WELCOME15' : null) });

// stubs: Stripe (sessions by id), Mailgun (records), R2 (one bucket)
function stubs(sessions) {
	const calls = { stripe: [], mail: [] };
	const real = globalThis.fetch;
	globalThis.fetch = async (url, init) => {
		const u = String(url);
		if (u.includes('mailgun')) {
			calls.mail.push(Object.fromEntries(init.body));
			return new Response('{}', { status: 200 });
		}
		if (u.startsWith('https://api.stripe.com/v1/checkout/sessions/')) {
			calls.stripe.push(u);
			const id = u.split('/').pop().split('?')[0];
			if (init?.method === 'POST') return new Response('{}', { status: 200 }); // markNotified
			return sessions[id] ? new Response(JSON.stringify(sessions[id]), { status: 200 }) : new Response('{"error":{}}', { status: 404 });
		}
		throw new Error(`unexpected fetch ${u}`);
	};
	return { calls, restore: () => (globalThis.fetch = real) };
}
const R2 = { get: async (k) => (k === ebookFiles.files[SKU].key || k === EBOOK.key ? { body: `${EPUB_BYTES}:${k}` } : null) };
const ENV = { STRIPE_FHB_SECRET_KEY: 'rk_test_stub', STRIPE_PRINT_WEBHOOK_SECRET: WHSEC, FHB_EBOOK: R2 };
const get = (p, env = ENV) => download({ request: new Request(`https://spiritmediapublishing.com${p}`), env });

test('EBOOK fixture is EXACTLY what the engine sends Stripe for its order (it cannot drift)', async () => {
	const o = FIX._order;
	const r = await ebookCheckoutForm(o, 'https://spiritmediapublishing.com/store-checkout', deps(o.firstOrder), new Date(o.now));
	assert.ok('form' in r, JSON.stringify(r));
	Object.assign(r.form, storeTags(o.site, familyOf(o.counts)));
	const meta = Object.fromEntries(Object.entries(r.form).filter(([k]) => k.startsWith('metadata[')).map(([k, v]) => [k.slice(9, -1), String(v)]));
	assert.deepEqual(meta, SESSION.metadata);
	assert.equal(r.form.success_url, SESSION.success_url);
	assert.equal(r.form.cancel_url, SESSION.cancel_url);
	assert.equal(r.form['line_items[0][price_data][unit_amount]'], SESSION.amount_subtotal);
});

test('EBOOK ENGINE: no shipping, carries the tags, takes the first-order 15%', async () => {
	const r = await ebookCheckoutForm({ counts: { [SKU]: 1 }, email: 'new@example.com', returnPath: '/books/fixture-book/' }, 'https://spiritmediapublishing.com/store-checkout', deps(true));
	assert.ok('form' in r);
	const f = { ...r.form, ...storeTags('smp', familyOf({ [SKU]: 1 })) };
	assert.deepEqual(storeTagErrors(f), [], 'tagged');
	assert.equal(f['metadata[family]'], 'smp_ebook');
	assert.equal(f['metadata[kind]'], 'ebook_direct');
	assert.equal(f['discounts[0][promotion_code]'], 'promo_WELCOME15', 'first order: WELCOME15 pre-applied');
	assert.equal(f['metadata[offer]'], 'first_order');
	assert.match(f['metadata[book_1]'], /unit_cents=509\|/, '15% off 5.99 recorded for author reporting');
	assert.ok(!Object.keys(f).some((k) => /shipping|phone_number/.test(k)), 'no shipping, no phone: nothing ships');
	assert.equal(f['line_items[0][price_data][product_data][tax_code]'], 'txcd_10202001', 'e-book tax code');
	assert.equal(f.billing_address_collection, 'required');
	const rep = await ebookCheckoutForm({ counts: { [SKU]: 1 }, email: 'old@example.com' }, 'https://x.pages.dev/store-checkout', deps(false));
	assert.equal(rep.form['discounts[0][promotion_code]'], undefined, 'repeat buyer: list price');
	assert.equal(rep.form.cancel_url, 'https://x.pages.dev/bookstore/?order=canceled', 'unknown return path: the bookstore, never an open redirect');
	const prod = await ebookCheckoutForm({ counts: { [SKU]: 1 } }, 'https://spirit-media-publishing.pages.dev/store-checkout', deps());
	assert.match(prod.form.success_url, /^https:\/\/spiritmediapublishing\.com\/ebook-download\?s=/, 'the production Pages host returns to the .com');
});

test('EBOOK ENGINE REFUSES: a mixed cart, two copies, an unknown SKU, an eBook in an active KDP Select term', async () => {
	const url = 'https://spiritmediapublishing.com/store-checkout';
	const pb = Object.keys(bookSkus.skus)[0];
	assert.equal((await ebookCheckoutForm({ counts: { [SKU]: 1, [pb]: 1 } }, url, deps())).body.error, 'ebook_separate');
	assert.equal((await ebookCheckoutForm({ counts: { [SKU]: 2 } }, url, deps())).body.error, 'invalid_selection');
	assert.equal((await ebookCheckoutForm({ counts: { 'no-such-ebook': 1 } }, url, deps())).body.error, 'invalid_selection');
	assert.equal((await ebookCheckoutForm({ counts: {} }, url, deps())).body.error, 'invalid_selection');
	EBOOK_SKUS['select-book-ebook'] = { ...EBOOK_SKUS[SKU], bookSlug: 'select-book', selectUntil: '2026-12-20' };
	try {
		const before = new Date('2026-12-19T23:00:00Z');
		assert.equal(ebookOnSale('select-book-ebook', before), false, 'in its Select term: not on sale');
		assert.equal(ebookForBook('select-book', before), null, 'its page keeps the Amazon button');
		assert.equal((await ebookCheckoutForm({ counts: { 'select-book-ebook': 1 } }, url, deps(), before)).body.error, 'not_on_sale');
		const after = new Date('2026-12-20T00:00:01Z');
		assert.equal(ebookOnSale('select-book-ebook', after), true, 'the day the term ends it joins our store');
		assert.ok('form' in (await ebookCheckoutForm({ counts: { 'select-book-ebook': 1 } }, url, deps(), after)));
	} finally {
		delete EBOOK_SKUS['select-book-ebook'];
	}
	const off = await ebookCheckoutForm({ counts: { [SKU]: 1 } }, url, { ...deps(), enabled: false });
	assert.equal(off.body.disabled, true, 'no Stripe key: disabled, never a session');
});

test('EBOOK SIGNED LINK: verifies only for its own session + SKU + secret; tampering fails', async () => {
	const t = await signEbookLink(WHSEC, SID, SKU);
	assert.match(t, /^[A-Za-z0-9_-]{43}$/);
	assert.equal(await verifyEbookLink(WHSEC, SID, SKU, t), true);
	const flip = t.slice(0, 10) + (t[10] === 'A' ? 'B' : 'A') + t.slice(11);
	assert.equal(await verifyEbookLink(WHSEC, SID, SKU, flip), false, 'one character changed');
	assert.equal(await verifyEbookLink(WHSEC, SID, 'other-book-ebook', t), false, 'lifted onto another SKU');
	assert.equal(await verifyEbookLink(WHSEC, `${SID.slice(0, -1)}X`, SKU, t), false, 'lifted onto another session');
	assert.equal(await verifyEbookLink('whsec_other', SID, SKU, t), false, 'another secret');
	assert.equal(await verifyEbookLink(undefined, SID, SKU, t), false, 'no secret bound: never verifies');
	assert.equal(await verifyEbookLink(WHSEC, SID, SKU, ''), false, 'no signature');
	assert.equal(await signEbookLink(WHSEC, 'cs_bad', SKU), null, 'malformed session: unsignable');
	// the derived-key construction, re-computed independently (bin/fhb-order-reconcile.py mirrors exactly this)
	const k = crypto.createHmac('sha256', WHSEC).update('smp-ebook-download-link-v1').digest();
	assert.equal(crypto.createHmac('sha256', k).update(`${SID}.${SKU}`).digest('base64url'), t);
	assert.equal(sessionGrantsEbook(SESSION, SID, SKU), true);
	assert.equal(sessionGrantsEbook({ ...SESSION, payment_status: 'unpaid' }, SID, SKU), false);
	assert.equal(sessionGrantsEbook(SESSION, SID, 'other-book-ebook'), false);
	assert.equal(windowOrigin('smp'), 'https://spiritmediapublishing.com');
	assert.equal(windowOrigin('fhb'), 'https://fathersheartbible.com');
});

async function deliver(event = FIX) {
	const raw = JSON.stringify(event);
	const ts = Math.floor(Date.now() / 1000);
	const v1 = crypto.createHmac('sha256', WHSEC).update(`${ts}.${raw}`).digest('hex');
	const st = stubs({});
	try {
		const res = await webhook({
			request: new Request('https://fathersheartbible.com/print-webhook', { method: 'POST', body: raw, headers: { 'stripe-signature': `t=${ts},v1=${v1}` } }),
			env: { STRIPE_PRINT_WEBHOOK_SECRET: WHSEC, STRIPE_FHB_SECRET_KEY: 'rk_test_stub', MAILGUN_API_KEY: 'k', PRINT_ORDER_NOTIFY_TO: 'orders@test' },
		});
		return { status: res.status, buyer: st.calls.mail.find((m) => m.to === 'buyer@example.com'), kevin: st.calls.mail.find((m) => m.to === 'orders@test') };
	} finally {
		st.restore();
	}
}

test('EBOOK WEBHOOK (recorded fixture): a SIGNED link on the SMP window, no window line, address signature', async () => {
	const { status, buyer, kevin } = await deliver();
	assert.equal(status, 200);
	assert.equal(buyer.subject, 'Your eBook — Fixture Book');
	assert.equal(buyer.from, 'SMP Orders <orders@send.spiritmediapublishing.com>');
	const link = buyer.text.match(/https:\/\/\S+/)[0];
	assert.match(link, /^https:\/\/spiritmediapublishing\.com\/ebook-download\?s=cs_test_[^&]+&e=fixture-book-ebook&t=[A-Za-z0-9_-]{43}$/);
	const u = new URL(link);
	assert.equal(await verifyEbookLink(WHSEC, u.searchParams.get('s'), u.searchParams.get('e'), u.searchParams.get('t')), true);
	assert.ok(endsWithSeven(buyer.text), 'ends with the 7-line address signature');
	assert.doesNotMatch(buyer.text, /Spirit Media Publishing · spiritmediapublishing\.com|Father’s Heart Bible · Spirit Media Publishing/, 'SMP window: no window line');
	assert.match(kevin.text, /eBook SKU: fixture-book-ebook · window: smp/);
});

test('EBOOK DOWNLOAD: the emailed link serves the page and the EPUB for the paid session', async () => {
	const { buyer } = await deliver();
	const link = new URL(buyer.text.match(/https:\/\/\S+/)[0]);
	const st = stubs({ [SID]: SESSION });
	try {
		const pg = await get(`${link.pathname}${link.search}`);
		assert.equal(pg.status, 200);
		const html = await pg.text();
		assert.match(html, /Fixture Book/);
		assert.match(html, /&amp;dl=epub">Download EPUB/);
		const file = await get(`${link.pathname}${link.search}&dl=epub`);
		assert.equal(file.status, 200);
		assert.equal(file.headers.get('content-type'), 'application/epub+zip');
		assert.equal(file.headers.get('content-disposition'), 'attachment; filename="Fixture-Book.epub"');
		assert.equal(await file.text(), `${EPUB_BYTES}:fixture-book-v1.epub`);
		// Stripe's success redirect carries only the session: it is re-read and signed, then sent to the signed link
		const ok = await get(`/ebook-download?s=${SID}`);
		assert.equal(ok.status, 302);
		assert.equal(ok.headers.get('location'), `${link.pathname}${link.search}`);
	} finally {
		st.restore();
	}
});

test('EBOOK DOWNLOAD REFUSES: unpaid session, unknown session, tampered signature (no Stripe call), SKU swap, no secret', async () => {
	const t = await signEbookLink(WHSEC, SID, SKU);
	const at = (sid, sku, sig, dl = '') => `/ebook-download?s=${sid}&e=${sku}&t=${sig}${dl}`;
	// unpaid: a real session that has not been paid
	let st = stubs({ [SID]: { ...SESSION, payment_status: 'unpaid', status: 'open' } });
	try {
		for (const dl of ['', '&dl=epub']) {
			const r = await get(at(SID, SKU, t, dl));
			assert.equal(r.status, 403, `unpaid${dl}`);
			assert.match(await r.text(), /couldn’t verify that purchase/);
		}
		assert.equal((await get(`/ebook-download?s=${SID}`)).status, 403, 'unpaid success redirect');
	} finally {
		st.restore();
	}
	// unknown: Stripe has no such session (a correctly SIGNED link for it still gets nothing)
	const ghost = 'cs_test_a1NoSuchSession000000000000000000000000000000000';
	const tg = await signEbookLink(WHSEC, ghost, SKU);
	st = stubs({});
	try {
		assert.equal((await get(at(ghost, SKU, tg, '&dl=epub'))).status, 403, 'unknown session');
		assert.equal((await get(`/ebook-download?s=${ghost}`)).status, 403, 'unknown session, success redirect');
	} finally {
		st.restore();
	}
	// tampered signature: refused BEFORE Stripe is asked
	st = stubs({ [SID]: SESSION });
	try {
		const bad = t.slice(0, -1) + (t.endsWith('A') ? 'B' : 'A');
		for (const sig of [bad, '', 'x'.repeat(43), t.toUpperCase()]) {
			assert.equal((await get(at(SID, SKU, sig, '&dl=epub'))).status, 403, `tampered "${sig.slice(0, 6)}…"`);
		}
		assert.equal(st.calls.stripe.length, 0, 'a tampered link never reaches Stripe');
		// SKU swap: a valid signature for a SKU the session did not buy (the signer never issues it; the session refuses it)
		ebookFiles.files['other-book-ebook'] = { key: 'other-book-v1.epub', filename: 'Other.epub' };
		const t2 = await signEbookLink(WHSEC, SID, 'other-book-ebook');
		assert.equal((await get(at(SID, 'other-book-ebook', t2, '&dl=epub'))).status, 403, 'SKU swap');
		delete ebookFiles.files['other-book-ebook'];
		// no signing secret bound on the deployment: nothing verifies
		assert.equal((await get(at(SID, SKU, t, '&dl=epub'), { ...ENV, STRIPE_PRINT_WEBHOOK_SECRET: undefined })).status, 403, 'no secret');
	} finally {
		st.restore();
	}
});

test('EBOOK: the Bible eBook v1 path is unchanged (session link, no signature)', async () => {
	const bid = 'cs_live_a1BibleEbookSession000000000000000000000000000000';
	const st = stubs({ [bid]: { id: bid, payment_status: 'paid', metadata: { kind: 'ebook_direct', site: 'fhb', window: 'fhb', family: 'bible_ebook' } } });
	try {
		const pg = await get(`/ebook-download?s=${bid}`);
		assert.equal(pg.status, 200);
		assert.match(await pg.text(), /Father’s Heart Bible eBook is ready/);
		assert.equal(await (await get(`/ebook-download?s=${bid}&dl=epub`)).text(), `${EPUB_BYTES}:${EBOOK.key}`);
	} finally {
		st.restore();
	}
});

test('EBOOK REGISTRY: every committed eBook row is complete, priced, has its private file, never sits in skus', () => {
	const rows = bookSkus.ebooks ?? {};
	const files = JSON.parse(fs.readFileSync(new URL('../src/data/ebook-files.json', import.meta.url), 'utf8')).files;
	for (const [sku, r] of Object.entries(rows)) {
		assert.equal(r.format, 'eBook', sku);
		assert.ok(Number.isInteger(r.list_cents) && r.list_cents > 0, `${sku}: a price`);
		assert.match(r.price_source?.asin ?? '', /^B0[A-Z0-9]{8}$/, `${sku}: priced from a live Kindle listing`);
		assert.ok(r.book && r.checkout_name, `${sku}: book + title`);
		assert.ok(files[sku]?.key && /\.epub$/.test(files[sku].key), `${sku}: a private EPUB on R2`);
		assert.ok(!bookSkus.skus[sku], `${sku}: never a print sku`);
		if (r.select_until) assert.match(r.select_until, /^\d{4}-\d{2}-\d{2}$/, `${sku}: Select term end date`);
	}
	for (const sku of Object.keys(files)) assert.ok(rows[sku], `${sku}: a file with no registry row`);
	for (const sku of Object.keys(bookSkus.skus)) assert.equal(EBOOK_SKUS[sku], undefined, `${sku}: a print sku is never an eBook`);
});
