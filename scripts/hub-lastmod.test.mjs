// node --test scripts/hub-lastmod.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { HUB_LASTMOD_LANGS, hubLastmods } from './lib/hub-lastmod.mjs';

function fixture() {
	const d = fs.mkdtempSync(path.join(os.tmpdir(), 'hl-'));
	fs.mkdirSync(path.join(d, 'te'));
	const book = (chs) => JSON.stringify({ chapters: chs });
	fs.writeFileSync(path.join(d, 'te', 'john.json'), book({ 1: { updatedAt: '2026-09-12T10:00:00+00:00' }, 2: { updatedAt: '2026-09-13T01:00:00+00:00' } }));
	fs.writeFileSync(path.join(d, 'te', 'mark.json'), book({ 1: { updatedAt: '2026-08-01T00:00:00+00:00' } }));
	fs.writeFileSync(path.join(d, 'te', 'luke.json'), book({ 1: {} })); // no date: no lastmod, never a guess
	fs.writeFileSync(path.join(d, 'te', '_index.json'), '[]');
	return d;
}

test('hub date equals the latest chapter updatedAt of the language, per-book likewise', () => {
	const r = hubLastmods(fixture(), 'te');
	assert.equal(r.hub, '2026-09-13');
	assert.equal(r.books.get('john'), '2026-09-13');
	assert.equal(r.books.get('mark'), '2026-08-01');
	assert.equal(r.books.has('luke'), false);
});

test('stable across two builds (does not move unless the text moves)', () => {
	const d = fixture();
	const a = hubLastmods(d, 'te');
	const b = hubLastmods(d, 'te');
	assert.deepEqual(a, b);
});

test('FAILURE PATH: a build-time date would fail — result is never today or the build time', () => {
	const r = hubLastmods(fixture(), 'te');
	const today = new Date().toISOString().slice(0, 10);
	assert.notEqual(r.hub, today);
	assert.ok(r.hub < today);
});

test('no data -> no lastmod (null), never a guess', () => {
	assert.equal(hubLastmods(fixture(), 'ta').hub, null);
});

test('pilot scope: exactly the 8 treated languages, no control', () => {
	assert.deepEqual([...HUB_LASTMOD_LANGS].sort(), ['af', 'ceb', 'fa', 'ml', 'ne', 'pa', 'te', 'ur']);
	for (const c of ['ta', 'mr', 'pcm', 'nmf', 'zu', 'kn', 'my', 'yo']) assert.ok(!HUB_LASTMOD_LANGS.includes(c));
});
