// Shared on-disk cache of "production served this URL with 200" for the sitemap live guard.
// WHY (unit 2cr, 2026-10-29): every FHB build probed ~3,168 chapter URLs through the router
// Worker + Pages Function (billed Worker requests). A URL confirmed 200 recently need not be
// re-fetched. SAFETY: only 200 is ever recorded — a 404/error/timeout is never cached, so an
// unpublished language still gets dropped by the guard the first time it is probed, and an entry
// older than the TTL is re-probed. Bounded: expired entries are dropped on load and the file is
// capped at MAX_ENTRIES (oldest evicted), ~100 bytes/entry => <2 MB.
import fs from 'node:fs';
import path from 'node:path';

export const DEFAULT_TTL_MS = 24 * 3600 * 1000;
export const MAX_ENTRIES = 20000;
export const DEFAULT_PATH = '/home/deploy/aeo-state/fhb-sitemap-live-cache.json';

export function loadLiveCache(file = DEFAULT_PATH, now = Date.now(), ttl = DEFAULT_TTL_MS) {
	const map = new Map();
	try {
		const j = JSON.parse(fs.readFileSync(file, 'utf8'));
		if (j && j.v === 1 && j.urls && typeof j.urls === 'object') {
			for (const [u, t] of Object.entries(j.urls)) {
				if (typeof t === 'number' && t <= now + 60000 && now - t < ttl) map.set(u, t);
			}
		}
	} catch {
		/* missing or corrupt cache = empty cache; never fatal */
	}
	return map;
}

export function isConfirmedLive(map, url) {
	return map.has(url);
}

export function recordLive(map, url, now = Date.now()) {
	map.set(url, now);
}

export function saveLiveCache(map, file = DEFAULT_PATH, now = Date.now(), ttl = DEFAULT_TTL_MS) {
	try {
		// merge with what other concurrent builds wrote meanwhile (newest timestamp wins)
		const merged = loadLiveCache(file, now, ttl);
		for (const [u, t] of map) if (!(merged.get(u) >= t)) merged.set(u, t);
		let entries = [...merged.entries()].filter(([, t]) => now - t < ttl);
		if (entries.length > MAX_ENTRIES) {
			entries.sort((a, b) => b[1] - a[1]);
			entries = entries.slice(0, MAX_ENTRIES);
		}
		fs.mkdirSync(path.dirname(file), { recursive: true });
		const tmp = `${file}.${process.pid}.tmp`;
		fs.writeFileSync(tmp, JSON.stringify({ v: 1, urls: Object.fromEntries(entries) }));
		try { fs.chmodSync(tmp, 0o664); } catch {}
		fs.renameSync(tmp, file);
		return entries.length;
	} catch {
		return -1; // cache is an optimisation; a write failure must not fail the build
	}
}

// Probe `urls` (array of {key,url}) using fetchStatus(url)->status; skips cached-live ones.
// Returns {fetched, skipped}. Calls onResult(job, status|Error) for every FETCHED job.
export async function probeWithCache(jobs, fetchStatus, cache, onResult, concurrency = 6) {
	let fetched = 0;
	let skipped = 0;
	const queue = [];
	for (const j of jobs) {
		if (isConfirmedLive(cache, j.url)) skipped++;
		else queue.push(j);
	}
	const worker = async () => {
		while (queue.length) {
			const j = queue.shift();
			fetched++;
			let res;
			try {
				res = await fetchStatus(j.url);
			} catch (e) {
				res = e instanceof Error ? e : new Error(String(e));
			}
			if (res === 200) recordLive(cache, j.url);
			onResult(j, res);
		}
	};
	await Promise.all(Array.from({ length: concurrency }, worker));
	return { fetched, skipped };
}
