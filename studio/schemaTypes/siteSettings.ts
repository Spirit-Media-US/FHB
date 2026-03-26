export default {
	name: 'siteSettings',
	title: 'Site Settings',
	type: 'document',
	__experimental_actions: ['update', 'publish'],
	groups: [
		{ name: 'identity', title: 'Identity & Branding' },
		{ name: 'seo', title: 'SEO Defaults' },
		{ name: 'media', title: 'Media & Assets' },
		{ name: 'contact', title: 'Contact & Social' },
		{ name: 'navigation', title: 'Navigation & Footer' },
		{ name: 'integrations', title: 'Integrations' },
	],
	fields: [
		// ── Identity ──────────────────────────────────────────────────────
		{
			name: 'siteName',
			title: 'Site Name',
			type: 'string',
			group: 'identity',
		},
		{
			name: 'tagline',
			title: 'Tagline',
			type: 'string',
			group: 'identity',
		},
		{
			name: 'homeTagline',
			title: 'Home Page Tagline',
			type: 'text',
			group: 'identity',
		},
		{
			name: 'translatorName',
			title: 'Lead Translator Name',
			type: 'string',
			group: 'identity',
		},
		{
			name: 'translatorBio',
			title: 'Translator Bio / Why This Exists',
			type: 'array',
			of: [{ type: 'block' }],
			group: 'identity',
		},
		{
			name: 'publisherName',
			title: 'Publisher Name',
			type: 'string',
			group: 'identity',
		},
		{
			name: 'copyright',
			title: 'Copyright Line',
			type: 'string',
			description: "e.g. Father's Heart Bible LLC. All rights reserved.",
			group: 'identity',
		},
		{
			name: 'logo',
			title: 'Site Logo',
			type: 'image',
			options: { hotspot: true },
			group: 'identity',
		},

		// ── SEO Defaults ─────────────────────────────────────────────────
		{
			name: 'seoTitle',
			title: 'Default SEO Title',
			type: 'string',
			description: 'Used when a page has no specific SEO title set.',
			group: 'seo',
		},
		{
			name: 'seoDescription',
			title: 'Default SEO Description',
			type: 'text',
			rows: 3,
			description: 'Used when a page has no specific meta description set.',
			group: 'seo',
		},
		{
			name: 'ogImage',
			title: 'Default Social Share Image',
			type: 'image',
			options: { hotspot: true },
			description: 'Default Open Graph image used across all pages.',
			group: 'seo',
		},

		// ── Media & Assets ────────────────────────────────────────────────
		{
			name: 'heroImage',
			title: 'Hero Background Image',
			type: 'image',
			options: { hotspot: true },
			description: 'Fallback background if no video is set.',
			group: 'media',
		},
		{
			name: 'heroVideoUrl',
			title: 'Hero Video URL',
			type: 'url',
			description: 'R2 URL for the homepage hero background video.',
			group: 'media',
		},
		{
			name: 'heroPosterUrl',
			title: 'Hero Video Poster URL',
			type: 'url',
			description: 'Poster image shown before the hero video loads.',
			group: 'media',
		},
		{
			name: 'bibleCoverImage',
			title: 'Bible Cover (Sanity Image)',
			type: 'image',
			options: { hotspot: true },
			description: 'Upload book cover here to serve via Sanity CDN.',
			group: 'media',
		},
		{
			name: 'bookCoverUrl',
			title: 'Book Cover URL (External)',
			type: 'url',
			description: 'R2 URL for the book cover — used if Sanity image not uploaded.',
			group: 'media',
		},
		{
			name: 'kevinPortraitUrl',
			title: "Kevin's Portrait URL",
			type: 'url',
			description: 'R2 URL for portrait of Kevin White (About page).',
			group: 'media',
		},
		{
			name: 'peoplePhoto1Url',
			title: 'Community Photo 1',
			type: 'url',
			description: 'R2 URL for a community/people lifestyle photo.',
			group: 'media',
		},
		{
			name: 'peoplePhoto2Url',
			title: 'Community Photo 2',
			type: 'url',
			group: 'media',
		},
		{
			name: 'peoplePhoto3Url',
			title: 'Community Photo 3',
			type: 'url',
			group: 'media',
		},
		{
			name: 'peoplePhoto4Url',
			title: 'Community Photo 4',
			type: 'url',
			group: 'media',
		},

		// ── Contact & Social ──────────────────────────────────────────────
		{
			name: 'email',
			title: 'Contact Email',
			type: 'string',
			group: 'contact',
		},
		{
			name: 'phone',
			title: 'Contact Phone',
			type: 'string',
			group: 'contact',
		},
		{
			name: 'bookingUrl',
			title: 'Booking / Events URL',
			type: 'url',
			group: 'contact',
		},
		{
			name: 'facebook',
			title: 'Facebook URL',
			type: 'url',
			group: 'contact',
		},
		{
			name: 'instagram',
			title: 'Instagram URL',
			type: 'url',
			group: 'contact',
		},
		{
			name: 'youtube',
			title: 'YouTube URL',
			type: 'url',
			group: 'contact',
		},

		// ── Navigation & Footer ───────────────────────────────────────────
		{
			name: 'navLinks',
			title: 'Navigation Links',
			type: 'array',
			group: 'navigation',
			description: 'Primary nav. Leave empty to use hardcoded defaults.',
			of: [
				{
					type: 'object',
					fields: [
						{
							name: 'label',
							title: 'Label',
							type: 'string',
							validation: (Rule: any) => Rule.required(),
						},
						{
							name: 'href',
							title: 'URL',
							type: 'string',
							validation: (Rule: any) => Rule.required(),
						},
						{
							name: 'openInNewTab',
							title: 'Open in new tab?',
							type: 'boolean',
							initialValue: false,
						},
					],
					preview: { select: { title: 'label', subtitle: 'href' } },
				},
			],
		},
		{
			name: 'footerNavLinks',
			title: 'Footer Navigation Links',
			type: 'array',
			group: 'navigation',
			description: 'All footer nav links. Leave empty to use hardcoded defaults.',
			of: [
				{
					type: 'object',
					fields: [
						{
							name: 'label',
							title: 'Label',
							type: 'string',
							validation: (Rule: any) => Rule.required(),
						},
						{
							name: 'href',
							title: 'URL',
							type: 'string',
							validation: (Rule: any) => Rule.required(),
						},
						{
							name: 'openInNewTab',
							title: 'Open in new tab?',
							type: 'boolean',
							initialValue: false,
						},
					],
					preview: { select: { title: 'label', subtitle: 'href' } },
				},
			],
		},
		{
			name: 'footerQuote',
			title: 'Footer Scripture Quote',
			type: 'text',
			group: 'navigation',
		},

		// ── Integrations ──────────────────────────────────────────────────
		{
			name: 'communityUrl',
			title: 'Community URL (Mighty Networks)',
			type: 'url',
			description: 'Mighty Networks community link — used for all "Join the Movement" CTAs.',
			group: 'integrations',
		},
		{
			name: 'donateUrl',
			title: 'Donate / Give URL',
			type: 'url',
			description: 'Giving/donation page link — used for all "Partner / Donate Now" CTAs.',
			group: 'integrations',
		},
		{
			name: 'partnerPageUrl',
			title: 'Partner Page URL (legacy)',
			type: 'url',
			description: 'Legacy — use Donate URL instead.',
			group: 'integrations',
		},
		{
			name: 'ghlDownloadFormId',
			title: 'GHL Download Form ID',
			type: 'string',
			description: 'GoHighLevel form embed ID for the free book download form.',
			group: 'integrations',
		},
	],
};
