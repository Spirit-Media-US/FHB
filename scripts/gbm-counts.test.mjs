// node --experimental-strip-types --test scripts/gbm-counts.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { gbmCounts } from '../src/lib/gbmCounts.ts';
import { GLOBAL_BIBLE_MONTH } from '../src/data/globalBibleMonth.ts';

const rows = () => GLOBAL_BIBLE_MONTH.map((r) => ({ ...r }));

test('before Nov 1 with only Hausa readable: 50 / 30 / 80', () => {
	const c = gbmCounts(rows(), '2026-10-28');
	assert.deepEqual(c, { available: 50, remaining: 30, total: 80 });
});
test('available + remaining == 80 on every day of November', () => {
	for (let d = 1; d <= 30; d++) {
		const c = gbmCounts(rows(), `2026-11-${String(d).padStart(2, '0')}`);
		assert.equal(c.available + c.remaining, 80);
	}
});
test('flipping a past-dated future row to readable moves 50->51 and 30->29', () => {
	const r = rows();
	r[1].status = 'readable'; // Chichewa, 2026-11-02
	assert.deepEqual(gbmCounts(r, '2026-10-28'), { available: 50, remaining: 30, total: 80 }); // date not arrived
	assert.deepEqual(gbmCounts(r, '2026-11-02'), { available: 52, remaining: 28, total: 80 }); // Hausa + Chichewa
	const r2 = rows().map((x) => ({ ...x, status: 'scheduled' }));
	assert.equal(gbmCounts(r2, '2026-11-30').available, 50);
	r2[0].status = 'readable';
	assert.deepEqual(gbmCounts(r2, '2026-11-01'), { available: 51, remaining: 29, total: 80 });
});
test('invariant throws if more rows count than languages remain', () => {
	const many = Array.from({ length: 31 }, () => ({ date: '2026-11-01', status: 'readable' }));
	assert.throws(() => gbmCounts(many, '2026-11-30'));
});
