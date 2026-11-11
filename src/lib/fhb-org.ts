// ONE source of truth for the Father's Heart Bible Organization entity (unit 2ez-b).
// The home page and /overview/ both emit this node; other pages may reference FHB_ORG_REF.
// Mirrors the community app's shared node (community src/lib/fhb-org.ts) so /about and /read match.
export const FHB_ORG_ID = 'https://fathersheartbible.com/#organization';
export const SMP_ORG_ID = 'https://spiritmediapublishing.com/#organization';

// Real spelling variants people search (unit 2sy, 2026-11-11): no-apostrophe and "FHB Bible".
// ONE list; every Organization/WebSite/Book alternateName on the marketing site is built with withBrandVariants().
export const FHB_BRAND_VARIANTS = ['Fathers Heart Bible', 'FHB Bible'];
export function withBrandVariants(names: string[]): string[] {
	return [...new Set([...names, ...FHB_BRAND_VARIANTS])];
}

export const FHB_ORG_REF = { '@id': FHB_ORG_ID };

export const FHB_ORG_CORE = {
	'@type': 'Organization',
	'@id': FHB_ORG_ID,
	name: "Father's Heart Bible",
	alternateName: withBrandVariants(["Father's Heart Bible™", 'FHB']),
	url: 'https://fathersheartbible.com',
	logo: 'https://fathersheartbible.com/fhb-logo.png',
	parentOrganization: { '@id': SMP_ORG_ID },
	// Publisher/imprint is Spirit Media Publishing; Spirit Media Inc. is its PARENT.
	publisher: { '@id': SMP_ORG_ID },
	// FHB's own accounts. TikTok @fathersheartbible left out: the account does not exist (2026-10-21).
	sameAs: [
		'https://www.youtube.com/channel/UCzgp9q1JnqyyEgz_j--KiQg',
		'https://www.youtube.com/@FathersHeartBible',
		'https://www.instagram.com/fathersheartbible/',
		'https://www.facebook.com/1176654175531729',
		'https://www.linkedin.com/company/130004384',
		// English FHB version record on YouVersion (unit 2jk): our own structured data, not a link request.
		'https://www.bible.com/versions/4926-FHB',
		// Podcast show pages (unit 2qv): our own show, same URLs the footer uses.
		'https://open.spotify.com/show/4JY5TXhYE5vM6vhgxebsmY',
		'https://podcasts.apple.com/us/podcast/fathers-heart-bible%E2%84%A2-%E2%80%94-audio-bible/id6818374650',
	],
};
