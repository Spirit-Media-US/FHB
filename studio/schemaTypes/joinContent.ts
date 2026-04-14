export default {
	name: 'joinContent',
	title: 'Join Page Content',
	type: 'document',
	fields: [
		{
			name: 'communityAreas',
			title: 'Community Areas (Inside the Movement)',
			type: 'array',
			of: [
				{
					type: 'object',
					fields: [
						{
							name: 'title',
							title: 'Title',
							type: 'string',
							validation: (Rule: any) => Rule.required(),
						},
						{
							name: 'body',
							title: 'Body',
							type: 'text',
							validation: (Rule: any) => Rule.required(),
						},
					],
					preview: { select: { title: 'title' } },
				},
			],
		},
		{
			name: 'audience',
			title: 'Audience Statements (Who This Is For)',
			type: 'array',
			of: [{ type: 'string' }],
		},
		{
			name: 'howToBegin',
			title: 'How To Begin (3 steps)',
			type: 'array',
			of: [
				{
					type: 'object',
					fields: [
						{
							name: 'step',
							title: 'Step Number',
							type: 'string',
							validation: (Rule: any) => Rule.required(),
						},
						{
							name: 'heading',
							title: 'Heading',
							type: 'string',
							validation: (Rule: any) => Rule.required(),
						},
						{
							name: 'body',
							title: 'Body',
							type: 'text',
							validation: (Rule: any) => Rule.required(),
						},
					],
					preview: { select: { title: 'heading', subtitle: 'step' } },
				},
			],
		},
	],
	preview: {
		prepare() {
			return { title: 'Join Page Content' };
		},
	},
};
