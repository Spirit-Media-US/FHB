#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
/**
 * Generate every language's Google Play eBook + audiobook link in src/data/digital-listings.json
 * from the publisher seat's measured store state, projects/fhb-lang-audio/stores/store-status.json.
 *
 * BUILD-CHECK: tool-inventory.py "digital listings google play store-status" + ls scripts/ — nothing
 *   writes digital-listings.json; it was hand-kept.
 * NEAREST: scripts/sync-amazon-links.mjs (same copy-the-master-at-build shape, Sanity source) and
 *   stores/store_status.mjs (MEASURES the Play catalog, writes store-status.json — the master read here).
 * NOT-REUSED-BECAUSE: sync-amazon-links reads Sanity book docs, not store-status; store_status.mjs drives
 *   Chrome against Partner Center and must not run inside a site build. This only copies its output.
 * APPROVED-BY: deploy directive 2026-10-30 22:32Z ("generate GP ebook+audiobook links from
 *   store-status.json in the prebuild (keep the 200 check)").
 *
 * ONE MASTER. Typing store links in by hand left 17 live audiobooks FADED on /print (file last
 * edited 10-14). This runs in prebuild, so a listing going live reaches the page on the next build.
 *
 * Rules (unchanged from the hand-kept file):
 *  - An entry is written only when store-status says live AND its store page answers HTTP 200
 *    right now. A non-200 drops the entry (the pill fades). A network error keeps the entry the
 *    file already had (it was verified before) rather than fading a live book on a flaky fetch.
 *  - Only the "Google Play" entries of ebook/audiobook are generated. Every other store (Kindle,
 *    Kobo) and the whole English block stay as they were: English's Play eBook here is the
 *    reading eBook, while store-status `en` holds the listening eBook — a different product.
 *  - Price: audiobook from stores/<code>-listing.json price_usd; eBook keeps the price already
 *    on file (no machine source for it yet), else none.
 *  - `verified` keeps its old date while the URL is unchanged, so a rebuild is not a diff.
 *  - No store-status.json (e.g. a build off Bethel): the file is left untouched.
 *
 * Re-run:  node scripts/sync-digital-listings.mjs [--dry]
 */

const STORES = '/home/deploy/projects/fhb-lang-audio/stores';
const STATUS = `${STORES}/store-status.json`;
const OUT = new URL('../src/data/digital-listings.json', import.meta.url);
const DRY = process.argv.includes('--dry');
const today = new Date().toISOString().slice(0, 10);

if (!existsSync(STATUS)) {
	console.log(`sync-digital-listings: ${STATUS} absent — digital-listings.json left as is`);
	process.exit(0);
}
const status = JSON.parse(readFileSync(STATUS, 'utf8'));
const before = readFileSync(OUT, 'utf8');
const digital = JSON.parse(before);

/** 200 | other status | 'error' */
async function probe(url) {
	try {
		const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(20000) });
		return r.status;
	} catch {
		return 'error';
	}
}

const audioPrice = (code) => {
	try {
		const p = JSON.parse(readFileSync(`${STORES}/${code}-listing.json`, 'utf8')).price_usd;
		return p ? `$${p}` : '';
	} catch {
		return '';
	}
};

const report = { audiobook: [], ebook: [], faded: [], kept: [] };
const jobs = [];
for (const [code, s] of Object.entries(status.languages || {})) {
	const want = [];
	if (s.google === 'live' && s.google_url)
		want.push({
			kind: 'audiobook',
			url: s.google_url,
			id: (s.note || '').replace(/^google\s+/, ''),
			price: audioPrice(code),
		});
	if (s.google_ebook?.state === 'live' && s.google_ebook.url)
		want.push({ kind: 'ebook', url: s.google_ebook.url, id: `GGKEY:${s.google_ebook.id}` });
	jobs.push({ code, want });
}

const results = await Promise.all(
	jobs.map(async ({ code, want }) => ({
		code,
		got: await Promise.all(want.map(async (w) => ({ ...w, http: await probe(w.url) }))),
	})),
);

for (const { code, got } of results) {
	const entry = digital[code] || {};
	for (const kind of ['ebook', 'audiobook']) {
		const old = (entry[kind] || []).find((x) => x.store === 'Google Play');
		const others = (entry[kind] || []).filter((x) => x.store !== 'Google Play');
		const w = got.find((g) => g.kind === kind);
		let gp = null;
		if (w && w.http === 200) {
			gp = {
				store: 'Google Play',
				url: w.url,
				price: w.price || old?.price || '',
				id: w.id || old?.id || '',
				verified: old?.url === w.url ? old.verified : today,
				evidence:
					old?.url === w.url
						? old.evidence
						: `HTTP 200 at build; store-status.json google live (${status.updated}, ${status.measured_by})`,
			};
			report[kind].push(code);
		} else if (w && w.http === 'error' && old) {
			gp = old;
			report.kept.push(`${code} ${kind} (fetch error)`);
		} else if (w) {
			report.faded.push(`${code} ${kind} HTTP ${w.http}`);
		}
		const list = gp ? [...others, gp] : others;
		if (list.length) entry[kind] = list;
		else delete entry[kind];
	}
	if (Object.keys(entry).length) digital[code] = entry;
	else delete digital[code];
}

const after = `${JSON.stringify(digital, null, '\t')}\n`;
console.log(
	`sync-digital-listings: Google Play audiobook ${report.audiobook.length}, eBook ${report.ebook.length} (+ English untouched)` +
		(report.faded.length ? ` · faded: ${report.faded.join(', ')}` : '') +
		(report.kept.length ? ` · kept on fetch error: ${report.kept.join(', ')}` : ''),
);
if (after === before) console.log('sync-digital-listings: unchanged');
else if (DRY) console.log('sync-digital-listings: --dry, not written');
else {
	writeFileSync(OUT, after);
	console.log('sync-digital-listings: wrote src/data/digital-listings.json');
}
