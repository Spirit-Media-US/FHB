// Where a product card's art lives.
//
// The 3-D cards were re-rendered from the CURRENT press files and uploaded to NEW KEYS
// under FHB/print/cards/v2/ rather than written over the live ones. New keys because the
// re-render reuses the old FILENAMES with different art: overwriting in place leaves the
// edge serving the old card with nothing to bust it — which is exactly why the general
// covers needed a `?v=` in the first place — and destroys the only copy of what is live.
// A new key needs no cache-buster at all, mutates nothing, and the swap is reversible by
// taking a key back out of this set.
//
// `journaling` is deliberately ABSENT: its 8x10 card has not been rendered (D166 — an 8x10
// pose would have to be invented, on the one product whose selling point is its shape), so
// it keeps the key it already has. Anything not in this set resolves to its existing
// location, which makes the set the single place that decides.
const BASE = 'https://assets.spiritmediapublishing.com/FHB/print';

// EMPTIED 2026-09-17 (Kevin): "The current 3D mock-ups look like cartoons and NOT real
// books... NOT pleased." He also said he had asked for ADDITIONS in the existing style, not
// a re-render of everything — so D142, which records "3D mock-ups everywhere ... CLOSED A",
// overstates the ruling it was built from.
//
// This is the reversal the new-key discipline was FOR (D165/D173): the v2 renders are still
// in R2, untouched, and the old cards were never overwritten. Emptying this set puts dev
// back on exactly the URLs production is serving today — so the revert is proven by what is
// already live, not by a restore. Putting a key back re-enables its v2 card.
//
// Dropping the 3-D style is NOT decided: the open question is whether a card can look
// PHOTOGRAPHIC rather than drawn. The look-inside plates read as real because they are
// rendered from the press file; these were drawn as flat-filled boxes, which is what reads
// as a cartoon. A photographic route (real cover art composited onto a photographed blank
// book through a displacement map, so the type is never regenerated) is being prototyped.
export const CARDS_V2 = new Set<string>([]);

/** The card image URL for `key` ("dvc-teen", "general-regular-plum") at 600 or 1200. */
export function cardUrl(key: string, size: 600 | 1200 = 600): string {
	return CARDS_V2.has(key) ? `${BASE}/cards/v2/${key}-${size}.webp` : `${BASE}/${key}-${size}.webp`;
}
