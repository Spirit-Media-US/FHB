import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
	site: process.env.PUBLIC_SITE_URL || 'http://localhost:4323',
	output: 'static',
	server: { port: 4323, host: true },
	integrations: [sitemap({
		serialize(item) {
			if (item.url.endsWith('/')) {
				return { ...item, changefreq: 'weekly', priority: 1.0, lastmod: new Date().toISOString() };
			}
			if (item.url.includes('/download')) {
				return { ...item, changefreq: 'monthly', priority: 0.9, lastmod: new Date().toISOString() };
			}
			if (item.url.includes('/samples')) {
				return { ...item, changefreq: 'monthly', priority: 0.9, lastmod: new Date().toISOString() };
			}
			return { ...item, changefreq: 'monthly', priority: 0.7, lastmod: new Date().toISOString() };
		},
	})],
	vite: {
		server: { allowedHosts: true },
		plugins: [tailwindcss()],
	},
})
