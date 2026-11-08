// node --test scripts/merchant-return-policy.test.mjs   (unit 2jr)
// Every PAID Offer/AggregateOffer in the BUILT site (dist/) must carry a valid MerchantReturnPolicy
// (Google's allowed category, days, link, no Unspecified/KeepProduct). Run after `npm run build`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { merchantReturnPolicy as P, SHIP_COUNTRIES } from '../src/lib/merchantReturnPolicy.ts';

export function checkPolicy(p) {
	assert.ok(p && p['@type'] === 'MerchantReturnPolicy', 'missing MerchantReturnPolicy');
	assert.notEqual(p.returnPolicyCategory, 'https://schema.org/MerchantReturnUnspecified', 'Unspecified category is invalid for Google');
	assert.equal(p.returnPolicyCategory, 'https://schema.org/MerchantReturnFiniteReturnWindow', 'category not FiniteReturnWindow');
	assert.ok(Number.isInteger(p.merchantReturnDays) && p.merchantReturnDays > 0, 'merchantReturnDays required for finite window');
	assert.ok(p.applicableCountry, 'applicableCountry required');
	assert.notEqual(p.returnMethod, 'https://schema.org/KeepProduct', 'KeepProduct is not an allowed returnMethod');
	if (p.returnMethod) assert.match(p.returnMethod, /Return(AtKiosk|ByMail|InStore)$/);
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
	checkPolicy(P);
	assert.deepEqual([].concat(P.applicableCountry), [...SHIP_COUNTRIES]);
});
test('failure path: Unspecified, KeepProduct, missing days, missing policy all fail', () => {
	assert.throws(() => checkPolicy({ ...P, returnPolicyCategory: 'https://schema.org/MerchantReturnUnspecified' }), /Unspecified/);
	assert.throws(() => checkPolicy({ ...P, returnMethod: 'https://schema.org/KeepProduct' }), /KeepProduct/);
	assert.throws(() => checkPolicy({ ...P, merchantReturnDays: undefined }), /merchantReturnDays/);
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
				try { checkPolicy(o.hasMerchantReturnPolicy); } catch (e) { assert.fail(`${f}: ${e.message}`); }
				checked++;
			}
		}
	}
	assert.ok(checked > 50, `only ${checked} offers checked`);
});
