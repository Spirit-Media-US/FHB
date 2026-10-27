// The 80-language roster: every language Father's Heart Bible is being published in.
// Live = English + every edition in the registry + the read-online languages (receive.ts);
// upcoming = the rest of projects/fhb-language-cover-colours/roster.json, alphabetical:
// [name, flag iso code, primary region]. A language leaves `upcoming` the moment it is live,
// matched by LANGUAGE IDENTITY, not by code or exact label — the registry calls Greek "Modern
// Greek" and labels can carry a parenthesis (2026-10-27: Dutch, Hungarian, Nepali, Sundanese and
// Greek were counted twice on /legacy, 85 instead of 80, because only read-online languages were
// filtered out).
import { allLanguageEditions } from './language-editions';
import { LANGUAGE_TOTAL, readOnlyLanguages } from './receive';

const upcomingAll: [string, string, string][] = [
	['Afrikaans', 'za', 'South Africa'],
	['Anaang', 'ng', 'Nigeria'],
	['Azerbaijani (South)', 'ir', 'Iran'],
	['Greek', 'gr', 'Greece'],
	['Gujarati', 'in', 'India'],
	['Hausa', 'ng', 'Nigeria & West Africa'],
	['Hiligaynon', 'ph', 'Philippines'],
	['Haitian Creole', 'ht', 'Haiti'],
	['Hungarian', 'hu', 'Hungary'],
	['Igbo', 'ng', 'Nigeria'],
	['Izon', 'ng', 'Nigeria'],
	['Ilocano', 'ph', 'Philippines'],
	['Javanese', 'id', 'Indonesia'],
	['Gikuyu', 'ke', 'Kenya'],
	['Kurdish (Kurmanji)', 'tr', 'Türkiye, Syria & Iraq'],
	['Kannada', 'in', 'India'],
	['Kituba', 'cd', 'DR Congo & Congo'],
	['Mangbetu', 'cd', 'DR Congo'],
	['Malagasy', 'mg', 'Madagascar'],
	['Malayalam', 'in', 'India'],
	['Malay', 'my', 'Malaysia'],
	['Burmese', 'mm', 'Myanmar'],
	['Nagamese', 'in', 'Northeast India'],
	['Nepali', 'np', 'Nepal'],
	['Inpui Naga', 'in', 'Northeast India'],
	['Dutch', 'nl', 'Netherlands & Belgium'],
	['Chokri Naga', 'in', 'Northeast India'],
	['Chichewa', 'mw', 'Malawi'],
	['Oromo', 'et', 'Ethiopia'],
	['Odia', 'in', 'India'],
	['Pashto', 'af', 'Afghanistan & Pakistan'],
	['Kirundi', 'bi', 'Burundi'],
	['Kinyarwanda', 'rw', 'Rwanda'],
	['Sindhi', 'pk', 'Pakistan'],
	['Sena', 'mz', 'Mozambique'],
	['Kipsigis', 'ke', 'Kenya'],
	['Shona', 'zw', 'Zimbabwe'],
	['Somali', 'so', 'Somalia'],
	['Sundanese', 'id', 'Indonesia'],
	['Thai', 'th', 'Thailand'],
	['Tigrinya', 'er', 'Eritrea & Ethiopia'],
	['Akan (Twi)', 'gh', 'Ghana'],
	['Uzbek', 'uz', 'Uzbekistan'],
	['Xhosa', 'za', 'South Africa'],
	['Yaka', 'cd', 'DR Congo'],
].sort((a, b) => a[0].localeCompare(b[0])) as [string, string, string][];

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
