// Ported verbatim from community (commit 4baef3a, src/lib/languages.ts) so marketing and /read emit the same og:locale. Keep the two maps in sync.
/**
 * Open Graph locale (Facebook `ll_CC` form) per language code — SEPARATE from
 * `langTag()`: hreflang and <html lang> stay BCP-47, only `og:locale` and
 * `og:locale:alternate` read this (seo-l1 unit 6bb, 2026-10-28).
 *
 * The registry carries no region/country field, so the country below is the
 * language's single Facebook-listed regional default where one is unambiguous.
 * Where a language has several regions (es, pt, fr-style splits we did not
 * list) or no Facebook locale exists, NO og:locale is emitted (ogLocale returns
 * undefined) — a bare "pt" or an invented ll_CC is invalid on Facebook (2au,
 * 2026-10-29). NOTHING is guessed: add a row only when you can point at the
 * locale in Facebook's supported-locales list (Facebook's FacebookLocales.xml,
 * now 404; mirrored at gist.github.com/mechastorm/3626739 and
 * gist.github.com/fabulator/27aa3af1e51e6c2060c840d5dfaa177e, plus
 * developers.facebook.com/docs/messenger-platform/messenger-profile/supported-locales).
 * Region picks: pt_BR (measured pt-BR demand), es_LA (Facebook's region-neutral
 * Spanish; region unmeasured), tl_PH = Filipino, cx_PH = Bisaya (Cebuano).
 */
const OG_LOCALE: Record<string, string> = {
	en: 'en_US',
	pt: 'pt_BR',
	es: 'es_LA',
	he: 'he_IL',
	sn: 'sn_ZW',
	uz: 'uz_UZ',
	ht: 'ht_HT',
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
	fil: 'tl_PH',
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
	ha: 'ha_NG',
	ceb: 'cx_PH',
	jv: 'jv_ID',
	my: 'my_MM',
	'zh-hans': 'zh_CN',
	'zh-hant': 'zh_TW',
	yue: 'zh_HK',
};

/** Every ll_CC value the map can emit (asserted valid by og-locale.test.ts). */
export const OG_LOCALE_VALUES: string[] = [...new Set(Object.values(OG_LOCALE))];

/** Facebook-form og:locale for a language code; undefined (omit the tag) when Facebook has none. */
export function ogLocale(code: string): string | undefined {
	const c = code.toLowerCase();
	return OG_LOCALE[c] ?? OG_LOCALE[c.split('-')[0]];
}

/** og:locale:alternate values: every code except `current`, deduped, in input order. */
export function ogLocaleAlternates(current: string, codes: string[]): string[] {
	const self = ogLocale(current);
	return [...new Set(codes.map(ogLocale))].filter((v): v is string => !!v && v !== self);
}
