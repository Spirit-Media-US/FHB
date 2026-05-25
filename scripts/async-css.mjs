#!/usr/bin/env node
/**
 * Post-build: convert Astro's render-blocking <link rel="stylesheet" href="/_astro/*.css">
 * tags into async-loaded ones via the media="print" onload swap.
 *
 * This keeps the page rendering with our hand-rolled critical inline CSS
 * while the full Tailwind bundle arrives in the background.
 *
 * EXCLUDE LIST: pages whose LCP element is text (not a preloaded hero image)
 * MUST NOT defer their stylesheet. When the deferred bundle lands mid-paint,
 * font-sizes / max-widths / paddings flip from the critical CSS defaults to
 * the Tailwind values (text-4xl, pt-32, max-w-5xl, etc.), reflowing the
 * above-fold text and producing massive CLS (0.4-0.7 measured on /read/
 * and /blog/ index 2026-05-25). The fix: keep the stylesheet render-blocking
 * on these specific pages — the ~30ms paint delay is far cheaper than the
 * CLS hit, and the critical inline CSS doesn't have to absorb every utility
 * class used above the fold.
 *
 * Pages WITH hero images (/, /about, /samples, blog posts, etc.) are fine
 * with async because the preloaded hero dominates LCP and absorbs the
 * subsequent stylesheet-driven text reflow.
 */
import fs from 'node:fs';
import path from 'node:path';

const DIST = path.resolve('dist');

// Render-blocking pages (no hero image to absorb LCP / text-LCP pages).
// Paths are relative to DIST, no leading slash.
const SYNC_CSS_PAGES = new Set([
	'blog/index.html',
	'read/index.html',
]);

// Render-blocking page prefixes (dir + everything under it).
const SYNC_CSS_PREFIXES = [
	'read/', // all Bible chapter pages — text-heavy
];

function isSyncPage(relPath) {
	if (SYNC_CSS_PAGES.has(relPath)) return true;
	for (const prefix of SYNC_CSS_PREFIXES) {
		if (relPath.startsWith(prefix)) return true;
	}
	return false;
}

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
let skipped = 0;
for (const file of walk(DIST)) {
	const rel = path.relative(DIST, file);
	if (isSyncPage(rel)) {
		skipped++;
		continue;
	}
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
console.log(`async-css: converted ${converted} stylesheet tag(s), skipped ${skipped} sync-CSS page(s)`);
