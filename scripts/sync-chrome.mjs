#!/usr/bin/env node
// sync-chrome.mjs (FHB site) — pulls the SHARED chrome from its canonical home
// in the community repo and copies it into src/chrome/ (gitignored, generated),
// then runs a token drift-guard so the site's @theme palette can't silently
// diverge from the canonical brand tokens in communities/fhb.json.
//
// Mechanism B (shared source + sync), decided 2026-06-04. Runs first in the
// build chain, exactly like sync-translations.mjs. Both repo paths exist on
// Bethel where builds run.
import { existsSync, mkdirSync, copyFileSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const CANONICAL =
	process.env.CHROME_CANONICAL_DIR ||
	path.resolve(process.cwd(), "../community/chrome");
const FHB_JSON =
	process.env.CHROME_BRAND_JSON ||
	path.resolve(CANONICAL, "../communities/fhb.json");
const DEST = path.resolve(process.cwd(), "src/chrome");
const GLOBAL_CSS = path.resolve(process.cwd(), "src/styles/global.css");

function fail(msg) {
	console.error(`[sync-chrome] ${msg}`);
	process.exit(1);
}

if (!existsSync(CANONICAL)) {
	fail(`canonical chrome dir not found: ${CANONICAL}. Is the community repo checked out alongside FHB?`);
}

// 1) Copy chrome/*.astro → src/chrome/
mkdirSync(DEST, { recursive: true });
const files = readdirSync(CANONICAL).filter((f) => f.endsWith(".astro"));
if (!files.length) fail(`no .astro components found in ${CANONICAL}`);
for (const f of files) {
	copyFileSync(path.join(CANONICAL, f), path.join(DEST, f));
}
console.log(`[sync-chrome] copied ${files.length} chrome component(s) → src/chrome/: ${files.join(", ")}`);

// 2) Token drift-guard: every brand color that ALSO exists in global.css @theme
//    must match. Catches silent palette drift between the two builds.
function camelToKebab(s) {
	return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}
if (!existsSync(FHB_JSON)) fail(`brand JSON not found: ${FHB_JSON}`);
if (!existsSync(GLOBAL_CSS)) fail(`global.css not found: ${GLOBAL_CSS}`);
const brand = JSON.parse(readFileSync(FHB_JSON, "utf8"));
const colors = brand?.brand?.colors ?? {};
const css = readFileSync(GLOBAL_CSS, "utf8");

const drift = [];
let checked = 0;
for (const [key, value] of Object.entries(colors)) {
	const varName = `--color-${camelToKebab(key)}`;
	// Match "--color-foo: #hex;" in the @theme block.
	const re = new RegExp(`${varName}\\s*:\\s*([^;]+);`);
	const m = css.match(re);
	if (!m) continue; // token only lives in fhb.json — nothing to compare
	checked++;
	const cssVal = m[1].trim().toLowerCase();
	if (cssVal !== String(value).trim().toLowerCase()) {
		drift.push(`${varName}: global.css=${cssVal} vs fhb.json=${value}`);
	}
}
if (drift.length) {
	fail(
		`brand token DRIFT between FHB global.css and communities/fhb.json — reconcile both to the canonical value:\n  - ` +
			drift.join("\n  - "),
	);
}
console.log(`[sync-chrome] token drift-guard OK (${checked} shared color tokens match the canonical brand).`);
