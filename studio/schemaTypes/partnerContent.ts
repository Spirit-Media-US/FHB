export default {
	name: 'partnerContent',
	title: 'Partner Page Content',
	type: 'document',
	fields: [
		{
			name: 'whyMatters',
			title: 'Why It Matters (reasons list)',
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
			name: 'scope',
			title: 'Scope of Work (cards)',
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
			name: 'whyDifferent',
			title: 'Why This Project Is Different (bullet list)',
			type: 'array',
			of: [{ type: 'string' }],
		},
		{
			name: 'impactStats',
			title: 'Tangible Impact / Giving Tiers',
			type: 'array',
			of: [
				{
					type: 'object',
					fields: [
						{
							name: 'amount',
							title: 'Dollar Amount (e.g. $33)',
							type: 'string',
							validation: (Rule: any) => Rule.required(),
						},
						{
							name: 'impact',
							title: 'Impact Description',
							type: 'text',
							validation: (Rule: any) => Rule.required(),
						},
					],
					preview: { select: { title: 'amount', subtitle: 'impact' } },
				},
			],
		},
	],
	preview: {
		prepare() {
			return { title: 'Partner Page Content' };
		},
	},
};
