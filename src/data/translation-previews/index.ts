// Auto-registry of translation previews. Drop a <code>.json into this folder and
// it lights up on every /bible-in country page whose language list includes that
// language (matched by `language` + `aliases`). No per-page wiring needed — this
// is how "each language is shown in each country calling for it" is enforced.
const mods = import.meta.glob('./*.json', { eager: true });

export interface PreviewData {
	language: string;
	langName: string;
	langCode: string;
	tier?: number;
	register?: string;
	aliases?: string[];
	// biome-ignore lint/suspicious/noExplicitAny: chapter shape lives in TranslationPreview.astro
	chapters: any[];
}

// biome-ignore lint/suspicious/noExplicitAny: Vite glob module default
const ALL: PreviewData[] = Object.values(mods).map((m: any) => m.default ?? m);

const norm = (s: string) =>
	(s || '')
		.toLowerCase()
		.replace(/\(.*?\)/g, '')
		.replace(/[^a-z]/g, '');

// Return the previews whose language (or an alias) matches any of the supplied
// country language-list names. Sorted tier asc, then language name.
export function previewsForLanguages(names: string[]): PreviewData[] {
	// Exact normalized match (parentheticals already stripped by norm). Substring
	// matching is unsafe — e.g. "Dari" is a substring of "manDARIn".
	const wanted = new Set(names.map(norm).filter(Boolean));
	return ALL.filter((p) => {
		const keys = [p.language, ...(p.aliases || [])].map(norm).filter(Boolean);
		return keys.some((k) => wanted.has(k));
	}).sort((a, b) => (a.tier || 9) - (b.tier || 9) || a.language.localeCompare(b.language));
}
