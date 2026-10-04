// THE ONE ORDER-FORM CONTROLLER for every print order form on the site (Kevin 2026-10-03):
// the language quick order (/bibles/<language>-bible/#order), /print's quick order box and
// the catalog order form /print/order/. Each form is a [data-order] root carrying its prices
// and tiers as JSON; the arithmetic is src/lib/order-pricing.ts, which the server imports too,
// so the total shown is the total Stripe charges. The server stays authoritative either way.
//
// Two control shapes, both handled here:
//   · BindingQty — two counters, `.qty-in[data-slug]` / `.qty-step[data-slug]`
//   · a [data-row] — one counter plus a Hardback/Paperback toggle ([data-bind]); the counter
//     edits whichever binding is pressed, and each binding keeps its own count
// /print's quick box adds an edition picker ([data-pick]) over its one row and an order list
// ([data-cart]): switching edition never clears the order, so a buyer builds it edition by edition.
import { FIRST_ORDER_LABEL, firstOrderUnit, quote, type Tier } from '../lib/order-pricing';

interface Config {
	prices: Record<string, number>;
	tiers: Tier[];
	returnPath?: string;
	/** quick box: edition id -> name, for the running order list */
	names?: Record<string, string>;
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

	// ── quick box: the edition picker re-points its one row at another edition ──
	// The ORDER survives the switch (Kevin 2026-10-04): every edition keeps its own counts, the
	// row shows the picked edition's (0 if new), and the order list below holds them all.
	const picker = q<HTMLSelectElement>('[data-pick]');
	function pick(id: string, bind?: string) {
		const row = q('[data-row]');
		if (!row || !cfg.prices[`${id}-hb`]) return;
		row.dataset.id = id;
		if (bind) row.dataset.bind = bind;
		for (const b of ['hb', 'pb']) {
			const cents = Math.round(cfg.prices[`${id}-${b}`] * 100);
			set(`[data-list="${b}"]`, money(cents));
			set(`[data-first="${b}"]`, money(firstOrderUnit(cents)));
		}
		if (picker && picker.value !== id) picker.value = id;
		paintRow(row);
		render();
	}
	picker?.addEventListener('change', () => pick(picker.value));
	// /print's cards: "Buy Direct" (and the Large Print set's two buttons) pre-select that
	// edition and binding in the quick box with one copy, and bring the box into view.
	if (picker) {
		for (const a of document.querySelectorAll<HTMLElement>('[data-pick-edition]')) {
			a.addEventListener('click', () => {
				pick(a.dataset.pickEdition as string, a.dataset.pickBind);
				const row = q('[data-row]');
				if (!row) return;
				counts[rowSku(row)] ||= 1;
				paintRow(row);
				render();
				if (a.tagName !== 'A') root.scrollIntoView({ behavior: 'smooth', block: 'center' });
			});
		}
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

	// ── quick box: the running order list, one line per edition × binding ──
	const cart = q('[data-cart]');
	const BIND_NAME: Record<string, string> = { hb: 'Hardback', pb: 'Paperback' };
	function paintCart() {
		if (!cart) return;
		const list = cart.querySelector('[data-cart-list]');
		if (!list) return;
		const items = Object.entries(counts).filter(([k, n]) => n > 0 && cfg.prices[k] != null);
		(cart.querySelector('[data-cart-empty]') as HTMLElement | null)?.toggleAttribute(
			'hidden',
			items.length > 0,
		);
		list.replaceChildren(
			...items.map(([sku, n]) => {
				const bind = sku.slice(-2);
				const id = sku.slice(0, -3);
				const li = document.createElement('li');
				li.className = 'qcart__line';
				li.dataset.sku = sku;
				const name = document.createElement('button');
				name.type = 'button';
				name.className = 'qcart__name';
				name.dataset.cartEdit = '';
				name.textContent = `${cfg.names?.[id] ?? id} · ${BIND_NAME[bind] ?? bind}`;
				const qty = document.createElement('span');
				qty.className = 'qcart__qty';
				for (const [step, label, text] of [
					['-1', 'One fewer', '−'],
					['1', 'One more', '+'],
				]) {
					const b = document.createElement('button');
					b.type = 'button';
					b.className = 'qcart__step';
					b.dataset.cartStep = step;
					b.setAttribute('aria-label', `${label}, ${name.textContent}`);
					b.textContent = text;
					if (step === '1') {
						const v = document.createElement('span');
						v.className = 'qcart__n';
						v.textContent = String(n);
						qty.append(v);
					}
					qty.append(b);
				}
				const total = document.createElement('span');
				total.className = 'qcart__total';
				total.textContent = money(Math.round(cfg.prices[sku] * 100) * n);
				const rm = document.createElement('button');
				rm.type = 'button';
				rm.className = 'qcart__rm';
				rm.dataset.cartRemove = '';
				rm.setAttribute('aria-label', `Remove ${name.textContent}`);
				rm.textContent = '×';
				li.append(name, qty, total, rm);
				return li;
			}),
		);
		// the picker marks every edition already in the order
		if (picker) {
			for (const o of picker.options) {
				o.dataset.base ??= o.text;
				const n = (counts[`${o.value}-hb`] ?? 0) + (counts[`${o.value}-pb`] ?? 0);
				o.text = n ? `${o.dataset.base} (${n} in order)` : o.dataset.base;
			}
		}
	}
	cart?.addEventListener('click', (ev) => {
		const t = (ev.target as HTMLElement).closest<HTMLElement>('button');
		const sku = t?.closest<HTMLElement>('[data-sku]')?.dataset.sku;
		if (!t || !sku) return;
		if (t.dataset.cartStep)
			counts[sku] = Math.max(0, (counts[sku] ?? 0) + Number(t.dataset.cartStep));
		else if (t.dataset.cartRemove != null) counts[sku] = 0;
		else if (t.dataset.cartEdit != null) {
			pick(sku.slice(0, -3), sku.slice(-2));
			q('[data-row]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
			return;
		}
		const row = q('[data-row]');
		if (row) paintRow(row);
		render();
		// the list is rebuilt; keep keyboard focus on the same control
		const sel = t.dataset.cartStep
			? `[data-cart-step="${t.dataset.cartStep}"]`
			: '[data-cart-remove]';
		(cart.querySelector(`[data-sku="${sku}"] ${sel}`) as HTMLElement | null)?.focus();
	});

	// ── summary ──
	function lines() {
		return Object.entries(counts)
			.filter(([k, n]) => n > 0 && cfg.prices[k] != null)
			.map(([k, n]) => ({ cents: Math.round(cfg.prices[k] * 100), qty: n }));
	}
	function render() {
		paintCart();
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

	// ...and steps aside while the summary itself is on screen, so it never covers Checkout.
	const bar = q('[data-bar]');
	const summary = q('[data-summary]');
	if (bar && summary && 'IntersectionObserver' in window) {
		new IntersectionObserver(([e]) => {
			bar.toggleAttribute('data-away', e.isIntersecting);
		}).observe(summary);
	}

	for (const row of qa('[data-row]')) paintRow(row);
	render();
}

for (const root of document.querySelectorAll<HTMLElement>('[data-order]')) init(root);
