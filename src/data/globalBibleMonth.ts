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
		date: 'undefined',
		name: 'Hausa',
		code: 'ha',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Chichewa',
		code: 'ny',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Nagamese',
		code: 'nag',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Sena',
		code: 'seh',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Gikuyu',
		code: 'ki',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Xhosa',
		code: 'xh',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Ao Naga',
		code: 'njo',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Chang Naga',
		code: 'nbc',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Kinyarwanda',
		code: 'rw',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Azerbaijani (South)',
		code: 'azb',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Thai',
		code: 'th',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Gujarati',
		code: 'gu',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Kirundi',
		code: 'rn',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Odia',
		code: 'or',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Pashto',
		code: 'ps',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Sindhi',
		code: 'sd',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Malagasy',
		code: 'mg',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Tigrinya',
		code: 'ti',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Kituba',
		code: null,
		status: 'scheduled',
	},
	{
		date: 'undefined',
		name: 'Yaka',
		code: null,
		status: 'scheduled',
	},
	{
		date: 'undefined',
		name: 'Ilocano',
		code: 'ilo',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Kipsigis',
		code: null,
		status: 'scheduled',
	},
	{
		date: 'undefined',
		name: 'Inpui Naga',
		code: null,
		status: 'scheduled',
	},
	{
		date: 'undefined',
		name: 'Chokri Naga',
		code: null,
		status: 'scheduled',
	},
	{
		date: 'undefined',
		name: 'Hiligaynon',
		code: 'hil',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Lingala',
		code: 'ln',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Akan (Twi)',
		code: 'tw',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Somali',
		code: 'so',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Oromo',
		code: 'om',
		status: 'readable',
	},
	{
		date: 'undefined',
		name: 'Kurdish (Kurmanji)',
		code: null,
		status: 'scheduled',
	},
] as GbmRow[];
