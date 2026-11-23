// THE ONE STORE's address (Option C, Kevin 2026-11-16 "1 store SMP. 2 shop windows FHB and SMP"; contract 3fe).
// Every FHB order box (the Bible box in src/scripts/order-form.ts and the book box in BookOrder.astro) checks out on
// the SMP store engine, POST <storeOrigin>/store-checkout. Production orders go to spiritmediapublishing.com; an FHB
// PREVIEW (any *.pages.dev host except the production Pages host) orders on the SMP dev preview, so a preview test
// never touches the production store. (Was feat-smp-store, frozen since 2026-11-14; SMP store work lands on dev.)
export const STORE_PROD = 'https://spiritmediapublishing.com';
export const STORE_PREVIEW = 'https://dev.spirit-media-publishing.pages.dev';
export function storeOrigin(hostname: string): string {
	return hostname.endsWith('.pages.dev') && hostname !== 'fathersheartbible.pages.dev'
		? STORE_PREVIEW
		: STORE_PROD;
}
/** utm for an FHB order box: the page's own utm_* when present, else the FHB referral default. */
export function storeUtm(
	search: string,
	campaign: string,
	content: string,
): Record<string, string> {
	const q = new URLSearchParams(search);
	const utm = Object.fromEntries(
		['source', 'medium', 'campaign', 'content']
			.map((k) => [k, q.get(`utm_${k}`) ?? ''])
			.filter(([, v]) => v),
	);
	if (!utm.source)
		Object.assign(utm, { source: 'fathersheartbible.com', medium: 'referral', campaign, content });
	return utm;
}
