// Messages from the Father — prophetic words received for a specific community
// (worship leaders, fathers, teachers, …). Deliberately NOT a blogPost: these
// posts are exempt from the Gold-Level 31-milestone audit and the blog audio
// cron, render at /words/<slug>, and keep the word itself unscaffolded (the
// optional training section below the word is where searchable teaching lives).
export default {
	name: 'fatherMessage',
	title: 'Messages from the Father',
	type: 'document',
	fields: [
		{
			name: 'title',
			title: 'Title',
			type: 'string',
			description:
				'Full H1 — audience + declaration, e.g. "A Message for Worship Leaders: You\'ve Worshipped the Door Long Enough"',
			validation: (Rule: any) => Rule.required(),
		},
		{
			name: 'audience',
			title: 'Audience',
			type: 'string',
			description: 'Who this word is for — e.g. "Worship Leaders". Used for labels and grouping.',
			validation: (Rule: any) => Rule.required(),
		},
		{
			name: 'slug',
			title: 'Slug',
			type: 'slug',
			options: { source: 'title', maxLength: 96 },
			validation: (Rule: any) => Rule.required(),
		},
		{
			name: 'excerpt',
			title: 'Excerpt',
			type: 'string',
			validation: (Rule: any) => Rule.max(220),
			description: 'Share blurb — one line of the word itself works best (max 220 characters)',
		},
		{
			name: 'heroImage',
			title: 'Hero Image (optional)',
			type: 'image',
			options: { hotspot: true },
			fields: [{ name: 'alt', title: 'Alt Text', type: 'string' }],
		},
		{
			name: 'receivedBy',
			title: 'Received by',
			type: 'string',
			initialValue: 'Kevin White',
			description: 'The human steward byline — "Received and written by …". Never leave empty.',
			validation: (Rule: any) => Rule.required(),
		},
		{
			name: 'publishDate',
			title: 'Publish Date',
			type: 'date',
			validation: (Rule: any) => Rule.required(),
		},
		{
			name: 'body',
			title: 'The Word (first-person, Father voice)',
			type: 'array',
			description:
				'The message itself, kept whole — no headings, no SEO scaffolding inside the word.',
			of: [
				{
					type: 'block',
					styles: [{ title: 'Normal', value: 'normal' }],
					marks: {
						decorators: [
							{ title: 'Bold', value: 'strong' },
							{ title: 'Italic', value: 'em' },
						],
						annotations: [
							{
								name: 'link',
								title: 'Link',
								type: 'object',
								fields: [{ name: 'href', title: 'URL', type: 'url' }],
							},
						],
					},
				},
			],
			validation: (Rule: any) => Rule.required(),
		},
		{
			name: 'supportingScriptures',
			title: 'Supporting Scriptures (FHB)',
			type: 'array',
			description:
				'Three FHB passages that anchor the word — rendered at the foot of the post, each linking into /read.',
			of: [
				{
					type: 'object',
					name: 'supportingScripture',
					fields: [
						{
							name: 'reference',
							title: 'Reference',
							type: 'string',
							description: 'e.g. "Psalm 100:4"',
							validation: (Rule: any) => Rule.required(),
						},
						{
							name: 'text',
							title: 'FHB Text',
							type: 'text',
							rows: 4,
							description: "The passage text from the Father's Heart Bible™ reading edition.",
							validation: (Rule: any) => Rule.required(),
						},
						{
							name: 'readUrl',
							title: 'Reader link',
							type: 'string',
							description:
								'Path into our reader, e.g. /read/psalms/100 — never an external Bible site.',
							validation: (Rule: any) => Rule.required(),
						},
					],
					preview: {
						select: { title: 'reference', subtitle: 'text' },
					},
				},
			],
			validation: (Rule: any) => Rule.max(5),
		},
		{
			name: 'trainingTitle',
			title: 'Training Section Title (optional)',
			type: 'string',
			description: 'e.g. "How to test a prophetic word" — the searchable teaching section.',
		},
		{
			name: 'training',
			title: 'Training on Prophecy (optional)',
			type: 'array',
			description:
				'Teaching that equips readers in the prophetic (Joel 2, testing a word, "now speak"). This section carries the search/AEO value so the word above stays pure.',
			of: [
				{
					type: 'block',
					styles: [
						{ title: 'Normal', value: 'normal' },
						{ title: 'Heading 2', value: 'h2' },
						{ title: 'Heading 3', value: 'h3' },
					],
					marks: {
						decorators: [
							{ title: 'Bold', value: 'strong' },
							{ title: 'Italic', value: 'em' },
						],
						annotations: [
							{
								name: 'link',
								title: 'Link',
								type: 'object',
								fields: [{ name: 'href', title: 'URL', type: 'url' }],
							},
						],
					},
				},
			],
		},
		{
			name: 'seoTitle',
			title: 'SEO Title',
			type: 'string',
			description:
				'Query-shaped is fine here (e.g. "Prophetic Word for Worship Leaders …"). Optimal 50-60 chars.',
		},
		{
			name: 'seoDescription',
			title: 'SEO Description',
			type: 'string',
			description: 'For search engine results (optimal length: 150-160 characters)',
		},
		{
			name: 'ogDescription',
			title: 'Social / OG Description',
			type: 'string',
			description: 'Share blurb for social cards. Falls back to the excerpt when empty.',
		},
	],
	preview: {
		select: { title: 'title', subtitle: 'audience', date: 'publishDate' },
		prepare(selection: any) {
			return {
				title: selection.title,
				subtitle: `For ${selection.subtitle || '—'} · ${selection.date || 'TBD'}`,
			};
		},
	},
};
