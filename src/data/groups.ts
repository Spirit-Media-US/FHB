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
	{
		slug: 'fathers',
		group: 'Fathers',
		title: 'For Fathers',
		blurb:
			'For every man raising children — biological, adoptive, step, grand, or spiritual. You cannot give a fathering you have not received. Meet the perfect Father, and father from the overflow.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/33c30e379cae250d1419883d9bd47fbe9271c165-1100x733.jpg',
	},
	{
		slug: 'mothers',
		group: 'Mothers',
		title: 'For Mothers',
		blurb:
			'For every woman who pours out — biological, adoptive, step, foster, grand, or spiritual. You are His beloved daughter before you are anyone’s mother. Receive His love, and mother from the overflow.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/fa0c017cfeeb1be89a520309e6db7de4f6f88993-1100x733.jpg',
	},
	{
		slug: 'husbands',
		group: 'Husbands',
		title: 'For Husbands',
		blurb:
			'You are called to love your wife as Christ loved the church — but you can only give a love you have first received. Be loved by the Father, and love her from the overflow.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/ac43cb84a89c3e14d1c6955600450974dd39e7e4-1100x790.jpg',
	},
	{
		slug: 'wives',
		group: 'Wives',
		title: 'For Wives',
		blurb:
			'For the woman who longs to be seen and cherished — you already are, by a Father who delights in you. Loved and secure in Him before any spouse, you can love from fullness, not lack.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/820c2a84b9104b22bbfec30863c9dd8fb9527c5d-1100x733.jpg',
	},
	{
		slug: 'children',
		group: 'Children',
		title: 'For Children',
		blurb:
			'God made you, He knows your name, and He loves you no matter what. Whatever you feel — happy, scared, or sad — your Father in heaven is right there. You are already His.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/b6b75279717c8b01ee135bc9ff7e6ec3a00a8943-1100x733.jpg',
	},
	{
		slug: 'middle-schoolers',
		group: 'Middle Schoolers',
		title: 'For Middle Schoolers',
		blurb:
			'The hardest social years — but you don’t have to earn your place. You are already the Father’s beloved, fully known and fully loved, exactly as you are.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/19b4f2ef59eb9833669da4469c68d89243f0e292-1100x733.jpg',
	},
	{
		slug: 'high-schoolers',
		group: 'High Schoolers',
		title: 'For High Schoolers',
		blurb:
			'Grades, the group chat, the future everyone keeps asking about — the pressure is real. But your worth was never your GPA or your follower count. You are the Father’s beloved, right now, before you achieve a thing.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/fac90f9adfb087bc989fc5f6164da137218f7a06-1100x733.jpg',
	},
	{
		slug: 'college-students',
		group: 'College Students',
		title: 'For College Students',
		blurb:
			'Away from home, building a life, carrying the pressure of who you’re becoming. Wherever you land, you have a Father who already knows your name — and runs to meet you. You belong to Him before you belong anywhere.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/04309eb88e068e4d4992c25c70c914c90b64b061-1100x733.jpg',
	},
	{
		slug: 'teachers',
		group: 'Teachers',
		title: 'For Teachers',
		blurb:
			'You give and give to a room full of kids who need everything — and you cannot pour from an empty cup. Meet the Father who fills you first, so you teach from the overflow of being loved, not the strain of being depleted.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/a7cbadd7631954d2e712faad03d1521522c5dabe-1100x733.jpg',
	},
	{
		slug: 'nurses',
		group: 'Nurses',
		title: 'For Nurses',
		blurb:
			'You carry others through their worst days — but who carries you? Meet the Father who tends the caregiver, so you nurse from the overflow of being held, not the edge of empty.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/6dc31c86e6218eb1872b07819100f2c1b12a9adb-1100x825.jpg',
	},
	{
		slug: 'doctors',
		group: 'Doctors',
		title: 'For Doctors',
		blurb:
			'You hold others’ lives in your hands — but you were never meant to be God. Meet the Father who carries the one who carries everyone, so you practice from rest, not the impossible weight of being everything.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/84b3300e36554d7ce34920dafbb6c72bbb55325d-1100x733.jpg',
	},
];

// The remaining roadmap (build order). Names shown on the hub as "on the way".
export const UPCOMING_GROUPS: string[] = [
	'Public Servants',
	'Public Safety & Active Military',
	'Veterans',
	'The Incarcerated & the Suffering',
	'Those Facing Addiction',
	'Those Facing Divorce',
	'Those Touched by Loss',
];
