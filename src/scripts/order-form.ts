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
import { FIRST_ORDER_LABEL, quote, type Tier } from '../lib/order-pricing';

interface Config {
	prices: Record<string, number>;
	tiers: Tier[];
	returnPath?: string;
}

const money = (cents: number) =>
	`$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function init(root: HTMLElement) {
	const cfg = JSON.parse(root.dataset.order ?? '{}') as Config;
	const counts: Record<string, number> = {};
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
		set('[data-search-msg]', term && !hits ? 'No edition matches that search.' : '');
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
			.map(([k, n]) => ({ cents: Math.round(cfg.prices[k] * 100), qty: n }));
	}
	function render() {
		const r = quote(lines(), cfg.tiers);
		const total = r.best === 'first' ? r.firstTotal : r.bulkTotal;
		set('[data-sum-copies]', String(r.copies));
		set('[data-sum-copies-word]', r.copies === 1 ? 'copy' : 'copies');
		set('[data-sum-subtotal]', money(r.subtotal));
		set('[data-sum-total]', money(total));
		const disc = qa('[data-sum-disc]');
		for (const d of disc) d.hidden = r.best === 'none';
		set(
			'[data-sum-disc-label]',
			r.best === 'first' ? FIRST_ORDER_LABEL : `Volume discount, ${r.bulkPct}%`,
		);
		set('[data-sum-disc-amt]', `−${money(r.subtotal - total)}`);
		for (const s of qa('[data-sum-subtotal]')) s.classList.toggle('is-struck', r.best !== 'none');
		for (const t of qa('[data-tier]'))
			t.toggleAttribute('data-on', Number(t.dataset.tier) === r.bulkPct && r.bulkPct > 0);
	}

	// ── checkout ──
	const email = q<HTMLInputElement>('[data-email]');
	const msg = q('[data-msg]');
	const say = (t: string) => {
		if (msg) {
			msg.textContent = t;
			msg.hidden = !t;
		}
	};
	q('[data-checkout]')?.addEventListener('click', async (ev) => {
		const btn = ev.currentTarget as HTMLButtonElement;
		if (!lines().length) return say('Choose at least one copy to continue.');
		if (email && !email.checkValidity()) {
			email.focus();
			return say('Enter your email to continue.');
		}
		say('Opening secure checkout…');
		btn.disabled = true;
		try {
			const res = await fetch('/dvc-checkout', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					counts: Object.fromEntries(Object.entries(counts).filter(([, n]) => n > 0)),
					email: email?.value.trim() ?? '',
					returnPath: cfg.returnPath,
				}),
			});
			const d = (await res.json()) as { url?: string; disabled?: boolean };
			if (d.url) {
				window.location.href = d.url;
				return;
			}
			say(
				d.disabled
					? 'Direct ordering opens shortly — please check back.'
					: 'Sorry, something went wrong. Please try again.',
			);
		} catch {
			say('Sorry, something went wrong. Please try again.');
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
}

for (const root of document.querySelectorAll<HTMLElement>('[data-order]')) init(root);
