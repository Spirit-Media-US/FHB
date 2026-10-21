// Registry for /meaning/<word> pages (item 7 of the FHB SEO/AEO/GEO plan).
// Add a row here when a new /meaning/<slug>.astro page ships — the hub at
// /meaning/ and its CollectionPage JSON-LD are both generated from this list.
//
// Selection rule (do NOT relax it): a word earns a page only where measured
// demand meets a genuine FHB wedge — i.e. the Father's Heart Bible's own
// rendering is part of the answer. Words we render identically to everyone else
// would produce the "one of fifty identical pages" this section exists to avoid.

export interface WordMeaning {
	slug: string;
	/** The ONE question the page answers, verbatim. */
	title: string;
	blurb: string;
	img: string;
	/** Monthly US search volume of the primary target query (Ahrefs), for review. */
	volume?: string;
}

export const WORD_MEANINGS: WordMeaning[] = [
	{
		slug: 'our-father',
		title: 'Why this Bible says “our Father” instead of “God”',
		blurb:
			'The translation decision behind John 3:16 — what changed, what did not, and why every choice is footnoted.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/13aa1dad19131ca6a30fc703cc787aeda97adc73-3504x2336.jpg',
	},
	{
		slug: 'begotten',
		title: 'What does “begotten” mean in the Bible?',
		blurb:
			'The old English word behind the Greek monogenēs — and why this Bible says “his only Son.”',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/4f858cae0aaf68469ed3400e047a53d4af7e5900-8256x5504.jpg',
		volume: '19,000/mo',
	},
	{
		slug: 'hallowed-be-thy-name',
		title: 'What does “hallowed be thy name” mean?',
		blurb:
			'The first petition of the Lord’s Prayer — and whose name Jesus was actually asking us to honour.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/30a02ceb242880eee698a7c8a0ff2938ff0fced2-7934x5292.jpg',
		volume: '4,300/mo',
	},
	{
		slug: 'abba-father',
		title: 'What does “Abba, Father” mean in the Bible?',
		blurb:
			'The Aramaic word Jesus used in Gethsemane, and why Paul sets it against slavery and fear.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/f6bf38bde108f79fd6730ab8930750f89bc74ad3-6720x4480.jpg',
		volume: '2,100/mo',
	},
	{
		slug: 'fathers-heart-of-god',
		title: 'What is the Father’s heart of God?',
		blurb:
			'The love at the centre of who He is — from Hosea and Jeremiah to the father who runs in Luke 15.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/13aa1dad19131ca6a30fc703cc787aeda97adc73-3504x2336.jpg',
	},
	{
		slug: 'lords-prayer',
		title: 'The Lord’s Prayer: the words and what they mean',
		blurb:
			'The prayer Jesus taught, line by line — and why He taught it to begin with “Our Father.”',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/6497aa7918fb947fc7b07cc63f3f25658934727b-5472x3462.jpg',
		volume: '76,000/mo',
	},
	{
		slug: 'ten-commandments',
		title: 'The Ten Commandments: the list and what they mean',
		blurb:
			'Exodus 20 and Deuteronomy 5 in the FHB — and why the commandments begin “I am your Father, who brought you out of Egypt.”',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/3991ac4134f2001479bb824b191ab464d8d3284e-8256x5504.jpg',
		volume: '83,000/mo',
	},
];
