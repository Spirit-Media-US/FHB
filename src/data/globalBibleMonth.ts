// Global Bible Month 2026 — the 30-in-30 plan: one language each day of November.
// GENERATED from claude-config/jobs/state/dbl-nov-30in30.json (public_day, name, code). Names are
// the state file's, exactly. `code` is null where the state file's code is unconfirmed ('?') —
// such a row is never linked and its code is never shown. `status` is "scheduled" until the
// language is readable in the reader: flip a row to "readable" ONLY when its /read/<code>/ hub returns 200
// (and it is on the Digital Bible Library). A row links to /read/<code>/ only when status is readable
// AND a confirmed code exists. Never present a language as live before it is.
export type GbmStatus = 'scheduled' | 'readable';
export interface GbmRow {
	date: string;
	name: string;
	code: string | null;
	status: GbmStatus;
}
export const GLOBAL_BIBLE_MONTH: GbmRow[] = [
	{
		date: '2026-11-01',
		name: 'Hausa',
		code: 'ha',
		status: 'readable',
	},
	{
		date: '2026-11-02',
		name: 'Chichewa',
		code: 'ny',
		status: 'readable',
	},
	{
		date: '2026-11-03',
		name: 'Nagamese',
		code: 'nag',
		status: 'readable',
	},
	{
		date: '2026-11-04',
		name: 'Sena',
		code: 'seh',
		status: 'readable',
	},
	{
		date: '2026-11-05',
		name: 'Gikuyu',
		code: 'ki',
		status: 'readable',
	},
	{
		date: '2026-11-06',
		name: 'Xhosa',
		code: 'xh',
		status: 'readable',
	},
	{
		date: '2026-11-07',
		name: 'Ao Naga',
		code: 'njo',
		status: 'readable',
	},
	{
		date: '2026-11-07',
		name: 'Chang Naga',
		code: 'nbc',
		status: 'readable',
	},
	{
		date: '2026-11-09',
		name: 'Kinyarwanda',
		code: 'rw',
		status: 'readable',
	},
	{
		date: '2026-11-10',
		name: 'Azerbaijani (South)',
		code: 'azb',
		status: 'readable',
	},
	{
		date: '2026-11-07',
		name: 'Thai',
		code: 'th',
		status: 'readable',
	},
	{
		date: '2026-11-07',
		name: 'Gujarati',
		code: 'gu',
		status: 'readable',
	},
	{
		date: '2026-11-07',
		name: 'Kirundi',
		code: 'rn',
		status: 'readable',
	},
	{
		date: '2026-11-14',
		name: 'Odia',
		code: 'or',
		status: 'readable',
	},
	{
		date: '2026-11-15',
		name: 'Pashto',
		code: 'ps',
		status: 'readable',
	},
	{
		date: '2026-11-16',
		name: 'Sindhi',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-17',
		name: 'Malagasy',
		code: 'mg',
		status: 'scheduled',
	},
	{
		date: '2026-11-18',
		name: 'Tigrinya',
		code: 'ti',
		status: 'readable',
	},
	{
		date: '2026-11-19',
		name: 'Kituba',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-20',
		name: 'Yaka',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-21',
		name: 'Ilocano',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-22',
		name: 'Kipsigis',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-23',
		name: 'Inpui Naga',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-24',
		name: 'Chokri Naga',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-25',
		name: 'Hiligaynon',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-26',
		name: 'Lingala',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-27',
		name: 'Akan (Twi)',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-28',
		name: 'Somali',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-29',
		name: 'Oromo',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-30',
		name: 'Kurdish (Kurmanji)',
		code: null,
		status: 'scheduled',
	},
] as GbmRow[];
