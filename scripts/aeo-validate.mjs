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
	`[aeo-validate] ✓ Person JSON-LD validated across ${htmlFiles.length} page(s)` +
		(warnings.length ? ` (${warnings.length} TODO placeholder warning(s) — replace before Phase 4 signal flip)` : ''),
);
