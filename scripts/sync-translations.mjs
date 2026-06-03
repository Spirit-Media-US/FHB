#!/usr/bin/env node
// Sync FHB chapter translations from the tools-api repo into FHB/src/content/bible/.
//
// Publishes two stages to the public reader:
//   - output/locked/  — immutable canonical text                 (status: "locked")
//   - Reading-Edition chapters from output/drafts/, per
//     output/reading_edition.json — public but still MUTABLE      (status: "reading-edition")
//     (the June feedback edition; revisions flow through on the next sync)
// Locked wins if a chapter is somehow in both. Plain drafts NOT in the
// Reading-Edition manifest never reach the reader. Each chapter JSON is
// flattened to a minimal shape: verses, footnotes, status, version stamp.
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
const DRAFTS_DIR = path.join(TOOLS_API_ROOT, 'output/drafts');
const READING_EDITION_MANIFEST = path.join(TOOLS_API_ROOT, 'output/reading_edition.json');
const STRUCTURE_PATH = path.join(ROOT, 'src/lib/bible_structure.json');
const OUT_DIR = path.join(ROOT, 'src/content/bible');
const MANIFEST_PATH = path.join(OUT_DIR, '_manifest.json');

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

// Snapshot the editorial markers already present in the output content, keyed
// by `slug/chapter`. Used as a preserve-fallback: a chapter whose draft has NOT
// been through the Layer-2 marking pass (no `editorial_marked` flag) keeps the
// markers it currently shows, so a partial rollout never blanks the reader.
function snapshotMarkers(dir) {
	const map = {};
	if (!fs.existsSync(dir)) return map;
	for (const slug of fs.readdirSync(dir)) {
		const bookDir = path.join(dir, slug);
		if (!fs.existsSync(bookDir) || !fs.statSync(bookDir).isDirectory()) continue;
		for (const file of fs.readdirSync(bookDir)) {
			if (!file.endsWith('.json') || file === '_manifest.json') continue;
			try {
				const d = JSON.parse(fs.readFileSync(path.join(bookDir, file), 'utf8'));
				const verses = {};
				for (const v of d.verses || []) {
					const m = {};
					if (v.poetic) { m.poetic = true; m.poeticIndent = v.poeticIndent || 1; }
					if (v.jesusWords && v.jesusWords.length) m.jesusWords = v.jesusWords;
					if (v.lines && v.lines.length) m.lines = v.lines;
					if (Object.keys(m).length) verses[v.verse] = m;
				}
				map[`${slug}/${d.chapter}`] = {
					headings: d.headings || [],
					paragraphStarts: d.paragraphStarts || [],
					divineSpeechRanges: d.divineSpeechRanges || [],
					selahAfter: d.selahAfter || [],
					acrostic: d.acrostic || [],
					verses,
				};
			} catch { /* skip unreadable */ }
		}
	}
	return map;
}

// Flatten a tools-api chapter JSON to the public reader shape. Carries the
// Layer-2 editorial markers the reader's ChapterReader renders (headings,
// paragraphs, poetry, divine-speech, red-letter `jesusWords`, Selah, acrostic).
// `existing` is the preserve-fallback snapshot for this chapter (if any).
// `status` is "locked" or "reading-edition" so the reader can label the edition.
function flattenChapter(data, status, existing) {
	const marked = !!data.editorial_marked;
	const ex = existing || {};
	const verses = (data.verses || []).map(v => {
		const out = {
			verse: v.verse,
			text: v.fhb_text,
			footnote: v.footnote || null,
			footnoteCategory: v.footnote_category || null,
		};
		if (marked) {
			if (v.poetic) { out.poetic = true; out.poeticIndent = v.poeticIndent || 1; }
			if (v.jesus_words && v.jesus_words.length) out.jesusWords = v.jesus_words;
				if (v.lines && v.lines.length) out.lines = v.lines;
		} else {
			const exV = (ex.verses && ex.verses[v.verse]) || {};
			if (exV.poetic) { out.poetic = true; out.poeticIndent = exV.poeticIndent || 1; }
			if (exV.jesusWords && exV.jesusWords.length) out.jesusWords = exV.jesusWords;
				if (exV.lines && exV.lines.length) out.lines = exV.lines;
		}
		return out;
	});
	return {
		book: data.book,
		chapter: data.chapter,
		testament: data.testament,
		sourceLanguage: data.source_language,
		rulesVersion: data.rules_version,
		status,
		lockedAt: data.locked_at || null,
		lockedBy: data.locked_by || null,
		updatedAt: data.updated_at,
		headings: marked ? (data.headings || []) : (ex.headings || []),
		paragraphStarts: marked ? (data.paragraphStarts || []) : (ex.paragraphStarts || []),
		divineSpeechRanges: marked ? (data.divineSpeechRanges || []) : (ex.divineSpeechRanges || []),
		selahAfter: marked ? (data.selahAfter || []) : (ex.selahAfter || []),
		acrostic: marked ? (data.acrostic || []) : (ex.acrostic || []),
		verses,
	};
}

function chapterFile(num) {
	return `${String(num).padStart(3, '0')}.json`;
}

const structure = readJson(STRUCTURE_PATH);
const bookOrder = structure.order;
const otBooks = new Set(structure.testament.OT);
const chapterCounts = structure.chapters;

// Snapshot existing markers BEFORE clearing — preserve-fallback for chapters
// whose drafts haven't been through the Layer-2 marking pass yet.
const existing = snapshotMarkers(OUT_DIR);

// Clear + recreate
rmDir(OUT_DIR);
ensureDir(OUT_DIR);

const manifest = {
	syncedAt: new Date().toISOString(),
	source: 'tools-api/pipelines/translation/output/{locked, drafts (reading-edition)}',
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
			const out = flattenChapter(data, 'locked', existing[`${slug}/${data.chapter}`]);
			fs.writeFileSync(path.join(outBookDir, chapterFile(data.chapter)), JSON.stringify(out, null, 2));
			chapters.push(data.chapter);
			totalChapters++;
		}

		manifest.books[slug] = {
			book,
			slug,
			testament: otBooks.has(book) ? 'OT' : 'NT',
			totalChapters: chapterCounts[book] || 0,
			lockedChapters: chapters.sort((a, b) => a - b),
			readingEditionChapters: [],
			order: bookOrder.indexOf(book),
		};
	}
}

// Reading Edition — public but MUTABLE chapters, pulled from drafts/ per the
// promote manifest. A chapter already locked above takes precedence (locked
// is immutable/final); only Reading-Edition chapters not yet locked are added.
let readingEditionTotal = 0;
if (fs.existsSync(READING_EDITION_MANIFEST)) {
	const reManifest = readJson(READING_EDITION_MANIFEST);
	for (const [book, info] of Object.entries(reManifest.books || {})) {
		const slug = slugifyBook(book);
		const outBookDir = path.join(OUT_DIR, slug);
		ensureDir(outBookDir);

		const entry = manifest.books[slug] || {
			book,
			slug,
			testament: otBooks.has(book) ? 'OT' : 'NT',
			totalChapters: chapterCounts[book] || 0,
			lockedChapters: [],
			readingEditionChapters: [],
			order: bookOrder.indexOf(book),
		};
		const lockedSet = new Set(entry.lockedChapters || []);
		const reChapters = [];
		for (const ch of (info.chapters || []).slice().sort((a, b) => a - b)) {
			if (lockedSet.has(ch)) continue; // locked wins
			const draftPath = path.join(DRAFTS_DIR, book, chapterFile(ch));
			if (!fs.existsSync(draftPath)) continue;
			const out = flattenChapter(readJson(draftPath), 'reading-edition', existing[`${slug}/${ch}`]);
			out.promotedAt = info.promoted_at || null;
			out.promotedBy = info.promoted_by || null;
			fs.writeFileSync(path.join(outBookDir, chapterFile(ch)), JSON.stringify(out, null, 2));
			reChapters.push(ch);
			readingEditionTotal++;
			totalChapters++;
		}
		entry.readingEditionChapters = reChapters;
		manifest.books[slug] = entry;
	}
}

// Always write manifest — even if no chapters are locked yet — so the reader
// pages have a consistent data source.
fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));

const lockedTotal = totalChapters - readingEditionTotal;
const bookCount = Object.keys(manifest.books).length;
console.log(`[sync-translations] ✓ ${totalChapters} chapters across ${bookCount} book(s) synced ` +
	`(${lockedTotal} locked, ${readingEditionTotal} reading-edition).`);
