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

export const CARDS_V2 = new Set([
	'dvc-chosen',
	'dvc-couples',
	'dvc-dads',
	'dvc-first-responders',
	'dvc-mens',
	'dvc-moms',
	'dvc-pastors',
	'dvc-peace',
	'dvc-presidents',
	'dvc-recovery',
	'dvc-seekers',
	'dvc-seventeen',
	'dvc-soldiers',
	'dvc-teen',
	'dvc-worship-leaders',
	'general-regular-charcoal',
	'general-regular-plum',
	'general-regular-white',
]);

/** The card image URL for `key` ("dvc-teen", "general-regular-plum") at 600 or 1200. */
export function cardUrl(key: string, size: 600 | 1200 = 600): string {
	return CARDS_V2.has(key) ? `${BASE}/cards/v2/${key}-${size}.webp` : `${BASE}/${key}-${size}.webp`;
}
