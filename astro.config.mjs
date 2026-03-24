import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
	site: process.env.PUBLIC_SITE_URL || 'http://localhost:4323',
	output: 'static',
	server: { port: 4323, host: true },
	integrations: [sitemap()],
	vite: {
		server: { allowedHosts: true },
		plugins: [tailwindcss()],
	},
})
