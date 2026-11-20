// /print-webhook — Stripe webhook for every store sale (Cloudflare Pages Function).
//
// On `checkout.session.completed` it emails us the fulfilment details and the buyer
// their confirmation, then stamps `notified_at` on the session so an order nobody was
// told about can be found later. Covers all three kinds the store creates:
// `dvc_print` (the live /print checkout), `print_bulk` (the retired 25-copy path) and
// `ebook_direct`. Signature-verified with STRIPE_PRINT_WEBHOOK_SECRET.
//
// It ACKs 2xx for anything it deliberately ignores, but answers 5xx when an email
// genuinely failed, so Stripe redelivers instead of the order vanishing quietly.
//
// NB: path is /print-webhook, not /api/* — the apex router proxies /api/* to
// the community app, so this marketing function lives off that prefix.

import { ebookLinkUrl, windowOrigin } from '../src/lib/ebookLink.ts';
import { BOOK_SKUS, readBreakdown } from '../src/lib/order-pricing.ts';
import { countryFor } from '../src/lib/shipCountries.ts';
import { EBOOK_SKUS } from '../src/lib/storeEngine.ts';

interface Env {
	STRIPE_PRINT_WEBHOOK_SECRET?: string;
	// Also used to stamp notified_at back onto the session (see markNotified).
	STRIPE_FHB_SECRET_KEY?: string;
	MAILGUN_API_KEY?: string;
	MAILGUN_SENDING_DOMAIN?: string;
	PRINT_ORDER_NOTIFY_TO?: string;
}

// Kevin 2026-11-16 (Option C item 10): "The order emails show FHB Orders. Should be SMP Orders." Every order email.
export const NOTIFY_FROM = 'SMP Orders <orders@send.spiritmediapublishing.com>';
// ...and "add our address to the bottom signature of each email": every BUYER order email (print, both windows, and the
// eBook email) ends with this, verbatim, below the item-8 window line. Mirrored in bin/fhb-order-reconcile.py.
export const SIGNATURE = [
	'Spirit Media Publishing',
	'205 S Academy St Unit 3251',
	'Cary, NC 27519',
	'USA',
	'Tel. 1-888-800-3744',
	'spiritmediapublishing.com',
	'fathersheartbible.com',
].join('\n');
const NOTIFY_TO_DEFAULT = 'kevin@spiritmediapublishing.com';
// Contact us = hello@ at every step (Kevin 2026-11-16): the BUYER's emails reply there. Kevin's internal notification
// keeps its own Reply-To (the buyer) and its own recipient.
export const BUYER_REPLY_TO = 'hello@spiritmediapublishing.com';

// ONE STORE = Spirit Media Publishing for every order, FHB or not (Kevin 2026-11-20 ~16:07Z: "This needs to be cleaned up
// NOW and everywhere as the store is NOW Spirit Media Publishing whether it is FHB or not. It is confusing for SMP books
// to show order confrimation FHB."). Supersedes the 2026-11-16 "1A" two-window subjects/sign-offs: every buyer email is
// "Your Spirit Media Publishing order" with NO window line above the address signature (Kevin 2026-11-16 15:42Z: the
// signature already says it). Product names (Father's Heart Bible editions) stay in the line items.
// `window` is still computed (session Option C tag, else site) because it routes the SIGNED eBook link to its own site
// (windowOrigin) and is logged on Kevin's notice; it no longer brands anything the buyer reads.
// signoffBlock() stays the one place a window line could be written: it now always receives ''.
export function buyerBrand(m: Record<string, string> | null | undefined, amount: string) {
	const w = m?.window || (m?.site && m.site !== 'fhb' ? 'smp' : 'fhb');
	return {
		window: w === 'smp' ? 'smp' : 'fhb',
		subject: `Your Spirit Media Publishing order — ${amount}`,
		signoff: '',
	};
}
export const signoffBlock = (signoff: string) => (signoff ? `${signoff}\n\n` : '');

// GIFT TO CHARITY on a RIAB order (SMP src/lib/riabOrder.ts (c); Kevin 2026-11-20 ~16:10Z optional gift designated CF /
// FOH / 50-50, ~16:20Z "receipted from spirit media charities with 100% going to the charities", ~16:25Z "Each order
// with donation receives 2 emails one for purchase confirmation. One for donation confirmation to be used as tax
// deductible receipt.", ~16:30Z "100% of the amount received"). The session carries metadata donation_cents (the gift),
// designation (cf|foh|split), fee_covered, donation_fee_cover_cents, donation_total_cents (what the donor gave = the
// receipt amount), donation_transfer_cents (what Spirit Media Charities receives). The gift is transferred to SMC's
// Stripe account by the charge itself; this webhook only tells people.
export const SMC_NAME = 'Spirit Media Charities';
export const SMC_EIN = '88-4352701';
export const SMC_FROM = 'Spirit Media Charities <receipts@send.spiritmediapublishing.com>';
export const SMC_ADDRESS = ['205 S Academy St Unit 3251', 'Cary, NC 27519', 'USA'].join('\n');
export const GIFT_COPY =
	'Receipted by Spirit Media Charities, a 501(c)(3). 100% of the amount Spirit Media Charities receives goes to the charity you choose (Cheyenne Foundation, Foundation of Hope, or split 50/50).';
const DESIGNATION: Record<string, string> = {
	cf: 'Cheyenne Foundation',
	foh: 'Foundation of Hope',
	split: 'Split 50/50: Cheyenne Foundation and Foundation of Hope',
};
const usd = (c: number) =>
	(c / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
export type Gift = {
	gift: number;
	cover: number;
	total: number;
	transfer: number;
	designation: string;
	label: string;
	cf: number;
	foh: number;
};
/** The gift on a session, or null (no gift, or metadata that does not describe one). */
export function giftOf(m: Record<string, string> | null | undefined): Gift | null {
	const gift = Number(m?.donation_cents);
	const d = String(m?.designation ?? '');
	if (!Number.isInteger(gift) || gift <= 0 || !DESIGNATION[d]) return null;
	const cover = Number(m?.donation_fee_cover_cents) || 0;
	const total = Number(m?.donation_total_cents) || gift + cover;
	const transfer = Number(m?.donation_transfer_cents) || gift;
	const foh = d === 'foh' ? total : d === 'split' ? Math.floor(total / 2) : 0;
	return {
		gift,
		cover,
		total,
		transfer,
		designation: d,
		label: DESIGNATION[d],
		cf: total - foh,
		foh,
	};
}
/** The designation as the receipt and the notice print it: each charity's part of what the donor gave. */
export const giftSplit = (g: Gift) =>
	g.designation === 'split'
		? `  Cheyenne Foundation: ${usd(g.cf)}\n  Foundation of Hope: ${usd(g.foh)}`
		: `  ${g.label}: ${usd(g.total)}`;
/** The SEPARATE tax receipt from Spirit Media Charities. Stands alone: name, date, amount, designation, EIN, IRS line. */
export function giftReceipt(
	g: Gift,
	donor: string,
	date: string,
	ref: string,
): { subject: string; text: string } {
	return {
		subject: `Your gift receipt from Spirit Media Charities — ${usd(g.total)}`,
		text:
			`Thank you for your gift.\n\n` +
			`DONATION RECEIPT\n` +
			`Donor: ${donor}\n` +
			`Date of gift: ${date}\n` +
			`Amount of gift: ${usd(g.total)}` +
			(g.cover > 0
				? ` (your gift of ${usd(g.gift)} plus ${usd(g.cover)} you added to cover the card processing fee)`
				: '') +
			`\n` +
			`Designation: ${g.label}\n${giftSplit(g)}\n` +
			`Receipt reference: ${ref}\n\n` +
			`${GIFT_COPY}\n\n` +
			`No goods or services were provided in exchange for this gift. (Any books on the same order were purchased\n` +
			`separately from Spirit Media Publishing and are not part of this gift.)\n\n` +
			`Spirit Media Charities is a tax-exempt organization under section 501(c)(3) of the Internal Revenue Code,\n` +
			`EIN ${SMC_EIN}. Your gift is tax-deductible to the extent allowed by law. Please keep this receipt for your records.\n\n` +
			`${SMC_NAME}\n${SMC_ADDRESS}\n`,
	};
}

function hexToBytes(hex: string): Uint8Array | null {
	if (hex.length % 2 !== 0) return null;
	const out = new Uint8Array(hex.length / 2);
	for (let i = 0; i < out.length; i++) {
		const b = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
		if (Number.isNaN(b)) return null;
		out[i] = b;
	}
	return out;
}
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}

// Verify Stripe's "t=…,v1=…" signature over "<t>.<rawBody>" (HMAC-SHA256).
async function verify(raw: string, header: string, secret: string): Promise<boolean> {
	const parts = Object.fromEntries(
		header.split(',').map((s) => s.trim().split('=', 2) as [string, string]),
	);
	const t = Number(parts.t);
	if (!Number.isFinite(t) || Math.abs(Math.floor(Date.now() / 1000) - t) > 300) return false;
	const key = await crypto.subtle.importKey(
		'raw',
		new TextEncoder().encode(secret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign'],
	);
	const sig = new Uint8Array(
		await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${raw}`)),
	);
	const v1 = hexToBytes(parts.v1 ?? '');
	return !!v1 && timingSafeEqual(sig, v1);
}

// Localized: US keeps "City, ST 12345"; elsewhere print only the parts the country has (many
// have no state, some no postal code) in the order Stripe collected them, never a stray ", ".
function fmtAddr(a: Record<string, string> | null | undefined): string {
	if (!a) return '(no address)';
	const place =
		a.country === 'US'
			? `${a.city ?? ''}, ${a.state ?? ''} ${a.postal_code ?? ''}`.trim()
			: [a.postal_code, a.city, a.state].filter(Boolean).join(' ');
	return [a.line1, a.line2, place, a.country].filter(Boolean).join('\n');
}

// metadata.breakdown is the raw SKU tally dvc-checkout writes ("dads:1",
// "general-largeprint-plum-hb:2"). Fine in the internal notification, wrong in a
// customer's confirmation — turn it into something a buyer recognises.
const TITLES: Record<string, string> = {
	chosen: 'Chosen Bible',
	couples: 'Couple’s Bible',
	dads: 'Dad’s Bible',
	'first-responders': 'First Responder’s Bible',
	mens: 'Men’s Bible',
	moms: 'Mom’s Bible',
	pastors: 'Pastor’s Bible',
	peace: 'Peace Bible',
	presidents: 'President’s Bible',
	recovery: 'Recovery Bible',
	seekers: 'Seeker’s Bible',
	seventeen: 'Seventeen Bible',
	soldiers: 'Soldier’s Bible',
	teen: 'Teen Bible',
	'worship-leaders': 'Worship Leader’s Bible',
	athletes: 'Athlete’s Bible',
	graduates: 'Graduate’s Bible',
	grandparents: 'Grandparent’s Bible',
	intercessors: 'Intercessor’s Bible',
	nurses: 'Nurse’s Bible',
	teachers: 'Teacher’s Bible',
	womens: 'Women’s Bible',
	journaling: 'She Hears Her Father’s Voice — Journaling Bible',
};

// Language editions (Kevin 2026-10-03), SKUs lang-<code>-hb/pb — mirrors src/data/language-editions.ts.
const LANG_TITLES: Record<string, string> = {
	ar: 'الكتاب المقدس العربي (Arabic) — Father’s Heart Bible',
	bn: 'বাংলা বাইবেল (Bengali) — Father’s Heart Bible',
	yue: '廣東話聖經 (Cantonese) — Father’s Heart Bible',
	fil: 'Bibliyang Filipino (Filipino) — Father’s Heart Bible',
	fr: 'Bible Française (French) — Father’s Heart Bible',
	de: 'Deutsche Bibel (German) — Father’s Heart Bible',
	hi: 'हिन्दी बाइबिल (Hindi) — Father’s Heart Bible',
	id: 'Alkitab Indonesia (Indonesian) — Father’s Heart Bible',
	it: 'Bibbia Italiana (Italian) — Father’s Heart Bible',
	ja: '日本語聖書 (Japanese) — Father’s Heart Bible',
	ko: '한국어 성경 (Korean) — Father’s Heart Bible',
	mr: 'मराठी बायबल (Marathi) — Father’s Heart Bible',
	pcm: 'Naija Bible (Nigerian Pidgin) — Father’s Heart Bible',
	fa: 'کتاب مقدس فارسی (Persian (Farsi)) — Father’s Heart Bible',
	pt: 'Bíblia Portuguesa (Portuguese) — Father’s Heart Bible',
	pa: 'ਪੰਜਾਬੀ ਬਾਈਬਲ (Punjabi) — Father’s Heart Bible',
	ru: 'Русская Библия (Russian) — Father’s Heart Bible',
	es: 'Biblia Española (Spanish) — Father’s Heart Bible',
	sw: 'Biblia ya Kiswahili (Swahili) — Father’s Heart Bible',
	ta: 'தமிழ் பைபிள் (Tamil) — Father’s Heart Bible',
	nmf: 'Tangkhul Bible (Tangkhul) — Father’s Heart Bible',
	te: 'తెలుగు బైబిల్ (Telugu) — Father’s Heart Bible',
	'zh-hant': '中文聖經 (Traditional Chinese) — Father’s Heart Bible',
	tr: 'Türkçe Kutsal Kitap (Turkish) — Father’s Heart Bible',
	ur: 'اردو بائبل (Urdu) — Father’s Heart Bible',
	vi: 'Kinh Thánh Tiếng Việt (Vietnamese) — Father’s Heart Bible',
	ceb: 'Cebuano nga Bibliya (Cebuano) — Father’s Heart Bible',
	pl: 'Polska Biblia (Polish) — Father’s Heart Bible',
	'zh-hans': '中文圣经 (Simplified Chinese) — Father’s Heart Bible',
	uk: 'Українська Біблія (Ukrainian) — Father’s Heart Bible',
	yo: 'Bíbélì Yorùbá (Yoruba) — Father’s Heart Bible',
};

function skuTitle(sku: string): string {
	if (BOOK_SKUS[sku]) return BOOK_SKUS[sku].title;
	if (TITLES[sku]) return `${TITLES[sku]} — Divine Voice Color`;
	// Every SKU carries its binding (<slug>-hb / -pb, since 2026-09-17); the map is keyed by
	// edition, so read the binding off the end rather than printing the raw SKU.
	const b = /^(.+)-(hb|pb)$/.exec(sku);
	const bind = b ? (b[2] === 'hb' ? 'Hardback' : 'Paperback') : '';
	const lang = b && /^lang-(.+)$/.exec(b[1]);
	if (lang && LANG_TITLES[lang[1]]) return `${LANG_TITLES[lang[1]]}, ${bind}`;
	if (b && TITLES[b[1]]) return `${TITLES[b[1]]} — Divine Voice Color, ${bind}`;
	const m = /^general-(regular|largeprint)-(charcoal|plum|white)-(pb|hb)$/.exec(sku);
	if (!m) return sku;
	const [, size, colour, binding] = m;
	const c = colour.charAt(0).toUpperCase() + colour.slice(1);
	return `Father’s Heart Bible — ${size === 'largeprint' ? 'Large Print' : 'Regular Print'}, ${c}, ${binding === 'hb' ? 'Hardback' : 'Paperback'}`;
}

// What the Ingram order needs for any non-Bible book in the cart: the ISBN-13 to type in, the
// quantity, and the spec to check it against. Empty when the order has none.
function ingramLines(breakdown: string | undefined): string {
	const out: string[] = [];
	for (const part of (breakdown ?? '').split(/[,\s]+/).filter(Boolean)) {
		const i = part.lastIndexOf(':');
		const book = i < 0 ? undefined : BOOK_SKUS[part.slice(0, i)];
		if (book) out.push(`  ISBN ${book.isbn} × ${part.slice(i + 1)}  (${book.title}; ${book.spec})`);
	}
	return out.length ? `Ingram order lines (non-Bible books):\n${out.join('\n')}\n` : '';
}

function fmtOrder(breakdown: string | undefined): string {
	if (!breakdown) return 'Father’s Heart Bible';
	return breakdown
		.split(/[,\s]+/)
		.filter(Boolean)
		.map((part) => {
			const i = part.lastIndexOf(':');
			if (i < 0) return `  ${skuTitle(part)}`;
			const qty = part.slice(i + 1);
			return `  ${qty} × ${skuTitle(part.slice(0, i))}`;
		})
		.join('\n');
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
	const ack = () => new Response('ok', { status: 200 });
	// A 5xx makes Stripe redeliver this event with backoff for up to 3 days. Used only
	// when an email actually failed: the old code swallowed that, so a Mailgun outage
	// meant an order nobody was ever told about. If one of the two sends succeeded, the
	// retry re-sends it — a duplicate confirmation is a far smaller harm than a lost
	// order, and the reconciler (fhb-order-reconcile.py) catches anything that stays
	// unsent past the retry window.
	const retry = () => new Response('email failed — please retry', { status: 500 });
	const raw = await request.text();
	const sig = request.headers.get('stripe-signature') ?? '';

	if (!env.STRIPE_PRINT_WEBHOOK_SECRET) return ack(); // not configured yet
	if (!(await verify(raw, sig, env.STRIPE_PRINT_WEBHOOK_SECRET))) {
		return new Response('bad signature', { status: 400 });
	}

	let event: any;
	try {
		event = JSON.parse(raw);
	} catch {
		return ack();
	}
	if (event?.type !== 'checkout.session.completed') return ack();
	const s = event.data?.object ?? {};
	// Both checkout paths land here: the retired 25-copy /print-checkout stamps
	// `print_bulk`, the live /dvc-checkout stamps `dvc_print`. Matching only the
	// former meant NO /print order notified anyone between the mix-and-match
	// rewrite and 2026-09-03, when a customer asked why he got no confirmation.
	// eBook sales (`ebook_direct`) reached this endpoint too and were dropped: no
	// notification to us, no record, and the buyer's only route to their download
	// was the success page — close that tab and the link was gone, because no email
	// ever carried it. Handled below, before the print-shaped fields are read.
	const kind = s?.metadata?.kind;
	if (kind !== 'print_bulk' && kind !== 'dvc_print' && kind !== 'ebook_direct') return ack();

	const email = s.customer_details?.email ?? '(no email)';
	// Stripe moved the collected address to collected_information.shipping_details;
	// top-level shipping_details is null on current API versions. Try newest first.
	const ship =
		s.collected_information?.shipping_details ?? s.shipping_details ?? s.customer_details ?? {};
	const name = ship.name ?? s.customer_details?.name ?? '(no name)';
	const amount = ((s.amount_total ?? 0) / 100).toLocaleString('en-US', {
		style: 'currency',
		currency: (s.currency ?? 'usd').toUpperCase(),
	});
	const tax = s.total_details?.amount_tax
		? (s.total_details.amount_tax / 100).toLocaleString('en-US', {
				style: 'currency',
				currency: 'USD',
			})
		: '$0.00';
	const m = s.metadata ?? {};
	const gift = giftOf(m);
	const phone: string | undefined = s.customer_details?.phone || undefined;
	const destCode: string | undefined = ship.address?.country;
	const site = countryFor(destCode);

	// Stamp the session once its emails are away. This is what makes an un-notified
	// order *findable*: fhb-order-reconcile.py sweeps paid sessions missing
	// `notified_at` and sends them itself. Stripe holds the mark, so there is no
	// second ledger to drift out of step with the orders it describes. Best-effort —
	// a failed stamp only costs a duplicate send from the reconciler, never a miss.
	const markNotified = async () => {
		if (!env.STRIPE_FHB_SECRET_KEY || !s.id) return;
		try {
			await fetch(`https://api.stripe.com/v1/checkout/sessions/${s.id}`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${env.STRIPE_FHB_SECRET_KEY}`,
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: new URLSearchParams({
					'metadata[notified_at]': new Date().toISOString(),
				}),
			});
		} catch {
			/* the reconciler is the backstop */
		}
	};

	// Returns whether the message was actually accepted, so a failed send can be
	// escalated rather than swallowed (see the retry note at the end of the handler).
	const send = async (
		to: string,
		subject: string,
		body: string,
		replyTo?: string,
		opts: { from?: string; bcc?: string } = {},
	) => {
		if (!env.MAILGUN_API_KEY) return false;
		const domain = env.MAILGUN_SENDING_DOMAIN || 'send.spiritmediapublishing.com';
		const form = new URLSearchParams();
		form.set('from', opts.from ?? NOTIFY_FROM);
		if (opts.bcc) form.set('bcc', opts.bcc);
		form.set('to', to);
		form.set('subject', subject);
		form.set('text', body);
		form.set(
			'html',
			`<pre style="font:14px/1.5 ui-monospace,monospace">${body
				.replace(/&/g, '&amp;')
				.replace(/</g, '&lt;')}</pre>`,
		);
		form.set('o:tracking', 'no');
		if (replyTo) form.set('h:Reply-To', replyTo);
		try {
			const r = await fetch(`https://api.mailgun.net/v3/${domain}/messages`, {
				method: 'POST',
				headers: {
					Authorization: `Basic ${btoa(`api:${env.MAILGUN_API_KEY}`)}`,
					'Content-Type': 'application/x-www-form-urlencoded',
				},
				body: form,
			});
			return r.ok;
		} catch {
			return false;
		}
	};

	// eBook: no address, no production run — the buyer needs their download link in
	// writing, because the success page is otherwise the only place it ever appears.
	if (kind === 'ebook_direct') {
		// A book's eBook (metadata ebook_sku, SMP /store-checkout) gets the SIGNED link on its shop window's own site
		// (src/lib/ebookLink.ts); the Bible eBook keeps its v1 session link on FHB.
		const ebookSku: string | undefined = m.ebook_sku || undefined;
		const bookTitle = ebookSku ? (EBOOK_SKUS[ebookSku]?.title ?? ebookSku) : "Father's Heart Bible";
		const link = ebookSku
			? await ebookLinkUrl(
					env.STRIPE_PRINT_WEBHOOK_SECRET,
					windowOrigin(buyerBrand(m, amount).window),
					s.id ?? '',
					ebookSku,
				)
			: `https://fathersheartbible.com/ebook-download?s=${encodeURIComponent(s.id ?? '')}`;
		if (!link) return retry(); // unsignable (no secret / malformed session): never email a link that cannot work
		const okKevin = await send(
			env.PRINT_ORDER_NOTIFY_TO || NOTIFY_TO_DEFAULT,
			`📖 eBook sale — ${amount}`,
			`New eBook sale — ${bookTitle}\n\n` +
				`Total: ${amount}\nCustomer email: ${email}\nStripe session: ${s.id ?? '?'}\n` +
				(ebookSku ? `eBook SKU: ${ebookSku} · window: ${buyerBrand(m, amount).window}\n` : ''),
			email !== '(no email)' ? email : undefined,
		);
		const okCust =
			email === '(no email)' ||
			(await send(
				email,
				`Your eBook — ${ebookSku ? bookTitle : 'Father’s Heart Bible'}`,
				`Thank you — your eBook is ready.\n\n` +
					(ebookSku ? `${bookTitle}\n\n` : '') +
					`Download it here (the link stays valid, so keep this email):\n${link}\n\n` +
					`It's a DRM-free EPUB — open it in Apple Books, Google Play Books,\n` +
					`or any reader. Total paid: ${amount}\n\n` +
					`Order reference: ${s.id ?? '?'}\n\n` +
					`Trouble opening it? Just reply to this email.\n\n${signoffBlock(buyerBrand(m, amount).signoff)}${SIGNATURE}\n`,
				BUYER_REPLY_TO,
			));
		if (okKevin && okCust) {
			await markNotified();
			return ack();
		}
		return retry();
	}

	// One store (Kevin 2026-11-20 ~16:07Z): every order notice is headed Spirit Media Publishing; the window is logged below.
	const text =
		`New print order — Spirit Media Publishing\n\n` +
		`Shop window: ${buyerBrand(m, amount).window === 'smp' ? 'spiritmediapublishing.com' : 'fathersheartbible.com'}\n` +
		`Total: ${amount} (incl. tax ${tax})\n` +
		`Copies: ${m.total ?? '?'}  ·  Discount: ${m.pct_off ?? '?'}% off${m.offer === 'first_order' ? ' (first order, WELCOME15)' : m.offer === 'volume' ? ' (volume)' : ''}\n` +
		`Editions:\n${fmtOrder(readBreakdown(m))}\n` +
		`${ingramLines(readBreakdown(m))}\n` +
		`Ship to:\n${name}\n${fmtAddr(ship.address)}\n\n` +
		`Customer email: ${email}\n` +
		`Phone (pass to the Ingram order, carriers call international buyers): ${phone ?? '*** MISSING: email the buyer before placing the order ***'}\n` +
		`Ingram print site for ${destCode ?? '?'}: ${site ? `${site.printSite} (${site.name}, config rate ${site.shippingRate.value} ${site.shippingRate.currency})` : '*** country not in the live ship list: check before ordering ***'}\n` +
		`Stripe session: ${s.id ?? '?'}\n` +
		(gift
			? `\nGIFT TO CHARITY (Spirit Media Charities receipts it; NOT SMP revenue)\n` +
				`Designation: ${gift.designation} = ${gift.label}\n${giftSplit(gift)}\n` +
				`Donor gave: ${usd(gift.total)}${gift.cover > 0 ? ` (gift ${usd(gift.gift)} + fee cover ${usd(gift.cover)})` : ' (fee not covered)'}\n` +
				`Transferred to Spirit Media Charities: ${usd(gift.transfer)}\n` +
				`Books total (Total minus the gift): ${usd((s.amount_total ?? 0) - gift.total)}\n` +
				`Tax receipt emailed to the donor from Spirit Media Charities (copy to this address).\n`
			: '');
	// The buyer's own confirmation. Until 2026-09-03 we sent the customer NOTHING —
	// Stripe's payment receipt was the only thing they ever received, so a buyer had
	// no confirmation their ORDER (as opposed to their payment) existed.
	const brand = buyerBrand(m, amount);
	const custText =
		`Thank you — we've received your order.\n\n` +
		`What you ordered:\n${fmtOrder(readBreakdown(m))}\n\n` +
		`Total paid: ${amount}\n` +
		(gift
			? `This includes your ${usd(gift.total)} gift to charity; Spirit Media Charities is emailing you its receipt separately.\n`
			: '') +
		`Order reference: ${s.id ?? '?'}\n\n` +
		`Shipping to:\n${name}\n${fmtAddr(ship.address)}\n` +
		`Phone for the delivery carrier: ${phone ?? '(none on file, please reply with one)'}\n\n` +
		(Number(m.total) > 9
			? `Shipping is free. Larger bulk orders take about 3–4 weeks to reach you.\n\n`
			: `Shipping is free, and most orders arrive within 7–10 days.\n\n`) +
		`Need to change or ask about this order? Just reply to this email and it comes\n` +
		`straight to us — please include your order reference above.\n\n` +
		`${signoffBlock(brand.signoff)}${SIGNATURE}\n`;

	const okKevin = await send(
		env.PRINT_ORDER_NOTIFY_TO || NOTIFY_TO_DEFAULT,
		`📚 Print order — ${m.total ?? '?'} copies · ${amount}`,
		text,
		email !== '(no email)' ? email : undefined,
	);
	const okCust =
		email === '(no email)' || (await send(email, brand.subject, custText, BUYER_REPLY_TO));
	// An order WITH a gift: a SECOND, separate email, the tax receipt from Spirit Media Charities; a copy goes to the
	// order notice address for SMC's books. A gift-free order sends nothing more.
	let okGift = true;
	if (gift) {
		const donor = s.customer_details?.name || name;
		const date = new Date(
			((s.created as number) || Math.floor(Date.now() / 1000)) * 1000,
		).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			timeZone: 'America/New_York',
		});
		const r = giftReceipt(gift, donor, date, s.id ?? '?');
		okGift =
			email === '(no email)'
				? await send(
						env.PRINT_ORDER_NOTIFY_TO || NOTIFY_TO_DEFAULT,
						`[no donor email] ${r.subject}`,
						r.text,
						undefined,
						{ from: SMC_FROM },
					)
				: await send(email, r.subject, r.text, BUYER_REPLY_TO, {
						from: SMC_FROM,
						bcc: env.PRINT_ORDER_NOTIFY_TO || NOTIFY_TO_DEFAULT,
					});
	}

	if (okKevin && okCust && okGift) {
		await markNotified();
		return ack();
	}
	return retry();
};
