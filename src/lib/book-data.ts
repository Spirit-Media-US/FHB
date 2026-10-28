// Shared book data for /books-of-the-bible/, /old-testament/ and /new-testament/.
// Extracted unchanged from books-of-the-bible.astro (2026-10-28) so the three pages cannot drift.
// Summaries: FHB book summaries (same file the /read app shows); order + chapters: bible_structure.json.
import { readFileSync } from 'node:fs';
import structure from './bible_structure.json';

export const SUMMARIES_PATH =
	'/home/deploy/bin/tools-api/pipelines/translation/output/book_summaries/en.json';
const summaries: Record<string, string> = JSON.parse(readFileSync(SUMMARIES_PATH, 'utf8'));

export const READ = 'https://fathersheartbible.com/read';
export const slugOf = (b: string) => b.toLowerCase().replace(/\s+/g, '-');

// The traditional groupings most English Bibles print in their contents page.
export const GROUPS: { testament: 'OT' | 'NT'; name: string; first: string; last: string }[] = [
	{
		testament: 'OT',
		name: 'The Law (the Five Books of Moses)',
		first: 'Genesis',
		last: 'Deuteronomy',
	},
	{ testament: 'OT', name: 'History', first: 'Joshua', last: 'Esther' },
	{ testament: 'OT', name: 'Poetry and Wisdom', first: 'Job', last: 'Song of Solomon' },
	{ testament: 'OT', name: 'The Major Prophets', first: 'Isaiah', last: 'Daniel' },
	{ testament: 'OT', name: 'The Minor Prophets', first: 'Hosea', last: 'Malachi' },
	{ testament: 'NT', name: 'The Gospels', first: 'Matthew', last: 'John' },
	{ testament: 'NT', name: 'History', first: 'Acts', last: 'Acts' },
	{ testament: 'NT', name: 'Paul’s Letters', first: 'Romans', last: 'Philemon' },
	{ testament: 'NT', name: 'The General Letters', first: 'Hebrews', last: 'Jude' },
	{ testament: 'NT', name: 'Prophecy', first: 'Revelation', last: 'Revelation' },
];
export const order: string[] = structure.order;
export const chapters = structure.chapters as Record<string, number>;
export const groups = GROUPS.map((g) => {
	const books = order.slice(order.indexOf(g.first), order.indexOf(g.last) + 1).map((b) => {
		const summary = summaries[b];
		if (!summary) throw new Error(`book-data: no FHB summary for ${b} in ${SUMMARIES_PATH}`);
		return { name: b, slug: slugOf(b), chapters: chapters[b], summary, n: order.indexOf(b) + 1 };
	});
	return { ...g, books };
});
export const OT = groups.filter((g) => g.testament === 'OT');
export const NT = groups.filter((g) => g.testament === 'NT');
const count = (gs: typeof groups) => gs.reduce((s, g) => s + g.books.length, 0);
if (count(OT) !== 39 || count(NT) !== 27)
	throw new Error('book-data: grouping does not cover 39 + 27 books');
export const TOTAL_CHAPTERS = order.reduce((s, b) => s + chapters[b], 0);

/** Verbatim FHB verse text from the locked canon (community content). Throws if absent. */
export function fhbVerse(book: string, chapter: number, verse: number): string {
	const f = `/srv/sites/community/src/content/bible/${slugOf(book)}/${String(chapter).padStart(3, '0')}.json`;
	const d = JSON.parse(readFileSync(f, 'utf8'));
	const v = d.verses.find((x: { verse: number }) => x.verse === verse);
	if (!v) throw new Error(`book-data: no ${book} ${chapter}:${verse} in ${f}`);
	return v.text as string;
}
