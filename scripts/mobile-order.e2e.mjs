// Playwright DOM check (2sc + 2sb): at 390x844 the welcome-tour offer must not cover the order form,
// and Checkout must sit within 1230px after tapping Order. Usage: node scripts/mobile-order.e2e.mjs [baseUrl]
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)(process.env.PW_PATH || '/home/deploy/bin/node_modules/playwright');
const base = process.argv[2] || 'http://127.0.0.1:4391';
const path = '/bibles/seekers-bible/';
const b = await chromium.launch();
let fail = 0;
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fail++; };
try {
	for (const [w, h, mobile] of [[390, 844, true], [1280, 800, false]]) {
		const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile, hasTouch: mobile });
		const p = await ctx.newPage();
		try {
			await p.goto(base + path, { waitUntil: 'networkidle' });
			// 3 interactions -> the offer appears
			for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, 300).catch(() => {}); await p.evaluate(() => document.dispatchEvent(new MouseEvent('click', { bubbles: true }))); }
			await p.waitForTimeout(500);
			const tourShown = await p.evaluate(() => !document.getElementById('tour-welcome').hidden);
			ok(tourShown, `${w}: tour offer appears`);
			await p.evaluate(() => document.getElementById('order').scrollIntoView());
			await p.waitForTimeout(600);
			const r = await p.evaluate(() => {
				const tw = document.getElementById('tour-welcome');
				const c = [...document.querySelectorAll('[data-checkout]')].find((e) => e.offsetParent);
				const cs = getComputedStyle(tw);
				const tr = tw.getBoundingClientRect(), cr = c && c.getBoundingClientRect();
				const hid = cs.visibility === 'hidden';
				const overlap = !!cr && tr.left < cr.right && tr.right > cr.left && tr.top < cr.bottom && tr.bottom > cr.top;
				return { hid, overlap, top: cr && cr.top + scrollY };
			});
			if (mobile) ok(r.hid, `${w}: tour hidden while #order in view`);
			else console.log(`INFO ${w}: tour hidden=${r.hid} overlapsCheckout=${r.overlap}`);
			if (mobile) {
				await p.evaluate(() => window.scrollTo(0, 0));
				await p.waitForTimeout(400);
				const t = await p.evaluate(() => { const tw = document.getElementById('tour-welcome'); return getComputedStyle(tw).visibility; });
				ok(t === 'visible', `${w}: tour visible again away from #order`);
				await p.goto(base + path + '#order', { waitUntil: 'networkidle' });
				await p.waitForTimeout(900);
				const ck = await p.evaluate(() => {
					const o = document.getElementById('order').getBoundingClientRect().top;
					const c = document.querySelector('[data-checkout]');
					// viewport-relative, normalised to the 2sa measurement (order block top at y=180)
					return c ? Math.round(c.getBoundingClientRect().top - o + 180) : null;
				});
				ok(ck !== null && ck <= 1230, `${w}: Checkout top ${ck} <= 1230`);
			}
		} finally { await p.close(); await ctx.close(); }
	}
} finally { await b.close(); }
process.exit(fail ? 1 : 0);
