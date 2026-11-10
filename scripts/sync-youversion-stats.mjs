// Prebuild: refresh src/data/youversion-stats.json from the ONE live source on R2
// (https://assets.spiritmediapublishing.com/FHB/youversion/stats.json), so every build's HTML is never
// far behind the live counters. Fetch fails / bad shape -> keep the committed copy (never blocks a build).
// Update the live numbers with the one-liner in docs: rclone copyto stats.json r2-bethel:smp/FHB/youversion/stats.json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const URL_ = process.env.YV_STATS_URL || 'https://assets.spiritmediapublishing.com/FHB/youversion/stats.json';
const FILE = fileURLToPath(new URL('../src/data/youversion-stats.json', import.meta.url));
const KEYS = ['users', 'languages', 'countries', 'chapters'];
const ok = (j) => j && KEYS.every((k) => Number.isFinite(j[k]) && j[k] > 0) && typeof j.updated === 'string';

try {
	const r = await fetch(URL_, { signal: AbortSignal.timeout(8000), headers: { 'cache-control': 'no-cache' } });
	if (!r.ok) throw new Error('HTTP ' + r.status);
	const j = await r.json();
	if (!ok(j)) throw new Error('bad shape');
	const next = { updated: j.updated, users: j.users, languages: j.languages, countries: j.countries, chapters: j.chapters };
	const prev = readFileSync(FILE, 'utf8');
	const out = JSON.stringify(next, null, '\t') + '\n';
	if (out !== prev) writeFileSync(FILE, out);
	console.log('youversion-stats: synced from R2 (' + j.updated + ')' + (out !== prev ? ' [changed]' : ''));
} catch (e) {
	console.log('youversion-stats: R2 fetch failed (' + e.message + ') - keeping committed copy');
}
