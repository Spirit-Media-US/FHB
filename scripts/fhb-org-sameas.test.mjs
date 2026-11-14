// node --test scripts/fhb-org-sameas.test.mjs  (unit 2jk)
// Org sameAs must be unique https URLs incl. the English YouVersion FHB record, and be IDENTICAL to community's
// FHB_SAME_AS (the shared source of truth; the count is derived from it, never hard-coded — fixed 2st after 2qv grew 6 -> 8).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const YV = 'https://www.bible.com/versions/4926-FHB';
export function checkSameAs(arr) {
	assert.ok(Array.isArray(arr), 'sameAs is an array');
	for (const u of arr) { assert.doesNotThrow(() => new URL(u), `invalid URL ${u}`); assert.match(u, /^https:\/\//, `non-https ${u}`); }
	assert.equal(new Set(arr).size, arr.length, 'duplicate sameAs entry');
	assert.ok(arr.includes(YV), 'missing YouVersion English FHB');
}
function parse(file) {
	const src = fs.readFileSync(new URL(file, import.meta.url), 'utf8');
	return [...src.match(/sameAs:\s*\[([\s\S]*?)\]/)[1].matchAll(/'(https:[^']+)'/g)].map((m) => m[1]);
}
const COMMUNITY = process.env.COMMUNITY_FHB_ORG || '/srv/sites/community/src/lib/fhb-org.ts';
function parseCommunity() {
	const src = fs.readFileSync(COMMUNITY, 'utf8');
	return [...src.match(/FHB_SAME_AS\s*=\s*\[([\s\S]*?)\]/)[1].matchAll(/"(https:[^"]+)"/g)].map((m) => m[1]);
}
test('home/overview Org sameAs valid', () => { const a = parse('../src/lib/fhb-org.ts'); checkSameAs(a); assert.ok(a.length > 0); });
test('marketing Org sameAs equals community FHB_SAME_AS (same entity, one list)', { skip: !fs.existsSync(COMMUNITY) }, () => {
	const c = parseCommunity();
	checkSameAs(c);
	assert.deepEqual(parse('../src/lib/fhb-org.ts'), c);
});
test('failure path: duplicate / invalid / missing fail', () => {
	const base = parse('../src/lib/fhb-org.ts');
	assert.throws(() => checkSameAs([...base, base[0]]), /duplicate/);
	assert.throws(() => checkSameAs([...base, 'not a url']), /invalid URL/);
	assert.throws(() => checkSameAs(base.filter((u) => u !== YV)), /missing/);
});
