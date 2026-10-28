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
	{
		slug: 'god-as-father',
		title: 'Bible Verses About God as Father',
		blurb: 'He names Himself your Father, Jesus revealed Him, and in Christ you are His child.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/13aa1dad19131ca6a30fc703cc787aeda97adc73-3504x2336.jpg',
	},
	{
		slug: 'thanksgiving',
		title: 'Thanksgiving Bible Verses',
		blurb: 'Give thanks, for our Father is good: verses for the table, every season and worship.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/30a02ceb242880eee698a7c8a0ff2938ff0fced2-7934x5292.jpg',
	},
	{
		slug: 'advent',
		title: 'Advent Scripture Readings',
		blurb: 'The light, the promise and the coming of our Father near, from Isaiah 9 to Luke 2.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/60c23b6e3673d0eaa80c7c7883e4670368ee8f32-6016x4016.jpg',
	},
	{
		slug: 'peace',
		title: 'Bible Verses About Peace',
		blurb: 'The peace Jesus gives, peace that guards the heart in worry, and peace with our Father.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/4f858cae0aaf68469ed3400e047a53d4af7e5900-8256x5504.jpg',
	},
	{
		slug: 'hope',
		title: 'Bible Verses About Hope',
		blurb: 'Hope in hard times, hope that anchors the soul, and waiting on a Father who keeps his word.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/3a06ad4a994d786bd7b1bf8bbc482e5cf5f4d5ba-6016x4016.jpg',
	},
	{
		slug: 'prayer',
		title: 'Bible Verses About Prayer',
		blurb: 'How Jesus taught us to pray to our Father, asking and seeking, and prayer in worry.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/c09239e8726c9ae68d2ca8985df5eef0832422f9-6720x4480.jpg',
	},
	{
		slug: 'forgiveness',
		title: 'Bible Verses About Forgiveness',
		blurb: 'Forgiven by our Father, forgiving others as we were forgiven, and a clean heart.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/13aa1dad19131ca6a30fc703cc787aeda97adc73-3504x2336.jpg',
	},
	{
		slug: 'joy',
		title: 'Bible Verses About Joy',
		blurb: 'Joy in our Father’s presence, joy in hard times, rejoicing today, and joy restored.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/30a02ceb242880eee698a7c8a0ff2938ff0fced2-7934x5292.jpg',
	},
	{
		slug: 'patience',
		title: 'Bible Verses About Patience',
		blurb: 'Waiting on our Father, patience with others, patience that perseveres, and his patience with us.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/3a06ad4a994d786bd7b1bf8bbc482e5cf5f4d5ba-6016x4016.jpg',
	},
];
