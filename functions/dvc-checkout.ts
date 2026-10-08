// /dvc-checkout — Divine Voice Color print orders (Cloudflare Pages Function).
//
//   POST /dvc-checkout  { counts: { teen: 2, dads: 1, journaling: 1, … } }
//     → { url }            Stripe Checkout Session URL (redirect the browser)
//     → { error:"empty" }  nothing selected
//     → { disabled:true }  no Stripe key bound (dev / pre-launch)
//
// ONE checkout for every quantity, unlike the retired /print-checkout which had a
// 25-copy minimum (Kevin 2026-08-23: "1 check out with up to 9 individual bibles at
// full price then volume discounts added according to quantities ordered").
//
// The COMBINED total across every edition, colour and binding sets the tier — mix and
// match. Prices are authoritative HERE, server-side, so the browser cannot tamper with them.
//
// SHIPPING IS FREE and baked into the unit price. Chosen over a 5% discount because a
// discount would put our direct price below Amazon's list and invite Amazon to price-match;
// free shipping leaves list price intact everywhere and is worth more to the buyer.
//
// NB: path is /dvc-checkout, not /api/* — the apex router proxies /api/* to the community
// app, so this marketing function must live off that prefix.

import { FIRST_ORDER_CODE, FIRST_ORDER_PCT, unitAfter } from '../src/lib/order-pricing';

interface Env {
	STRIPE_FHB_SECRET_KEY?: string;
}

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
const EDITIONS: Record<string, { title: string; retail: number; img: string; books?: number }> = {
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
		img: `${ASSETS}/lang/v1/lang-it-600.webp`,
	},
	'lang-it-pb': {
		title: 'Bibbia Italiana (Italian) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-it-600.webp`,
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
		img: `${ASSETS}/lang/v1/lang-mr-600.webp`,
	},
	'lang-mr-pb': {
		title: 'मराठी बायबल (Marathi) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-mr-600.webp`,
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
	'lang-sw-hb': {
		title: 'Biblia ya Kiswahili (Swahili) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-sw-600.webp`,
	},
	'lang-sw-pb': {
		title: 'Biblia ya Kiswahili (Swahili) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-sw-600.webp`,
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
		img: `${ASSETS}/lang/v1/lang-zh-hant-600.webp`,
	},
	'lang-zh-hant-pb': {
		title: '中文聖經 (Traditional Chinese) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-zh-hant-600.webp`,
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
	'lang-vi-hb': {
		title: 'Kinh Thánh Tiếng Việt (Vietnamese) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-vi-600.webp`,
	},
	'lang-vi-pb': {
		title: 'Kinh Thánh Tiếng Việt (Vietnamese) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-vi-600.webp`,
	}, // 2026-10-07 (Kevin, 33 languages): the five editions live after the first 26 — prices from
	// each sheet's top table ($99.99 / $79.99), cards cut from the built case (lang/v2).
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
	// Amharic + Zulu (Kevin 2026-10-07: "orders fulfilled by SMP so we will fulfill any orders as
	// soon as bibles are published"): sold now at the standard language prices; card = the approved
	// design_fronts.py front on lang/v1 until a case is built.
	'lang-am-hb': {
		title: 'የአማርኛ መጽሐፍ ቅዱስ (Amharic) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-am-600.webp`,
	},
	'lang-am-pb': {
		title: 'የአማርኛ መጽሐፍ ቅዱስ (Amharic) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-am-600.webp`,
	},
	'lang-zu-hb': {
		title: 'IBhayibheli lesiZulu (Zulu) — Hardback',
		retail: 9999,
		img: `${ASSETS}/lang/v1/lang-zu-600.webp`,
	},
	'lang-zu-pb': {
		title: 'IBhayibheli lesiZulu (Zulu) — Paperback',
		retail: 7999,
		img: `${ASSETS}/lang/v1/lang-zu-600.webp`,
	},
	// Romanian (live 2026-10-08, Ingram CSS9722429/CSS9722440): standard language prices from
	// ISBNS.json; card cut from the built case (lang/v2).
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
};

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

// FIRST ORDER, 15% (Kevin 2026-10-03; WELCOME15). Stripe's own first_time_transaction check
// cannot be trusted alone: every guest checkout creates a FRESH Customer, so a repeat buyer
// always looks new to it (MEASURED 2026-10-03: a session pre-applying the code for an email
// with two paid orders was created at the discounted total). So the server decides, from the
// store's own record: a prior PAID Checkout Session under this email, or a succeeded charge on
// a Customer with this email, means it is not a first order. The session-list email filter is
// case-sensitive, so the address is tried as typed and lowercased. Any lookup failure answers
// "not first" — the buyer still gets the volume tier; we never give the offer on a guess.
const EMAIL_RE = /^[^\s@'"\\]+@[^\s@'"\\]+\.[^\s@'"\\]+$/;
async function isFirstOrder(email: string, key: string): Promise<boolean> {
	const get = async (path: string) => {
		const r = await fetch(`https://api.stripe.com/v1/${path}`, {
			headers: { authorization: `Bearer ${key}` },
		});
		if (!r.ok) throw new Error(`stripe ${r.status}`);
		return (await r.json()) as { data: Record<string, unknown>[] };
	};
	try {
		for (const e of new Set([email, email.toLowerCase()])) {
			const s = await get(
				`checkout/sessions?status=complete&limit=10&customer_details[email]=${encodeURIComponent(e)}`,
			);
			if (s.data.some((x) => x.payment_status === 'paid')) return false;
		}
		const c = await get(
			`customers/search?limit=10&query=${encodeURIComponent(`email:'${email.toLowerCase()}'`)}`,
		);
		for (const cust of c.data) {
			const ch = await get(`charges?limit=10&customer=${cust.id}`);
			if (ch.data.some((x) => x.paid === true && x.status === 'succeeded')) return false;
		}
		return true;
	} catch {
		return false;
	}
}

/** The live WELCOME15 promotion code, only if its coupon still says FIRST_ORDER_PCT. */
async function firstOrderPromo(key: string): Promise<string | null> {
	try {
		const r = await fetch(
			`https://api.stripe.com/v1/promotion_codes?active=true&limit=1&code=${FIRST_ORDER_CODE}`,
			{ headers: { authorization: `Bearer ${key}` } },
		);
		if (!r.ok) return null;
		const d = (await r.json()) as {
			data: { id: string; coupon?: { percent_off?: number; valid?: boolean } }[];
		};
		const p = d.data[0];
		return p && p.coupon?.valid && p.coupon.percent_off === FIRST_ORDER_PCT ? p.id : null;
	} catch {
		return null;
	}
}

function encodeForm(obj: Record<string, string | number>): string {
	return Object.entries(obj)
		.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
		.join('&');
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { request, env } = context;
	const json = (body: unknown, status = 200) =>
		new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

	let payload: { counts?: Record<string, number>; returnPath?: string; email?: string };
	try {
		payload = await request.json();
	} catch {
		return json({ error: 'bad_request' }, 400);
	}

	const counts: Record<string, number> = {};
	for (const slug of Object.keys(EDITIONS)) {
		const n = Math.floor(Number(payload.counts?.[slug] ?? 0));
		if (!Number.isFinite(n) || n < 0) return json({ error: 'invalid_selection' }, 400);
		counts[slug] = n;
	}
	// THRESHOLDS COUNT PRODUCTS, one per SKU in the cart (Kevin 2026-09-17). A set is one
	// product however many volumes are in the box, so four sets are four products — the
	// same arithmetic as four of anything else.
	const total = Object.entries(counts).reduce(
		(s, [slug, n]) => s + n * (EDITIONS[slug].books ?? 1),
		0,
	);
	const tier = tierFor(total);
	// tierFor covers everything from 1 upward, so a null here means an empty order.
	if (total < 1 || tier === null) return json({ error: 'empty' }, 400);

	if (!env.STRIPE_FHB_SECRET_KEY) {
		return json({ disabled: true, message: 'Checkout is not enabled yet.' });
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
	let promo: string | null = null;
	if (
		validEmail &&
		FIRST_ORDER_PCT > tier.pct &&
		(await isFirstOrder(email, env.STRIPE_FHB_SECRET_KEY))
	) {
		promo = await firstOrderPromo(env.STRIPE_FHB_SECRET_KEY);
	}
	const pct = promo ? 0 : tier.pct;

	const reqUrl = new URL(request.url);
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
				: `${origin}/print/?order=canceled#bulk-order`,
		'automatic_tax[enabled]': 'true',
		// Free shipping is baked into the unit price; the address is still collected for
		// tax calculation and fulfilment.
		'shipping_address_collection[allowed_countries][0]': 'US',
		'phone_number_collection[enabled]': 'true',
		'metadata[kind]': 'dvc_print',
		'metadata[total]': total,
		'metadata[pct_off]': promo ? FIRST_ORDER_PCT : pct,
		'metadata[offer]': promo ? 'first_order' : pct > 0 ? 'volume' : 'none',
		'metadata[breakdown]': Object.entries(counts)
			.filter(([, n]) => n > 0)
			.map(([k, n]) => `${k}:${n}`)
			.join(','),
	};

	let li = 0;
	for (const [slug, qty] of Object.entries(counts)) {
		if (qty <= 0) continue;
		const e = EDITIONS[slug];
		const unit = unitAfter(e.retail, pct);
		form[`line_items[${li}][quantity]`] = qty;
		form[`line_items[${li}][price_data][currency]`] = 'usd';
		form[`line_items[${li}][price_data][unit_amount]`] = unit;
		form[`line_items[${li}][price_data][tax_behavior]`] = 'exclusive';
		form[`line_items[${li}][price_data][product_data][name]`] =
			`Father’s Heart Bible™ — ${e.title}`;
		form[`line_items[${li}][price_data][product_data][description]`] =
			pct > 0
				? `Divine Voice Color · Complete Bible · ${pct}% volume discount · free shipping`
				: 'Divine Voice Color · Complete Bible · free shipping';
		form[`line_items[${li}][price_data][product_data][images][0]`] = e.img;
		form[`line_items[${li}][price_data][product_data][tax_code]`] = TAX_CODE;
		li++;
	}

	if (validEmail) form.customer_email = email;
	// Pre-applied, so the buyer never types it; Stripe shows WELCOME15 on the summary and counts
	// its redemptions. Units above are at list price when it applies — the two never stack.
	if (promo) form['discounts[0][promotion_code]'] = promo;

	const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
		method: 'POST',
		headers: {
			authorization: `Bearer ${env.STRIPE_FHB_SECRET_KEY}`,
			'content-type': 'application/x-www-form-urlencoded',
		},
		body: encodeForm(form),
	});
	if (!res.ok) {
		return json({ error: 'stripe_error', detail: await res.text() }, 502);
	}
	const session = (await res.json()) as { url?: string };
	if (!session.url) return json({ error: 'no_session_url' }, 502);
	return json({ url: session.url });
};
