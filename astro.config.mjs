import inline from '@playform/inline';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

export default defineConfig({
	site: process.env.PUBLIC_SITE_URL || 'https://fathersheartbible.com',
	output: 'static',
	server: { port: 4323, host: true },
	build: { inlineStylesheets: 'always' },
	integrations: [
		inline(),
		sitemap({
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
