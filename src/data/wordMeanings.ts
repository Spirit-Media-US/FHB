// Registry for /meaning/<word> pages (item 7 of the FHB SEO/AEO/GEO plan).
// Add a row here when a new /meaning/<slug>.astro page ships — the hub at
// /meaning/ and its CollectionPage JSON-LD are both generated from this list.
//
// Selection rule (do NOT relax it): a word earns a page only where measured
// demand meets a genuine FHB wedge — i.e. Father's Heart Bible's own
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
			'The old English word behind the Greek monogenēs — and why this Bible says “his one and only Son.”',
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
	{
		slug: 'grace',
		title: 'What does grace mean in the Bible?',
		blurb:
			'A gift you did not earn, given in love — the Greek charis, and the Hebrew hesed the FHB renders “covenant love.”',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/30a02ceb242880eee698a7c8a0ff2938ff0fced2-7934x5292.jpg',
	},
	{
		slug: 'righteousness',
		title: 'What does righteousness mean in the Bible?',
		blurb:
			'Being made right with our Father — tsedaqah and dikaiosynē, and why the FHB reads “the righteousness of our Father.”',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/3991ac4134f2001479bb824b191ab464d8d3284e-8256x5504.jpg',
	},
	{
		slug: 'meek',
		title: 'What does meek mean in the Bible?',
		blurb:
			'Gentle strength that trusts our Father — praus and anav, Moses and Jesus, and why the meek inherit the earth.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/f6bf38bde108f79fd6730ab8930750f89bc74ad3-6720x4480.jpg',
	},
	{
		slug: 'love',
		title: 'What does love mean in the Bible?',
		blurb:
			'Our Father’s own nature — agapē and hesed, 1 Corinthians 13, and why the FHB reads “our Father is love.”',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/f6bf38bde108f79fd6730ab8930750f89bc74ad3-6720x4480.jpg',
	},
	{
		slug: 'faith',
		title: 'What does faith mean in the Bible?',
		blurb:
			'Trusting our Father and His promise — pistis and emunah, Abraham, Hebrews 11, and faith with works.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/3991ac4134f2001479bb824b191ab464d8d3284e-8256x5504.jpg',
	},
	{
		slug: 'covenant',
		title: 'What does covenant mean in the Bible?',
		blurb:
			'A binding promise that makes a family — berit and diathēkē, and “I will be their Father.”',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/13aa1dad19131ca6a30fc703cc787aeda97adc73-3504x2336.jpg',
	},
	{
		slug: 'wisdom',
		title: 'What does wisdom mean in the Bible?',
		blurb:
			'Living skilfully in our Father’s world — chokmah and sophia, Proverbs, and Christ our wisdom.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/c42c2fd1d784331411250317010d54a0cfac62cc-5959x3724.jpg',
	},
	{
		slug: 'mercy',
		title: 'What does mercy mean in the Bible?',
		blurb:
			'Our Father’s compassion toward people who deserve otherwise — rachamim, hesed and eleos.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/6497aa7918fb947fc7b07cc63f3f25658934727b-5472x3462.jpg',
	},
	{
		slug: 'propitiation',
		title: 'What does propitiation mean in the Bible?',
		blurb:
			'The atoning sacrifice our Father provides — hilastērion, the mercy seat, and 1 John 4:10.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/6497aa7918fb947fc7b07cc63f3f25658934727b-5472x3462.jpg',
	},
	{
		slug: 'abide',
		title: 'What does abide mean in the Bible?',
		blurb:
			'To remain in Christ like a branch in the vine — menō, John 15, and remaining in the Father’s love.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/f6bf38bde108f79fd6730ab8930750f89bc74ad3-6720x4480.jpg',
	},
	{
		slug: 'selah',
		title: 'What does Selah mean in the Bible?',
		blurb:
			'A Hebrew cue to pause, 71 times in the Psalms — what it likely means and how to pray with it.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/60c23b6e3673d0eaa80c7c7883e4670368ee8f32-6016x4016.jpg',
	},
	{
		slug: 'sanctified',
		title: 'What does sanctified mean in the Bible?',
		blurb:
			'Made holy and set apart as our Father’s own — hagiazō and qadash, once for all and growing.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/30a02ceb242880eee698a7c8a0ff2938ff0fced2-7934x5292.jpg',
	},
	{
		slug: 'conviction',
		title: 'What does conviction mean in the Bible?',
		blurb:
			'The Spirit showing us the truth so we can come home — elenchō, and conviction vs condemnation.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/3991ac4134f2001479bb824b191ab464d8d3284e-8256x5504.jpg',
	},
	{
		slug: 'forsake',
		title: 'What does forsake mean in the Bible?',
		blurb:
			'To leave behind or abandon — azab and egkataleipo, and our Father’s promise never to leave you nor forsake you.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/6497aa7918fb947fc7b07cc63f3f25658934727b-5472x3462.jpg',
	},
	{
		slug: 'folly',
		title: 'What does folly mean in the Bible?',
		blurb:
			'Foolishness, the way of the one who refuses wisdom — the fool in Proverbs, the woman Folly, and the cross.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/60c23b6e3673d0eaa80c7c7883e4670368ee8f32-6016x4016.jpg',
	},
	{
		slug: 'consecrate',
		title: 'What does consecrate mean in the Bible?',
		blurb:
			'To set apart for a holy purpose — qadash and hagiazo, priests and people, and Jesus consecrating himself in John 17.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/30a02ceb242880eee698a7c8a0ff2938ff0fced2-7934x5292.jpg',
	},
	{
		slug: 'sheol',
		title: 'What is Sheol in the Bible?',
		blurb:
			'The realm of the dead — she’ol and hades, Psalm 16:10 and Acts 2:27, and why even there our Father is present.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/3991ac4134f2001479bb824b191ab464d8d3284e-8256x5504.jpg',
	},
	{
		slug: 'psalm-23',
		title: 'What does Psalm 23 mean?',
		blurb:
			'A verse-by-verse reading of “My Father is my shepherd” — the valley, the table, and the house of our Father.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/6497aa7918fb947fc7b07cc63f3f25658934727b-5472x3462.jpg',
	},
	{
		slug: 'psalm-91',
		title: 'What does Psalm 91 mean?',
		blurb:
			'The shelter of the Most High, the angels, and our Father’s own voice in verses 14-16.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/3991ac4134f2001479bb824b191ab464d8d3284e-8256x5504.jpg',
	},
];
