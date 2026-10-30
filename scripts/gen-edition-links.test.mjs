// node --test scripts/gen-edition-links.test.mjs
// Production regression 2026-10-30: Cloudflare counted every rule after the first splat as dynamic and
// dropped /bibles/lang/ht/ onward (+ the :code catch-all). These prove the hoist + parse gate.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { cloudflareParse, editionLines, hoistStatic, resolve, MAX_DYNAMIC } from './gen-edition-links.mjs';

const root = new URL('..', import.meta.url).pathname;
const registry = JSON.parse(readFileSync(`${root}src/data/edition-registry.json`, 'utf8'));
const roster = JSON.parse(readFileSync(`${root}src/data/language-roster.json`, 'utf8'));
const hasPage = (slug) => existsSync(`${root}src/data/editions/${slug}.json`);
const publicRedirects = readFileSync(`${root}public/_redirects`, 'utf8');
const { lines } = editionLines(registry, roster, hasPage);
const naive = [publicRedirects, ...lines].join('\n'); // the pre-fix append
const fixed = hoistStatic(naive);

test('the pre-fix file reproduces the outage: Cloudflare drops rules', () => {
	const p = cloudflareParse(naive);
	assert.ok(p.dropped.length > 0, 'expected dropped rules in the naive append');
	assert.equal(resolve(p.applied, '/bibles/lang/ht/'), null);
	assert.equal(resolve(p.applied, '/bibles/lang/zz/'), null);
});

test('hoisted file: nothing dropped, well inside limits', () => {
	const p = cloudflareParse(fixed);
	assert.deepEqual(p.dropped, []);
	assert.ok(p.dynamic <= 10, `dynamic ${p.dynamic}`);
	assert.ok(p.dynamic < MAX_DYNAMIC);
});

test('listed code -> 301 to its page; unknown code -> 302 /print/ (both slash forms)', () => {
	const { applied } = cloudflareParse(fixed);
	for (const [p, to, st] of [
		['/bibles/lang/af/', '/bibles/afrikaans-bible/', 301],
		['/bibles/lang/ht/', '/bibles/haitian-creole-bible/', 301],
		['/bibles/lang/ht', '/bibles/haitian-creole-bible/', 301],
		['/bibles/lang/xh/', '/bibles/xhosa-bible/', 301],
		['/bibles/lang/zz/', '/print/', 302],
		['/bibles/lang/zz', '/print/', 302],
	]) {
		const r = resolve(applied, p);
		assert.ok(r, `${p} unmatched`);
		assert.equal(r.to, to, p);
		assert.equal(r.status, st, p);
	}
});

test('every roster code + alias resolves (no 404)', () => {
	const { applied } = cloudflareParse(fixed);
	for (const l of roster.languages)
		for (const c of new Set([l.code, l.rosterCode].filter(Boolean)))
			for (const p of [`/bibles/lang/${c}/`, `/bibles/lang/${c}`]) assert.ok(resolve(applied, p), p);
});

test('legacy splat still wins for its own paths', () => {
	const { applied } = cloudflareParse(fixed);
	assert.equal(resolve(applied, '/the-fathers-heart-bible/lead-translator/x').to, '/the-fathers-heart-bible/leadership/');
});

test('hoist refuses when a static rule would jump a dynamic rule that matches it', () => {
	assert.throws(() => hoistStatic('/a/* /b/ 301\n/a/x /c/ 301\n'), /matches it/);
});

test('gate fails closed past 100 dynamic rules', () => {
	const many = Array.from({ length: 101 }, (_, i) => `/d${i}/* /x/ 301`).join('\n');
	assert.ok(cloudflareParse(many).dropped.length === 1);
});
