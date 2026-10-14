// WHO THIS BIBLE IS FOR + EVERY WAY TO RECEIVE IT — one source for the link blocks on Home,
// About and Leadership, and for the JSON-LD that mirrors them (ItemList of audience editions,
// ItemList of languages, the audio series). Kevin 2026-10-13: surface FHB for the generic
// Bible searches of people who do not know it yet.
//
// Nothing here is a count or a speaker figure: editions come from dvc-editions.ts, languages
// from language-editions.ts (the generated registry), speakers from language-speakers.ts and
// store links from digital-listings.json. What IS typed here is the generic search phrase for
// each audience edition ("Bible for men") and the audience page that goes with it.
import { FIRST_ORDER_PCT } from '../lib/order-pricing';
import digital from './digital-listings.json' with { type: 'json' };
import { dvcEditions } from './dvc-editions';
import { allLanguageEditions, LANGUAGE_EDITION_TOTAL, langSlug } from './language-editions';
import { hasSpeakers, speakersOf } from './language-speakers';

const SITE = 'https://fathersheartbible.com';

// ── Who this Bible is for ──────────────────────────────────────────────────────────────
// slug → [generic phrase, audience page under /bible-for/ where one exists].
// An edition added to dvc-editions.ts without a row here still renders, under its own title.
const GENERIC: Record<string, [string, string?]> = {
	athletes: ['Bible for athletes', 'athletes'],
	chosen: ['Bible for the fatherless & foster youth'],
	couples: ['Bible for couples', 'marriage'],
	dads: ['Bible for dads', 'fathers'],
	'first-responders': ['Bible for first responders', 'first-responders'],
	graduates: ['Bible for graduates', 'graduates'],
	grandparents: ['Bible for grandparents'],
	intercessors: ['Bible for intercessors'],
	mens: ['Bible for men', 'men'],
	moms: ['Bible for moms', 'mothers'],
	nurses: ['Bible for nurses', 'nurses'],
	pastors: ['Bible for pastors', 'pastors'],
	peace: ['Bible for anxiety & depression'],
	presidents: ['Bible for leaders', 'leaders'],
	recovery: ['Bible for addiction recovery', 'addiction'],
	seekers: ['Bible for seekers & skeptics', 'spiritually-curious'],
	seventeen: ['Bible for 17-year-olds', 'high-schoolers'],
	soldiers: ['Bible for soldiers', 'military'],
	teachers: ['Bible for teachers', 'teachers'],
	teen: ['Bible for teens', 'teenagers'],
	womens: ['Bible for women', 'women'],
	'worship-leaders': ['Bible for worship leaders', 'worship-leaders'],
	journaling: ['Journaling Bible for women'],
};

export interface AudienceLink {
	slug: string;
	/** generic search phrase — the link text */
	label: string;
	/** the edition's own name */
	edition: string;
	/** product page */
	href: string;
	/** free verses + encouragement page for the same audience, where one exists */
	versesHref?: string;
}

export const audienceLinks: AudienceLink[] = dvcEditions.map((e) => {
	const [label, page] = GENERIC[e.slug] ?? [e.title];
	return {
		slug: e.slug,
		label,
		edition: e.title,
		href: `/bibles/${e.slug}-bible/`,
		...(page ? { versesHref: `/bible-for/${page}/` } : {}),
	};
});

// Audience pages that share an edition with the page named in GENERIC above.
const ALSO: Record<string, string> = {
	husbands: 'mens',
	wives: 'womens',
	'middle-schoolers': 'teen',
	'college-students': 'graduates',
	veterans: 'soldiers',
	'church-staff': 'pastors',
};

/** The audience edition that goes with a /bible-for/<page>/ page, if one was made for it. */
export function editionForAudiencePage(page: string): AudienceLink | undefined {
	return (
		audienceLinks.find((a) => a.versesHref === `/bible-for/${page}/`) ??
		audienceLinks.find((a) => a.slug === ALSO[page])
	);
}

export { AUDIENCE_EDITION_TOTAL } from './dvc-editions';

/** English + every language edition in the registry. */
export const LANGUAGE_TOTAL = LANGUAGE_EDITION_TOTAL + 1;

// ── Languages ──────────────────────────────────────────────────────────────────────────
// Each language is free to read at /read/<code>/ and has a print edition page (coming-soon
// editions have no product page yet).
export const languageLinks = allLanguageEditions.map((l) => ({
	code: l.code,
	name: l.english,
	readHref: `/read/${l.code}/`,
	printHref: l.soon ? undefined : `/bibles/${langSlug(l)}-bible/`,
}));

/** The n most widely spoken of our languages, by the worldwide figures in language-reach.json. */
export const topLanguages = (n: number) =>
	[...allLanguageEditions]
		.filter((l) => hasSpeakers(l.code))
		.sort((a, b) => speakersOf(b.code) - speakersOf(a.code))
		.slice(0, n)
		.map((l) => l.english.replace(/\s*\(.*\)/, ''));

// ── Every way to hear His voice ────────────────────────────────────────────────────────────
export const AUDIO = {
	page: '/audio-bible',
	feed: `${SITE}/audio-bible/feed.xml`,
	spotify: 'https://open.spotify.com/show/4JY5TXhYE5vM6vhgxebsmY',
	apple: 'https://podcasts.apple.com/us/podcast/id6818374650',
	youtube: 'https://www.youtube.com/@FathersHeartBible',
};

export interface WayLink {
	label: string;
	href: string;
	external?: boolean;
}
export interface Way {
	key: string;
	title: string;
	note: string;
	links: WayLink[];
}

const store = (list: { store: string; url: string; label?: string }[]): WayLink[] =>
	list.filter((d) => !d.label).map((d) => ({ label: d.store, href: d.url, external: true }));

export const ways: Way[] = [
	{
		key: 'read',
		title: 'Read free',
		note: 'The whole Bible online, Genesis to Revelation.',
		links: [{ label: 'Read the Bible online', href: '/read/' }],
	},
	{
		key: 'listen',
		title: 'Listen free',
		note: 'The audio Bible, every chapter.',
		links: [
			{ label: 'Audio Bible', href: AUDIO.page },
			{ label: 'Spotify', href: AUDIO.spotify, external: true },
			{ label: 'Apple Podcasts', href: AUDIO.apple, external: true },
			{ label: 'YouTube', href: AUDIO.youtube, external: true },
		],
	},
	{
		key: 'print',
		title: 'Print',
		note: `Hardcover and paperback, in Divine Voice Color. ${FIRST_ORDER_PCT}% off your first order.`,
		links: [
			{ label: 'All print editions', href: '/print/' },
			{ label: 'Large Print Bible', href: '/bibles/lp-set-bible/' },
			{ label: 'Journaling Bible', href: '/bibles/journaling-bible/' },
		],
	},
	{
		key: 'ebook',
		title: 'eBook',
		note: 'The complete Bible on your reader.',
		links: [{ label: 'eBook editions', href: '/print/#ebook' }, ...store(digital.en.ebook)],
	},
	{
		key: 'audiobook',
		title: 'Audiobook',
		note: 'The complete Bible, narrated.',
		links: store(digital.en.audiobook),
	},
	{
		key: 'languages',
		title: `${LANGUAGE_TOTAL} languages`,
		note: 'Each in print and free to read online.',
		links: [{ label: 'Language editions', href: '/print/#language-editions' }],
	},
].filter((w) => w.links.length > 0);

// ── Well-known passages and the hubs (compact reader links) ────────────────────────────
export const passages: WayLink[] = [
	{ label: 'Genesis 1', href: '/read/genesis/1/' },
	{ label: 'Psalm 23', href: '/read/psalms/23/' },
	{ label: 'Psalm 91', href: '/read/psalms/91/' },
	{ label: 'Matthew 6', href: '/read/matthew/6/' },
	{ label: 'John 3', href: '/read/john/3/' },
	{ label: 'Romans 8', href: '/read/romans/8/' },
	{ label: '1 Corinthians 13', href: '/read/1-corinthians/13/' },
];
export const hubs: WayLink[] = [
	{ label: 'Bible reading guides', href: '/guides/' },
	{ label: 'Bible verses by topic', href: '/verses/' },
	{ label: 'Bible word meanings', href: '/meaning/' },
	{ label: 'A Bible for every season', href: '/bible-for/' },
	{ label: 'The Bible by country', href: '/bible-in/' },
];

// ── JSON-LD that mirrors the blocks above ──────────────────────────────────────────────
const abs = (href: string) => (href.startsWith('http') ? href : `${SITE}${href}`);

/** The translation entity defined in full on /the-fathers-heart-bible/. */
export const BOOK_ID = `${SITE}/#book`;

export const audienceItemList = {
	'@type': 'ItemList',
	'@id': `${SITE}/#audience-editions`,
	name: "Father's Heart Bible™ audience editions",
	numberOfItems: audienceLinks.length,
	itemListElement: audienceLinks.map((a, i) => ({
		'@type': 'ListItem',
		position: i + 1,
		name: `${a.label} — ${a.edition}`,
		url: abs(a.href),
	})),
};

export const languageItemList = {
	'@type': 'ItemList',
	'@id': `${SITE}/#languages`,
	name: "Father's Heart Bible™ languages",
	numberOfItems: languageLinks.length + 1,
	itemListElement: [{ name: 'English', readHref: '/read/' }, ...languageLinks].map((l, i) => ({
		'@type': 'ListItem',
		position: i + 1,
		name: `Bible in ${l.name}`,
		url: abs(l.readHref),
	})),
};

export const audioSeries = {
	'@type': 'PodcastSeries',
	'@id': `${SITE}/audio-bible#series`,
	// name + description are the podcast feed's own (audio-bible/feed.xml)
	name: "Father's Heart Bible™ — Audio Bible",
	description:
		"The complete Father's Heart Bible™ audio Bible, free: all 66 books, 1,189 chapters, Genesis to Revelation.",
	url: abs(AUDIO.page),
	webFeed: AUDIO.feed,
	inLanguage: 'en',
	isBasedOn: { '@id': BOOK_ID },
	publisher: { '@id': 'https://spiritmediapublishing.com/#organization' },
	sameAs: [AUDIO.spotify, AUDIO.apple, AUDIO.youtube],
};
