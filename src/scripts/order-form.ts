// THE ONE ORDER-FORM CONTROLLER for every print order form on the site (Kevin 2026-10-03):
// the language quick order (/bibles/<language>-bible/#order) and the catalog order form
// (CatalogOrderForm, on /print and /print/order/). Each form is a [data-order] root carrying its prices
// and tiers as JSON; the arithmetic is src/lib/order-pricing.ts, which the server imports too,
// so the total shown is the total Stripe charges. The server stays authoritative either way.
//
// Two control shapes, both handled here:
//   · BindingQty — two counters, `.qty-in[data-slug]` / `.qty-step[data-slug]`
//   · a [data-row] — one counter plus a Hardback/Paperback toggle ([data-bind]); the counter
//     edits whichever binding is pressed, and each binding keeps its own count
// Every catalog row keeps its own counts, so a buyer builds the order edition by edition and
// nothing resets; /print's cards ([data-pick-edition]) pre-fill a row without touching the rest.

import en from '../data/order-strings/en.json';
import { BULK_QUOTE_MIN, bulkQuoteMailto, bulkQuoteRequired } from '../lib/farBand';
import { firstStateFrom } from '../lib/firstOrderGuard';
import {
	FIRST_ORDER_PCT,
	feeKey,
	handlingFor,
	type IntlRow,
	quote,
	type Tier,
	unitAfter,
	volumesFor,
} from '../lib/order-pricing';
import {
	applyLang,
	feeLabel,
	feeLabelInline,
	formatUsd,
	type OrderLang,
	orderLangFor,
	regionName,
	type Strings,
	tr,
} from '../lib/orderStrings';

// /print/order/ carries every language's table in <script id="order-strings" type="application/json"> (edition
// pages carry their own in data-order, rendered at build time); it is used only when ?lang= asks for one.
const allTables = (): Record<string, Strings> => {
	try {
		return JSON.parse(document.getElementById('order-strings')?.textContent ?? '{}');
	} catch {
		return {};
	}
};

interface Config {
	prices: Record<string, number>;
	tiers: Tier[];
	returnPath?: string;
	/** per-country international handling fee, embedded at build (Kevin 2026-11-08); US has no entry */
	intl?: Record<string, IntlRow>;
	/** far_band country codes (unit 2kx): no volume ladder; 10+ copies are a bulk quote, not checkout */
	farBand?: string[];
	/** the page's order language and its string table (absent = English) */
	lang?: OrderLang;
	s?: Strings;
}

function init(root: HTMLElement) {
	const cfg = JSON.parse(root.dataset.order ?? '{}') as Config;
	const counts: Record<string, number> = {};
	let S: Strings = cfg.s ?? en;
	let lang: OrderLang = cfg.lang ?? 'en';
	const money = (cents: number) => formatUsd(lang, cents);
	const t = (key: string, v: Record<string, string | number> = {}) =>
		tr(S, key, { pct: FIRST_ORDER_PCT, min: BULK_QUOTE_MIN, ...v });
	const firstLabel = () => t('p.firstOrder');
	const q = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T & Element>(sel);
	const qa = <T extends Element = HTMLElement>(sel: string) => [
		...root.querySelectorAll<T & Element>(sel),
	];
	const set = (sel: string, text: string) => {
		for (const el of qa(sel)) el.textContent = text;
	};

	// ── row controls ──
	const rowSku = (row: HTMLElement) => `${row.dataset.id}-${row.dataset.bind ?? 'hb'}`;
	function paintRow(row: HTMLElement) {
		const input = row.querySelector<HTMLInputElement>('[data-qty]');
		if (input) input.value = String(counts[rowSku(row)] ?? 0);
		for (const b of row.querySelectorAll<HTMLElement>('[data-bind]')) {
			const on = b.dataset.bind === (row.dataset.bind ?? 'hb');
			b.setAttribute('aria-pressed', String(on));
			const n = counts[`${row.dataset.id}-${b.dataset.bind}`] ?? 0;
			const badge = b.querySelector('[data-seg-count]');
			if (badge) {
				badge.textContent = n ? `× ${n}` : '';
				(badge as HTMLElement).hidden = !n;
			}
		}
		row.toggleAttribute(
			'data-has-qty',
			Boolean(counts[`${row.dataset.id}-hb`] || counts[`${row.dataset.id}-pb`]),
		);
	}
	for (const row of qa('[data-row]')) {
		for (const b of row.querySelectorAll<HTMLElement>('[data-bind]')) {
			b.addEventListener('click', () => {
				row.dataset.bind = b.dataset.bind;
				paintRow(row);
			});
		}
		for (const s of row.querySelectorAll<HTMLElement>('[data-step]')) {
			s.addEventListener('click', () => {
				const k = rowSku(row);
				counts[k] = Math.max(0, (counts[k] ?? 0) + Number(s.dataset.step));
				paintRow(row);
				render();
			});
		}
		row.querySelector<HTMLInputElement>('[data-qty]')?.addEventListener('input', (ev) => {
			counts[rowSku(row)] = Math.max(
				0,
				Math.floor(Number((ev.target as HTMLInputElement).value) || 0),
			);
			paintRow(row);
			render();
		});
	}

	// ── BindingQty controls ──
	for (const b of qa('.qty-step[data-slug]')) {
		b.addEventListener('click', () => {
			const s = b.dataset.slug as string;
			counts[s] = Math.max(0, (counts[s] ?? 0) + Number(b.dataset.dir));
			const input = q<HTMLInputElement>(`.qty-in[data-slug="${s}"]`);
			if (input) input.value = String(counts[s]);
			render();
		});
	}
	for (const el of qa<HTMLInputElement>('.qty-in[data-slug]')) {
		el.addEventListener('input', () => {
			counts[el.dataset.slug as string] = Math.max(0, Math.floor(Number(el.value) || 0));
			render();
		});
	}

	// ── catalog search: filter rows, open the sections that hold a match ──
	const search = q<HTMLInputElement>('[data-search]');
	const sections = qa('[data-section]');
	function filter(jump: boolean) {
		const term = (search?.value ?? '').toLowerCase().replace(/['’]/g, '').trim();
		let first: HTMLElement | null = null;
		let hits = 0;
		for (const sec of sections) {
			let n = 0;
			for (const row of sec.querySelectorAll<HTMLElement>('[data-row]')) {
				const ok = !term || (row.dataset.search ?? '').includes(term);
				row.hidden = !ok;
				if (ok) {
					n++;
					first ??= row;
				}
			}
			hits += n;
			sec.hidden = Boolean(term) && n === 0;
			if (term) setOpen(sec, n > 0);
		}
		set('[data-search-msg]', term && !hits ? t('c.noMatch') : '');
		if (jump && term && first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}
	search?.addEventListener('input', () => filter(false));
	search?.addEventListener('keydown', (ev) => {
		if (ev.key === 'Enter') {
			ev.preventDefault();
			filter(true);
		}
	});

	// ── accordions: a real button with aria-expanded controls each panel ──
	function setOpen(sec: HTMLElement, open: boolean) {
		const btn = sec.querySelector<HTMLElement>('[data-acc]');
		const panel = sec.querySelector<HTMLElement>('[data-panel]');
		btn?.setAttribute('aria-expanded', String(open));
		if (panel) panel.hidden = !open;
	}
	for (const sec of sections) {
		sec.querySelector('[data-acc]')?.addEventListener('click', () => {
			setOpen(sec, sec.querySelector('[data-acc]')?.getAttribute('aria-expanded') !== 'true');
		});
	}

	// ── /print's cards: "Buy Direct" (and the Large Print set's two buttons) pre-fill that
	// edition's catalog row (Kevin 2026-10-04): open its section, pick the binding, one copy if
	// it has none, scroll to it. Every other row keeps its count.
	for (const a of document.querySelectorAll<HTMLElement>('[data-pick-edition]')) {
		const row = q(`[data-row][data-id="${a.dataset.pickEdition}"]`);
		if (!row) continue;
		a.addEventListener('click', (ev) => {
			ev.preventDefault();
			if (row.hidden && search) {
				search.value = '';
				filter(false);
			}
			const sec = row.closest<HTMLElement>('[data-section]');
			if (sec) setOpen(sec, true);
			if (a.dataset.pickBind) row.dataset.bind = a.dataset.pickBind;
			counts[rowSku(row)] ||= 1;
			paintRow(row);
			render();
			row.scrollIntoView({ behavior: 'smooth', block: 'center' });
		});
	}

	// ── summary ──
	function lines() {
		return Object.entries(counts)
			.filter(([k, n]) => n > 0 && cfg.prices[k] != null)
			.map(([k, n]) => ({ slug: k, cents: Math.round(cfg.prices[k] * 100), qty: n }));
	}
	const countryRow = (): { code: string; row: IntlRow | undefined } => {
		const code = q<HTMLSelectElement>('[data-country]')?.value ?? 'US';
		return { code, row: cfg.intl?.[code] };
	};
	// The fee beside each price, BEFORE checkout (no drip pricing). The price shown is the
	// first-order unit price, so the fee shown is the one sized on that price.
	function paintFees() {
		const { code, row } = countryRow();
		for (const el of qa('[data-fee-sku]')) {
			const sku = el.dataset.feeSku as string;
			const list = cfg.prices[sku];
			const fee =
				row && list != null
					? (row.fees[feeKey(sku, unitAfter(Math.round(list * 100), FIRST_ORDER_PCT))] ?? 0)
					: 0;
			el.hidden = !(row && fee > 0);
			el.textContent =
				row && fee > 0
					? `+ ${money(fee)} ${feeLabelInline(lang, feeLabel(S, row.label))}${el.hasAttribute('data-fee-full') ? ` (${countryName(code, row)})` : ''}`
					: '';
		}
	}
	// FIRST-ORDER STATE (no understated totals): 'unknown' until an email is entered and the server
	// confirms; only 'first' counts the 15%. Before that the total is list price + fee, and the form
	// says "First order? 15% off at checkout." A repeat buyer sees no offer at all.
	let firstState: 'unknown' | 'first' | 'repeat' = 'unknown';
	function paintOffer() {
		for (const el of qa('[data-offer]')) el.hidden = firstState === 'repeat';
		set('[data-offer-label]', firstState === 'first' ? firstLabel() : t('s.offerUnknown'));
	}
	// A country's name in the page's language (English keeps the name the data file carries).
	const countryName = (code: string, row?: IntlRow) =>
		lang === 'en' ? (row?.name ?? code) : regionName(lang, code);
	const isFar = () => (cfg.farBand ?? []).includes(countryRow().code);
	// Physical copies (a Large Print set is three volumes) - the same count the server uses.
	const volumes = () => lines().reduce((s, l) => s + l.qty * volumesFor(l.slug), 0);
	const titleOf = (sku: string) => {
		const id = sku.replace(/-(hb|pb)$/, '');
		const name = q(`[data-row][data-id="${id}"] .orow__name`)?.textContent?.trim() ?? id;
		// The quote email goes to our team, so its text stays English whatever the page's language.
		return `${name} (${sku.endsWith('-pb') ? 'Paperback' : 'Hardback'})`;
	};
	// Far band + 10 or more copies: Checkout steps aside for "Request a bulk quote" (mailto,
	// prefilled from the form). The server refuses the same order, so this is a courtesy, not the gate.
	function paintQuote() {
		const need = bulkQuoteRequired(isFar(), volumes());
		for (const el of qa('[data-checkout]')) el.hidden = need;
		for (const el of qa('[data-quote]')) el.hidden = !need;
		for (const el of qa('[data-tiers-line]')) el.hidden = isFar();
		if (!need) return;
		const countrySel = q<HTMLSelectElement>('[data-country]');
		const link = q<HTMLAnchorElement>('[data-quote-link]');
		if (link)
			link.href = bulkQuoteMailto({
				name: q<HTMLInputElement>('[data-quote-name]')?.value.trim() ?? '',
				email: email?.value.trim() ?? '',
				country: countrySel?.selectedOptions[0]?.textContent ?? countryRow().code,
				editions: lines().map((l) => ({ title: titleOf(l.slug), qty: l.qty })),
				copies: volumes(),
			});
	}
	function render() {
		// 1A: the first-order 15% is offered everywhere. Outside the US it comes off each unit
		// (the server does the same), so it rounds per unit.
		const { code, row } = countryRow();
		const far = isFar();
		const r = quote(lines(), far ? [] : cfg.tiers, code !== 'US', firstState === 'first');
		const base = r.best === 'first' ? r.firstTotal : r.bulkTotal;
		const appliedPct = r.best === 'first' ? FIRST_ORDER_PCT : r.best === 'bulk' ? r.bulkPct : 0;
		const h = handlingFor(lines(), appliedPct, row);
		const total = base + h.total;
		paintFees();
		paintOffer();
		paintQuote();
		for (const n of qa('[data-expedited-note]')) n.hidden = !row;
		for (const d of qa('[data-sum-fee]')) d.hidden = h.total <= 0;
		set('[data-sum-fee-label]', row ? `${feeLabel(S, row.label)} (${countryName(code, row)})` : '');
		set('[data-sum-fee-amt]', money(h.total));
		set('[data-sum-copies]', String(r.copies));
		set('[data-sum-copies-word]', r.copies === 1 ? t('s.copy') : t('s.copies'));
		set('[data-sum-subtotal]', money(r.subtotal));
		set('[data-sum-total]', money(total));
		const disc = qa('[data-sum-disc]');
		for (const d of disc) d.hidden = r.best === 'none';
		set(
			'[data-sum-disc-label]',
			r.best === 'first' ? firstLabel() : t('s.volumeDiscount', { pct: r.bulkPct }),
		);
		set('[data-sum-disc-amt]', `−${money(r.subtotal - base)}`);
		for (const s of qa('[data-sum-subtotal]')) s.classList.toggle('is-struck', r.best !== 'none');
		for (const chip of qa('[data-tier]'))
			chip.toggleAttribute('data-on', Number(chip.dataset.tier) === r.bulkPct && r.bulkPct > 0);
	}

	q<HTMLSelectElement>('[data-country]')?.addEventListener('change', render);
	q<HTMLInputElement>('[data-quote-name]')?.addEventListener('input', render);

	// ── checkout ──
	const email = q<HTMLInputElement>('[data-email]');
	const msg = q('[data-msg]');
	// Ask the server (the same check checkout uses) once the email looks valid; any failure leaves
	// the total at list price, which can only be higher than what is charged, never lower.
	let askId = 0;
	let askTimer: number | undefined;
	async function askFirst() {
		const id = ++askId;
		if (!email || !email.value.trim() || !email.checkValidity()) return;
		try {
			const res = await fetch('/dvc-checkout', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ firstOrderCheck: true, email: email.value.trim() }),
			});
			const d = await res.json();
			if (id !== askId) return;
			firstState = firstStateFrom(d);
		} catch {
			if (id !== askId) return;
			firstState = 'unknown';
		}
		render();
	}
	email?.addEventListener('input', paintQuote);
	email?.addEventListener('input', () => {
		askId++;
		window.clearTimeout(askTimer);
		if (firstState !== 'unknown') {
			firstState = 'unknown';
			render();
		}
		askTimer = window.setTimeout(askFirst, 600);
	});
	email?.addEventListener('change', () => {
		window.clearTimeout(askTimer);
		askFirst();
	});
	const say = (t: string) => {
		if (msg) {
			msg.textContent = t;
			msg.hidden = !t;
		}
	};
	q('[data-checkout]')?.addEventListener('click', async (ev) => {
		const btn = ev.currentTarget as HTMLButtonElement;
		if (!lines().length) return say(t('m.choose'));
		if (email && !email.checkValidity()) {
			email.focus();
			return say(t('m.email'));
		}
		say(t('m.opening'));
		btn.disabled = true;
		try {
			const res = await fetch('/dvc-checkout', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					counts: Object.fromEntries(Object.entries(counts).filter(([, n]) => n > 0)),
					email: email?.value.trim() ?? '',
					// Only rendered when more than one country is live; the server defaults to US.
					country: q<HTMLSelectElement>('[data-country]')?.value,
					returnPath: cfg.returnPath,
				}),
			});
			const d = (await res.json()) as { url?: string; disabled?: boolean; error?: string };
			if (d.url) {
				window.location.href = d.url;
				return;
			}
			if (d.error === 'bulk_quote_required') {
				render();
				say(t('q.error'));
				btn.disabled = false;
				return;
			}
			say(d.disabled ? t('m.disabled') : t('m.error'));
		} catch {
			say(t('m.error'));
		}
		btn.disabled = false;
	});

	// A mobile summary bar's button brings the full summary (email + Checkout) into view.
	q('[data-to-summary]')?.addEventListener('click', () => {
		q('[data-summary]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
		window.setTimeout(() => email?.focus({ preventScroll: true }), 450);
	});

	// ...shows only while the form is on screen (on /print the form is one section of a long
	// page), and steps aside while the summary itself is, so it never covers Checkout.
	const bar = q('[data-bar]');
	const summary = q('[data-summary]');
	if (bar && summary && 'IntersectionObserver' in window) {
		let formOn = false;
		let summaryOn = false;
		const paintBar = () => bar.toggleAttribute('data-away', !formOn || summaryOn);
		new IntersectionObserver(([e]) => {
			summaryOn = e.isIntersecting;
			paintBar();
		}).observe(summary);
		new IntersectionObserver(([e]) => {
			formOn = e.isIntersecting;
			paintBar();
		}).observe(root);
	} else bar?.removeAttribute('data-away');

	for (const row of qa('[data-row]')) paintRow(row);
	render();

	// /print/order/?lang=de: the link on a German edition page. Unknown or absent = stay English.
	const want =
		!cfg.lang && window.location.pathname.replace(/\/$/, '') === '/print/order'
			? orderLangFor(new URLSearchParams(window.location.search).get('lang'))
			: 'en';
	const table = want === 'en' ? undefined : allTables()[want];
	if (table) {
		S = table;
		lang = want;
		applyLang(document, lang, S, { pct: FIRST_ORDER_PCT, min: BULK_QUOTE_MIN });
		render();
	}
}

for (const root of document.querySelectorAll<HTMLElement>('[data-order]')) init(root);
