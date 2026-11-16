// BUILD-CHECK: searched "new tab external link label cross-site" (bin/tool-inventory.py 2026-11-16) + both repos'
//   scripts/*.test.mjs -> no test reads links for target/labels; nearest are the per-feature dist tests here.
// NEAREST: scripts/print-cards.test.mjs (reads built pages, different property).
// NOT-REUSED-BECAUSE: no existing test inspects anchors; this is a test, not a runner (nothing written).
// APPROVED-BY: pmprint queue item 56d42ed1 (brief pmprint-cross-site-links-20261116.md; Kevin 2026-11-16 "should
//   follow industry best practices").
//
// node --test scripts/xsite-links.test.mjs   (reads dist/, so run after astro build)
// The cross-site link rule (src/lib/xsite.ts), checked on the BUILT pages. Identical in the SMP repo but for CFG and rule 4.
//   1. no target=_blank on an SMP <-> FHB link (anywhere in the build)
//   2. every SMP <-> FHB link carries its destination (the .xsite-dest/.xsite-sr label, or the link already names it)
//   3. every target=_blank link on the store pages says "opens in a new tab" in its accessible name
//   4. no RELATIVE /bookstore/ link (FHB has no bookstore: it 404ed on /books/who-am-i/, inspector C 2026-11-16)
// The last test plants one bad link per rule and asserts each rule catches it. XSITE_DIST=<dir> points the run at another
// build (e.g. a copy of dist/ with a bad link written into a real page) to prove the gate fails on the page itself.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

export const CFG = {
	dist: path.resolve(process.env.XSITE_DIST || 'dist'),
	sister: 'spiritmediapublishing.com',
	// rule 3's pages: the store surfaces (FH book pages, edition pages, /print/)
	storePages: (rel) =>
		/^books\/[^/]+\/index\.html$/.test(rel) || /^bibles\/[^/]+\/index\.html$/.test(rel) || rel === 'print/index.html',
	// LOCKED chrome (community/chrome Header.astro + Footer.astro, Kevin's bless only: rules/fhb-web.md): rules 1-3 do
	// not fail on links inside it; they are REPORTED (the last test prints each) for pmprint to take to Kevin.
	locked: (a) => {
		const inside = (open, close, sig) => {
			const o = a.body.lastIndexOf(open, a.at);
			return o > a.body.lastIndexOf(close, a.at) && a.body.startsWith(sig, o);
		};
		return (
			inside('<header', '</header>', '<header id="chrome-header"') ||
			inside('<footer', '</footer>', '<footer style="background-color: var(--color-inverse-surface') ||
			inside('<footer', '</footer>', '<footer style="padding: 32px 24px')
		);
	},
};

const walk = (d, out = []) => {
	for (const e of fs.readdirSync(d, { withFileTypes: true })) {
		const p = path.join(d, e.name);
		if (e.isDirectory()) walk(p, out);
		else if (e.name.endsWith('.html')) out.push(p);
	}
	return out;
};
const attr = (a, n) => {
	const m = new RegExp(`\\s${n}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(a);
	return m ? (m[1] ?? m[2] ?? m[3]) : null;
};
const text = (h) => h.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** Every <a> in a page, outside <script>/<template>/<style>, with what the rules need. */
export function anchors(html) {
	const body = html.replace(/<(script|template|style)\b[\s\S]*?<\/\1>/gi, '');
	const out = [];
	for (const m of body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
		out.push({ open: m[1], inner: m[2], href: attr(m[1], 'href') ?? '', body, at: m.index });
	}
	return out;
}
export const isSister = (href, host) =>
	new RegExp(`^(?:https?:)?//(?:www\\.)?${host.replace(/\./g, '\\.')}(?:[/:?#]|$)`, 'i').test(href);
export const newTab = (a) => /^_blank$/i.test(attr(a.open, 'target') ?? '');
export const hasDest = (a, host) => {
	const label = attr(a.open, 'aria-label');
	if (label) return label.toLowerCase().includes(host);
	return (
		new RegExp(`class="xsite-(?:dest|sr)"[^>]*>[\\s\\S]*?${host.replace(/\./g, '\\.')}`, 'i').test(a.inner) ||
		text(a.inner).toLowerCase().includes(host)
	);
};
export const saysNewTab = (a, html) => {
	const label = attr(a.open, 'aria-label');
	if (label) return /opens in a new (tab|window)/i.test(label);
	const by = attr(a.open, 'aria-describedby');
	if (by && by.split(/\s+/).some((id) => new RegExp(`id="${id}"[^>]*>[^<]*opens in a new (tab|window)`, 'i').test(html)))
		return true;
	return /opens in a new (tab|window)/i.test(text(a.inner));
};

/** The three rules over a set of pages: returns the violations, rule by rule. */
export function check(pages, cfg = CFG) {
	const v = { sameTab: [], dest: [], newTabLabel: [], relBookstore: [], locked: [] };
	for (const [rel, html] of pages) {
		const store = cfg.storePages(rel);
		for (const a of anchors(html)) {
			const where = `${rel}: <a${a.open.slice(0, 160)}>`;
			const locked = cfg.locked(a, rel);
			if (isSister(a.href, cfg.sister)) {
				if (newTab(a)) (locked ? v.locked : v.sameTab).push(where);
				if (!hasDest(a, cfg.sister)) (locked ? v.locked : v.dest).push(where);
			}
			if (store && newTab(a) && !saysNewTab(a, html)) (locked ? v.locked : v.newTabLabel).push(where);
			if (/^\/bookstore(?:[/?#]|$)/i.test(a.href)) v.relBookstore.push(where);
		}
	}
	return v;
}

const loadPages = () =>
	walk(CFG.dist).map((p) => [path.relative(CFG.dist, p).split(path.sep).join('/'), fs.readFileSync(p, 'utf8')]);
const show = (xs) => `${xs.length}:\n  ${[...new Set(xs)].slice(0, 15).join('\n  ')}`;

test('dist exists', () => assert.ok(fs.existsSync(path.join(CFG.dist, 'index.html')), 'build first'));
const pages = fs.existsSync(CFG.dist) ? loadPages() : [];
const result = check(pages);

test(`1. no target=_blank on a link to ${CFG.sister}`, () => assert.deepEqual(result.sameTab, [], show(result.sameTab)));
test(`2. every link to ${CFG.sister} carries its destination label`, () =>
	assert.deepEqual(result.dest, [], show(result.dest)));
test('3. every target=_blank link on the store pages says "opens in a new tab"', () =>
	assert.deepEqual(result.newTabLabel, [], show(result.newTabLabel)));
test('4. no relative /bookstore/ link (it 404s on fathersheartbible.com)', () =>
	assert.deepEqual(result.relBookstore, [], show(result.relBookstore)));
test('locked chrome links (reported, not failed)', (t) => {
	const by = new Map();
	for (const x of result.locked) {
		const k = x.replace(/^[^:]*: /, '');
		by.set(k, (by.get(k) ?? 0) + 1);
	}
	t.diagnostic(`locked chrome exceptions: ${result.locked.length} on the pages, ${by.size} distinct links`);
	for (const [k, n] of by) t.diagnostic(`${n} pages: ${k}`);
});

// The proof the gate can fail: each injected bad link must be caught by its own rule, by name.
test('injected bad links are each caught', () => {
	const page = 'books/injected/index.html';
	const bad = (a) => [[page, `<html><body>${a}</body></html>`]];
	const s = `https://${CFG.sister}/bookstore/smp-worldwide/`;
	assert.equal(check(bad(`<a href="${s}" target="_blank">x <span class="xsite-dest">${CFG.sister}</span></a>`)).sameTab.length, 1, 'rule 1 missed a new-tab sister link');
	assert.equal(check(bad(`<a href="${s}">All SMP Books</a>`)).dest.length, 1, 'rule 2 missed an unlabelled sister link');
	assert.equal(check(bad(`<a href="https://www.amazon.com/dp/X" target="_blank">Amazon</a>`)).newTabLabel.length, 1, 'rule 3 missed an unlabelled new tab');
	assert.equal(check(bad(`<a href="/bookstore/">Browse</a>`)).relBookstore.length, 1, 'rule 4 missed a relative /bookstore/');
	// and the good forms pass
	const ok = check(bad(`<a href="${s}">All SMP Books <span class="xsite-dest"> <span aria-hidden="true">·</span> ${CFG.sister}</span></a><a href="https://www.amazon.com/dp/X" target="_blank">Amazon<span class="xsite-sr"> (opens in a new tab)</span></a>`));
	assert.deepEqual([ok.sameTab, ok.dest, ok.newTabLabel], [[], [], []]);
});
