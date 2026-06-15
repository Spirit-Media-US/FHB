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
	{
		slug: 'first-responders',
		group: 'First Responders',
		title: 'For First Responders',
		blurb:
			'You run toward what everyone else runs from, carrying calls no one should have to carry. Meet the Father who runs toward you — who sees what you’ve seen and stays.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/6b5222bc14effb6cedb9f1f7a87aeb73c39fc24e-1100x733.jpg',
	},
	{
		slug: 'military',
		group: 'Active Military',
		title: 'For the Military',
		blurb:
			'Wherever you are deployed, you are not beyond His reach. Meet the Father who goes with you — who never leaves His post, and who holds the family waiting at home.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/7897521da975af184c679fedb9d2c92c27302382-1100x803.jpg',
	},
	{
		slug: 'veterans',
		group: 'Veterans',
		title: 'For Veterans',
		blurb:
			'You served, you sacrificed, you carry what most will never see. You were never forgotten — and never meant to carry it alone. Meet the Father who welcomes you home and gives you a name beyond the uniform.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/754e1eadc7743bff7e1d0df927a35bff2806ae31-1100x734.jpg',
	},
	{
		slug: 'incarcerated',
		group: 'The Incarcerated',
		title: 'For the Incarcerated',
		blurb:
			'No wall can keep out the Father’s love. You are not your worst day or your sentence — you are still His, and He has not forgotten you. For those inside, their families, and those coming home.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/b7a14820ffedff5585c1df47a2a7fc206d0f4b63-1100x733.jpg',
	},
	{
		slug: 'cancer',
		group: 'Those Facing Cancer',
		title: 'For Those Facing Cancer',
		blurb:
			'Even in the valley, you do not walk alone. Meet the Father who is near to the brokenhearted — who holds you through every scan and treatment and never leaves your side. For patients and the ones who love them.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/472476e577dd1d4cc1e1f42776a4f7ad57245212-1100x733.jpg',
	},
	{
		slug: 'addiction',
		group: 'Those Facing Addiction',
		title: 'For Those Facing Addiction',
		blurb:
			'You are not your addiction, and you are not beyond His reach. Meet the prodigal’s Father who runs down the road to the one coming home — no lecture, no rejection, only arms open.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/89374a8de11cbbabb93a238ef081f850baaa1214-1100x825.jpg',
	},
	{
		slug: 'divorce',
		group: 'Those Facing Divorce',
		title: 'For Those Facing Divorce',
		blurb:
			'Even when a covenant is broken, His covenant with you is not. Meet the Father who is close to the brokenhearted — who will never leave you, and never stops calling you His beloved.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/853e41fc98832dbedaf6a9a5b5f3c91d61744ef4-1100x733.jpg',
	},
	{
		slug: 'grief',
		group: 'Those Grieving a Loss',
		title: 'For Those Grieving a Loss',
		blurb:
			'There is no grief too heavy for the Father to hold with you. He is close to the brokenhearted, He keeps every tear, and He has not turned away. For those walking through devastating loss.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/88b47dc15aa46bc5d5348640ad634e5a278b804c-1100x733.jpg',
	},
];

// The remaining roadmap (build order). Names shown on the hub as "on the way".
// Series complete: all 20 planned groups are live (24 pages after the approved
// caregiver and first-responder/military splits). "Public Service" (police, fire,
// rescue, ambulance) is covered by /bible-for/first-responders. Nothing pending.
export const UPCOMING_GROUPS: string[] = [];

// "A Father for those of every faith & background" — outreach pages that meet
// people of the world's major religions (and the religiously unaffiliated) where
// most experience God as a distant deity bound by rules, and gently introduce the
// loving Heavenly Father. Written with deep respect; we love those we disagree
// with and long for them to know His Father-heart. Rendered in their own hub
// subsection (see bible-for/index.astro), not mixed with the life-situation grid.
// Hub sections: the life-situation pages (GROUPS) grouped into labeled thematic
// sections, each with its own eyebrow + heading + intro (same style as the faith
// section). Order here = order on the hub. Every GROUPS slug must appear in
// exactly one section's `slugs`. The faith outreach (FAITH_GROUPS) renders as its
// own section after these (see bible-for/index.astro).
export interface HubSection {
	key: string; // also the anchor id on the hub (#<key>)
	short: string; // jump-nav chip label
	eyebrow: string;
	heading: string;
	intro: string; // may contain inline HTML
	slugs: string[];
}

export const SECTIONS: HubSection[] = [
	{
		key: 'church',
		short: 'The church',
		eyebrow: 'A Father for the church',
		heading: 'For those who serve the church',
		intro:
			'You pour out for everyone else — leading, teaching, shepherding, serving behind the scenes. Before you carry the room, the class, or the calling, you are a beloved son or daughter. Be fathered first, and minister from the overflow.',
		slugs: ['worship-leaders', 'pastors', 'student-ministry', 'childrens-ministry', 'church-staff'],
	},
	{
		key: 'family',
		short: 'Family & marriage',
		eyebrow: 'A Father for the home',
		heading: 'For families & marriages',
		intro:
			'You can only give a love you have first received. Whether you are raising children or building a marriage, meet the perfect Father — and love your family from the fullness of being loved by Him.',
		slugs: ['fathers', 'mothers', 'husbands', 'wives'],
	},
	{
		key: 'young',
		short: 'The young',
		eyebrow: 'A Father for the young',
		heading: 'For children, students & the next generation',
		intro:
			'From the youngest child to the college senior, you do not have to earn your place or prove your worth. You are already the Father’s beloved — fully known and fully loved, exactly as you are, right now.',
		slugs: ['children', 'middle-schoolers', 'high-schoolers', 'college-students'],
	},
	{
		key: 'caregivers',
		short: 'Care & heal',
		eyebrow: 'A Father for the caregiver',
		heading: 'For those who care & heal',
		intro:
			'You carry others through their hardest days — but who carries you? You cannot pour from an empty cup. Meet the Father who tends the caregiver, so you give from the overflow of being held, not the edge of empty.',
		slugs: ['teachers', 'nurses', 'doctors'],
	},
	{
		key: 'serve',
		short: 'Serve & protect',
		eyebrow: 'A Father for those who serve',
		heading: 'For those who serve & protect',
		intro:
			'You run toward danger, stand the post, and carry what most will never see — and you were never meant to carry it alone. Meet the Father who runs toward you, who sees what you have seen, and stays.',
		slugs: ['first-responders', 'military', 'veterans'],
	},
	{
		key: 'hardest',
		short: 'Hardest seasons',
		eyebrow: 'A Father in the hardest seasons',
		heading: 'For the hardest seasons',
		intro:
			'When life breaks — a diagnosis, an addiction, a marriage ending, a prison cell, a devastating loss — you are not alone, and you are not beyond His reach. Meet the Father who is close to the brokenhearted and never turns away.',
		slugs: ['incarcerated', 'cancer', 'addiction', 'divorce', 'grief'],
	},
];

export const FAITH_GROUPS: Group[] = [
	{
		slug: 'catholics',
		group: 'Catholics',
		title: 'For Catholics',
		blurb:
			'You carry a rich heritage — the Trinity, Christ, the prayer Jesus taught. Yet many relate to God through duty and a sense of earning His favor. You don’t have to earn what is already yours: you are His beloved child by grace.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/ebe9faa99573303b1c3c2967f0767ea5596f68d3-1100x733.jpg',
	},
	{
		slug: 'jews',
		group: 'The Jewish People',
		title: 'For the Jewish People',
		blurb:
			'The God of Abraham, Isaac, and Jacob reveals Himself as Father in your own Scriptures. “You, O LORD, are our Father.” He longs to be known not only as Sovereign and Lawgiver, but as a Father of everlasting compassion.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/15ba9fd33c63facc3baac59714726f7cc7bfeb06-1100x825.jpg',
	},
	{
		slug: 'muslims',
		group: 'Muslims',
		title: 'For Muslims',
		blurb:
			'You know the discipline of prayer and the hunger to honor a great and merciful God. He longs to be known by you not only as Master, but as a near and loving Father who calls you His own beloved child.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/6dd5f70638c76cbdf5e59270949f264be0ac434a-1100x735.jpg',
	},
	{
		slug: 'hindus',
		group: 'Hindus',
		title: 'For Hindus',
		blurb:
			'You carry a profound spiritual hunger — the longing to know the divine and find rest. The divine you long for is one personal Father who knows your name, is near to you now, and loves you as His child by grace.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/4806a4909ce1a92df802eb826ca1d7a71959cee0-1100x733.jpg',
	},
	{
		slug: 'buddhists',
		group: 'Buddhists',
		title: 'For Buddhists',
		blurb:
			'The Buddhist path holds deep wisdom about suffering and compassion. You do not have to carry the suffering alone or strive your way to peace — there is a personal Father who meets you in your pain and gives you rest.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/1593531b29a717c8e39a97577a253c14e9807a06-1100x733.jpg',
	},
	{
		slug: 'sikhs',
		group: 'Sikhs',
		title: 'For Sikhs',
		blurb:
			'You devote your heart to the one God and live it out in honest work, equality, and selfless service. The one God you love longs to be known as a personal Father — near and tender — who calls you His child by grace.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/e83d5889cb68eac4987b21065ca3a3cd96d8e58c-1100x734.jpg',
	},
	{
		slug: 'spiritually-curious',
		group: 'The Spiritually Curious',
		title: 'For Skeptics & the Spiritually Curious',
		blurb:
			'Atheist, agnostic, deconstructing, or just done with religion. Maybe the God you walked away from — distant, angry, a list of rules — was never the real One. There’s a Father worth meeting. Read it yourself, free, and decide.',
		img: 'https://cdn.sanity.io/images/rusi1hyi/production/b51d0e4f69a4c96354e58c83f3452b96b9537545-1100x733.jpg',
	},
];
