/**
 * populate-content.mjs
 *
 * Phase 5A: Populate launch content into Sanity.
 * Creates/updates all documents needed for a full visual review.
 *
 * Run from ~/Sites/FHB:
 *   node scripts/populate-content.mjs
 *
 * Token is read from /home/deploy/bin/.env (SANITY_TOKEN)
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@sanity/client';

// Load token from /home/deploy/bin/.env
let token = process.env.SANITY_TOKEN;
if (!token) {
	try {
		const env = readFileSync('/home/deploy/bin/.env', 'utf8');
		const match = env.match(/^SANITY_TOKEN=(.+)$/m);
		if (match) token = match[1].trim().replace(/^["']|["']$/g, '');
	} catch {}
}
if (!token) {
	console.error('❌ SANITY_TOKEN not found. Set it or ensure /home/deploy/bin/.env is readable.');
	process.exit(1);
}

const client = createClient({
	projectId: 'rusi1hyi',
	dataset: 'production',
	useCdn: false,
	apiVersion: '2024-01-01',
	token,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function createOrReplace(doc) {
	try {
		await client.createOrReplace(doc);
		console.log(`  ✓ ${doc._type} | ${doc._id}`);
	} catch (err) {
		console.error(`  ✗ ${doc._type} | ${doc._id}: ${err.message}`);
	}
}

async function patch(id, fields) {
	try {
		await client.patch(id).set(fields).commit();
		console.log(`  ✓ patched: ${id}`);
	} catch (err) {
		console.error(`  ✗ patch ${id}: ${err.message}`);
	}
}

// ── 1. siteSettings ───────────────────────────────────────────────────────────

const siteSettingsPatch = {
	siteName: "Father's Heart Bible",
	tagline: 'A New Bible Translation Revealing the Father\'s Heart',
	seoTitle: "Father's Heart Bible | Revealing the Father's Heart Through Scripture",
	seoDescription:
		"A new Bible translation that makes God's fatherly heart unmistakable from Genesis to Revelation. Download the free book and join the movement.",
	translatorName: 'Kevin White',
	publisherName: "Father's Heart Bible LLC",
	copyright: "Father's Heart Bible LLC. All rights reserved.",
	email: 'contact@fathersheartbible.com',
	footerQuote:
		'I will be their Father, and they will be my sons and daughters — says the Lord Almighty.',
	navLinks: [
		{ _key: 'nav-home', label: 'Home', href: '/' },
		{ _key: 'nav-fhb', label: "The Father's Heart Bible", href: '/the-fathers-heart-bible' },
		{ _key: 'nav-samples', label: 'Samples', href: '/samples' },
		{ _key: 'nav-download', label: 'Download', href: '/download' },
		{ _key: 'nav-join', label: 'Join the Movement', href: '/join' },
		{ _key: 'nav-partner', label: 'Partner With Us', href: '/partner' },
		{ _key: 'nav-about', label: 'About', href: '/about' },
	],
	footerNavLinks: [
		{ _key: 'fnav-home', label: 'Home', href: '/' },
		{ _key: 'fnav-fhb', label: "The Father's Heart Bible", href: '/the-fathers-heart-bible' },
		{ _key: 'fnav-samples', label: 'Samples', href: '/samples' },
		{ _key: 'fnav-download', label: 'Download', href: '/download' },
		{ _key: 'fnav-join', label: 'Join the Movement', href: '/join' },
		{ _key: 'fnav-partner', label: 'Partner With Us', href: '/partner' },
		{ _key: 'fnav-about', label: 'About', href: '/about' },
		{ _key: 'fnav-contact', label: 'Contact', href: '/contact' },
		{ _key: 'fnav-privacy', label: 'Privacy Policy', href: '/privacy' },
		{ _key: 'fnav-terms', label: 'Terms', href: '/terms' },
	],
};

// ── 2. Page documents ────────────────────────────────────────────────────────

const pages = [
	{
		_id: 'page-home',
		_type: 'page',
		slug: 'home',
		title: 'Homepage',
		seoTitle: "Father's Heart Bible | A New Bible Translation Revealing the Father's Heart",
		seoDescription:
			"Discover the Father's Heart Bible, a new Bible translation revealing God as Father and inviting readers into beloved identity. Download the free book and join the movement.",
		heroHeading: "You were never meant to relate to God as a servant, but as a beloved child.",
		heroSubheading:
			"A new Bible translation revealing the Father's heart — from Genesis to Revelation.",
		heroPrimaryCtaLabel: 'Download the Free Book',
		heroPrimaryCtaHref: '/download',
		heroSecondaryCtaLabel: 'Read Sample Passages',
		heroSecondaryCtaHref: '/samples',
	},
	{
		_id: 'page-the-fathers-heart-bible',
		_type: 'page',
		slug: 'the-fathers-heart-bible',
		title: "The Father's Heart Bible",
		seoTitle: "What Is the Father's Heart Bible? | Father's Heart Bible",
		seoDescription:
			"Learn what the Father's Heart Bible is, why it exists, and how this new Bible translation reveals God as Father where Scripture reveals Him.",
		heroEyebrow: "What Is the Father's Heart Bible?",
		heroHeading: 'A Translation That Reveals What Was Always True',
		heroSubheading:
			"The Father's Heart Bible is an interpretive English translation that makes God's fatherly heart unmistakable — where Scripture itself reveals it.",
		heroPrimaryCtaLabel: 'Download the Free Book',
		heroPrimaryCtaHref: '/download',
		heroSecondaryCtaLabel: 'Read Sample Passages',
		heroSecondaryCtaHref: '/samples',
	},
	{
		_id: 'page-samples',
		_type: 'page',
		slug: 'samples',
		title: 'Sample Passages',
		seoTitle: "Sample Passages | Father's Heart Bible",
		seoDescription:
			"Explore sample passages from the Father's Heart Bible and experience how this new Bible translation reveals God as Father and brings beloved identity into clear view.",
		heroEyebrow: 'Sample Passages',
		heroHeading: 'Experience the difference.',
		heroSubheading:
			"Read side-by-side comparisons and let Scripture speak for itself. These are not new words — they are the same Word, with the Father's heart made clear.",
		heroPrimaryCtaLabel: 'Download the Free Book',
		heroPrimaryCtaHref: '/download',
	},
	{
		_id: 'page-download',
		_type: 'page',
		slug: 'download',
		title: 'Download',
		seoTitle: "Download the Free Book | Father's Heart Bible",
		seoDescription:
			"Download Father's Heart — Beloved Identity, a free chapter from the Father's Heart Bible. Experience how this translation reveals God as a loving Father.",
		heroEyebrow: 'Free Download',
		heroHeading: 'Start Here.',
		heroSubheading:
			"Father's Heart → Beloved Identity is your free introduction to a translation that changes how you read Scripture — and how you understand who you are.",
		heroPrimaryCtaLabel: 'Download Now',
		heroPrimaryCtaHref: '#form',
		heroSecondaryCtaLabel: 'Read Sample Passages',
		heroSecondaryCtaHref: '/samples',
	},
	{
		_id: 'page-join',
		_type: 'page',
		slug: 'join',
		title: 'Join the Movement',
		seoTitle: "Join the Father's Heart Movement | Father's Heart Bible",
		seoDescription:
			"Join a growing community of believers discovering God as Father through the Father's Heart Bible. Connect, grow, and belong.",
		heroEyebrow: 'Join the Movement',
		heroHeading: 'You Are Not Meant to Walk This Alone.',
		heroSubheading:
			"The Father's Heart Movement is a growing community of believers discovering what it means to live as beloved children — not servants.",
		heroPrimaryCtaLabel: 'Join the Community',
		heroPrimaryCtaHref: '#join',
		heroSecondaryCtaLabel: 'Download the Free Book',
		heroSecondaryCtaHref: '/download',
	},
	{
		_id: 'page-partner',
		_type: 'page',
		slug: 'partner',
		title: 'Partner With Us',
		seoTitle: "Partner With Us | Father's Heart Bible",
		seoDescription:
			"Partner with the Father's Heart Bible project and help bring this transformational translation to the world. Your support makes a difference.",
		heroEyebrow: 'Partner With Us',
		heroHeading: 'Be Part of What the Father Is Doing.',
		heroSubheading:
			"This is not a fundraising campaign. It is an invitation to participate in something the Father has been doing since the beginning — revealing Himself as a Father to His children.",
		heroPrimaryCtaLabel: 'Donate Now',
		heroPrimaryCtaHref: '#donate',
	},
	{
		_id: 'page-about',
		_type: 'page',
		slug: 'about',
		title: 'About',
		seoTitle: "About Kevin White | Father's Heart Bible",
		seoDescription:
			"Learn the story behind the Father's Heart Bible and the vision to reveal God as Father through Scripture.",
		heroEyebrow: 'About',
		heroHeading: 'The Story Behind the Father\'s Heart Bible',
		heroSubheading:
			"The Father's Heart Bible began not as a publishing project, but as a personal awakening — a journey from knowing about God to knowing Him as Father.",
		heroPrimaryCtaLabel: 'Download the Free Book',
		heroPrimaryCtaHref: '/download',
	},
];

// ── 3. Scripture Comparisons ──────────────────────────────────────────────────

const comparisons = [
	{
		_id: 'sc-john-316',
		_type: 'scriptureComparison',
		reference: 'John 3:16',
		category: 'featured',
		traditional:
			'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
		translationLabel: 'NIV',
		fhb: "For the Father so loved His children that He gave His only Son, so that everyone who believes in Him will not perish but will have eternal life as beloved sons and daughters.",
		note: "Jesus is revealing the one sending Him — not a sovereign authority, but a Father who gives His Son out of love for His children.",
		featured: true,
		order: 1,
	},
	{
		_id: 'sc-joel-213',
		_type: 'scriptureComparison',
		reference: 'Joel 2:13',
		category: 'joel',
		traditional:
			'Return to the Lord your God, for he is gracious and compassionate, slow to anger and abounding in love, and he relents from sending calamity.',
		translationLabel: 'NIV',
		fhb: 'Return to your Father with all your heart — for your Father is gracious and compassionate, slow to anger and abounding in love, and He relents from sending calamity.',
		note: 'The prophet is not calling people back to a distant sovereign. He is calling them home to a Father.',
		order: 2,
	},
	{
		_id: 'sc-joel-218',
		_type: 'scriptureComparison',
		reference: 'Joel 2:18',
		category: 'joel',
		traditional: 'Then the Lord was jealous for his land and took pity on his people.',
		translationLabel: 'NIV',
		fhb: "Then our Father's heart went out for his land, and he had compassion on his people.",
		note: "The Father's heart going out — not cold sovereignty, but the tender, urgent love of a Father who cannot stay removed from His children.",
		order: 3,
	},
	{
		_id: 'sc-joel-228',
		_type: 'scriptureComparison',
		reference: 'Joel 2:28',
		category: 'joel',
		traditional:
			'I will pour out my Spirit on all people. Your sons and daughters will prophesy, your old men will dream dreams, your young men will see visions.',
		translationLabel: 'NIV',
		fhb: 'I will pour out my Spirit on all my beloved sons and daughters. Your sons and daughters will prophesy, your old men will dream dreams, your young men will see visions.',
		note: 'The outpouring is not simply demographic — it is the Father pouring Himself out on His beloved family.',
		order: 4,
	},
	{
		_id: 'sc-luke-1520',
		_type: 'scriptureComparison',
		reference: 'Luke 15:20',
		category: 'heart-language',
		traditional:
			'But while he was still a long way off, his father saw him and was filled with compassion for him; he ran to his son, threw his arms around him and kissed him.',
		translationLabel: 'NIV',
		fhb: 'But while he was still a long way off, his father saw him and his heart went out to him; he ran to his son, threw his arms around him and held him close.',
		note: 'The Father in this parable does not wait to be convinced. His heart goes out the moment he sees his child returning.',
		order: 5,
	},
	{
		_id: 'sc-matthew-936',
		_type: 'scriptureComparison',
		reference: 'Matthew 9:36',
		category: 'heart-language',
		traditional:
			'When he saw the crowds, he had compassion on them, because they were harassed and helpless, like sheep without a shepherd.',
		translationLabel: 'NIV',
		fhb: "When he saw the crowds, his heart went out to them, because they were harassed and helpless — like children without a father's care.",
		note: "Jesus doesn't observe the crowds analytically. His heart moves. FHB makes the tenderness of that moment vivid.",
		order: 6,
	},
	{
		_id: 'sc-zephaniah-317',
		_type: 'scriptureComparison',
		reference: 'Zephaniah 3:17',
		category: 'heart-language',
		traditional:
			'The Lord your God is with you, the Mighty Warrior who saves. He will take great delight in you; in his love he will no longer rebuke you, but will rejoice over you with singing.',
		translationLabel: 'NIV',
		fhb: 'Your Father is in your midst — the Mighty One who saves. He will rejoice over you with gladness; He will quiet you with His love and exult over you with joyful singing.',
		note: 'A Father who sings over His child. This is not religious transaction — this is the sound of delight.',
		order: 7,
	},
	{
		_id: 'sc-romans-815',
		_type: 'scriptureComparison',
		reference: 'Romans 8:15\u201316',
		category: 'identity',
		traditional:
			"The Spirit you received does not make you slaves, so that you live in fear again; rather, the Spirit you received brought about your adoption to sonship. And by him we cry, 'Abba, Father.' The Spirit himself testifies with our spirit that we are God's children.",
		translationLabel: 'NIV',
		fhb: "You did not receive a spirit of slavery to fall back into fear. You received the Spirit of beloved adoption — by whom we cry, 'Abba, Father.' And the Spirit himself confirms with our spirit that we are the Father's beloved children.",
		note: "Paul's entire argument turns on identity. We are not slaves living in fear — we are beloved children living in the freedom of the Father's house.",
		order: 8,
	},
	{
		_id: 'sc-john-112',
		_type: 'scriptureComparison',
		reference: 'John 1:12',
		category: 'identity',
		traditional:
			'Yet to all who did receive him, to those who believed in his name, he gave the right to become children of God.',
		translationLabel: 'NIV',
		fhb: 'Yet to all who received him — to all who trusted in his name — he gave the right to become beloved children of the Father.',
		note: 'To receive Jesus is to be received into the family. The right is not legal standing alone — it is belonging.',
		order: 9,
	},
	{
		_id: 'sc-galatians-46',
		_type: 'scriptureComparison',
		reference: 'Galatians 4:6',
		category: 'identity',
		traditional:
			"Because you are his sons, God sent the Spirit of his Son into our hearts, the Spirit who calls out, 'Abba, Father.'",
		translationLabel: 'NIV',
		fhb: "Because you are His beloved children, your Father sent the Spirit of His Son into our hearts — the Spirit who cries out, 'Abba, Father.'",
		note: 'The Spirit is not given to strangers. He is given to beloved children who have been brought home.',
		order: 10,
	},
];

// ── 4. Resource ───────────────────────────────────────────────────────────────

const resource = {
	_id: 'resource-beloved-identity',
	_type: 'resource',
	title: "Father's Heart \u2192 Beloved Identity",
	slug: { _type: 'slug', current: 'beloved-identity' },
	shortDescription:
		"Your free introduction to the Father's Heart Bible — experience how this translation reveals God as Father from your very first read.",
	formHeading: 'Get Your Free Copy',
	formDescription:
		"Enter your name and email below. We'll send you the free chapter immediately.",
	buttonText: 'Download the Free Book',
	featured: true,
	order: 1,
};

// ── 5. Kevin's Profile ────────────────────────────────────────────────────────

const kevin = {
	_id: 'person-kevin-white',
	_type: 'personProfile',
	name: 'Kevin White',
	role: 'Lead Translator & Founder',
	bio: "Kevin White spent decades reading Scripture faithfully before awakening to God as Father — not just as sovereign master. That personal encounter became the foundation of the Father's Heart Bible.",
	order: 1,
};

// ── Run ───────────────────────────────────────────────────────────────────────

async function run() {
	console.log("\n📖 FHB Phase 5A — Content Population\n");

	console.log("1. Updating siteSettings...");
	await patch('site-settings', siteSettingsPatch);

	console.log("\n2. Creating page documents...");
	for (const page of pages) {
		await createOrReplace(page);
	}

	console.log("\n3. Creating scripture comparisons...");
	for (const comp of comparisons) {
		await createOrReplace(comp);
	}

	console.log("\n4. Creating resource document...");
	await createOrReplace(resource);

	console.log("\n5. Creating Kevin White profile...");
	await createOrReplace(kevin);

	console.log("\n✅ Content population complete.");
	console.log("\nNext steps:");
	console.log("  1. Open Sanity Studio: fathersheartbible.sanity.studio");
	console.log("  2. Review and publish all documents");
	console.log("  3. Update siteSettings with live URLs: communityUrl, donateUrl, media URLs");
	console.log("  4. Upload Kevin's portrait and book cover to Sanity media library");
}

run().catch(err => {
	console.error("Population failed:", err.message);
	process.exit(1);
});
