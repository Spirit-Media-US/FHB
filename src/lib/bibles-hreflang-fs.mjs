// Node-side loader for bibles-hreflang.mjs: reads src/data/editions/*.json (config + tests; NOT used inside Astro pages).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { alternatesFrom, clusterFrom, sitemapLinksFrom } from './bibles-hreflang.mjs';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data/editions');
const load = () =>
	fs
		.readdirSync(DIR)
		.filter((f) => /^[a-z0-9-]+\.json$/.test(f))
		.map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));

export const biblesCluster = () => clusterFrom(load());
export const alternatesFor = (slug) => alternatesFrom(load(), slug);
export const sitemapLinksFor = (url) => sitemapLinksFrom(load(), url);
