// node --test scripts/gen-global-bible-month.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRows, render, parseCommitted, parseCommittedDates } from './gen-global-bible-month.mjs';

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
	const { rows, flipped } = await buildRows([ha], { ha: 'readable' }, no);
	assert.equal(rows[0].status, 'readable');
	assert.equal(flipped.length, 0);
});
test('a readable row never makes another language on the SAME date readable (njo 2026-11-07)', async () => {
	const nbc = st({ public_day: '2026-11-07', name: 'Chang Naga', code: 'nbc' });
	const njo = st({ public_day: '2026-11-07', name: 'Ao Naga', code: 'njo', public: false });
	const { rows } = await buildRows([nbc, njo], { nbc: 'readable' }, no);
	assert.equal(rows[0].status, 'readable');
	assert.equal(rows[1].status, 'scheduled');
});
test('render/parse round trip', async () => {
	const { rows } = await buildRows([st({})], {}, yes);
	const text = render('// h\n', rows);
	assert.deepEqual(parseCommitted(text), { ny: 'readable' });
});

test('a state row without public_day keeps the committed date, and never writes undefined', async () => {
	const text = "\t{\n\t\tdate: 'Nov 4',\n\t\tname: 'Chichewa',\n\t\tcode: 'ny',\n\t\tstatus: 'readable',\n\t},\n";
	const dates = parseCommittedDates(text);
	assert.deepEqual(dates, { Chichewa: 'Nov 4' });
	const { rows } = await buildRows([{ name: 'Chichewa', code: 'ny', code_confirmed: true, public: true }], { ny: 'readable' }, no, dates);
	assert.equal(rows[0].date, 'Nov 4');
	await assert.rejects(buildRows([{ name: 'Nowhere', code: 'xx', code_confirmed: true }], {}, no, dates), /no date for Nowhere/);
});
