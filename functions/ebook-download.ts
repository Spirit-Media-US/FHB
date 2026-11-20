// /ebook-download on fathersheartbible.com — FHB's door to the store's ONE eBook download endpoint, which MOVED to the
// SMP site (map smp-store-one-home-v1 §4 move 3; Kevin 2026-11-20 ~18:51Z "2 this needs to be moved. You are
// inheriting OLD instead of making it new"). Until then FHB served the files itself and SMP forwarded here; now SMP
// (functions/ebook-download.ts there) verifies the link, re-reads the Stripe session and streams the EPUB from its own
// private-R2 binding, and this file only forwards the link's parameters there and hands the answer back unchanged.
// Its redirects are relative (/ebook-download?…), so an FHB-window buyer stays on fathersheartbible.com. Every link
// already emailed (the Bible eBook's session link, a book's signed link) keeps working: SMP accepts them all.
// A preview forwards to SMP's dev preview, production to SMP.
const SMP_PROD = 'https://spiritmediapublishing.com';
const SMP_PREVIEW = 'https://dev.spirit-media-publishing.pages.dev';

/** Which SMP answers this request: a pages.dev preview of FHB talks to SMP's dev preview, never to production. */
export const upstreamFor = (url: URL) =>
	url.hostname.endsWith('.pages.dev') && url.hostname !== 'fathersheartbible.pages.dev'
		? SMP_PREVIEW
		: url.hostname === 'localhost'
			? SMP_PREVIEW
			: SMP_PROD;

export const onRequestGet: PagesFunction = async ({ request }) => {
	const url = new URL(request.url);
	// only the link's own parameters travel (s, e, t, v, dl): nothing else is forwarded
	const q = new URLSearchParams();
	for (const k of ['s', 'e', 't', 'v', 'dl']) {
		const v = url.searchParams.get(k);
		if (v !== null) q.set(k, v);
	}
	const up = await fetch(`${upstreamFor(url)}/ebook-download?${q}`, {
		redirect: 'manual',
		headers: { 'x-store-window': 'fhb' },
	});
	const headers = new Headers();
	for (const k of ['content-type', 'content-disposition', 'cache-control', 'location']) {
		const v = up.headers.get(k);
		if (v) headers.set(k, v);
	}
	if (!headers.has('cache-control')) headers.set('cache-control', 'no-store');
	headers.set('x-robots-tag', 'noindex');
	return new Response(up.body, { status: up.status, headers });
};
