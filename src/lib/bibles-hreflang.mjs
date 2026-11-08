// 2jx: ONE source for hreflang across the FHB Bible language-edition product pages.
// Pure (no fs, so it survives Astro bundling): callers pass the edition JSON list. [slug].astro passes its
// import.meta.glob result (head); astro.config.mjs + the test use bibles-hreflang-fs.mjs (sitemap xhtml:link). Generated from src/data/editions/*.json, never hand-listed.
//
// Cluster = the English edition (fathers-heart) + every kind:'language' edition. The 28 audience
// editions are English for different readers, not translations, so they carry NO alternates.
// Code = the edition's schema.org inLanguage (BCP-47, zh-hans -> zh-Hans) so hreflang and JSON-LD
// can never disagree. x-default = the English edition.

const SITE = 'https://fathersheartbible.com';
export const ENGLISH_SLUG = 'fathers-heart';

/** BCP-47 casing: zh-hans -> zh-Hans, pt-br -> pt-BR. Same rule as inLang in [slug].astro. */
export const bcp47 = (lang) =>
	lang.replace(/-(\w+)$/, (_m, r) => '-' + (r.length === 4 ? r[0].toUpperCase() + r.slice(1) : r.toUpperCase()));

export const editionUrl = (slug) => `${SITE}/bibles/${slug}-bible/`;

/** [{hreflang, slug, href}] — English first, then language editions sorted by code. */
export function clusterFrom(eds) {
	const en = eds.find((e) => e.slug === ENGLISH_SLUG);
	if (!en) throw new Error(`bibles-hreflang: English edition "${ENGLISH_SLUG}" not found`);
	const langs = eds.filter((e) => e.kind === 'language');
	for (const e of langs) if (!e.lang) throw new Error(`bibles-hreflang: language edition ${e.slug} has no lang`);
	const rows = langs
		.map((e) => ({ hreflang: bcp47(e.lang), slug: e.slug, href: editionUrl(e.slug) }))
		.sort((a, b) => a.hreflang.localeCompare(b.hreflang));
	const seen = new Set(['en']);
	for (const r of rows) {
		if (seen.has(r.hreflang)) throw new Error(`bibles-hreflang: duplicate hreflang ${r.hreflang}`);
		seen.add(r.hreflang);
	}
	return [{ hreflang: 'en', slug: en.slug, href: editionUrl(en.slug) }, ...rows];
}

/** Head alternates for one page slug: the full set (incl. self) + x-default, or [] for non-members. */
export function alternatesFrom(eds, slug) {
	const cluster = clusterFrom(eds);
	if (!cluster.some((r) => r.slug === slug)) return [];
	return [
		...cluster.map(({ hreflang, href }) => ({ hreflang, href })),
		{ hreflang: 'x-default', href: cluster[0].href },
	];
}

/** Sitemap `links` ([{url, lang}]) for a /bibles/<x>-bible/ URL, or undefined for non-members. */
export function sitemapLinksFrom(eds, url) {
	const m = /\/bibles\/([a-z0-9-]+)-bible\/?$/.exec(url);
	if (!m) return undefined;
	const alts = alternatesFrom(eds, m[1]);
	return alts.length ? alts.map((a) => ({ url: a.href, lang: a.hreflang })) : undefined;
}
