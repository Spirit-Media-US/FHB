// node --test scripts/live-cache.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadLiveCache, saveLiveCache, recordLive, probeWithCache, MAX_ENTRIES } from './lib/live-cache.mjs';

const tmp = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lc-')), 'c.json');

test('cached 200 URL is not fetched; uncached is', async () => {
	const f = tmp();
	const c = loadLiveCache(f);
	recordLive(c, 'https://x/a');
	saveLiveCache(c, f);
	const c2 = loadLiveCache(f);
	const seen = [];
	const r = await probeWithCache(
		[{ url: 'https://x/a' }, { url: 'https://x/b' }],
		async (u) => (seen.push(u), 200),
		c2,
		() => {},
	);
	assert.deepEqual(seen, ['https://x/b']);
	assert.equal(r.skipped, 1);
	assert.equal(r.fetched, 1);
});

test('404, 500 and thrown errors are never cached (guard still drops/keeps as before)', async () => {
	const f = tmp();
	const c = loadLiveCache(f);
	const results = {};
	await probeWithCache(
		[{ url: 'u404' }, { url: 'u500' }, { url: 'uerr' }, { url: 'u200' }],
		async (u) => {
			if (u === 'uerr') throw new Error('boom');
			return { u404: 404, u500: 500, u200: 200 }[u];
		},
		c,
		(j, res) => (results[j.url] = res),
	);
	saveLiveCache(c, f);
	const back = loadLiveCache(f);
	assert.deepEqual([...back.keys()], ['u200']);
	assert.equal(results.u404, 404);
	assert.ok(results.uerr instanceof Error);
});

test('expired entries are re-probed (TTL)', async () => {
	const f = tmp();
	const now = Date.now();
	fs.writeFileSync(f, JSON.stringify({ v: 1, urls: { old: now - 25 * 3600e3, fresh: now - 3600e3 } }));
	const c = loadLiveCache(f, now);
	assert.deepEqual([...c.keys()], ['fresh']);
});

test('corrupt cache file = empty cache, save failure does not throw', () => {
	const f = tmp();
	fs.writeFileSync(f, '{not json');
	assert.equal(loadLiveCache(f).size, 0);
	assert.equal(saveLiveCache(new Map([['a', Date.now()]]), path.join(f, 'x.json')), -1);
});

test('bounded by MAX_ENTRIES, oldest evicted', () => {
	const f = tmp();
	const now = Date.now();
	const c = new Map();
	for (let i = 0; i < MAX_ENTRIES + 50; i++) c.set(`u${i}`, now - 1000 - i);
	assert.equal(saveLiveCache(c, f, now), MAX_ENTRIES);
	const back = loadLiveCache(f, now);
	assert.equal(back.size, MAX_ENTRIES);
	assert.ok(back.has('u0') && !back.has(`u${MAX_ENTRIES + 49}`));
});
