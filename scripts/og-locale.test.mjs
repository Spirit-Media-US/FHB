// node --experimental-strip-types --test scripts/og-locale.test.mjs
// seo-2au: og:locale must be a Facebook-supported ll_CC value or be omitted. Bare 'pt' is invalid.
// Valid list: Facebook FacebookLocales.xml (now 404) via mirrors gist.github.com/mechastorm/3626739 and
// gist.github.com/fabulator/27aa3af1e51e6c2060c840d5dfaa177e, plus Meta's Messenger supported-locales page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ogLocale, ogLocaleAlternates, OG_LOCALE_VALUES } from '../src/lib/og-locale.ts';

const FB = new Set([
	'af_ZA', 'am_ET', 'ar_AR', 'as_IN', 'az_AZ', 'be_BY', 'bg_BG', 'bn_IN',
	'br_FR', 'bs_BA', 'ca_ES', 'cb_IQ', 'co_FR', 'cs_CZ', 'cx_PH', 'cy_GB',
	'da_DK', 'de_DE', 'el_GR', 'en_GB', 'en_PI', 'en_UD', 'en_US', 'eo_EO',
	'es_ES', 'es_LA', 'et_EE', 'eu_ES', 'fa_IR', 'fb_LT', 'ff_NG', 'fi_FI',
	'fo_FO', 'fr_CA', 'fr_FR', 'fy_NL', 'ga_IE', 'gl_ES', 'gn_PY', 'gu_IN',
	'ha_NG', 'he_IL', 'hi_IN', 'hr_HR', 'ht_HT', 'hu_HU', 'hy_AM', 'id_ID',
	'is_IS', 'it_IT', 'ja_JP', 'ja_KS', 'jv_ID', 'ka_GE', 'kk_KZ', 'km_KH',
	'kn_IN', 'ko_KR', 'ku_TR', 'ky_KG', 'la_VA', 'lo_LA', 'lt_LT', 'lv_LV',
	'mg_MG', 'mk_MK', 'ml_IN', 'mn_MN', 'mr_IN', 'ms_MY', 'mt_MT', 'my_MM',
	'nb_NO', 'ne_NP', 'nl_BE', 'nl_NL', 'nn_NO', 'or_IN', 'pa_IN', 'pl_PL',
	'ps_AF', 'pt_BR', 'pt_PT', 'ro_RO', 'ru_RU', 'rw_RW', 'sc_IT', 'si_LK',
	'sk_SK', 'sl_SI', 'sn_ZW', 'so_SO', 'sq_AL', 'sr_RS', 'sv_SE', 'sw_KE',
	'sy_SY', 'sz_PL', 'ta_IN', 'te_IN', 'tg_TJ', 'th_TH', 'tl_PH', 'tr_TR',
	'tz_MA', 'uk_UA', 'ur_PK', 'uz_UZ', 'vi_VN', 'zh_CN', 'zh_HK', 'zh_TW',
	'zz_TR',
]);

test('every value the map can emit is a Facebook-supported locale', () => {
	assert.ok(OG_LOCALE_VALUES.length > 30);
	assert.deepEqual(OG_LOCALE_VALUES.filter((v) => !FB.has(v)), []);
});
test('checker fires on an invalid value (failure path)', () => {
	assert.deepEqual(['pt', 'fil_PH'].filter((v) => !FB.has(v)), ['pt', 'fil_PH']);
});
test('Portuguese is pt_BR; unlisted languages omit the tag', () => {
	assert.equal(ogLocale('pt'), 'pt_BR');
	for (const c of ['nmf', 'pcm', 'zu', 'ig', 'yo', 'su']) assert.equal(ogLocale(c), undefined);
	assert.equal(ogLocale('xx'), undefined);
});
test('alternates never include undefined, bare codes or the current locale', () => {
	const a = ogLocaleAlternates('en', ['en', 'pt', 'nmf', 'zu', 'es', 'zh-hant']);
	assert.deepEqual(a, ['pt_BR', 'es_LA', 'zh_TW']);
});
