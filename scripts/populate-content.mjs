/**
 * populate-content.mjs
 *
 * Phase 5A: Populate launch content into Sanity.
 * Creates/updates all documents with approved spec copy.
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
	tagline: "A New Bible Translation Revealing the Father's Heart",
	seoTitle: "Father's Heart Bible | A New Bible Translation Revealing the Father's Heart",
	seoDescription:
		"Discover the Father's Heart Bible, a new Bible translation revealing God as Father where Scripture reveals Him. Download the free book, explore sample passages, join the movement, and be part of what the Father is doing.",
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
			"Discover the Father's Heart Bible, a new Bible translation revealing God as Father where Scripture reveals Him. Download the free book, explore sample passages, join the movement, and be part of what the Father is doing.",
		heroHeading: "You were never meant to relate to God as a servant\u2026 but as a beloved child.",
		heroSubheading:
			"The Father\u2019s Heart Bible reveals what Scripture has always been showing: the destination was never merely forgiveness or heaven. The destination has always been the Father.",
		heroPrimaryCtaLabel: 'Download the Free Book',
		heroPrimaryCtaHref: '/download',
		heroSecondaryCtaLabel: 'Already have it? Start here',
		heroSecondaryCtaHref: '/join',
	},
	{
		_id: 'page-the-fathers-heart-bible',
		_type: 'page',
		slug: 'the-fathers-heart-bible',
		title: "The Father's Heart Bible",
		seoTitle: "What Is the Father's Heart Bible? | Father's Heart Bible",
		seoDescription:
			"Learn what the Father\u2019s Heart Bible is, why it exists, and how this new Bible translation reveals God as Father where Scripture reveals Him.",
		heroHeading: "What is the Father\u2019s Heart Bible?",
		heroSubheading:
			"The Father\u2019s Heart Bible is a new interpretive English Bible translation that reveals God as Father where Scripture reveals Him\u2014and helps readers encounter not only His name, but His heart.",
		heroPrimaryCtaLabel: 'Read Sample Passages',
		heroPrimaryCtaHref: '/samples',
		heroSecondaryCtaLabel: 'Download the Free Book',
		heroSecondaryCtaHref: '/download',
	},
	{
		_id: 'page-samples',
		_type: 'page',
		slug: 'samples',
		title: 'Sample Passages',
		seoTitle: "Sample Passages | Father's Heart Bible",
		seoDescription:
			"Explore sample passages from the Father\u2019s Heart Bible and experience how this new Bible translation reveals God as Father and brings beloved identity into clear view.",
		heroHeading: 'Sample Passages',
		heroSubheading: 'Experience how Scripture reads when the Father is more clearly revealed.',
		heroPrimaryCtaLabel: 'Download the Free Book',
		heroPrimaryCtaHref: '/download',
		heroSecondaryCtaLabel: 'Join the Movement',
		heroSecondaryCtaHref: '/join',
	},
	{
		_id: 'page-download',
		_type: 'page',
		slug: 'download',
		title: 'Download',
		seoTitle: "Download Father\u2019s Heart \u2192 Beloved Identity | Father's Heart Bible",
		seoDescription:
			"Download the free PDF of Father\u2019s Heart \u2192 Beloved Identity and discover the heart behind the Father\u2019s Heart Bible.",
		heroHeading: 'Download the Free Book',
		heroSubheading: "Father\u2019s Heart \u2192 Beloved Identity",
		heroPrimaryCtaLabel: 'Download the Free Book',
		heroPrimaryCtaHref: '#form',
	},
	{
		_id: 'page-join',
		_type: 'page',
		slug: 'join',
		title: 'Join the Movement',
		seoTitle: "Join the Father\u2019s Heart Movement | Father's Heart Bible",
		seoDescription:
			"Join the Father\u2019s Heart Movement to grow in beloved identity, hear His voice, pray, and take part in publishing the Father\u2019s Heart Bible to the nations.",
		heroHeading: "Join the Father\u2019s Heart Movement",
		heroSubheading: "Be part of what the Father is doing.",
		heroPrimaryCtaLabel: 'Join the Movement',
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
			"Partner with the Father\u2019s Heart Bible and be part of what the Father is doing through Scripture, publication, and distribution.",
		heroHeading: 'Partner With Us',
		heroSubheading: 'Be part of what the Father is doing.',
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
			"Learn the story behind the Father\u2019s Heart Bible and the vision to reveal God as Father through Scripture.",
		heroHeading: 'The story behind the Father\u2019s Heart Bible',
		heroSubheading:
			"The Father\u2019s Heart Bible was not born from novelty. It was born from a long journey through Scripture, ministry, longing, and awakening.",
		heroPrimaryCtaLabel: 'Download the Free Book',
		heroPrimaryCtaHref: '/download',
	},
];

// ── 3. Scripture Comparisons — exact approved FHB translations ────────────────

const comparisons = [
	{
		_id: 'sc-john-316',
		_type: 'scriptureComparison',
		reference: 'John 3:16',
		category: 'featured',
		traditional:
			'For God so loved the world that He gave His one and only Son, that whoever believes in Him shall not perish but have eternal life.',
		translationLabel: 'Standard',
		fhb: 'For our Father so loved the world that He gave His one and only Son, so that everyone who trusts in Him would not be lost, but would live in the life of the age to come.',
		note: 'In this passage, the One who loves and gives the Son is the Father. The Father\u2019s Heart Bible makes that explicit, helping readers hear this verse not as the action of a distant supreme being, but as the giving love of the Father Himself.',
		featured: true,
		order: 1,
	},
	{
		_id: 'sc-joel-213',
		_type: 'scriptureComparison',
		reference: 'Joel 2:13',
		category: 'joel',
		traditional:
			'Return to the LORD your God, for He is gracious and compassionate, slow to anger and abounding in love.',
		translationLabel: 'Standard',
		fhb: 'Tear open your hearts\u2026 return to your Father, for He is gracious and His compassion runs deep, He is slow to anger and overflowing with faithful love.',
		note: "Joel\u2019s invitation is not simply a summons back to divine authority. It is a call to return to the Father\u2019s heart.",
		order: 2,
	},
	{
		_id: 'sc-joel-218',
		_type: 'scriptureComparison',
		reference: 'Joel 2:18',
		category: 'joel',
		traditional: 'Then the LORD was jealous for His land and had pity on His people.',
		translationLabel: 'Standard',
		fhb: "Then our Father\u2019s heart went out for His land, and He had deep compassion on His children.",
		note: 'This rendering makes the emotional movement of the passage more visible. The Father is not detached from His people\u2019s suffering. His heart is engaged.',
		order: 3,
	},
	{
		_id: 'sc-joel-228',
		_type: 'scriptureComparison',
		reference: 'Joel 2:28',
		category: 'joel',
		traditional: 'I will pour out My Spirit on all people\u2026',
		translationLabel: 'Standard',
		fhb: 'I will pour out My Spirit on all My beloved sons and daughters.',
		note: 'The outpouring of the Spirit is not merely an event of power. It is familial, relational, and identity-forming.',
		order: 4,
	},
	{
		_id: 'sc-luke-1520',
		_type: 'scriptureComparison',
		reference: 'Luke 15:20',
		category: 'heart-language',
		traditional:
			'While he was still a long way off, his father saw him and was filled with compassion for him; he ran to his son, threw his arms around him and kissed him.',
		translationLabel: 'Standard',
		fhb: 'While he was still a long way off, his father saw him, and his heart ran toward him before his feet did. He embraced him and covered him with kisses.',
		note: 'The prodigal story has always been about the father\u2019s heart. The Father\u2019s Heart Bible seeks to let readers feel that movement more deeply.',
		order: 5,
	},
	{
		_id: 'sc-matthew-936',
		_type: 'scriptureComparison',
		reference: 'Matthew 9:36',
		category: 'heart-language',
		traditional: 'When He saw the crowds, He had compassion on them\u2026',
		translationLabel: 'Standard',
		fhb: 'When He saw the crowds, His heart went out to them\u2026',
		note: 'Where many readers hear a formal phrase, the Father\u2019s Heart Bible restores warmth, immediacy, and felt compassion.',
		order: 6,
	},
	{
		_id: 'sc-zephaniah-317',
		_type: 'scriptureComparison',
		reference: 'Zephaniah 3:17',
		category: 'heart-language',
		traditional:
			'The LORD your God is with you\u2026 He will take great delight in you\u2026 He will rejoice over you with singing.',
		translationLabel: 'Standard',
		fhb: 'The Father is living among you. He is a mighty Savior. His heart delights in you with gladness. His love quiets your fears. He rejoices over you with joyful songs.',
		note: 'This passage reveals delight, comfort, and celebration. The Father\u2019s Heart Bible brings those relational elements to the front.',
		order: 7,
	},
	{
		_id: 'sc-romans-815',
		_type: 'scriptureComparison',
		reference: 'Romans 8:15\u201316',
		category: 'identity',
		traditional:
			"You did not receive a spirit that makes you a slave again to fear, but you received the Spirit of adoption\u2026 The Spirit Himself testifies with our spirit that we are children of God.",
		translationLabel: 'Standard',
		fhb: "You did not receive a spirit of slavery that draws you back into fear, but you received the Spirit of adoption, by whom we cry out, \u2018Abba! Father!\u2019 The Holy Spirit Himself bears witness with our spirit that we are our Father\u2019s children.",
		note: 'The point of adoption is not merely a change of status. It is a restoration of belonging.',
		order: 8,
	},
	{
		_id: 'sc-john-112',
		_type: 'scriptureComparison',
		reference: 'John 1:12',
		category: 'identity',
		traditional:
			'To all who did receive Him\u2026 He gave the right to become children of God.',
		translationLabel: 'Standard',
		fhb: 'To all who received Him and trusted in His name, He gave the right to become beloved children of their Father.',
		note: 'This rendering brings forward the welcome, identity, and belonging at the heart of the verse.',
		order: 9,
	},
	{
		_id: 'sc-galatians-46',
		_type: 'scriptureComparison',
		reference: 'Galatians 4:6',
		category: 'identity',
		traditional:
			"Because you are sons, God has sent the Spirit of His Son into our hearts, crying, \u2018Abba! Father!\u2019",
		translationLabel: 'Standard',
		fhb: "Because you are His children, our Father has sent the Spirit of His Son into your hearts, awakening the cry, \u2018Abba! Father!\u2019",
		note: 'The Spirit is not merely informative. He awakens relational knowing and beloved identity.',
		order: 10,
	},
];

// ── 4. Resource ───────────────────────────────────────────────────────────────

const resource = {
	_id: 'resource-beloved-identity',
	_type: 'resource',
	title: "Father\u2019s Heart \u2192 Beloved Identity",
	slug: { _type: 'slug', current: 'beloved-identity' },
	shortDescription:
		"A short, powerful introduction to the message behind the Father\u2019s Heart Bible and the revelation of beloved identity.",
	formHeading: 'Receive the free PDF',
	formDescription:
		"Enter your information below to receive Father\u2019s Heart \u2192 Beloved Identity and hear about future resources, updates, and next steps connected to the Father\u2019s Heart Bible.",
	buttonText: 'Download the Free Book',
	featured: true,
	order: 1,
};

// ── 5. Kevin's Profile ────────────────────────────────────────────────────────

const kevin = {
	_id: 'person-kevin-white',
	_type: 'personProfile',
	name: 'Kevin White',
	role: 'Lead Translator and Vision Holder',
	bio: "Kevin White is the lead translator and vision holder behind the Father\u2019s Heart Bible. After decades of reading Scripture faithfully, he became convinced that the Bible has always been revealing the Father more clearly than many readers have been taught to see. The Father\u2019s Heart Bible was born from that conviction.",
	order: 1,
};

// ── Run ───────────────────────────────────────────────────────────────────────

async function run() {
	console.log('\n\uD83D\uDCD6 FHB Phase 5A \u2014 Content Population\n');

	console.log('1. Updating siteSettings...');
	await patch('site-settings', siteSettingsPatch);

	console.log('\n2. Creating page documents...');
	for (const page of pages) {
		await createOrReplace(page);
	}

	console.log('\n3. Creating scripture comparisons...');
	for (const comp of comparisons) {
		await createOrReplace(comp);
	}

	console.log('\n4. Creating resource document...');
	await createOrReplace(resource);

	console.log('\n5. Creating Kevin White profile...');
	await createOrReplace(kevin);

	console.log('\n\u2705 Content population complete.');
	console.log('\nAll documents created/updated in Sanity.');
	console.log('Open fathersheartbible.sanity.studio to review and publish.');
}

run().catch(err => {
	console.error('Population failed:', err.message);
	process.exit(1);
});
