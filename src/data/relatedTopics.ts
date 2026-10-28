// Cross-links among the answer pages: /verses/<topic>, /meaning/<word>, /bible-for/<group>.
// Unit 6aq. ONE map drives the "Related" block rendered by <RelatedTopics> inside
// VerseCollection, WordMeaning and GroupBible, so no page hand-pastes these links.
// Keys and values are "v:<slug>" (/verses), "m:<slug>" (/meaning), "b:<slug>" (/bible-for).
// Rules: 2-4 links per page, only where the topics truly overlap, no link farms.
// Anchor text comes from each target's own registry title (verseTopics, wordMeanings, groups).
import { VERSE_TOPICS } from './verseTopics';
import { WORD_MEANINGS } from './wordMeanings';
import { GROUPS, FAITH_GROUPS } from './groups';

export const RELATED: Record<string, string[]> = {
	// /verses
	'v:advent': ['m:begotten', 'v:hope'],
	'v:anger': ['m:meek', 'v:patience', 'v:forgiveness', 'b:men'],
	'v:anxiety': ['v:peace', 'b:financial-hardship', 'b:cancer'],
	'v:comfort': ['b:grief', 'b:widows', 'b:cancer', 'm:forsake'],
	'v:faith': ['m:faith', 'v:hope'],
	'v:family': ['b:fathers', 'b:mothers', 'b:marriage', 'v:thanksgiving'],
	'v:forgiveness': ['m:grace', 'm:mercy', 'b:divorce', 'm:lords-prayer'],
	'v:friendship': ['b:singles', 'b:college-students'],
	'v:god-as-father': ['m:our-father', 'm:abba-father', 'm:fathers-heart-of-god', 'b:spiritually-curious'],
	'v:healing': ['b:cancer', 'b:addiction', 'b:family-caregivers'],
	'v:hope': ['b:grief', 'b:addiction', 'v:comfort'],
	'v:joy': ['v:thanksgiving', 'v:peace', 'b:worship-leaders'],
	'v:love': ['m:love', 'm:covenant', 'b:marriage'],
	'v:patience': ['b:new-parents', 'b:family-caregivers', 'm:meek'],
	'v:peace': ['v:anxiety', 'v:comfort', 'b:veterans'],
	'v:prayer': ['m:lords-prayer', 'm:our-father', 'm:hallowed-be-thy-name'],
	'v:strength': ['b:athletes', 'b:military', 'b:family-caregivers'],
	'v:thanksgiving': ['v:joy', 'v:family', 'b:worship-leaders'],

	// /meaning
	'm:abba-father': ['m:our-father', 'v:god-as-father', 'v:prayer'],
	'm:abide': ['m:love', 'm:faith'],
	'm:begotten': ['m:our-father', 'm:abba-father', 'v:advent'],
	'm:consecrate': ['m:sanctified', 'm:hallowed-be-thy-name'],
	'm:conviction': ['m:righteousness', 'm:grace', 'v:forgiveness'],
	'm:covenant': ['m:love', 'm:grace', 'b:marriage', 'b:jews'],
	'm:faith': ['v:faith', 'm:righteousness', 'm:grace'],
	'm:fathers-heart-of-god': ['m:our-father', 'm:abba-father', 'v:god-as-father', 'b:fathers'],
	'm:folly': ['m:wisdom', 'b:leaders'],
	'm:forsake': ['v:comfort', 'b:grief', 'v:god-as-father'],
	'm:grace': ['v:forgiveness', 'm:mercy', 'm:faith', 'm:covenant'],
	'm:hallowed-be-thy-name': ['m:lords-prayer', 'm:our-father', 'v:prayer', 'm:consecrate'],
	'm:lords-prayer': ['m:hallowed-be-thy-name', 'm:our-father', 'v:prayer', 'v:forgiveness'],
	'm:love': ['v:love', 'm:covenant', 'm:mercy', 'b:marriage'],
	'm:meek': ['v:anger', 'v:patience', 'm:righteousness'],
	'm:mercy': ['v:forgiveness', 'm:grace', 'm:covenant', 'b:muslims'],
	'm:our-father': ['m:abba-father', 'm:hallowed-be-thy-name', 'v:god-as-father', 'v:prayer'],
	'm:propitiation': ['m:grace', 'm:mercy', 'v:forgiveness'],
	'm:righteousness': ['m:faith', 'm:grace', 'm:conviction'],
	'm:sanctified': ['m:consecrate', 'm:hallowed-be-thy-name', 'm:righteousness'],
	'm:selah': ['v:prayer', 'v:peace', 'b:jews'],
	'm:sheol': ['b:grief', 'v:hope', 'v:comfort'],
	'm:ten-commandments': ['m:covenant', 'm:righteousness', 'v:family', 'b:jews'],
	'm:wisdom': ['m:folly', 'b:leaders', 'b:teachers'],

	// /bible-for
	'b:addiction': ['v:healing', 'v:hope', 'v:strength'],
	'b:athletes': ['v:strength', 'v:patience'],
	'b:buddhists': ['m:our-father', 'm:fathers-heart-of-god', 'v:peace'],
	'b:cancer': ['v:healing', 'v:comfort', 'v:faith', 'v:hope'],
	'b:catholics': ['m:lords-prayer', 'm:hallowed-be-thy-name', 'v:prayer'],
	'b:children': ['v:family', 'v:god-as-father', 'v:joy'],
	'b:childrens-ministry': ['v:family', 'v:joy', 'v:faith'],
	'b:church-staff': ['v:prayer', 'm:wisdom', 'v:patience'],
	'b:college-students': ['v:friendship', 'v:faith', 'm:wisdom', 'v:anxiety'],
	'b:divorce': ['v:forgiveness', 'v:comfort', 'v:healing', 'v:hope'],
	'b:doctors': ['v:healing', 'v:strength', 'm:wisdom'],
	'b:family-caregivers': ['v:patience', 'v:strength', 'v:healing', 'v:comfort'],
	'b:fathers': ['v:family', 'v:god-as-father', 'm:fathers-heart-of-god', 'm:abba-father'],
	'b:financial-hardship': ['v:anxiety', 'v:peace', 'v:faith'],
	'b:first-responders': ['v:strength', 'v:peace', 'v:comfort'],
	'b:graduates': ['m:wisdom', 'v:faith', 'v:strength'],
	'b:grief': ['v:comfort', 'v:hope', 'm:sheol', 'm:forsake'],
	'b:high-schoolers': ['v:friendship', 'v:anxiety', 'v:faith', 'm:wisdom'],
	'b:hindus': ['m:our-father', 'm:fathers-heart-of-god', 'v:god-as-father'],
	'b:husbands': ['v:love', 'v:family', 'v:patience', 'm:covenant'],
	'b:incarcerated': ['v:forgiveness', 'v:hope', 'm:grace'],
	'b:jews': ['m:covenant', 'm:ten-commandments', 'm:selah'],
	'b:kids': ['v:family', 'v:joy', 'v:god-as-father'],
	'b:leaders': ['m:wisdom', 'm:folly', 'v:strength', 'v:prayer'],
	'b:marriage': ['v:love', 'v:family', 'm:covenant', 'v:forgiveness'],
	'b:men': ['v:strength', 'v:anger', 'v:god-as-father'],
	'b:middle-schoolers': ['v:friendship', 'v:anxiety', 'v:faith'],
	'b:military': ['v:strength', 'v:peace', 'v:comfort'],
	'b:mothers': ['v:family', 'v:patience', 'v:peace'],
	'b:muslims': ['m:our-father', 'm:fathers-heart-of-god', 'm:mercy'],
	'b:new-parents': ['v:patience', 'v:family', 'v:anxiety'],
	'b:nurses': ['v:healing', 'v:comfort', 'v:strength', 'v:patience'],
	'b:pastors': ['v:prayer', 'm:wisdom', 'v:strength'],
	'b:sikhs': ['m:our-father', 'm:fathers-heart-of-god', 'v:god-as-father'],
	'b:singles': ['v:friendship', 'v:hope', 'v:love'],
	'b:spiritually-curious': ['v:god-as-father', 'm:our-father', 'v:faith', 'm:fathers-heart-of-god'],
	'b:student-ministry': ['v:friendship', 'v:faith', 'm:wisdom'],
	'b:teachers': ['v:patience', 'm:wisdom', 'v:strength'],
	'b:teenagers': ['v:friendship', 'v:anxiety', 'v:faith'],
	'b:veterans': ['v:peace', 'v:healing', 'v:comfort'],
	'b:widows': ['v:comfort', 'v:hope', 'v:peace'],
	'b:wives': ['v:love', 'v:family', 'v:patience'],
	'b:women': ['v:strength', 'v:faith', 'v:peace'],
	'b:work': ['v:strength', 'm:wisdom', 'v:anxiety'],
	'b:worship-leaders': ['v:prayer', 'v:joy', 'v:thanksgiving', 'm:selah'],
};

export interface RelatedLink {
	href: string;
	label: string;
}

const ALL_GROUPS = [...GROUPS, ...FAITH_GROUPS];

function resolve(key: string): RelatedLink | null {
	const [kind, slug] = [key.slice(0, 1), key.slice(2)];
	if (kind === 'v') {
		const t = VERSE_TOPICS.find((x) => x.slug === slug);
		return t ? { href: `/verses/${slug}/`, label: t.title } : null;
	}
	if (kind === 'm') {
		const w = WORD_MEANINGS.find((x) => x.slug === slug);
		return w ? { href: `/meaning/${slug}/`, label: w.title } : null;
	}
	const g = ALL_GROUPS.find((x) => x.slug === slug);
	return g ? { href: `/bible-for/${slug}/`, label: `Bible verses for ${g.group.toLowerCase()}` } : null;
}

/** Related links for a page. kind: 'v' | 'm' | 'b'. Missing targets are skipped, never emitted broken. */
export function relatedFor(kind: 'v' | 'm' | 'b', slug: string): RelatedLink[] {
	return (RELATED[`${kind}:${slug}`] ?? [])
		.map(resolve)
		.filter((x): x is RelatedLink => x !== null)
		.slice(0, 4);
}
