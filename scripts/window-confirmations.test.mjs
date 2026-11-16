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

test('item 8: FH window -> Father’s Heart Bible subject + sign-off; SMP window -> Spirit Media Publishing', async () => {
	const fhb = await confirm({ site: 'fhb', window: 'fhb', family: 'bible' });
	assert.equal(fhb.status, 200);
	assert.equal(fhb.buyer.subject, 'Your Father’s Heart Bible order — $31.98');
	assert.ok(fhb.buyer.text.endsWith(`\n\nFather’s Heart Bible · Spirit Media Publishing\n\n${SIGNATURE}\n`));
	const smp = await confirm({ site: 'smp', window: 'smp', family: 'smp_book' });
	assert.equal(smp.buyer.subject, 'Your Spirit Media Publishing order — $31.98');
	assert.ok(smp.buyer.text.endsWith(`\n\nSpirit Media Publishing · spiritmediapublishing.com\n\n${SIGNATURE}\n`));
	// body unchanged: only the sign-off line differs between the two windows
	const cut = (t) => t.slice(0, t.lastIndexOf('\n\n', t.lastIndexOf('\n\n') - 1));
	assert.equal(cut(fhb.buyer.text), cut(smp.buyer.text));
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
	assert.ok(r.kevin.text.startsWith('New print order — Father\'s Heart Bible'));
	const e = await confirm({ site: 'fhb', window: 'fhb', family: 'bible_ebook' }, { kind: 'ebook_direct', amount: 749 });
	assert.equal(e.buyer['h:Reply-To'], 'hello@spiritmediapublishing.com');
	assert.equal(e.buyer.subject, 'Your Father’s Heart Bible eBook');
	assert.ok(e.buyer.text.endsWith(`\n\nFather’s Heart Bible · Spirit Media Publishing\n\n${SIGNATURE}\n`));
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
