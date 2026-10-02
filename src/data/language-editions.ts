// FHB LANGUAGE print editions shown on /print and in the homepage's second cover marquee.
//
// ONLY editions whose press files are FINISHED are listed: interior + case + jacket +
// paperback delivered to the language submission set (Drive 1faik2I_8shdwAi352TDaSUUtRI4-16jk)
// and submitted to IngramSpark 2026-10-02 (13 languages x hardback + paperback = 26 titles).
// A language whose covers are not delivered is NOT listed — no card is ever faked.
//
// `name` is the edition's own name exactly as its record carries it
// (projects/fhb-print-bible/editions/<code>.json → edition_name), which is also the title
// printed on its cover. `english` is the submission set's folder name.
// Prices: every language metadata sheet lists US $99.99 hardback / $79.99 paperback.
// Card art: FHB/print/lang/v1/lang-<code>-{600,1200}.webp, cut from each language's
// DELIVERED case PDF by projects/fhb-lang-covers/cards/build_lang_cards.py (the same house
// renderer as every other /print card).
export interface LanguageEdition {
	code: string;
	name: string;
	english: string;
}

export const LANG_HB = 99.99;
export const LANG_PB = 79.99;

// Alphabetical by English name, as the targeted editions are alphabetical on /print.
export const languageEditions: LanguageEdition[] = [
	{ code: 'fil', name: 'Bibliyang Filipino', english: 'Filipino' },
	{ code: 'fr', name: 'Bible Française', english: 'French' },
	{ code: 'de', name: 'Deutsche Bibel', english: 'German' },
	{ code: 'id', name: 'Alkitab Indonesia', english: 'Indonesian' },
	{ code: 'it', name: 'Bibbia Italiana', english: 'Italian' },
	{ code: 'pcm', name: 'Naija Bible', english: 'Nigerian Pidgin' },
	{ code: 'pt', name: 'Bíblia Portuguesa', english: 'Portuguese' },
	{ code: 'ru', name: 'Русская Библия', english: 'Russian' },
	{ code: 'es', name: 'Biblia Española', english: 'Spanish' },
	{ code: 'sw', name: 'Biblia ya Kiswahili', english: 'Swahili' },
	{ code: 'te', name: 'తెలుగు బైబిల్', english: 'Telugu' },
	{ code: 'tr', name: 'Türkçe Kutsal Kitap', english: 'Turkish' },
	{ code: 'vi', name: 'Kinh Thánh Tiếng Việt', english: 'Vietnamese' },
];
