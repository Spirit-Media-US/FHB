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
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/d5bf406c5039b3d5ff0262302cdb49a56257060c-2497x3744.jpg',
	},
	{
		slug: 'mexico',
		country: 'Mexico',
		title: 'The Bible in Mexico',
		blurb:
			'The largest Spanish-speaking nation on earth — where the Father’s Heart Bible™ invites a deeply faithful people to meet the Father personally. Spanish is our #1 priority.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/b50f17816ea816a8f110c2ffddb17fc0a6544fc0-3264x2176.jpg',
	},
	{
		slug: 'nigeria',
		country: 'Nigeria',
		title: 'The Bible in Nigeria',
		blurb:
			'Africa’s most populous nation — where the Father’s Heart Bible™ invites every tribe and tongue to know God as a near and loving Father. English now, Pidgin on the way.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/aa8821b46e994ecfec690257b4f8287eb810dbf4-1825x1300.jpg',
	},
	{
		slug: 'philippines',
		country: 'the Philippines',
		title: 'The Bible in the Philippines',
		blurb:
			'The largest Christian nation in Asia — where the Father’s Heart Bible™ reveals a Father who is always near, even when earthly fathers must work far away.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/b97662a208363f9d75672796365b1511748fd2b1-1880x1253.jpg',
	},
	{
		slug: 'kenya',
		country: 'Kenya',
		title: 'The Bible in Kenya',
		blurb:
			'The heart of East Africa — where the Father’s Heart Bible™ reveals a Father near to the orphan and the weary, in a fervently Christian land. Swahili leads the roadmap.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/275b03def9aacaee75f4e796b910385dc632eacd-1880x1253.jpg',
	},
];
