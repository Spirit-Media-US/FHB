import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
	site: process.env.PUBLIC_SITE_URL || 'http://localhost:4321',
	output: 'static',
	integrations: [sitemap()],
	vite: {
		server: { allowedHosts: ["preview.spiritmediapublishing.com"] },
		plugins: [tailwindcss()],
	},
})
