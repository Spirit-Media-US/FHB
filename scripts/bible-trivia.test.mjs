// node --test scripts/bible-trivia.test.mjs  (3co-1, 2026-11-13)
// /bible-trivia/ answers are counts read from the lock-reconciled data files; the generator (scripts/gen-who-speaks.py
// measure_trivia + reconcile_trivia, --selftest-trivia) refuses to write a mismatch. This test re-checks the committed
// files from the outside: every answer equals its source field, the CSV mirrors the JSON, and the page links /read only.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const t = JSON.parse(read('src/data/bible-trivia.json'));
const srcs = {
	stats: JSON.parse(read('src/data/bible-by-the-numbers.json')),
	who: JSON.parse(read('src/data/who-speaks.json')),
	names: JSON.parse(read('src/data/names-of-the-father.json')),
};

function get(path) {
	const [name, rest] = path.split(/:(.*)/s);
	let cur = srcs[name];
	for (const part of rest.match(/[^.[\]]+|\[[^\]]+\]/g)) {
		if (part.startsWith('[')) {
			const key = part.slice(1, -1);
			if (Array.isArray(cur)) {
				if (/^\d+$/.test(key)) cur = cur[Number(key)];
				else {
					const [k, v] = key.split('=');
					cur = cur.find((x) => String(x[k]) === v);
				}
			} else cur = cur[key];
		} else cur = cur[part];
	}
	return cur;
}

test('60-100 questions, unique, all from the same lock commit', () => {
	assert.ok(t.count >= 60 && t.count <= 100 && t.items.length === t.count);
	assert.equal(new Set(t.items.map((i) => i.q)).size, t.count);
	for (const s of Object.values(srcs)) assert.equal(s.locked_commit, t.locked_commit);
});

test('every direct-source answer equals its source field (failure path: a changed figure fails)', () => {
	const direct = t.items.filter(
		(i) =>
			!/ \(|^stats:totals\.verses - /.test(i.source) &&
			i.source !== 'stats:skipped_numbers' &&
			i.source !== 'stats:extremes.book_by_chapters.shortest',
	);
	assert.ok(direct.length > 50, `only ${direct.length} direct answers`);
	for (const i of direct) assert.deepEqual(i.figure, get(i.source), `Q${i.n} ${i.q}`);
	const bad = structuredClone(direct[0]);
	bad.figure += 1;
	assert.notDeepEqual(bad.figure, get(bad.source));
});

test('CSV mirrors the JSON row for row', () => {
	const rows = read('public/data/bible-trivia.csv').trim().split('\n');
	assert.equal(rows[0], 'n,category,question,answer,figure,source,read_url');
	assert.equal(rows.length - 1, t.count);
});

test('page renders from the data and links only into our /read', () => {
	const a = read('src/pages/bible-trivia.astro');
	assert.match(a, /import data from '\.\.\/data\/bible-trivia\.json'/);
	assert.ok(!/biblegateway|biblehub/i.test(a));
	for (const i of t.items)
		assert.ok(i.read_url.startsWith('https://fathersheartbible.com/'), i.read_url);
});
