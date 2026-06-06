# FHB — Step-by-Step AEO / GEO Guide for Any Page or Blog

> How to write/update any FHB page, blog post, or chapter so AI answer engines (ChatGPT, Perplexity, Google AI Overviews, Claude, Gemini) cite it and Google ranks it. Companion: `fhb-seo-strategy.md`. This is the checklist — follow it top to bottom for every long-form page.

**AEO** = be the verbatim answer an AI engine extracts. **GEO** = be a source AI trusts to ground its answer. Both reward the same thing: a clear, well-structured, authoritative page that answers a real question.

## A. Pick the target & wire the basics (every page)

1. **One page = one question.** Decide the single query the page owns (from `fhb-seo-strategy.md` Tier B/C). Don't blend topics.
2. **Title tag** (≤60 chars) — contains the verbatim query + `Father's Heart Bible™`.
3. **Meta description** (150–160 chars) — restates the question + a differentiator + soft CTA.
4. **H1** — the verbatim question (or very close). Title, H1, and the **first 150 words** should all contain it; this is the single highest-correlation ranking factor.
5. **Canonical URL** + **OG/Twitter** tags (image, title, description). The Layout handles these — just pass good `title`/`description`/`ogImage` props.

## B. Structure for extraction (the two-layer pattern — this is what wins AEO)

6. **Direct-answer paragraph in the first 150–200 words** — answer the question completely and plainly. A reader (or an AI) can stop here and be satisfied. This is the block AI Overviews/Perplexity lift verbatim.
7. **One-sentence "Key takeaway" callout** right after the direct answer — the citation snippet.
8. **3–6 `<h2>` sections**, each a sub-question with its own answer. **Each H2's answer must be a self-contained 130–170-word block** that makes sense pulled out on its own (Perplexity extracts in ~134–167-word units).
9. **Listicle/numbered structure where the topic allows** ("5 verses that…", "3 ways Scripture…") — ~74% of AI citations come from Top-N content.
10. **Jump-link mini-TOC** if the page exceeds ~800 words.
11. **Length 1,200–1,800 words** for a pillar/blog (chapter pages are exempt — the verse text is the content).

## C. Authority signals (E-E-A-T → GEO)

12. **Author byline + credential line** — e.g. "By **Kevin White** — Lead Translator, Father's Heart Bible." Link to the author/translator page.
13. **Visible publish date + last-updated date** (`datePublished` + `dateModified`).
14. **≥1 statistic, expert quote, or citation in the body** (Princeton GEO study: +30–41% citation lift).
15. **2–4 outbound links to authority sources** — BibleGateway, YouVersion, Bible Hub, Blue Letter Bible, Strong's Concordance (for cross-references / original-language notes).
16. **2–3 internal links** to related FHB pages (other pillars, the relevant chapter in `/read`, the join/about page) — topical clustering.

## D. Structured data (JSON-LD — paste in the page's `<Fragment slot="head">`)

17. **`BlogPosting`** (blogs) or **`Article`/`CreativeWork`** (theme pages) with `headline`, `description`, `image`, `author`, `datePublished`, `dateModified`, `publisher`.
18. **`FAQPage`** wrapping 3–5 real Q&A pairs that mirror how people ask (these often become the AI Overview answer). Put the same Q&As as visible H2s on the page.
19. **`BreadcrumbList`** on every non-home page.
20. Validate with Google Rich Results Test before publishing.

## E. FHB voice & framing (what makes us the cited source)

21. **Frame verse content as "in the Father's Heart Bible"** — e.g. "In the Father's Heart Bible, John 3:16 reads…". This is the unique-translation angle that lets us own "<verse> father's heart bible" and feed translation-comparison queries.
22. **Lead with the Father's-heart lens** on theme pages (identity, sonship, abba, healing the father wound). Be **authoritative, not hedging** — definitive statements (backed by Scripture) get cited; "may sometimes" does not.
23. **Point to the experience**: every theme/blog page should link to *reading + listening* the relevant passage in `/read`, and end with a CTA to **join free** (audio, recommend, react).

## F. Per-page-type quick recipes

- **Blog pillar** (e.g. "abba father meaning"): A1–A5, full B, C, D (BlogPosting + FAQPage + Breadcrumb), E. ~1,400 words. → `/blog/<slug>/` on the marketing site, or a community resource page.
- **Chapter page** `/read/<bk>/<ch>`: title/description/canonical/OG (A2–A5), `Article` + `BreadcrumbList` JSON-LD (D17/D19), a one-line intro framing it "in the Father's Heart Bible" + the read/listen CTA (E). The verse text is the body — no word-count target.
- **Theme/landing page** (map, wall, groups): A2–A5 + a 1–2 sentence direct-answer intro + `BreadcrumbList`. Lighter than a pillar.

## G. After publishing (the signal phase)

24. **Regenerate `sitemap.xml`** so the new page is listed; re-submit in Google Search Console + Bing Webmaster Tools.
25. **Ping IndexNow** (key at `/home/deploy/bin/fhb-indexnow-key`) for fast Bing/ChatGPT discovery.
26. **Update `llms.txt`** at site root if it's a significant new page (introduces FHB + lists key URLs to AI engines).
27. **Confirm CF zone** allows citation bots in the signal phase (`ai_bots_protection`, `is_robots_txt_managed=false`) — see `cf-zone-settings.md`.
28. After ~2 weeks, check citations: `smp-aeo-audit.sh fhb` and the weekly citation cron logs (`/home/deploy/aeo-logs/fhb/`).

---

**The 30-second version:** one question per page → put it in the title, H1, and first 150 words → answer it directly up top + a key-takeaway line → 3–6 self-contained H2 sections → byline + dates + an authority link → BlogPosting/Article + FAQPage + Breadcrumb JSON-LD → frame it "in the Father's Heart Bible" with a read/listen + join CTA → submit sitemap + IndexNow.
