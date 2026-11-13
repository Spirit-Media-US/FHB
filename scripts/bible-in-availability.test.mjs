// Unit 2ww: availability statements on /bible-in/* and /bible-for/* must agree with the live
// registries. Languages live on /read = src/data/reader-languages.json (generated from the
// community app's languages.ts); print editions = src/data/edition-registry.json.
// Two classes of stale claim fail here (and so fail `npm run build`):
//   1. a country-table row with NO `code` whose language is already live (its status is typed,
//      so it goes stale the day the language ships: Oromo, Lingala, Sindhi, Ilocano 2026-11-12);
//   2. prose that says a live language is "not yet available" / "still waiting" / "translation
//      needed" / "no edition" (Ethiopia, DR Congo, Kenya FAQs said so after those shipped).
// Fix a failure by adding `code: '<xx>'` to the row (status then derives from the registry) or
// correcting the sentence; never by loosening this test.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = new URL('..', import.meta.url).pathname;
const reader = JSON.parse(readFileSync(join(root, 'src/data/reader-languages.json'), 'utf8')).languages;
const editions = JSON.parse(readFileSync(join(root, 'src/data/edition-registry.json'), 'utf8')).editions;

const ALIASES = { tagalog: 'fil', farsi: 'fa', nyanja: 'ny', kikuyu: 'ki', gikuyu: 'ki', 'oromo': 'om', 'afaan oromoo': 'om', pidgin: 'pcm', 'naija': 'pcm' };
const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
export const liveNames = new Map();
for (const l of reader) {
	liveNames.set(norm(l.name), l.code);
	liveNames.set(norm(l.endonym), l.code);
}
for (const e of editions) if (!e.soon) liveNames.set(norm(e.english), e.code);
for (const [k, v] of Object.entries(ALIASES)) liveNames.set(k, v);
// Names too ambiguous to match as a word in prose (also a place or other noun).
const PROSE_SKIP = new Set(['english', 'ao', 'sena', 'chang', 'malay', 'greek', 'twi']);

export function rowViolations(src, file) {
	const out = [];
	for (const m of src.matchAll(/\{\s*language:\s*'([^']+)'([^}]*)\}/g)) {
		if (/\bcode:/.test(m[2])) continue;
		const full = norm(m[1].replace(/\\'/g, "'"));
		const base = norm(full.replace(/\s*\(.*\)/, ''));
		const paren = (full.match(/\(([^)]*)\)/) || [])[1];
		const parenOk = !paren || liveNames.has(norm(paren));
		const code = liveNames.get(full) || (parenOk ? liveNames.get(base) : undefined);
		if (code) out.push(`${file}: row "${m[1]}" has no code but "${code}" is live on /read`);
	}
	return out;
}

const STALE = '(?:not yet (?:available|published|translated)|does not have an edition|\\bno edition|still waiting|translation needed|editions? (?:is|are) not)';
export function proseViolations(src, file) {
	const out = [];
	const text = src.replace(/&mdash;/g, '—').replace(/&rsquo;/g, "'");
	for (const [name, code] of liveNames) {
		if (PROSE_SKIP.has(name) || name.length < 3 || /[^\x00-\x7f]/.test(name)) continue;
		const re = new RegExp(
			`\\b${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b(?:(?!published|free to read|\\bnow\\b|\\bare live\\b|\\bwith\\b)[^.;,—\\n]){0,120}?${STALE}`,
			'gi',
		);
		for (const m of text.matchAll(re)) out.push(`${file}: "${m[0].slice(0, 140)}" but "${code}" is live`);
	}
	return out;
}

const pages = ['bible-in', 'bible-for'].flatMap((d) =>
	readdirSync(join(root, 'src/pages', d)).filter((f) => f.endsWith('.astro')).map((f) => `src/pages/${d}/${f}`),
);

test('no stale availability claim on /bible-in/* or /bible-for/*', () => {
	const bad = pages.flatMap((f) => {
		const src = readFileSync(join(root, f), 'utf8');
		return [...rowViolations(src, f), ...proseViolations(src, f)];
	});
	assert.deepEqual(bad, [], `stale availability claims:\n${bad.join('\n')}`);
});

test('detector catches a stale row and stale prose (failure path)', () => {
	assert.equal(rowViolations(`{ language: 'Lingala', speakers: '40 million', status: 'Translation needed' },`, 'x').length, 1);
	assert.equal(rowViolations(`{ language: 'Oromo (Afaan Oromoo)', speakers: '37 million', status: 'Translation needed' },`, 'x').length, 1);
	assert.equal(rowViolations(`{ language: 'Korean (North)', speakers: '25 million', status: 'Translation needed' },`, 'x').length, 0);
	assert.equal(rowViolations(`{ language: 'Lingala', code: 'ln', speakers: '40 million' },`, 'x').length, 0);
	assert.equal(proseViolations('a Lingala edition is not yet available.', 'x').length, 1);
	assert.equal(proseViolations('Oromo and dozens more still waiting for a Bible', 'x').length, 1);
	assert.equal(proseViolations('Tigrinya and Oromo now published, and dozens more still waiting', 'x').length, 0);
	assert.equal(proseViolations('Vietnamese is the heart language — some people, with the highland peoples still waiting', 'x').length, 0);
	assert.equal(proseViolations('a Luo edition is not yet available.', 'x').length, 0);
});
