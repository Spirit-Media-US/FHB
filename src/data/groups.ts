// Single source of truth for the "A Father For" hub (/bible-for). Sibling to
// nations.ts (the /bible-in hub). Each GROUPS entry is a LIVE per-group landing
// page that targets "bible verses for <group>" / "<group>" search + AEO intent
// and funnels to /read. Add a row here ONLY when the matching
// /bible-for/<slug>.astro page ships — the hub renders a card for every entry,
// so an entry without a page = a 404.
//
// UPCOMING is the rest of the 20-group roadmap, shown on the hub as a plain
// "more on the way" list (no links) so the full vision is visible without 404s.
// Move a name from UPCOMING into GROUPS when its page goes live.
//
// The URL is "bible-for" (true, for SEO/AEO) but the heart of every page is
// "A Father FOR <group>". FHB color scheme. See memory/reference_group_page_builder.md.
export interface Group {
	slug: string;
	group: string; // display name, e.g. "Worship Leaders"
	title: string; // card title, e.g. "Bible Verses for Worship Leaders"
	blurb: string; // 1–2 sentence card summary
	img: string; // Sanity CDN base URL (sizing params appended by the renderer)
}

export const GROUPS: Group[] = [
	{
		slug: 'worship-leaders',
		group: 'Worship Leaders',
		title: 'For Worship Leaders',
		blurb:
			'For the ones who carry the room every week — a Father who sings over you, so you can be loved before you ever lead. You are a beloved son or daughter, not a performer.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/e50078ea47f2ce7aadd278f2f5bec9e5c07f3304-1200x800.jpg',
	},
	{
		slug: 'pastors',
		group: 'Pastors',
		title: 'For Pastors',
		blurb:
			'For the ones who carry everyone else’s weight — a Bible that lets you be fathered before you shepherd, because even the shepherd needs a Shepherd. Before you’re a pastor, you’re a son.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/141479390101f73507ff3662dec8e5c8e1427284-1100x733.jpg',
	},
	{
		slug: 'student-ministry',
		group: 'Student Ministry',
		title: 'For Student Ministry',
		blurb:
			'For the ones who pour into the next generation on a shoestring and a prayer — be fathered before you disciple. The greatest thing you can give a student is a Father.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/b45c3bd7ee5def39ee3a49ba81bcb0e5c0efa90c-1100x733.jpg',
	},
	{
		slug: 'childrens-ministry',
		group: "Children's Ministry",
		title: 'For Children’s Ministry',
		blurb:
			'For the ones who pour into the youngest and the unseen — Sunday school, nursery, AWANA, VBS. Be fathered first, so you have a Father’s love to hand down.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/e045aebbb231fc15abf4e08124c7992a5f94aaf6-1100x733.jpg',
	},
	{
		slug: 'church-staff',
		group: 'Church Staff',
		title: 'For Church Staff',
		blurb:
			'For the unseen people who keep the church running — production, office, kids, care, facilities, hospitality. You are a son or daughter, not a function. Be fathered, not just used.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/44e4507faf6933673ce0293a680e81e3fa8a9b46-1100x733.jpg',
	},
];

// The remaining roadmap (build order). Names shown on the hub as "on the way".
export const UPCOMING_GROUPS: string[] = [
	'Fathers',
	'Mothers',
	'Husbands',
	'Wives',
	'Children',
	'Middle Schoolers',
	'High Schoolers',
	'College Students',
	'Teachers, Doctors & Public Servants',
	'Public Safety & Active Military',
	'Veterans',
	'The Incarcerated & the Suffering',
	'Those Facing Addiction',
	'Those Facing Divorce',
	'Those Touched by Loss',
];
