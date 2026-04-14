/**
 * seed-sanity.mjs
 *
 * Seeds initial content into Sanity for the FHB launch site.
 * Run once after Phase 5 schema deploy:
 *
 *   node scripts/seed-sanity.mjs
 *
 * Requires SANITY_TOKEN with write permissions.
 * Token is read from /home/deploy/.secrets or SANITY_TOKEN env var.
 */

import { createClient } from '@sanity/client';

const token = process.env.SANITY_TOKEN;
if (!token) {
	console.error('❌ SANITY_TOKEN not set.');
	console.error('   Create a write token at: https://www.sanity.io/manage/project/rusi1hyi/api');
	console.error('   Then run: SANITY_TOKEN=<token> node scripts/seed-sanity.mjs');
	process.exit(1);
}
// Note: SANITY_TOKEN must be a project API token (Tokens tab in Sanity Manage),
// NOT the OAuth session token stored in /home/deploy/.secrets.
// Create one at: https://www.sanity.io/manage/project/rusi1hyi/api → Tokens → Add API token

const client = createClient({
	projectId: 'rusi1hyi',
	dataset: 'production',
	useCdn: false,
	apiVersion: '2024-01-01',
	token,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function upsert(doc) {
	const existing = await client.fetch(`*[_type == $type && _id == $id][0]._id`, {
		type: doc._type,
		id: doc._id,
	});
	if (existing) {
		console.log(`  skip (exists): ${doc._id}`);
		return;
	}
	await client.createOrReplace(doc);
	console.log(`  created: ${doc._id}`);
}

// ── 1. Page documents (SEO + hero fallbacks) ──────────────────────────────────

const pages = [
	{
		_id: 'page-home',
		_type: 'page',
		slug: 'home',
		title: 'Homepage',
		seoTitle: "Father's Heart Bible | A New Bible Translation Revealing the Father's Heart",
		seoDescription:
			"Discover the Father's Heart Bible, a new Bible translation revealing God as Father and inviting readers into beloved identity. Download the free book and join the movement.",
	},
	{
		_id: 'page-the-fathers-heart-bible',
		_type: 'page',
		slug: 'the-fathers-heart-bible',
		title: "The Father's Heart Bible",
		seoTitle: "What Is the Father's Heart Bible? | Father's Heart Bible",
		seoDescription:
			"Learn what the Father's Heart Bible is, why it exists, and how this new Bible translation reveals God as Father where Scripture reveals Him.",
	},
	{
		_id: 'page-samples',
		_type: 'page',
		slug: 'samples',
		title: 'Sample Passages',
		seoTitle: "Sample Passages | Father's Heart Bible",
		seoDescription:
			"Explore sample passages from the Father's Heart Bible and experience how this new Bible translation reveals God as Father and brings beloved identity into clear view.",
	},
	{
		_id: 'page-download',
		_type: 'page',
		slug: 'download',
		title: 'Download',
		seoTitle: "Download the Free Book | Father's Heart Bible",
		seoDescription:
			"Download Father's Heart — Beloved Identity, a free chapter from the Father's Heart Bible. Experience how this translation reveals God as a loving Father.",
	},
	{
		_id: 'page-join',
		_type: 'page',
		slug: 'join',
		title: 'Join the Movement',
		seoTitle: "Join the Father's Heart Movement | Father's Heart Bible",
		seoDescription:
			"Join a growing community of believers discovering God as Father through the Father's Heart Bible. Connect, grow, and belong.",
	},
	{
		_id: 'page-partner',
		_type: 'page',
		slug: 'partner',
		title: 'Partner With Us',
		seoTitle: "Partner With Us | Father's Heart Bible",
		seoDescription:
			"Partner with the Father's Heart Bible project and help bring this transformational translation to the world. Your support makes a difference.",
	},
	{
		_id: 'page-about',
		_type: 'page',
		slug: 'about',
		title: 'About',
		seoTitle: "About Kevin White | Father's Heart Bible",
		seoDescription:
			"Learn the story behind the Father's Heart Bible and the vision to reveal God as Father through Scripture.",
	},
];

// ── 2. Kevin White — Person Profile ──────────────────────────────────────────

const kevin = {
	_id: 'person-kevin-white',
	_type: 'personProfile',
	name: 'Kevin White',
	role: 'Lead Translator & Founder',
	bio: "Kevin White spent decades in faithful Scripture reading before awakening to God as Father — not just as sovereign master. That encounter led to the Father's Heart Bible, a translation designed to make the relational heart of God unmistakable on every page.",
	order: 1,
};

// ── 3. Primary Resource ───────────────────────────────────────────────────────

const resource = {
	_id: 'resource-beloved-identity',
	_type: 'resource',
	title: "Father's Heart → Beloved Identity",
	slug: { _type: 'slug', current: 'beloved-identity' },
	shortDescription:
		"A free chapter from the Father's Heart Bible — experience the difference on your first read.",
	formHeading: 'Get Your Free Copy',
	formDescription: 'Enter your name and email to receive the free download.',
	buttonText: 'Download the Free Book',
	featured: true,
	order: 1,
};

// ── 4. Scripture Comparisons ──────────────────────────────────────────────────

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
		reference: 'Romans 8:15–16',
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

// ── Run ───────────────────────────────────────────────────────────────────────

async function seed() {
	console.log('\n📖 FHB Sanity Seed Script\n');

	console.log('Creating page documents...');
	for (const page of pages) {
		await upsert(page);
	}

	console.log('\nCreating person profile...');
	await upsert(kevin);

	console.log('\nCreating resource...');
	await upsert(resource);

	console.log('\nCreating scripture comparisons...');
	for (const comp of comparisons) {
		await upsert(comp);
	}

	console.log('\n✅ Seed complete.\n');
	console.log('Next steps:');
	console.log('  1. Open Sanity Studio at fathersheartbible.sanity.studio');
	console.log('  2. Review and publish all documents');
	console.log('  3. Fill in siteSettings: communityUrl, donateUrl, ghlDownloadFormId, media URLs');
	console.log('  4. Set up Netlify webhook (see CLAUDE.md for instructions)');
}

seed().catch((err) => {
	console.error('Seed failed:', err);
	process.exit(1);
});
