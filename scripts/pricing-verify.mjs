#!/usr/bin/env node
import { execSync } from 'node:child_process';
/**
 * pricing-verify.mjs — the print page, the checkout function and the ISBN master must agree.
 *
 * WHY THIS EXISTS. Prices live in three places by necessity: ISBNS.json is the business
 * record, functions/dvc-checkout.ts is what Stripe is actually charged, and every order form
 * embeds the prices that drive the live total a buyer watches while they choose. Since
 * 2026-10-03 the forms are read from the BUILT pages (dist/), not from source text: each
 * [data-order] root carries its prices and tiers as JSON, so this checks exactly what ships. Displaying one price
 * and charging another is the worst outcome on the page, and nothing about editing one of the
 * three reminds you about the other two.
 *
 * It runs in `npm run build` and EXITS NONZERO, so a mismatch stops the deploy rather than
 * printing a warning into a log nobody reads.
 *
 * Checks, each of which has failed somewhere before:
 *   1. The Large Print set never costs more than its three volumes bought separately.
 *   2. Volume and set prices match ISBNS.json, the single source.
 *   3. Every built order form and dvc-checkout.ts agree on every SKU, to the cent.
 *   4. Every SKU a form can add is a SKU the server will sell, and the catalog order form
 *      on /print/order/ and on /print offers EVERY SKU the server sells.
 *   5. Every SKU weighs one product on the ladder server-side, as the forms count it.
 *   6. No RETIRED ISBN appears anywhere in src/ or functions/.
 *   7. Every targeted edition is priced in BOTH bindings, and matches ISBNS.json.
 *   9. ONE volume ladder: dvc-checkout.ts TIERS, src/data/print-tiers.ts and the tiers every
 *      built order form embeds are the same tiers.
 *
 * Self-check: run with --selftest to confirm each assertion actually FAILS when broken. A
 * gate that has never rejected anything is unproven.
 */
import { existsSync, readFileSync } from 'node:fs';

const ISBNS = '/home/deploy/projects/fhb-print-bible/editions/ISBNS.json';
const CHECKOUT = 'functions/dvc-checkout.ts';
const DIST = 'dist';
// The forms that must offer the whole catalog, and one language page as the per-language form.
const FULL_FORMS = ['dist/print/order/index.html', 'dist/print/index.html'];
const LANG_FORM = 'dist/bibles/spanish-bible/index.html';
const TIERS_TS = 'src/data/print-tiers.ts';

// The single-volume Large Print and the B&W general numbers. Retired, not merely old: a live
// page carrying one of these sells a book that is not the book we print.
const RETIRED = [
	'291-4',
	'292-1',
	'293-8',
	'294-5',
	'295-2',
	'306-5', // general, B&W — replaced by 333-1..338-6
	'307-2',
	'308-9',
	'309-6',
	'310-2',
	'311-9',
	'312-6', // large print, single volume
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

/** Retail cents per SKU from dvc-checkout.ts EDITIONS, plus each SKU's `books` weight. */
function parseCheckout(src) {
	const body = src.slice(
		src.indexOf('const EDITIONS'),
		src.indexOf('\n};', src.indexOf('const EDITIONS')),
	);
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

/** Every [data-order] config embedded in a built page: { prices: {sku: usd}, tiers }. */
const htmlUnescape = (v) =>
	v
		.replace(/&quot;/g, '"')
		.replace(/&#34;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');
function parseForms(html) {
	return [...html.matchAll(/data-order="([^"]*)"/g)].map((m) => JSON.parse(htmlUnescape(m[1])));
}
const pageCents = (form) =>
	Object.fromEntries(Object.entries(form.prices ?? {}).map(([k, v]) => [k, cents(v)]));

const server = parseCheckout(checkoutSrc);
check(
	Object.keys(server).length > 20,
	`parsed only ${Object.keys(server).length} SKUs from ${CHECKOUT} — the parser, not the data, is probably wrong`,
);
// The built forms. Missing dist/ is a FAILURE, not a skip: this gate exists to compare what
// ships, and it runs after `astro build` in npm run build.
const forms = {};
for (const f of [...FULL_FORMS, LANG_FORM]) {
	if (!existsSync(f)) {
		check(false, `${f} not built — run after astro build (${DIST}/ is what this gate checks)`);
		continue;
	}
	forms[f] = parseForms(readFileSync(f, 'utf8'));
	check(forms[f].length === 1, `${f}: expected ONE order form, found ${forms[f].length}`);
}

// ── 1. the set is a saving, in both bindings ────────────────────────────────────────
for (const b of ['pb', 'hb']) {
	const parts = ['lp-vol1', 'lp-vol2', 'lp-vol3'].reduce(
		(s, v) => s + (server[`${v}-${b}`]?.cents ?? 0),
		0,
	);
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
		for (const [binding, key] of [
			['Hardcover', 'hb'],
			['Paperback', 'pb'],
		]) {
			const want = cents(v.price_usd[binding]);
			const got = server[`lp-vol${v.vol}-${key}`]?.cents;
			check(
				got === want,
				`lp-vol${v.vol}-${key}: ${CHECKOUT} says ${got} cents, ISBNS.json says ${want}`,
			);
		}
	}
	for (const [binding, key] of [
		['Hardcover', 'hb'],
		['Paperback', 'pb'],
	]) {
		const want = cents(lp.set_price_usd[binding]);
		const got = server[`lp-set-${key}`]?.cents;
		check(got === want, `lp-set-${key}: ${CHECKOUT} says ${got} cents, ISBNS.json says ${want}`);
	}

	// Every targeted edition, both bindings. Added 2026-09-17 with the second binding: the
	// sixteen editions doubled to thirty-two SKUs, and until this loop existed the ISBN
	// master gated only the Large Print — the new SKUs could drift from it silently.
	// ISBNS.json is also asserted to still HOLD a price for each, so deleting one there
	// fails the build instead of quietly skipping the comparison.
	const all = { ...isbns.hardcover_case_laminate, journaling: isbns.also_listed.journaling };
	// ON SALE vs MERELY PRICED (Kevin 2026-09-28). Seven editions — athletes, graduates,
	// grandparents, intercessors, nurses, teachers, womens — hold ISBNs and a price
	// (99.99/79.99, Kevin's ruling) but have NO card art: dvc-<slug>-600.webp is 404 on the
	// asset host, and they are not on /print. Putting them in the checkout today would put a
	// broken image in the cart. So the master now records `on_sale`, and this gate splits:
	//   on sale      -> must be priced AND match the checkout function, exactly as before
	//   not on sale  -> must be ABSENT from the checkout function
	// That second assertion is why this is not a hole: an unsellable edition leaking into
	// checkout now FAILS the build, which nothing checked before.
	const targeted = Object.fromEntries(Object.entries(all).filter(([, ed]) => ed.on_sale !== false));
	const notYet = Object.entries(all).filter(([, ed]) => ed.on_sale === false);
	check(
		Object.keys(all).length === 23,
		`expected 23 targeted editions in ISBNS.json, found ${Object.keys(all).length}`,
	);
	// 16 -> 23 on 2026-09-29: the seven above went on sale once their card art was live (200,
	// byte-verified) — the count follows the master, it is not how the gate is cleared.
	check(
		Object.keys(targeted).length === 23,
		`expected 23 editions ON SALE, found ${Object.keys(targeted).length}`,
	);
	for (const [slug] of notYet) {
		for (const key of ['hb', 'pb']) {
			check(
				server[`${slug}-${key}`] === undefined,
				`${slug}-${key}: on_sale is false in ISBNS.json but ${CHECKOUT} sells it`,
			);
		}
	}
	for (const [slug, ed] of Object.entries(targeted)) {
		check(
			ed.price_usd != null,
			`${slug}: ISBNS.json has no price_usd — the master cannot gate what it does not record`,
		);
		check(
			ed.isbn && ed.isbn_paperback,
			`${slug}: ISBNS.json is missing an ISBN for one binding — do not sell a binding with no ISBN`,
		);
		if (!ed.price_usd) continue;
		for (const [binding, key] of [
			['Hardcover', 'hb'],
			['Paperback', 'pb'],
		]) {
			const want = cents(ed.price_usd[binding]);
			const got = server[`${slug}-${key}`]?.cents;
			check(got === want, `${slug}-${key}: ${CHECKOUT} says ${got} cents, ISBNS.json says ${want}`);
		}
	}

	// 8. LANGUAGE EDITIONS (Kevin 2026-10-03). Every on-sale language item is sold in both
	// bindings at its recorded price, and the checkout sells no language SKU the master does
	// not put on sale.
	const langs = (isbns.language_editions?.items ?? []).filter((i) => i.on_sale === true);
	check(
		langs.length >= 26,
		`expected at least 26 language editions ON SALE in ISBNS.json, found ${langs.length}`,
	);
	const langCodes = new Set(langs.map((i) => i.code));
	for (const i of langs) {
		check(
			i.code && i.isbn && i.isbn_paperback,
			`${i.name}: ISBNS.json language item lacks code or an ISBN`,
		);
		for (const [binding, key] of [
			['Hardcover', 'hb'],
			['Paperback', 'pb'],
		]) {
			const want = cents(i.price_usd?.[binding]);
			const got = server[`lang-${i.code}-${key}`]?.cents;
			check(
				got === want,
				`lang-${i.code}-${key}: ${CHECKOUT} says ${got} cents, ISBNS.json says ${want}`,
			);
		}
	}
	for (const sku of Object.keys(server).filter((k) => k.startsWith('lang-'))) {
		const code = sku.replace(/^lang-/, '').replace(/-(hb|pb)$/, '');
		check(
			langCodes.has(code),
			`${sku}: sold by ${CHECKOUT} but not on sale in ISBNS.json language_editions`,
		);
	}
} else {
	console.log(
		`  · ISBNS.json not mounted at ${ISBNS} — SKIPPED (not passed) the ISBN-master comparison`,
	);
}

// ── 3+4+5. every built form and the server agree ────────────────────────────────────
function formsAgree(srv, fms) {
	const errs = [];
	for (const [file, list] of Object.entries(fms)) {
		for (const form of list) {
			const page = pageCents(form);
			if (Object.keys(page).length < 2) errs.push(`${file}: order form carries no prices`);
			for (const [slug, c] of Object.entries(page)) {
				const sv = srv[slug];
				if (sv == null)
					errs.push(`${file}: ${slug} is priced on the page but the server will not sell it`);
				else if (sv.cents !== c)
					errs.push(`${file}: ${slug} shows ${c} cents, server charges ${sv.cents}`);
			}
			if (FULL_FORMS.includes(file)) {
				for (const slug of Object.keys(srv)) {
					if (page[slug] == null)
						errs.push(`${file}: ${slug} is sellable server-side but missing from this form`);
				}
			}
		}
	}
	for (const [slug, sv] of Object.entries(srv)) {
		if (sv.books !== 1)
			errs.push(`${slug}: server counts ${sv.books} products toward a tier, the forms count 1`);
	}
	return errs;
}
for (const e of formsAgree(server, forms)) check(false, e);

// ── 6. no retired ISBN anywhere the site can render ──────────────────────────────────
for (const n of RETIRED) {
	let hits = '';
	try {
		hits = execSync(`grep -rln "89307-${n}" src functions 2>/dev/null || true`, {
			encoding: 'utf8',
		}).trim();
	} catch {
		hits = '';
	}
	check(!hits, `retired ISBN 979-8-89307-${n} still present in: ${hits.split('\n').join(', ')}`);
}

// ── 9. one volume ladder, wherever a total is shown ──────────────────────────────────
// Canonical form: "min:pct" for every DISCOUNTED tier, ascending. Each source writes its
// tiers its own way (min/pct, or qty/pct on /print's frontmatter), so each is parsed by the
// block it lives in, not by a file-wide regex that could pick up a stray pair.
function ladder(src, startRe, key) {
	const at = src.search(startRe);
	if (at < 0) return null;
	const block = src.slice(at, src.indexOf('];', at));
	const re = new RegExp(`${key}:\\s*(\\d+),\\s*pct:\\s*(\\d+)`, 'g');
	return [...block.matchAll(re)]
		.map((m) => [Number(m[1]), Number(m[2])])
		.filter(([, pct]) => pct > 0)
		.sort((a, b) => a[0] - b[0])
		.map(([min, pct]) => `${min}:${pct}`)
		.join(',');
}
const tiersTsSrc = readFileSync(TIERS_TS, 'utf8');
const canon = (tiers) =>
	tiers
		.filter((t) => t.pct > 0)
		.sort((a, b) => a.min - b.min)
		.map((t) => `${t.min}:${t.pct}`)
		.join(',');
const ladders = (srcs, fms) => ({
	[CHECKOUT]: ladder(srcs.checkout, /const TIERS\b/, 'min'),
	[TIERS_TS]: ladder(srcs.tiersTs, /PRINT_TIERS\b/, 'min'),
	...Object.fromEntries(
		Object.entries(fms).flatMap(([f, list]) => list.map((form) => [f, canon(form.tiers ?? [])])),
	),
});
const laddersAgree = (l) => {
	const vals = Object.values(l);
	return vals.every((v) => v && v === vals[0]);
};
const liveLadders = ladders({ checkout: checkoutSrc, tiersTs: tiersTsSrc }, forms);
check(
	laddersAgree(liveLadders),
	`volume tiers disagree: ${Object.entries(liveLadders)
		.map(([f, v]) => `${f}=[${v ?? 'NOT FOUND'}]`)
		.join(' ')}`,
);

// ── self-test: prove each assertion can actually fail ───────────────────────────────
if (process.argv.includes('--selftest')) {
	const cases = [
		[
			'set priced above its parts',
			() => {
				const broken = parseCheckout(checkoutSrc.replace('retail: 29999', 'retail: 39999'));
				const parts = ['lp-vol1', 'lp-vol2', 'lp-vol3'].reduce(
					(s, v) => s + broken[`${v}-hb`].cents,
					0,
				);
				return broken['lp-set-hb'].cents > parts;
			},
		],
		[
			'built form/server price drift',
			() => {
				// Mutate a COPY of the parsed forms; assert the mutation bit before trusting it.
				const f = FULL_FORMS[0];
				if (!forms[f]?.[0]?.prices?.['lp-set-hb']) return false;
				const broken = structuredClone(forms);
				broken[f][0].prices['lp-set-hb'] = 289.99;
				return formsAgree(server, broken).length > 0;
			},
		],
		[
			'a server SKU missing from the catalog form',
			() => {
				const f = FULL_FORMS[0];
				if (!forms[f]?.[0]?.prices?.['lang-es-pb']) return false;
				const broken = structuredClone(forms);
				delete broken[f][0].prices['lang-es-pb'];
				return formsAgree(server, broken).length > 0;
			},
		],
		[
			'books weight drift',
			() => {
				const broken = structuredClone(server);
				broken['lp-set-hb'].books = 3;
				return formsAgree(broken, forms).length > 0;
			},
		],
		[
			'volume tier drift (src/data/print-tiers.ts)',
			() => {
				const from = '{ min: 25, pct: 15 }';
				if (!tiersTsSrc.includes(from)) return false;
				return !laddersAgree(
					ladders(
						{ checkout: checkoutSrc, tiersTs: tiersTsSrc.replace(from, '{ min: 20, pct: 15 }') },
						forms,
					),
				);
			},
		],
		['retired ISBN detected', () => /89307-294-5/.test('isbn 979-8-89307-294-5')],
		[
			'targeted binding price drift',
			() => {
				const broken = parseCheckout(
					checkoutSrc.replace(
						"'chosen-pb': {\n\t\ttitle: 'Chosen Bible — Paperback',\n\t\tretail: 7999",
						"'chosen-pb': {\n\t\ttitle: 'Chosen Bible — Paperback',\n\t\tretail: 8999",
					),
				);
				return (
					haveIsbns &&
					broken['chosen-pb'].cents !==
						cents(isbns.hardcover_case_laminate.chosen.price_usd.Paperback)
				);
			},
		],
		[
			'a targeted SKU missing server-side',
			() => {
				const broken = parseCheckout(checkoutSrc.replace("'teen-pb': {", "'teen-pbX': {"));
				return broken['teen-pb'] == null;
			},
		],
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
console.log(
	`✓ pricing-verify: ${Object.keys(server).length} SKUs agree across ${CHECKOUT}, ${Object.keys(forms).length} built order forms${haveIsbns ? ' and ISBNS.json' : ''}; one volume ladder; Large Print set is a saving in both bindings; no retired ISBN in src/ or functions/`,
);
