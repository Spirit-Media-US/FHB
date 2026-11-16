// BUILD-CHECK: tool-inventory.py "cover hero height measure" (none sizes a web hero)
// NEAREST: SMP's src/lib/cover-hero.mjs (spirit-media-publishing) — THIS FILE MIRRORS IT for the FHB book pages
// NOT-REUSED-BECAUSE: FHB and SMP are separate repos/builds and cannot import each other; the two FH books
//   (who-am-i, beloved-identity) use the SAME hero, so they keep the SAME numbers (change both together)
// APPROVED-BY: Kevin 2026-11-16 brief pmprint-full-page-inspection-20261116 FIXES ("cover size rule test: every hero
//   cover renders >= the common height at 1440"; "Perfer larger as possible")
//
// HERO COVER SIZE RULE (Kevin 2026-11-16: "Some of the covers a bigger which is better on desktop. Others are smaller.
// Perfer larger as possible."). Every book page's hero cover is drawn to ONE common height, its width following its own
// aspect, and never wider than the hero column. Before this the box was a fixed 340px WIDTH, so a 2:3 3D render stood
// 475px tall and a square picture book 343px. Here: the FHB book page (src/pages/books/[slug].astro) and its
// build test (scripts/fhb-books.test.mjs); SMP's scripts/cover-hero-measure.mjs measures it in a browser.
//
// HERO_H.desktop = 550: the tallest cover today was 475 (a 2:3 3D render in the old 340px-wide box). The hero column at
// 1440 is MEASURED 554px wide (this site's max-w-5xl = 1152px, md:gap-10 = 45px: (1152 - 45) / 2), and the squarest
// 3D render (600x601) at 550 tall is 549 wide, so 550 is the tallest height every square picture book reaches without
// leaving its column. Only a LANDSCAPE cover (wider than tall) is width-bound below 550; it fills the column instead.
// The cover top sits ~230px down the page, so 550 still ends above the 900px fold at 1440x900.
// HERO_H.mobile = 336: the tallest cover at 390 today (240 wide 2:3) was 335, so no 2:3 cover shrinks and square
// covers grow from 240 to ~333 (the 390 column is measured 354).
// The 3D sources are 600px wide, so neither height upscales past the file at 1x; a 1200w file joins the srcset
// when the title has one.
export const HERO_H = { desktop: 550, mobile: 336 };
export const HERO_COL = { desktop: 554, mobile: 354 };
export const HERO_BP = 768; // md: the two-column hero starts here

/** aspect = width / height of the cover file (falls back to 2:3 when unknown) */
export function heroAspect(w, h) {
	return w > 0 && h > 0 ? w / h : 2 / 3;
}

/** The rendered width (CSS px) at the widest layout for each breakpoint: min(column, commonHeight x aspect). */
export function heroWidths(w, h) {
	const ar = heroAspect(w, h);
	return {
		desktop: Math.round(Math.min(HERO_COL.desktop, HERO_H.desktop * ar)),
		mobile: Math.round(Math.min(HERO_COL.mobile, HERO_H.mobile * ar)),
	};
}

/** img sizes attribute matching what is drawn, so the browser picks the right file */
export function heroSizes(w, h) {
	const x = heroWidths(w, h);
	return `(min-width: ${HERO_BP}px) ${x.desktop}px, ${x.mobile}px`;
}

/** srcset: 300 / 600 and the 1200 file when the title has one */
export function heroSrcset(cover) {
	if (!cover?.w300) return undefined;
	return [`${cover.w300} 300w`, `${cover.src} 600w`, cover.w1200 ? `${cover.w1200} 1200w` : null].filter(Boolean).join(', ');
}

/** inline style carrying the aspect into the .book-cover CSS rule */
export function heroStyle(w, h) {
	return `--ar: ${heroAspect(w, h).toFixed(4)};`;
}
