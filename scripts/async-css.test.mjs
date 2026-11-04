// node --test scripts/async-css.test.mjs  (unit 2hk)
// Rule: a page with no <link rel="preload" as="image"> keeps render-blocking CSS; hero pages go async.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'async-css.mjs');
const CSS = '<link rel="stylesheet" href="/_astro/a.css">';
const HERO = '<link rel="preload" as="image" href="/h.webp" fetchpriority="high">';
const PAGES = {
	'hero-page/index.html': HERO,
	'hero-page-attr-order/index.html': '<link as="image" rel="preload" href="/h.webp">',
	'nohero-page/index.html': '<link rel="preload" as="font" href="/f.woff2">',
	'bibles/x/index.html': '', // ASYNC_OK exception
	'blog/post/index.html': HERO, // legacy list still wins
};

function run(scriptPath) {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'asynccss-'));
	for (const [rel, head] of Object.entries(PAGES)) {
		const f = path.join(dir, 'dist', rel);
		fs.mkdirSync(path.dirname(f), { recursive: true });
		fs.writeFileSync(f, `<html><head>${head}${CSS}</head><body></body></html>`);
	}
	const r = spawnSync('node', [scriptPath], { cwd: dir, encoding: 'utf8' });
	assert.equal(r.status, 0, r.stderr);
	const out = {};
	for (const rel of Object.keys(PAGES)) out[rel] = fs.readFileSync(path.join(dir, 'dist', rel), 'utf8').includes('media="print"') ? 'async' : 'sync';
	return out;
}
const EXPECT = {
	'hero-page/index.html': 'async',
	'hero-page-attr-order/index.html': 'async',
	'nohero-page/index.html': 'sync',
	'bibles/x/index.html': 'async',
	'blog/post/index.html': 'sync',
};

test('rule: no-hero stays sync, hero goes async, exceptions + legacy lists hold', () => {
	assert.deepEqual(run(SCRIPT), EXPECT);
});

test('FAILURE PATH: a mutant that ignores the rule is caught', () => {
	const src = fs.readFileSync(SCRIPT, 'utf8');
	assert.ok(src.includes('!HERO_PRELOAD.test(html)'), 'rule line not found; update the mutant');
	const mut = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'asynccss-mut-')), 'm.mjs');
	fs.writeFileSync(mut, src.replace('!HERO_PRELOAD.test(html)', 'false'));
	assert.notDeepEqual(run(mut), EXPECT);
});
