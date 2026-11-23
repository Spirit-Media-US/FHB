// node --test scripts/binding-class.test.mjs — a book's shipping class comes from its OWN row (format / binding), never
// from its SKU suffix (2026-11-16, registry worker via pmprint: "Hardback, Colored" rows with a non "-hb" SKU — Only God
// Works, Home — were sized on the PAPERBACK cost and undercharged shipping).
import assert from 'node:assert/strict';
import test from 'node:test';
import { landedUnitCost } from '../src/lib/marginGuard.ts';
import { BOOK_SKUS, bindingFor, isHardbackRow } from '../src/lib/order-pricing.ts';

const hardNoSuffix = Object.entries(BOOK_SKUS).filter(([sku, r]) => isHardbackRow(r) && !sku.endsWith('-hb') && !r.costKey);
test('a hardback row whose SKU does not end in -hb ships on the HARDBACK cost', () => {
	assert.ok(hardNoSuffix.length > 0, 'the registry has such rows (Only God Works / Home)');
	const lc = { pb: 5, hc: 9 };
	for (const [sku, r] of hardNoSuffix) {
		assert.equal(bindingFor(sku), 'hc', `${sku} (${r.format}) binding class`);
		assert.equal(landedUnitCost(sku, lc), 9, `${sku} (${r.format}) landed cost`);
	}
});
test('every book row: class = its own format/binding (no hardback sized as a paperback, no paperback as a hardback)', () => {
	for (const [sku, r] of Object.entries(BOOK_SKUS)) {
		if (r.costKey) continue; // its own measured cost
		assert.equal(bindingFor(sku), isHardbackRow(r) ? 'hc' : 'pb', `${sku}: ${r.format} / ${r.binding}`);
	}
	assert.equal(isHardbackRow({ format: 'Paperback', binding: 'Perfect bound' }), false);
	assert.equal(isHardbackRow({ format: 'Hardback, Colored', binding: 'Case laminate' }), true);
	assert.equal(isHardbackRow({ format: 'Book', binding: 'Cloth' }), true);
	assert.equal(isHardbackRow({ format: 'Hardcover', binding: '' }), true);
	// Bibles keep their SKU keying
	assert.equal(bindingFor('moms-hb'), 'hc');
	assert.equal(bindingFor('moms-pb'), 'pb');
});
