// node --test scripts/fhb-org-sameas.test.mjs  (unit 2jk)
// Org sameAs must be 6 unique https URLs incl. the English YouVersion FHB record, and match community's list.
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
test('home/overview Org sameAs valid', () => { const a = parse('../src/lib/fhb-org.ts'); checkSameAs(a); assert.equal(a.length, 6); });
test('failure path: duplicate / invalid / missing fail', () => {
	const base = parse('../src/lib/fhb-org.ts');
	assert.throws(() => checkSameAs([...base, base[0]]), /duplicate/);
	assert.throws(() => checkSameAs([...base, 'not a url']), /invalid URL/);
	assert.throws(() => checkSameAs(base.filter((u) => u !== YV)), /missing/);
});
