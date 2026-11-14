// node --test scripts/sitemap-lastmod.test.mjs   (unit 2xw)
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { addIndexLastmod, chapterLastmod, editionFilesBySlug, editionLastmod, maxLastmod } from './lib/sitemap-lastmod.mjs';

test('chapter lastmod = latest of updatedAt and lockedAt (same rule as page dateModified)', () => {
	assert.equal(chapterLastmod({ updatedAt: '2026-06-09T14:41:10+00:00', lockedAt: '2026-08-04T17:10:03+00:00' }), '2026-08-04');
	assert.equal(chapterLastmod({ updatedAt: '2026-10-29T01:00:00Z' }), '2026-10-29');
	assert.equal(chapterLastmod({ updatedAt: '2026-10-29', lockedAt: '2026-08-04' }), '2026-10-29');
});

test('FAILURE PATH: no real stamp means NO lastmod (never invented, never today)', () => {
	assert.equal(chapterLastmod({}), undefined);
	assert.equal(chapterLastmod(null), undefined);
	assert.equal(chapterLastmod({ updatedAt: 'garbage', lockedAt: '' }), undefined);
	assert.equal(chapterLastmod({ updatedAt: '2026-13-45' }), undefined);
});

function editionsFixture() {
	const d = fs.mkdtempSync(path.join(os.tmpdir(), 'ed-'));
	fs.writeFileSync(path.join(d, 'dads.json'), JSON.stringify({ slug: 'dads', listing: {}, hook: 'x' }));
	fs.writeFileSync(path.join(d, 'frontmatter.json'), JSON.stringify({ dads: {} })); // no slug: not a page
	fs.writeFileSync(path.join(d, 'draft.json'), JSON.stringify({ slug: 'draft' })); // no listing/hook: not a page
	return d;
}
test('edition page lastmod comes from its own data file git date; non-pages and unknown slugs get none', () => {
	const d = editionsFixture();
	const by = editionFilesBySlug(d);
	assert.deepEqual([...by.keys()], ['dads-bible']);
	const git = new Map([[`${d}/dads.json`, '2026-10-03']]);
	assert.equal(editionLastmod('/bibles/dads-bible/', by, git), '2026-10-03');
	assert.equal(editionLastmod('/bibles/draft-bible/', by, git), undefined);
	assert.equal(editionLastmod('/bibles/dads-bible/', by, new Map()), undefined); // file with no git date: absent, not guessed
	assert.equal(editionLastmod('/blog/x/', by, git), undefined);
});

test('index lastmod: set from the child, absent when the child has no date; idempotent', () => {
	const xml = '<sitemapindex><sitemap><loc>https://x/a.xml</loc></sitemap><sitemap><loc>https://x/b.xml</loc></sitemap></sitemapindex>';
	const once = addIndexLastmod(xml, (l) => (l.endsWith('a.xml') ? '2026-11-01' : undefined));
	assert.equal(once, '<sitemapindex><sitemap><loc>https://x/a.xml</loc><lastmod>2026-11-01</lastmod></sitemap><sitemap><loc>https://x/b.xml</loc></sitemap></sitemapindex>');
	assert.equal(addIndexLastmod(once, (l) => (l.endsWith('a.xml') ? '2026-11-01' : undefined)), once);
});

test('maxLastmod picks the newest real date in a urlset', () => {
	assert.equal(maxLastmod('<url><lastmod>2026-01-02</lastmod></url><url><lastmod>2026-03-04T00:00:00.000Z</lastmod></url><url></url>'), '2026-03-04');
	assert.equal(maxLastmod('<url></url>'), undefined);
});
