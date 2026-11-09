// node --test scripts/order-i18n.test.mjs   (unit 2kz; Kevin 2026-11-09 "2 A": the order flow in each edition's language)
// The order-flow string table (src/data/order-strings/*.json) must be complete for every wave language,
// must not fall back to English boilerplate where a translation exists, and its English must equal the
// constants the server and the other tests share. A failing path is proven below by deleting a key.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LIVE_ORDER_LANGS, ORDER_LANGS, ORDER_STRINGS, orderLangFor, tr, shipsText } from '../src/lib/orderStrings.ts';
import { EXPEDITED_DISCLAIMER, FIRST_ORDER_FINE, FIRST_ORDER_LABEL, FIRST_ORDER_PCT } from '../src/lib/order-pricing.ts';
import { BULK_QUOTE_COPY } from '../src/lib/farBand.ts';
import { shipsLine, shipsParts, shipsToSentence } from '../src/lib/shipCountries.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'src/data/order-strings');
const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const EN = read('en.json');
const WAVE = ORDER_LANGS.filter((l) => l !== 'en');
const ph = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
// English words that must not survive in another language's string (placeholders stripped first).
const ENGLISH = /\b(the|your|free|shipping|copies|order|please|checkout|handling|delivery|returns|refund|quote|choose|email address)\b/i;
// Strings that are the same word in English and that language (reviewed by eye, not a loophole for sentences).
const SAME_OK = { fr: ['s.total'], es: ['s.total', 'c.cat.general'], nl: ['p.paperback'], de: [], it: [], pt: ['s.total'], ja: [] };

/** All problems with one language table against English; empty = clean. */
function problems(lang, table) {
	const out = [];
	for (const k of Object.keys(EN)) {
		const v = table[k];
		if (typeof v !== 'string' || !v.trim()) { out.push(`${lang}: missing key ${k}`); continue; }
		if (ph(v) !== ph(EN[k])) out.push(`${lang}: ${k} placeholders {${ph(v)}} != English {${ph(EN[k])}}`);
		if (v === EN[k] && !SAME_OK[lang]?.includes(k)) out.push(`${lang}: ${k} is untranslated English`);
		if (ENGLISH.test(v.replace(/\{\w+\}/g, ''))) out.push(`${lang}: ${k} contains English boilerplate: ${v}`);
	}
	for (const k of Object.keys(table)) if (!(k in EN)) out.push(`${lang}: extra key ${k}`);
	return out;
}

test('the wave is the 7 languages of the opening countries, plus English', () => {
	assert.deepEqual([...ORDER_LANGS], ['en', 'de', 'fr', 'es', 'it', 'nl', 'pt', 'ja']);
	// A wave language reaches visitors only once it is LIVE (native review; Kevin 2026-11-09 "1 A": English now).
	for (const l of ORDER_LANGS) assert.equal(orderLangFor(l), LIVE_ORDER_LANGS.includes(l) ? l : 'en', l);
	assert.equal(orderLangFor('pt-BR'), LIVE_ORDER_LANGS.includes('pt') ? 'pt' : 'en');
	assert.equal(orderLangFor('nb'), 'en'); // Norway: no edition or reviewed strings yet -> English
	assert.equal(orderLangFor('xx'), 'en');
	assert.equal(orderLangFor(null), 'en');
});

for (const lang of WAVE) {
	test(`${lang}: every key present, placeholders intact, no English boilerplate`, () => {
		assert.deepEqual(problems(lang, read(`${lang}.json`)), []);
		assert.deepEqual(ORDER_STRINGS[lang], read(`${lang}.json`));
	});
}

test('FAILURE PATH: a removed key, an English leftover and a lost placeholder are each caught', () => {
	const de = read('de.json');
	const gone = { ...de }; delete gone['s.total'];
	assert.ok(problems('de', gone).some((p) => p.includes('missing key s.total')));
	assert.ok(problems('de', { ...de, 's.checkout': EN['s.checkout'] }).some((p) => p.includes('untranslated English')));
	assert.ok(problems('de', { ...de, 'q.note': 'Bestellungen ab zehn Exemplaren werden angeboten.' }).some((p) => p.includes('placeholders')));
	assert.ok(problems('de', { ...de, 's.shipTo': 'Ship to the country' }).some((p) => p.includes('English boilerplate')));
	assert.ok(problems('de', { ...de, 'zz.extra': 'x' }).some((p) => p.includes('extra key')));
});

test('tr() never returns undefined: a key missing from a language falls back to English', () => {
	assert.equal(tr({}, 's.total'), EN['s.total']);
	assert.equal(tr(ORDER_STRINGS.de, 's.offerUnknown', { pct: 15 }), 'Erste Bestellung? 15 % Rabatt an der Kasse.');
});

test('English strings equal the constants the server and the other tests use', () => {
	assert.equal(tr(EN, 'p.firstOrder', { pct: FIRST_ORDER_PCT }), FIRST_ORDER_LABEL);
	assert.equal(EN['s.fine'], FIRST_ORDER_FINE);
	assert.equal(EN['s.expedited'], EXPEDITED_DISCLAIMER);
	assert.equal(EN['q.title'], BULK_QUOTE_COPY.title);
	assert.equal(tr(EN, 'q.note', { min: 10 }), BULK_QUOTE_COPY.note);
	assert.equal(tr(EN, 'q.error', { min: 10 }), BULK_QUOTE_COPY.error);
	assert.equal(tr(EN, 's.offerUnknown', { pct: FIRST_ORDER_PCT }), `First order? ${FIRST_ORDER_PCT}% off at checkout.`);
});

test('the one reviewed string (first-order offer) is the community reader string verbatim', () => {
	for (const lang of WAVE) {
		const f = `/srv/sites/community/src/i18n/${lang}.json`;
		if (!fs.existsSync(f)) continue; // community checkout absent in CI: skip, the meta still records the source
		const offer = JSON.parse(fs.readFileSync(f, 'utf8')).print.offer;
		assert.equal(tr(ORDER_STRINGS[lang], 'p.firstOrder', { pct: FIRST_ORDER_PCT }), offer, lang);
	}
});

test('review state: every string of every wave language is recorded, none invented', () => {
	const meta = read('_meta.json').langs;
	for (const lang of WAVE) {
		assert.deepEqual(Object.keys(meta[lang]).sort(), Object.keys(EN).sort(), lang);
		for (const [k, m] of Object.entries(meta[lang])) {
			assert.ok(['reviewed', 'pending-native'].includes(m.review), `${lang} ${k}`);
			if (m.review === 'reviewed') assert.match(m.source, /community\/src\/i18n/, `${lang} ${k}`);
		}
	}
});

test('the shipping line is rebuilt from facts; English is NOT routed through it (stays shipsLine())', () => {
	const p = shipsParts();
	assert.ok(p.sites.length >= 1 && p.countries.length >= 19 && p.fee === true);
	const de = shipsText('de', ORDER_STRINGS.de, p);
	assert.ok(de.startsWith('Kostenloser Standardversand weltweit.'), de);
	assert.ok(de.includes('Vereinigtes Königreich') && de.includes('Wir liefern in:'), de);
	assert.ok(!/Free standard|Ships to/.test(de));
	assert.ok(shipsLine().startsWith('Free standard shipping worldwide'));
	assert.ok(shipsToSentence().startsWith('Ships to:'));
	const ja = shipsText('ja', ORDER_STRINGS.ja, p);
	assert.ok(ja.includes('日本') && ja.includes('配送先'), ja);
});

// Built output (npm run build runs this after astro build). Skipped when dist is absent.
const dist = (f) => path.join(root, 'dist', f);
const built = fs.existsSync(dist('bibles/german-bible/index.html'));
for (const [slug, lang] of [['german-bible', 'de'], ['french-bible', 'fr'], ['spanish-bible', 'es'], ['italian-bible', 'it'], ['dutch-bible', 'nl'], ['portuguese-bible', 'pt'], ['japanese-bible', 'ja']]) {
	test(`built /bibles/${slug}/: order block in ${lang} once live (English until then), html lang and canonical untouched`, { skip: !built && 'no dist' }, () => {
		const h = fs.readFileSync(dist(`bibles/${slug}/index.html`), 'utf8');
		if (!LIVE_ORDER_LANGS.includes(lang)) {
			assert.ok(h.includes('Order direct') && !h.includes(`data-lang="${lang}"`), `${lang} not live: block must stay English`);
			return;
		}
		const S = ORDER_STRINGS[lang];
		const start = h.indexOf('id="order"');
		const block = h.slice(start, h.indexOf('data-msg', start) + 120); // the order block only, not the page's English body below it
		assert.ok(block.includes(`data-lang="${lang}"`));
		assert.ok(block.includes(S['o.eyebrow']), 'eyebrow');
		assert.ok(block.includes(S['p.paperback']) && block.includes(S['s.checkout'].replace('→', '').trim()), 'binding + checkout');
		assert.ok(block.includes(S['s.expedited'].replace(/'/g, '&#39;')) || block.includes(S['s.expedited']), 'expedited disclaimer');
		for (const en of ['Order direct', 'Paperback', 'Checkout', 'Ship to', 'Total<', 'First order?']) if (!Object.values(S).some((v) => v === en.replace('<', ''))) assert.ok(!block.includes(en), `English "${en}" left in ${lang} block`);
		assert.match(h, /^<!DOCTYPE html><html lang="en"/);
		assert.ok(h.includes(`rel="canonical" href="https://fathersheartbible.com/bibles/${slug}/"`));
	});
}
test('built: a language we do not translate yet stays English, and /print/order/ ships English with the hooks', { skip: !built && 'no dist' }, () => {
	const h = fs.readFileSync(dist('bibles/korean-bible/index.html'), 'utf8');
	assert.ok(h.includes('Order direct') && !h.includes('data-lang="ko"'));
	const o = fs.readFileSync(dist('print/order/index.html'), 'utf8');
	assert.ok(o.includes('Catalog Order Form') && o.includes('data-t="c.h1"') && o.includes('data-ships='));
	assert.ok(!o.includes('hreflang="de"'));
});
