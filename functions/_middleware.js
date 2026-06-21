// Edge time-gate for embargoed blog posts (Cloudflare Pages Function).
//
// Purpose: a post can be fully deployed to PRODUCTION now, yet stay invisible
// until an exact date/time — with NO second deploy. Before the reveal moment
// this middleware (a) redirects the post URL away, (b) strips the post's card
// from any listing/related section, and (c) removes it from the sitemap. At the
// reveal moment it simply stops gating, and the already-deployed page/card/
// sitemap entry serve normally. No rebuild needed.
//
// To embargo a post: add { slug, reveal } below. `reveal` is an ISO 8601 UTC
// instant. To change a time after deploy, edit here and redeploy. Remove the
// entry once a post is permanently live (harmless to leave; it just no-ops).
const GATED = [
	// "Why the Father Gives Wisdom and Tools" — go live Mon 2026-06-22 09:00 ET (13:00 UTC)
	{ slug: 'why-the-father-gives-wisdom-and-tools', reveal: '2026-06-22T13:00:00Z' },
	// "The Father of Honor" — go live Wed 2026-06-24 09:00 ET (13:00 UTC)
	{ slug: 'the-father-of-honor-starving-world', reveal: '2026-06-24T13:00:00Z' },
];

export async function onRequest(context) {
	const { request, next } = context;
	const url = new URL(request.url);
	const path = url.pathname;
	const now = Date.now();

	// Only the posts still before their reveal instant matter.
	const hidden = GATED.filter((g) => now < Date.parse(g.reveal));
	if (hidden.length === 0) return next();

	// 1) The post page itself: send visitors/crawlers to the blog index.
	for (const g of hidden) {
		if (path === `/blog/${g.slug}` || path === `/blog/${g.slug}/`) {
			return new Response(null, {
				status: 302,
				headers: { Location: '/blog/', 'Cache-Control': 'no-store' },
			});
		}
	}

	const res = await next();
	const ctype = res.headers.get('content-type') || '';

	// 2) Any HTML page: drop the server-rendered card/link AND scrub the gated
	//    slug from the blog index's JSON data island (#sanity-posts-data) that the
	//    client-side search/filter/pagination re-renders from — otherwise the post
	//    would reappear on the first search or page change.
	if (ctype.includes('text/html')) {
		const slugs = hidden.map((g) => g.slug);
		let rw = new HTMLRewriter();
		for (const g of hidden) {
			rw = rw.on(`a[href*="/blog/${g.slug}"]`, {
				element(el) {
					el.remove();
				},
			});
		}
		rw = rw.on(
			'script#sanity-posts-data',
			new (class {
				constructor() {
					this.buf = '';
				}
				text(t) {
					this.buf += t.text;
					if (!t.lastInTextNode) {
						t.replace('', { html: false });
						return;
					}
					let replacement = this.buf;
					try {
						const arr = JSON.parse(this.buf);
						if (Array.isArray(arr)) {
							const kept = arr.filter((p) => !slugs.some((s) => String(p && p.slug).includes(s)));
							replacement = JSON.stringify(kept);
						}
					} catch (e) {
						/* leave the island untouched on parse failure */
					}
					t.replace(replacement, { html: false });
					this.buf = '';
				}
			})(),
		);
		const out = rw.transform(res);
		const headers = new Headers(out.headers);
		headers.set('Cache-Control', 'no-store');
		return new Response(out.body, { status: out.status, statusText: out.statusText, headers });
	}

	// 3) Sitemap XML: remove the <url> entry for the gated slug.
	if (path.includes('sitemap') && (ctype.includes('xml') || path.endsWith('.xml'))) {
		let text = await res.text();
		for (const g of hidden) {
			const re = new RegExp(`<url>(?:(?!</url>).)*${g.slug}(?:(?!</url>).)*</url>`, 'gs');
			text = text.replace(re, '');
		}
		const headers = new Headers(res.headers);
		headers.set('Cache-Control', 'no-store');
		return new Response(text, { status: res.status, statusText: res.statusText, headers });
	}

	return res;
}
