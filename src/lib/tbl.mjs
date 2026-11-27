// BUILD-CHECK: searched "tbl redirect switchover" (bin/tool-inventory.py 2026-11-22) + grep of FHB src/ for
//   "thebelieverslibrary" -> nothing links FHB buy points to TBL.
// NEAREST: src/lib/storeOrigin.ts (which store origin the order forms post to; it maps no product to a TBL page) and
//   the SMP twin src/lib/tbl-switch.mjs (same switch-over, SMP book slugs).
// NOT-REUSED-BECAUSE: site source (three product keys -> URL), not a tool.
// APPROVED-BY: TBL brief tbl-run-c-store-20261122.md piece C6 (queue noah/15c7800c; Kevin 2026-11-22 "GO" on the
//   TBL plan) — switched only after Kevin approves the preview.
//
// TBL SWITCH-OVER (CONTRACT v2 decision 61: TBL is the ONE store; FHB is a front door that links in).
// TBL_ORIGIN is the ONE place the TBL domain lives on FHB (flip it here). TBL_BOOKS = the FHB products that have a
// live TBL book page (library_items, community tbl; each answered 200 on https://tbl.community-cm1.pages.dev/books/<key>
// 2026-11-22). The print Bible editions have NO TBL page yet, so their order forms stay as they are (never link a 404).
// TBL_ON = false: every buy point behaves exactly as before.
import TBL_EDITION_MAP from '../data/tbl-editions.json' with { type: 'json' };

export const TBL_ON = true;
export const TBL_ORIGIN = 'https://thebelieverslibrary.com';
export const TBL_HOST = new URL(TBL_ORIGIN).host;
/** FHB product -> TBL work key (/books/<key>) */
export const TBL_BOOKS = {
	'who-am-i': 'who-am-i',
	'beloved-identity': 'beloved-identity',
	// The FHB eBook: TBL sells it itself from 2026-11-27 (community: the tbl_ebook path, delivered in My Library; kevin
	// seat 2026-11-26 23:42Z, L3147). SHIP ORDER: community first. History below.
	'bible-ebook': 'fathers-heart-bible-regular-print?f=ebook',
	// (was) 'bible-ebook' deliberately NOT mapped (lane C 2026-11-22): the FHB eBook is not in the store engine's eBook SKUs, so
	// TBL cannot sell it yet and its TBL page Buy points back to /print — mapping it now would loop the buyer. Add
	// 'bible-ebook': 'fathers-heart-bible-ebook' once TBL sells it (engine EBOOK_SKUS entry in SMP src/store-engine).
	// RE-MEASURED 2026-11-26 (pmbuilder, kevin-decisions L3147 "Audit and revise as needed."), all still loops, so NOT mapped:
	//   - FHB eBook: library_items fathers-heart-bible-ebook sale_allowed=true $9.99, but storeSells('ebook', sku) is false
	//     (not in engine EBOOK_SKUS); live TBL /books/fathers-heart-bible-regular-print?f=ebook Buy -> fathersheartbible.com/print/.
	//   - FHB print Bibles (general + audience + language editions): the TBL edition block always renders
	//     <a href={external_url ?? ed.fhbUrl}> (never the checkout form); live Buy -> fathersheartbible.com/bibles/<x>-bible/.
	//   - FHB English audiobook: no paid TBL row exists (fathers-heart-bible-john-audio is free, sale_allowed=false).
};
/** the TBL book page for an FHB product, or null (switch off / no TBL page) */
export const tblBook = (product) =>
	TBL_ON && Object.hasOwn(TBL_BOOKS, product) ? `${TBL_ORIGIN}/books/${TBL_BOOKS[product]}` : null;
/** FHB /books/<slug>/ pages that 301 to TBL (public/_redirects): not in the sitemap or the merchant feed */
export const tblRedirected = (url) => {
	const m = /\/books\/([a-z0-9-]+)\/?$/.exec(String(url ?? ''));
	return Boolean(m && tblBook(m[1]));
};
/** FHB Bible print editions (kevin seat 2026-11-26 23:42Z "Make TBL SELL the FHB items itself", L3147): TBL now sells
 *  each edition with its own checkout (community: storeSells('print') accepts the engine's edition SKUs), so every FHB
 *  Bible Buy goes to the edition's TBL book page; the Bible pages themselves stay on FHB. Map: src/data/tbl-editions.json
 *  (generated from TBL library_items, each URL answered 200). SHIP ORDER: community (TBL checkout) BEFORE this, or the
 *  TBL page's Buy still links back here. false = every Bible Buy behaves as before. */
export const TBL_EDITIONS_ON = true;
/** the TBL page for an FHB edition page key ('chosen-bible'), or for '/bibles/<key>/#order'; `pick` 'general-regular-<colour>'
 *  picks the general edition's cover colour. null = switch off / no TBL page. */
export const tblEdition = (keyOrHref, pick) => {
	if (!TBL_EDITIONS_ON || !keyOrHref) return null;
	const m = /^(?:\/bibles\/)?([a-z0-9-]+?)\/?(?:#order)?$/.exec(String(keyOrHref));
	if (!m) return null;
	const v = /^general-regular-([a-z]+)$/.exec(String(pick ?? ''));
	if (m[1] === 'fathers-heart-bible' && v && TBL_EDITION_MAP.generalVariants[v[1]]) return TBL_EDITION_MAP.generalVariants[v[1]];
	return Object.hasOwn(TBL_EDITION_MAP.editions, m[1]) ? TBL_EDITION_MAP.editions[m[1]] : null;
};
/** href points at TBL (same tab: TBL is our own store, not a third party) */
export const isTbl = (href) => {
	const m = /^(?:https?:)?\/\/(?:www\.)?([^/:?#]+)/i.exec(String(href ?? ''));
	return Boolean(m && m[1].toLowerCase() === TBL_HOST);
};
