// node --test scripts/gen-global-bible-month.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRows, render, parseCommitted } from './gen-global-bible-month.mjs';

const st = (o) => ({ public_day: '2026-11-02', name: 'Chichewa', code: 'ny', code_confirmed: true, public: true, ...o });
const yes = async () => true;
const no = async () => false;

test('/read 404 -> stays scheduled', async () => {
	const { rows, flipped } = await buildRows([st({})], {}, no);
	assert.equal(rows[0].status, 'scheduled');
	assert.equal(flipped.length, 0);
});
test('go-public not run -> scheduled even when /read is 200', async () => {
	const { rows } = await buildRows([st({ public: false })], {}, yes);
	assert.equal(rows[0].status, 'scheduled');
});
test('both true -> readable + code (link) + flipped reported', async () => {
	const { rows, flipped } = await buildRows([st({})], {}, yes);
	assert.deepEqual(rows[0], { date: '2026-11-02', name: 'Chichewa', code: 'ny', status: 'readable' });
	assert.deepEqual(flipped, [{ name: 'Chichewa', code: 'ny' }]);
});
test("unknown code '?' never linked, even if public and 200", async () => {
	const { rows } = await buildRows([st({ code: 'seh?', code_confirmed: false })], {}, yes);
	assert.equal(rows[0].code, null);
	assert.equal(rows[0].status, 'scheduled');
	const { rows: r2 } = await buildRows([st({ code: 'seh?', code_confirmed: true })], {}, yes);
	assert.equal(r2[0].code, null);
});
test('already-readable row (Hausa, not yet DBL-public) is never regressed', async () => {
	const ha = st({ public_day: '2026-11-01', name: 'Hausa', code: 'ha', public: false });
	const { rows, flipped } = await buildRows([ha], { '2026-11-01': 'readable' }, no);
	assert.equal(rows[0].status, 'readable');
	assert.equal(flipped.length, 0);
});
test('render/parse round trip', async () => {
	const { rows } = await buildRows([st({})], {}, yes);
	const text = render('// h\n', rows);
	assert.deepEqual(parseCommitted(text), { '2026-11-02': 'readable' });
});
