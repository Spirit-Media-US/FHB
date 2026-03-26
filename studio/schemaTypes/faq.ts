export default {
	name: 'faq',
	title: 'FAQs',
	type: 'document',
	fields: [
		{
			name: 'question',
			title: 'Question',
			type: 'string',
			validation: (Rule: any) => Rule.required(),
		},
		{
			name: 'answer',
			title: 'Answer',
			type: 'array',
			of: [{ type: 'block' }],
			validation: (Rule: any) => Rule.required(),
		},
		{
			name: 'category',
			title: 'Category',
			type: 'string',
			options: {
				list: [
					{ title: 'About the Translation', value: 'translation' },
					{ title: 'Theology & Faith', value: 'theology' },
					{ title: 'How to Use', value: 'usage' },
					{ title: 'Partnership & Support', value: 'partnership' },
					{ title: 'General', value: 'general' },
				],
			},
		},
		{
			name: 'order',
			title: 'Display Order',
			type: 'number',
			description: 'Lower numbers appear first.',
		},
	],
	preview: {
		select: { title: 'question', subtitle: 'category' },
	},
};
