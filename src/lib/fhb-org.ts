// ONE source of truth for the Father's Heart Bible Organization entity (unit 2ez-b).
// The home page and /overview/ both emit this node; other pages may reference FHB_ORG_REF.
// Mirrors the community app's shared node (community src/lib/fhb-org.ts) so /about and /read match.
export const FHB_ORG_ID = 'https://fathersheartbible.com/#organization';
export const SMP_ORG_ID = 'https://spiritmediapublishing.com/#organization';

export const FHB_ORG_REF = { '@id': FHB_ORG_ID };

export const FHB_ORG_CORE = {
	'@type': 'Organization',
	'@id': FHB_ORG_ID,
	name: "Father's Heart Bible",
	alternateName: ["Father's Heart Bible™", 'FHB'],
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
	],
};
