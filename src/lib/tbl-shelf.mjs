// COPY of spirit-media-publishing src/lib/tbl-shelf.mjs (the master; this repo builds on Cloudflare without it). Keep the two
// identical below this line: `diff <(tail -n +4 this) <(cat SMP's)`. FHB uses loadTblShelf/validFeed with shelf 'fh' for
// /books/ (src/pages/books/index.astro); tblCards/newestKeys are SMP's bookstore card shape.
// BUILD-CHECK: searched "tbl shelf catalog feed bookstore cards" (tool-inventory.py 2026-11-23, noah efc90f4f) + grep src/lib
// NEAREST: src/lib/tbl-switch.mjs (SMP slug -> TBL URL map for the switch-over 301s; it holds no book data) and the
//   deriveFhbEditions() build fetch + committed-snapshot pattern in src/components/BookstoreBody.astro.
// NOT-REUSED-BECAUSE: tbl-switch.mjs is a URL map, not a book list; this reuses deriveFhbEditions' pattern (live read at
//   build, committed snapshot when the source cannot answer) for a different source (TBL's catalog).
// APPROVED-BY: Kevin 2026-11-21 "We need 1 update and it shows on FHB, TBL, Apps." (brief tbl-shelves-from-catalog-20261123)
//
// THE SMP SHELF READS TBL. Every SMP author book on /bookstore/ and the homepage "New from Spirit Media Authors" comes from
// The Believer's Library catalog (TBL GET /api/library/shelf.json?shelf=smp, community src/lib/library-shelf.ts). A book
// added on TBL is carded here at the next build, with no SMP commit.
//   REFRESH: every build reads the feed live (Bethel, Cloudflare, the Sanity webhook build alike), so the shelf is as
//   of the site's last build; the edge caches the feed 15 min (s-maxage=900). A rebuild-on-TBL-change watcher is
//   PROPOSED, not built (new tool + it would trigger production builds: needs approval; brief tbl-shelves report).
//   FALLBACK: a build that cannot read the feed (3 tries) uses src/data/tbl-shelf.json, the last good feed this code wrote.
//   No feed AND no snapshot = the build FAILS (never an empty shelf). A preview feed (*.pages.dev, or carrying preview
//   test rows) is never written to the snapshot.
// What SMP still holds itself (TBL cannot, or it is SMP-site policy — not a second book list):
//   src/data/books/do-not-publish.json (SMP visibility rule) · src/data/books/smp-only-cards.json (books TBL must not carry)
//   · cover-sized.json / light-covers.json (presentation) · the FHB Bible edition cards (FHB's own edition data).
// Test: scripts/tbl-shelf.test.mjs.
import fs from 'node:fs';

/** A shelf feed this code can card: the SMP shelf, every work keyed + titled + linked, count = works. Pure. */
export function validFeed(j, shelf = 'smp') {
	return Boolean(
		j &&
			j.shelf === shelf &&
			Array.isArray(j.works) &&
			j.works.length > 0 &&
			j.count === j.works.length &&
			j.works.every((w) => w && typeof w.key === 'string' && w.title && /^https:\/\//.test(w.url ?? '')),
	);
}

/** The bytes the snapshot keeps (generated_at dropped, so an unchanged catalog writes nothing). Pure. */
export const snapshotJson = (feed) => `${JSON.stringify({ ...feed, generated_at: undefined }, null, '\t')}\n`;

/**
 * Read the feed live (3 tries), else the snapshot. Writes the snapshot when the live feed differs and carries no test row.
 * -> { feed, from: 'live' | 'snapshot', url }
 */
export async function loadTblShelf({ url, snapshotPath, shelf = 'smp', fetchImpl = fetch, log = console.log, tries = 3 }) {
	let lastErr = '';
	for (let i = 0; i < tries; i++) {
		if (i) await new Promise((r) => setTimeout(r, 1500 * i));
		try {
			const res = await fetchImpl(url, { signal: AbortSignal.timeout(20000), headers: { accept: 'application/json' } });
			if (!res.ok) {
				lastErr = `HTTP ${res.status}`;
				continue;
			}
			const j = await res.json();
			if (!validFeed(j, shelf)) {
				lastErr = 'not a valid shelf feed';
				continue;
			}
			const hasTest = j.works.some((w) => w.test);
			const preview = /\.pages\.dev$/i.test(new URL(j.site ?? url).host);
			if (snapshotPath && !hasTest && !preview) {
				const next = snapshotJson(j);
				const prev = fs.existsSync(snapshotPath) ? fs.readFileSync(snapshotPath, 'utf8') : '';
				if (prev !== next) {
					try {
						fs.writeFileSync(snapshotPath, next);
					} catch (e) {
						log(`[tbl-shelf] snapshot not written (${e.message})`);
					}
				}
			}
			log(`[tbl-shelf] ${shelf}: ${j.count} books from ${url}${hasTest || preview ? ' (preview feed; snapshot untouched)' : ''}`);
			return { feed: j, from: 'live', url };
		} catch (e) {
			lastErr = String(e?.message ?? e);
		}
	}
	const snap = snapshotPath && fs.existsSync(snapshotPath) ? JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) : null;
	if (!validFeed(snap, shelf))
		throw new Error(`[tbl-shelf] ${url} failed (${lastErr}) and no valid snapshot at ${snapshotPath}: refusing an empty shelf`);
	log(`[tbl-shelf] ⚠ ${url} failed (${lastErr}) — using the snapshot (${snap.count} books)`);
	return { feed: snap, from: 'snapshot', url };
}

/**
 * TBL works -> bookstore card objects (the shape BookstoreBody.astro builds from). Pure.
 * ctx.pageBuilt(key)  an SMP /books/<key>/ page builds on this build (the card opens it; the switch-over later sends it to TBL)
 * ctx.ownEbook(key)   our store sells the eBook from that page
 * ctx.cover(key)      a pre-sized 300px cover for the card, if one exists
 * ctx.fhPage(key)     the FHB page of a Father Heart book (Option C: FH books open on fathersheartbible.com)
 */
export function tblCards(feed, ctx) {
	return feed.works.map((w) => {
		// the SMP page of the book: its key, or meta.smp_page where TBL keys it differently (your-time-audiobook -> your-time)
		const page = w.smp_page || w.key;
		const own = w.fh_book ? ctx.fhPage(w.key) : ctx.pageBuilt(page) ? `/books/${page}/` : w.url;
		const f = w.formats ?? {};
		// where a format's badge goes when we sell it: our page; an FH book's eBook / audiobook sells on TBL (FHB sells print only)
		const sells = (fmt) => (w.fh_book && fmt !== 'print' ? w.url : own);
		const formats = {};
		const formatsAll = {};
		// print: each binding TBL sells (meta.skus) is its own badge + its own Published Titles edition (L2109)
		if (f.print) {
			const bindings = new Set(
				(f.print.skus ?? [])
					.map((s) => String(s.format ?? '').toLowerCase())
					.map((x) => (/hard/.test(x) ? 'hardback' : /paper|soft/.test(x) ? 'paperback' : ''))
					.filter(Boolean),
			);
			if (!bindings.size) bindings.add('paperback');
			for (const b of bindings) {
				formats[b] = w.fh_book || f.print.buyable || !f.print.retailer ? own : f.print.retailer.href;
				formatsAll[b] = true;
			}
		}
		if (f.ebook) {
			formats.ebook =
				f.ebook.buyable || (!w.fh_book && ctx.ownEbook(page))
					? sells('ebook')
					: (f.ebook.retailer?.href ?? sells('ebook'));
			formatsAll.ebook = true;
		}
		if (f.audiobook) {
			formats.audiobook = f.audiobook.buyable
				? sells('audiobook')
				: (f.audiobook.retailer?.href ?? sells('audiobook'));
			formatsAll.audiobook = true;
		}
		const sized = ctx.cover(page);
		return {
			_id: `tbl-${w.key}`,
			tblKey: w.key,
			tblUrl: w.url,
			title: w.title,
			display_title: w.title,
			author: w.author ?? '',
			img: sized?.w300 ?? w.cover_url,
			...(sized?.w300 ? {} : w.cover_dims ? { w: w.cover_dims.w, h: w.cover_dims.h } : {}),
			amazon: own,
			date: w.pub_date ?? null,
			collections: w.express ? ['Express Books'] : null,
			formats,
			formatsAll,
			ownPage: !w.fh_book,
			...(w.fh_book ? { fhBook: true } : {}),
			...(w.test ? { tblTest: true } : {}),
		};
	});
}

/** Newest N SMP books (not FH books) by publication date: the homepage "New from Spirit Media Authors". Pure. */
export function newestKeys(feed, n = 8) {
	return feed.works
		.filter((w) => !w.fh_book && /^\d{4}-\d{2}-\d{2}$/.test(w.pub_date ?? ''))
		.sort((a, b) => b.pub_date.localeCompare(a.pub_date) || a.key.localeCompare(b.key))
		.slice(0, n)
		.map((w) => w.key);
}
