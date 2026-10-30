// /bibles/lang/<code>/ — ONE permanent "In Print" link per reader language (Kevin 2026-10-15:
// "With 80 languages we need to automate the domino effect").
//
// The reader (community app) links every language's "Now in Print" to /bibles/lang/<code>/ and
// never needs editing again. This build step decides where that lands, from the edition
// registry the edition chain generates (`fhb-chain.py edition-emit`):
//   an edition listed in the registry → its own page, /bibles/<slug>-bible/
//   anything else (not on sale yet)   → /print/
// When the chain lists a new edition it ships marketing, this file re-runs, and the reader's
// link moves to the new page by itself. Appends to dist/_redirects (first match wins, so the
// per-language lines precede the catch-all).
//
// PRODUCTION REGRESSION 2026-10-30 (rules #113+ 404'd live): Cloudflare's _redirects parser
// (wrangler parseRedirects, `canCreateStaticRule`) counts EVERY rule after the first dynamic one
// (splat `*` or `:placeholder`) as DYNAMIC, and silently drops everything past 100 dynamic rules.
// public/_redirects carries a splat at line 24 (/the-fathers-heart-bible/lead-translator/*), so
// 12 static + 100 "dynamic" = 112 rules applied and the rest of the per-language lines, plus the
// :code catch-all, were dropped. Fix: this script now rewrites the WHOLE file with every static
// rule hoisted above the dynamic ones (refusing if a hoisted static path would be shadowed by a
// dynamic rule it used to follow — precedence must not change), then re-parses the result exactly
// the way Cloudflare does and FAILS THE BUILD if any rule would be dropped (static > 2000,
// dynamic > 100, invalid line). Selftest: node --test scripts/gen-edition-links.test.mjs
//
// 301 for a listed edition, 302 ONLY for the /print/ fallback (deploy ruling 2026-10-19, W43 site
// audit): every reader chapter page carries this link, so a 302 made Googlebot fetch a temporary
// redirect per chapter and gave the edition page weak link credit. A listed edition's page is
// permanent; the fallback must stay temporary because it moves by itself when the edition lists.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Cloudflare Pages limits (developers.cloudflare.com/pages/configuration/redirects/ "Limits";
// wrangler MAX_STATIC_REDIRECT_RULES / MAX_DYNAMIC_REDIRECT_RULES / MAX_LINE_LENGTH).
export const MAX_STATIC = 2000;
export const MAX_DYNAMIC = 100;
export const MAX_LINE = 1000;

const isRule = (line) => {
	const t = line.trim();
	return t.length > 0 && !t.startsWith('#');
};
const fromOf = (line) => line.trim().split(/\s+/)[0];
export const isDynamicFrom = (from) => from.includes('*') || /(^|\/):[A-Za-z]/.test(from);

// Pattern of a dynamic rule as a RegExp (splat = anything, :placeholder = one segment).
export function dynamicRegex(from) {
	const src = from
		.split(/(\*|:[A-Za-z]\w*)/)
		.map((part) => {
			if (part === '*') return '.*';
			if (/^:[A-Za-z]\w*$/.test(part)) return '[^/]+';
			return part.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
		})
		.join('');
	return new RegExp(`^${src}$`);
}

// The per-language lines: registry editions first, then sellable roster languages with a page.
export function editionLines(registry, roster, hasEditionPage) {
	const lines = [];
	let n = 0;
	for (const e of registry.editions ?? []) {
		if (!e.code || !e.slug) continue;
		lines.push(`/bibles/lang/${e.code}/ /bibles/${e.slug}-bible/ 301`);
		lines.push(`/bibles/lang/${e.code} /bibles/${e.slug}-bible/ 301`);
		n++;
	}
	// The rest of the 80 (Kevin 2026-10-29: "People can go ahead and buy any of the 80 languages"): a
	// roster language with its own edition page (src/data/editions/<slug>.json) lands there too.
	const listed = new Set((registry.editions ?? []).map((e) => e.code));
	for (const l of roster.languages ?? []) {
		if (!l.code || !l.slug || listed.has(l.code) || !l.sellable) continue;
		if (!hasEditionPage(l.slug)) continue;
		for (const c of new Set([l.code, l.rosterCode].filter(Boolean))) {
			lines.push(`/bibles/lang/${c}/ /bibles/${l.slug}-bible/ 301`);
			lines.push(`/bibles/lang/${c} /bibles/${l.slug}-bible/ 301`);
		}
		n++;
	}
	lines.push('/bibles/lang/:code/ /print/ 302', '/bibles/lang/:code /print/ 302');
	return { lines, n };
}

// Static rules first (original order), then dynamic rules (original order). Throws if a static
// rule would move ahead of an earlier dynamic rule that matches it (that would change who wins).
export function hoistStatic(text) {
	const out = [];
	const dynamics = [];
	for (const line of text.split('\n')) {
		if (isRule(line) && isDynamicFrom(fromOf(line))) {
			dynamics.push(line.trim());
			continue;
		}
		if (isRule(line)) {
			const from = fromOf(line);
			const shadow = dynamics.find((d) => dynamicRegex(fromOf(d)).test(from));
			if (shadow)
				throw new Error(
					`[gen-edition-links] static rule "${line.trim()}" follows dynamic "${shadow}", which matches it — reorder public/_redirects by hand`,
				);
		}
		out.push(line);
	}
	while (out.length && out[out.length - 1].trim() === '') out.pop();
	return [
		...out,
		'',
		'# DYNAMIC rules hoisted below every static rule by scripts/gen-edition-links.mjs — Cloudflare',
		'# counts every rule after the first dynamic one as dynamic and drops all past 100.',
		...dynamics,
		'',
	].join('\n');
}

// Re-parse the way Cloudflare does (wrangler parseRedirects). Returns { applied, static, dynamic, dropped }.
export function cloudflareParse(text) {
	let st = 0;
	let dy = 0;
	let canStatic = true;
	const dropped = [];
	const applied = [];
	const seen = new Set();
	const lines = text.split('\n');
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!isRule(line)) continue;
		if (line.length > MAX_LINE) { dropped.push(`line ${i + 1}: longer than ${MAX_LINE}`); continue; }
		const tok = line.split(/\s+/);
		if (tok.length < 2 || tok.length > 3) { dropped.push(`line ${i + 1}: ${tok.length} tokens`); continue; }
		const from = tok[0];
		if (canStatic && !isDynamicFrom(from)) {
			if (++st > MAX_STATIC) { dropped.push(`line ${i + 1}: static rule #${st} > ${MAX_STATIC}`); continue; }
		} else {
			canStatic = false;
			if (++dy > MAX_DYNAMIC) {
				for (let j = i; j < lines.length; j++) if (isRule(lines[j])) dropped.push(`line ${j + 1}: dynamic rule past ${MAX_DYNAMIC}`);
				break;
			}
		}
		if (seen.has(from)) { dropped.push(`line ${i + 1}: duplicate ${from}`); continue; }
		seen.add(from);
		applied.push({ from, to: tok[1], status: Number(tok[2] ?? 302) });
	}
	return { applied, static: st, dynamic: Math.min(dy, MAX_DYNAMIC), dropped };
}

// Where Cloudflare would send a path (first applied match; static exact first, as it parses).
export function resolve(applied, p) {
	for (const r of applied) {
		if (isDynamicFrom(r.from) ? dynamicRegex(r.from).test(p) : r.from === p) return r;
	}
	return null;
}

function main() {
	const root = process.cwd();
	const registry = JSON.parse(readFileSync(path.join(root, 'src/data/edition-registry.json'), 'utf8'));
	const roster = JSON.parse(readFileSync(path.join(root, 'src/data/language-roster.json'), 'utf8'));
	const out = path.join(root, 'dist/_redirects');
	if (!existsSync(out)) {
		console.error('[gen-edition-links] dist/_redirects missing — run after astro build');
		process.exit(1);
	}
	const { lines, n } = editionLines(registry, roster, (slug) =>
		existsSync(path.join(root, `src/data/editions/${slug}.json`)),
	);
	if (n === 0) {
		console.error('[gen-edition-links] registry lists no editions — refusing to publish an all-/print/ map');
		process.exit(1);
	}
	const text = hoistStatic(
		[
			readFileSync(out, 'utf8').replace(/\s+$/, ''),
			'',
			'# GENERATED by scripts/gen-edition-links.mjs from src/data/edition-registry.json + language-roster.json',
			...lines,
		].join('\n'),
	);
	const parsed = cloudflareParse(text);
	if (parsed.dropped.length) {
		console.error(`[gen-edition-links] Cloudflare would DROP ${parsed.dropped.length} rule(s):\n  ${parsed.dropped.join('\n  ')}`);
		process.exit(1);
	}
	for (const l of lines) {
		const [from, to, status] = l.split(' ');
		if (isDynamicFrom(from)) continue;
		const r = resolve(parsed.applied, from);
		if (!r || r.to !== to || String(r.status) !== status) {
			console.error(`[gen-edition-links] ${from} would not land on ${to} ${status}`);
			process.exit(1);
		}
	}
	writeFileSync(out, text);
	console.log(
		`[gen-edition-links] ${n} edition links; every other language → /print/; _redirects parses as ${parsed.static} static + ${parsed.dynamic} dynamic, 0 dropped`,
	);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
