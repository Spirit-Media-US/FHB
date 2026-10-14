// ONE SOURCE for "speakers of language X worldwide": src/data/language-reach.json
// (first + second language, by edition code, `en` included). Every speaker count a page
// prints comes through here, so the country pages, the hub and /print cannot drift apart
// again (Kevin 2026-10-13: the site is accurate and consistent throughout).
//
// Kevin's metric: total speakers of each language worldwide. A sum is a plain sum — a person
// who speaks two of our languages is counted in both — so it may pass world population and
// is NEVER shown as a share of humanity. Once a sum reaches WORLD we say the world is
// covered and stop.
//
// Country populations, Christian shares, diaspora counts and speakers WITHIN a country
// ("42 million speak Spanish at home in the United States") are different facts and stay
// typed on their pages.
import reach from './language-reach.json' with { type: 'json' };

const SPEAKERS = reach.speakers as Record<string, number>;

export const WORLD: number = reach.WORLD;

/** True when the json carries a worldwide figure for this edition code. */
export const hasSpeakers = (code: string) => code in SPEAKERS;

/** Worldwide speakers of one language, or the plain sum over several codes. */
export function speakersOf(...codes: string[]): number {
	let total = 0;
	for (const code of codes) {
		if (!hasSpeakers(code)) throw new Error(`language-speakers: no speakers figure for "${code}"`);
		total += SPEAKERS[code];
	}
	return total;
}

/** 1,493,000,000 → "1.5 billion" · 258,000,000 → "258 million" · 8,500,000 → "8.5 million"
 *  · 209,060 → "209,000". */
export function formatSpeakers(n: number): string {
	if (n >= 999_500_000) return `${(n / 1e9).toFixed(1)} billion`;
	if (n >= 10_000_000) return `${Math.round(n / 1e6)} million`;
	if (n >= 1_000_000) return `${(n / 1e6).toFixed(1)} million`;
	return (Math.round(n / 1e3) * 1e3).toLocaleString('en-US');
}

/** "258 million" for one code; the summed figure for several (Mandarin = zh-hans + zh-hant). */
export const speakersLabel = (...codes: string[]) => formatSpeakers(speakersOf(...codes));

/** The summed-speakers phrase for a set of languages: "spoken by 7.5 billion people", or
 *  "covering the world" once the sum reaches world population. */
export function reachPhrase(codes: string[]): string {
	const total = speakersOf(...codes);
	return total >= WORLD ? 'covering the world' : `spoken by ${formatSpeakers(total)} people`;
}
