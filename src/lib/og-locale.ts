// Ported verbatim from community (commit 4baef3a, src/lib/languages.ts) so marketing and /read emit the same og:locale. Keep the two maps in sync.
/**
 * Open Graph locale (Facebook `ll_CC` form) per language code — SEPARATE from
 * `langTag()`: hreflang and <html lang> stay BCP-47, only `og:locale` and
 * `og:locale:alternate` read this (seo-l1 unit 6bb, 2026-10-28).
 *
 * The registry carries no region/country field, so the country below is the
 * language's single Facebook-listed regional default where one is unambiguous.
 * Where a language has several regions (es, pt, fr-style splits we did not
 * list) or no Facebook locale we can name, the bare language code is used —
 * Facebook accepts that. NOTHING is guessed: add a row only when you can point
 * at the locale in Facebook's supported-locales list.
 */
const OG_LOCALE: Record<string, string> = {
	en: 'en_US',
	fr: 'fr_FR',
	de: 'de_DE',
	it: 'it_IT',
	ru: 'ru_RU',
	ja: 'ja_JP',
	ko: 'ko_KR',
	pl: 'pl_PL',
	nl: 'nl_NL',
	tr: 'tr_TR',
	uk: 'uk_UA',
	ro: 'ro_RO',
	el: 'el_GR',
	hu: 'hu_HU',
	id: 'id_ID',
	ms: 'ms_MY',
	vi: 'vi_VN',
	fil: 'fil_PH',
	hi: 'hi_IN',
	bn: 'bn_IN',
	ta: 'ta_IN',
	te: 'te_IN',
	ml: 'ml_IN',
	kn: 'kn_IN',
	pa: 'pa_IN',
	mr: 'mr_IN',
	ne: 'ne_NP',
	ur: 'ur_PK',
	fa: 'fa_IR',
	ar: 'ar_AR',
	sw: 'sw_KE',
	am: 'am_ET',
	af: 'af_ZA',
	zu: 'zu_ZA',
	ha: 'ha_NG',
	ig: 'ig_NG',
	yo: 'yo_NG',
	ceb: 'ceb_PH',
	jv: 'jv_ID',
	su: 'su_ID',
	my: 'my_MM',
	'zh-hans': 'zh_CN',
	'zh-hant': 'zh_TW',
	yue: 'zh_HK',
};

/** Facebook-form og:locale for a language code; bare code when no defensible country. */
export function ogLocale(code: string): string {
	const c = code.toLowerCase();
	return OG_LOCALE[c] ?? OG_LOCALE[c.split('-')[0]] ?? c.replace('-', '_');
}

/** og:locale:alternate values: every code except `current`, deduped, in input order. */
export function ogLocaleAlternates(current: string, codes: string[]): string[] {
	const self = ogLocale(current);
	return [...new Set(codes.map(ogLocale))].filter((v) => v !== self);
}
