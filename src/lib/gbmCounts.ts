// Global Bible Month counts, COMPUTED from the schedule so no typed "50 of 80" goes stale.
//
// available-now = GBM_BASE_LANGUAGES (the 50 languages already public on the Digital Bible Library
//   before November, English included) + the number of schedule rows that are BOTH
//   status === 'readable' AND whose date has arrived (date <= today, UTC).
// Why both: a row flipped to 'readable' early (Hausa is readable now, DBL-private until Nov 1) does
// NOT count toward the public tally until its date, so the page keeps saying "50" until Nov 1,
// exactly as Kevin's wording does today. Date-only compare on ISO strings (YYYY-MM-DD).
// remaining = GBM_TOTAL_LANGUAGES - available. total = 80 (constant).
// Structural type so this file does not depend on the generated data file.
export const GBM_BASE_LANGUAGES = 50;
export const GBM_TOTAL_LANGUAGES = 80;

export interface GbmCountRow {
	date: string;
	status: string;
}

export function gbmCounts(
	rows: GbmCountRow[],
	today: string = new Date().toISOString().slice(0, 10),
) {
	const arrived = rows.filter((r) => r.status === 'readable' && r.date <= today).length;
	const available = GBM_BASE_LANGUAGES + arrived;
	const total = GBM_TOTAL_LANGUAGES;
	const remaining = total - available;
	if (available + remaining !== total || remaining < 0) {
		throw new Error(
			`gbmCounts invariant broken: available=${available} remaining=${remaining} total=${total}`,
		);
	}
	return { available, remaining, total };
}
