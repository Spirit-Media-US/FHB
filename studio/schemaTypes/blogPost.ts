export default {
	name: 'blogPost',
	title: 'Blog Posts',
	type: 'document',
	fields: [
		{
			name: 'title',
			title: 'Title',
			type: 'string',
			validation: (Rule: any) => Rule.required(),
		},
		{
			name: 'slug',
			title: 'Slug',
			type: 'slug',
			options: {
				source: 'title',
				maxLength: 96,
			},
			validation: (Rule: any) => Rule.required(),
		},
		{
			name: 'excerpt',
			title: 'Excerpt',
			type: 'string',
			validation: (Rule: any) => Rule.max(200),
			description: 'Brief summary for preview (max 200 characters)',
		},
		{
			name: 'heroImage',
			title: 'Hero Image',
			type: 'image',
			options: { hotspot: true },
			fields: [
				{
					name: 'alt',
					title: 'Alt Text',
					type: 'string',
				},
			],
		},
		{
			name: 'author',
			title: 'Author',
			type: 'string',
			initialValue: 'Kevin White',
		},
		{
			name: 'publishDate',
			title: 'Publish Date',
			type: 'date',
			validation: (Rule: any) => Rule.required(),
		},
		{
			name: 'dateModified',
			title: 'Date Modified',
			type: 'datetime',
			description:
				'Last meaningful content update — surfaces in BlogPosting JSON-LD as dateModified. Optional; falls back to publishDate when empty.',
		},
		{
			name: 'tags',
			title: 'Tags',
			type: 'array',
			of: [{ type: 'string' }],
			options: {
				list: [
					{ title: 'Identity', value: 'Identity' },
					{ title: 'Legacy', value: 'Legacy' },
					{ title: 'Scripture', value: 'Scripture' },
					{ title: 'Healing', value: 'Healing' },
					{ title: 'Translation', value: 'Translation' },
				],
			},
		},
		{
			name: 'body',
			title: 'Body',
			type: 'array',
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
								fields: [
									{
										name: 'href',
										title: 'URL',
										type: 'url',
									},
								],
							},
						],
					},
				},
				{
					type: 'image',
					title: 'Inline Image',
					options: { hotspot: true },
					fields: [
						{
							name: 'alt',
							title: 'Alt Text',
							type: 'string',
							description:
								'Required for accessibility + AEO milestone #16. Describe what the image shows and why it matters.',
						},
						{
							name: 'caption',
							title: 'Caption',
							type: 'string',
							description: 'Optional caption rendered below the image.',
						},
					],
				},
				{
					type: 'object',
					name: 'fhbChapter',
					title: 'FHB Chapter Embed',
					description:
						'Primary-source embed (Gold-Level milestone #18). Renders an FHB-translated chapter card via src/components/ChapterEmbed.astro.',
					fields: [
						{
							name: 'book',
							title: 'Book',
							type: 'string',
							validation: (Rule: any) => Rule.required(),
						},
						{
							name: 'chapter',
							title: 'Chapter',
							type: 'number',
							validation: (Rule: any) => Rule.required().integer().min(1),
						},
					],
					preview: {
						select: { book: 'book', chapter: 'chapter' },
						prepare(s: any) {
							return { title: `FHB ${s.book} ${s.chapter}` };
						},
					},
				},
				{
					type: 'object',
					name: 'pullQuote',
					title: 'Pull Quote',
					description:
						'A pulled sentence rendered in magazine-style: full-width centered on mobile, float-left on desktop. Use to break up long sections with a single powerful line.',
					fields: [
						{
							name: 'quote',
							title: 'Quote',
							type: 'text',
							rows: 3,
							validation: (Rule: any) => Rule.required().min(15).max(300),
						},
						{
							name: 'attribution',
							title: 'Attribution (optional)',
							type: 'string',
							description:
								'e.g., "James Jordan" or "Salt&Light tribute" — appears below the quote in small caps.',
						},
					],
					preview: {
						select: { quote: 'quote', attribution: 'attribution' },
						prepare(s: any) {
							const q = (s.quote || '').slice(0, 80);
							return {
								title: `“${q}${s.quote && s.quote.length > 80 ? '…' : ''}”`,
								subtitle: s.attribution || '',
							};
						},
					},
				},
			],
		},
		{
			name: 'faqs',
			title: 'FAQs',
			type: 'array',
			description:
				'Optional Q&A pairs surfaced as FAQPage JSON-LD on the post. Pulls each H2 question and its self-contained answer block — AI engines extract these as direct citations.',
			of: [
				{
					type: 'object',
					name: 'faqItem',
					title: 'FAQ Item',
					fields: [
						{
							name: 'question',
							title: 'Question',
							type: 'string',
							validation: (Rule: any) => Rule.required().min(8).max(180),
						},
						{
							name: 'answer',
							title: 'Answer',
							type: 'text',
							rows: 6,
							validation: (Rule: any) => Rule.required().min(40),
						},
					],
					preview: {
						select: { title: 'question', subtitle: 'answer' },
					},
				},
			],
		},
		{
			name: 'seoTitle',
			title: 'SEO Title',
			type: 'string',
			description: 'For search engine results (optimal length: 50-60 characters)',
		},
		{
			name: 'seoDescription',
			title: 'SEO Description',
			type: 'string',
			description: 'For search engine results (optimal length: 150-160 characters)',
		},
		{
			name: 'aeoApprovedBy',
			title: 'AEO Editorial Approval — Approved By',
			type: 'string',
			description:
				'Name of the editor who applied the §8 three-part filter (does not drift from what we teach, does not sensationalize, would have published without AEO in mind). Required for AEO gate per smp-aeo-readiness-standard.md row F2.',
		},
		{
			name: 'aeoApprovedAt',
			title: 'AEO Editorial Approval — Approved At',
			type: 'datetime',
			description:
				'When the editorial approval was recorded. Stale (>12 months) or missing fails the AEO audit. Bump on every substantive rewrite.',
		},
	],
	preview: {
		select: { title: 'title', subtitle: 'author', date: 'publishDate' },
		prepare(selection: any) {
			return {
				title: selection.title,
				subtitle: `By ${selection.subtitle || 'Unknown'} · ${selection.date || 'TBD'}`,
			};
		},
	},
};
