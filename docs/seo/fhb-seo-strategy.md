# Father's Heart Bible — SEO / AEO / GEO Strategy (brief)

> Working doc for optimizing metadata across the FHB app (`join.fathersheartbible.com`) before submitting to Google. Companion: `fhb-aeo-geo-guide.md` (how to write any page/blog). Keep this short and current.

## 1. The reality (from real Ahrefs data, US, 2026-06-05)

| Keyword | Volume | Difficulty | Read |
|---|---:|---:|---|
| psalm 91 / psalm 23 / john 3:16 / genesis 1 | 457k / 314k / 166k / 56k | 59–70 | **Huge volume, hard.** BibleGateway/YouVersion own it. We win the long tail + brand. |
| bible app / online bible / bible online | 35k / 24k / 15k | 88–94 | Brutally competitive head terms — not our fight. |
| daily bible reading / bible reading plan | 13k / 5k | 55–68 | Realistic mid-tier targets. |
| the message bible / passion translation | 7.1k / 600 | 55 / **21** | **Translation-comparison** lane is winnable. |
| child of god | 6.1k | **18** | On-brand + winnable. |
| abba father meaning | 2k | **7** | On-brand + easy. Own it. |
| god as father / sons & daughters of god / father wound healing / spiritual orphan | 200 / 80 / 20 / 10 | 0–7 | Low volume, ~zero competition. These DEFINE FHB — own them all. |

**Conclusion:** We don't out-muscle BibleGateway on "psalm 23." We win three ways: (A) **own our brand + translation name** outright; (B) **own the "Father's heart / son-of-God identity" cluster** (low competition, on-brand); (C) **capture the enormous verse long-tail** through 776 unique chapter pages + two things no one else has — a **fresh translation** and **verse-by-verse audio**.

## 2. Positioning (the one sentence every page reinforces)

> **The Father's Heart Bible is a fresh translation that reveals God as a loving Father — free to read online, with verse-by-verse audio, and shaped by a global family of readers.**

Differentiators to weave into copy everywhere: *fresh/new translation · the Father's heart · read free online · listen (audio narration) · a reading community that helps refine it.*

## 3. Keyword tiers → where they go

**Tier A — Brand & translation (own outright; put in titles + H1 + first sentence):**
`Father's Heart Bible`, `Father's Heart Bible translation`, `Father's Heart Bible online`, `read Father's Heart Bible free`, `<verse> Father's Heart Bible` (e.g. "John 3:16 Father's Heart Bible").

**Tier B — Identity cluster (winnable; blog pillars + theme pages + woven into chapter copy):**
`the Father's heart of God`, `abba father meaning`, `child of God` / `son of God identity`, `god as father`, `sons and daughters of God`, `father wound healing through scripture`, `spiritual orphan vs son of God`, `how Jesus revealed the Father`.

**Tier C — Verse/chapter long-tail (the 776 `/read` pages; volume play):**
`<Book> <Chapter>` + `read / listen / audio / meaning / online` (e.g. "Genesis 1 meaning and audio", "Psalm 23 read and listen online"). One unique page per chapter, each also carrying the Tier-A brand angle.

> **Note on `<meta name="keywords">`:** Google has ignored it for years; it is NOT where rankings come from. The real levers are the **title tag, meta description, H1, on-page content, and structured data.** We'll still include a tasteful `keywords` tag (Bing gives trivial weight, and it documents intent), but the work below is what matters.

## 4. Metadata templates (apply across the app)

**Title** — `Primary phrase | secondary | Father's Heart Bible™` (≤ 60 chars where possible).
**Description** — 150–160 chars, contains the primary phrase + a differentiator + a soft CTA.

| Page | Title | Description |
|---|---|---|
| Home `/` | `Father's Heart Bible — Read & Listen to a Fresh Translation Free` | `Read the Father's Heart Bible free online — a fresh translation revealing God as a loving Father, with verse-by-verse audio. Join a global family of readers.` |
| Chapter `/read/<bk>/<ch>` | `<Book> <Chapter> — Read & Listen | Father's Heart Bible™` | `Read <Book> <Chapter> in the Father's Heart Bible — a fresh translation revealing the Father's heart. Read free online and listen to the audio narration.` |
| Book `/read/<bk>` | `<Book> — Read Online & Listen | Father's Heart Bible™` | `Read the book of <Book> in the Father's Heart Bible, free online with verse-by-verse audio. A fresh translation revealing God as Father.` |
| Reader `/read` | `Read the Father's Heart Bible Online — Free, with Audio` | `Read the Father's Heart Bible free online, book by book, with verse-by-verse audio narration. A fresh translation revealing the Father's heart.` |
| Map `/map` | `Readers Around the World — Father's Heart Bible` | `See the global family reading the Father's Heart Bible. Join free and add your place to the map.` |
| Wall `/contributors` | `Wall of Contributors — Father's Heart Bible` | `Meet the readers shaping the Father's Heart Bible as it goes out for the first time. Join free and add your voice.` |
| Groups `/groups` | `Community Groups — Father's Heart Bible` | `Read together, pray together, and grow together in the Father's Heart Bible community. Join free.` |
| Events `/events` | `Live Events & Readings — Father's Heart Bible` | `Live readings, teaching, and gatherings with the Father's Heart Bible family. See what's coming and RSVP.` |
| Library `/library` | `Free Resources — Father's Heart Bible` | `Free downloads, audio, and guides from the Father's Heart Bible. Read, listen, and go deeper into the Father's heart.` |
| Login/Join `/login` | `Join the Father's Heart Bible Family — Free` | `Join free to listen to the audio Bible, recommend wording, react, and join a global family reading the Father's Heart Bible.` |

## 5. Technical must-dos BEFORE submitting to Google

1. **Organization + WebSite JSON-LD sitewide** (in `Layout.astro` head) — name, url, logo, sameAs, SearchAction. Currently missing.
2. **Per-chapter `Article`/`CreativeWork` + `BreadcrumbList` JSON-LD** on chapter pages.
3. **Sitemap that actually lists the `/read` pages.** The app is SSR; `@astrojs/sitemap` only captures static routes, so the 776 chapters are almost certainly absent. Generate a custom `sitemap.xml` enumerating every live chapter (+ book + main pages) from the manifest.
4. **`robots.txt`** references the sitemap; confirm CF zone `is_robots_txt_managed=false` + `ai_bots_protection` set for the signal phase (per `cf-zone-settings.md` / `smp-aeo-readiness-standard.md`).
5. **Canonical** on every page (Layout already sets one — verify it's correct for `/read/<bk>/<ch>`).
6. **`llms.txt`** at site root introducing FHB to AI engines (AEO — see guide).
7. Submit `sitemap.xml` to **Google Search Console** and **Bing Webmaster Tools** (ChatGPT Search runs on Bing).

## 6. Authority sources (for outbound links — E-E-A-T / GEO)

BibleGateway · YouVersion · Bible Hub · Blue Letter Bible · Strong's Concordance. Link to these for cross-reference / original-language notes on theme + chapter pages.
