import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const SITE = 'https://fathersheartbible.com';

// READER URLs ARE NOT LISTED HERE. Every /read page — English AND every other
// live language — is enumerated by scripts/gen-sitemap-read.mjs into
// public/sitemap-read.xml, which is advertised as a second `Sitemap:` line in
// public/robots.txt and submitted to GSC + Bing separately.
//
// Why it moved out of this config (2026-08-04): the reader is multilingual, and
// a sitemap that lists translations must carry xhtml:link hreflang alternates.
// @astrojs/sitemap cannot emit xhtml:link at all, and its `i18n` option cannot
// express our URL shape (English is the default and has NO language segment:
// /read/<book>/<ch>/, while others are /read/<lang>/<book>/<ch>/). So the reader
// gets its own generated sitemap and this config owns only the marketing pages.
// Keep it that way — reader URLs must have exactly ONE owner, or Google sees the
// same chapter advertised twice with conflicting annotations.
//
// (Still true, and honoured by the generator: /read/<book>/ 302-redirects to
// chapter 1, so only canonical chapters are listed — never the book landing.)

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
			// excluded (never advertise the login page). /read/* is NOT here — it
			// lives in public/sitemap-read.xml (see the note at the top of this file).
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
			],
			// Exclude /privacy + /terms (low-value), and /blog/preview/* — the latter
			// are noindex draft-preview duplicates of the real posts; advertising them
			// in the sitemap makes GSC report "Submitted URL marked noindex" and inflates
			// the not-indexed count. They still exist (noindex), just not advertised.
			filter: (page) =>
				!page.includes('/privacy') &&
				!page.includes('/terms') &&
				!page.includes('/blog/preview') &&
				!page.includes('/join'),
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
