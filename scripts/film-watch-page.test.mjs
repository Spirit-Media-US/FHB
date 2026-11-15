// node --test scripts/film-watch-page.test.mjs  (unit 3jq; DIST=<dir> to point elsewhere)
// /watch/introduction/ must have exactly 1 VideoObject whose embedUrl video id matches a VISIBLE iframe src
// (Google: a watch page's main purpose is its one video; markup only where the video is shown).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIST = process.env.DIST || fileURLToPath(new URL('../dist', import.meta.url));
const ID = /\/embed\/([\w-]{11})/;
export function watchProblems(html) {
	const p = [];
	const vids = [];
	const walk = (o) => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if ([].concat(o['@type']).includes('VideoObject')) vids.push(o); Object.values(o).forEach(walk); } };
	for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) { try { walk(JSON.parse(m[1])); } catch {} }
	if (vids.length !== 1) p.push(`expected 1 VideoObject, found ${vids.length}`);
	const iframes = [...html.matchAll(/<iframe\b[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
	const vid = vids[0]?.embedUrl?.match(ID)?.[1];
	if (!vid || !iframes.some((s) => s.match(ID)?.[1] === vid)) p.push(`embedUrl id ${vid} matches no iframe src (${iframes.join(',')})`);
	if (/<video\b/i.test(html)) p.push('has a <video> tag');
	if (!/<h1\b/.test(html)) p.push('no h1');
	return p;
}
const f = path.join(DIST, 'watch/introduction/index.html');
test('watch page: 1 VideoObject matching a visible iframe', { skip: !fs.existsSync(f) && 'no dist page' }, () => {
	assert.deepEqual(watchProblems(fs.readFileSync(f, 'utf8')), []);
});
test('failure path: 2 VideoObjects / no matching iframe / video tag rejected', () => {
	const ld = (n) => `<script type="application/ld+json">${JSON.stringify(n)}</script>`;
	const v = { '@type': 'VideoObject', embedUrl: 'https://www.youtube.com/embed/Ld4_H5XxrLk' };
	const ok = `<h1>x</h1>${ld(v)}<iframe src="https://www.youtube-nocookie.com/embed/Ld4_H5XxrLk?rel=0"></iframe>`;
	assert.deepEqual(watchProblems(ok), []);
	assert.equal(watchProblems(ok + ld(v)).length, 1);
	assert.equal(watchProblems(`<h1>x</h1>${ld(v)}<button data-id="Ld4_H5XxrLk"></button>`).length, 1);
	assert.equal(watchProblems(ok + '<video></video>').length, 1);
});
