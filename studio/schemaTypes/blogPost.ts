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
			initialValue: 'Add Author Name Here',
		},
		{
			name: 'publishDate',
			title: 'Publish Date',
			type: 'date',
			validation: (Rule: any) => Rule.required(),
		},
		{
			name: 'tags',
			title: 'Tags',
			type: 'array',
			of: [{ type: 'string' }],
			options: {
				list: [
					{ title: 'Category 1', value: 'Category 1' },
					{ title: 'Category 2', value: 'Category 2' },
					{ title: 'Category 3', value: 'Category 3' },
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
