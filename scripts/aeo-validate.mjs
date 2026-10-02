#!/usr/bin/env node
/**
 * aeo-validate.mjs — post-build AEO schema validator
 *
 * Walks every HTML file in dist/ and validates Person JSON-LD blocks:
 *
 *  Hard-fail conditions (build fails with exit 1):
 *    - A Person object has `sameAs` with fewer than 3 entries (any content)
 *    - A Person object's `image` field contains the literal string "TODO"
 *    - A Person object is missing required identity fields (name, jobTitle/description)
 *
 *  Warn-only conditions (loud log, build succeeds):
 *    - sameAs has 3+ entries but some still contain "TODO_" placeholders
 *      → unblocks dev work until Kevin supplies real external profile URLs;
 *        the smp-aeo-audit.sh row C3 enforces the stricter "≥3 valid URLs"
 *        rule as the actual gate before signal flip
 *
 * Per /home/deploy/claude-config/rules/smp-aeo-readiness-standard.md
 * row C3 — Person `sameAs` to ≥3 external profiles (no TODO/placeholder).
 * Brief: "Renderer should hard-fail the build if the sameAs array has
 * fewer than 3 entries or the image is TODO."
 *
 * Set AEO_STRICT=1 in env to also fail on TODO_ placeholders.
 *
 * SECOND CHECK — internal URLs that REDIRECT (hard-fail, 2026-10-02):
 *   Every marketing page and every /read/ reader path canonicalizes WITH a trailing
 *   slash; the slashless form answers 301/308. An <a href>, <link rel=canonical|alternate
 *   hreflang>, og:url or JSON-LD URL pointing at the slashless form sends crawlers through
 *   a redirect and contradicts our own canonical. The 2026-10-02 indexing audit counted
 *   1,178 JSON-LD, 156 hreflang and 2,915 <a> references to redirects in this build.
 *   Flagged: a first-party path with no extension and no trailing slash that is either
 *   under /read/ or is a page this build emits (dist/<path>/index.html exists).
 *   Community-app routes (/library, /login …) canonicalize WITHOUT a slash and are not
 *   flagged. The LOCKED global nav + footer (<header>/<footer>, Kevin's approval only —
 *   rules/fhb-web.md) are not scanned: their "/read" link is his to change, not this build's.
 *   Drill: SLASH_DRILL=1 injects a slashless link and must exit 1.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const DIST = resolve('dist');
const STRICT = process.env.AEO_STRICT === '1';

function walk(dir, out = []) {
	for (const name of readdirSync(dir)) {
		const p = join(dir, name);
		const s = statSync(p);
		if (s.isDirectory()) walk(p, out);
		else if (name.endsWith('.html')) out.push(p);
	}
	return out;
}

function extractJsonLd(html) {
	const blocks = [];
	const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
	let m;
	while ((m = re.exec(html)) !== null) {
		const raw = m[1].trim();
		try {
			const parsed = JSON.parse(raw);
			blocks.push(parsed);
		} catch (_e) {
			// skip malformed
		}
	}
	return blocks;
}

function findPersons(node, out = []) {
	if (!node || typeof node !== 'object') return out;
	if (Array.isArray(node)) {
		for (const n of node) findPersons(n, out);
		return out;
	}
	if (node['@type'] === 'Person') out.push(node);
	if (Array.isArray(node['@graph'])) {
		for (const n of node['@graph']) findPersons(n, out);
	}
	return out;
}

const failures = [];
const warnings = [];

const htmlFiles = walk(DIST);
for (const file of htmlFiles) {
	const relPath = file.replace(`${DIST}/`, '');
	const html = readFileSync(file, 'utf8');
	const blocks = extractJsonLd(html);
	for (const block of blocks) {
		for (const person of findPersons(block)) {
			const name = person.name || '(unnamed)';
			const sameAs = Array.isArray(person.sameAs) ? person.sameAs : [];
			const image = person.image || '';

			if (!person.name) {
				failures.push(`${relPath} — Person missing 'name'`);
			}
			if (!person.jobTitle && !person.description) {
				failures.push(`${relPath} — Person "${name}" missing both 'jobTitle' and 'description'`);
			}
			if (sameAs.length < 3) {
				failures.push(
					`${relPath} — Person "${name}" sameAs has ${sameAs.length} entries (need ≥3)`,
				);
			}
			const todoEntries = sameAs.filter(
				(s) => typeof s === 'string' && /TODO[_-]?/i.test(s),
			);
			if (todoEntries.length > 0) {
				const msg = `${relPath} — Person "${name}" sameAs has ${todoEntries.length} TODO placeholder(s): ${todoEntries.join(', ')}`;
				if (STRICT) failures.push(msg);
				else warnings.push(msg);
			}
			if (typeof image === 'string' && /TODO/i.test(image)) {
				failures.push(`${relPath} — Person "${name}" image contains TODO: ${image}`);
			}
		}
	}
}

// ── Second check: internal URLs that redirect (see header) ───────────────────────
const ORIGIN = 'https://fathersheartbible.com';
function redirectingPath(raw) {
	// JSON-LD can carry HTML with escaped quotes (href=\\"…\\"), so a captured URL may end in "\\".
	let u = raw.replace(/&amp;/g, '&').replace(/\\+$/, '');
	if (u.startsWith(ORIGIN)) u = u.slice(ORIGIN.length) || '/';
	else if (!u.startsWith('/') || u.startsWith('//')) return null;
	const path = u.split(/[?#]/)[0];
	if (!path || path.endsWith('/') || /\.[a-z0-9]{2,5}$/i.test(path)) return null;
	if (path === '/read' || path.startsWith('/read/')) return path;
	try {
		statSync(join(DIST, path, 'index.html'));
		return path;
	} catch {
		return null;
	}
}
const slashHits = new Map(); // path -> Set of "file (context)"
function noteUrl(raw, file, kind) {
	const p = redirectingPath(raw);
	if (!p) return;
	if (!slashHits.has(p)) slashHits.set(p, new Set());
	slashHits.get(p).add(`${file} (${kind})`);
}
for (const file of htmlFiles) {
	const relPath = file.replace(`${DIST}/`, '');
	if (relPath.startsWith('studio/')) continue;
	let html = readFileSync(file, 'utf8');
	if (process.env.SLASH_DRILL === '1' && relPath === 'index.html') {
		html += '<a href="/read/john/3">drill</a><script type="application/ld+json">{"url":"https://fathersheartbible.com/print"}</script>';
	}
	// Locked chrome (global nav + footer) is excluded from the <a> scan — see header.
	// Markers are the synced chrome's own root tags (src/chrome/Header.astro, Footer.astro).
	const body = html
		.replace(/<header id="chrome-header"[\s\S]*?<\/header>/g, '')
		.replace(/<footer style="(?:background-color: var\(--color-inverse-surface|padding: 32px 24px; border-top)[\s\S]*?<\/footer>/g, '');
	for (const m of body.matchAll(/<a\b[^>]*?\bhref="([^"]+)"/gi)) noteUrl(m[1], relPath, 'a');
	for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
		const tag = m[0];
		if (!/rel="(canonical|alternate)"/i.test(tag)) continue;
		const h = tag.match(/href="([^"]+)"/i);
		if (h) noteUrl(h[1], relPath, /hreflang/i.test(tag) ? 'hreflang' : 'canonical');
	}
	for (const m of html.matchAll(/<meta[^>]*property="og:url"[^>]*content="([^"]+)"/gi)) noteUrl(m[1], relPath, 'og:url');
	for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
		for (const u of m[1].matchAll(/"(https:\/\/fathersheartbible\.com[^"]*)"/g)) noteUrl(u[1], relPath, 'json-ld');
	}
}
if (slashHits.size) {
	console.error(`\n[aeo-validate] ✗ ${slashHits.size} internal URL(s) point at a redirect (missing trailing slash):`);
	for (const [p, where] of slashHits) {
		const list = [...where];
		console.error(`  ✗ ${p}  ← ${list.slice(0, 3).join(', ')}${list.length > 3 ? ` … +${list.length - 3} more` : ''}`);
	}
	console.error('\n  Fix: link the canonical form with the trailing slash (e.g. /read/john/3/, /print/).');
	process.exit(1);
}

if (warnings.length) {
	console.warn(`\n[aeo-validate] ${warnings.length} warning(s):`);
	for (const w of warnings) console.warn(`  ! ${w}`);
}

if (failures.length) {
	console.error(`\n[aeo-validate] ✗ ${failures.length} hard-fail violation(s):`);
	for (const f of failures) console.error(`  ✗ ${f}`);
	console.error(
		'\n  Fix: supply real LinkedIn / X / Substack / YouTube URLs in the affected Person JSON-LD blocks.',
	);
	process.exit(1);
}

console.log(
	`[aeo-validate] ✓ Person JSON-LD validated across ${htmlFiles.length} page(s); 0 internal URLs point at a redirect` +
		(warnings.length ? ` (${warnings.length} TODO placeholder warning(s) — replace before Phase 4 signal flip)` : ''),
);
