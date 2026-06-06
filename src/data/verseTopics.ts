// Single source of truth for the "Bible Verses by Topic" collections.
// Used by the /verses hub. List ONLY live topical pages (no broken links).
export interface VerseTopic {
	slug: string;
	title: string;
	blurb: string;
	img: string; // Sanity CDN base URL (sizing params appended by the renderer)
}

export const VERSE_TOPICS: VerseTopic[] = [
	{
		slug: 'love',
		title: 'Bible Verses About Love',
		blurb:
			'God is love, He loved us first, and we love in return — the Father’s heart toward His children.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/30a02ceb242880eee698a7c8a0ff2938ff0fced2-7934x5292.jpg',
	},
	{
		slug: 'strength',
		title: 'Bible Verses About Strength',
		blurb: 'Where strength comes from, and how His power is made perfect in our weakness.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/c09239e8726c9ae68d2ca8985df5eef0832422f9-6720x4480.jpg',
	},
	{
		slug: 'faith',
		title: 'Bible Verses About Faith',
		blurb:
			'What faith is, how it grows through the Word, and how even a little of it moves mountains.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/3a06ad4a994d786bd7b1bf8bbc482e5cf5f4d5ba-6016x4016.jpg',
	},
	{
		slug: 'anxiety',
		title: 'Bible Verses About Anxiety',
		blurb: 'Give your worries to your Father and receive the peace that surpasses understanding.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/4f858cae0aaf68469ed3400e047a53d4af7e5900-8256x5504.jpg',
	},
	{
		slug: 'healing',
		title: 'Bible Verses About Healing',
		blurb: 'The God who heals body and heart — and the healing that comes through Christ.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/f6bf38bde108f79fd6730ab8930750f89bc74ad3-6720x4480.jpg',
	},
];
