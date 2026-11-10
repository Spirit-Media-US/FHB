import { counts, dateModified, JSON_URL, PAGE_URL, rows } from '../../lib/translation-progress';

export const GET = () =>
	new Response(
		JSON.stringify(
			{
				name: "Father's Heart Bible™ language editions",
				publisher: 'Spirit Media Publishing',
				translator: 'Spirit Media Publishing',
				editor: 'Kevin White',
				page: PAGE_URL,
				data_url: JSON_URL,
				date_modified: dateModified,
				counts: {
					roster_languages: counts.roster,
					read_online: counts.readOnline,
					print_editions: counts.printEditions,
					in_preparation: counts.inPreparation,
				},
				languages: rows,
			},
			null,
			2,
		) + '\n',
		{ headers: { 'Content-Type': 'application/json; charset=utf-8' } },
	);
