// Answer-page index for public/llms.txt and public/llms-full.txt (unit 6ae, 2026-10-28).
// WHY: both files listed only section HUBS (/meaning/, /verses/ ...), so every answer page built
// after the hand-written text (forsake, folly, consecrate, sheol, thanksgiving, advent, ukraine,
// /old-testament, /books-of-the-bible ...) was invisible to AI engines that read llms.txt.
// The list is DERIVED from src/pages on every build (called by gen-sitemap-read.mjs); never
// hand-edit the GENERATED block, and add a page type by adding it to TYPES below.
import fs from 'node:fs';
import path from 'node:path';

export const BEGIN =
	'<!-- GENERATED:answer-pages (scripts/llms-answer-pages.mjs — edit the script, not this block) -->';
export const END = '<!-- /GENERATED:answer-pages -->';

// dir = a src/pages folder whose every page is listed; page = one top-level page.
export const TYPES = [
	{ label: 'Bible words and what they mean', dir: 'meaning' },
	{ label: 'Bible verses by topic and season', dir: 'verses' },
	{ label: 'The Bible country by country', dir: 'bible-in' },
	{ label: 'The Bible by audience and season', dir: 'bible-for' },
	{ label: 'Bible reading guides', dir: 'guides' },
	{ label: 'The books of the Bible', pages: ['old-testament', 'new-testament', 'books-of-the-bible'] },
	// Top-level campaign page (2s, 2026-10-28): a lone page, not a folder, so no dir type reached it.
	{ label: 'Bible months and campaigns', pages: ['global-bible-month'] },
];

const humanize = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const clean = (s) => s.replace(/\s+/g, ' ').replace(/\\(['"`])/g, '$1').trim();

// First title/description found in the page source; falls back to the slug (never throws).
function meta(file) {
	const src = fs.readFileSync(file, 'utf8');
	const pick = (name, upper) => {
		const re = new RegExp(
			`(?:^\\s*${name}=(?:\\{\`([^\`]+)\`\\}|"([^"]+)"|\\{'([^']+)'\\})|const ${upper}\\s*=\\s*(?:'([^']+)'|"([^"]+)"|\`([^\`]+)\`))`,
			'm',
		);
		const m = src.match(re);
		if (m) return clean(m.slice(1).find(Boolean));
		// JSON-string expression form, e.g. title={"2 Timothy 1:7 Meaning"} (verse-meaning pages, 2br).
		const j = src.match(new RegExp('^\\s*' + name + '=\\{("(?:[^"\\\\\\n]|\\\\.)*")\\}', 'm'));
		if (j) {
			try {
				return clean(JSON.parse(j[1]));
			} catch {
				/* malformed: treated as missing, caught by the test */
			}
		}
		return '';
	};
	return { title: pick('title', 'TITLE'), description: pick('description', 'DESCRIPTION') };
}

// Returns [{label, entries:[{url, slug, title, description}]}]
export function collect(root = process.cwd()) {
	const pagesDir = path.resolve(root, 'src/pages');
	const groups = [];
	for (const t of TYPES) {
		const slugs = t.pages
			? t.pages
			: fs
					.readdirSync(path.join(pagesDir, t.dir))
					.filter((f) => f.endsWith('.astro') && f !== 'index.astro' && !f.startsWith('['))
					.map((f) => f.replace(/\.astro$/, ''))
					.sort();
		const entries = slugs.map((slug) => {
			const rel = t.dir ? `${t.dir}/${slug}` : slug;
			const m = meta(path.join(pagesDir, `${rel}.astro`));
			return {
				url: `/${rel}/`,
				slug,
				title: (m.title || humanize(slug)).replace(/\s*\|\s*Father.s Heart Bible.*$/, ''),
				description: m.description,
			};
		});
		groups.push({ label: t.label, entries });
	}
	return groups;
}

export function render(groups) {
	const out = [BEGIN, '## Answer pages (every page, generated from the site on each build)', ''];
	for (const g of groups) {
		out.push(`### ${g.label}`, '');
		for (const e of g.entries) out.push(`- ${e.url} — ${e.title}${e.description ? `. ${e.description}` : ''}`);
		out.push('');
	}
	out.push(END);
	return out.join('\n');
}

// Replace the block in `text`, or insert it before "## Contact" (llms.txt) or "## Publisher" (llms-full.txt) the first time.
export function apply(text, block) {
	const a = text.indexOf(BEGIN);
	const b = text.indexOf(END);
	if (a !== -1 && b > a) return text.slice(0, a) + block + text.slice(b + END.length);
	const c = ['\n## Contact', '\n## Publisher'].map((h) => text.indexOf(h)).find((i) => i !== -1);
	if (c === undefined) throw new Error('no "## Contact" / "## Publisher" anchor to insert the answer-pages block');
	return text.slice(0, c + 1) + block + '\n' + text.slice(c);
}

export function generate(root = process.cwd()) {
	const groups = collect(root);
	const block = render(groups);
	const res = {};
	for (const name of ['llms.txt', 'llms-full.txt']) {
		const f = path.resolve(root, 'public', name);
		const cur = fs.readFileSync(f, 'utf8');
		const next = apply(cur, block);
		if (next !== cur) fs.writeFileSync(f, next);
		res[name] = groups.reduce((n, g) => n + g.entries.length, 0);
	}
	return res;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log('llms-answer-pages', generate());
