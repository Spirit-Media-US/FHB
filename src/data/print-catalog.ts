// EVERY PRINT EDITION WE SELL DIRECT, one row per EDITION (both bindings on the row), grouped
// as the catalog order form /print/order/ shows them and as /print's quick order box lists
// them (Kevin 2026-10-03). The SKUs are functions/dvc-checkout.ts's; scripts/pricing-verify.mjs
// reads the prices each BUILT order form carries and fails the build if any differs from the
// server's, or if the catalog misses a SKU the server sells.
import { cardUrl } from './card-art';
import { dvcEditions, trimTargeted } from './dvc-editions';
import { LANG_HB, LANG_PB, langSlug, languageEditions } from './language-editions';

export type CatalogCategory = 'general' | 'audience' | 'large-print' | 'language';

export interface CatalogRow {
	/** SKU stem: the row sells `${id}-hb` and `${id}-pb` */
	id: string;
	category: CatalogCategory;
	title: string;
	/** the edition's own-language name, for language editions */
	native?: string;
	lang?: string;
	rtl?: boolean;
	trim: string;
	img: string;
	hb: number;
	pb: number;
	/** lowercased, apostrophes dropped — what the search box matches */
	search: string;
}

export const CATALOG_CATEGORIES: { key: CatalogCategory; label: string }[] = [
	{ key: 'general', label: 'General' },
	{ key: 'audience', label: 'Audience Editions' },
	{ key: 'large-print', label: 'Large Print' },
	{ key: 'language', label: 'Language Editions' },
];

const norm = (...parts: (string | undefined)[]) =>
	parts.filter(Boolean).join(' ').toLowerCase().replace(/['’]/g, '');

// General Audience, Regular Print — three cover colours of one book. Prices as print.astro's
// generalLines (ISBNS.json).
const GENERAL = [
	{ key: 'charcoal', name: 'Charcoal' },
	{ key: 'plum', name: 'Plum' },
	{ key: 'white', name: 'White' },
];

// Large Print, three volumes and the complete set. Prices as print.astro's lpVolumes / lpSet*
// (ISBNS.json, Kevin 2026-09-14 and 2026-09-16).
const LARGE_PRINT = [
	{ id: 'lp-vol1', title: 'Large Print Vol. 1, Genesis–Esther (Wheat)', hb: 114.99, pb: 99.99 },
	{ id: 'lp-vol2', title: 'Large Print Vol. 2, Job–Malachi (Sage)', hb: 114.99, pb: 99.99 },
	{ id: 'lp-vol3', title: 'Large Print Vol. 3, New Testament (Mist Blue)', hb: 99.99, pb: 79.99 },
	{ id: 'lp-set', title: 'Large Print — Complete Three-Volume Set', hb: 299.99, pb: 249.99 },
];

// Thumbnails: only the language cards are rendered at 360; every other card exists at 600/1200
// only (a 360 key 404s — measured 2026-10-04), so those rows use 600. Same 360:458 aspect.
export const catalogRows: CatalogRow[] = [
	...GENERAL.map((c) => {
		const title = `Father’s Heart Bible — ${c.name}`;
		return {
			id: `general-regular-${c.key}`,
			category: 'general' as const,
			title,
			trim: trimTargeted,
			img: cardUrl(`general-regular-${c.key}`, 600),
			hb: 99.99,
			pb: 79.99,
			search: norm(title, 'general regular print'),
		};
	}),
	...dvcEditions.map((e) => ({
		id: e.slug,
		category: 'audience' as const,
		title: e.title,
		trim: e.trim ?? trimTargeted,
		img: cardUrl(`dvc-${e.slug}`, 600),
		hb: e.hb,
		pb: e.pb,
		search: norm(e.title, e.groupHeading, 'audience'),
	})),
	...LARGE_PRINT.map((v) => ({
		id: v.id,
		category: 'large-print' as const,
		title: v.title,
		trim: '6×9 Large Print',
		img: cardUrl(v.id, 600),
		hb: v.hb,
		pb: v.pb,
		search: norm(v.title, 'large print'),
	})),
	...languageEditions.map((l) => ({
		id: `lang-${l.code}`,
		category: 'language' as const,
		title: `${l.english} Edition`,
		native: l.name,
		lang: l.code,
		rtl: l.rtl,
		trim: trimTargeted,
		img: cardUrl(`lang-${l.code}`, 360),
		hb: LANG_HB,
		pb: LANG_PB,
		search: norm(l.english, l.name, langSlug(l), 'language'),
	})),
];

/** Every SKU's list price in dollars — what each order form embeds for its live total. */
export const catalogPrices = (rows: CatalogRow[] = catalogRows): Record<string, number> =>
	Object.fromEntries(
		rows.flatMap((r) => [
			[`${r.id}-hb`, r.hb],
			[`${r.id}-pb`, r.pb],
		]),
	);
