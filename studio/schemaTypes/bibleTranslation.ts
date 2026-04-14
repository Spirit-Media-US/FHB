export default {
	name: 'bibleTranslation',
	title: 'Bible Translation',
	type: 'document',
	fields: [
		{
			name: 'book',
			title: 'Book',
			type: 'string',
			validation: (Rule: any) => Rule.required(),
		},
		{
			name: 'testament',
			title: 'Testament',
			type: 'string',
			options: {
				list: [
					{ title: 'Old Testament', value: 'OT' },
					{ title: 'New Testament', value: 'NT' },
				],
			},
			validation: (Rule: any) => Rule.required(),
		},
		{
			name: 'chapter',
			title: 'Chapter',
			type: 'number',
			validation: (Rule: any) => Rule.required().min(1),
		},
		{
			name: 'verse',
			title: 'Verse',
			type: 'number',
			validation: (Rule: any) => Rule.required().min(1),
		},
		{
			name: 'fhbText',
			title: 'FHB Translation',
			type: 'text',
			validation: (Rule: any) => Rule.required(),
		},
		{
			name: 'status',
			title: 'Status',
			type: 'string',
			options: {
				list: [
					{ title: 'Draft', value: 'draft' },
					{ title: 'Under Review', value: 'review' },
					{ title: 'Locked', value: 'locked' },
				],
			},
			initialValue: 'draft',
			validation: (Rule: any) => Rule.required(),
		},
		{
			name: 'version',
			title: 'Version',
			type: 'number',
			description: 'Revision number — increments each time the chapter is re-translated',
			initialValue: 1,
		},
		{
			name: 'rulesVersion',
			title: 'Rules Version',
			type: 'string',
			description: 'Which version of rules.json was used for this translation',
		},
		{
			name: 'decisionLog',
			title: 'Decision Log',
			type: 'array',
			description:
				'Translation decisions captured during pipeline run — raw material for study Bible notes',
			of: [
				{
					type: 'object',
					fields: [
						{ name: 'ruleId', title: 'Rule ID', type: 'string' },
						{ name: 'note', title: 'Note', type: 'text' },
						{ name: 'flags', title: 'Flags', type: 'array', of: [{ type: 'string' }] },
					],
				},
			],
		},
		{
			name: 'lockedAt',
			title: 'Locked At',
			type: 'datetime',
		},
		{
			name: 'lockedBy',
			title: 'Locked By',
			type: 'string',
		},
	],
	orderings: [
		{
			title: 'Book / Chapter / Verse',
			name: 'bookChapterVerse',
			by: [
				{ field: 'book', direction: 'asc' },
				{ field: 'chapter', direction: 'asc' },
				{ field: 'verse', direction: 'asc' },
			],
		},
	],
	preview: {
		select: {
			book: 'book',
			chapter: 'chapter',
			verse: 'verse',
			status: 'status',
		},
		prepare(sel: any) {
			const statusIcon = sel.status === 'locked' ? '🔒' : sel.status === 'review' ? '👁' : '✏️';
			return {
				title: `${sel.book} ${sel.chapter}:${sel.verse}`,
				subtitle: `${statusIcon} ${sel.status}`,
			};
		},
	},
};
