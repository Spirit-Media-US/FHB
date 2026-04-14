export default {
	name: 'downloadContent',
	title: 'Download Page Content',
	type: 'document',
	fields: [
		{
			name: 'benefits',
			title: 'Benefits (What Readers Will Experience)',
			type: 'array',
			of: [
				{
					type: 'object',
					fields: [
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
					preview: { select: { title: 'heading' } },
				},
			],
		},
		{
			name: 'nextSteps',
			title: 'Next Steps (After You Download)',
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
			return { title: 'Download Page Content' };
		},
	},
};
