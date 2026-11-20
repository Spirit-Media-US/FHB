// node --test scripts/window-confirmations.test.mjs — what is LEFT of the store on fathersheartbible.com after the store
// moved to the SMP site (map smp-store-one-home-v1 §4, Kevin 2026-11-20 ~18:51Z "2 this needs to be moved. You are
// inheriting OLD instead of making it new"; 16:07Z "the store is NOW Spirit Media Publishing whether it is FHB or not").
// FHB is a SHOP WINDOW: its order boxes post to SMP /store-checkout, its /order redirects to SMP /order, its
// /ebook-download forwards to SMP's. The order emails (Option C items 8-10, one store, gift receipt), the eBook download
// and the eBook engine/registry tests MOVED with the code to SMP (scripts/store-webhook.test.mjs,
// scripts/ebook-download.test.mjs, scripts/store-checkout.test.mjs there).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { build } from 'esbuild';
import { onRequestGet as download } from '../functions/ebook-download.ts';

const SID = 'cs_test_a1FixtureEbookSession0000000000000000000000000000';

// ---- item 9 + MOVE 4 (map smp-store-one-home-v1, Kevin 2026-11-20 ~18:51Z "2 this needs to be moved"): the order page
// (Contact us button, address never printed) is SMP's ONE /order now (SMP scripts/store-checkout.test.mjs); FHB /order
// redirects there with its query, production to production and a preview to SMP's dev preview.
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ord-'));
const out = path.join(dir, 'order.mjs');
await build({ entryPoints: ['functions/order.ts'], bundle: true, format: 'esm', platform: 'neutral', outfile: out, logLevel: 'silent', loader: { '.json': 'json' } });
const { onRequestGet } = await import(out);
test('move 4: FHB /order redirects to SMP /order keeping every query param; previews go to the SMP dev preview', async () => {
	const at = async (u) => (await onRequestGet({ request: new Request(u), env: {} })).headers.get('location');
	assert.equal(await at('https://fathersheartbible.com/order?s=cs_live_a1B2c3&x=1'), 'https://spiritmediapublishing.com/order?s=cs_live_a1B2c3&x=1');
	assert.equal(await at('https://fathersheartbible.com/order'), 'https://spiritmediapublishing.com/order', 'no reference: the lookup form');
	assert.equal(await at('https://fathersheartbible.pages.dev/order?s=cs_live_z'), 'https://spiritmediapublishing.com/order?s=cs_live_z');
	assert.equal(await at('https://dev.fathersheartbible.pages.dev/order?s=cs_test_z'), 'https://dev.spirit-media-publishing.pages.dev/order?s=cs_test_z');
	const r = await onRequestGet({ request: new Request('https://fathersheartbible.com/order?s=a'), env: {} });
	assert.equal(r.status, 302);
	assert.equal(r.headers.get('cache-control'), 'no-store');
});

// EBOOK DOWNLOAD MOVED to SMP (map smp-store-one-home-v1 move 3, Kevin 2026-11-20 ~18:51Z "2 this needs to be moved"):
// the serving, refusal and Bible-eBook tests moved with it (SMP scripts/ebook-download.test.mjs, incl. a link signed by
// THIS site before the move). FHB's /ebook-download only forwards; this proves what it forwards and what it hands back.
test('EBOOK DOWNLOAD (FHB): forwards only s/e/t/v/dl to SMP (dev preview from a preview) and passes the answer back', async () => {
	const { upstreamFor } = await import('../functions/ebook-download.ts');
	assert.equal(upstreamFor(new URL('https://fathersheartbible.com/x')), 'https://spiritmediapublishing.com');
	assert.equal(upstreamFor(new URL('https://fathersheartbible.pages.dev/x')), 'https://spiritmediapublishing.com', 'the production Pages host is production');
	assert.equal(upstreamFor(new URL('https://dev.fathersheartbible.pages.dev/x')), 'https://dev.spirit-media-publishing.pages.dev');
	const real = globalThis.fetch;
	let seen = '';
	try {
		globalThis.fetch = async (u) => {
			seen = String(u);
			return new Response('nope', { status: 403, headers: { 'content-type': 'text/html', 'set-cookie': 'x=1' } });
		};
		const r = await download({ request: new Request('https://fathersheartbible.com/ebook-download?s=cs_test_1&e=a-ebook&t=SIG&v=2&dl=epub&evil=1'), env: {} });
		assert.equal(seen, 'https://spiritmediapublishing.com/ebook-download?s=cs_test_1&e=a-ebook&t=SIG&v=2&dl=epub');
		assert.equal(r.status, 403, 'the refusal passes through');
		assert.equal(r.headers.get('set-cookie'), null);
		globalThis.fetch = async () => new Response(null, { status: 302, headers: { location: '/ebook-download?s=a&e=b&t=c&v=2' } });
		const r2 = await download({ request: new Request('https://fathersheartbible.com/ebook-download?s=a'), env: {} });
		assert.equal(r2.status, 302);
		assert.equal(r2.headers.get('location'), '/ebook-download?s=a&e=b&t=c&v=2', 'the buyer stays on FHB');
		globalThis.fetch = async () => new Response('PK-epub', { status: 200, headers: { 'content-type': 'application/epub+zip', 'content-disposition': 'attachment; filename="F.epub"' } });
		const f = await download({ request: new Request(`https://fathersheartbible.com/ebook-download?s=${SID}&dl=epub`), env: {} });
		assert.equal(f.headers.get('content-type'), 'application/epub+zip');
		assert.equal(await f.text(), 'PK-epub', 'the Bible eBook file streams through');
	} finally {
		globalThis.fetch = real;
	}
});

// MOVE 5: no store endpoint is left on FHB, and the Bible eBook button buys on the one store.
test('move 5: FHB serves no checkout or webhook of its own; the Bible eBook button posts to SMP /store-checkout', () => {
	const fns = fs.readdirSync('functions');
	for (const gone of ['print-webhook.ts', 'dvc-checkout.ts', 'print-checkout.ts', 'ebook-checkout.ts'])
		assert.ok(!fns.includes(gone), `functions/${gone} is retired`);
	const print = fs.readFileSync('src/pages/print.astro', 'utf8');
	assert.doesNotMatch(print, /fetch\('\/ebook-checkout'/, 'no call to the retired FHB eBook checkout');
	assert.match(print, /\$\{store\}\/store-checkout`[^\n]*bibleEbook: true/);
	assert.match(print, /'https:\/\/spiritmediapublishing\.com'/);
});
