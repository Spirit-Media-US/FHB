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
	{
		label: 'The books of the Bible',
		pages: ['old-testament', 'new-testament', 'books-of-the-bible'],
	},
	// Top-level campaign page (2s, 2026-10-28): a lone page, not a folder, so no dir type reached it.
	{ label: 'Bible months and campaigns', pages: ['global-bible-month'] },
	// Original data (2gm, 2026-10-31): per-book words of the Father, Son and Spirit from the locked Divine Voice Color tags.
	// 2hi (2026-11-01): + the read-the-Bible-in-a-year plan. 2hh (2026-11-01): + the by-the-numbers page. 2he (2026-11-01): + the names page; each page's CSV downloads are listed too (DATA_FILES below).
	// 2sq (2026-11-11): key pages that no type reached (sitemap-parity test found them missing). `overrides` fills a title or
	// description ONLY where the page file cannot be read statically (data-driven or template-built copy).
	{
		label: 'Books, ordering and publisher pages',
		pages: [
			'books/beloved-identity',
			'where-to-buy',
			'print/order',
			'translation-progress',
			'partners',
			'press',
			'give',
			'family',
			'youversion',
			'verse-of-the-day-widget',
		],
		overrides: {
			'books/beloved-identity': {
				title: "Father's Heart - Beloved Identity: What Your Heavenly Father Thinks of You",
				description: 'The paperback book on what our Father thinks of you, with ordering.',
			},
			'where-to-buy': {
				title: "Where to Buy Father's Heart Bible",
				description: 'Every print edition, regular and large print, with buy links by retailer.',
			},
			'translation-progress': {
				description:
					'One row for every language in the publishing roster: script, region, and whether it can be read free online.',
			},
		},
	},
	// 2sq: the per-language free-reading landing pages and the Spanish prayer-verses page.
	{
		label: 'Free reading pages by language',
		pages: [
			'italian-bible',
			'marathi-bible',
			'telugu-bible',
			'tangkhul-bible',
			'versiculos-sobre-oracao',
		],
	},
	{
		label: 'Original data',
		pages: [
			'who-speaks-in-scripture',
			'names-of-god-the-father',
			'bible-by-the-numbers',
			'read-the-bible-in-a-year',
			'bible-trivia',
		],
	},
];

// CSV downloads of the Original data pages, listed in the answer-page block with a line DERIVED from the file.
export const DATA_FILES = [
	'public/data/who-speaks-by-book.csv',
	'public/data/names-of-the-father-terms.csv',
	'public/data/names-of-the-father-by-book.csv',
	'public/data/bible-by-the-numbers-by-book.csv',
	'public/data/bible-by-the-numbers-by-chapter.csv',
	'public/data/bible-reading-plan.csv',
	'public/data/bible-trivia.csv',
];

// Pages whose title/description live in a shared component's copy object, not in the page file (2he):
// slug -> [component file, which {title, description} pair in it (0-based)].
const COMPONENT_META = {
	'old-testament': ['src/components/TestamentPage.astro', 0],
	'new-testament': ['src/components/TestamentPage.astro', 1],
};

const humanize = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const clean = (s) =>
	s
		.replace(/\s+/g, ' ')
		.replace(/\\(['"`])/g, '$1')
		.trim();

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
		if (scope[m[2]] !== undefined)
			scope[m[1]] = m[3]
				.split('.')
				.filter(Boolean)
				.reduce((o, k) => o?.[k], scope[m[2]]);
	}
	const ref = (e) =>
		e
			.trim()
			.split('.')
			.reduce((o, k) => (o == null ? undefined : o[k]), scope);
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
		const lit = '(?:\'((?:[^\'\\\\\\n]|\\\\.)*)\'|"((?:[^"\\\\\\n]|\\\\.)*)"|`([^`]+)`)';
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
		// Attribute wrapped in the seoFit helper, e.g. title={fitTitle("...")} / description={fitDescription(`...`)} (2sq).
		const w = src.match(new RegExp('^\\s*' + name + '=\\{' + fit + '\\(\\s*' + lit, 'm'));
		if (w) {
			const v = w.slice(1).find(Boolean);
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
	return {
		title: pick('title', 'TITLE', 'fitTitle'),
		description: pick('description', 'DESCRIPTION', 'fitDescription'),
	};
}

// 2sr (2026-11-11): the /bibles/<slug>-bible/ edition pages, DERIVED from src/data/editions/*.json by the same filter
// bibles/[slug].astro uses for getStaticPaths (slug + listing + hook). Editions already named in the hand-written part of
// public/llms.txt (the audience list) are skipped so no page is listed twice. One short line each: the edition's own name
// and its English name from the title's parenthetical, never typed here.
export function editionGroup(root = process.cwd()) {
	const dir = path.resolve(root, 'src/data/editions');
	let hand = '';
	try {
		const t = fs.readFileSync(path.resolve(root, 'public/llms.txt'), 'utf8');
		const a = t.indexOf(BEGIN);
		const b = t.indexOf(END);
		hand = a !== -1 && b > a ? t.slice(0, a) + t.slice(b) : t;
	} catch {
		/* no llms.txt: nothing to dedupe against */
	}
	const entries = [];
	for (const f of fs
		.readdirSync(dir)
		.filter((x) => /^[a-z0-9-]+\.json$/.test(x))
		.sort()) {
		const e = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
		if (!e || typeof e.slug !== 'string' || !e.listing || !e.hook) continue;
		const url = `/bibles/${e.slug}-bible/`;
		if (hand.includes(url)) continue;
		const en = (e.title || '').match(/\(([^()]+)\)\s*$/);
		entries.push({
			url,
			slug: e.slug,
			title: e.name + (en && !e.name.includes(en[1]) ? ` (${en[1]})` : ''),
			description: 'Print edition page, ISBN and ordering.',
		});
	}
	return { label: 'Print editions by language and volume', entries };
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
			const ov = t.overrides?.[slug] || {};
			return {
				url: `/${rel}/`,
				slug,
				title: (ov.title || m.title || humanize(slug)).replace(
					/\s*\|\s*(Father.s Heart Bible.*|FHB)$/, // 3cv-1: a short ' | FHB' brand suffix is stripped too
					'',
				),
				description: ov.description || m.description,
			};
		});
		groups.push({ label: t.label, entries });
	}
	groups.push(editionGroup(root));
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

// 3bo (pmseoaeo 2026-11-13): llms.txt sat at 69,995 of its 70,000-byte cap (the test below), so the next listed page
// would fail the build. llms.txt is the INDEX: each answer-page description is cut to LLMS_TXT_DESC_MAX characters on
// a word boundary. llms-full.txt keeps every description whole. renderFor() is the one place both files and the
// tests take their block from, so the size test measures exactly what the build writes.
export const LLMS_TXT_DESC_MAX = 120;
// 3cn (pmseoaeo 2026-11-13): 135 of 179 clipped descriptions stopped mid-sentence, 49 on a stop word. Prefer the
// last SENTENCE end inside the cap (no ellipsis needed), else the last clause end, else a word boundary; then never
// end on a stop word or a bare "(FHB)".
const CLIP_STOP = new Set([
	'a',
	'an',
	'and',
	'as',
	'at',
	'by',
	'for',
	'from',
	'in',
	'into',
	'is',
	'its',
	'of',
	'on',
	'or',
	'our',
	'reveals',
	'that',
	'the',
	'their',
	'to',
	'with',
	'your',
	'(fhb)',
]);
export function clip(s, max) {
	if (!max || [...s].length <= max) return s;
	const cut = [...s].slice(0, max - 1).join('');
	let sentence = -1;
	for (const m of cut.matchAll(/[.!?](?=\s)/g)) sentence = m.index;
	if (sentence >= max * 0.4) return cut.slice(0, sentence + 1);
	let clause = -1;
	for (const m of cut.matchAll(/[,;:—](?=\s)/g)) clause = m.index;
	let body;
	if (clause >= max * 0.6) body = cut.slice(0, clause);
	else {
		const sp = cut.lastIndexOf(' ');
		body = sp > max * 0.6 ? cut.slice(0, sp) : cut;
	}
	body = body.replace(/[\s,;:—-]+$/, '');
	for (;;) {
		const words = body.split(' ');
		if (words.length < 3 || !CLIP_STOP.has(words[words.length - 1].toLowerCase())) break;
		body = words
			.slice(0, -1)
			.join(' ')
			.replace(/[\s,;:—-]+$/, '');
	}
	return `${body}…`;
}
// 3cn: "Title?" + ". " printed "Bible?." — a title that already ends a sentence is followed by a space only.
const join = (title) => (/[.!?…]$/.test(title) ? `${title} ` : `${title}. `);
export function renderFor(file, groups) {
	return render(groups, /(^|\/)llms\.txt$/.test(file) ? LLMS_TXT_DESC_MAX : 0);
}

export function render(groups, maxDesc = 0) {
	const out = [BEGIN, '## Answer pages (every page, generated from the site on each build)', ''];
	for (const g of groups) {
		out.push(`### ${g.label}`, '');
		for (const e of g.entries)
			out.push(
				`- ${e.url} — ${e.description ? `${join(e.title)}${clip(e.description, maxDesc)}` : e.title}`,
			);
		out.push('');
	}
	out.push(END);
	return out.join('\n');
}

// Replace the block in `text`, or insert it before "## Contact" (llms.txt) or "## Publisher" (llms-full.txt) the first time.
export function apply(text, block) {
	// 2sq: /read 301s to /read/ — the hand-written 'Reader home' line must carry the canonical URL (idempotent).
	text = text.replace(/(Reader home: )\/read(?=\s|$)/g, '$1/read/');
	const a = text.indexOf(BEGIN);
	const b = text.indexOf(END);
	if (a !== -1 && b > a) return text.slice(0, a) + block + text.slice(b + END.length);
	const c = ['\n## Contact', '\n## Publisher'].map((h) => text.indexOf(h)).find((i) => i !== -1);
	if (c === undefined)
		throw new Error('no "## Contact" / "## Publisher" anchor to insert the answer-pages block');
	return text.slice(0, c + 1) + block + '\n' + text.slice(c);
}

export function generate(root = process.cwd()) {
	const groups = collect(root);
	const res = {};
	for (const name of ['llms.txt', 'llms-full.txt']) {
		const f = path.resolve(root, 'public', name);
		const cur = fs.readFileSync(f, 'utf8');
		const next = apply(cur, renderFor(name, groups));
		if (next !== cur) fs.writeFileSync(f, next);
		res[name] = groups.reduce((n, g) => n + g.entries.length, 0);
	}
	return res;
}

if (import.meta.url === `file://${process.argv[1]}`) console.log('llms-answer-pages', generate());
