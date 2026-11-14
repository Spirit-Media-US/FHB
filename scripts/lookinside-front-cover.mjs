#!/usr/bin/env node
// BUILD-CHECK: searched lookinside (tool-inventory.py); ls /srv/sites/FHB/scripts | grep look; grep lookinside scripts/
// NEAREST: scripts/print-cards.test.mjs (card <-> manifest switching) and projects/fhb-print-bible/lookinside-build/verify_parity.py
// NOT-REUSED-BECAUSE: print-cards.test.mjs runs inside `npm run build`, so a front-cover assertion there would fail every
//   build the moment the edition chain publishes a new language (publish_lookinside.py writes no front yet) — that gate
//   decision is the PM's, not this check's. verify_parity.py reads the BUILD manifest (lookinside-build/manifest.json),
//   not the site's src/data/lookinside.json that the viewer actually serves, and cannot curl R2.
// APPROVED-BY: pmprint brief pmprint-lookinside-front-cover-20261114 ("a script asserts this, exits 1 on any miss"),
//   from Kevin 2026-11-14 kevin-decisions.
//
// Every Look inside opens on the FRONT COVER (Kevin 2026-11-14: "Please show front cover first in the bookflip look
// inside for all books.").
//
// Asserts, for every entry in src/data/lookinside.json (or the file given as the first argument):
//   pages[0].label === "Front cover"
//   pages[1] is the inside-cover spacer (keeps the title page on the right-hand side of the spread)
//   the front is the same w x h as the interior pages (the viewer sizes the book from pages[0])
//   count === pages.length
// Exits 1 on any miss, naming each one.
//
//   node scripts/lookinside-front-cover.mjs [manifest.json] [--curl]
// --curl also requests every front-cover URL and fails on anything but 200.
import { readFileSync } from 'node:fs';

const ASSETS = 'https://assets.spiritmediapublishing.com/FHB/print/lookinside';
const args = process.argv.slice(2);
const curl = args.includes('--curl');
const file = args.find((a) => !a.startsWith('--')) ?? new URL('../src/data/lookinside.json', import.meta.url);
const data = JSON.parse(readFileSync(file, 'utf8'));

const misses = [];
const fronts = [];
for (const [slug, e] of Object.entries(data)) {
	const p = e.pages ?? [];
	if (p[0]?.label !== 'Front cover') { misses.push(`${slug}: pages[0] is "${p[0]?.label}", not "Front cover"`); continue; }
	if (p[1]?.spacer !== true) misses.push(`${slug}: pages[1] is not the inside-cover spacer`);
	const inner = p[2];
	if (inner && (p[0].w !== inner.w || p[0].h !== inner.h))
		misses.push(`${slug}: front ${p[0].w}x${p[0].h} != page ${inner.w}x${inner.h}`);
	if (e.count !== p.length) misses.push(`${slug}: count ${e.count} != ${p.length} pages`);
	fronts.push([slug, `${ASSETS}/${e.dir ?? slug}/${p[0].file}`]);
}

if (curl) {
	for (const [slug, url] of fronts) {
		const r = await fetch(url).catch((err) => ({ status: String(err) }));
		if (r.status !== 200) misses.push(`${slug}: ${url} -> ${r.status}`);
	}
}

const total = Object.keys(data).length;
const ok = total - new Set(misses.map((m) => m.split(':')[0])).size;
console.log(`Look inside front cover first: ${ok} of ${total}${curl ? ' (front URLs curled)' : ''}`);
if (misses.length) {
	for (const m of misses) console.error('  MISS ' + m);
	process.exit(1);
}
