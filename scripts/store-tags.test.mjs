// node --test scripts/store-tags.test.mjs — OPTION C store tags (Kevin 2026-11-16 "1 store SMP. 2 shop windows FHB and
// SMP"). Every store Checkout Session carries metadata site + window (fhb|smp) + product family; a session without them
// FAILS the one check (storeTagErrors) and never reaches Stripe.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { familyOf, familyOfSku, storeTagErrors, storeTags } from '../src/lib/storeEngine.ts';

test('FAILURE PATH: a session without the tags fails the check (each tag, and every wrong value)', () => {
	const base = { mode: 'payment', 'metadata[kind]': 'dvc_print' };
	assert.ok(storeTagErrors(base).length >= 2, 'no tags at all must fail');
	const good = { ...base, ...storeTags('fhb', 'bible') };
	assert.deepEqual(storeTagErrors(good), []);
	for (const k of ['metadata[site]', 'metadata[window]', 'metadata[family]']) {
		const f = { ...good };
		delete f[k];
		assert.ok(storeTagErrors(f).length > 0, `missing ${k} must fail`);
	}
	assert.ok(storeTagErrors({ ...good, 'metadata[window]': 'smp' }).length, 'fhb sold in the smp window must fail');
	assert.ok(storeTagErrors({ ...base, ...storeTags('evil', 'bible') }).length, 'an unknown site must fail');
	assert.ok(storeTagErrors({ ...base, ...storeTags('fhb', '') }).length, 'an empty family must fail');
	assert.ok(storeTagErrors({ ...base, ...storeTags('fhb', 'bible+toys') }).length, 'an unknown family must fail');
	const fat = { ...good };
	for (let i = 0; i < 48; i++) fat[`metadata[x${i}]`] = 'y';
	assert.ok(storeTagErrors(fat).length, 'past 50 metadata keys must fail');
});

test('windows and families: vaneure sells in the SMP window; FH books vs SMP books; mixed carts', () => {
	assert.equal(storeTags('vaneure', 'smp_book')['metadata[window]'], 'smp');
	assert.equal(storeTags('smp', 'smp_book')['metadata[window]'], 'smp');
	assert.equal(storeTags('fhb', 'bible')['metadata[window]'], 'fhb');
	assert.equal(familyOfSku('moms-hb'), 'bible');
	assert.equal(familyOfSku('who-am-i-pb'), 'fh_book');
	assert.equal(familyOfSku('beloved-identity-pb'), 'fh_book');
	assert.equal(familyOfSku('the-pyramid-principle-pb'), 'smp_book');
	assert.equal(familyOfSku('nope'), null);
	assert.equal(familyOf({ 'who-am-i-hb': 1, 'moms-pb': 2, 'moms-hb': 0 }), 'bible+fh_book');
	assert.equal(familyOf({}), '');
});

test('the FHB Bible box session (dvc-checkout) is tagged site=fhb window=fhb family=bible', async () => {
	let body = '';
	globalThis.fetch = async (url, init) => {
		if (init?.method === 'POST') body = init.body;
		return new Response(JSON.stringify(init?.method === 'POST' ? { url: 'https://stripe.test/x' } : { data: [] }));
	};
	const { onRequestPost } = await import('./lib/dvc-checkout-harness.ts');
	const res = await onRequestPost({
		request: new Request('https://fathersheartbible.com/dvc-checkout', { method: 'POST', body: JSON.stringify({ counts: { 'moms-hb': 2 }, country: 'US' }) }),
		env: { STRIPE_FHB_SECRET_KEY: 'sk_test' },
	});
	assert.equal(res.status, 200);
	const f = new URLSearchParams(body);
	assert.deepEqual([f.get('metadata[site]'), f.get('metadata[window]'), f.get('metadata[family]')], ['fhb', 'fhb', 'bible']);
});

test('EVERY function that creates a Checkout Session runs the tag check before the Stripe POST', () => {
	const dir = new URL('../functions/', import.meta.url);
	const makers = fs.readdirSync(dir).filter((f) => /\.(ts|js)$/.test(f)).filter((f) => {
		const s = fs.readFileSync(new URL(f, dir), 'utf8');
		return /fetch\('https:\/\/api\.stripe\.com\/v1\/checkout\/sessions',\s*\{\s*method: 'POST'/.test(s);
	});
	// Store move 5 (Kevin 2026-11-20 ~18:51Z "2 this needs to be moved"): FHB creates NO Checkout Session any more; every
	// session is made by SMP /store-checkout (whose createSession runs the same tag check). A maker coming back fails here.
	assert.deepEqual(makers.sort(), []);
	for (const f of makers) {
		const s = fs.readFileSync(new URL(f, dir), 'utf8');
		const gate = s.indexOf('if (storeTagErrors(form).length)');
		assert.ok(gate > 0, `${f}: no tag check`);
		assert.ok(gate < s.indexOf("fetch('https://api.stripe.com/v1/checkout/sessions'"), `${f}: tag check after the Stripe POST`);
	}
});
