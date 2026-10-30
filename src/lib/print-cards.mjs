// /print language cards — the two data-driven decisions every card makes, in one place so a test
// can prove them (Kevin 2026-10-30: "The look inside can be added as print artifacts are built and
// published. ... All cards can have Buy Direct & Save + Free Shipping linked at the bottom NOW").

/**
 * Look inside shows once the edition's sample pages are in src/data/lookinside.json under its slug.
 * That manifest is written by the edition chain when a print artifact publishes
 * (fhb-chain.py ED_LOOK_CMD -> publish_lookinside.py <manifest> <slug>), so a card gains its
 * Look inside on the next build with no per-language edit here.
 */
export function hasLookInside(manifest, slug) {
	return Boolean(manifest?.[slug]?.pages?.length);
}

/**
 * Where a card's "Buy Direct & Save + Free Shipping" goes. Never a dead link:
 *  - sold by our checkout (an ISBN + a catalog row, or a PRE-ORDER with no ISBN yet — Kevin 2026-10-30,
 *    Buy now on all 80): the /print catalog form, row pre-filled;
 *  - no ISBN yet but an edition page: that page's #order block (reserve by email) — the
 *    checkout cannot take an edition with no ISBN, so the card never points at it;
 *  - neither: null (no link).
 */
export function directTarget({ sold, slug, built }) {
	if (sold) return '#bulk-order';
	if (built) return `/bibles/${slug}-bible/#order`;
	return null;
}
