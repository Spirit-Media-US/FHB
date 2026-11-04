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
	// Original data (2gm, 2026-10-31): per-book words of the Father, Son and Spirit from the locked Divine Voice Color tags.
	// 2hi (2026-11-01): + the read-the-Bible-in-a-year plan. 2hh (2026-11-01): + the by-the-numbers page. 2he (2026-11-01): + the names page; each page's CSV downloads are listed too (DATA_FILES below).
	{ label: 'Original data', pages: ['who-speaks-in-scripture', 'names-of-god-the-father', 'bible-by-the-numbers', 'read-the-bible-in-a-year'] },
];

// CSV downloads of the Original data pages, listed in the answer-page block with a line DERIVED from the file.
export const DATA_FILES = [
	'public/data/who-speaks-by-book.csv',
	'public/data/names-of-the-father-terms.csv',
	'public/data/names-of-the-father-by-book.csv',
	'public/data/bible-by-the-numbers-by-book.csv',
	'public/data/bible-by-the-numbers-by-chapter.csv',
	'public/data/bible-reading-plan.csv',
];

// Pages whose title/description live in a shared component's copy object, not in the page file (2he):
// slug -> [component file, which {title, description} pair in it (0-based)].
const COMPONENT_META = {
	'old-testament': ['src/components/TestamentPage.astro', 0],
	'new-testament': ['src/components/TestamentPage.astro', 1],
};

const humanize = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const clean = (s) => s.replace(/\s+/g, ' ').replace(/\\(['"`])/g, '$1').trim();

// Resolve one `${...}` interpolation from the page's own data JSON; null = cannot be resolved statically.
function makeResolver(src, root) {
	const scope = {};
	for (const m of src.matchAll(/^import (\w+) from '(\.\.\/data\/[^']+\.json)';/gm)) {
		try {
			scope[m[1]] = JSON.parse(fs.readFileSync(path.resolve(root, 'src/pages', m[2]), 'utf8'));
		} catch {
			/* unreadable data: its interpolations stay unresolved */
		}
	}
	for (const m of src.matchAll(/^const (\w+) = (\w+)((?:\.\w+)*);/gm)) {
		if (scope[m[2]] !== undefined) scope[m[1]] = m[3].split('.').filter(Boolean).reduce((o, k) => o?.[k], scope[m[2]]);
	}
	const ref = (e) => e.trim().split('.').reduce((o, k) => (o == null ? undefined : o[k]), scope);
	return (expr) => {
		const f = expr.match(/^N\((.+)\)$/);
		const v = ref(f ? f[1] : expr);
		if (typeof v === 'number') return f ? v.toLocaleString('en-US') : String(v);
		return typeof v === 'string' ? v : null;
	};
}

// Template literal -> text. An interpolation that cannot be resolved cuts the text at the last whole sentence before it.
function fromTemplate(tpl, resolve) {
	let out = '';
	let rest = tpl;
	for (;;) {
		const i = rest.indexOf('${');
		if (i === -1) return out + rest;
		const j = rest.indexOf('}', i);
		const val = resolve(rest.slice(i + 2, j));
		if (val === null) {
			const head = out + rest.slice(0, i);
			const k = Math.max(head.lastIndexOf('. '), head.lastIndexOf('! '), head.lastIndexOf('? '));
			return k === -1 ? '' : head.slice(0, k + 1);
		}
		out += rest.slice(0, i) + val;
		rest = rest.slice(j + 1);
	}
}

// First title/description found in the page source; falls back to the slug (never throws).
// Reads attribute props, `const TITLE = '...'`, AND the fitTitle(...) / fitDescription(...) wrappers pages use (2he: the old
// pattern saw only bare literals, so every page that wrapped its text in fitTitle()/fitDescription() fell back to the slug).
export function meta(file, root = process.cwd(), nth = 0, objectKeys = false) {
	const src = fs.readFileSync(file, 'utf8');
	const resolve = makeResolver(src, root);
	const pick = (name, upper, fit) => {
		const lit = "(?:'((?:[^'\\\\\\n]|\\\\.)*)'|\"((?:[^\"\\\\\\n]|\\\\.)*)\"|`([^`]+)`)";
		const re = new RegExp(
			`(?:^\\s*${name}=(?:\\{\`([^\`]+)\`\\}|"([^"]+)"|\\{'([^']+)'\\})|const ${upper}\\s*=\\s*(?:${fit}\\(\\s*)?${lit}|^\\s*${name}:\\s*${lit})`,
			'gm',
		);
		const ms = [...src.matchAll(re)];
		const m = ms[Math.min(nth, ms.length - 1)];
		if (m) {
			const v = m.slice(1).find(Boolean);
			return clean(/\$\{/.test(v) ? fromTemplate(v, resolve) : v);
		}
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
	return { title: pick('title', 'TITLE', 'fitTitle'), description: pick('description', 'DESCRIPTION', 'fitDescription') };
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
			const cm = COMPONENT_META[slug];
			const m = cm
				? meta(path.resolve(root, cm[0]), root, cm[1], true)
				: meta(path.join(pagesDir, `${rel}.astro`), root);
			return {
				url: `/${rel}/`,
				slug,
				title: (m.title || humanize(slug)).replace(/\s*\|\s*Father.s Heart Bible.*$/, ''),
				description: m.description,
			};
		});
		groups.push({ label: t.label, entries });
	}
	// CSV downloads: one line each, described from the file itself (row count + column names), never typed.
	const csvEntries = DATA_FILES.map((f) => {
		const lines = fs.readFileSync(path.resolve(root, f), 'utf8').trim().split('\n');
		const name = path.basename(f);
		return {
			url: `/${f.replace(/^public\//, '')}`,
			slug: name,
			title: `${humanize(name.replace(/\.csv$/, ''))} (CSV)`,
			description: `Free CSV download, ${lines.length - 1} rows. Columns: ${lines[0].split(',').join(', ')}.`,
		};
	});
	groups.push({ label: 'Original data downloads (CSV)', entries: csvEntries });
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
