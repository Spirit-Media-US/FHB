// Single source of truth for the "Father's Heart Bible™ Around the World" hub
// (/bible-in). Each entry is a live per-country landing page that targets
// "Bible in <country>" search/AEO intent and funnels to /read + /partner.
// Add a row here ONLY when the matching /bible-in/<slug>.astro page ships —
// the hub renders a card for every entry, so an entry without a page = a 404.
//
// ORDER (logical): USA first (home base / base edition), then every other
// nation by its primary roadmap language's WORLDWIDE reach, largest first —
// "biggest mission field first." This mirrors the /partner Unlock Map ranking,
// so the two pages stay consistent. The community /library "Bible Around the
// World" strip uses the same order.
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
		slug: 'india',
		country: 'India',
		title: 'The Bible in India',
		blurb:
			'One of the world’s largest English-reading populations can read the Father’s Heart Bible free today — with Hindi among the first translations on our roadmap.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/6251d0054881b302d10b339359d39b107db86cc5-6669x4451.jpg',
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
		slug: 'dr-congo',
		country: 'DR Congo',
		title: 'The Bible in DR Congo',
		blurb:
			'The heart of Africa and the largest French-speaking nation on earth — where the Father’s Heart Bible™ reveals a Father near to the displaced and the orphan. French leads the roadmap.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/59c51a44a4c06371f743249efc2ce4026e25c81a-1880x1253.jpg',
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
		slug: 'brazil',
		country: 'Brazil',
		title: 'The Bible in Brazil',
		blurb:
			'The largest Bible nation on earth — where the Father’s Heart Bible™ invites 217 million people to meet the Father in the book they already love.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/d5bf406c5039b3d5ff0262302cdb49a56257060c-2497x3744.jpg',
	},
	{
		slug: 'pakistan',
		country: 'Pakistan',
		title: 'The Bible in Pakistan',
		blurb:
			'A land of soaring mountains and a faithful, enduring church — where the Father’s Heart Bible™ longs to reveal, in Urdu and Punjabi, a Father near to the poor, the persecuted, and the orphan. Both languages among our priorities.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/60703be00855558d3021775ea5b4d14a659e1144-1880x1153.jpg',
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
		slug: 'germany',
		country: 'Germany',
		title: 'The Bible in Germany',
		blurb:
			'The land of Gutenberg and Luther that gave the world the printed Bible — where the Father’s Heart Bible™ longs to help a drifting nation meet, afresh, the Father in its pages. German among our priorities.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/e687a7e35fc45726c6ed0695f68102f9c519bd0d-1733x1300.jpg',
	},
	{
		slug: 'japan',
		country: 'Japan',
		title: 'The Bible in Japan',
		blurb:
			'One of the least-reached nations on earth, gentle and searching — where the Father’s Heart Bible™ longs to reveal, in Japanese, a Father near to the weary and the lonely. Japanese among our priorities.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/dcf30948a3b86f3a9738df4e9d973137bdcfc167-1733x1300.jpg',
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
		slug: 'turkey',
		country: 'Turkey',
		title: 'The Bible in Turkey',
		blurb:
			'The cradle of the early church — Antioch, Ephesus, the Seven Churches — now ~99% Muslim. The Father’s Heart Bible™ longs to reveal again, in Turkish, the Father whose story began in this very land.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/3f849b700a3a0a02c6094ea83abac9de097c5161-1880x993.jpg',
	},
	{
		slug: 'hong-kong',
		country: 'Hong Kong',
		title: 'The Bible in Hong Kong',
		blurb:
			'A gateway between China and the world, with a deep Christian heritage — where the Father’s Heart Bible™ longs to reveal, in Cantonese, a Father near to a weary, fast-moving people. Cantonese among our priorities.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/66cd8a0b2f94502af5a326582836a7fc0a1edd55-1880x1253.jpg',
	},
	{
		slug: 'vietnam',
		country: 'Vietnam',
		title: 'The Bible in Vietnam',
		blurb:
			'A resilient land with one of Asia’s fastest-growing churches — where the Father’s Heart Bible™ longs to reveal, in Vietnamese, a Father near to the orphan and the searching. Vietnamese among our priorities.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/ddae14bf38118338b36097d6a8399d2d0b5c9b9d-1880x1264.jpg',
	},
	{
		slug: 'south-korea',
		country: 'South Korea',
		title: 'The Bible in South Korea',
		blurb:
			'One of Asia’s great sending churches, yet a people weary beneath their success — where the Father’s Heart Bible™ longs to reveal afresh, in Korean, the Father who gives rest. Korean among our priorities.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/2fc21064a603d292015c6e62cec99f19f2e014c9-1880x1253.jpg',
	},
	{
		slug: 'iran',
		country: 'Iran',
		title: 'The Bible in Iran',
		blurb:
			'Ancient Persia — woven into the Bible through Cyrus, Esther, and the Magi — today a searching nation with one of the fastest-growing movements to Christ on earth. The Father’s Heart Bible™ longs to reveal, in Persian, the Father found by all who seek Him.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/42f1fa91a001338ac6641bd0ec7505b6f28b5e20-1880x1253.jpg',
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
		slug: 'tanzania',
		country: 'Tanzania',
		title: 'The Bible in Tanzania',
		blurb:
			'The birthplace of Swahili — where the Father’s Heart Bible™ reveals a Father near to the orphan and the weary, in the tongue that unites East Africa. Swahili leads the roadmap.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/a2b368da9ba333ba6711cd3cbb148f6542c00bf6-1880x1246.jpg',
	},
	{
		slug: 'italy',
		country: 'Italy',
		title: 'The Bible in Italy',
		blurb:
			'The heart of Western Christianity — Rome, the Vatican, and centuries of sacred art — where the Father’s Heart Bible™ invites a people who revere the Church to meet the Father personally in Scripture. Italian among our priorities.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/04152bca121aec87b9a859e38f29cce4f4794b31-1880x1177.jpg',
	},
	{
		slug: 'thailand',
		country: 'Thailand',
		title: 'The Bible in Thailand',
		blurb:
			'The gentle “Land of Smiles,” one of the largest unreached Buddhist nations on earth — where the Father’s Heart Bible™ longs to reveal, in Thai, a Father who frees the bound and gathers the weary. Thai among our priorities.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/803235d0ba419715e9951124102b1577d840e5fb-1880x1253.jpg',
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
		slug: 'uganda',
		country: 'Uganda',
		title: 'The Bible in Uganda',
		blurb:
			'The Pearl of Africa, at the source of the Nile — where the Father’s Heart Bible™ reveals a Father near to the orphan and the displaced, in one of earth’s most Christian nations. Luganda leads the roadmap.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/4cf1cc4bf2602e3412c91fb7c9b5f27285504329-1880x1253.jpg',
	},
];
