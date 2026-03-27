export default {
	name: 'personProfile',
	title: 'Person Profiles',
	type: 'document',
	fields: [
		{
			name: 'name',
			title: 'Full Name',
			type: 'string',
			validation: (Rule: any) => Rule.required(),
		},
		{
			name: 'role',
			title: 'Role / Title',
			type: 'string',
			description: 'e.g. Lead Translator & Founder',
		},
		{
			name: 'bio',
			title: 'Short Bio',
			type: 'text',
			rows: 4,
			description: 'One paragraph summary used in preview contexts.',
		},
		{
			name: 'portrait',
			title: 'Portrait Photo',
			type: 'image',
			options: { hotspot: true },
			description: 'Upload portrait to Sanity.',
		},
		{
			name: 'portraitUrl',
			title: 'Portrait URL (External)',
			type: 'url',
			description: 'R2 URL for portrait — used if Sanity image not uploaded.',
		},
		{
			name: 'longStory',
			title: 'Full Story',
			type: 'array',
			of: [{ type: 'block' }],
			description: 'Full narrative for the About page. Renders as rich text.',
		},
		{
			name: 'order',
			title: 'Display Order',
			type: 'number',
		},
	],
	preview: {
		select: { title: 'name', subtitle: 'role', media: 'portrait' },
	},
};
