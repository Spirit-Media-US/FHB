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
