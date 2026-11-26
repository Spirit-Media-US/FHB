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
export const TBL_ON = true;
export const TBL_ORIGIN = 'https://thebelieverslibrary.com';
export const TBL_HOST = new URL(TBL_ORIGIN).host;
/** FHB product -> TBL work key (/books/<key>) */
export const TBL_BOOKS = {
	'who-am-i': 'who-am-i',
	'beloved-identity': 'beloved-identity',
	// 'bible-ebook' deliberately NOT mapped (lane C 2026-11-22): the FHB eBook is not in the store engine's eBook SKUs, so
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
/** href points at TBL (same tab: TBL is our own store, not a third party) */
export const isTbl = (href) => {
	const m = /^(?:https?:)?\/\/(?:www\.)?([^/:?#]+)/i.exec(String(href ?? ''));
	return Boolean(m && m[1].toLowerCase() === TBL_HOST);
};
