// Single source of truth for the "Father's Heart Bible™ Around the World" hub
// (/bible-in). Each entry is a live per-country landing page that targets
// "Bible in <country>" search/AEO intent and funnels to /read + /partner.
// Add a row here ONLY when the matching /bible-in/<slug>.astro page ships —
// the hub renders a card for every entry, so an entry without a page = a 404.
export interface Nation {
	slug: string;
	country: string; // display name, e.g. "India"
	title: string; // card title, e.g. "The Bible in India"
	blurb: string; // 1–2 sentence card summary
	img: string; // Sanity CDN base URL (sizing params appended by the renderer)
}

export const NATIONS: Nation[] = [
	{
		slug: 'india',
		country: 'India',
		title: 'The Bible in India',
		blurb:
			'One of the world’s largest English-reading populations can read the Father’s Heart Bible free today — with Hindi among the first translations on our roadmap.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/6251d0054881b302d10b339359d39b107db86cc5-6669x4451.jpg',
	},
	{
		slug: 'brazil',
		country: 'Brazil',
		title: 'The Bible in Brazil',
		blurb:
			'The largest Bible nation on earth — where the Father’s Heart Bible™ invites 217 million people to meet the Father in the book they already love.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/5f3eac722a31c44eaa305a80dbf004c27a222df7-4680x3744.jpg',
	},
];
