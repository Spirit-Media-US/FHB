// AUTHOR SITES (Kevin 2026-11-16 "Can you search and link to other sites including author businesses"; brief
// pmprint-author-sites-20261116.md). One reader for src/data/author-sites.json, used by the About-the-author
// link row (src/components/AuthorLinks.astro) AND the page JSON-LD author Person, so the two can never disagree.
// Only grade CERTAIN renders: the data file holds only CERTAIN rows, and this filter refuses anything else anyway.
// Gate: scripts/author-sites.test.mjs.
import data from '../data/author-sites.json' with { type: 'json' };

export const SITE_ORDER = ['Website', 'Business', 'Ministry', 'LinkedIn', 'Facebook', 'Instagram', 'YouTube'];
export const SOCIAL = new Set(['LinkedIn', 'Facebook', 'Instagram', 'YouTube']);
const okUrl = (u) => typeof u === 'string' && /^https:\/\/[^\s"<>]+$/i.test(u);

/** The author's CERTAIN sites, in display order (main Website, businesses/ministries, then socials); [] when none. */
export function authorSites(name, table = data) {
	const rows = (name && table?.[name]?.sites) || [];
	const seen = new Set();
	return rows
		.filter((s) => s && s.grade === 'CERTAIN' && SITE_ORDER.includes(s.label) && okUrl(s.url))
		.filter((s) => !seen.has(s.url) && seen.add(s.url))
		.sort((a, b) => SITE_ORDER.indexOf(a.label) - SITE_ORDER.indexOf(b.label));
}

/** JSON-LD for the author Person (pmseoaeo metadata model, Kevin 2026-11-16 "should we add metadate for these links"):
 *  url    = the author's OWN main site (label Website); none = no url
 *  sameAs = the author's own site + official social profiles ONLY (Website/LinkedIn/Facebook/Instagram/YouTube)
 *  worksFor = each business/ministry they run, as its own Organization {name, url}; when the evidence says they founded
 *           it, the Organization carries founder = the author. A business/ministry is NEVER in sameAs. */
export const SAME_AS = new Set(['Website', 'LinkedIn', 'Facebook', 'Instagram', 'YouTube']);
export const ORG = new Set(['Business', 'Ministry']);
export function authorLd(name, table = data) {
	const sites = authorSites(name, table);
	if (!sites.length) return {};
	const main = sites.find((s) => s.label === 'Website');
	const same = sites.filter((s) => SAME_AS.has(s.label)).map((s) => s.url);
	const orgs = sites
		.filter((s) => ORG.has(s.label))
		.map((s) => ({
			'@type': 'Organization',
			name: s.name || s.url,
			url: s.url,
			...(/\bfound(?:ed|er|ing)|co-?founder|\bstarted\b/i.test(s.evidence ?? '') ? { founder: { '@type': 'Person', name } } : {}),
		}));
	return {
		...(main ? { url: main.url } : {}),
		...(same.length ? { sameAs: same } : {}),
		...(orgs.length ? { worksFor: orgs.length === 1 ? orgs[0] : orgs } : {}),
	};
}
