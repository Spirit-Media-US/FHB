// BUILD-CHECK: searched "link check curl 200 url" (bin/tool-inventory.py 2026-11-16); site-wide crawlers check our own
//   pages, not a data file of third-party author URLs.
// NEAREST: scripts/xsite-links.test.mjs (static, no network).
// NOT-REUSED-BECAUSE: needs the network and must stay OUT of the build (third-party sites go down; a build must not).
// APPROVED-BY: pmprint brief pmprint-author-sites-20261116.md (Kevin 2026-11-16).
//
// node scripts/author-sites-linkcheck.mjs [data.json]   -- NOT part of the build.
// curls every CERTAIN url in src/data/author-sites.json (GET, redirects followed, browser UA) and prints
// "<code> <author> <label> <url> -> <final url>". Exit 1 when any url is not 200 at the end of its redirects, EXCEPT:
// hosts that block curl (Facebook 400, LinkedIn 403/999, Instagram) and any 202 are "unverifiable by curl" (pmprint
// 2026-11-16): those are loaded in headless Playwright (pass = no 4xx/5xx and no error page), else accepted when the
// entry's evidence says the link came from the author's own verified site. The method is recorded per url.
// --json prints the results as JSON instead.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const file = args.find((a) => !a.startsWith('--')) || 'src/data/author-sites.json';
const table = JSON.parse(fs.readFileSync(file, 'utf8'));
const UA =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

function curl(url) {
	try {
		const out = execFileSync(
			'curl',
			['-sS', '-L', '--max-redirs', '10', '-m', '25', '-o', '/dev/null', '-A', UA,
				'-H', 'Accept: text/html,application/xhtml+xml,*/*;q=0.8', '-H', 'Accept-Language: en-US,en;q=0.9',
				'-w', '%{http_code} %{url_effective}', url],
			{ encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
		);
		const [code, final] = out.trim().split(' ');
		return { code: Number(code), final };
	} catch (e) {
		return { code: 0, final: String(e.stderr || e.message).trim().split('\n')[0] };
	}
}

const CURL_BLOCKED = /(^|\.)(facebook\.com|fb\.com|linkedin\.com|instagram\.com)$/i;
const hostOf = (u) => { try { return new URL(u).hostname; } catch { return ''; } };
const WALL = /\/login\b|authwall|\/accounts\/login|checkpoint/i;
const CHALLENGE = /robot challenge|just a moment|attention required|verify you are human|captcha/i;
const unverifiableByCurl = (url, code) => CURL_BLOCKED.test(hostOf(url)) || code === 202 || code === 999;
const ERROR_PAGE = /page not found|isn.t available|content (?:isn.t|is not) available|page isn.t available|404|not found/i;
let browser = null;
async function browserCheck(url) {
	if (!browser) {
		const { chromium } = await import('/home/deploy/bin/node_modules/playwright/index.mjs');
		browser = await chromium.launch();
	}
	const ctx = await browser.newContext({ userAgent: UA, locale: 'en-US' });
	const page = await ctx.newPage();
	try {
		const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
		await page.waitForTimeout(2500);
		// a bot-challenge page (202) navigates on to the real page: let it settle before reading the title
		await page.waitForLoadState('load', { timeout: 15000 }).catch(() => {});
		const status = resp ? resp.status() : 0;
		let title = '';
		for (let i = 0; i < 3 && !title; i++) title = await page.title().catch(() => page.waitForTimeout(2000).then(() => ''));
		// a challenge screen hands over to the real page after its script runs: give it up to ~15s
		for (let i = 0; i < 6 && CHALLENGE.test(title); i++) {
			await page.waitForTimeout(2500);
			title = await page.title().catch(() => title);
		}
		// a login wall (Facebook /login, LinkedIn /authwall, Instagram /accounts/login) loads for ANY path, real or not:
		// it proves nothing, so it does not pass here; the evidence rule decides.
		const wall = WALL.test(page.url()) || CHALLENGE.test(title);
		const ok = status > 0 && status < 400 && !ERROR_PAGE.test(title) && !wall;
		return { ok, status, title: (WALL.test(page.url()) ? 'login wall: ' : '') + title.slice(0, 80), final: page.url() };
	} catch (e) {
		return { ok: false, status: 0, title: String(e.message).split('\n')[0], final: url };
	} finally {
		await ctx.close();
	}
}
const fromOwnSite = (ev) => /(linked|listed|from|on) (?:from |on )?(?:her|his|their|the author.s)(?: own)?(?: verified)? (?:site|website|homepage|footer)|from (?:her|his|their) site|linked from/i.test(String(ev ?? ''));

const results = [];
for (const [author, row] of Object.entries(table)) {
	if (author.startsWith('_')) continue;
	for (const s of row.sites ?? []) {
		if (s.grade !== 'CERTAIN') continue;
		let r = curl(s.url);
		if (r.code !== 200) r = curl(s.url); // one retry for a transient blip
		let method = 'curl';
		// a 200 that ended on a login wall (Instagram) proves nothing about the profile: treat it as unverifiable by curl
		let ok = r.code === 200 && !WALL.test(r.final ?? '');
		if (!ok && (unverifiableByCurl(s.url, r.code) || WALL.test(r.final ?? ''))) {
			const b = await browserCheck(s.url);
			if (b.ok) { ok = true; method = `playwright ${b.status} "${b.title}"`; }
			// a browser 404/410 is a real answer (gone), never excused by evidence; only a wall/bot block is.
			else if (![404, 410].includes(b.status) && fromOwnSite(s.evidence)) { ok = true; method = `accepted: curl ${r.code}, playwright ${b.status} "${b.title}"; evidence = linked from the author's own verified site`; }
			else method = `curl ${r.code}, playwright ${b.status} "${b.title}"`;
		}
		results.push({ author, label: s.label, url: s.url, ...r, ok, method });
	}
}
if (browser) await browser.close();
const bad = results.filter((r) => !r.ok);
if (asJson) console.log(JSON.stringify(results, null, 1));
else {
	for (const r of results) console.log(`${r.ok ? 'OK ' : 'BAD'} ${r.code} ${r.author} | ${r.label} | ${r.url}${r.final && r.final !== r.url ? ` -> ${r.final}` : ''}${r.method !== 'curl' ? ` [${r.method}]` : ''}`);
	const viaCurl = results.filter((r) => r.ok && r.method === 'curl').length;
	console.log(`# ${results.length} CERTAIN urls checked: ${viaCurl} curl 200, ${results.length - bad.length - viaCurl} unverifiable-by-curl passed (playwright/evidence), ${bad.length} failed`);
}
process.exit(bad.length ? 1 : 0);
