// /order on fathersheartbible.com — MOVED to the SMP site (map smp-store-one-home-v1 §4 move 4; Kevin 2026-11-20 ~18:51Z
// "2 this needs to be moved. You are inheriting OLD instead of making it new"; 16:07Z "the store is NOW Spirit Media
// Publishing whether it is FHB or not"). The store has ONE thank-you + lookup page: spiritmediapublishing.com/order
// (SMP functions/order.ts, which now shows everything this page did: lookup form, email, phone, full address, shipped
// line, full reference). Every FHB-window checkout's success_url and every old /order link lands here and is sent there
// with its query unchanged. A preview of FHB sends a buyer to SMP's dev preview, never to production.
const SMP_PROD = 'https://spiritmediapublishing.com';
const SMP_PREVIEW = 'https://dev.spirit-media-publishing.pages.dev';

/** Where this request's order page lives (the production Pages host is production). */
export const orderOrigin = (url: URL) =>
	(url.hostname.endsWith('.pages.dev') && url.hostname !== 'fathersheartbible.pages.dev') ||
	url.hostname === 'localhost'
		? SMP_PREVIEW
		: SMP_PROD;

export const onRequestGet: PagesFunction = async ({ request }) => {
	const url = new URL(request.url);
	return new Response(null, {
		status: 302,
		headers: {
			location: `${orderOrigin(url)}/order${url.search}`,
			'cache-control': 'no-store',
			'x-robots-tag': 'noindex',
		},
	});
};
