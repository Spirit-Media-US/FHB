// BUILD-CHECK: searched "new tab external link label" (bin/tool-inventory.py 2026-11-16) + grep of both site src/ for
//   "opens in a new tab" -> 0 hits; no helper labels cross-site or new-tab links on either site.
// NEAREST: none (fhb-partner-link-watch.py watches partner links off-site; it renders nothing).
// NOT-REUSED-BECAUSE: this is site source (markup strings for the store templates), not a tool; nothing to extend.
// APPROVED-BY: pmprint queue item 56d42ed1 (brief pmprint-cross-site-links-20261116.md; Kevin 2026-11-16 "should
//   follow industry best practices").
//
// CROSS-SITE + NEW-TAB LINK LABELS (NN/g "Opening links in new browser windows and tabs"; WCAG 2.2 SC 3.2.5 / G201).
// ONE rule for both sites, kept identical in the SMP repo (src/lib/xsite.ts there, SISTER_HOST swapped):
// 1. A link to the sister site (SMP <-> FHB) opens in the SAME tab and carries a small muted destination label
//    inside the link, so it is part of the accessible name: "All SMP Books · spiritmediapublishing.com".
// 2. A link to a third party (Amazon, Audible, the YouVersion app ...) or a PDF stays in a NEW tab and says so to a
//    screen reader: "(opens in a new tab)".
// Style: .xsite-dest / .xsite-sr in src/styles/global.css. Gate: scripts/xsite-links.test.mjs.
export const SISTER_HOST = 'spiritmediapublishing.com';
export const NEW_TAB_TEXT = 'opens in a new tab';

/** The sister site's bare host when `href` points at it (apex or www, never a subdomain like assets.), else null. */
export function sisterHost(href: string | null | undefined): string | null {
	const m = /^(?:https?:)?\/\/(?:www\.)?([^/:?#]+)/i.exec(String(href ?? ''));
	return m && m[1].toLowerCase() === SISTER_HOST ? SISTER_HOST : null;
}
/** The destination label, visible (default) or screen-reader-only (an image link whose visible label sits beside it). */
export const destHtml = (host: string, sr = false) =>
	`<span class="${sr ? 'xsite-sr' : 'xsite-dest'}"> <span aria-hidden="true">·</span> ${host}</span>`;
export const newTabHtml = `<span class="xsite-sr"> (${NEW_TAB_TEXT})</span>`;
