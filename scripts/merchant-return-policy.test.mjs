// node --test scripts/merchant-return-policy.test.mjs   (unit 2jr)
// Every PAID Offer/AggregateOffer in the BUILT site (dist/) must carry a valid MerchantReturnPolicy
// (30-day window, countries, link; Kevin 2026-11-14: nothing /returns does not state). Run after `npm run build`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { merchantReturnPolicy, returnPolicyChunks, returnPolicyFor, SHIP_COUNTRIES } from '../src/lib/merchantReturnPolicy.ts';

const P = [].concat(merchantReturnPolicy)[0];
export function checkPolicy(p) {
	assert.ok(p && p['@type'] === 'MerchantReturnPolicy', 'missing MerchantReturnPolicy');
	assert.notEqual(p.returnPolicyCategory, 'https://schema.org/MerchantReturnUnspecified', 'Unspecified category is invalid for Google');
	assert.equal(p.returnPolicyCategory, 'https://schema.org/MerchantReturnFiniteReturnWindow', 'category not FiniteReturnWindow');
	assert.ok(Number.isInteger(p.merchantReturnDays) && p.merchantReturnDays > 0, 'merchantReturnDays required for finite window');
	assert.ok(p.applicableCountry, 'applicableCountry required');
	assert.ok([].concat(p.applicableCountry).length <= 50, 'applicableCountry can be defined at most 50 times (Google)');
	assert.notEqual(p.returnMethod, 'https://schema.org/KeepProduct', 'KeepProduct is not an allowed returnMethod');
	if (p.returnMethod) assert.match(p.returnMethod, /Return(AtKiosk|ByMail|InStore)$/);
	assert.equal(p.merchantReturnDays, 30, 'Kevin 1A: 30 days');
	// Kevin 2026-11-14 item 7: markup states only what /returns states (no method, fees or refund type there).
	// returnFees EXCEPTION (GSC 2026-11-14 'Missing field "returnFees"'; builder hand-off 2026-11-18, Kevin D130 "return and
	// destroy" + /returns "don't send anything back until we have replied"): the buyer never pays a return = FreeReturn only.
	assert.equal(p.returnFees, 'https://schema.org/FreeReturn', 'returnFees must be FreeReturn (GSC requires it)');
	for (const k of ['returnMethod', 'customerRemorseReturnFees', 'itemDefectReturnFees', 'refundType'])
		assert.equal(p[k], undefined, `${k} is not stated on /returns, so it must not be declared`);
	assert.match(p.merchantReturnLink, /^https:\/\/fathersheartbible\.com\/returns\/$/);
}
function offers(node, out = []) {
	if (Array.isArray(node)) node.forEach((n) => offers(n, out));
	else if (node && typeof node === 'object') {
		const t = [].concat(node['@type'] || []);
		if (t.includes('Offer') || t.includes('AggregateOffer')) out.push(node);
		Object.values(node).forEach((v) => offers(v, out));
	}
	return out;
}
function htmlFiles(d, out = []) {
	for (const e of fs.readdirSync(d, { withFileTypes: true })) {
		const f = path.join(d, e.name);
		if (e.isDirectory()) htmlFiles(f, out);
		else if (e.name.endsWith('.html')) out.push(f);
	}
	return out;
}
test('shared policy is valid and countries come from the shipping list', () => {
	const all = [].concat(merchantReturnPolicy);
	all.forEach(checkPolicy);
	assert.deepEqual(all.flatMap((x) => [].concat(x.applicableCountry)), [...SHIP_COUNTRIES]);
	assert.equal(new Set(all.flatMap((x) => [].concat(x.applicableCountry))).size, SHIP_COUNTRIES.length, 'no duplicates');
});
test('more than 50 countries are split into <=50 chunks with full coverage; a 51-country policy fails', () => {
	const many = Array.from({ length: 223 }, (_, i) => String.fromCharCode(65 + (i % 26)) + String.fromCharCode(65 + Math.floor(i / 26)));
	const ch = returnPolicyChunks(many);
	assert.equal(ch.length, 5);
	ch.forEach((c) => { checkPolicy(c); assert.ok([].concat(c.applicableCountry).length <= 50); });
	assert.deepEqual(ch.flatMap((c) => [].concat(c.applicableCountry)), many);
	assert.throws(() => checkPolicy(returnPolicyFor(many.slice(0, 51))), /at most 50/);
});
test('failure path: Unspecified, KeepProduct, missing days, missing policy all fail', () => {
	assert.throws(() => checkPolicy({ ...P, returnPolicyCategory: 'https://schema.org/MerchantReturnUnspecified' }), /Unspecified/);
	assert.throws(() => checkPolicy({ ...P, returnMethod: 'https://schema.org/KeepProduct' }), /KeepProduct/);
	assert.throws(() => checkPolicy({ ...P, merchantReturnDays: undefined }), /merchantReturnDays/);
	assert.throws(() => checkPolicy({ ...P, returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility' }), /must be FreeReturn/);
	assert.throws(() => checkPolicy({ ...P, returnMethod: 'https://schema.org/ReturnByMail' }), /not stated on \/returns/);
	assert.throws(() => checkPolicy({ ...P, merchantReturnDays: 14 }), /30 days/);
	assert.throws(() => checkPolicy(undefined), /missing/);
});
test('every paid Offer in dist/ has a valid MerchantReturnPolicy', () => {
	assert.ok(fs.existsSync('dist'), 'dist/ missing: run the build first');
	let checked = 0;
	for (const f of htmlFiles('dist')) {
		const html = fs.readFileSync(f, 'utf8');
		if (!html.includes('"Offer"') && !html.includes('AggregateOffer')) continue;
		for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
			let j; try { j = JSON.parse(m[1]); } catch { continue; }
			for (const o of offers(j)) {
				if (String(o.price) === '0') continue; // free online reading: nothing to refund
				const pol = [].concat(o.hasMerchantReturnPolicy);
				try { pol.forEach(checkPolicy); } catch (e) { assert.fail(`${f}: ${e.message}`); }
				assert.deepEqual(pol.flatMap((x) => [].concat(x.applicableCountry)), [...SHIP_COUNTRIES], `${f}: return countries must equal the ship list`);
				checked++;
			}
		}
	}
	assert.ok(checked > 50, `only ${checked} offers checked`);
});
