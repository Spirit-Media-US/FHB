// Single source of truth for the How-To Hub guides.
// Used by the /guides/ hub AND the HowToHubCards component (blog bottom, etc.)
// so the list never drifts. Add a row when a new /guides/<slug> page ships —
// list ONLY real, published guides (no broken links).
export interface GuideEntry {
	slug: string;
	title: string;
	blurb: string;
	img: string; // Sanity CDN base URL (sizing params appended by the renderer)
}

export const GUIDES: GuideEntry[] = [
	{
		slug: 'how-to-read-the-bible',
		title: 'How to Read the Bible',
		blurb:
			'A simple beginner’s guide — where to start, how to understand it, and how to make it a daily habit.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/13334b01b91963fa9581ecebb66c4cf6064938d2-6016x4016.jpg',
	},
	{
		slug: 'where-to-start-reading-the-bible',
		title: 'Where to Start Reading the Bible',
		blurb:
			'A simple reading plan: begin in Genesis 1–3, then the Gospel of John, then the rest of the Bible.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/60c23b6e3673d0eaa80c7c7883e4670368ee8f32-6016x4016.jpg',
	},
	{
		slug: 'how-to-study-the-bible',
		title: 'How to Study the Bible',
		blurb:
			'A simple observe–interpret–apply method for beginners — read in context and study for the Father’s heart.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/c42c2fd1d784331411250317010d54a0cfac62cc-5959x3724.jpg',
	},
	{
		slug: 'how-to-understand-the-bible',
		title: 'How to Understand the Bible',
		blurb:
			'Why it feels hard, and how to fix it — read in context, know the genre, and read it as the Father revealing Himself.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/3991ac4134f2001479bb824b191ab464d8d3284e-8256x5504.jpg',
	},
	{
		slug: 'how-to-pray',
		title: 'How to Pray',
		blurb:
			'A simple guide for beginners — prayer is talking with God as your Father, with the Lord’s Prayer as a model.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/a06de2cfda461dee4850c71666ad2502a503c166-6720x4480.jpg',
	},
	{
		slug: 'what-is-the-gospel',
		title: 'What Is the Gospel?',
		blurb:
			'The good news in plain terms — God is a Father who, through His Son, brings His lost children home.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/e1bf90d1eaeab499989a239a2f5bfd98494e3f78-5867x3911.jpg',
	},
	{
		slug: 'best-books-on-the-fathers-heart',
		title: 'Best Books on Receiving our Father’s Heart',
		blurb:
			'An honest reading list — McClung, Manning, Nouwen, Frost, Jordan, the Woods, Sandra Steen, Beloved Identity, and the one Bible devoted to the theme.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/6497aa7918fb947fc7b07cc63f3f25658934727b-5472x3462.jpg',
	},
	{
		slug: 'resources-for-the-fathers-heart',
		title: 'Resources for Receiving our Father’s Heart',
		blurb:
			'Everything in one place — free Scripture with audio, verse collections, guides, books, a short film, and community.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/60c23b6e3673d0eaa80c7c7883e4670368ee8f32-6016x4016.jpg',
	},
	{
		slug: 'ministries-for-the-fathers-heart',
		title: 'Ministries Intentional about our Father’s Heart',
		blurb:
			'A curated, honest list of ministries and teachers intentional about our Father’s heart — from the Woods and George LaDu to Fatherheart Ministries.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/c42c2fd1d784331411250317010d54a0cfac62cc-5959x3724.jpg',
	},
];
