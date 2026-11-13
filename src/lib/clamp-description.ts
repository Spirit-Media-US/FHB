// Meta-description cap (3ac, 2026-11-13): the community app's 2ya clampDescription
// (community src/lib/chapter-meta.ts), ported for the English marketing pages. Collapse
// whitespace, cut on a grapheme then word boundary; result <= 160 code points (Bing/Google
// truncate past that). Text under the cap is returned unchanged.
export const META_DESCRIPTION_MAX = 160;

const cpLen = (s: string) => [...s].length;
const graphemes = (s: string) =>
	[...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(s)].map((x) => x.segment);

export function clampDescription(raw: string, max = META_DESCRIPTION_MAX): string {
	const clean = raw
		.replace(/\p{Cc}+/gu, ' ')
		.replace(/\s+/g, ' ')
		.trim();
	const g = graphemes(clean);
	if (g.length <= max && cpLen(clean) <= max) return clean;
	let cps = 0;
	let n = 0;
	while (n < g.length && cps + cpLen(g[n]) <= max - 1) {
		cps += cpLen(g[n]);
		n++;
	}
	const cut = g.slice(0, n).join('');
	const sp = cut.lastIndexOf(' ');
	const base = sp > cut.length * 0.6 ? cut.slice(0, sp) : cut;
	return `${base.replace(/[\s,;:—-]+$/, '')}…`;
}
