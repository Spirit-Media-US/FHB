// FHB LANGUAGE print editions shown on /print and in the homepage's second cover marquee.
//
// ONLY editions whose press files are FINISHED are listed: interior + case + jacket +
// paperback + metadata sheet present in the language submission set (Drive
// 1faik2I_8shdwAi352TDaSUUtRI4-16jk). 22 as of 2026-10-03. A language whose covers are not
// delivered is NOT listed — no card is ever faked (Arabic, Farsi and Urdu are still being
// built; Tangkhul has no print edition).
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
}

export const LANG_HB = 99.99;
export const LANG_PB = 79.99;

// Alphabetical by English name, as the targeted editions are alphabetical on /print.
export const languageEditions: LanguageEdition[] = [
	{ code: 'bn', name: 'বাংলা বাইবেল', english: 'Bengali' },
	{ code: 'yue', name: '廣東話聖經', english: 'Cantonese' },
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
	{ code: 'te', name: 'తెలుగు బైబిల్', english: 'Telugu' },
	{ code: 'zh-hant', name: '中文聖經', english: 'Traditional Chinese' },
	{ code: 'tr', name: 'Türkçe Kutsal Kitap', english: 'Turkish' },
	{ code: 'vi', name: 'Kinh Thánh Tiếng Việt', english: 'Vietnamese' },
];
