// The 80-language roster: every language Father's Heart Bible is being published in.
// Live = English + every edition in the registry + the read-online languages (receive.ts);
// upcoming = the rest of projects/fhb-language-cover-colours/roster.json, alphabetical:
// [name, flag iso code, primary region]. A language leaves `upcoming` the moment it is live,
// matched by LANGUAGE IDENTITY, not by code or exact label — the registry calls Greek "Modern
// Greek" and labels can carry a parenthesis (2026-10-27: Dutch, Hungarian, Nepali, Sundanese and
// Greek were counted twice on /legacy, 85 instead of 80, because only read-online languages were
// filtered out).
import { allLanguageEditions } from './language-editions';
import roster from './language-roster.json' with { type: 'json' };
import { LANGUAGE_TOTAL, readOnlyLanguages } from './receive';

// GENERATED, no longer typed (2026-10-30): the roster's own name, the language's primary-country
// flag and its place line, from src/data/language-roster.json (`fhb-chain.py edition-roster`).
const upcomingAll: [string, string, string][] = (
	roster.languages as {
		code: string;
		roster?: string;
		flag?: string | null;
		place?: string | null;
	}[]
)
	.filter((l) => l.code !== 'en')
	.map((l) => [l.roster ?? l.code, l.flag ?? '', l.place ?? ''] as [string, string, string])
	.sort((a, b) => a[0].localeCompare(b[0]));

/** "Modern Greek" -> "greek", "Persian (Farsi)" -> "persian": one key per language. */
const identity = (name: string) =>
	name
		.replace(/\s*\(.*\)/, '')
		.replace(/^Modern\s+/, '')
		.trim()
		.toLowerCase();

const LIVE_NAMES = [
	'English',
	...allLanguageEditions.map((l) => l.english),
	...readOnlyLanguages.map((r) => r.english),
];
const liveIds = new Set(LIVE_NAMES.map(identity));

/** Roster languages not yet live, alphabetical: [name, flag, region]. */
export const upcomingLanguages = upcomingAll.filter(([name]) => !liveIds.has(identity(name)));

/** The whole commitment (Kevin 2026-10-14: "let's just declare: 80 Languages"). */
export const ROSTER_TOTAL = LANGUAGE_TOTAL + upcomingLanguages.length;
