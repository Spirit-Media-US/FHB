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
		status: 'scheduled',
	},
	{
		date: '2026-11-03',
		name: 'Nagamese',
		code: 'nag',
		status: 'scheduled',
	},
	{
		date: '2026-11-04',
		name: 'Sena',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-05',
		name: 'Gikuyu',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-06',
		name: 'Xhosa',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-07',
		name: 'Ao Naga',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-08',
		name: 'Chang Naga',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-09',
		name: 'Kinyarwanda',
		code: 'rw',
		status: 'scheduled',
	},
	{
		date: '2026-11-10',
		name: 'Azerbaijani (South)',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-11',
		name: 'Thai',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-12',
		name: 'Gujarati',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-13',
		name: 'Kirundi',
		code: 'rn',
		status: 'scheduled',
	},
	{
		date: '2026-11-14',
		name: 'Odia',
		code: null,
		status: 'scheduled',
	},
	{
		date: '2026-11-15',
		name: 'Pashto',
		code: null,
		status: 'scheduled',
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
		code: null,
		status: 'scheduled',
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
