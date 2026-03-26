export default {
	name: 'scriptureComparison',
	title: 'Scripture Comparisons',
	type: 'document',
	groups: [
		{ name: 'content', title: 'Content' },
		{ name: 'display', title: 'Display' },
	],
	fields: [
		{
			name: 'reference',
			title: 'Scripture Reference',
			type: 'string',
			description: 'e.g. John 3:16',
			validation: (Rule: any) => Rule.required(),
			group: 'content',
		},
		{
			name: 'category',
			title: 'Category',
			type: 'string',
			description: 'Groups comparisons together on the Samples page.',
			options: {
				list: [
					{ title: 'Featured (John 3:16 spotlight)', value: 'featured' },
					{ title: 'Joel 2', value: 'joel' },
					{ title: 'Heart Language', value: 'heart-language' },
					{ title: 'Identity & Sonship', value: 'identity' },
					{ title: 'Other', value: 'other' },
				],
			},
			group: 'display',
		},
		{
			name: 'traditional',
			title: 'Traditional Translation',
			type: 'text',
			description: 'The widely-used translation text (e.g. NIV, ESV).',
			validation: (Rule: any) => Rule.required(),
			group: 'content',
		},
		{
			name: 'translationLabel',
			title: 'Traditional Translation Label',
			type: 'string',
			description: 'e.g. NIV, ESV, KJV',
			initialValue: 'NIV',
			group: 'content',
		},
		{
			name: 'fhb',
			title: "Father's Heart Bible Translation",
			type: 'text',
			description: 'The FHB rendering of this passage.',
			validation: (Rule: any) => Rule.required(),
			group: 'content',
		},
		{
			name: 'note',
			title: 'Explanatory Note',
			type: 'text',
			description: 'Brief note explaining the translation choice.',
			group: 'content',
		},
		{
			name: 'featured',
			title: 'Featured on Homepage',
			type: 'boolean',
			initialValue: false,
			description: 'Show this comparison in the homepage preview section.',
			group: 'display',
		},
		{
			name: 'order',
			title: 'Display Order',
			type: 'number',
			description: 'Lower numbers appear first within each category.',
			group: 'display',
		},
	],
	preview: {
		select: { title: 'reference', subtitle: 'category' },
		prepare({ title, subtitle }: { title: string; subtitle: string }) {
			const labels: Record<string, string> = {
				featured: 'Featured',
				joel: 'Joel 2',
				'heart-language': 'Heart Language',
				identity: 'Identity',
				other: 'Other',
			};
			return { title, subtitle: labels[subtitle] || subtitle };
		},
	},
};
