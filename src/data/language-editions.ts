// FHB LANGUAGE print editions shown on /print and in the homepage's second cover marquee.
//
// ONLY editions whose press files are FINISHED are listed: interior + case + jacket +
// paperback + metadata sheet present in the language submission set (Drive
// 1faik2I_8shdwAi352TDaSUUtRI4-16jk). 22 as of 2026-10-03. A language whose covers are not
// delivered shows its DESIGNED front (design: true) — Kevin 2026-10-03 — and `ready: false`
// would hide an edition entirely. Kevin 2026-10-03: "Build marquee and /print for 26 languages" —
// the 22 complete + Arabic, Farsi, Urdu (right-to-left, being built) + Tangkhul (hold lifted,
// being built). Flip `ready` (and add its card art) as each cover is delivered.
// Kevin 2026-10-07: "all 33 languages" = the 31 live in the reader + Amharic and Zulu, which
// are `soon: true` — counted and named as coming soon, but no card, page or order form until
// their covers and interiors are BUILT (cover rule 2026-10-06: never a designed front). Every
// shown card is now cut from its built case (lang/v2 for ar fa ur nmf + the five added
// 2026-10-07: ceb pl zh-hans uk yo).
//
// `name` is the edition's own name exactly as its record carries it
// (projects/fhb-print-bible/editions/<code>.json → edition_name), which is also the title
// printed on its cover. `english` is the submission set's folder name.
// Prices: the top table of every language metadata sheet lists US $99.99 hardback / $79.99
// paperback (22/22 read 2026-10-03).
// `amazon`: add a binding's URL only when its Amazon listing is LIVE; absent = the shared
// disabled placeholder (BuyControls). 2026-10-07: looked up by each binding's ISBN-13
// (amazon-search.mjs, sequential) and kept only where the hit's title names the language AND
// the binding — 25 languages live, some in one binding only (fil PB; fr de sw HB); ceb pl
// zh-hans uk ur yo not on Amazon yet. ASINs are the /dp/ ids.
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
	/** coming soon (Kevin 2026-10-07): counted in the 33 and named, never given a card, page or
	 *  order form — no built cover or interior yet. Drop it when both land. */
	soon?: boolean;
	/** right-to-left script */
	rtl?: boolean;
}

export const LANG_HB = 99.99;
export const LANG_PB = 79.99;

// Alphabetical by English name, as the targeted editions are alphabetical on /print.
export const allLanguageEditions: LanguageEdition[] = [
	{
		code: 'am',
		name: 'የአማርኛ መጽሐፍ ቅዱስ',
		english: 'Amharic',
		soon: true,
		sub: 'For Amharic-speaking families, churches across Ethiopia, believers in Addis Ababa, and Ethiopian evangelical congregations',
	},
	{
		code: 'ar',
		name: 'الكتاب المقدس العربي',
		english: 'Arabic',
		rtl: true,
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM5ND4V3',
			paperback: 'https://www.amazon.com/dp/B0HM5GZDW7',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Arabic, born in Egypt, and from Lebanon, Syria, Jordan and Palestine',
	},
	{
		code: 'bn',
		name: 'বাংলা বাইবেল',
		english: 'Bengali',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM54D5N9',
			paperback: 'https://www.amazon.com/dp/B0HM53PFTY',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Bengali, born in Bangladesh, and from West Bengal and Kolkata',
	},
	{
		code: 'yue',
		name: '廣東話聖經',
		english: 'Cantonese',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM57DD2C',
			paperback: 'https://www.amazon.com/dp/B0HM53Q6ZG',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Cantonese, born in Hong Kong, from Macau, and from Guangzhou and Guangdong',
	},
	{
		code: 'ceb',
		name: 'Cebuano nga Bibliya',
		english: 'Cebuano',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Cebuano, born in Cebu, Bohol and Negros, and from the Visayas and Mindanao',
	},
	{
		code: 'fil',
		name: 'Bibliyang Filipino',
		english: 'Filipino',
		amazon: { paperback: 'https://www.amazon.com/dp/B0HM1Z4Q4Q' },
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Filipino, born in the Philippines, and from Luzon, Visayas and Mindanao',
	},
	{
		code: 'fr',
		name: 'Bible Française',
		english: 'French',
		amazon: { hardback: 'https://www.amazon.com/dp/B0HM239RY6' },
		sub: 'For Beloved Sons and Daughters Worldwide Speaking French, born in France, and Belgians, Swiss and Luxembourgers',
	},
	{
		code: 'de',
		name: 'Deutsche Bibel',
		english: 'German',
		amazon: { hardback: 'https://www.amazon.com/dp/B0HM1YZLJB' },
		sub: 'For Beloved Sons and Daughters Worldwide Speaking German, born in Germany, Austrians, and German-speaking Swiss',
	},
	{
		code: 'hi',
		name: 'हिन्दी बाइबिल',
		english: 'Hindi',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM69LYLQ',
			paperback: 'https://www.amazon.com/dp/B0HM6GLGNS',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Hindi, born in India, and from Uttar Pradesh, Bihar and Delhi',
	},
	{
		code: 'id',
		name: 'Alkitab Indonesia',
		english: 'Indonesian',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM1QR5NW',
			paperback: 'https://www.amazon.com/dp/B0HM1P12LK',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Indonesian, born in Indonesia, and Batak, Toraja and Minahasa families',
	},
	{
		code: 'it',
		name: 'Bibbia Italiana',
		english: 'Italian',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM387933',
			paperback: 'https://www.amazon.com/dp/B0HM33JN8Y',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Italian, born in Italy, and Swiss Italians of Ticino',
	},
	{
		code: 'ja',
		name: '日本語聖書',
		english: 'Japanese',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM4X3JM2',
			paperback: 'https://www.amazon.com/dp/B0HM56F116',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Japanese, born in Japan, from Okinawa, and Japanese Americans (Nikkei)',
	},
	{
		code: 'ko',
		name: '한국어 성경',
		english: 'Korean',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM6VPTFX',
			paperback: 'https://www.amazon.com/dp/B0HM5YJQPG',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Korean, born in Korea, Korean Americans, and Korean Canadians',
	},
	{
		code: 'mr',
		name: 'मराठी बायबल',
		english: 'Marathi',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM6FDWVW',
			paperback: 'https://www.amazon.com/dp/B0HM6HLXV6',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Marathi, born in Maharashtra, and from Mumbai and Pune',
	},
	{
		code: 'pcm',
		name: 'Naija Bible',
		english: 'Nigerian Pidgin',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM38RN6M',
			paperback: 'https://www.amazon.com/dp/B0HM2MS4GS',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Pidgin, born in Nigeria, and from Lagos, Warri and Port Harcourt',
	},
	{
		code: 'fa',
		name: 'کتاب مقدس فارسی',
		english: 'Persian (Farsi)',
		rtl: true,
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM4WRFQT',
			paperback: 'https://www.amazon.com/dp/B0HM5DNX39',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Persian, born in Iran, Dari speakers of Afghanistan, and Iranian Americans',
	},
	{
		code: 'pl',
		name: 'Polska Biblia',
		english: 'Polish',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Polish, born in Poland, and Polish families in Britain and Ireland',
	},
	{
		code: 'pt',
		name: 'Bíblia Portuguesa',
		english: 'Portuguese',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM24TLT9',
			paperback: 'https://www.amazon.com/dp/B0HM21ZRF3',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Portuguese, born in Brazil, born in Portugal, and Angolans and Mozambicans',
	},
	{
		code: 'pa',
		name: 'ਪੰਜਾਬੀ ਬਾਈਬਲ',
		english: 'Punjabi',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM6HKNQ3',
			paperback: 'https://www.amazon.com/dp/B0HM72KLJL',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Punjabi, born in Punjab, and from Amritsar, Jalandhar and Ludhiana',
	},
	{
		code: 'ru',
		name: 'Русская Библия',
		english: 'Russian',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM21ZRDD',
			paperback: 'https://www.amazon.com/dp/B0HM259JBV',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Russian, born in Russia, Belarusians, and from Kazakhstan and Central Asia',
	},
	{
		code: 'zh-hans',
		name: '中文圣经',
		english: 'Simplified Chinese',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Simplified Chinese, born in Mainland China, and from Singapore and Malaysia',
	},
	{
		code: 'es',
		name: 'Biblia Española',
		english: 'Spanish',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM1PD5LK',
			paperback: 'https://www.amazon.com/dp/B0HM276R43',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Spanish, born in Mexico, and from Central America and the Caribbean',
	},
	{
		code: 'sw',
		name: 'Biblia ya Kiswahili',
		english: 'Swahili',
		amazon: { hardback: 'https://www.amazon.com/dp/B0HM25FNDG' },
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Swahili, born in Kenya, born in Tanzania, and Ugandans',
	},
	{
		code: 'ta',
		name: 'தமிழ் பைபிள்',
		english: 'Tamil',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM78HLDF',
			paperback: 'https://www.amazon.com/dp/B0HM692BHJ',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Tamil, born in Tamil Nadu or Puducherry, and Sri Lankan Tamils',
	},
	{
		code: 'nmf',
		name: 'Tangkhul Bible',
		english: 'Tangkhul',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM6VYQPD',
			paperback: 'https://www.amazon.com/dp/B0HM63G3QJ',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Tangkhul, born in Ukhrul, and from the villages of Ukhrul and Kamjong',
	},
	{
		code: 'te',
		name: 'తెలుగు బైబిల్',
		english: 'Telugu',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM2PGT5F',
			paperback: 'https://www.amazon.com/dp/B0HM3236K9',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Telugu, born in Andhra Pradesh, and born in Telangana',
	},
	{
		code: 'zh-hant',
		name: '中文聖經',
		english: 'Traditional Chinese',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM636LBP',
			paperback: 'https://www.amazon.com/dp/B0HM6CHG3Y',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Chinese, born in Taiwan, from Hong Kong and Macau, and Taiwanese Americans',
	},
	{
		code: 'tr',
		name: 'Türkçe Kutsal Kitap',
		english: 'Turkish',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM25FNDH',
			paperback: 'https://www.amazon.com/dp/B0HM1HDN87',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Turkish, born in Turkey, Turkish Cypriots, and Turks in Germany',
	},
	{
		code: 'uk',
		name: 'Українська Біблія',
		english: 'Ukrainian',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Ukrainian, born in Ukraine, and Ukrainians who fled the war',
	},
	{
		code: 'ur',
		name: 'اردو بائبل',
		english: 'Urdu',
		rtl: true,
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Urdu, born in Pakistan, and from Lahore, Karachi and Islamabad',
	},
	{
		code: 'vi',
		name: 'Kinh Thánh Tiếng Việt',
		english: 'Vietnamese',
		amazon: {
			hardback: 'https://www.amazon.com/dp/B0HM33L8BD',
			paperback: 'https://www.amazon.com/dp/B0HM3895RT',
		},
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Vietnamese, born in Vietnam, and from Hanoi, Huế and Saigon',
	},
	{
		code: 'yo',
		name: 'Bíbélì Yorùbá',
		english: 'Yoruba',
		sub: 'For Beloved Sons and Daughters Worldwide Speaking Yoruba, born in Nigeria, and from Lagos, Ibadan, Abeokuta and Ilorin',
	},
	{
		code: 'zu',
		name: 'IBhayibheli lesiZulu',
		english: 'Zulu',
		soon: true,
		sub: 'For Zulu-speaking families, Zulu pastors and evangelists, churches across KwaZulu-Natal, and congregations in Gauteng',
	},
];

/** Every language edition (Kevin's 33), shown or not. */
export const LANGUAGE_EDITION_TOTAL = allLanguageEditions.length;
/** The editions with delivered covers — the only ones any page renders. */
export const languageEditions = allLanguageEditions.filter((l) => l.ready !== false && !l.soon);
/** Named on /print as coming soon; nothing else renders them. */
export const comingSoonEditions = allLanguageEditions.filter((l) => l.soon);

/** URL/data slug for an edition's product page and look-inside: "spanish" → /bibles/spanish-bible/ */
export const langSlug = (l: LanguageEdition) =>
	l.english
		.replace(/\s*\(.*\)/, '')
		.toLowerCase()
		.replace(/[^a-z]+/g, '-');
