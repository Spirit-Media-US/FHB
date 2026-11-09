// 2ll-B hub <lastmod> pilot (L1138; pre-registered aeo-state/fhb-hub-lastmod-2llb-prereg-20261109.json).
// A language hub (/read/<lang>/) and its book pages get a <lastmod> ONLY for the pilot's treated
// languages. The date is the latest per-chapter updatedAt the reader data already carries (the same
// source the chapter entries use), so it moves only when that language's text moves. Never a build
// date: no data -> no lastmod. Controls are deliberately absent from this list.
import fs from 'node:fs';
import path from 'node:path';

export const HUB_LASTMOD_LANGS = ['te', 'ur', 'pa', 'fa', 'ml', 'ceb', 'af', 'ne'];

const DAY = /^\d{4}-\d{2}-\d{2}/;

// { hub: 'YYYY-MM-DD' | null, books: Map(slug -> 'YYYY-MM-DD') } for one language.
export function hubLastmods(dataDir, lang) {
	const books = new Map();
	let hub = null;
	const dir = path.join(dataDir, lang);
	let files = [];
	try {
		files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
	} catch {
		return { hub, books };
	}
	for (const f of files) {
		let doc;
		try {
			doc = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
		} catch {
			continue;
		}
		if (!doc || typeof doc !== 'object' || !doc.chapters) continue;
		let latest = null;
		for (const ch of Object.values(doc.chapters)) {
			const raw = ch && ch.updatedAt;
			if (typeof raw === 'string' && DAY.test(raw)) {
				const d = raw.slice(0, 10);
				if (!latest || d > latest) latest = d;
			}
		}
		if (latest) {
			books.set(f.replace(/\.json$/, ''), latest);
			if (!hub || latest > hub) hub = latest;
		}
	}
	return { hub, books };
}
