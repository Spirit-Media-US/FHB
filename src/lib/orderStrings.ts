// THE ORDER FLOW'S STRING TABLE (unit 2kz; Kevin 2026-11-09, "2 A": localize the order flow into each
// edition's language, starting with the countries opening now). Data: src/data/order-strings/<lang>.json
// (flat keys; en.json is the source), review state per string: src/data/order-strings/_meta.json.
//
// Which language a visitor sees = the language of the page they are on. An edition page renders its
// order block in that edition's language at build time; /print/order/ takes ?lang= (the edition link
// that sent them) and applies the table in the browser, English when absent or unknown. Nothing here
// touches <html lang>, URLs, canonical or hreflang, and prices stay as they are (Stripe's Adaptive
// Pricing handles currency, and hosted Checkout localizes itself).
//
// Pure: no DOM at module scope and no ship-country data, so the browser script can import it.
import de from '../data/order-strings/de.json' with { type: 'json' };
import en from '../data/order-strings/en.json' with { type: 'json' };
import es from '../data/order-strings/es.json' with { type: 'json' };
import fr from '../data/order-strings/fr.json' with { type: 'json' };
import it from '../data/order-strings/it.json' with { type: 'json' };
import ja from '../data/order-strings/ja.json' with { type: 'json' };
import nl from '../data/order-strings/nl.json' with { type: 'json' };
import pt from '../data/order-strings/pt.json' with { type: 'json' };

export type Strings = Record<string, string>;
/** First wave = the main languages of the countries opening now. Norway has no edition or reviewed
 *  strings yet, so it stays English; CH follows the page's language (de or fr). */
export const ORDER_LANGS = ['en', 'de', 'fr', 'es', 'it', 'nl', 'pt', 'ja'] as const;
export type OrderLang = (typeof ORDER_LANGS)[number];

export const ORDER_STRINGS: Record<OrderLang, Strings> = { en, de, fr, es, it, nl, pt, ja };

/** Languages a visitor actually sees. Kevin 2026-11-09 "1 A": international checkout opens in English
 *  now; a language joins this list once its strings pass native review (_meta.json review=reviewed). */
export const LIVE_ORDER_LANGS: readonly OrderLang[] = ['en'];

/** An edition/page language code (or ?lang= value) to a live order language; English otherwise. */
export function orderLangFor(code: string | null | undefined): OrderLang {
	const c = (code ?? '').toLowerCase().split(/[-_]/)[0];
	return (LIVE_ORDER_LANGS as readonly string[]).includes(c) ? (c as OrderLang) : 'en';
}

/** Look a string up and fill {placeholders}. A missing key falls back to English, never undefined. */
export function tr(s: Strings, key: string, vars: Record<string, string | number> = {}): string {
	const raw = s[key] ?? en[key as keyof typeof en] ?? key;
	return raw.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/** A country (or print-site) name in the page's language: the platform's own CLDR data. */
export function regionName(lang: string, code: string): string {
	try {
		return new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code;
	} catch {
		return code;
	}
}
function listOf(lang: string, items: string[]): string {
	try {
		return new Intl.ListFormat(lang, { style: 'long', type: 'conjunction' }).format(items);
	} catch {
		return items.join(', ');
	}
}

/** The per-copy fee's name. marginGuard.handlingLabel decides which one applies (English text);
 *  this maps it to the page's language. */
export const feeLabel = (s: Strings, englishLabel: string): string =>
	englishLabel === 'Import & handling' ? tr(s, 'fee.import') : tr(s, 'fee.international');

/** The fee label as it reads mid-line after "+ $x.xx". English lowercases the whole label (as always);
 *  German keeps its noun capitals (Bearbeitungsgebühr); the other languages lowercase only the first
 *  letter (Japanese has no case, so it is unchanged). */
export function feeLabelInline(lang: string, label: string): string {
	if (lang === 'en') return label.toLowerCase();
	if (lang === 'de') return label;
	return label.charAt(0).toLocaleLowerCase(lang) + label.slice(1);
}

/** A displayed USD price in the page's language (we charge USD; only the formatting localizes).
 *  English is pinned to en-US so it reads exactly "$34.00". */
export function formatUsd(lang: string, cents: number): string {
	try {
		return new Intl.NumberFormat(lang === 'en' ? 'en-US' : lang, {
			style: 'currency',
			currency: 'USD',
		}).format(cents / 100);
	} catch {
		return `$${(cents / 100).toFixed(2)}`;
	}
}

/** What the shipping lines are built from (emitted as data-ships by the order components). */
export interface ShipsParts {
	/** ISO region codes of the print sites (US, GB, AU, AE) */
	sites: string[];
	/** ISO codes of every live country */
	countries: string[];
	/** a non-US country is live: say the handling fee shows before checkout */
	fee: boolean;
	/** a faster option is offered */
	fast: boolean;
}

/** shipsLine() + shipsToSentence() in the page's language (English output equals src/lib/shipCountries.ts). */
export function shipsText(lang: OrderLang, s: Strings, p: ShipsParts): string {
	const sites = listOf(
		lang,
		p.sites.map((c) => regionName(lang, c)),
	);
	const line = [
		tr(s, 'sh.worldwide', { sites }),
		p.fee ? tr(s, 'sh.fee') : '',
		p.fast ? tr(s, 'sh.fast') : '',
	]
		.filter(Boolean)
		.join(' ');
	const to =
		p.countries.length > 1
			? tr(s, 'sh.shipsTo', {
					countries: p.countries.map((c) => regionName(lang, c)).join(lang === 'ja' ? '、' : ', '),
				})
			: '';
	return `${line} ${to}`.trim();
}

/** Browser side: put the string table onto server-rendered English markup (the /print/order/ ?lang= case).
 *  Elements opt in with data-t="key" (text) or data-t-aria-label="key" (+ data-vars='{"name":..}');
 *  the tier chips, the shipping line and the country list are rebuilt from their data-* facts. */
export function applyLang(
	root: ParentNode,
	lang: OrderLang,
	s: Strings,
	vars: Record<string, string | number>,
): void {
	for (const el of root.querySelectorAll<HTMLElement>('[data-t]'))
		el.textContent = tr(s, el.dataset.t as string, vars);
	for (const el of root.querySelectorAll<HTMLElement>('[data-t-aria-label]'))
		el.setAttribute(
			'aria-label',
			tr(s, el.dataset.tAriaLabel as string, {
				...vars,
				...(el.dataset.vars ? (JSON.parse(el.dataset.vars) as Record<string, string>) : {}),
			}),
		);
	for (const el of root.querySelectorAll<HTMLElement>('[data-tier][data-min]'))
		el.textContent = tr(s, 's.tier', {
			pct: el.dataset.tier as string,
			min: el.dataset.min as string,
		});
	for (const el of root.querySelectorAll<HTMLElement>('[data-ships]'))
		el.textContent = shipsText(lang, s, JSON.parse(el.dataset.ships as string) as ShipsParts);
	for (const o of root.querySelectorAll<HTMLOptionElement>('select[data-country] option'))
		o.textContent = regionName(lang, o.value);
}
