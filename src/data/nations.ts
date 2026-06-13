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
		slug: 'usa',
		country: 'the USA',
		title: 'The Bible in the USA',
		blurb:
			'A nation of more Bibles than any on earth — where the Father’s Heart Bible™ invites a people who own the book to finally meet the Father in it. English is live now and reaches ~1.5 billion worldwide.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/2658a7764aeef2dbe21f813fa7027e46dd261083-1880x1253.jpg',
	},
	{
		slug: 'china',
		country: 'China',
		title: 'The Bible in China',
		blurb:
			'The world’s largest people, home to one of the fastest-growing churches in history — where the Father’s Heart Bible™ longs to reveal, in Mandarin, a Father near to the weary. Mandarin among our highest priorities.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/8929e8beea5b7ea98aafaa68ae190802d03117aa-1733x1300.jpg',
	},
	{
		slug: 'egypt',
		country: 'Egypt',
		title: 'The Bible in Egypt',
		blurb:
			'A land woven through Scripture itself, home to one of the oldest churches on earth — where the Father’s Heart Bible™ longs to reveal, in Arabic, the Father who called His son out of Egypt. Arabic among our highest priorities.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/5288503725b20a8271e8783cb406e7cf4c0e7640-1880x1253.jpg',
	},
	{
		slug: 'russia',
		country: 'Russia',
		title: 'The Bible in Russia',
		blurb:
			'A land of deep Orthodox faith that survived a century of atheism and is reviving — where the Father’s Heart Bible™ longs to reveal, in Russian, the Father who runs to meet His returning child. Russian among our priorities.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/8459e8235bba613ec62bbe31d8da4a81a4d49742-1880x1253.jpg',
	},
	{
		slug: 'indonesia',
		country: 'Indonesia',
		title: 'The Bible in Indonesia',
		blurb:
			'The world’s largest archipelago and largest Muslim-majority nation, with a vibrant church across its islands — where the Father’s Heart Bible™ longs to reveal, in Bahasa Indonesia, a Father near to every island and heart.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/539e529a17ab4dd958a23acc0ea98b958d9e42ba-1880x1058.jpg',
	},
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
	{
		slug: 'dr-congo',
		country: 'DR Congo',
		title: 'The Bible in DR Congo',
		blurb:
			'The heart of Africa and the largest French-speaking nation on earth — where the Father’s Heart Bible™ reveals a Father near to the displaced and the orphan. French leads the roadmap.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/59c51a44a4c06371f743249efc2ce4026e25c81a-1880x1253.jpg',
	},
	{
		slug: 'ethiopia',
		country: 'Ethiopia',
		title: 'The Bible in Ethiopia',
		blurb:
			'One of the oldest Christian nations on earth — where the Father’s Heart Bible™ reveals, beneath an ancient faith, a God who is Abba, Father. Amharic leads the roadmap.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/cddb1c0e73aa24a9a515ac8ca0b9c86c3604b12a-1880x1253.jpg',
	},
	{
		slug: 'tanzania',
		country: 'Tanzania',
		title: 'The Bible in Tanzania',
		blurb:
			'The birthplace of Swahili — where the Father’s Heart Bible™ reveals a Father near to the orphan and the weary, in the tongue that unites East Africa. Swahili leads the roadmap.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/a2b368da9ba333ba6711cd3cbb148f6542c00bf6-1880x1246.jpg',
	},
	{
		slug: 'uganda',
		country: 'Uganda',
		title: 'The Bible in Uganda',
		blurb:
			'The Pearl of Africa, at the source of the Nile — where the Father’s Heart Bible™ reveals a Father near to the orphan and the displaced, in one of earth’s most Christian nations. Luganda leads the roadmap.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/4cf1cc4bf2602e3412c91fb7c9b5f27285504329-1880x1253.jpg',
	},
];
