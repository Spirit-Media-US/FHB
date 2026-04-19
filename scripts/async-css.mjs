#!/usr/bin/env node
/**
 * Post-build: convert Astro's render-blocking <link rel="stylesheet" href="/_astro/*.css">
 * tags into async-loaded ones via the media="print" onload swap.
 *
 * This keeps the page rendering with our hand-rolled critical inline CSS
 * while the full Tailwind bundle arrives in the background.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');

function walk(dir) {
	const out = [];
	for (const name of fs.readdirSync(dir)) {
		const p = path.join(dir, name);
		const stat = fs.statSync(p);
		if (stat.isDirectory()) out.push(...walk(p));
		else if (name.endsWith('.html')) out.push(p);
	}
	return out;
}

const re = /<link rel="stylesheet" href="\/_astro\/[^"]+\.css">/g;
let converted = 0;
for (const file of walk(DIST)) {
	const before = fs.readFileSync(file, 'utf8');
	const after = before.replace(re, (m) => {
		converted++;
		const href = m.match(/href="([^"]+)"/)[1];
		// media="print" onload swap → non-blocking async CSS
		// <noscript> fallback keeps the site usable when JS is disabled
		return `<link rel="stylesheet" href="${href}" media="print" onload="this.media='all'"><noscript><link rel="stylesheet" href="${href}"></noscript>`;
	});
	if (after !== before) fs.writeFileSync(file, after);
}
console.log(`async-css: converted ${converted} stylesheet tag(s)`);
