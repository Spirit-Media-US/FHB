# Option A SEO/AEO/GEO Migration — Phase 0 Plan & Sign-off

**Status:** 🟢 **CUTOVER LIVE (2026-06-05) — step-e auth smoke PASSED.** Apex Worker bound; community content serving under apex; auth/cookie verified on apex. **One URGENT follow-up:** the Stripe webhook must be repointed to apex (step f) — it 301s on `join.` and is silently failing there. Full Cutover Log below. (Pre-cutover plan retained beneath.)
**Author:** Jona (Claude Code session) · **Updated:** 2026-06-05 · **Branch:** `dev` (both repos)

**Goal of Option A:** unify the FHB *marketing* site (apex `fathersheartbible.com`) and the FHB *community* app (`join.fathersheartbible.com`) so Google sees **one site** — community content served under apex subfolders (`fathersheartbible.com/feed`, `/map`, `/listen`, …) via a Cloudflare Worker in front of the apex. `join.` is kept: it becomes a 301 redirector for browsers **and** the technical origin the apex Worker proxies to. Routing + config, not a rewrite.

---

## ⛳ NEEDS KEVIN (irreducible — the production gate only)

Everything below this box is resolved with safe, reversible defaults. The only things that require Kevin are the production-gate actions themselves (each reversible in seconds via the §5.1 route kill-switch). Approve in one pass:

1. **Approve the single go-live window** and the `dev → main` merges it requires (his merge authority). Within the window, in order (§6): (a) merge + deploy the community redeploy; (b) `supabase config push` adding the apex redirect URL; (c) deploy + **bind the apex Worker route** `fathersheartbible.com/*` → `fhb-apex-router` (the go-live flip, replacing the citation-logger route); (d) register the apex Stripe webhook URL. **Recommended default: proceed as sequenced.**
2. **(Non-blocking) Q1 override option:** v1 ships with marketing keeping `/read` and the community audio reader at **`/listen`**. If you'd rather the community reader *take over* `/read` later (one richer reader), that's a content/SEO call — say the word and we run the parity audit. **Default: ship `/listen` now; revisit later.** *(Also covers a one-word rename if you dislike `/listen`.)*

---

## 🟢 CUTOVER LOG — 2026-06-05

**Cutover sequence executed (window):**
- **a — community `dev→main` merge + prod deploy** (Kevin): `origin/main` = `6ec7d2b`; reader at `/listen`, `join.`→apex 301s live. First prod build rendered `join.` canonical (local Bethel build via `deploy-live.sh` doesn't read CF Pages env); fixed by patching `deploy-live.sh` Step 3 to `export PUBLIC_SITE_URL=https://fathersheartbible.com` (community-scoped) + redeploy.
- **b — Supabase config push** (us): `+https://fathersheartbible.com` to `additional_redirect_urls` (also restored a remote-only `dev.community-cm1.pages.dev/**` the first push clobbered; corrected `config.toml` committed `ae6b2d6`). `site_url`/`send_email.uri` stay `join.`
- **c — Worker deploy** (us): `fhb-apex-router` deployed; `APEX_PROXY_SECRET` set identically on the Worker and the community prod env. **Key finding:** CF Pages env-var changes need a **redeploy** to reach the live app — the community redeploy in (a)'s fix is what surfaced the secret to the running Functions; without it the bind would have redirect-looped.
- **d — route bind mechanics** (Kevin): `fathersheartbible.com/*` → **`fhb-apex-router`** bound, **replacing** the `smp-citation-bot-logger` route on this zone; `smp-citation-bot-logger`'s `spiritmediapublishing.com/*` route **kept** (verified both). Citation logging is folded into `fhb-apex-router`.

**Step-e production smoke (2026-06-05 ~22:35 UTC) — PASS except the flagged Stripe item:**

| # | Check | Result |
|---|---|---|
| 1 | Canonical (A.3) | ✅ `apex/listen/john/3` → `https://fathersheartbible.com/read/john/3/`; `apex/listen` → `/read/` (apex + trailing slash, = og:url) |
| 2 | Magic-link round trip + **cookie-on-apex** | ✅ send → `303 /feed?sent=1`; callback → `303 /feed`; `sb-…-auth-token` set on **`.fathersheartbible.com`, HttpOnly, Secure**; authed reload `/profile`→200 & `/feed`→member-redirect `/spaces/readers`; no-cookie `/profile`→`303 /login` |
| 3 | CSRF / Origin-rewrite | ✅ legit apex-Origin POST passes `checkOrigin`+auth (handler runs, e.g. RSVP→`303 /events?error=missing-fields`). **⚠ Security note:** the Worker blanket-rewrites *every* `Origin`→join., so `checkOrigin` is bypassed for foreign origins too (an `evil.example.com` POST also passed). Mitigated by the auth cookie's `SameSite=Lax` (cross-site POSTs don't carry it) → no active CSRF, but defense-in-depth weakened. **Follow-up:** tighten the Worker to rewrite only `https://fathersheartbible.com`→join., pass others through. |
| 4 | Signout | ✅ `/api/auth/signout`→`303 /login?signed-out=1`; cookie cleared; post-signout `/profile`→`303 /login` |
| 5 | **Stripe webhook** | 🚨 **BROKEN on `join.` — URGENT (step f).** `join./api/giving/webhook` **301s** to apex (GET + JSON POST); Stripe doesn't follow webhook 301s → if Stripe is still pointed at `join.`, **donation webhooks are silently failing now.** `apex/api/giving/webhook` **works** (reaches handler: `401 signature verification failed`). The middleware exempts only `/api/auth/send-email`, not the giving webhook. **Fix: repoint the Stripe Dashboard webhook endpoint to `https://fathersheartbible.com/api/giving/webhook`.** User-facing: gift records/receipts not processed until repointed. |
| 6 | Citation logger on apex | ✅ `PerplexityBot` → 200 (folded-in logger fires) |
| 7 | Playwright (apex `/listen/john/3` + `/feed`) | ✅ **0 failed requests, 0 console errors**; `/_community/*` assets 200; fonts/beacon 200 |

**`/og/default.png`** — accepted as-is for cutover (no change required).

**What remains:**
- **f — Stripe webhook: REPOINTED (Kevin), HMAC-pass verification PENDING.** Endpoint `we_1Tbj5tIZWVjKTV59zlixpcdo` confirmed via Stripe API → `url: https://fathersheartbible.com/api/giving/webhook`, `enabled` ✅. **Not yet confirmed delivering** — no `payment_intent`/donation events have occurred since the repoint (last events are May payout/balance, account-level). Self-side HMAC test is impossible (the `.secrets` `STRIPE_WEBHOOK_SECRET_FHB` has diverged from the deployed CF secret — a correct-scheme self-signed sig is rejected; Stripe's endpoint secret can't be read back via API). **Confirm via:** Kevin clicks "Send test webhook" (`checkout.session.completed` → safe, handler acks 200, no gift) and watch the response/`audit_log`, or the first real donation. Mark DONE once a delivery returns 200. *(Cleanup: re-sync `.secrets` `STRIPE_WEBHOOK_SECRET_FHB` to the deployed value.)*
- **g — DONE (staged on FHB `dev`):** `robots.txt` adds `Disallow: /dms /settings /profile /moderation /api/`; sitemap `customPages` folds in the 8 community publics at apex. Verified build: 960 URLs = 929 `/read/` + 13 blog + 8 landings + 8 community publics; **0 `/listen`, 0 gated**. Still to do post-merge: resubmit `sitemap-index.xml` to GSC + Bing, IndexNow ping, monitor GSC ×2–3 wks.
- **h — DONE (staged on FHB `dev`):** marketing `join.…` links → apex. `sync-chrome.mjs` `APP_ORIGIN` → apex (regenerates nav.generated.json to apex). Marketing `/read` CTAs → `/listen` (behavior-preserving: `join./read` already 301s to `apex/listen`; nav "Read FHB" stays `/read` per S1). `grep join.fathersheartbible.com src/`: **37 → 6**, residuals = legal prose (`terms`, `privacy`) + comments (`DonationForm`, `review`, `Layout`, `join`) — left intentionally. **⚠ Judgment flagged:** the `/read`-CTA→`/listen` choice preserves the audio-reader funnel; if any marketing CTA should instead drive to the text Bible `/read`, name it. Legal-prose `join.` mentions in terms/privacy left for content/legal review.
- **Security follow-up (from step-e):** tighten the Worker `Origin`-rewrite to only rewrite the apex origin (currently blanket → `checkOrigin` bypassed for all origins; mitigated by `SameSite=Lax`).
- **Secret rotation:** `APEX_PROXY_SECRET` value was echoed into a session log (internal, low-value) — rotate at convenience.
- **`deploy-live.sh`:** community `PUBLIC_SITE_URL` export persisted in `bin` repo (`8e7d86f`).
- **Security follow-up:** tighten the Worker `Origin`-rewrite (item 3 note) to only rewrite the apex origin.
- **Secret rotation:** `APEX_PROXY_SECRET` value was echoed into a session log (internal, low-value) — rotate at convenience: `wrangler secret put` on the Worker + update the community prod env to the same new value, then redeploy community so it's surfaced.
- **`deploy-live.sh`:** the community `PUBLIC_SITE_URL` export edit is local on Bethel — ensure it's committed/persisted in the `bin` repo.

### RESOLVED (Kevin, 2026-06-05)

- **S1 — Community nav "Read FHB" → `/read`.** ✅ Kevin chose `/read` (the indexable text Bible). Confirmed `communities/fhb.json:88` already reads `"href": "/read"` — no change needed.
- **Window approved — proceed as sequenced (§6).**
- **Canonical safeguard added (Kevin's pre-go-live condition).** ✅ See "CONFIRMED" below.

That's it. No open question remains — go-live is merge + route-bind + `PUBLIC_SITE_URL` + Phase-1 preview (§3).

---

## 1. Current-State Findings (read-only audit)

### 1.1 Repositories

| | Marketing | Community app |
|---|---|---|
| Repo | `/srv/sites/FHB` | `/srv/sites/community` (pkg `fh-family`) |
| Branch | `dev` | `dev` |
| Framework | Astro 5, **`output: 'static'`** | Astro 5, **`output: 'server'` + `@astrojs/cloudflare`** (SSR) |
| `site` base | `PUBLIC_SITE_URL` ‖ `https://fathersheartbible.com` | `PUBLIC_SITE_URL` ‖ `https://join.fathersheartbible.com` |
| CF Pages project | `fathersheartbible` | `community` |
| Pages domains | `fathersheartbible.pages.dev`, apex, `www` | `community-cm1.pages.dev`, `join.fathersheartbible.com` |
| Build output | static `dist/` (823 prerendered `/read/*` pages) | SSR (every page is a Pages Function) |
| Auth | none (Stripe Elements on donate form, live keys) | Supabase `@supabase/ssr`, magic-link via custom Send-Email hook |
| Tenant model | n/a | multi-tenant by Host; **only live tenant = `fhb`** (`communities/fhb.json`, `customDomain: join.fathersheartbible.com`) |

### 1.2 Authoritative route inventory — community app

**Public (allowlisted, anonymous-reachable, SEO-relevant):**
```
/   /about   /login
/events  /events/[slug]  /events/[slug].ics
/groups   /library   /read → MOVES TO /listen (Q1)   /contributors   /map
/feed (guest teaser)   /directory (guest teaser)   /spaces/[slug] (guest teaser)
/og/verse/[book]/[chapter]/[verse].png   /shareables
(static) /sw.js  /manifest.webmanifest  /favicon*  /robots.txt  /sitemap-*
```
**Gated (→ /login for anon, do not index):** `/dms` `/dms/[memberId]` `/members/[id]` `/profile` `/settings` `/moderation`.
**API (`/api/*`, must keep working):**
```
AUTH:   /api/auth/callback (verifyOtp on token_hash; device-independent) /api/auth/magic-link
        /api/auth/send-email (Supabase server-to-server HOOK target ⚠)  /api/auth/signout
        /api/dev-login (self-gates to *.community-cm1.pages.dev only)
STRIPE: /api/giving/intent  /api/giving/interest  /api/giving/webhook (HMAC, public ⚠)
DATA:   /api/posts(/decide|/feature|/pin)  /api/comments  /api/reactions  /api/dms
        /api/reports  /api/settings  /api/profile(/complete)  /api/events/rsvp
        /api/spaces/[slug]/join  /api/notifications/unread  /api/push/(un)subscribe
        /api/library/download  /api/share/[file]  /api/verse-bg/[skin]
```
**Asset prefixes:** `/_astro/*` (→ rename to `/_community/*`, §2.4), `/favicon*`, `/sw.js`, `/manifest.webmanifest`, `/sitemap-*`, `/robots.txt`, `/geo/*`.

### 1.3 Authoritative route inventory — marketing
```
/  /404  /blog  /blog/[slug]  /blog/preview/[slug]
/download  /join  /nations  /partner  /privacy  /terms  /review  /samples
/the-fathers-heart-bible  /the-fathers-heart-bible/lead-translator
/read  /read/[book]/index  /read/[book]/[chapter]   ← 823 prerendered Bible pages
```
Static root: `robots.txt`, `sitemap-index.xml`, `sitemap-0.xml`, `llms.txt`, `llms-full.txt`, `og-image.png`, `favicon.svg`, `BingSiteAuth.xml`, `google2e1786024f7a270a.html`, IndexNow key `e196c4db…txt`, `_headers`, `/studio` (Sanity Studio).

### 1.4 Namespace overlap — RESOLVED

| Path | Marketing | Community | Resolution |
|---|---|---|---|
| `/read` + `/read/*` | **823 indexed Bible pages** | audio "Reading Edition" | **✅ Q1: marketing keeps `/read`; community reader moves to `/listen`.** Reversible. |
| `/_astro/*` | marketing bundles | community bundles | **✅ rename community to `/_community/*`** (§2.4) |
| `/` | marketing homepage | redirect → `/read` | **✅ apex `/` = marketing; `join./` 301s → `apex/` (Q2)** |
| `/404`, `/favicon.svg` | marketing | community | apex serves marketing's; community 404 bodies still flow through the proxy. Fine. |
| `/robots.txt`, `/sitemap-*` | marketing | community | **✅ unify at apex** (§4.4) |
| `/join` | marketing | *(CTA components, no page)* | no collision — `/join` = marketing |
| `/about` | *(none)* | community | no collision — `/about` = community |

Both readers render the **same scripture source** (community `npm run sync-bible` copies `/srv/sites/FHB/src/content/bible`). So `/read` (text, SEO-canonical) and `/listen` (audio Reading Edition + member functions) are two presentations of identical content — which is exactly why splitting them by prefix is safe.

### 1.5 Auth internals
- **Cookies** (`src/lib/supabase-server.ts` `setAll`): `httpOnly, sameSite:'lax', secure:PROD, path:'/'`, **no `Domain`** → host-only. Under the proxy they attribute to the host that delivered the response (= **apex**). → §4.2.
- **Tenant** (`getTenant`): `X-Community-Slug` header → Host (`join.`→`fhb`) → env → first registry entry. Host `join.` resolves correctly.
- **Magic-link email host:** built against **`tenant.customDomain`** (=`join.`); trusts inbound `redirect_to` only for `customDomain`/`*.pages.dev`/localhost. So links point at `join.` and ride the `join.`→apex 301. `verifyOtp(token_hash)` is server-side/device-independent.
- **Post-auth default landing:** `/read` → **becomes `/listen`** after the move.
- **CSRF:** Astro `checkOrigin` is **active** (confirmed: bare `curl -X POST` → 403 "Cross-site POST form submissions are forbidden"). Under the proxy, browser `Origin` = apex while app Host = `join.` → mismatch would 403 legit POSTs. **✅ Q3: the Worker rewrites `Origin`→`https://join.fathersheartbible.com` on proxied requests** (validate in Phase-1 preview).

### 1.6 Supabase Auth config (`supabase/config.toml`)
```
site_url                 = https://join.fathersheartbible.com
additional_redirect_urls = [ http://localhost:4331, https://join.fathersheartbible.com ]
auth.hook.send_email.uri = https://join.fathersheartbible.com/api/auth/send-email   (enabled, HMAC)
```
⚠ The Send-Email hook is a **server-to-server POST from Supabase** → the `join.`→apex 301 **must exempt `/api/auth/send-email`**. ⚠ `supabase config push` **REPLACES** the live config — preserve the whole file; only *add* the apex URL.

### 1.7 Cloudflare state
- **DNS (zone `fathersheartbible.com`, all proxied):** apex→`fathersheartbible.pages.dev`; `www`→same; `join`→`community-cm1.pages.dev`; TXT google-site-verification present.
- **⚠ Existing Worker route:** `fathersheartbible.com/*` → **`smp-citation-bot-logger`** (KV `RECENT_HITS`=`d3163010db994276ab1351a55c8be533`; also on `spiritmediapublishing.com/*`). One Worker per route → the new router **subsumes the logger** (§2.6). Account `193f7a497a37609cd0be366ecbb19122`.

### 1.8 Canonical / robots / sitemap (confirmed at `join.`)
- Community `Layout.astro`: canonical + `og:url` from `Astro.site` → flips via `PUBLIC_SITE_URL`.
- Community sitemap (16 URLs) **wrongly includes gated pages** (`/feed`, `/dms`, `/directory`, `/moderation`, `/profile`, `/settings`) — prune to public-only before merging into apex sitemap.

---

## 2. Worker Design (PROPOSAL — not deployed)

### 2.1 Topology
```
 Browser → fathersheartbible.com/*  ─▶  Worker fhb-apex-router  (replaces citation-logger route)
   community prefix?  yes ─▶ fetch https://join.fathersheartbible.com/…           ← app sees Host=join.
                              + X-Apex-Proxy:<secret>  + Origin→join. (POSTs)        ⇒ tenant=fhb,
                                                                                       cookies→apex
                    else ──▶ fetch https://fathersheartbible.pages.dev/…           ← marketing origin (no loop)

 Browser → join.fathersheartbible.com/*  (DNS unchanged → community Pages)
   community middleware: Host==join. AND no X-Apex-Proxy secret AND path != /api/auth/send-email
        ⇒ 301 → fathersheartbible.com/<path><query>   (special-case: /read* → /listen*)
   (apex Worker sub-requests carry the secret ⇒ served, never redirected → no loop)
```
- **Proxy community via `join.`** (not `*.pages.dev`) so the app sees `Host: join.` — tenant/`url.origin`/magic-link stay unchanged.
- **Marketing default = `fathersheartbible.pages.dev`** (not `fetch(request)`) to avoid Worker self-loop.
- **`join.` 301 lives in community middleware** (not a Worker on `join.`): keeps `join.` bound directly to its Pages project so the apex Worker's sub-requests reach the app with `Host: join.` and no loop, while real browsers get 301'd.

### 2.2 Locked path-prefix routing table
`isCommunity(pathname)` → community origin for any of:
```
EXACT:   /about /contributors /directory /feed /groups /library /map
         /moderation /profile /settings /shareables /login
         /sw.js /manifest.webmanifest
PREFIX:  /listen  (and /listen/)          ← the relocated audio reader
         /dms  (and /dms/)
         /events (and /events/)
         /members/   /spaces/   /og/
         /api/                            ← ALL api incl. auth + giving (untouched)
         /_community/                     ← renamed hashed-asset dir (§2.4)
DEFAULT → marketing:  /  /read  /read/*  /blog*  /download /join /nations /partner
         /privacy /terms /review /samples /the-fathers-heart-bible* /404
         /_astro/* /robots.txt /sitemap* /llms*.txt /og-image.png /favicon* /studio
         BingSiteAuth.xml  google-verify  IndexNow key
```

### 2.3 Auth / Host / cookie preservation
1. Community requests proxied to `https://join.…` with **all client headers forwarded** (Cookie/Authorization/Content-Type/method/body) + `X-Apex-Proxy:<secret>`; on requests carrying an `Origin`, the Worker **rewrites `Origin`→`https://join.fathersheartbible.com`** (Q3 / CSRF). Host not rewritten (URL host = `join.`).
2. **`Set-Cookie` passes through** → browser attributes cookies to **apex**. With `domain=.fathersheartbible.com` (§4.2) they're shared apex↔join↔www — seamless.
3. **Magic-link round trip:** apex/login → apex/api/auth/magic-link → email link host=`join.` → click → `join.` middleware 301 `/api/auth/callback?token_hash…` (query preserved) → apex/api/auth/callback → Worker proxies to join. (secret) → `verifyOtp` → Set-Cookie (→apex/.fathersheartbible.com) → 303 `/listen`. ✅
4. **Send-Email hook** → join./api/auth/send-email (no secret) → middleware **exempts** → runs. ✅
5. **Stripe webhook** → apex/api/giving/webhook → Worker streams body unmodified + `Stripe-Signature` → HMAC verifies. ✅ (register apex URL in Stripe, §6 step d.)
6. **`redirect:'manual'`** → origin 3xx (the `303→/login` gate, `.ics`, etc.) pass through unchanged.

### 2.4 `/_astro` collision fix (one line, community)
```js
build: { inlineStylesheets: 'auto', assets: '_community' }   // was default '_astro'
```
Community pages reference `/_community/<hash>` (root-relative → apex → Worker routes `/_community/*` → community). Marketing keeps `/_astro/*`. **Same-origin (apex) for every asset → no CORS, no cross-origin module/font work.**

### 2.5 Edge cases
- **Trailing slashes / query strings:** preserved verbatim on proxy and 301 (no normalization). 301 map mirrors sitemap's trailing slashes.
- **Methods/bodies:** streamed unbuffered (Stripe-safe), all verbs.
- **CSRF/Origin:** handled by the Worker Origin-rewrite (§2.3); Referer fallback noted for the preview check.
- **Realtime WebSockets:** client → `wss://*.supabase.co` directly (CSP `connect-src`), not via Worker — unaffected.
- **`/sw.js` scope (Q5 ✅):** community SW is **push-only — no `fetch` handler** (verified `public/sw.js`: `install`/`activate`/`push`/`notificationclick` only). It never intercepts navigations or caches, so registering at `apex/sw.js` (scope `/`) is harmless to marketing pages. No scoping needed.

### 2.6 FINAL Worker code — `fhb-apex-router`
```js
// fhb-apex-router — Option A unifier for fathersheartbible.com
// Replaces the smp-citation-bot-logger route on fathersheartbible.com/*
// (citation logging folded in). join. stays the community origin AND a 301
// redirector (the 301 lives in community middleware, guarded by the secret
// this Worker sends). Marketing keeps /read (823 indexed pages); the community
// audio reader lives at /listen.
//
// wrangler.toml bindings:
//   [[kv_namespaces]] binding=RECENT_HITS  id=d3163010db994276ab1351a55c8be533
//   APEX_PROXY_SECRET  (wrangler secret) — also set on the community app env
//   [[routes]] pattern="fathersheartbible.com/*" zone_name="fathersheartbible.com"
//   account_id = "193f7a497a37609cd0be366ecbb19122"

const MARKETING_ORIGIN = 'https://fathersheartbible.pages.dev';
const COMMUNITY_ORIGIN  = 'https://join.fathersheartbible.com';

const COMMUNITY_EXACT = new Set([
  '/about', '/contributors', '/directory', '/feed', '/groups', '/library',
  '/map', '/moderation', '/profile', '/settings', '/shareables', '/login',
  '/sw.js', '/manifest.webmanifest',
]);
// Prefixes matched as exact OR "<prefix>/..." (so /events and /events/x both hit).
const COMMUNITY_PREFIXES = [
  '/listen', '/dms', '/events', '/members', '/spaces', '/og', '/api', '/_community',
];

function isCommunity(pathname) {
  if (COMMUNITY_EXACT.has(pathname)) return true;
  for (const p of COMMUNITY_PREFIXES) {
    if (pathname === p || pathname.startsWith(p + '/')) return true;
  }
  return false;
}

// ── citation-bot logging (folded in from smp-citation-bot-logger) ──
const CITATION_BOT_PATTERNS = [
  { name: 'ChatGPT-User',  pattern: /ChatGPT-User/i,  role: 'citation' },
  { name: 'OAI-SearchBot', pattern: /OAI-SearchBot/i, role: 'citation' },
  { name: 'PerplexityBot', pattern: /PerplexityBot/i, role: 'citation' },
  { name: 'GoogleOther',   pattern: /GoogleOther/i,   role: 'citation' },
  { name: 'ClaudeBot',     pattern: /ClaudeBot/i,     role: 'training' },
  { name: 'anthropic-ai',  pattern: /anthropic-ai/i,  role: 'training' },
  { name: 'GPTBot',        pattern: /GPTBot/i,         role: 'training' },
  { name: 'CCBot',         pattern: /CCBot/i,          role: 'training' },
  { name: 'bingbot',       pattern: /bingbot/i,        role: 'indexer'  },
];
function logCitationBot(request, ctx, env) {
  const ua = request.headers.get('user-agent') || '';
  const hit = CITATION_BOT_PATTERNS.find((e) => e.pattern.test(ua));
  if (!hit) return;
  const url = new URL(request.url);
  const record = {
    ts: new Date().toISOString(), bot: hit.name, role: hit.role,
    host: url.hostname, path: url.pathname,
    referer: request.headers.get('referer') || '',
    country: request.cf?.country || '', asn: request.cf?.asn || '', userAgent: ua,
  };
  try {
    if (env.RECENT_HITS) {
      const key = `${url.hostname}:${record.ts}:${Math.random().toString(36).slice(2, 8)}`;
      ctx.waitUntil(env.RECENT_HITS.put(key, JSON.stringify(record), { expirationTtl: 60 * 60 * 24 * 30 }));
    }
  } catch (e) { console.error('KV write failed', e); }
  console.log('citation-bot', JSON.stringify(record));
}

function proxyTo(request, originBase, extraHeaders) {
  const inUrl  = new URL(request.url);
  const outUrl = new URL(inUrl.pathname + inUrl.search, originBase);
  const headers = new Headers(request.headers);          // forwards Cookie/Auth/etc.
  if (extraHeaders) for (const [k, v] of Object.entries(extraHeaders)) headers.set(k, v);
  return new Request(outUrl, {
    method: request.method,
    headers,
    body: request.body,                                  // streamed; never buffered (Stripe-safe)
    redirect: 'manual',                                  // pass origin 3xx through unchanged
  });
}

export default {
  async fetch(request, env, ctx) {
    logCitationBot(request, ctx, env);                   // passive AEO observability (E2)
    const { pathname } = new URL(request.url);

    if (isCommunity(pathname)) {
      const extra = { 'X-Apex-Proxy': env.APEX_PROXY_SECRET };
      // CSRF: Astro checkOrigin compares Origin to Host(=join.). Browser sends
      // apex Origin → mismatch → 403. Rewrite Origin to the host the app sees.
      if (request.headers.has('Origin')) extra['Origin'] = COMMUNITY_ORIGIN;
      return fetch(proxyTo(request, COMMUNITY_ORIGIN, extra));
    }
    return fetch(proxyTo(request, MARKETING_ORIGIN));
  },
};
```

### 2.7 Companion community-side changes (one redeploy of unchanged features)
Per Kevin's "routing + config, not a rewrite" framing (Q4), these are all config-level / mechanical:

1. **Reader prefix move** — `git mv src/pages/read → src/pages/listen` (3 files: `index.astro`, `[book]/index.astro`, `[book]/[chapter].astro`) and find-replace `/read`→`/listen` across the ~20 references found in the audit: `middleware.ts` allowlist, `api/auth/callback.ts` default landing, `login.astro`, `shareables.astro`, `contributors.astro`, `spaces/[slug].astro` (×2), `components/ChapterAudioPlayer.astro` (`loginNext`), `index.astro` redirect target, and the self-links inside the moved files. (Leave `bible`/`sync-bible`/`unread`/`read-only` strings alone.)
2. **Asset namespace** — `astro.config.mjs`: `build.assets:'_community'` (§2.4).
3. **Canonical flip** — `PUBLIC_SITE_URL=https://fathersheartbible.com`. **This is a DEPLOY-TIME env var, deliberately NOT committed** (hardcoding it would flip the dev-preview canonical to apex). Set it at the go-live build only, via the `community` CF Pages project → Settings → Environment variables (Production) **or** export it in the go-live build command. Until then `Astro.site` stays `join.` (committed default), so the dev preview is unaffected.
4. **Cookie domain** — `src/lib/supabase-server.ts` `setAll()`: add `domain: '.fathersheartbible.com'` (PROD only) so sessions are shared apex↔join↔www (Q8).
5. **`join.` 301 + reader special-case** — top of `src/middleware.ts onRequest`, before static bail + tenant resolution:
```ts
const reqUrl = new URL(context.request.url);
const host = context.request.headers.get('host')?.split(':')[0]?.toLowerCase() ?? '';
const fromApexProxy = context.request.headers.get('x-apex-proxy') === env.APEX_PROXY_SECRET; // env via readEnv
if (host === 'join.fathersheartbible.com' && !fromApexProxy && reqUrl.pathname !== '/api/auth/send-email') {
  // Legacy community-reader links keep working: /read* → /listen* on apex.
  const path = (reqUrl.pathname === '/read' || reqUrl.pathname.startsWith('/read/'))
    ? reqUrl.pathname.replace(/^\/read/, '/listen')
    : reqUrl.pathname;
  return Response.redirect(`https://fathersheartbible.com${path}${reqUrl.search}`, 301);
}
```
> **Pre-staged on `dev` (2026-06-05):** changes 1, 2, 4, and 5 are committed to the community `dev` branch (reader moved to `src/pages/listen/`, `build.assets:'_community'`, host-gated cookie domain in `supabase-server.ts`, middleware 301 block; plus `APEX_PROXY_SECRET` added to `runtime-env.ts` and the sitemap pruned to public-only). Change 3 (`PUBLIC_SITE_URL`) is intentionally deploy-time-only. Local `npm run build` passes; `dist/_community/` assets confirmed; sitemap is public-only with `/listen`. The middleware 301 + cookie domain are **host-gated → inert on localhost/preview**, so the dev preview behaves exactly as before. The go-live window is now **merge + route-bind + config push, no coding.** Validate the unverifiable bits in Phase-1 preview (§3, §Appendix).

### 2.8 Canonical dedup safeguard — `/listen` → `/read` (CONFIRMED, committed on `dev`)

`/listen` serves the **same scripture text** as the 823 indexed `/read` pages, so it must never be indexed as duplicate content. **Done (community `dev`, commits `7fd32a8` + `7bc803d`):**
- `src/layouts/Layout.astro` rewrites `canonical` **and** `og:url` for any `/listen` or `/listen/*` path to the `/read` equivalent, built from `Astro.site` (so it follows `PUBLIC_SITE_URL` — `join./read/*` on preview, `apex/read/*` at go-live). **Canonical only — no `noindex`** (the two directives conflict).
- **Trailing slash (commit `7bc803d`):** preview validation found the marketing site serves + self-canonicalizes `/read/*` **with a trailing slash** (`/read/john/3/`) and 308-redirects the non-slash form; the sitemap lists the trailing-slash form. The canonical now emits the trailing-slash `/read` URL so it points at the **exact indexed 200 page, not a 308 redirect.**
- `/listen` dropped from the community sitemap (added to the `astro.config.mjs` filter exclusions) so the non-canonical URLs aren't listed.

**Verified on the dev preview (`dev.community-cm1.pages.dev`):**

| URL | HTTP | rendered `<link rel="canonical">` (= `og:url`) | marketing target |
|---|---|---|---|
| `/listen` | 200 | `https://join.fathersheartbible.com/read/` | `/read/` → 200 |
| `/listen/john` | 302 → `/listen/john/1`; resolved page | `https://join.fathersheartbible.com/read/john/1/` | `/read/john/1/` → 200 |
| `/listen/john/3` | 200 | `https://join.fathersheartbible.com/read/john/3/` | `/read/john/3/` → 200 |

Marketing targets confirmed real 200s (trailing slash). Sitemap confirmed `/listen`-free. At go-live (`PUBLIC_SITE_URL=https://fathersheartbible.com`) these resolve to `https://fathersheartbible.com/read/...`. **The §6 "confirm canonical in place" gate is satisfied** — re-verify once more on the apex after the route bind.

---

## 3. Preview / Staging Validation Plan (Phase 1 — first step of the sign-off window)

Validate on a **non-production** surface before binding the apex route. Surface (Q7 default): a preview Worker whose `MARKETING_ORIGIN`/`COMMUNITY_ORIGIN` point at the two projects' preview deployments, exercised via `wrangler dev --remote` and/or a temporary `stage.` preview route created *inside* the window (the only DNS touch, gated).

> **SAFE SUBSET RUN 2026-06-05** (local `wrangler dev` → community origin = `dev.community-cm1.pages.dev`, marketing = `fathersheartbible.pages.dev`; nothing deployed/bound). **PASS:** A marketing passthrough (`/`,`/blog/`,`/read/john/3/`→200); B community passthrough (`/map`,`/listen`,`/listen/john/3`→200; gated `/profile`,`/settings`→303 `/login`; `/feed`→200 = correct guest-teaser); C asset namespace (community `/_community/*` 200, marketing `/_astro/*` 200, **Playwright: 0 failed requests, 0 console errors**); D Origin-rewrite (worker log: `/api/comments` POST `origin-out= https://join.fathersheartbible.com`); E citation logger (`PerplexityBot` → `citation-bot {…}` logged). **PARTIAL (proxy path proven; full assertion prod-coupled):** F Stripe — `/api/giving/intent`→303 gated (client_secret needs a session); `/api/giving/webhook` reachable + handler runs (returns its own `501 secret-not-set` — the **dev preview env has no `STRIPE_FHB_WEBHOOK_SECRET`**, so HMAC-verify can't be tested off-prod). Tenant resolved to `fhb` on every proxied hit. **DEFERRED to runbook a/e (host-gated to prod):** the magic-link auth round trip, cookie-on-apex, and the `join.`→apex 301. Also a fix landed from this run: canonical now uses marketing's **trailing-slash** form (`/read/john/3/`) — see §2.8.

**All must pass:**
1. **Marketing passthrough:** `/`, `/blog/`, `/download/`, `/read/john/3/` → 200 + `/_astro/*` 200.
2. **Community passthrough:** `/feed`→303 `/login`; `/events/`→200; `/map`→200 (MapLibre tiles); `/listen/john/3`→200 (audio reader).
3. **Asset namespace:** community pages reference `/_community/*` (200); marketing `/_astro/*` (200); **zero asset 404s** (Playwright MCP per team rule).
4. **Full magic-link round trip:** POST `/api/auth/magic-link`→`?sent=1`; email link carries `token_hash`+`type`+`next`; click → `join.`→apex 301 (query preserved) → callback → lands authed on `/listen`; **session cookie set on `.fathersheartbible.com`, HttpOnly; reload `apex/feed` stays authed**; signout → `apex/feed`→303 `/login`. *(Validates the cookie-attribution ASSUMPTION.)*
5. **Audio reader:** `/listen/<book>/<chapter>` authed → player initialises + chapter plays (the member lure).
6. **CSRF/Origin:** a real community POST (RSVP/profile) from an apex page is **not** 403'd. *(Validates the Origin-rewrite fix; if Referer-based, extend the rewrite.)*
7. **Stripe (LIVE keys — test events only):** `/api/giving/intent` returns a client secret through the proxy; Stripe CLI `--forward-to .../api/giving/webhook` HMAC-verifies. **No real charges.**
8. **`join.` redirector:** `GET join./feed`→301 `apex/feed`; `GET join./read/john/3`→301 `apex/listen/john/3`; `GET join./api/auth/send-email`→not redirected; apex-proxied sub-request to `join./feed` (secret)→200.
9. **Citation logger:** `curl -A PerplexityBot apex/`→KV record / `wrangler tail` line.

Gate: **all 9 green** before §6 step (c).

---

## 4. Canonical Migration Plan (Phase 2)

### 4.1 Canonical flip — build community with `PUBLIC_SITE_URL=https://fathersheartbible.com`. Marketing already apex. Verify rendered `<link rel="canonical">` on a proxied community page = apex.

### 4.2 ⚠ Highest-risk step — Supabase host / cookie domain (de-risked)
- **Supabase:** `config push` adding `https://fathersheartbible.com` to `additional_redirect_urls` (keep `join.`+localhost). **Preserve the entire `config.toml`** (push REPLACES). Keep `send_email.uri` at `join.` (exempted from the 301). `site_url` stays `join.` for the minimal window (links are built from `tenant.customDomain` + carried by the 301).
- **Cookie domain (Q8 ✅ default = seamless):** ship `domain: '.fathersheartbible.com'` in `setAll()`. With the proxy, new-login cookies already attribute to apex; the explicit parent domain additionally keeps **existing `join.` sessions valid on apex (no forced re-login)** and covers the transition. Reversible (a cookie attribute). *Alternative if Kevin prefers tighter scope: drop the domain and accept a one-time magic-link re-auth.*

### 4.3 OG + shared-chrome links
- `og:url` follows canonical; `og:image` (`/og/verse/*`) routes via `/og/` → works.
- Community `Layout.astro` nav already links apex-absolute — no change. Internal links root-relative → resolve to apex.
- Marketing links to `https://join.fathersheartbible.com/...` → update to apex-relative (`/listen`, `/feed`, …); grep `/srv/sites/FHB/src` for `join.fathersheartbible.com`, count before/after (verification rule).

### 4.4 Unified robots + sitemap
- Apex `robots.txt` = marketing's, single `Sitemap: https://fathersheartbible.com/sitemap-index.xml`; add gated-path disallows (`/dms`, `/settings`, `/spaces/` functions).
- Apex `sitemap-index.xml` references both the marketing sitemap and a community sitemap re-served at apex (route `/community-sitemap.xml` → community origin) **or** regenerate marketing sitemap to include the ~10 community public URLs (now `/listen` not `/read`). **Prune gated pages first.**
- Resubmit in GSC + Bing; IndexNow ping changed URLs.

### 4.5 301 map (every `join.` path → apex)
**Blanket rule** (community middleware, §2.7): `https://join.…/<path><query>` → 301 → `https://fathersheartbible.com/<path><query>`.
**Special-case:** `join./read*` → `apex/listen*` (community reader relocated).
**Exempt:** `/api/auth/send-email`; requests carrying `X-Apex-Proxy`.

| `join.` path | → apex | Notes |
|---|---|---|
| `/` | `/` | apex `/` = marketing (Q2) |
| `/about/` `/contributors/` `/groups/` `/library/` `/map/` `/shareables/` `/login/` `/events/` | same | public community pages |
| `/read/` , `/read/*` | **`/listen/` , `/listen/*`** | community reader relocated (special-case) |
| `/feed/` `/directory/` `/spaces/<slug>` | same | guest teasers (drop teaser pages from sitemap) |
| `/dms/` `/dms/<id>` `/members/<id>` `/profile/` `/settings/` `/moderation/` | same | gated; drop from sitemap |
| `/og/*` `/api/verse-bg/*` `/api/share/*` | same | public asset endpoints |
| `/api/*` (other) | same | functional; repoint real external callers (Stripe webhook) to apex |
| `/api/auth/send-email` | **NOT redirected** | Supabase server hook |

---

## 5. Rollback + Risk Register

### 5.1 Rollback (fast, ordered)
1. **Kill-switch (seconds):** delete the `fathersheartbible.com/*` route from `fhb-apex-router` (or re-point to `smp-citation-bot-logger`). Apex instantly serves marketing-only; community returns to `join.`-only. No DNS wait.
2. Redeploy community without the middleware 301 block → `join.` serves directly again.
3. Rebuild community with `PUBLIC_SITE_URL=https://join.fathersheartbible.com`.
4. `supabase config push` removing apex (and revert cookie-domain if needed).
5. Re-submit prior sitemaps.
Community Pages project + `join.` DNS are never deleted → pre-migration world is always one route-delete away.

### 5.2 Risk register
| # | Risk | L | I | Mitigation |
|---|---|---|---|---|
| R1 | `/read` 823 pages broken/duplicated | Low (default keeps `/read`) | Critical | v1 marketing keeps `/read`; community→`/listen`; only an override touches the 823 pages, gated on a parity audit. |
| R2 | Auth breaks at go-live | Med | High | Full preview round-trip §3.4 (cookie-on-apex assertion); kill-switch. |
| R3 | `config push` wipes a setting (REPLACE) | Med | High | Diff before/after; push whole file +1 URL; verify MFA/rate-limit/hook intact. |
| R4 | Stripe webhook breaks | Low | High | Body streamed unmodified; `/api/*` exempt from 301; register apex URL; Stripe CLI test. |
| R5 | Existing users logged out | Low (default ships parent-domain cookie) | Low–Med | Q8 `domain=.fathersheartbible.com`. |
| R6 | `/_astro` asset collision | (mitigated) | High | `build.assets='_community'`; preview §3.3. |
| R7 | checkOrigin 403s community POSTs | Med | Med | Worker Origin-rewrite (§2.3/2.6); preview §3.6. |
| R8 | Citation logging lost | Med | Low | Folded into router (§2.6, same KV); preview §3.9. |
| R9 | SW controls whole apex | (resolved) | — | Push-only SW, no fetch handler (§2.5). Harmless. |
| R10 | GSC ranking dip during reindex | Med | Med (transient) | Single-hop 301s, correct canonical, sitemap resubmit + IndexNow; monitor GSC ×2–3 wks. |
| R11 | `www` not consolidated | Low | Low | Confirm `www`→apex 301 in preview; add if missing (out of core scope). |

---

## 6. Execution Runbook (single clean window)
> Pre-req: §3 1–9 green; window chosen. **Kevin** = the gated prod actions; each verify-before-next.

| # | Step | Who | Verify |
|---|---|---|---|
| 0 | Confirm preview sign-off; freeze other deploys to both repos | Jona | §3 all green |
| a | Community redeploy — **already pre-staged on `dev`** (§2.7 changes 1,2,4,5 committed; verify the diff). Set `PUBLIC_SITE_URL=https://fathersheartbible.com` (change 3, deploy-time) on the `community` CF Pages prod env. Answer **S1** (nav "Read FHB" → `/read` or `/listen`) and apply if `/listen`. **`dev→main` = Kevin.** | Dev→**Kevin** | `join./feed`→301 apex; `join./read/x`→301 `apex/listen/x`; `/api/auth/send-email` not redirected; apex-proxy (secret) serves |
| b | Supabase `config push` +apex redirect URL (full toml preserved) | Dev (admin creds) | diff = +1 URL; magic-link still sends |
| c | Deploy `fhb-apex-router` — **source pre-staged** at `/home/deploy/bin/workers/fhb-apex-router/` (route block commented out in `wrangler.toml`). `wrangler secret put APEX_PROXY_SECRET` on the Worker **and** set the same value on the community CF Pages env; KV already bound. `wrangler deploy` **without** binding the route. | Dev | preview alias serves; `wrangler tail` clean |
| d | **Bind route `fathersheartbible.com/*` → `fhb-apex-router`** (replaces citation-logger on this zone; keep its `spiritmediapublishing.com/*`). **= Kevin (go-live flip).** | **Kevin** | `apex/`→200 marketing; `apex/feed`→303; `apex/map`,`apex/listen/john/3`→200; `/_astro`+`/_community` 200 |
| e | Prod authed smoke: magic-link + cookie-on-apex + reader audio + one POST (CSRF) + signout; **re-confirm `/listen` canonical = `https://fathersheartbible.com/read/...`** (§2.8, now on apex base) | Dev | login persists on reload; POST not 403'd; canonical/og:url on `/listen*` point to apex `/read*` |
| f | Stripe: register `apex/api/giving/webhook`; send test event | Dev | 200 + HMAC ok |
| g | SEO: unify robots/sitemap (`/listen`, prune gated); resubmit GSC+Bing; IndexNow ping | Dev | sitemap 200; GSC accepts |
| h | Marketing internal links `join.…`→apex-relative (grep count before/after) | Dev | expected residual only |
| i | Monitor GSC + CF analytics + citation KV + auth errors ×2–3 wks | Dev | no 404 spike; impressions migrate; auth flat |

**Abort:** auth failure (e), asset 404 storm (d), or webhook failure (f) → Rollback §5.1 step 1, diagnose off-prod.

---

## 7. Open-Questions Log — RESOLVED
| Q | Resolution | Type |
|---|---|---|
| **Q1** `/read` | **Marketing keeps `/read` (823 pages); community reader → `/listen`.** Reversible; Kevin may later promote the community reader to `/read` (parity audit). | default chosen — Kevin may override |
| **Q2** `join./` | → `apex/` (marketing home). Reader is `/listen`. | default chosen — reversible |
| **Q3** CSRF/Origin | Worker rewrites `Origin`→`join.` on proxied requests (checkOrigin confirmed active). Validate in preview. | resolved (verify in preview) |
| **Q4** "no rebuild" | The 5 §2.7 changes are config-level/mechanical, fit "routing + config." Proceed. | resolved (note) |
| **Q5** SW scope | Push-only SW, no fetch handler → harmless at `apex/sw.js`. No scoping. | resolved (read-only) |
| **Q6** `/verses` | No such route. = `/shareables` + `/og/verse/*` + `/api/verse-bg/*`. | resolved (read-only) |
| **Q7** staging | Preview Worker + `*.pages.dev` previews via `wrangler dev --remote`; optional `stage.` route created inside the window. | default chosen |
| **Q8** cookie domain | Ship `domain=.fathersheartbible.com` (seamless, no forced re-login). Reversible. | default chosen — Kevin may override |
| **Q9** Stripe | Migration validates webhook/intent with **test events only**; no real charges. (Stripe LIVE-mode Elements launch decision is separate.) | resolved (operating note) |

---

## Appendix — ASSUMPTIONS to validate in Phase-1 preview (the first step of the sign-off window, not now)
- **Cookie attribution under the proxy** lands on `.fathersheartbible.com`/apex (asserted from Set-Cookie semantics) → §3.4.
- **Astro `checkOrigin`** is satisfied by the Worker Origin-rewrite (and doesn't also require Referer) → §3.6.
- **`build.assets:'_community'`** is honored by Astro 5 + `@astrojs/cloudflare` (inspect preview `dist/`).
- **`www.fathersheartbible.com`** already 301s to apex (R11) → §3.
- The apex Worker sub-request to `join.` reaches the community app without re-entering a Worker (confirmed: only `fathersheartbible.com/*` + `spiritmediapublishing.com/*` routes exist; `join.` has none) → §3.8.
- Community sitemap currently lists gated pages → prune in §4.4 (pre-existing cleanup).
```
