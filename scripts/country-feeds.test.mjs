// Unit 2qs: per-country Merchant feeds (gen-merchant-feed.mjs --country <cc>). Reads dist/ (run after astro build).
// Every live country (US + liveWave) must render a valid shipping block driven ONLY by ship-countries.json;
// the default multi-country feed must equal the union of the per-country blocks (US/default unchanged).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { LIVE_COUNTRIES } from '../src/lib/shipCountries.ts';

const items = (xml) => [...xml.matchAll(/<item>(.*?)<\/item>/gs)].map((m) => m[1]);
const blocks = (it) => [...it.matchAll(/<g:shipping>.*?<\/g:shipping>/gs)].map((m) => m[0]);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-'));
const gen = (cc) => { const out = path.join(tmp, `${cc}.xml`); execFileSync('node', ['scripts/gen-merchant-feed.mjs', '--country', cc, '--out', out], { stdio: 'pipe' }); return fs.readFileSync(out, 'utf8'); };
const q = (r) => (r ? [r[0], r[1]] : null);
const base = fs.readFileSync('dist/merchant-feed.xml', 'utf8');

test('every live country renders exactly one valid shipping block per item, matching ship-countries.json', () => {
	assert.ok(LIVE_COUNTRIES.length >= 20);
	for (const c of LIVE_COUNTRIES) {
		const its = items(gen(c.code));
		assert.equal(its.length, items(base).length, `${c.code} item count`);
		for (const it of its) {
			const b = blocks(it);
			assert.equal(b.length, 1, `${c.code} one block`);
			const m = /<g:country>([A-Z]{2})<\/g:country><g:service>Standard<\/g:service><g:price>(\d+\.\d\d) USD<\/g:price><g:min_handling_time>(\d+)<\/g:min_handling_time><g:max_handling_time>(\d+)<\/g:max_handling_time><g:min_transit_time>(\d+)<\/g:min_transit_time><g:max_transit_time>(\d+)<\/g:max_transit_time>/.exec(b[0]);
			assert.ok(m, `${c.code} shape: ${b[0]}`);
			assert.equal(m[1], c.code);
			assert.equal(Number(m[2]), Number(c.shippingRate.value));
			assert.deepEqual([+m[3], +m[4]], q(c.handlingDays));
			assert.deepEqual([+m[5], +m[6]], q(c.transitDays));
			assert.ok(+m[3] <= +m[4] && +m[5] <= +m[6]);
		}
	}
});
test('default feed == union of per-country blocks (US/default unchanged); non-shipping fields identical', () => {
	const per = LIVE_COUNTRIES.map((c) => items(gen(c.code)));
	items(base).forEach((it, n) => {
		assert.deepEqual(blocks(it), per.flatMap((p) => blocks(p[n])), `item ${n} blocks`);
		const strip = (x) => x.replace(/<g:shipping>.*?<\/g:shipping>\n?/gs, '');
		for (const p of per) assert.equal(strip(p[n]), strip(it), `item ${n} non-shipping fields`);
	});
});
test('failure path: a country that is not live exits nonzero', () => {
	assert.throws(() => gen('FJ'));
});
