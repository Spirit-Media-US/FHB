export default {
	name: 'biblePageContent',
	title: "Father's Heart Bible Page Content",
	type: 'document',
	fields: [
		{
			name: 'distinctives',
			title: 'Distinctives (What Makes It Different)',
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
			name: 'notItems',
			title: 'What FHB Is Not',
			type: 'array',
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
							name: 'body',
							title: 'Body',
							type: 'text',
							validation: (Rule: any) => Rule.required(),
						},
					],
					preview: { select: { title: 'label' } },
				},
			],
		},
		{
			name: 'milestones',
			title: 'Milestones (Road Ahead)',
			type: 'array',
			of: [
				{
					type: 'object',
					fields: [
						{
							name: 'milestone',
							title: 'Milestone',
							type: 'string',
							validation: (Rule: any) => Rule.required(),
						},
						{
							name: 'detail',
							title: 'Detail',
							type: 'text',
							validation: (Rule: any) => Rule.required(),
						},
					],
					preview: { select: { title: 'milestone' } },
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
			name: 'shifts',
			title: 'Paradigm Shifts (The Big Shift section)',
			type: 'array',
			of: [
				{
					type: 'object',
					fields: [
						{
							name: 'from',
							title: 'From',
							type: 'string',
							validation: (Rule: any) => Rule.required(),
						},
						{ name: 'to', title: 'To', type: 'string', validation: (Rule: any) => Rule.required() },
					],
					preview: { select: { title: 'from', subtitle: 'to' } },
				},
			],
		},
	],
	preview: {
		prepare() {
			return { title: "Father's Heart Bible Page Content" };
		},
	},
};
