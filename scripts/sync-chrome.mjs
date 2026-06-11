#!/usr/bin/env node
// sync-chrome.mjs (FHB site) — pulls the SHARED chrome from its canonical home
// in the community repo and copies it into src/chrome/ (gitignored, generated),
// then runs a token drift-guard so the site's @theme palette can't silently
// diverge from the canonical brand tokens in communities/fhb.json.
//
// Mechanism B (shared source + sync), decided 2026-06-04. Runs first in the
// build chain, exactly like sync-translations.mjs. Both repo paths exist on
// Bethel where builds run.
import { existsSync, mkdirSync, copyFileSync, readFileSync, readdirSync, writeFileSync, rmSync } from "node:fs";
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
	const dest = path.join(DEST, f);
	// Remove any prior copy first: copyFileSync chmods the dest to match the
	// source after copying, which throws EPERM when the existing dest is owned
	// by a different dev (these are gitignored, mixed-ownership build artifacts).
	// Unlinking guarantees a fresh file owned by whoever runs this build.
	rmSync(dest, { force: true });
	copyFileSync(path.join(CANONICAL, f), dest);
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

// 3) Emit the canonical global nav (fhb.json brand.navLinks) for the FHB site.
//    Two classes of app-relative href need DIFFERENT origins:
//
//    a) MARKETING routes that THIS repo builds (/, /partner, /blog, …) exist on
//       every FHB deploy — including the dev.pages.dev preview. Keep them
//       RELATIVE so they resolve to the current origin: on dev they stay on dev
//       (so content/pages are reviewable before merge), on the apex they stay on
//       the apex. This is the env-correct behavior Kevin/Jay expect from dev.
//    b) COMMUNITY APP routes (/read, /login, /feed, /library, /events, …) do NOT
//       exist on the FHB preview — they're served only UNDER the production apex
//       by the fhb-apex-router Worker. Pin those to the apex ORIGIN so they work
//       from any surface (a relative /read on dev would 404).
//
//    The marketing set is derived from src/pages (no hardcoded list to drift).
//    Recurses into children.
const APP_ORIGIN = "https://fathersheartbible.com";
const PAGES_DIR = path.resolve(process.cwd(), "src/pages");
const marketingSegments = () => {
	const set = new Set();
	for (const entry of readdirSync(PAGES_DIR)) {
		const seg = entry.replace(/\.(astro|md|mdx|html)$/i, "").toLowerCase();
		if (seg === "index" || seg === "404") continue; // root + error page aren't nav targets
		set.add(seg);
	}
	return set;
};
const MARKETING = marketingSegments();
const isMarketingPath = (href) => {
	if (href === "/") return true; // home — built here
	const seg = href.split(/[/?#]/)[1]?.toLowerCase() ?? "";
	return MARKETING.has(seg);
};
// Normalize every href to a path first (marketing links are stored absolute to
// the apex in fhb.json; app links are stored relative), then re-emit:
//   marketing → RELATIVE (current-origin: dev on dev, apex on apex)
//   app       → ABSOLUTE to the production apex (only surface it exists on)
// Hrefs on a different origin (not the apex) pass through untouched.
const resolveHref = (href) => {
	if (typeof href !== "string") return href;
	let p;
	if (href.startsWith(`${APP_ORIGIN}/`) || href === APP_ORIGIN) {
		p = href.slice(APP_ORIGIN.length) || "/";
	} else if (href.startsWith("/")) {
		p = href;
	} else {
		return href; // external origin — leave as-is
	}
	return isMarketingPath(p) ? p : APP_ORIGIN + p;
};
const resolveNav = (items) =>
	(items ?? []).map((it) => ({
		...it,
		href: resolveHref(it.href),
		...(it.children ? { children: resolveNav(it.children) } : {}),
	}));
const navResolved = resolveNav(brand?.brand?.navLinks ?? []);
writeFileSync(
	path.join(DEST, "nav.generated.json"),
	`${JSON.stringify(navResolved, null, 2)}\n`,
);
console.log(`[sync-chrome] wrote ${navResolved.length} canonical global-nav item(s) → src/chrome/nav.generated.json`);
