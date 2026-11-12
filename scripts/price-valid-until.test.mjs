// node --test scripts/price-valid-until.test.mjs   (unit 2qr)
// priceValidUntil = build date + 12 months, computed, never typed. If dist/ exists (after a build),
// also parses every Offer in dist/bibles/*/index.html and requires the field on all of them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { priceValidUntil } from '../src/lib/priceValidUntil.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

test('build date + 12 months', () => {
	assert.equal(priceValidUntil(new Date('2026-11-12T10:00:00Z')), '2027-11-12');
	assert.equal(priceValidUntil(new Date('2026-12-31T23:59:59Z')), '2027-12-31');
});
test('leap-day clamp', () => {
	assert.equal(priceValidUntil(new Date('2028-02-29T00:00:00Z')), '2029-02-28');
});
test('invalid build date fails', () => {
	assert.throws(() => priceValidUntil(new Date('nope')), /invalid build date/);
	assert.throws(() => priceValidUntil('2026-11-12'), /invalid build date/);
});
test('result is always in the future relative to the input', () => {
	const now = new Date();
	assert.ok(new Date(priceValidUntil(now)) > now);
});
test('the Offer builder uses the helper and no typed date', () => {
	const src = fs.readFileSync(path.join(ROOT, 'src/pages/bibles/[slug].astro'), 'utf8');
	assert.match(src, /priceValidUntil: PRICE_VALID_UNTIL/);
	assert.match(src, /PRICE_VALID_UNTIL = priceValidUntil\(\)/);
	assert.doesNotMatch(src, /priceValidUntil:\s*['"`]\d{4}/);
});
const dist = path.join(ROOT, 'dist/bibles');
test('built pages: every Offer carries priceValidUntil', { skip: !fs.existsSync(dist) }, () => {
	let offers = 0;
	const walk = (n, hit) => {
		if (Array.isArray(n)) return n.forEach((x) => walk(x, hit));
		if (!n || typeof n !== 'object') return;
		if (n['@type'] === 'Offer') hit(n);
		Object.values(n).forEach((x) => walk(x, hit));
	};
	for (const d of fs.readdirSync(dist)) {
		const f = path.join(dist, d, 'index.html');
		if (!fs.existsSync(f)) continue;
		for (const m of fs.readFileSync(f, 'utf8').matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)) {
			walk(JSON.parse(m[1]), (o) => {
				offers++;
				assert.match(o.priceValidUntil ?? '', /^\d{4}-\d{2}-\d{2}$/, `${d}: Offer without priceValidUntil`);
			});
		}
	}
	assert.ok(offers > 0);
});
