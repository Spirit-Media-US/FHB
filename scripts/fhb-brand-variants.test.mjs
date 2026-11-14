// node --test scripts/fhb-brand-variants.test.mjs  (unit 2sy)
// Every listed page's Organization/WebSite/Book alternateName must carry both brand spelling variants,
// built from the ONE shared FHB_BRAND_VARIANTS constant. Source-level (no build needed).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const lib = read('src/lib/fhb-org.ts');
const variants = [...lib.match(/FHB_BRAND_VARIANTS\s*=\s*\[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
test('shared constant holds both variants', () => {
	assert.deepEqual(variants, ['Fathers Heart Bible', 'FHB Bible']);
});
test('shared Organization alternateName uses the constant', () => {
	assert.match(lib, /alternateName:\s*withBrandVariants\(/);
});
const PAGES = { 'src/pages/index.astro': 3, 'src/pages/overview.astro': 1, 'src/pages/print.astro': 1, 'src/pages/the-fathers-heart-bible.astro': 1 };
for (const [f, n] of Object.entries(PAGES)) {
	test(`${f}: ${n} alternateName block(s) wrapped in withBrandVariants`, () => {
		const s = read(f);
		const alts = [...s.matchAll(/["']?alternateName["']?\s*:\s*(\w+)\(/g)].filter((m) => m[1] === 'withBrandVariants' || m[1] === 'x');
		// index.astro: WebSite + Book (Organization is spread from FHB_ORG_CORE)
		const expected = f.endsWith('index.astro') ? 2 : 1;
		assert.equal(alts.length, expected, `${f} alternateName wrapped count`);
		assert.match(s, /withBrandVariants/);
	});
}
test('home spreads shared Org core; overview too', () => {
	assert.match(read('src/pages/index.astro'), /\.\.\.FHB_ORG_CORE/);
	assert.match(read('src/pages/overview.astro'), /\.\.\.FHB_ORG_CORE/);
});
test('failure path: an unwrapped alternateName is detected', () => {
	const bad = `"alternateName": ["Father's Heart Bible", "FHB"],`;
	assert.equal([...bad.matchAll(/["']?alternateName["']?\s*:\s*(\w+)\(/g)].length, 0);
});
