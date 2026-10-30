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
		slug: 'kindness',
		title: 'Bible Verses About Kindness',
		blurb:
			'Being kind to one another, our Father\u2019s own kindness toward us, kindness to the needy, and kind words.',
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
		slug: 'christmas',
		title: 'Christmas Bible Verses',
		blurb:
			'The promise, the birth in Bethlehem, the wise men, and what Christmas means: our Father come near.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/60c23b6e3673d0eaa80c7c7883e4670368ee8f32-6016x4016.jpg',
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
		blurb:
			'The peace Jesus gives, peace that guards the heart in worry, and peace with our Father.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/4f858cae0aaf68469ed3400e047a53d4af7e5900-8256x5504.jpg',
	},
	{
		slug: 'hope',
		title: 'Bible Verses About Hope',
		blurb:
			'Hope in hard times, hope that anchors the soul, and waiting on a Father who keeps his word.',
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
		blurb:
			'Waiting on our Father, patience with others, patience that perseveres, and his patience with us.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/3a06ad4a994d786bd7b1bf8bbc482e5cf5f4d5ba-6016x4016.jpg',
	},
	{
		slug: 'friendship',
		title: 'Bible Verses About Friendship',
		blurb:
			'A friend who loves at all times, better together, friends in the Bible, and Jesus calling us friends.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/30a02ceb242880eee698a7c8a0ff2938ff0fced2-7934x5292.jpg',
	},
	{
		slug: 'family',
		title: 'Bible Verses About Family',
		blurb:
			'A home that serves our Father, raising children, honoring one another, and his own family.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/13aa1dad19131ca6a30fc703cc787aeda97adc73-3504x2336.jpg',
	},
	{
		slug: 'anger',
		title: 'Bible Verses About Anger',
		blurb:
			'Slow to anger, not sinning in anger, answering with gentleness, and our Father\u2019s own patience.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/c09239e8726c9ae68d2ca8985df5eef0832422f9-6720x4480.jpg',
	},
	{
		slug: 'comfort',
		title: 'Bible Verses for Comfort',
		blurb:
			'Our Father who comforts, near to the brokenhearted, comfort in hard times, and comforting one another.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/f6bf38bde108f79fd6730ab8930750f89bc74ad3-6720x4480.jpg',
	},
	{
		slug: 'fear',
		title: 'Bible Verses About Fear',
		blurb:
			'Do not fear, our Father with us in the dark valley, perfect love that casts out fear, and Jesus saying do not be afraid.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/c09239e8726c9ae68d2ca8985df5eef0832422f9-6720x4480.jpg',
	},
	{
		slug: 'gratitude',
		title: 'Bible Verses About Gratitude',
		blurb:
			'A grateful heart, remembering our Father\u2019s goodness, contentment, and thanks that becomes a daily habit.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/30a02ceb242880eee698a7c8a0ff2938ff0fced2-7934x5292.jpg',
	},
	{
		slug: 'courage',
		title: 'Bible Verses About Courage',
		blurb:
			'Be strong and courageous, courage because our Father is with us, standing firm, and Jesus saying take courage.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/c09239e8726c9ae68d2ca8985df5eef0832422f9-6720x4480.jpg',
	},
	{
		slug: 'encouragement',
		title: 'Bible Verses About Encouragement',
		blurb:
			'Encouraging one another, our Father who encourages us, words that lift, and not giving up.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/3a06ad4a994d786bd7b1bf8bbc482e5cf5f4d5ba-6016x4016.jpg',
	},
	{
		slug: 'death',
		title: 'Bible Verses About Death',
		blurb:
			'Our Father near in the valley, comfort for those who grieve, his love that death cannot sever, and the hope of resurrection.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/f6bf38bde108f79fd6730ab8930750f89bc74ad3-6720x4480.jpg',
	},
	{
		slug: 'money',
		title: 'Bible Verses About Money',
		blurb:
			'The love of money, being content, our Father who provides, and wisdom and generosity with what we have.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/3a06ad4a994d786bd7b1bf8bbc482e5cf5f4d5ba-6016x4016.jpg',
	},
	{
		slug: 'wisdom',
		title: 'Bible Verses About Wisdom',
		blurb:
			'Where wisdom starts, asking our Father for it, why it is worth more than gold, and wisdom for daily choices.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/60c23b6e3673d0eaa80c7c7883e4670368ee8f32-6016x4016.jpg',
	},
	{
		slug: 'grace',
		title: 'Bible Verses About Grace',
		blurb:
			'Saved by grace, grace when we are weak, grace that came with Jesus, and grace that changes how we live.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/4f858cae0aaf68469ed3400e047a53d4af7e5900-8256x5504.jpg',
	},
	{
		slug: 'salvation',
		title: 'Bible Verses About Salvation',
		blurb:
			'Saved by believing, our Father who wants all people saved, Jesus who came to save, and knowing it is ours.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/f6bf38bde108f79fd6730ab8930750f89bc74ad3-6720x4480.jpg',
	},
	{
		slug: 'trust',
		title: 'Bible Verses About Trust',
		blurb:
			'Trusting our Father with all your heart, when you are afraid, when life shakes, and not in people.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/c09239e8726c9ae68d2ca8985df5eef0832422f9-6720x4480.jpg',
	},
];
