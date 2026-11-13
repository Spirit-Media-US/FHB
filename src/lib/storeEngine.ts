// SMP STORE ENGINE (plan 3fb Phase 2, pmseoaeo 2026-11-13; Kevin 11-13 "SMP is the engine").
// ONE module for what a checkout SELLS and at what price: the catalogue (Bibles + books from books.json /
// book-skus.json), the volume ladder, far-band quote, first-order 15%, margin floor + international handling,
// and the Stripe sale metadata (title|isbn|format|qty|unit|fee|country|date|net_usd). checkoutForm() turns one
// order into the exact Stripe Checkout Session form. It does NO I/O: the caller (FHB /dvc-checkout today, the
// SMP checkout service in Phase 3) supplies the Stripe-backed first-order lookups and POSTs the form.
// Moved VERBATIM out of functions/dvc-checkout.ts; scripts/store-engine-parity.test.mjs proves the Stripe
// request for 11 fixed carts is byte-identical to the pre-extraction golden.
import bookSkus from '../data/book-skus.json' with { type: 'json' };
import booksCatalog from '../data/books.json' with { type: 'json' };
import isbnList from '../data/isbn-list.json' with { type: 'json' };

import { BULK_QUOTE_COPY, bulkQuoteRequired, tierPctFor } from './farBand.ts';
import {
	handlingFeeCents,
	handlingLabel,
	marginCheck,
	netPerItemUsd,
	volumesFor,
} from './marginGuard.ts';
import {
	BOOK_SKUS,
	FIRST_ORDER_CODE,
	FIRST_ORDER_PCT,
	isDiscountExempt,
	MAX_LINE_ITEMS,
	META_VALUE_MAX,
	packBreakdown,
	paidUnit,
} from './order-pricing.ts';
import { checkoutShippingForm, countryFor } from './shipCountries.ts';

const ASSETS = 'https://assets.spiritmediapublishing.com/FHB/print';
// Re-rendered 3-D cards live under NEW keys rather than over the live ones, so the edge
// has nothing stale to serve and nothing live was mutated. Mirrors src/data/card-art.ts:
// a SKU whose card has not been re-rendered (journaling's 8x10, D166) still points at
// ASSETS. Both sides are verified against the edge in the build.
const CARDS = `${ASSETS}/cards/v2`;

// Retail in cents. The fifteen 6x9 targeted editions share one price; the 8x10 journaling
// edition is its own.
//
// `books` WEIGHTS A SKU ON THE VOLUME LADDER, and every SKU now weighs ONE.
//
// CORRECTED BY KEVIN 2026-09-17: "A 3 book set is 1 product not 12 products when selling 4
// sets, but 4 sets = 4 products. So the bulk discounts apply just like all other products."
// The set is ONE PRODUCT on the shelf, not three, so it moves the buyer ONE step up the
// ladder exactly like every other SKU — no multiplying, no dividing, no special case for
// the one SKU that happens to arrive as three volumes. The previous weight of 3 made four
// sets count as twelve books and reach the 10% tier that four of anything else would not.
// Kept as a field rather than deleted: it is the place any future multi-item SKU would say
// so, and the comment is the record of why the answer is one.
const EDITIONS: Record<
	string,
	{
		title: string;
		retail: number;
		img: string;
		books?: number;
		/** Stripe line name and description when the SKU is not a Father's Heart Bible edition. */
		name?: string;
		desc?: string;
	}
> = {
	// EVERY EDITION IS SOLD IN BOTH BINDINGS (Kevin 2026-09-17), so each one is TWO SKUs,
	// keyed <slug>-hb / <slug>-pb exactly like the Large Print volumes. A bare slug is no
	// longer sellable: a single key could not say which binding the buyer chose, and the
	// price differs by $20. Prices are ISBNS.json's and pricing-verify compares them.
	// Titles carry the binding because this string is what shows on the Stripe receipt.
	'athletes-hb': {
		title: 'Athlete’s Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-athletes-600.webp`,
	},
	'athletes-pb': {
		title: 'Athlete’s Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-athletes-600.webp`,
	},
	'chosen-hb': {
		title: 'Chosen Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-chosen-600.webp`,
	},
	'chosen-pb': {
		title: 'Chosen Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-chosen-600.webp`,
	},
	'couples-hb': {
		title: 'Couple’s Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-couples-600.webp`,
	},
	'couples-pb': {
		title: 'Couple’s Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-couples-600.webp`,
	},
	'dads-hb': {
		title: 'Dad’s Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-dads-600.webp`,
	},
	'dads-pb': {
		title: 'Dad’s Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-dads-600.webp`,
	},
	'first-responders-hb': {
		title: 'First Responder’s Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-first-responders-600.webp`,
	},
	'first-responders-pb': {
		title: 'First Responder’s Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-first-responders-600.webp`,
	},
	'graduates-hb': {
		title: 'Graduate’s Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-graduates-600.webp`,
	},
	'graduates-pb': {
		title: 'Graduate’s Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-graduates-600.webp`,
	},
	'grandparents-hb': {
		title: 'Grandparent’s Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-grandparents-600.webp`,
	},
	'grandparents-pb': {
		title: 'Grandparent’s Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-grandparents-600.webp`,
	},
	'intercessors-hb': {
		title: 'Intercessor’s Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-intercessors-600.webp`,
	},
	'intercessors-pb': {
		title: 'Intercessor’s Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-intercessors-600.webp`,
	},
	'mens-hb': {
		title: 'Men’s Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-mens-600.webp`,
	},
	'mens-pb': {
		title: 'Men’s Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-mens-600.webp`,
	},
	'moms-hb': {
		title: 'Mom’s Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-moms-600.webp`,
	},
	'moms-pb': {
		title: 'Mom’s Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-moms-600.webp`,
	},
	'nurses-hb': {
		title: 'Nurse’s Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-nurses-600.webp`,
	},
	'nurses-pb': {
		title: 'Nurse’s Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-nurses-600.webp`,
	},
	'pastors-hb': {
		title: 'Pastor’s Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-pastors-600.webp`,
	},
	'pastors-pb': {
		title: 'Pastor’s Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-pastors-600.webp`,
	},
	'peace-hb': {
		title: 'Peace Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-peace-600.webp`,
	},
	'peace-pb': {
		title: 'Peace Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-peace-600.webp`,
	},
	'presidents-hb': {
		title: 'President’s Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-presidents-600.webp`,
	},
	'presidents-pb': {
		title: 'President’s Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-presidents-600.webp`,
	},
	'recovery-hb': {
		title: 'Recovery Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-recovery-600.webp`,
	},
	'recovery-pb': {
		title: 'Recovery Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-recovery-600.webp`,
	},
	'seekers-hb': {
		title: 'Seeker’s Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-seekers-600.webp`,
	},
	'seekers-pb': {
		title: 'Seeker’s Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-seekers-600.webp`,
	},
	'seventeen-hb': {
		title: 'Seventeen Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-seventeen-600.webp`,
	},
	'seventeen-pb': {
		title: 'Seventeen Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-seventeen-600.webp`,
	},
	'soldiers-hb': {
		title: 'Soldier’s Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-soldiers-600.webp`,
	},
	'soldiers-pb': {
		title: 'Soldier’s Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-soldiers-600.webp`,
	},
	'teachers-hb': {
		title: 'Teacher’s Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-teachers-600.webp`,
	},
	'teachers-pb': {
		title: 'Teacher’s Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-teachers-600.webp`,
	},
	'teen-hb': {
		title: 'Teen Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-teen-600.webp`,
	},
	'teen-pb': {
		title: 'Teen Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-teen-600.webp`,
	},
	'womens-hb': {
		title: 'Women’s Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-womens-600.webp`,
	},
	'womens-pb': {
		title: 'Women’s Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-womens-600.webp`,
	},
	'worship-leaders-hb': {
		title: 'Worship Leader’s Bible — Hardback',
		retail: 9999,
		img: `${CARDS}/dvc-worship-leaders-600.webp`,
	},
	'worship-leaders-pb': {
		title: 'Worship Leader’s Bible — Paperback',
		retail: 7999,
		img: `${CARDS}/dvc-worship-leaders-600.webp`,
	},
	'journaling-hb': {
		title: 'She Hears Her Father’s Voice — Journaling Bible — Hardback',
		retail: 12499,
		img: `${ASSETS}/dvc-journaling-600.webp`,
	},
	'journaling-pb': {
		title: 'She Hears Her Father’s Voice — Journaling Bible — Paperback',
		retail: 11499,
		img: `${ASSETS}/dvc-journaling-600.webp`,
	},

	// ── General Audience, added 2026-08-29 ──
	// The same Bible without an audience on the cover: three colours, two bindings, in
	// Regular Print (888pp). Large Print is now the three-volume set below. They join the
	// SAME mix-and-match ladder as the targeted editions — the combined total sets the tier.
	// MUST match src/pages/print.astro `generalSkus` and the PRICE map in its inline script.
	'general-regular-charcoal-pb': {
		title: 'Charcoal, Paperback',
		retail: 7999,
		img: `${CARDS}/general-regular-charcoal-600.webp`,
	},
	'general-regular-charcoal-hb': {
		title: 'Charcoal, Hardback',
		retail: 9999,
		img: `${CARDS}/general-regular-charcoal-600.webp`,
	},
	'general-regular-plum-pb': {
		title: 'Plum, Paperback',
		retail: 7999,
		img: `${CARDS}/general-regular-plum-600.webp`,
	},
	'general-regular-plum-hb': {
		title: 'Plum, Hardback',
		retail: 9999,
		img: `${CARDS}/general-regular-plum-600.webp`,
	},
	'general-regular-white-pb': {
		title: 'White, Paperback',
		retail: 7999,
		img: `${CARDS}/general-regular-white-600.webp`,
	},
	'general-regular-white-hb': {
		title: 'White, Hardback',
		retail: 9999,
		img: `${CARDS}/general-regular-white-600.webp`,
	},
	// ── Large Print, rebuilt as THREE VOLUMES 2026-09-17 ──
	// The single-volume Large Print (three cover colours, ISBNs 307-2/308-9/309-6/310-2/
	// 311-9/312-6) is RETIRED and its six SKUs are gone from this map. It was an ABRIDGED
	// book — 30 books in full text and the other 36 in selected passages — because the
	// complete text at 14pt does not fit one binding. The set is the complete Bible: one
	// cover colour per volume, and together all 66 books.
	// Prices are Kevin's, 2026-09-14, and live in
	// projects/fhb-print-bible/editions/ISBNS.json as the single source: Vol 3 is about half
	// the size of Vols 1 and 2 and is priced accordingly.
	'lp-vol1-pb': {
		title: 'Large Print Vol. 1, Genesis–Esther (Wheat), Paperback',
		retail: 9999,
		img: `${ASSETS}/lp/v4/lp-vol1-600.webp`,
	},
	'lp-vol1-hb': {
		title: 'Large Print Vol. 1, Genesis–Esther (Wheat), Hardback',
		retail: 11499,
		img: `${ASSETS}/lp/v4/lp-vol1-600.webp`,
	},
	'lp-vol2-pb': {
		title: 'Large Print Vol. 2, Job–Malachi (Sage), Paperback',
		retail: 9999,
		img: `${ASSETS}/lp/v4/lp-vol2-600.webp`,
	},
	'lp-vol2-hb': {
		title: 'Large Print Vol. 2, Job–Malachi (Sage), Hardback',
		retail: 11499,
		img: `${ASSETS}/lp/v4/lp-vol2-600.webp`,
	},
	'lp-vol3-pb': {
		title: 'Large Print Vol. 3, New Testament (Mist Blue), Paperback',
		retail: 7999,
		img: `${ASSETS}/lp/v4/lp-vol3-600.webp`,
	},
	'lp-vol3-hb': {
		title: 'Large Print Vol. 3, New Testament (Mist Blue), Hardback',
		retail: 9999,
		img: `${ASSETS}/lp/v4/lp-vol3-600.webp`,
	},
	// THE SET IS A NORMAL PRODUCT (Kevin 2026-09-16, dissolving D147). It carries its own
	// price and the SAME ladder as everything else — no better-of rule, no stacking rule, no
	// special case. The saving against buying the three volumes separately is simply the set
	// price, and LP_SET_NEVER_COSTS_MORE below asserts that it is a saving.
	'lp-set-pb': {
		title: 'Large Print — Complete Three-Volume Set, Paperback',
		retail: 24999,
		img: `${ASSETS}/lp/v4/lp-set-600.webp`,
		books: 1,
	},
	'lp-set-hb': {
		title: 'Large Print — Complete Three-Volume Set, Hardback',
		retail: 29999,
		img: `${ASSETS}/lp/v4/lp-set-600.webp`,
		books: 1,
	},
	// LANGUAGE EDITIONS (Kevin 2026-10-03: "all editions can be purchased now"). Keyed
	// lang-<code>-hb / -pb. Prices are each language sheet's top table, recorded in ISBNS.json
	// language_editions (on_sale + price_usd) and gated by pricing-verify. Card art mirrors
	// src/data/card-art.ts (FHB/print/lang/v1/, v2 for cards cut from a built case).
	// GENERATED by fhb-chain.py ed_emit() from src/data/edition-registry.json — DO NOT HAND-EDIT:
	// the next tick overwrites it. A language appears here when the registry lists it, so fix the
	// fact (ISBNS.json on_sale/price_usd, the edition deck, the built card), never this block.
	'lang-am-hb': {
		title: 'የአማርኛ መጽሐፍ ቅዱስ (Amharic) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-am-600.webp`,
	},
	'lang-am-pb': {
		title: 'የአማርኛ መጽሐፍ ቅዱስ (Amharic) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-am-600.webp`,
	},
	'lang-ar-hb': {
		title: 'الكتاب المقدس العربي (Arabic) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-ar-600.webp`,
	},
	'lang-ar-pb': {
		title: 'الكتاب المقدس العربي (Arabic) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-ar-600.webp`,
	},
	'lang-bn-hb': {
		title: 'বাংলা বাইবেল (Bengali) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-bn-600.webp`,
	},
	'lang-bn-pb': {
		title: 'বাংলা বাইবেল (Bengali) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-bn-600.webp`,
	},
	'lang-my-hb': {
		title: 'မြန်မာ သမ္မာကျမ်းစာ (Burmese) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-my-600.webp`,
	},
	'lang-my-pb': {
		title: 'မြန်မာ သမ္မာကျမ်းစာ (Burmese) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-my-600.webp`,
	},
	'lang-yue-hb': {
		title: '廣東話聖經 (Cantonese) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-yue-600.webp`,
	},
	'lang-yue-pb': {
		title: '廣東話聖經 (Cantonese) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-yue-600.webp`,
	},
	'lang-ceb-hb': {
		title: 'Cebuano nga Bibliya (Cebuano) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-ceb-600.webp`,
	},
	'lang-ceb-pb': {
		title: 'Cebuano nga Bibliya (Cebuano) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-ceb-600.webp`,
	},
	'lang-ny-hb': {
		title: 'Baibulo la Chicheŵa (Chichewa) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-ny-600.webp`,
	},
	'lang-ny-pb': {
		title: 'Baibulo la Chicheŵa (Chichewa) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-ny-600.webp`,
	},
	'lang-nl-hb': {
		title: 'Nederlandse Bijbel (Dutch) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-nl-600.webp`,
	},
	'lang-nl-pb': {
		title: 'Nederlandse Bijbel (Dutch) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-nl-600.webp`,
	},
	'lang-fil-hb': {
		title: 'Bibliyang Filipino (Filipino) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-fil-600.webp`,
	},
	'lang-fil-pb': {
		title: 'Bibliyang Filipino (Filipino) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-fil-600.webp`,
	},
	'lang-fr-hb': {
		title: 'Bible Française (French) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-fr-600.webp`,
	},
	'lang-fr-pb': {
		title: 'Bible Française (French) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-fr-600.webp`,
	},
	'lang-de-hb': {
		title: 'Deutsche Bibel (German) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-de-600.webp`,
	},
	'lang-de-pb': {
		title: 'Deutsche Bibel (German) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-de-600.webp`,
	},
	'lang-ha-hb': {
		title: 'Littafi Mai Tsarki na Hausa (Hausa) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-ha-600.webp`,
	},
	'lang-ha-pb': {
		title: 'Littafi Mai Tsarki na Hausa (Hausa) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-ha-600.webp`,
	},
	'lang-hi-hb': {
		title: 'हिन्दी बाइबिल (Hindi) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-hi-600.webp`,
	},
	'lang-hi-pb': {
		title: 'हिन्दी बाइबिल (Hindi) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-hi-600.webp`,
	},
	'lang-hu-hb': {
		title: 'Magyar Biblia (Hungarian) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-hu-600.webp`,
	},
	'lang-hu-pb': {
		title: 'Magyar Biblia (Hungarian) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-hu-600.webp`,
	},
	'lang-id-hb': {
		title: 'Alkitab Indonesia (Indonesian) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-id-600.webp`,
	},
	'lang-id-pb': {
		title: 'Alkitab Indonesia (Indonesian) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-id-600.webp`,
	},
	'lang-it-hb': {
		title: 'Bibbia Italiana (Italian) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-it-600.webp`,
	},
	'lang-it-pb': {
		title: 'Bibbia Italiana (Italian) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-it-600.webp`,
	},
	'lang-ja-hb': {
		title: '日本語聖書 (Japanese) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-ja-600.webp`,
	},
	'lang-ja-pb': {
		title: '日本語聖書 (Japanese) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-ja-600.webp`,
	},
	'lang-ko-hb': {
		title: '한국어 성경 (Korean) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-ko-600.webp`,
	},
	'lang-ko-pb': {
		title: '한국어 성경 (Korean) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-ko-600.webp`,
	},
	'lang-mr-hb': {
		title: 'मराठी बायबल (Marathi) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-mr-600.webp`,
	},
	'lang-mr-pb': {
		title: 'मराठी बायबल (Marathi) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-mr-600.webp`,
	},
	'lang-el-hb': {
		title: 'Ελληνική Βίβλος (Modern Greek) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-el-600.webp`,
	},
	'lang-el-pb': {
		title: 'Ελληνική Βίβλος (Modern Greek) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-el-600.webp`,
	},
	'lang-ne-hb': {
		title: 'नेपाली बाइबल (Nepali) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-ne-600.webp`,
	},
	'lang-ne-pb': {
		title: 'नेपाली बाइबल (Nepali) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-ne-600.webp`,
	},
	'lang-pcm-hb': {
		title: 'Naija Bible (Nigerian Pidgin) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-pcm-600.webp`,
	},
	'lang-pcm-pb': {
		title: 'Naija Bible (Nigerian Pidgin) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-pcm-600.webp`,
	},
	'lang-fa-hb': {
		title: 'کتاب مقدس فارسی (Persian (Farsi)) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-fa-600.webp`,
	},
	'lang-fa-pb': {
		title: 'کتاب مقدس فارسی (Persian (Farsi)) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-fa-600.webp`,
	},
	'lang-pl-hb': {
		title: 'Polska Biblia (Polish) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-pl-600.webp`,
	},
	'lang-pl-pb': {
		title: 'Polska Biblia (Polish) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-pl-600.webp`,
	},
	'lang-pt-hb': {
		title: 'Bíblia Portuguesa (Portuguese) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-pt-600.webp`,
	},
	'lang-pt-pb': {
		title: 'Bíblia Portuguesa (Portuguese) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-pt-600.webp`,
	},
	'lang-pa-hb': {
		title: 'ਪੰਜਾਬੀ ਬਾਈਬਲ (Punjabi) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-pa-600.webp`,
	},
	'lang-pa-pb': {
		title: 'ਪੰਜਾਬੀ ਬਾਈਬਲ (Punjabi) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-pa-600.webp`,
	},
	'lang-ro-hb': {
		title: 'Biblia Românească (Romanian) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-ro-600.webp`,
	},
	'lang-ro-pb': {
		title: 'Biblia Românească (Romanian) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-ro-600.webp`,
	},
	'lang-ru-hb': {
		title: 'Русская Библия (Russian) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-ru-600.webp`,
	},
	'lang-ru-pb': {
		title: 'Русская Библия (Russian) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-ru-600.webp`,
	},
	'lang-seh-hb': {
		title: 'Bukhu ya Mulungu ya Chisena (Sena) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-seh-600.webp`,
	},
	'lang-seh-pb': {
		title: 'Bukhu ya Mulungu ya Chisena (Sena) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-seh-600.webp`,
	},
	'lang-sn-hb': {
		title: 'Bhaibheri rechiShona (Shona) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-sn-600.webp`,
	},
	'lang-sn-pb': {
		title: 'Bhaibheri rechiShona (Shona) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-sn-600.webp`,
	},
	'lang-zh-hans-hb': {
		title: '中文圣经 (Simplified Chinese) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-zh-hans-600.webp`,
	},
	'lang-zh-hans-pb': {
		title: '中文圣经 (Simplified Chinese) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-zh-hans-600.webp`,
	},
	'lang-es-hb': {
		title: 'Biblia Española (Spanish) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-es-600.webp`,
	},
	'lang-es-pb': {
		title: 'Biblia Española (Spanish) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-es-600.webp`,
	},
	'lang-su-hb': {
		title: 'Kitab Suci Sunda (Sundanese) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-su-600.webp`,
	},
	'lang-su-pb': {
		title: 'Kitab Suci Sunda (Sundanese) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-su-600.webp`,
	},
	'lang-sw-hb': {
		title: 'Biblia ya Kiswahili (Swahili) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-sw-600.webp`,
	},
	'lang-sw-pb': {
		title: 'Biblia ya Kiswahili (Swahili) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-sw-600.webp`,
	},
	'lang-ta-hb': {
		title: 'தமிழ் பைபிள் (Tamil) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-ta-600.webp`,
	},
	'lang-ta-pb': {
		title: 'தமிழ் பைபிள் (Tamil) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-ta-600.webp`,
	},
	'lang-nmf-hb': {
		title: 'Tangkhul Bible (Tangkhul) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-nmf-600.webp`,
	},
	'lang-nmf-pb': {
		title: 'Tangkhul Bible (Tangkhul) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-nmf-600.webp`,
	},
	'lang-te-hb': {
		title: 'తెలుగు బైబిల్ (Telugu) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-te-600.webp`,
	},
	'lang-te-pb': {
		title: 'తెలుగు బైబిల్ (Telugu) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-te-600.webp`,
	},
	'lang-zh-hant-hb': {
		title: '中文聖經 (Traditional Chinese) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-zh-hant-600.webp`,
	},
	'lang-zh-hant-pb': {
		title: '中文聖經 (Traditional Chinese) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-zh-hant-600.webp`,
	},
	'lang-tr-hb': {
		title: 'Türkçe Kutsal Kitap (Turkish) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-tr-600.webp`,
	},
	'lang-tr-pb': {
		title: 'Türkçe Kutsal Kitap (Turkish) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-tr-600.webp`,
	},
	'lang-uk-hb': {
		title: 'Українська Біблія (Ukrainian) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-uk-600.webp`,
	},
	'lang-uk-pb': {
		title: 'Українська Біблія (Ukrainian) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-uk-600.webp`,
	},
	'lang-ur-hb': {
		title: 'اردو بائبل (Urdu) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-ur-600.webp`,
	},
	'lang-ur-pb': {
		title: 'اردو بائبل (Urdu) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-ur-600.webp`,
	},
	'lang-uz-hb': {
		title: 'Oʻzbekcha Muqaddas Kitob (Uzbek) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-uz-600.webp`,
	},
	'lang-uz-pb': {
		title: 'Oʻzbekcha Muqaddas Kitob (Uzbek) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-uz-600.webp`,
	},
	'lang-vi-hb': {
		title: 'Kinh Thánh Tiếng Việt (Vietnamese) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-vi-600.webp`,
	},
	'lang-vi-pb': {
		title: 'Kinh Thánh Tiếng Việt (Vietnamese) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-vi-600.webp`,
	},
	'lang-yo-hb': {
		title: 'Bíbélì Yorùbá (Yoruba) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-yo-600.webp`,
	},
	'lang-yo-pb': {
		title: 'Bíbélì Yorùbá (Yoruba) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-yo-600.webp`,
	},
	'lang-zu-hb': {
		title: 'IBhayibheli lesiZulu (Zulu) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-zu-600.webp`,
	},
	'lang-zu-pb': {
		title: 'IBhayibheli lesiZulu (Zulu) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-zu-600.webp`,
	},
};
// CATALOG LANGUAGE EDITIONS — GENERATED by fhb-chain.py edition-roster from ISBNS.json direct_sale (Kevin
// 2026-10-29: "People can go ahead and buy any of the 80 languages"). Never hand-edit: re-run it.
// An edition the chain lists is sold from its own LANGUAGE EDITIONS region above, which wins
// (the loop below never overwrites it). A language with no card cut yet shows the FHB cover.
const CATALOG_LANG_EDITIONS: Record<string, { title: string; retail: number; img: string }> = {
	'lang-af-hb': {
		title: 'Afrikaanse Bybel (Afrikaans) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-af-600.webp`,
	},
	'lang-af-pb': {
		title: 'Afrikaanse Bybel (Afrikaans) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-af-600.webp`,
	},
	'lang-nri-hb': {
		title: 'Chokri Ketholesi (Chokri Naga) — Hardback (pre-order)',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-nri-600.webp`,
	},
	'lang-nri-pb': {
		title: 'Chokri Ketholesi (Chokri Naga) — Paperback (pre-order)',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-nri-600.webp`,
	},
	'lang-gu-hb': {
		title: 'ગુજરાતી બાઇબલ (Gujarati) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-gu-600.webp`,
	},
	'lang-gu-pb': {
		title: 'ગુજરાતી બાઇબલ (Gujarati) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-gu-600.webp`,
	},
	'lang-ht-hb': {
		title: 'Bib Kreyòl Ayisyen (Haitian Creole) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-ht-600.webp`,
	},
	'lang-ht-pb': {
		title: 'Bib Kreyòl Ayisyen (Haitian Creole) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-ht-600.webp`,
	},
	'lang-hil-hb': {
		title: 'Hiligaynon nga Biblia (Hiligaynon) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-hil-600.webp`,
	},
	'lang-hil-pb': {
		title: 'Hiligaynon nga Biblia (Hiligaynon) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-hil-600.webp`,
	},
	'lang-ig-hb': {
		title: 'Baịbụl Igbo (Igbo) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-ig-600.webp`,
	},
	'lang-ig-pb': {
		title: 'Baịbụl Igbo (Igbo) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-ig-600.webp`,
	},
	'lang-ilo-hb': {
		title: 'Biblia nga Ilokano (Ilocano) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-ilo-600.webp`,
	},
	'lang-ilo-pb': {
		title: 'Biblia nga Ilokano (Ilocano) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-ilo-600.webp`,
	},
	'lang-nkf-hb': {
		title: 'Inpui Bathiangnu Chongdip (Inpui Naga) — Hardback (pre-order)',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-nkf-600.webp`,
	},
	'lang-nkf-pb': {
		title: 'Inpui Bathiangnu Chongdip (Inpui Naga) — Paperback (pre-order)',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-nkf-600.webp`,
	},
	'lang-jv-hb': {
		title: 'Kitab Suci Jawa (Javanese) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-jv-600.webp`,
	},
	'lang-jv-pb': {
		title: 'Kitab Suci Jawa (Javanese) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-jv-600.webp`,
	},
	'lang-kn-hb': {
		title: 'ಕನ್ನಡ ಬೈಬಲ್ (Kannada) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-kn-600.webp`,
	},
	'lang-kn-pb': {
		title: 'ಕನ್ನಡ ಬೈಬಲ್ (Kannada) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-kn-600.webp`,
	},
	'lang-ki-hb': {
		title: 'Bibilia ya Gĩkũyũ (Kikuyu) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-ki-600.webp`,
	},
	'lang-ki-pb': {
		title: 'Bibilia ya Gĩkũyũ (Kikuyu) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-ki-600.webp`,
	},
	'lang-rw-hb': {
		title: "Bibiliya y'Ikinyarwanda (Kinyarwanda) — Hardback",
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-rw-600.webp`,
	},
	'lang-rw-pb': {
		title: "Bibiliya y'Ikinyarwanda (Kinyarwanda) — Paperback",
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-rw-600.webp`,
	},
	'lang-sgc-hb': {
		title: 'Bukuit ne Tilil ab Kipsigis (Kipsigis) — Hardback (pre-order)',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-sgc-600.webp`,
	},
	'lang-sgc-pb': {
		title: 'Bukuit ne Tilil ab Kipsigis (Kipsigis) — Paperback (pre-order)',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-sgc-600.webp`,
	},
	'lang-rn-hb': {
		title: "Bibiliya y'Ikirundi (Kirundi) — Hardback",
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-rn-600.webp`,
	},
	'lang-rn-pb': {
		title: "Bibiliya y'Ikirundi (Kirundi) — Paperback",
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-rn-600.webp`,
	},
	'lang-ktu-hb': {
		title: 'Biblia ya Kituba (Kituba) — Hardback (pre-order)',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-ktu-600.webp`,
	},
	'lang-ktu-pb': {
		title: 'Biblia ya Kituba (Kituba) — Paperback (pre-order)',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-ktu-600.webp`,
	},
	'lang-kmr-hb': {
		title: 'Kitêba Pîroz a Kurmancî (Kurmanji Kurdish) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-kmr-600.webp`,
	},
	'lang-kmr-pb': {
		title: 'Kitêba Pîroz a Kurmancî (Kurmanji Kurdish) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-kmr-600.webp`,
	},
	'lang-mg-hb': {
		title: 'Baiboly Malagasy (Malagasy) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-mg-600.webp`,
	},
	'lang-mg-pb': {
		title: 'Baiboly Malagasy (Malagasy) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-mg-600.webp`,
	},
	'lang-ms-hb': {
		title: 'Alkitab Melayu (Malay) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-ms-600.webp`,
	},
	'lang-ms-pb': {
		title: 'Alkitab Melayu (Malay) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-ms-600.webp`,
	},
	'lang-ml-hb': {
		title: 'മലയാളം ബൈബിൾ (Malayalam) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-ml-600.webp`,
	},
	'lang-ml-pb': {
		title: 'മലയാളം ബൈബിൾ (Malayalam) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-ml-600.webp`,
	},
	'lang-nag-hb': {
		title: 'Nagamese Pobitro Kitab (Nagamese) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-nag-600.webp`,
	},
	'lang-nag-pb': {
		title: 'Nagamese Pobitro Kitab (Nagamese) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-nag-600.webp`,
	},
	'lang-or-hb': {
		title: 'ଓଡ଼ିଆ ବାଇବଲ (Odia) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-or-600.webp`,
	},
	'lang-or-pb': {
		title: 'ଓଡ଼ିଆ ବାଇବଲ (Odia) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-or-600.webp`,
	},
	'lang-om-hb': {
		title: 'Macaafa Qulqulluu Oromoo (Oromo) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-om-600.webp`,
	},
	'lang-om-pb': {
		title: 'Macaafa Qulqulluu Oromoo (Oromo) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-om-600.webp`,
	},
	'lang-ps-hb': {
		title: 'د پښتو سپیڅلی کتاب (Pashto) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-ps-600.webp`,
	},
	'lang-ps-pb': {
		title: 'د پښتو سپیڅلی کتاب (Pashto) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-ps-600.webp`,
	},
	'lang-sd-hb': {
		title: 'سنڌي بائيبل (Sindhi) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-sd-600.webp`,
	},
	'lang-sd-pb': {
		title: 'سنڌي بائيبل (Sindhi) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-sd-600.webp`,
	},
	'lang-so-hb': {
		title: 'Kitaabka Quduuska ah ee Soomaaliga (Somali) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-so-600.webp`,
	},
	'lang-so-pb': {
		title: 'Kitaabka Quduuska ah ee Soomaaliga (Somali) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-so-600.webp`,
	},
	'lang-azb-hb': {
		title: 'تۆرکجه موقدس کتاب (South Azerbaijani) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-azb-600.webp`,
	},
	'lang-azb-pb': {
		title: 'تۆرکجه موقدس کتاب (South Azerbaijani) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-azb-600.webp`,
	},
	'lang-th-hb': {
		title: 'พระคัมภีร์​ไทย (Thai) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-th-600.webp`,
	},
	'lang-th-pb': {
		title: 'พระคัมภีร์​ไทย (Thai) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-th-600.webp`,
	},
	'lang-ti-hb': {
		title: 'ናይ ትግርኛ መጽሓፍ ቅዱስ (Tigrinya) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-ti-600.webp`,
	},
	'lang-ti-pb': {
		title: 'ናይ ትግርኛ መጽሓፍ ቅዱስ (Tigrinya) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-ti-600.webp`,
	},
	'lang-ak-hb': {
		title: 'Twi Twerɛ Kronkron (Twi) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-ak-600.webp`,
	},
	'lang-ak-pb': {
		title: 'Twi Twerɛ Kronkron (Twi) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-ak-600.webp`,
	},
	'lang-xh-hb': {
		title: 'IBhayibhile yesiXhosa (Xhosa) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-xh-600.webp`,
	},
	'lang-xh-pb': {
		title: 'IBhayibhile yesiXhosa (Xhosa) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-xh-600.webp`,
	},
	'lang-yaf-hb': {
		title: 'Masonuku Matoma ma Kiyaka (Yaka) — Hardback (pre-order)',
		retail: 9999,
		img: `${ASSETS}/lang/v2/lang-yaf-600.webp`,
	},
	'lang-yaf-pb': {
		title: 'Masonuku Matoma ma Kiyaka (Yaka) — Paperback (pre-order)',
		retail: 7999,
		img: `${ASSETS}/lang/v2/lang-yaf-600.webp`,
	},
};
for (const [sku, e] of Object.entries(CATALOG_LANG_EDITIONS))
	if (!(sku in EDITIONS)) EDITIONS[sku] = e;
// END CATALOG LANGUAGE EDITIONS

// BOOKS THAT ARE NOT BIBLES, sold through this same checkout (Kevin 2026-11-10: "point Beloved Identity to
// FHB too. Build a checkout page to be fulfilled through ingram"). Kept in its own block, outside EDITIONS,
// so pricing-verify (which proves every EDITIONS SKU is on the Bible order forms, weighs one product on the
// ladder, and matches ISBNS.json) is not asked to treat a $9.99 book as a Bible.
//   `books: 0`  = it adds NOTHING to the Bible volume ladder (Kevin: no volume discount, and it does not
//                 count toward the Bible tiers). It is still a physical copy: far-band quotes, expedited
//                 shipping and the fulfilment count use volumesFor, which is 1.
//   Discounts   = none. order-pricing.ts DISCOUNT_EXEMPT keeps it at list price under every offer.
// FHB-BOOKS (Kevin 2026-11-13 L1959): every book format comes from src/data/books.json (adding a book = data).
// Beloved Identity's row carries the exact values this block held by hand (Kevin 2026-11-10), so its Stripe
// line is unchanged. A book whose status is not "live" is not sellable here.
const US_CARD_PCT = 0.029;
const US_CARD_FIXED_USD = 0.3;
/** FHB-BOOKS: Stripe metadata for every book line in a cart, for author reporting (Kevin 2026-11-13: title,
 *  ISBN, format, country, date, net). net_usd = per-copy net after Stripe's fee and the book's MEASURED landed
 *  cost for that country (marginGuard.netPerItemUsd, the same figure the margin floor uses), times qty.
 *  US: the book's measured us_cost_usd and Stripe's US card fee; a book without one records net_usd=unmeasured. */
export function bookSaleMetadata(
	counts: Record<string, number>,
	destCode: string,
	dest: Parameters<typeof netPerItemUsd>[2] | null,
	pct: number,
	now = new Date(),
): Record<string, string> {
	const out: Record<string, string> = {};
	let k = 0;
	for (const [slug, qty] of Object.entries(counts)) {
		const b = BOOK_SKUS[slug];
		if (!b || qty <= 0) continue;
		const unit = paidUnit(slug, EDITIONS[slug].retail, pct);
		const fee = dest ? handlingFeeCents(slug, unit, dest) : 0;
		// US: no country-list cost row, so the book's own MEASURED US cost (book-skus.json us_cost_usd) and
		// Stripe's standard US card fee (2.9% + 30c); unmeasured stays 'unmeasured', never a guess.
		const us = BOOK_SKUS[slug].usCostUsd;
		const per = dest
			? netPerItemUsd(slug, unit, dest, fee)
			: destCode === 'US' && us != null
				? unit / 100 - (unit / 100) * US_CARD_PCT - US_CARD_FIXED_USD - us
				: null;
		const net = per == null ? 'unmeasured' : (per * qty).toFixed(2);
		k += 1;
		out[`metadata[book_${k}]`] = [
			`title=${b.title}`,
			`isbn=${b.isbn}`,
			`format=${b.format}`,
			`qty=${qty}`,
			`unit_cents=${unit}`,
			`fee_cents=${fee}`,
			`country=${destCode}`,
			`date=${now.toISOString().slice(0, 10)}`,
			`net_usd=${net}`,
		]
			.join('|')
			.slice(0, 500);
	}
	if (k) out['metadata[book_lines]'] = String(k);
	return out;
}

// 3ee-1 (pmseoaeo 2026-11-13): BIBLE sales carry the same fields as book sales. ISBNs come from
// src/data/isbn-list.json, GENERATED from the publisher's ISBN master (projects/fhb-isbn-list/build.py); nothing
// is typed here. Server-only on purpose: order-pricing.ts is in the browser bundle and this table is not.
type IsbnPair = { hb: string; pb: string };
const ISBN_LIST = isbnList as unknown as {
	general: (IsbnPair & { colour: string })[];
	audience: (IsbnPair & { slug: string })[];
	journaling: IsbnPair;
	largePrint: (IsbnPair & { vol: number })[];
	languages: (IsbnPair & { code?: string })[];
};
const ISBN_BY_STEM: Record<string, IsbnPair> = {
	...Object.fromEntries(
		ISBN_LIST.general.map((g) => [`general-regular-${g.colour.toLowerCase()}`, g]),
	),
	...Object.fromEntries(ISBN_LIST.audience.map((a) => [a.slug, a])),
	journaling: ISBN_LIST.journaling,
	...Object.fromEntries(ISBN_LIST.largePrint.map((v) => [`lp-vol${v.vol}`, v])),
	...Object.fromEntries(
		ISBN_LIST.languages.filter((l) => l.code).map((l) => [`lang-${l.code}`, l]),
	),
};

/** ISBN + format of a Bible SKU (<stem>-hb|pb). The Large Print SET has no ISBN of its own: 'none'.
 *  null = unmappable (the caller writes isbn=unresolved; scripts/bible-sale-metadata.test.mjs fails the build). */
export function bibleSkuIsbn(
	slug: string,
): { isbn: string; format: 'Hardback' | 'Paperback' } | null {
	const m = /^(.+)-(hb|pb)$/.exec(slug);
	if (!m) return null;
	const format = m[2] === 'hb' ? 'Hardback' : 'Paperback';
	if (m[1] === 'lp-set') return { isbn: 'none', format };
	const isbn = ISBN_BY_STEM[m[1]]?.[m[2] as 'hb' | 'pb'];
	return isbn ? { isbn, format } : null;
}

/** Stripe allows 50 metadata keys per session. */
export const STRIPE_META_KEYS_MAX = 50;

/** 3ee-1: one line per Bible SKU, the book fields (title|isbn|format|qty|unit_cents|fee_cents|country|date|
 *  net_usd), lines joined by ';' and PACKED into bible_1, bible_2… each under Stripe's 500-char value cap, never
 *  past `keyBudget` keys (a 100-SKU cart must not break the 50-key limit). Lines that do not fit are COUNTED in
 *  bible_unrecorded, never silently lost, and never fail the checkout. net_usd: measured landed cost for the
 *  country (same figure as the margin floor); the US has no measured Bible cost, so US = unmeasured. */
export function bibleSaleMetadata(
	counts: Record<string, number>,
	destCode: string,
	dest: Parameters<typeof netPerItemUsd>[2] | null,
	pct: number,
	keyBudget: number,
	now = new Date(),
): Record<string, string> {
	const lines: string[] = [];
	for (const [slug, qty] of Object.entries(counts)) {
		if (qty <= 0 || BOOK_SKUS[slug] || !EDITIONS[slug]) continue;
		const unit = paidUnit(slug, EDITIONS[slug].retail, pct);
		const fee = dest ? handlingFeeCents(slug, unit, dest) : 0;
		const per = dest ? netPerItemUsd(slug, unit, dest, fee) : null;
		const id = bibleSkuIsbn(slug);
		lines.push(
			[
				`title=${EDITIONS[slug].title.replace(/[;|]/g, ',').slice(0, 90)}`,
				`isbn=${id?.isbn ?? 'unresolved'}`,
				`format=${id?.format ?? 'unknown'}`,
				`qty=${qty}`,
				`unit_cents=${unit}`,
				`fee_cents=${fee}`,
				`country=${destCode}`,
				`date=${now.toISOString().slice(0, 10)}`,
				`net_usd=${per == null ? 'unmeasured' : (per * qty).toFixed(2)}`,
			].join('|'),
		);
	}
	const out: Record<string, string> = {};
	if (!lines.length) return out;
	// Reserve bible_lines + bible_unrecorded so the count keys always fit.
	const maxChunks = Math.max(0, keyBudget - 2);
	const chunks: string[] = [];
	let cur = '';
	let inCur = 0; // lines in `cur`
	let stored = 0; // lines in pushed chunks
	for (const l of lines) {
		if (cur && cur.length + 1 + l.length <= META_VALUE_MAX) {
			cur = `${cur};${l}`;
			inCur++;
			continue;
		}
		if (cur) {
			chunks.push(cur);
			stored += inCur;
		}
		cur = '';
		inCur = 0;
		if (chunks.length >= maxChunks) break;
		cur = l.slice(0, META_VALUE_MAX);
		inCur = 1;
	}
	if (cur && chunks.length < maxChunks) {
		chunks.push(cur);
		stored += inCur;
	}
	chunks.forEach((c, i) => {
		out[`metadata[bible_${i + 1}]`] = c;
	});
	out['metadata[bible_lines]'] = String(lines.length);
	if (stored < lines.length) out['metadata[bible_unrecorded]'] = String(lines.length - stored);
	return out;
}

const BOOK_EDITIONS: Record<
	string,
	{ title: string; retail: number; img: string; books: number; name: string; desc: string }
> = Object.fromEntries(
	(booksCatalog.books as { status: string; formats: string[] }[])
		.filter((b) => b.status === 'live')
		.flatMap((b) =>
			b.formats.map((sku) => {
				const f = (bookSkus.skus as Record<string, Record<string, unknown>>)[sku];
				return [
					sku,
					{
						title: f.checkout_title as string,
						name: f.checkout_name as string,
						desc: f.checkout_desc as string,
						retail: f.list_cents as number,
						books: 0,
						img: f.checkout_img as string,
					},
				];
			}),
		),
);
for (const [sku, e] of Object.entries(BOOK_EDITIONS)) EDITIONS[sku] = e;

// The SET MUST NEVER COST MORE than the same three volumes bought separately, in either
// binding. Kevin's prices satisfy it today (299.99 < 329.97 HB, 249.99 < 279.97 PB), but a
// later edit to one volume's price could silently invert it, and a "set" that costs more
// than its parts is the kind of defect a buyer finds before we do. Checked at module load so
// a bad price cannot reach a checkout session, and asserted directly by the unit test.
export const setSavings = (binding: 'pb' | 'hb') => {
	const parts = (['lp-vol1', 'lp-vol2', 'lp-vol3'] as const).reduce(
		(s, v) => s + EDITIONS[`${v}-${binding}`].retail,
		0,
	);
	return parts - EDITIONS[`lp-set-${binding}`].retail;
};
for (const binding of ['pb', 'hb'] as const) {
	if (setSavings(binding) < 0) {
		throw new Error(
			`Large Print set (${binding}) costs more than its three volumes bought separately — ` +
				'fix the prices in projects/fhb-print-bible/editions/ISBNS.json and here.',
		);
	}
}

// Volume ladder. 1–9 pays full price; the published tiers stop at 250 because anyone
// buying 500+ negotiates directly, and publishing a 40% tier would permanently anchor the
// book at $59.99 (Kevin 2026-08-23, after reviewing category benchmarks).
// MUST match src/pages/print.astro `tiers`.
const TIERS: { min: number; pct: number }[] = [
	{ min: 250, pct: 30 },
	{ min: 100, pct: 25 },
	{ min: 50, pct: 20 },
	{ min: 25, pct: 15 },
	{ min: 10, pct: 10 },
	{ min: 1, pct: 0 },
];
const tierFor = (total: number) => TIERS.find((t) => total >= t.min) ?? null;

// Physical books have no book-specific Stripe tax code; General – Tangible Goods lets
// Stripe Tax apply each state's rules.
const TAX_CODE = 'txcd_99999999';

export const EMAIL_RE = /^[^\s@'"\\]+@[^\s@'"\\]+\.[^\s@'"\\]+$/;
export function encodeForm(obj: Record<string, string | number>): string {
	return Object.entries(obj)
		.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
		.join('&');
}

/** What the order form posts. */
export type OrderPayload = {
	counts?: Record<string, number>;
	returnPath?: string;
	email?: string;
	country?: string;
	/** the order form asks: is this email a first order? (no session is created) */
	firstOrderCheck?: boolean;
};
/** The caller's Stripe-backed pieces (same calls, same order, as before the extraction). */
export type EngineDeps = {
	/** a Stripe key is bound (else the order is answered { disabled: true }) */
	enabled: boolean;
	isFirstOrder: (email: string) => Promise<boolean>;
	firstOrderPromo: () => Promise<string | null>;
};
export type EngineResult =
	| { status: number; body: unknown }
	| { form: Record<string, string | number> };

/** One order -> the Stripe Checkout Session form, or the refusal the endpoint answers with. */
export async function checkoutForm(
	payload: OrderPayload,
	requestUrl: string,
	deps: EngineDeps,
): Promise<EngineResult> {
	const reply = (body: unknown, status = 200): EngineResult => ({ status, body });
	const counts: Record<string, number> = {};
	for (const slug of Object.keys(EDITIONS)) {
		const n = Math.floor(Number(payload.counts?.[slug] ?? 0));
		if (!Number.isFinite(n) || n < 0) return reply({ error: 'invalid_selection' }, 400);
		counts[slug] = n;
	}
	// THRESHOLDS COUNT PRODUCTS, one per SKU in the cart (Kevin 2026-09-17). A set is one
	// product however many volumes are in the box, so four sets are four products — the
	// same arithmetic as four of anything else.
	const total = Object.entries(counts).reduce(
		(s, [slug, n]) => s + n * (EDITIONS[slug].books ?? 1),
		0,
	);
	// A discount-exempt book adds nothing to the ladder (books: 0), so a cart of only that book has a
	// Bible total of 0: it is a real order with no tier and nothing the discounts can apply to.
	const exemptQty = Object.entries(counts).reduce(
		(s, [slug, n]) => s + (isDiscountExempt(slug) ? n : 0),
		0,
	);
	const tier = total < 1 && exemptQty > 0 ? { min: 0, pct: 0 } : tierFor(total);
	// tierFor covers everything from 1 upward, so a null here means an empty order.
	if ((total < 1 && exemptQty < 1) || tier === null) return reply({ error: 'empty' }, 400);
	// One line item per SKU, and Stripe refuses a session with more than 100 of them.
	if (Object.values(counts).filter((n) => n > 0).length > MAX_LINE_ITEMS) {
		return reply(
			{
				error: 'too_many_items',
				message: `One order can hold up to ${MAX_LINE_ITEMS} different editions. Please split it into two orders.`,
			},
			400,
		);
	}

	// FAR-BAND BULK QUOTE (unit 2kx, Kevin 2026-11-09): 10+ physical copies to a far_band country
	// are never sold here. Refused before any Stripe call, whatever the client sent.
	const destCode = String(payload.country ?? 'US').toUpperCase();
	const dest = countryFor(destCode);
	const copies = Object.entries(counts).reduce((s, [slug, n]) => s + n * volumesFor(slug), 0);
	if (bulkQuoteRequired(dest?.farBand, copies)) {
		return reply({ error: 'bulk_quote_required', message: BULK_QUOTE_COPY.error }, 400);
	}

	if (!deps.enabled) {
		return reply({ disabled: true, message: 'Checkout is not enabled yet.' });
	}

	// The apex router proxies this request, so new URL(request.url).origin resolves to
	// the raw Pages host and buyers were returned to fathersheartbible.pages.dev after
	// paying. Rewrite ONLY the production Pages host: preview deployments carry a
	// subdomain (dev.… / <hash>.…) and must keep sending their test purchases to
	// themselves, not to production.
	// Best discount, never both: the first-order 15% replaces the volume tier only when it is
	// larger AND this email has never paid before. Tie or larger tier → the tier, no lookup.
	const email = String(payload.email ?? '').trim();
	const validEmail = email.length <= 254 && EMAIL_RE.test(email);
	// MARGIN FLOOR + INTERNATIONAL HANDLING (units 2jz, 2kj). Destination: defaults to US (every form
	// before international shipping). A country that is not in the LIVE list (pending, unknown,
	// malformed) is refused, never passed to Stripe. US is outside the guard and shows no fee; every
	// other country needs a landed cost, or the sale cannot be sized and is refused (fail closed).
	const intl = destCode !== 'US';
	if (dest && intl && !dest.landed_cost_usd) {
		return reply(
			{ error: 'country_not_served', message: 'We do not ship to that country yet.' },
			400,
		);
	}
	// Every book has its own measured landed cost per country (landed_cost_usd.<costKey>, e.g. bi for
	// Beloved Identity). A country without one cannot be sized, so that book is refused there rather than
	// priced off a Bible's cost (fail closed).
	const unsized = Object.entries(counts).some(
		([slug, n]) =>
			n > 0 && BOOK_SKUS[slug] && dest?.landed_cost_usd?.[BOOK_SKUS[slug].costKey] == null,
	);
	if (intl && unsized) {
		return reply(
			{ error: 'country_not_served', message: 'We do not ship that book to that country yet.' },
			400,
		);
	}
	const lines = Object.entries(counts)
		.filter(([, n]) => n > 0)
		.map(([slug]) => ({ slug, retail: EDITIONS[slug].retail }));
	// Only Bibles can take a discount; a cart of nothing else has none to apply.
	const discountable = Object.entries(counts).some(([slug, n]) => n > 0 && !isDiscountExempt(slug));
	// A cart holding an exempt book takes the first-order 15% per Bible unit instead of Stripe's
	// order-wide coupon, exactly like international carts, because the coupon would discount the book.
	const perUnitPromo = intl || exemptQty > 0;
	let promo: string | null = null;
	// 1A (Kevin 2026-11-08): WELCOME15 is offered to EVERYONE, every country. The margin check is
	// now only the backstop (handling is sized to the floor, so it drops a discount only when the
	// fee cannot reach it, or the landed cost is unknown).
	// Far band: no volume ladder at all, so the first-order 15% is the only discount on offer.
	const tierPctNow = tierPctFor(dest?.farBand, tier.pct);
	if (discountable && validEmail && FIRST_ORDER_PCT > tierPctNow) {
		const m = marginCheck(lines, FIRST_ORDER_PCT, destCode);
		if (!m.ok) {
			console.log(`margin-guard: dropped ${FIRST_ORDER_CODE}: ${m.reason}`);
		} else if (await deps.isFirstOrder(email)) {
			promo = await deps.firstOrderPromo();
		}
	}
	let pct = promo ? 0 : discountable ? tierPctNow : 0;
	if (!promo && pct > 0) {
		const m = marginCheck(lines, pct, destCode);
		if (!m.ok) {
			console.log(`margin-guard: dropped ${pct}% volume tier: ${m.reason}`);
			pct = 0;
		}
	}
	// Outside the US the first-order discount is taken off each unit instead of by Stripe's coupon,
	// because a percent-off coupon discounts EVERY line, and the handling line must not be discounted
	// (the floor is sized on it). The buyer sees the same 15% as unit prices; the US is unchanged.
	// Last guard, whatever happened above: the order as it will be charged, handling included, must
	// net the floor. If it does not at the discounted price, charge list price; if still not, refuse.
	if (intl) {
		const last = marginCheck(lines, promo ? FIRST_ORDER_PCT : pct, destCode);
		if (!last.ok) {
			if (!marginCheck(lines, 0, destCode).ok) {
				return reply(
					{ error: 'country_not_served', message: 'We cannot ship that order to that country.' },
					400,
				);
			}
			console.log(`margin-guard: backstop dropped discount: ${last.reason}`);
			promo = null;
			pct = 0;
		}
	}
	const unitPctFinal = perUnitPromo && promo ? FIRST_ORDER_PCT : pct;
	const useCode = Boolean(promo) && !perUnitPromo;
	// `copies` = physical volumes (a Large Print set is three), which scales the expedited price.
	const shipForm = checkoutShippingForm(payload.country ?? 'US', copies);
	if (!shipForm) {
		return reply(
			{ error: 'country_not_served', message: 'We do not ship to that country yet.' },
			400,
		);
	}
	// The per-copy handling lines: one Stripe line per (binding, fee) with quantity = units, named
	// for the destination (EU: "Import & handling"). Zero where the floor is already met.
	const handling: { binding: string; fee: number; qty: number }[] = [];
	if (dest && intl) {
		for (const [slug, qty] of Object.entries(counts)) {
			if (qty <= 0) continue;
			const fee = handlingFeeCents(slug, paidUnit(slug, EDITIONS[slug].retail, unitPctFinal), dest);
			if (fee <= 0) continue;
			const binding = slug.endsWith('-hb') ? 'hardback' : 'paperback';
			const row = handling.find((h) => h.binding === binding && h.fee === fee);
			if (row) row.qty += qty;
			else handling.push({ binding, fee, qty });
		}
	}
	if (Object.values(counts).filter((n) => n > 0).length + handling.length > MAX_LINE_ITEMS) {
		return reply(
			{
				error: 'too_many_items',
				message: `One order can hold up to ${MAX_LINE_ITEMS} different editions. Please split it into two orders.`,
			},
			400,
		);
	}

	const reqUrl = new URL(requestUrl);
	const origin =
		reqUrl.hostname === 'fathersheartbible.pages.dev'
			? 'https://fathersheartbible.com'
			: reqUrl.origin;
	const form: Record<string, string | number> = {
		mode: 'payment',
		// /order re-reads the session from Stripe and shows the buyer what they bought.
		// This used to be /print?order=success, which print.astro never read — so a buyer
		// landed back on the same order form with no acknowledgement (found 2026-09-03).
		success_url: `${origin}/order?s={CHECKOUT_SESSION_ID}`,
		// A language edition's quick order form (/bibles/<language>-bible/#order) sends its own
		// path so a cancelled checkout returns there. Only that exact shape is accepted — any
		// other value falls back to /print, so this can never become an open redirect.
		cancel_url: /^\/bibles\/[a-z0-9-]+-bible\/$/.test(payload.returnPath ?? '')
			? `${origin}${payload.returnPath}?order=canceled#order`
			: payload.returnPath === '/print/order/'
				? `${origin}/print/order/?order=canceled`
				: /^\/books\/[a-z0-9-]+\/$/.test(String(payload.returnPath ?? '')) &&
						(booksCatalog.books as { slug: string }[]).some(
							(b) => payload.returnPath === `/books/${b.slug}/`,
						)
					? `${origin}${payload.returnPath}?order=canceled#order`
					: `${origin}/print/?order=canceled#bulk-order`,
		'automatic_tax[enabled]': 'true',
		// Country, shipping rate + delivery estimate, REQUIRED phone and the address-form hint all
		// come from src/data/ship-countries.json via checkoutShippingForm (unit 2js). US ships free
		// (baked into the unit price); a country with a rate adds it as the Stripe shipping option.
		...shipForm,
		'metadata[kind]': 'dvc_print',
		// Physical copies, as the fulfilment email's subject and its "9+ copies" wording read it; the
		// Bible ladder count (which a discount-exempt book does not touch) travels as ladder_total.
		'metadata[total]': copies,
		'metadata[ladder_total]': total,
		'metadata[pct_off]': promo ? FIRST_ORDER_PCT : pct,
		'metadata[handling_cents]': handling.reduce((t, h) => t + h.fee * h.qty, 0),
		'metadata[offer]': promo ? 'first_order' : pct > 0 ? 'volume' : 'none',
		// Split under Stripe's 500-char value cap (an 82-SKU cart was one 1,138-char value: 502).
		...packBreakdown(counts),
		// FHB-BOOKS (Kevin 2026-11-13): every BOOK sale carries title / ISBN / format / country / date / net
		// for author reporting. One value per book line (under Stripe's 500-char cap): see bookSaleMetadata.
		...bookSaleMetadata(counts, destCode, intl ? dest : null, unitPctFinal),
	};
	// 3ee-1: Bible lines carry the same sale fields, packed into whatever keys Stripe's 50-key limit leaves.
	Object.assign(
		form,
		bibleSaleMetadata(
			counts,
			destCode,
			intl ? dest : null,
			unitPctFinal,
			STRIPE_META_KEYS_MAX - Object.keys(form).filter((k) => k.startsWith('metadata[')).length,
		),
	);

	let li = 0;
	for (const [slug, qty] of Object.entries(counts)) {
		if (qty <= 0) continue;
		const e = EDITIONS[slug];
		const unit = paidUnit(slug, e.retail, unitPctFinal);
		form[`line_items[${li}][quantity]`] = qty;
		form[`line_items[${li}][price_data][currency]`] = 'usd';
		form[`line_items[${li}][price_data][unit_amount]`] = unit;
		form[`line_items[${li}][price_data][tax_behavior]`] = 'exclusive';
		form[`line_items[${li}][price_data][product_data][name]`] =
			e.name ?? `Father’s Heart Bible™ — ${e.title}`;
		form[`line_items[${li}][price_data][product_data][description]`] =
			e.desc ??
			(perUnitPromo && promo
				? `Divine Voice Color · Complete Bible · ${FIRST_ORDER_PCT}% off your first order · free shipping`
				: pct > 0
					? `Divine Voice Color · Complete Bible · ${pct}% volume discount · free shipping`
					: 'Divine Voice Color · Complete Bible · free shipping');
		form[`line_items[${li}][price_data][product_data][images][0]`] = e.img;
		form[`line_items[${li}][price_data][product_data][tax_code]`] = TAX_CODE;
		li++;
	}
	// Handling lines come after the books and are never discounted (see the first-order note above).
	for (const h of handling) {
		form[`line_items[${li}][quantity]`] = h.qty;
		form[`line_items[${li}][price_data][currency]`] = 'usd';
		form[`line_items[${li}][price_data][unit_amount]`] = h.fee;
		form[`line_items[${li}][price_data][tax_behavior]`] = 'exclusive';
		form[`line_items[${li}][price_data][product_data][name]`] = handlingLabel(destCode);
		form[`line_items[${li}][price_data][product_data][description]`] =
			`Per ${h.binding} copy · ${dest?.name ?? destCode}`;
		form[`line_items[${li}][price_data][product_data][tax_code]`] = 'txcd_92010001';
		li++;
	}

	if (validEmail) form.customer_email = email;
	// Abandoned-checkout recovery (Kevin 2026-11-11 "1 C"): an expired session gets a recovery URL.
	// consent_collection[promotions] (which lets Stripe email it) is refused until the Stripe
	// dashboard's Checkout terms are accepted — tested 2026-11-11, so it is not set here.
	form['after_expiration[recovery][enabled]'] = 'true';
	// Pre-applied, so the buyer never types it; Stripe shows WELCOME15 on the summary and counts
	// its redemptions. Units above are at list price when it applies — the two never stack.
	if (promo && useCode) form['discounts[0][promotion_code]'] = promo;

	return { form };
}
