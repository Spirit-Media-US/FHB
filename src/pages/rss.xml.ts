// RSS 2.0 feed of the FHB blog (unit 2xz, 2026-11-12). Built from the SAME Sanity query and
// ordering as src/pages/blog.astro, so the feed lists exactly the posts the blog index shows:
// nothing typed here, no post can be in one and missing from the other. Linked from every page's
// <head> (src/layouts/Layout.astro) so feed readers and crawlers can discover it.
import { sanityClient } from '../lib/sanity';

const SITE = 'https://fathersheartbible.com';
const esc = (s: string) =>
	String(s ?? '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&apos;');

export async function GET() {
	const posts: {
		slug: string;
		title: string;
		excerpt?: string;
		author?: string;
		date: string;
	}[] = await sanityClient.fetch(`
  *[_type == "blogPost" && defined(slug.current) && defined(publishDate)] | order(publishDate desc) {
    "slug": slug.current,
    title,
    excerpt,
    "author": coalesce(author, "Kevin White"),
    "date": publishDate
  }
`);
	const now = Date.now();
	const live = posts.filter(
		(p) => Number.isFinite(Date.parse(p.date)) && Date.parse(p.date) <= now,
	);
	const items = live
		.map((p) => {
			const url = `${SITE}/blog/${p.slug}/`;
			return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <dc:creator>${esc(p.author ?? 'Kevin White')}</dc:creator>${p.excerpt ? `\n      <description>${esc(p.excerpt)}</description>` : ''}
    </item>`;
		})
		.join('\n');
	const last = live.length ? new Date(live[0].date).toUTCString() : new Date(0).toUTCString();
	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Father's Heart Bible Blog</title>
    <link>${SITE}/blog/</link>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Articles on hearing the Father's voice across Scripture, the orphan spirit and sonship, and reading every verse with the Father's heart in view.</description>
    <language>en</language>
    <lastBuildDate>${last}</lastBuildDate>
${items}
  </channel>
</rss>
`;
	return new Response(xml, {
		headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
	});
}
