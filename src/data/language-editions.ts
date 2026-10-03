// FHB LANGUAGE print editions shown on /print and in the homepage's second cover marquee.
//
// ONLY editions whose press files are FINISHED are listed: interior + case + jacket +
// paperback + metadata sheet present in the language submission set (Drive
// 1faik2I_8shdwAi352TDaSUUtRI4-16jk). 22 as of 2026-10-03. A language whose covers are not
// delivered shows its DESIGNED front (design: true) — Kevin 2026-10-03 — and `ready: false`
// would hide an edition entirely. Kevin 2026-10-03: "Build marquee and /print for 26 languages" —
// the 22 complete + Arabic, Farsi, Urdu (right-to-left, being built) + Tangkhul (hold lifted,
// being built). Flip `ready` (and add its card art) as each cover is delivered.
//
// `name` is the edition's own name exactly as its record carries it
// (projects/fhb-print-bible/editions/<code>.json → edition_name), which is also the title
// printed on its cover. `english` is the submission set's folder name.
// Prices: the top table of every language metadata sheet lists US $99.99 hardback / $79.99
// paperback (22/22 read 2026-10-03).
// `amazon`: add a binding's URL only when its Amazon listing is LIVE; absent = the shared
// disabled placeholder (BuyControls). None is listed yet.
// Card art: FHB/print/lang/v1/lang-<code>-{360,600,1200}.webp, cut from each language's
// DELIVERED case PDF (md5-matched to the submission set) by
// projects/fhb-lang-covers/cards/build_lang_cards.py — the same house renderer as every
// other /print card.
export interface LanguageEdition {
	code: string;
	name: string;
	english: string;
	/** card line: "For " + the sheet's For box (fors.d/lang-<code>.json), as approved */
	sub: string;
	amazon?: { hardback?: string; paperback?: string };
	/** false = press files not delivered yet: counted in the 26, never shown. */
	ready?: boolean;
	/** card art is the edition's DESIGNED front (locked 74-cover set, language-bible-titles) because
	 *  its press cover is not delivered yet (Kevin 2026-10-03: use it meanwhile). Swap to the
	 *  delivered case PDF via build_lang_cards.py under a NEW R2 key when it lands. */
	design?: boolean;
	/** right-to-left script */
	rtl?: boolean;
}

export const LANG_HB = 99.99;
export const LANG_PB = 79.99;

// Alphabetical by English name, as the targeted editions are alphabetical on /print.
export const allLanguageEditions: LanguageEdition[] = [
	{
		code: 'ar',
		name: 'الكتاب المقدس العربي',
		english: 'Arabic',
		rtl: true,
		design: true,
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Arabic, born in Egypt, and from Lebanon, Syria, Jordan and Palestine',
	},
	{
		code: 'bn',
		name: 'বাংলা বাইবেল',
		english: 'Bengali',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Bengali, born in Bangladesh, and from West Bengal and Kolkata',
	},
	{
		code: 'yue',
		name: '廣東話聖經',
		english: 'Cantonese',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Cantonese, born in Hong Kong, from Macau, and from Guangzhou and Guangdong',
	},
	{
		code: 'fa',
		name: 'کتاب مقدس فارسی',
		english: 'Persian (Farsi)',
		rtl: true,
		design: true,
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Persian, born in Iran, Dari speakers of Afghanistan, and Iranian Americans',
	},
	{
		code: 'fil',
		name: 'Bibliyang Filipino',
		english: 'Filipino',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Filipino, born in the Philippines, and from Luzon, Visayas and Mindanao',
	},
	{
		code: 'fr',
		name: 'Bible Française',
		english: 'French',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking French, born in France, and Belgians, Swiss and Luxembourgers',
	},
	{
		code: 'de',
		name: 'Deutsche Bibel',
		english: 'German',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking German, born in Germany, Austrians, and German-speaking Swiss',
	},
	{
		code: 'hi',
		name: 'हिन्दी बाइबिल',
		english: 'Hindi',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Hindi, born in India, and from Uttar Pradesh, Bihar and Delhi',
	},
	{
		code: 'id',
		name: 'Alkitab Indonesia',
		english: 'Indonesian',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Indonesian, born in Indonesia, and Batak, Toraja and Minahasa families',
	},
	{
		code: 'it',
		name: 'Bibbia Italiana',
		english: 'Italian',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Italian, born in Italy, and Swiss Italians of Ticino',
	},
	{
		code: 'ja',
		name: '日本語聖書',
		english: 'Japanese',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Japanese, born in Japan, from Okinawa, and Japanese Americans (Nikkei)',
	},
	{
		code: 'ko',
		name: '한국어 성경',
		english: 'Korean',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Korean, born in Korea, Korean Americans, and Korean Canadians',
	},
	{
		code: 'mr',
		name: 'मराठी बायबल',
		english: 'Marathi',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Marathi, born in Maharashtra, and from Mumbai and Pune',
	},
	{
		code: 'pcm',
		name: 'Naija Bible',
		english: 'Nigerian Pidgin',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Pidgin, born in Nigeria, and from Lagos, Warri and Port Harcourt',
	},
	{
		code: 'pt',
		name: 'Bíblia Portuguesa',
		english: 'Portuguese',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Portuguese, born in Brazil, born in Portugal, and Angolans and Mozambicans',
	},
	{
		code: 'pa',
		name: 'ਪੰਜਾਬੀ ਬਾਈਬਲ',
		english: 'Punjabi',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Punjabi, born in Punjab, and from Amritsar, Jalandhar and Ludhiana',
	},
	{
		code: 'ru',
		name: 'Русская Библия',
		english: 'Russian',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Russian, born in Russia, Belarusians, and from Kazakhstan and Central Asia',
	},
	{
		code: 'es',
		name: 'Biblia Española',
		english: 'Spanish',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Spanish, born in Mexico, and from Central America and the Caribbean',
	},
	{
		code: 'sw',
		name: 'Biblia ya Kiswahili',
		english: 'Swahili',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Swahili, born in Kenya, born in Tanzania, and Ugandans',
	},
	{
		code: 'ta',
		name: 'தமிழ் பைபிள்',
		english: 'Tamil',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Tamil, born in Tamil Nadu or Puducherry, and Sri Lankan Tamils',
	},
	{
		code: 'nmf',
		name: 'Tangkhul Bible',
		english: 'Tangkhul',
		design: true,
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Tangkhul, born in Ukhrul, and from the villages of Ukhrul and Kamjong',
	},
	{
		code: 'te',
		name: 'తెలుగు బైబిల్',
		english: 'Telugu',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Telugu, born in Andhra Pradesh, and born in Telangana',
	},
	{
		code: 'zh-hant',
		name: '中文聖經',
		english: 'Traditional Chinese',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Chinese, born in Taiwan, from Hong Kong and Macau, and Taiwanese Americans',
	},
	{
		code: 'tr',
		name: 'Türkçe Kutsal Kitap',
		english: 'Turkish',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Turkish, born in Turkey, Turkish Cypriots, and Turks in Germany',
	},
	{
		code: 'ur',
		name: 'اردو بائبل',
		english: 'Urdu',
		rtl: true,
		design: true,
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Urdu, born in Pakistan, and from Lahore, Karachi and Islamabad',
	},
	{
		code: 'vi',
		name: 'Kinh Thánh Tiếng Việt',
		english: 'Vietnamese',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Vietnamese, born in Vietnam, and from Hanoi, Huế and Saigon',
	},
];

/** Every language edition (Kevin's 26), shown or not. */
export const LANGUAGE_EDITION_TOTAL = allLanguageEditions.length;
/** The editions with delivered covers — the only ones any page renders. */
export const languageEditions = allLanguageEditions.filter((l) => l.ready !== false);

/** URL/data slug for an edition's product page and look-inside: "spanish" → /bibles/spanish-bible/ */
export const langSlug = (l: LanguageEdition) =>
	l.english
		.replace(/\s*\(.*\)/, '')
		.toLowerCase()
		.replace(/[^a-z]+/g, '-');
