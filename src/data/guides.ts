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
];
