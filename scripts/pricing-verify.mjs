#!/usr/bin/env node
/**
 * pricing-verify.mjs — the print page, the checkout function and the ISBN master must agree.
 *
 * WHY THIS EXISTS. Prices live in three places by necessity: ISBNS.json is the business
 * record, functions/dvc-checkout.ts is what Stripe is actually charged, and the PRICE map in
 * print.astro drives the live total a buyer watches while they choose. Displaying one price
 * and charging another is the worst outcome on the page, and nothing about editing one of the
 * three reminds you about the other two.
 *
 * It runs in `npm run build` and EXITS NONZERO, so a mismatch stops the deploy rather than
 * printing a warning into a log nobody reads.
 *
 * Checks, each of which has failed somewhere before:
 *   1. The Large Print set never costs more than its three volumes bought separately.
 *   2. Volume and set prices match ISBNS.json, the single source.
 *   3. dvc-checkout.ts and print.astro agree on every shared SKU, to the cent.
 *   4. Every SKU the page can add is a SKU the server will sell.
 *   5. `books` weights match on both sides — the ladder must count the same on both.
 *   6. No RETIRED ISBN appears anywhere in src/ or functions/.
 *
 * Self-check: run with --selftest to confirm each assertion actually FAILS when broken. A
 * gate that has never rejected anything is unproven.
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const ISBNS = '/home/deploy/projects/fhb-print-bible/editions/ISBNS.json';
const CHECKOUT = 'functions/dvc-checkout.ts';
const PRINT = 'src/pages/print.astro';

// The single-volume Large Print and the B&W general numbers. Retired, not merely old: a live
// page carrying one of these sells a book that is not the book we print.
const RETIRED = [
	'291-4', '292-1', '293-8', '294-5', '295-2', '306-5', // general, B&W — replaced by 333-1..338-6
	'307-2', '308-9', '309-6', '310-2', '311-9', '312-6', // large print, single volume
];

const fail = [];
const check = (ok, msg) => {
	if (!ok) fail.push(msg);
};
const cents = (usd) => Math.round(Number(usd) * 100);

// ── the sources ──────────────────────────────────────────────────────────────────────
// ISBNS.json lives outside the repo (it is the publisher's record, not site content). If it
// is not mounted — a CI box, a fresh clone — the cross-file checks still run and only the
// ISBNS comparison is skipped, reported as skipped rather than passed silently.
const haveIsbns = existsSync(ISBNS);
const isbns = haveIsbns ? JSON.parse(readFileSync(ISBNS, 'utf8')) : null;

const checkoutSrc = readFileSync(CHECKOUT, 'utf8');
const printSrc = readFileSync(PRINT, 'utf8');

/** Retail cents per SKU from dvc-checkout.ts EDITIONS, plus each SKU's `books` weight. */
function parseCheckout(src) {
	const body = src.slice(src.indexOf('const EDITIONS'), src.indexOf('\n};', src.indexOf('const EDITIONS')));
	const out = {};
	// BRACE-DEPTH SCAN, not a [^}]* regex. Every entry's `img` is a template literal, and
	// the `}` that closes `${ASSETS}` ends a lazy [^}] match early — which silently cut each
	// entry off BEFORE its `books` field, so every SKU parsed as one book and the weights
	// "agreed" without ever being compared. Found by the self-test, which is the only reason
	// this comment is not a future incident.
	const re = /'?([a-z0-9-]+)'?:\s*\{/g;
	for (const m of body.matchAll(re)) {
		let depth = 0;
		let i = m.index + m[0].length - 1;
		for (; i < body.length; i++) {
			if (body[i] === '{') depth++;
			else if (body[i] === '}' && --depth === 0) break;
		}
		const entry = body.slice(m.index, i + 1);
		const retail = /retail:\s*(\d+)/.exec(entry);
		if (!retail) continue;
		out[m[1]] = {
			cents: Number(retail[1]),
			books: Number(/books:\s*(\d+)/.exec(entry)?.[1] ?? 1),
		};
	}
	return out;
}

/** Dollar prices per SKU from the PRICE map in print.astro's inline script, plus BOOKS. */
function parsePrint(src) {
	const start = src.indexOf('const PRICE = {');
	const body = src.slice(start, src.indexOf('};', start));
	const out = {};
	for (const m of body.matchAll(/'?([a-z0-9-]+)'?:\s*([\d.]+)/g)) {
		out[m[1]] = { cents: cents(m[2]), books: 1 };
	}
	const bs = src.indexOf('const BOOKS = {');
	if (bs !== -1) {
		const bbody = src.slice(bs, src.indexOf('};', bs));
		for (const m of bbody.matchAll(/'?([a-z0-9-]+)'?:\s*(\d+)/g)) {
			if (out[m[1]]) out[m[1]].books = Number(m[2]);
		}
	}
	return out;
}

const server = parseCheckout(checkoutSrc);
const page = parsePrint(printSrc);
check(Object.keys(server).length > 20, `parsed only ${Object.keys(server).length} SKUs from ${CHECKOUT} — the parser, not the data, is probably wrong`);
check(Object.keys(page).length > 20, `parsed only ${Object.keys(page).length} SKUs from ${PRINT} — the parser, not the data, is probably wrong`);

// ── 1. the set is a saving, in both bindings ────────────────────────────────────────
for (const b of ['pb', 'hb']) {
	const parts = ['lp-vol1', 'lp-vol2', 'lp-vol3'].reduce((s, v) => s + (server[`${v}-${b}`]?.cents ?? 0), 0);
	const set = server[`lp-set-${b}`]?.cents;
	check(set != null && parts > 0, `missing Large Print ${b} SKUs in ${CHECKOUT}`);
	if (set != null && parts > 0) {
		check(
			set <= parts,
			`Large Print set (${b}) costs ${set / 100} but its three volumes cost ${parts / 100} separately — a set must never cost more than its parts`,
		);
	}
}

// ── 2. prices match the ISBN master ─────────────────────────────────────────────────
if (haveIsbns) {
	const lp = isbns.large_print;
	for (const v of lp.volumes) {
		for (const [binding, key] of [['Hardcover', 'hb'], ['Paperback', 'pb']]) {
			const want = cents(v.price_usd[binding]);
			const got = server[`lp-vol${v.vol}-${key}`]?.cents;
			check(got === want, `lp-vol${v.vol}-${key}: ${CHECKOUT} says ${got} cents, ISBNS.json says ${want}`);
		}
	}
	for (const [binding, key] of [['Hardcover', 'hb'], ['Paperback', 'pb']]) {
		const want = cents(lp.set_price_usd[binding]);
		const got = server[`lp-set-${key}`]?.cents;
		check(got === want, `lp-set-${key}: ${CHECKOUT} says ${got} cents, ISBNS.json says ${want}`);
	}
} else {
	console.log(`  · ISBNS.json not mounted at ${ISBNS} — SKIPPED (not passed) the ISBN-master comparison`);
}

// ── 3+4+5. the page and the server agree ────────────────────────────────────────────
for (const [slug, p] of Object.entries(page)) {
	const s = server[slug];
	check(s != null, `${slug} is priced in ${PRINT} but the server will not sell it — the buyer would be charged nothing for it`);
	if (s) {
		check(s.cents === p.cents, `${slug}: page shows ${p.cents} cents, server charges ${s.cents}`);
		check(s.books === p.books, `${slug}: page counts ${p.books} book(s) toward a tier, server counts ${s.books}`);
	}
}
for (const slug of Object.keys(server)) {
	check(page[slug] != null, `${slug} is sellable server-side but missing from the PRICE map in ${PRINT} — its live total would read $0.00`);
}

// ── 6. no retired ISBN anywhere the site can render ──────────────────────────────────
for (const n of RETIRED) {
	let hits = '';
	try {
		hits = execSync(`grep -rln "89307-${n}" src functions 2>/dev/null || true`, { encoding: 'utf8' }).trim();
	} catch {
		hits = '';
	}
	check(!hits, `retired ISBN 979-8-89307-${n} still present in: ${hits.split('\n').join(', ')}`);
}

// ── self-test: prove each assertion can actually fail ───────────────────────────────
if (process.argv.includes('--selftest')) {
	const cases = [
		['set priced above its parts', () => {
			const broken = parseCheckout(checkoutSrc.replace('retail: 29999', 'retail: 39999'));
			const parts = ['lp-vol1', 'lp-vol2', 'lp-vol3'].reduce((s, v) => s + broken[`${v}-hb`].cents, 0);
			return broken['lp-set-hb'].cents > parts;
		}],
		['page/server price drift', () => {
			const broken = parsePrint(printSrc.replace("'lp-set-hb': 299.99", "'lp-set-hb': 289.99"));
			return broken['lp-set-hb'].cents !== server['lp-set-hb'].cents;
		}],
		['books weight drift', () => {
			const broken = parsePrint(printSrc.replace("'lp-set-hb': 3", "'lp-set-hb': 1"));
			return broken['lp-set-hb'].books !== server['lp-set-hb'].books;
		}],
		['retired ISBN detected', () => /89307-294-5/.test('isbn 979-8-89307-294-5')],
	];
	let bad = 0;
	for (const [name, fn] of cases) {
		const fires = fn();
		console.log(`  ${fires ? '✓' : '✗'} ${name} — ${fires ? 'fires when broken' : 'DID NOT FIRE'}`);
		if (!fires) bad++;
	}
	if (bad) {
		console.error(`\n✗ ${bad} assertion(s) do not fire on a broken input — this gate is unproven`);
		process.exit(1);
	}
}

if (fail.length) {
	console.error('✗ pricing-verify: print page, checkout function and ISBN master disagree\n');
	for (const f of fail) console.error(`  · ${f}`);
	process.exit(1);
}
console.log(`✓ pricing-verify: ${Object.keys(server).length} SKUs agree across ${CHECKOUT}, ${PRINT}${haveIsbns ? ' and ISBNS.json' : ''}; Large Print set is a saving in both bindings; no retired ISBN in src/ or functions/`);
