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
	{ code: 'ar', name: 'الكتاب المقدس العربي', english: 'Arabic', rtl: true, design: true },
	{ code: 'bn', name: 'বাংলা বাইবেল', english: 'Bengali' },
	{ code: 'yue', name: '廣東話聖經', english: 'Cantonese' },
	{ code: 'fa', name: 'کتاب مقدس فارسی', english: 'Farsi', rtl: true, design: true },
	{ code: 'fil', name: 'Bibliyang Filipino', english: 'Filipino' },
	{ code: 'fr', name: 'Bible Française', english: 'French' },
	{ code: 'de', name: 'Deutsche Bibel', english: 'German' },
	{ code: 'hi', name: 'हिन्दी बाइबिल', english: 'Hindi' },
	{ code: 'id', name: 'Alkitab Indonesia', english: 'Indonesian' },
	{ code: 'it', name: 'Bibbia Italiana', english: 'Italian' },
	{ code: 'ja', name: '日本語聖書', english: 'Japanese' },
	{ code: 'ko', name: '한국어 성경', english: 'Korean' },
	{ code: 'mr', name: 'मराठी बायबल', english: 'Marathi' },
	{ code: 'pcm', name: 'Naija Bible', english: 'Nigerian Pidgin' },
	{ code: 'pt', name: 'Bíblia Portuguesa', english: 'Portuguese' },
	{ code: 'pa', name: 'ਪੰਜਾਬੀ ਬਾਈਬਲ', english: 'Punjabi' },
	{ code: 'ru', name: 'Русская Библия', english: 'Russian' },
	{ code: 'es', name: 'Biblia Española', english: 'Spanish' },
	{ code: 'sw', name: 'Biblia ya Kiswahili', english: 'Swahili' },
	{ code: 'ta', name: 'தமிழ் பைபிள்', english: 'Tamil' },
	{ code: 'nmf', name: 'Tangkhul Bible', english: 'Tangkhul', design: true },
	{ code: 'te', name: 'తెలుగు బైబిల్', english: 'Telugu' },
	{ code: 'zh-hant', name: '中文聖經', english: 'Traditional Chinese' },
	{ code: 'tr', name: 'Türkçe Kutsal Kitap', english: 'Turkish' },
	{ code: 'ur', name: 'اردو بائبل', english: 'Urdu', rtl: true, design: true },
	{ code: 'vi', name: 'Kinh Thánh Tiếng Việt', english: 'Vietnamese' },
];

/** Every language edition (Kevin's 26), shown or not. */
export const LANGUAGE_EDITION_TOTAL = allLanguageEditions.length;
/** The editions with delivered covers — the only ones any page renders. */
export const languageEditions = allLanguageEditions.filter((l) => l.ready !== false);
