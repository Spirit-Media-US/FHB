import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

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
			customPages: [
				'https://fathersheartbible.com/about/',
				'https://fathersheartbible.com/contributors/',
				'https://fathersheartbible.com/events/',
				'https://fathersheartbible.com/groups/',
				'https://fathersheartbible.com/library/',
				'https://fathersheartbible.com/map/',
				'https://fathersheartbible.com/shareables/',
				'https://fathersheartbible.com/login/',
			],
			filter: (page) => !page.includes('/privacy') && !page.includes('/terms'),
			serialize(item) {
				const now = new Date().toISOString();
				const url = item.url;
				// Homepage — highest priority
				if (url.endsWith('.com/') || url.endsWith('.com')) {
					return { ...item, changefreq: 'weekly', priority: 1.0, lastmod: now };
				}
				// Key landing pages
				if (url.includes('/download') || url.includes('/samples') || url.includes('/join')) {
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
