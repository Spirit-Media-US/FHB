// 2xw (indexing best-practice audit 2026-11-12): TRUE <lastmod> helpers shared by the two sitemap
// owners — astro.config.mjs (marketing sitemap-0.xml) and scripts/gen-sitemap-read.mjs (reader).
// Rule everywhere: a real change date or NO lastmod. Never a build date, never a guess.
import fs from 'node:fs';
import path from 'node:path';

const DAY = /^(\d{4}-\d{2}-\d{2})/;
const day = (s) => {
	const m = typeof s === 'string' ? s.match(DAY) : null;
	return m && !Number.isNaN(Date.parse(m[1])) ? m[1] : undefined;
};

// A chapter's change date = the LATEST of updatedAt (translation pipeline) and lockedAt (the lock).
// This is the SAME rule the page's JSON-LD dateModified uses (community src/lib/fhb-org.ts
// chapterDateModified, unit 2gh). The sitemap read updatedAt alone, so all 1,189 English chapters
// (locked 2026-08-04, updatedAt June) advertised June while the page said 08-04.
export function chapterLastmod(ch) {
	if (!ch || typeof ch !== 'object') return undefined;
	const days = [day(ch.updatedAt), day(ch.lockedAt)].filter(Boolean);
	return days.length ? days.sort().at(-1) : undefined;
}

// /bibles/<slug>-bible/ -> src/data/editions/<file>.json (the file whose own `slug` + '-bible' matches).
// Returns Map(urlSlug -> repo-relative file path). Files without a slug/listing are not pages.
export function editionFilesBySlug(editionsDir = 'src/data/editions') {
	const out = new Map();
	let files = [];
	try {
		files = fs.readdirSync(editionsDir).filter((f) => /^[a-z0-9-]+\.json$/.test(f));
	} catch {
		return out;
	}
	for (const f of files) {
		try {
			const ed = JSON.parse(fs.readFileSync(path.join(editionsDir, f), 'utf8'));
			if (ed && typeof ed.slug === 'string' && ed.listing && ed.hook)
				out.set(`${ed.slug}-bible`, `${editionsDir}/${f}`.replace(/\\/g, '/'));
		} catch {
			/* unreadable: no page, no lastmod */
		}
	}
	return out;
}

// Edition-product-page lastmod: git date of the edition's own data file (gitDates: Map(file -> YYYY-MM-DD)).
export function editionLastmod(pathname, bySlug, gitDates) {
	const m = pathname.match(/^\/bibles\/([a-z0-9-]+-bible)\/?$/);
	if (!m) return undefined;
	const file = bySlug.get(m[1]);
	return file ? gitDates.get(file) : undefined;
}

const maxDay = (xml) => {
	const ds = [...xml.matchAll(/<lastmod>(\d{4}-\d{2}-\d{2})/g)].map((x) => x[1]);
	return ds.length ? ds.sort().at(-1) : undefined;
};
export const maxLastmod = maxDay;

// Add <lastmod> to each <sitemap> entry of an index. `dateFor(loc)` -> YYYY-MM-DD | undefined;
// an entry with no truthful date stays without one.
export function addIndexLastmod(indexXml, dateFor) {
	return indexXml.replace(/<sitemap><loc>([^<]+)<\/loc>(?:<lastmod>[^<]*<\/lastmod>)?<\/sitemap>/g, (_, loc) => {
		const d = dateFor(loc.replace(/&amp;/g, '&'));
		return `<sitemap><loc>${loc}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</sitemap>`;
	});
}
