// node --test scripts/bibles-image-object.test.mjs  (unit 2rl; DIST=<dir> to point elsewhere)
// Every /bibles/*-bible/ Book/Product (and its workExample bindings) must carry image as an ImageObject
// with contentUrl + creator + copyrightNotice (Google Images licensable-metadata). Skips if dist absent.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIST = process.env.DIST || fileURLToPath(new URL('../dist', import.meta.url));
export function imageProblems(node) {
	const i = node.image, p = [];
	if (!i || typeof i !== 'object' || i['@type'] !== 'ImageObject') return ['image is not an ImageObject'];
	if (!i.contentUrl) p.push('no contentUrl');
	if (!i.creator || !i.creator.name) p.push('no creator');
	if (!i.copyrightNotice) p.push('no copyrightNotice');
	return p;
}
function* nodes(o) { if (Array.isArray(o)) for (const x of o) yield* nodes(x); else if (o && typeof o === 'object') { const t = [].concat(o['@type']); if (t.includes('Book') && 'image' in o) yield o; for (const v of Object.values(o)) yield* nodes(v); } }
test('every /bibles/*-bible/ Book/Product image is a complete ImageObject', { skip: !fs.existsSync(path.join(DIST, 'bibles')) && 'no dist' }, () => {
	const bad = []; let pages = 0, n = 0;
	for (const d of fs.readdirSync(path.join(DIST, 'bibles'))) {
		if (!d.endsWith('-bible')) continue;
		const f = path.join(DIST, 'bibles', d, 'index.html'); if (!fs.existsSync(f)) continue;
		pages++;
		for (const m of fs.readFileSync(f, 'utf8').matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
			let j; try { j = JSON.parse(m[1]); } catch { continue; }
			for (const x of nodes(j)) { n++; for (const q of imageProblems(x)) bad.push(`${d}: ${q}`); }
		}
	}
	assert.ok(pages > 50 && n >= pages, `expected many edition pages, got ${pages} pages / ${n} nodes`);
	assert.deepEqual(bad, [], `${bad.length} bad of ${n}:\n${bad.slice(0, 5).join('\n')}`);
});
test('failure path: bare URL / missing fields rejected', () => {
	assert.equal(imageProblems({ image: 'https://x/y.webp' }).length, 1);
	assert.equal(imageProblems({ image: { '@type': 'ImageObject', contentUrl: 'u' } }).length, 2);
	assert.equal(imageProblems({ image: { '@type': 'ImageObject', contentUrl: 'u', creator: { name: 'a' }, copyrightNotice: 'c' } }).length, 0);
});
