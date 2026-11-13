// node --test scripts/checkout-event.test.mjs   (unit 2rz)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildCheckoutEvent, sendCheckoutEvent, qtyBucket } from '../src/lib/checkoutEvent.ts';

test('payload shape: aggregate fields only, no personal fields', () => {
	const ev = buildCheckoutEvent({ 'general-regular-plum-hb': 2, 'general-regular-plum-pb': 0 }, { path: '/bibles/seekers-bible/', dest: 'ca', lang: 'es' });
	assert.deepEqual(Object.keys(ev).sort(), ['binding', 'dest', 'editions', 'kind', 'lang', 'path', 'qty', 'ref'].sort());
	assert.equal(ev.kind, 'checkout_start');
	assert.equal(ev.binding, 'hc');
	assert.equal(ev.qty, '2-4');
	assert.equal(ev.dest, 'CA');
	assert.equal(ev.lang, 'es');
	assert.deepEqual(ev.editions, ['general-regular-plum']);
	assert.ok(!/email|name|address|ip/i.test(Object.keys(ev).join(',')));
});
test('mixed binding + buckets', () => {
	assert.equal(buildCheckoutEvent({ 'a-hb': 1, 'b-pb': 1 }, { path: '/print/order/' }).binding, 'mixed');
	assert.deepEqual([1, 4, 9, 24, 25].map(qtyBucket), ['1', '2-4', '5-9', '10-24', '25+']);
});
test('sendBeacon is called to /_evt with a JSON blob', async () => {
	let got;
	sendCheckoutEvent(buildCheckoutEvent({ 'x-pb': 1 }, { path: '/print/order/' }), { sendBeacon: (u, b) => ((got = { u, b }), true) });
	assert.equal(got.u, '/_evt');
	assert.equal(JSON.parse(await got.b.text()).kind, 'checkout_start');
});
test('the order-form checkout click path calls the beacon before the POST', () => {
	const s = fs.readFileSync(new URL('../src/scripts/order-form.ts', import.meta.url), 'utf8');
	const i = s.indexOf('sendCheckoutEvent(buildCheckoutEvent') >= 0 ? s.indexOf('sendCheckoutEvent(') : s.indexOf('sendCheckoutEvent(\n');
	assert.ok(i > 0, 'order-form.ts must call sendCheckoutEvent');
	assert.ok(i < s.indexOf("fetch('/dvc-checkout', {\n\t\t\t\tmethod: 'POST',\n\t\t\t\theaders: { 'content-type': 'application/json' },\n\t\t\t\tbody: JSON.stringify({\n\t\t\t\t\tcounts"));
});

// ── 3ef-1 (pmseoaeo 2026-11-13): /dvc-checkout reports every POST server-side, tagged site|qa ────────────────
import { checkoutTag, onRequestPost } from '../functions/dvc-checkout.ts';

test('3ef-1 checkoutTag: preview host, example email, x-fhb-qa, scripted UA -> qa; a browser -> site', () => {
	const chrome = 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36';
	assert.equal(checkoutTag('fathersheartbible.com', 'a@gmail.com', chrome, null), 'site');
	assert.equal(checkoutTag('dev.fathersheartbible.pages.dev', 'a@gmail.com', chrome, null), 'qa');
	assert.equal(checkoutTag('fathersheartbible.com', 'mobile-audit@example.com', chrome, null), 'qa');
	assert.equal(checkoutTag('fathersheartbible.com', '', 'Mozilla/5.0 HeadlessChrome/130', null), 'qa');
	assert.equal(checkoutTag('fathersheartbible.com', '', 'python-urllib/3.10', null), 'qa');
	assert.equal(checkoutTag('fathersheartbible.com', '', chrome, '1'), 'qa');
});

async function postWithWait(body, headers = {}) {
	const sent = [];
	const pend = [];
	const real = globalThis.fetch;
	globalThis.fetch = async (url, init) => {
		if (String(url).endsWith('/_evt')) sent.push(JSON.parse(init.body));
		return new Response('{}', { status: 200 });
	};
	try {
		const req = new Request('https://fathersheartbible.com/dvc-checkout', {
			method: 'POST',
			headers: { 'content-type': 'application/json', origin: 'https://fathersheartbible.com', ...headers },
			body: JSON.stringify(body),
		});
		const res = await onRequestPost({ request: req, env: { STRIPE_FHB_SECRET_KEY: 'sk_test_x' }, waitUntil: (p) => pend.push(p) });
		await Promise.all(pend);
		return { res, sent };
	} finally {
		globalThis.fetch = real;
	}
}

test('3ef-1: an empty cart reports itself: checkout_server, site, 400, reason empty, path', async () => {
	const { res, sent } = await postWithWait({ counts: {}, returnPath: '/print/', email: 'a@gmail.com' },
		{ 'user-agent': 'Mozilla/5.0 Chrome/130' });
	assert.equal(res.status, 400);
	assert.equal(sent.length, 1);
	assert.deepEqual(sent[0], { kind: 'checkout_server', tag: 'site', status: 400, reason: 'empty', path: '/print/' });
	assert.ok(!JSON.stringify(sent[0]).includes('gmail'), 'no email in the event');
});

test('3ef-1: the order form first-order lookup is NOT reported; a qa header tags qa', async () => {
	const look = await postWithWait({ firstOrderCheck: true, email: 'a@gmail.com' });
	assert.equal(look.sent.length, 0);
	const qa = await postWithWait({ counts: {} }, { 'x-fhb-qa': '1' });
	assert.equal(qa.sent[0].tag, 'qa');
});
