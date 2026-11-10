// pages.dev production-alias redirect (SEO/AEO unit 2mp, PLAN + PROOF; not shipped).
//
// WHY: AI engines cite fathersheartbible.pages.dev/<path> (noindex + canonical -> .com), and the
// tracker scored those as "not cited". The production alias should 301 to the real domain.
//
// WHAT IT TOUCHES: ONLY the exact production alias host. Preview aliases have extra labels
// (dev.fathersheartbible.pages.dev, <branch>.fathersheartbible.pages.dev, <hash>.fathersheartbible.pages.dev)
// and are never redirected, so fhb-preview / branch previews keep working.
//
// LOOP GUARD: the apex router Worker proxies a few marketing paths FROM this alias
// (e.g. /read-the-bible-in-a-year/ matches the router's /read* route but is a marketing page).
// Those subrequests carry Host fathersheartbible.pages.dev too. They are recognised by a request
// header a Worker subrequest carries (see isRouterSubrequest) and are served, never redirected.
export const PROD_ALIAS = 'fathersheartbible.pages.dev';
export const CANONICAL_ORIGIN = 'https://fathersheartbible.com';

export function isRouterSubrequest(headers) {
	// cf-worker is stamped by Cloudflare on every Worker subrequest; x-apex-proxy is the router's
	// own shared-secret header (present only if the router is changed to send it on marketing).
	return headers.has('cf-worker') || headers.has('x-apex-proxy');
}

// Returns the redirect target string, or null to serve normally.
export function pagesDevRedirectTarget(requestUrl, headers) {
	const url = new URL(requestUrl);
	if (url.hostname.toLowerCase() !== PROD_ALIAS) return null; // preview/branch/hash aliases + .com: untouched
	if (isRouterSubrequest(headers)) return null; // router fetching its marketing origin
	return CANONICAL_ORIGIN + url.pathname + url.search;
}
