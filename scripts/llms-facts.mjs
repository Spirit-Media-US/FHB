// Site-fact counts for public/llms.txt and public/llms-full.txt (unit 2ge, 2026-10-31).
// WHY: AI engines quote these two files. Their hand-written prose carries counts (languages in
// print, languages online, the 80-language roster, canon books/chapters/verses) and every one
// must come from its own source, never from a typist. Each count is a DIFFERENT TRUE FACT:
//   print   = English + every edition in src/data/edition-registry.json   ("published in N languages")
//   online  = languages live on /read (the coverage table's own row count) ("free to read online in N")
//   roster  = the whole commitment, src/data/language-roster.json          ("80 languages")
//   canon   = books/chapters from src/lib/bible_structure.json, verses counted from the locked
//             canon (community content/bible). NOT the print edition's figure (see the test).
// applyFacts() is pure; gen-sitemap-read.mjs calls it on every build and fails LOUD if a phrase
// has been rewritten out from under it. Test: scripts/site-facts.test.mjs.
import fs from 'node:fs';
import path from 'node:path';

export const CANON_CONTENT = '/srv/sites/community/src/content/bible';

export const fmt = (n) => n.toLocaleString('en-US');

/** Measure every source. Missing inputs yield null for that fact (never a guess). */
export function measureFacts(root = process.cwd(), { online = 0 } = {}) {
	const j = (p) => JSON.parse(fs.readFileSync(path.resolve(root, p), 'utf8'));
	const structure = j('src/lib/bible_structure.json');
	const registry = j('src/data/edition-registry.json');
	const roster = j('src/data/language-roster.json');
	const books = structure.order.length;
	const chapters = Object.values(structure.chapters).reduce((a, b) => a + b, 0);
	let verses = null;
	try {
		verses = 0;
		for (const b of fs.readdirSync(CANON_CONTENT)) {
			const dir = path.join(CANON_CONTENT, b);
			if (!fs.statSync(dir).isDirectory()) continue;
			for (const f of fs.readdirSync(dir)) {
				if (f.endsWith('.json')) verses += JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')).verses.length;
			}
		}
	} catch {
		verses = null;
	}
	return {
		print: (registry.editions || []).length + 1,
		online: online || null,
		roster: roster.languages.length,
		books,
		chapters,
		verses,
	};
}

// [key, regex, replacement(facts) | null when the fact is unavailable, files that MUST contain it]
const PHRASES = [
	['print', /published in \d+ languages/g, (f) => `published in ${f.print} languages`, ['llms.txt', 'llms-full.txt']],
	['online', /free to read online in \d+ languages/g, (f) => f.online && `free to read online in ${f.online} languages`, ['llms.txt', 'llms-full.txt']],
	['roster', /(base texts, )\d+( languages, print licensing)/g, (f) => `$1${f.roster}$2`, ['llms.txt']],
	['canon', /\d+ books, [\d,]+ chapters, [\d,]+ verses/g, (f) => f.verses && `${f.books} books, ${fmt(f.chapters)} chapters, ${fmt(f.verses)} verses`, ['llms.txt', 'llms-full.txt']],
	['audio', /(audio Bible, all )[\d,]+( chapters)/g, (f) => `$1${fmt(f.chapters)}$2`, ['llms-full.txt']],
];

/** Rewrite every count phrase in one file's text. Throws if a required phrase is missing. */
export function applyFacts(text, facts, fileName) {
	let out = text;
	const hits = {};
	for (const [key, re, make, files] of PHRASES) {
		const n = (out.match(re) || []).length;
		if (n === 0) {
			if (files.includes(fileName)) throw new Error(`${fileName} has no "${key}" count phrase to generate (${re})`);
			continue;
		}
		const rep = make(facts);
		hits[key] = n;
		if (rep) out = out.replace(re, rep);
		else hits[key] = `${n} (source unavailable, left unchanged)`;
	}
	return { text: out, hits };
}
