export default {
	name: 'page',
	title: 'Pages',
	type: 'document',
	groups: [
		{ name: 'seo', title: 'SEO' },
		{ name: 'hero', title: 'Hero' },
		{ name: 'content', title: 'Content' },
	],
	fields: [
		{
			name: 'slug',
			title: 'Page Route',
			type: 'string',
			description: 'The route key for this page.',
			validation: (Rule: any) => Rule.required(),
			options: {
				list: [
					{ title: 'Homepage (/)', value: 'home' },
					{
						title: "The Father's Heart Bible (/the-fathers-heart-bible)",
						value: 'the-fathers-heart-bible',
					},
					{ title: 'Samples (/samples)', value: 'samples' },
					{ title: 'Download (/download)', value: 'download' },
					{ title: 'Join the Movement (/join)', value: 'join' },
					{ title: 'Partner With Us (/partner)', value: 'partner' },
					{ title: 'About (/about)', value: 'about' },
					{ title: 'Contact (/contact)', value: 'contact' },
					{ title: 'Privacy Policy (/privacy)', value: 'privacy' },
					{ title: 'Terms (/terms)', value: 'terms' },
				],
			},
		},
		{
			name: 'title',
			title: 'Internal Title',
			type: 'string',
			description: 'Used to identify this page in Sanity Studio. Not displayed on site.',
		},

		// ── SEO ───────────────────────────────────────────────────────────
		{
			name: 'seoTitle',
			title: 'SEO Title',
			type: 'string',
			description: 'Browser tab title and search engine title.',
			group: 'seo',
		},
		{
			name: 'seoDescription',
			title: 'SEO Description',
			type: 'text',
			rows: 3,
			description: 'Meta description for search engines (150–160 characters recommended).',
			group: 'seo',
		},
		{
			name: 'ogImage',
			title: 'Social Share Image',
			type: 'image',
			options: { hotspot: true },
			description: 'Open Graph image for social sharing. Overrides site default.',
			group: 'seo',
		},
		{
			name: 'noindex',
			title: 'Hide from search engines',
			type: 'boolean',
			initialValue: false,
			description: 'Enable to add noindex to this page (e.g. for draft or private pages).',
			group: 'seo',
		},

		// ── Hero ──────────────────────────────────────────────────────────
		{
			name: 'heroEyebrow',
			title: 'Hero Eyebrow',
			type: 'string',
			description: 'Small label above the main heading (optional).',
			group: 'hero',
		},
		{
			name: 'heroHeading',
			title: 'Hero Heading',
			type: 'string',
			description: 'Main headline.',
			group: 'hero',
		},
		{
			name: 'heroSubheading',
			title: 'Hero Subheading',
			type: 'text',
			rows: 3,
			description: 'Supporting copy below the main heading.',
			group: 'hero',
		},
		{
			name: 'heroPrimaryCtaLabel',
			title: 'Primary CTA Label',
			type: 'string',
			description: 'Button text for the primary call to action.',
			group: 'hero',
		},
		{
			name: 'heroPrimaryCtaHref',
			title: 'Primary CTA URL',
			type: 'string',
			description: 'Link for the primary CTA button.',
			group: 'hero',
		},
		{
			name: 'heroSecondaryCtaLabel',
			title: 'Secondary CTA Label',
			type: 'string',
			description: 'Button text for the secondary call to action (optional).',
			group: 'hero',
		},
		{
			name: 'heroSecondaryCtaHref',
			title: 'Secondary CTA URL',
			type: 'string',
			description: 'Link for the secondary CTA button (optional).',
			group: 'hero',
		},
		{
			name: 'heroImage',
			title: 'Hero Image',
			type: 'image',
			options: { hotspot: true },
			description: 'Background or featured image for the hero section.',
			group: 'hero',
		},

		// ── Content ───────────────────────────────────────────────────────
		{
			name: 'body',
			title: 'Body Content',
			type: 'array',
			of: [{ type: 'block' }],
			description: 'General long-form page content (optional). Primarily used for SEO context.',
			group: 'content',
		},
	],
	preview: {
		select: { title: 'title', subtitle: 'slug' },
		prepare({ title, subtitle }: { title: string; subtitle: string }) {
			return { title: title || subtitle, subtitle: `/${subtitle}` };
		},
	},
};
