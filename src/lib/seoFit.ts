// W7 recipe (unit 6ay): <title> <= 60 chars and meta description <= 160 chars, applied at the
// template so no page can ship an over-length SERP snippet. Searched words stay first; only the
// brand tail / decoration is trimmed, step by step, and only until the limit is met. Wording is
// never rewritten: a title the ladder cannot fit is reported (aeo score) as a proposal instead.
// Same rules as the inline helpers in WordMeaning / CountryBible / GroupBible (5e96f8c, 022a657).
const TITLE_LADDER: Array<[RegExp, string]> = [
	[/ \(FHB\)/, ''],
	[/ \(with Audio\)/, ''],
	[/ \| FHB$/, ''],
	[/(Divine Voice™?) Color/, '$1'],
	[/ Single Column$/, ''],
	[/™/, ''],
	[/^The /, ''],
	[/ \| Father's Heart Bible( Blog)?$/, ''],
];

export const fitTitle = (t: string, max = 60): string => {
	let s = t;
	for (const [re, rep] of TITLE_LADDER) {
		if (s.length <= max) break;
		s = s.replace(re, rep);
	}
	return s;
};

export const fitDescription = (d: string, max = 160): string => {
	const s = d.replace("Father's Heart Bible™ (FHB)", "Father's Heart Bible™");
	if (s.length <= max) return s;
	const sentences = s.match(/[^.!?]+[.!?]+(\s|$)/g);
	while (sentences && sentences.length > 1 && sentences.join('').trim().length > max)
		sentences.pop();
	if (
		sentences &&
		sentences.join('').trim().length <= max &&
		sentences.join('').trim().length >= 110
	)
		return sentences.join('').trim();
	// No whole-sentence cut fits: cut at the last clause break that keeps >= 110 chars, else at a word,
	// never leaving a dangling connective or number, and mark the cut with an ellipsis.
	const head = s.slice(0, max - 1);
	const clause = Math.max(
		head.lastIndexOf(' — '),
		head.lastIndexOf('; '),
		head.lastIndexOf(': '),
		head.lastIndexOf(', '),
	);
	let cut = clause >= 110 ? head.slice(0, clause) : head.replace(/\s+\S*$/, '');
	cut = cut
		.replace(/(\s+(and|or|of|in|to|the|a|an|with|for|on|at|by|from|that|as|is|are|\d+))+$/i, '')
		.replace(/[,;:\s—-]+$/, '');
	return `${cut}…`;
};
