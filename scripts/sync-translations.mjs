#!/usr/bin/env node
// Sync FHB chapter translations from the tools-api repo into FHB/src/content/bible/.
//
// Reads ONLY from output/locked/ (the immutable canonical text). Drafts are
// editorial state and never reach the public reader. Each chapter JSON is
// flattened to a minimal shape: verses, footnotes, version stamp.
//
// Idempotent: clears src/content/bible/ at the start, then writes fresh.
// The output directory is gitignored — translation text lives in the
// tools-api repo, this is a build-time mirror.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const TOOLS_API_ROOT = '/home/deploy/bin/tools-api/pipelines/translation';
const LOCKED_DIR = path.join(TOOLS_API_ROOT, 'output/locked');
const STRUCTURE_PATH = path.join(TOOLS_API_ROOT, 'bible_structure.json');
const OUT_DIR = path.join(ROOT, 'src/content/bible');
const MANIFEST_PATH = path.join(OUT_DIR, '_manifest.json');

if (!fs.existsSync(STRUCTURE_PATH)) {
	console.log(`[sync-translations] No structure file at ${STRUCTURE_PATH} (Bethel-only path) — writing empty manifest so reader renders empty-state.`);
	rmDir(OUT_DIR);
	ensureDir(OUT_DIR);
	fs.writeFileSync(
		MANIFEST_PATH,
		JSON.stringify({ syncedAt: new Date().toISOString(), source: 'unavailable', books: {} }, null, 2),
	);
	process.exit(0);
}

function slugifyBook(book) {
	return book.toLowerCase().replace(/\s+/g, '-');
}

function readJson(p) {
	return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function rmDir(p) {
	if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function ensureDir(p) {
	fs.mkdirSync(p, { recursive: true });
}

const structure = readJson(STRUCTURE_PATH);
const bookOrder = structure.order;
const otBooks = new Set(structure.testament.OT);
const chapterCounts = structure.chapters;

// Clear + recreate
rmDir(OUT_DIR);
ensureDir(OUT_DIR);

const manifest = {
	syncedAt: new Date().toISOString(),
	source: 'tools-api/pipelines/translation/output/locked',
	books: {},
};

let totalChapters = 0;

if (!fs.existsSync(LOCKED_DIR)) {
	console.log(`[sync-translations] No locked dir at ${LOCKED_DIR} — reader will render empty-state.`);
} else {
	for (const book of bookOrder) {
		const bookDir = path.join(LOCKED_DIR, book);
		if (!fs.existsSync(bookDir)) continue;

		const slug = slugifyBook(book);
		const outBookDir = path.join(OUT_DIR, slug);
		ensureDir(outBookDir);

		const chapters = [];
		const files = fs.readdirSync(bookDir).filter(f => f.endsWith('.json')).sort();
		for (const file of files) {
			const data = readJson(path.join(bookDir, file));
			const chapterNum = data.chapter;
			const out = {
				book: data.book,
				chapter: chapterNum,
				testament: data.testament,
				sourceLanguage: data.source_language,
				rulesVersion: data.rules_version,
				lockedAt: data.locked_at || null,
				lockedBy: data.locked_by || null,
				updatedAt: data.updated_at,
				verses: (data.verses || []).map(v => ({
					verse: v.verse,
					text: v.fhb_text,
					footnote: v.footnote || null,
					footnoteCategory: v.footnote_category || null,
				})),
			};
			const padded = String(chapterNum).padStart(3, '0');
			fs.writeFileSync(path.join(outBookDir, `${padded}.json`), JSON.stringify(out, null, 2));
			chapters.push(chapterNum);
			totalChapters++;
		}

		manifest.books[slug] = {
			book,
			slug,
			testament: otBooks.has(book) ? 'OT' : 'NT',
			totalChapters: chapterCounts[book] || 0,
			lockedChapters: chapters.sort((a, b) => a - b),
			order: bookOrder.indexOf(book),
		};
	}
}

// Always write manifest — even if no chapters are locked yet — so the reader
// pages have a consistent data source.
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

const lockedBookCount = Object.keys(manifest.books).length;
console.log(`[sync-translations] ✓ ${totalChapters} chapters across ${lockedBookCount} book(s) synced.`);
