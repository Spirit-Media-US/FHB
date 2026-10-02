// Internal links must point at the CANONICAL URL, not at one that redirects (2026-10-02).
//
// Every marketing page and every /read chapter canonicalizes WITH a trailing slash; the
// slashless form answers 301/308. Sanity post bodies carry hand-typed links like
// `/read/romans/8/#v15`, so an indexing audit counted thousands of crawler hits spent on
// redirects. This normalizes a first-party href to the slash form at render time, so the
// content can stay as typed and still never link to a redirect.
//
// Scope is deliberate: ONLY paths owned by the marketing app or the /read reader. The
// community app's other routes (/library, /groups, /login, /about …) canonicalize WITHOUT
// a slash, so they are left untouched. Files (anything with an extension) are untouched.
const SLASH_ROOTS =
	/^(https:\/\/fathersheartbible\.com)?(\/(?:read|blog|te\/blog|meaning|verses|guides|bibles|bible-for|bible-in|words|print|review|privacy|terms|family|the-fathers-heart-bible|a-bible-for-the-whole-world)(?:\/[^?#]*)?)([?#].*)?$/;

export function canonHref(href: string): string {
	if (typeof href !== 'string') return href;
	const m = href.match(SLASH_ROOTS);
	if (!m) return href;
	const [, origin = '', path, rest = ''] = m;
	if (path.endsWith('/') || /\.[a-z0-9]{2,5}$/i.test(path)) return href;
	return `${origin}${path}/${rest}`;
}
