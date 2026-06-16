import fs from 'node:fs';
import path from 'node:path';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const SITE = 'https://fathersheartbible.com';

// The Bible reader pages are served by the community app (under the apex via
// fhb-apex-router) and are server-rendered there, so they appear in NO
// auto-generated sitemap. Enumerate every chapter from the synced manifest so
// the unified apex sitemap lists all /read pages in the canonical trailing-slash
// form Google already indexed. Without this, deleting the old static reader
// would drop ~900 reader URLs from the sitemap.
const readPages = [`${SITE}/read/`];
try {
	const manifest = JSON.parse(
		fs.readFileSync(path.resolve(process.cwd(), 'src/content/bible/_manifest.json'), 'utf8'),
	);
	for (const slug of Object.keys(manifest.books || {})) {
		const entry = manifest.books[slug];
		const chapters = [
			...new Set([...(entry.lockedChapters || []), ...(entry.readingEditionChapters || [])]),
		].sort((a, b) => a - b);
		readPages.push(`${SITE}/read/${slug}/`);
		for (const n of chapters) readPages.push(`${SITE}/read/${slug}/${n}/`);
	}
} catch {
	// manifest missing — sitemap still builds (without the /read pages)
}

export default defineConfig({
	site: process.env.PUBLIC_SITE_URL || 'https://fathersheartbible.com',
	output: 'static',
	server: { port: 4323, host: true },
	build: { inlineStylesheets: 'auto' },
	integrations: [
		sitemap({
			// Option A: fold the community app's PUBLIC pages (served under the apex
			// via the fhb-apex-router Worker) into the unified apex sitemap. These
			// aren't built by this repo, so they're added as customPages. EXCLUDED:
			// /listen (canonicalizes to /read — §2.8) and all gated/teaser routes
			// (/feed, /directory, /dms, /profile, /settings, /moderation, /spaces/*).
			// Flat community pages serve + self-canonicalize WITHOUT a trailing
			// slash (their /foo/ form 404s) — list the no-slash 200 URL. /events/
			// is a directory page (serves 200 with slash). /login is intentionally
			// excluded (never advertise the login page). /read/* added from the
			// manifest above.
			customPages: [
				// /about (community-served) is noindex — do NOT advertise it in the
				// sitemap (avoids GSC "Submitted URL marked noindex"). Re-add only when
				// the community team makes it indexable.
				`${SITE}/contributors`,
				`${SITE}/groups`,
				`${SITE}/library`,
				`${SITE}/map`,
				`${SITE}/shareables`,
				`${SITE}/events/`,
				...readPages,
			],
			// Exclude /privacy + /terms (low-value), and /blog/preview/* — the latter
			// are noindex draft-preview duplicates of the real posts; advertising them
			// in the sitemap makes GSC report "Submitted URL marked noindex" and inflates
			// the not-indexed count. They still exist (noindex), just not advertised.
			filter: (page) =>
				!page.includes('/privacy') &&
				!page.includes('/terms') &&
				!page.includes('/blog/preview'),
			serialize(item) {
				const now = new Date().toISOString();
				const url = item.url;
				// Homepage — highest priority
				if (url.endsWith('.com/') || url.endsWith('.com')) {
					return { ...item, changefreq: 'weekly', priority: 1.0, lastmod: now };
				}
				// Key landing pages
				if (url.includes('/samples') || url.includes('/guides')) {
					return { ...item, changefreq: 'monthly', priority: 0.9, lastmod: now };
				}
				// Blog index
				if (url.endsWith('/blog/') || url.endsWith('/blog')) {
					return { ...item, changefreq: 'weekly', priority: 0.8, lastmod: now };
				}
				// Blog posts
				if (url.includes('/blog/')) {
					return { ...item, changefreq: 'weekly', priority: 0.8, lastmod: now };
				}
				// Bible reader index
				if (url.endsWith('/read/') || url.endsWith('/read')) {
					return { ...item, changefreq: 'weekly', priority: 0.9, lastmod: now };
				}
				// Bible chapters
				if (url.includes('/read/')) {
					return { ...item, changefreq: 'monthly', priority: 0.85, lastmod: now };
				}
				// Default
				return { ...item, changefreq: 'monthly', priority: 0.7, lastmod: now };
			},
		}),
	],
	vite: {
		server: { allowedHosts: true },
		plugins: [tailwindcss()],
	},
});
