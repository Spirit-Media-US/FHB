// node --test scripts/video-schema.test.mjs  (unit 2rj; DIST=<dir> to point elsewhere)
// Every VideoObject JSON-LD in dist needs uploadDate as ISO-8601 WITH an offset (GSC: "Invalid datetime
// value for uploadDate" / "missing a timezone") and a duration. Skips with a note if dist is absent.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const DIST = process.env.DIST || fileURLToPath(new URL('../dist', import.meta.url));
const ISO_TZ = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;
const ISO_DUR = /^P(T(\d+H)?(\d+M)?(\d+S)?)$/;
export function videoProblems(node) {
	const p = [];
	if (!ISO_TZ.test(String(node.uploadDate ?? ''))) p.push(`uploadDate "${node.uploadDate}" not ISO-8601 with offset`);
	if (!ISO_DUR.test(String(node.duration ?? '')) || node.duration === 'PT') p.push(`duration "${node.duration}" missing/invalid`);
	return p;
}
function* walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'studio' && e.name !== 'read') yield* walk(f); } else if (e.name === 'index.html') yield f; } }
function* nodes(o) { if (Array.isArray(o)) for (const x of o) yield* nodes(x); else if (o && typeof o === 'object') { if ([].concat(o['@type']).includes('VideoObject')) yield o; for (const v of Object.values(o)) yield* nodes(v); } }
test('every VideoObject in dist has tz-aware uploadDate + duration', { skip: !fs.existsSync(DIST) && 'no dist' }, () => {
	let pages = 0, vids = 0; const bad = [];
	for (const f of walk(DIST)) {
		const html = fs.readFileSync(f, 'utf8');
		for (const m of html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)) {
			let j; try { j = JSON.parse(m[1]); } catch { continue; }
			for (const n of nodes(j)) { vids++; for (const x of videoProblems(n)) bad.push(`${path.relative(DIST, f)}: ${x}`); }
		}
		pages++;
	}
	assert.ok(vids > 0, 'expected VideoObjects in dist');
	assert.deepEqual(bad, [], `${bad.length} bad of ${vids} VideoObjects:\n${bad.slice(0, 5).join('\n')}`);
});
test('failure path: date-only / no-tz / no-duration rejected', () => {
	assert.equal(videoProblems({ uploadDate: '2026-06-11', duration: 'PT35S' }).length, 1);
	assert.equal(videoProblems({ uploadDate: '2026-06-11T00:00:00', duration: 'PT35S' }).length, 1);
	assert.equal(videoProblems({ uploadDate: '2026-06-11T00:00:00+00:00' }).length, 1);
	assert.equal(videoProblems({ uploadDate: '2026-06-11T00:00:00+00:00', duration: 'PT35S' }).length, 0);
});
