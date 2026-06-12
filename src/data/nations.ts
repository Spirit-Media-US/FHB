// Single source of truth for the "Father's Heart Bible Around the World" hub
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
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/82a0a4ceff7d68b1489b2085f692af2ed4f0e58c-6016x4016.jpg',
	},
];
