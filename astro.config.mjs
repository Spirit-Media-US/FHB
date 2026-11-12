import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { sitemapLinksFor } from './src/lib/bibles-hreflang-fs.mjs';
import { addIndexLastmod, editionFilesBySlug, editionLastmod, maxLastmod } from './scripts/lib/sitemap-lastmod.mjs';

const SITE = 'https://fathersheartbible.com';

// ── Sitemap <lastmod> + noindex filter (indexing audit 2026-10-17) ────────────────
// lastmod USED to be `new Date()` for all ~261 URLs: every deploy told Google every page
// changed today, which teaches it to ignore the signal. Now each URL gets a REAL date or
// none at all (absent is honest; invented is not — same rule as gen-sitemap-read.mjs):
//   max( the page's own JSON-LD "dateModified" in the built HTML,
//        the last git commit date of its static source file src/pages/<path>(.astro|/index.astro) )
// A dynamic route with no dateModified, or a community customPage, gets no lastmod.
// The filter also drops every page whose BUILT HTML says noindex (26 /glossary-review/*
// pages were being advertised -> GSC "Submitted URL marked noindex").
// @astrojs/sitemap runs filter/serialize at astro:build:done, so dist/ is already written.
const DIST = path.resolve('dist');
const builtHtml = (url) => {
	try {
		const p = new URL(url).pathname;
		const f = p.endsWith('/') ? path.join(DIST, p, 'index.html') : path.join(DIST, `${p}.html`);
		return fs.readFileSync(f, 'utf8');
	} catch {
		return '';
	}
};
const isNoindex = (url) => /<meta name="robots" content="[^"]*noindex/i.test(builtHtml(url));
const GIT_DATES = (() => {
	// One git pass: newest commit date per file under src/pages and src/data/editions (2xw).
	const m = new Map();
	try {
		const out = execFileSync('git', ['log', '--format=@%cI', '--name-only', '--', 'src/pages', 'src/data/editions'], {
			encoding: 'utf8',
			maxBuffer: 64 * 1024 * 1024,
		});
		let date = '';
		for (const line of out.split('\n')) {
			if (line.startsWith('@')) date = line.slice(1, 11);
			else if (line && !m.has(line)) m.set(line, date);
		}
	} catch {
		/* no git: no git dates, never a guess */
	}
	return m;
})();
const EDITION_FILES = editionFilesBySlug('src/data/editions');
// The community-app pages listed as customPages are not built here, so their only truthful change date is
// the git date of their page file in the community repo (2xw). No repo / no file: no lastmod, never a guess.
const COMMUNITY_REPO = process.env.COMMUNITY_REPO || '/srv/sites/community';
const COMMUNITY_PAGES = new Set(['contributors', 'groups', 'library', 'map', 'shareables', 'events']);
const COMMUNITY_DATES = (() => {
	const m = new Map();
	try {
		const out = execFileSync('git', ['-C', COMMUNITY_REPO, 'log', '--format=@%cI', '--name-only', '--', 'src/pages'], {
			encoding: 'utf8',
			maxBuffer: 64 * 1024 * 1024,
		});
		let date = '';
		for (const line of out.split('\n')) {
			if (line.startsWith('@')) date = line.slice(1, 11);
			else if (line && !m.has(line)) m.set(line, date);
		}
	} catch {
		/* no community repo: no dates */
	}
	return m;
})();
function lastmodFor(url) {
	const dates = [];
	const html = builtHtml(url);
	const dm = html.match(/"dateModified":"(\d{4}-\d{2}-\d{2})/);
	if (dm) dates.push(dm[1]);
	try {
		// /bibles/<slug>-bible/ is one dynamic route over src/data/editions/*.json: the real change
		// date of a product page is the git date of ITS OWN edition data file (2xw; 100 pages had none).
		const ed = editionLastmod(new URL(url).pathname, EDITION_FILES, GIT_DATES);
		if (ed) dates.push(ed);
		const p = new URL(url).pathname.replace(/^\/|\/$/g, '');
		if (COMMUNITY_PAGES.has(p))
			for (const f of [`src/pages/${p}.astro`, `src/pages/${p}/index.astro`])
				if (COMMUNITY_DATES.has(f)) dates.push(COMMUNITY_DATES.get(f));
		for (const f of p
			? [`src/pages/${p}.astro`, `src/pages/${p}/index.astro`]
			: ['src/pages/index.astro']) {
			if (GIT_DATES.has(f)) dates.push(GIT_DATES.get(f));
		}
	} catch {
		/* unparsable url: no lastmod */
	}
	return dates.length ? dates.sort().at(-1) : undefined;
}

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
			// 2xw: only declare the namespaces this file actually uses. xhtml carries the /bibles/ hreflang
			// alternates; news/image/video were declared with zero entries (audit item 12).
			namespaces: { news: false, xhtml: true, image: false, video: false },
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
				// Served by the fhb-podcast Worker (route fathersheartbible.com/audio-bible*) — Kevin 2026-10-02.
				`${SITE}/audio-bible`,
			],
			// Exclude /privacy + /terms (low-value), and /blog/preview/* — the latter
			// are noindex draft-preview duplicates of the real posts; advertising them
			// in the sitemap makes GSC report "Submitted URL marked noindex" and inflates
			// the not-indexed count. They still exist (noindex), just not advertised.
			filter: (page) =>
				!page.includes('/privacy') &&
				!page.includes('/terms') &&
				!page.includes('/blog/preview') &&
				!page.includes('/join') &&
				!page.includes('/glossary-review') &&
				!isNoindex(page),
			serialize(item) {
				const url = item.url;
				const lastmod = lastmodFor(url);
				if (lastmod) item = { ...item, lastmod };
				else delete item.lastmod;
				// 2jx: xhtml:link hreflang alternates for the language-edition product pages (same source as the head).
				const links = sitemapLinksFor(url);
				if (links) item = { ...item, links };
				// Homepage — highest priority
				if (url.endsWith('.com/') || url.endsWith('.com')) {
					return { ...item, changefreq: 'weekly', priority: 1.0 };
				}
				// Key landing pages
				if (url.includes('/samples') || url.includes('/guides')) {
					return { ...item, changefreq: 'monthly', priority: 0.9 };
				}
				// Blog index
				if (url.endsWith('/blog/') || url.endsWith('/blog')) {
					return { ...item, changefreq: 'weekly', priority: 0.8 };
				}
				// Blog posts
				if (url.includes('/blog/')) {
					return { ...item, changefreq: 'weekly', priority: 0.8 };
				}
				// Bible reader index
				if (url.endsWith('/read/') || url.endsWith('/read')) {
					return { ...item, changefreq: 'weekly', priority: 0.9 };
				}
				// Bible chapters
				if (url.includes('/read/')) {
					return { ...item, changefreq: 'monthly', priority: 0.85 };
				}
				// Default
				return { ...item, changefreq: 'monthly', priority: 0.7 };
			},
		}),
		// 2xw: <lastmod> on the sitemap INDEX entry = the newest TRUE lastmod inside that child file.
		// @astrojs/sitemap can only stamp one build-time date on every index entry, so we derive it
		// after the sitemap integration has written dist/ (integrations run in order).
		{
			name: 'sitemap-index-lastmod',
			hooks: {
				'astro:build:done': ({ dir }) => {
					const root = fileURLToPath(dir);
					const idx = path.join(root, 'sitemap-index.xml');
					if (!fs.existsSync(idx)) return;
					const next = addIndexLastmod(fs.readFileSync(idx, 'utf8'), (loc) => {
						try {
							return maxLastmod(fs.readFileSync(path.join(root, new URL(loc).pathname), 'utf8'));
						} catch {
							return undefined;
						}
					});
					fs.writeFileSync(idx, next);
				},
			},
		},
	],
	vite: {
		server: { allowedHosts: true },
		plugins: [tailwindcss()],
	},
});
