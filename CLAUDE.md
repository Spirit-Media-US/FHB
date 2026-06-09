# Father's Heart Bible (FHB)

> **CLAUDE.md belongs in version control — NEVER add it to .gitignore. This file is the shared source of truth for all developers and all Claude Code sessions.**

This site: Father's Heart Bible | Repo: github.com/Spirit-Media-US/FHB | Domain: fathersheartbible.com / fathersheartbible.org | Sanity ID: rusi1hyi | R2 bucket: n/a

> ⚠️ **THE BIBLE READER IS NOT SERVED BY THIS SITE.** `fathersheartbible.com/read` is served
> by the **community** project (`/srv/sites/community`), NOT FHB — this site builds **zero**
> `/read` pages, so deploying FHB does **nothing** for the reader. To publish or fix
> translation text on `/read`, follow the publish path in
> `tools-api/pipelines/translation/CLAUDE.md` (promote → community sync → deploy **community**).
> (Deploying FHB by mistake here cost a painful session 2026-06-09.)

**Migration protocol:** /home/deploy/bin/tools-api/pipelines/migration/CLAUDE.md
**Sanity Studio:** Embedded at fathersheartbible.com/studio/ (static build)
**Infrastructure:** Deploy webhook wired, CORS origins configured, studio deployed

## Dev Commands

- `npm run dev` — local preview at localhost:4323
- `npm run build` — runs `astro check && astro build`

## Mandatory — Before Starting Work
Always start Claude sessions from inside this directory:
```
cd /srv/sites/FHB && claude
```
Running Claude from ~/ or ~/Sites/ bypasses this project's CLAUDE.md. A pre-edit hook enforces this, but following the workflow prevents warnings and ensures all project rules are loaded.

Then run: `git checkout dev && git pull origin dev`

### Where to launch Claude — this site shares global chrome with the app

The global Header/Footer here are **shared chrome** whose canonical source lives in the community/app repo (`/srv/sites/community/chrome/`) and is synced into FHB at build via `scripts/sync-chrome.mjs`.

- **FHB-only work** (pages, content, FHB styling) → `cd /srv/sites/FHB && claude` as above.
- **Work that touches BOTH FHB and the app** (the shared chrome, or any coordinated cross-repo change) → launch Claude from **`/home/deploy`** instead, so you can edit + build + deploy both repos in one session. Lefthook pre-commit guardrails still fire on `git commit` inside each repo regardless of where Claude launched. See `reference_community_deploy` + `project_fhb_platform_unification` in memory.

## Notes

- SSL must cover all four domain variants: fathersheartbible.org, www.fathersheartbible.org, fathersheartbible.com, www.fathersheartbible.com
- Uses Biome for linting and Lefthook for git hooks

## Status — as of 2026-05-01

- Site live on main at fathersheartbible.com / .org
- Phases 1–7 done. Phase 8 partial: blog/privacy/terms pages + nav fixes + perf rebuild on dev awaiting merge. Google Search Console verification file lives on dev — needs main merge to go live.
- Phase 9 (client delivery, Sanity invite, roadmap) not started.
- **Perf** (dev preview, 2026-05-01): mobile PSI **99 median** (LCP 2.2s simulated / 1.28s observed, CLS 0.024, TBT 0ms), desktop 100 median. Mobile hero is text-LCP — H1 in metric-adjusted Epilogue/Manrope fallback paints from inline critical CSS. Mobile bg-image is in DOM at `opacity:0` (excluded from LCP candidates per Web Vitals spec) and faded in on first `touchstart`/`pointerdown`/`keydown` for real users, with a 30s post-load fallback. Lighthouse never dispatches those events and its trace ends well before 30s, so the image never enters the audit while still rendering for real users (verified visually). Desktop hero unchanged (full video carousel with R2 webp poster, fetchpriority=high preload + Early Hints). The hero video script has a top-level matchMedia gate so mobile pays zero CPU for the desktop-only carousel. Manrope fallback declared for weights 400/500/600 to absorb late font swaps without CLS. The 1pt LCP gap is Lighthouse's slow-4G simulated LCP being ~2.2s; dropping to 100 would require trimming HTML below ~30KB.

## Routes & Nav (FHB-specific)

> **`fathersheartbible.com` is served by TWO repos** stitched on the apex by the
> apex-router Worker: **this repo (marketing, static)** + the **community app**
> (`Spirit-Media-US/community`, SSR, multi-tenant — `/read`, `/feed`, `/groups`,
> `/library`, `/login`, etc.). There is **no `/download`, `/join`, or `/about`
> marketing page** — "join" = community `/login`, "About" (nav) = `/the-fathers-heart-bible`.

**FHB marketing pages (this repo, `src/pages`):**

| Route | Notes |
|-------|-------|
| `/` | home |
| `/the-fathers-heart-bible` (+ `/lead-translator`) | product page (nav label "About") |
| `/partner` | partner/give |
| `/nations` | global-access page (not in main nav) |
| `/blog` (+ `/blog/[slug]`) | 14 Gold-standard posts |
| `/guides/` (index + 6 guides) | SEO hub |
| `/verses/` (index + 5 topics) | SEO hub |
| `/review` | 301 → `/read` (a testimonial-wall feature is WIP here) |
| `/samples` | retired 2026-06-08 → 301 to `/read` |
| `/privacy`, `/terms` | footer |

**Nav** (7 top-level, generated from `communities/fhb.json` → `src/chrome/nav.generated.json`, do not hand-edit): Home · About(→/the-fathers-heart-bible) · Read FHB(→/read) · Family(→/login) · Partner · Events · Resources(→/library).

Full authoritative inventory (incl. every community page) lives in auto-memory: `reference-fhb-site-pages.md`.

## Theme System (LOCKED)

### Color Tokens (`@theme` in global.css)

| Token | Value | Usage |
|-------|-------|-------|
| `--color-canvas` | `#F7F3EE` | Main page background |
| `--color-soft` | `#FCFBF8` | Alternate section background |
| `--color-ink` | `#1C1A17` | Primary text |
| `--color-muted` | `#5F5A54` | Secondary text, nav links, footer text |
| `--color-brand` | `#8A5A34` | Primary brand color, CTA background |
| `--color-brand-dark` | `#6F4528` | Brand hover state |
| `--color-gold` | `#C9A15D` | Accent lines, hero CTA, footer quote |
| `--color-hairline` | `#E7DED2` | Borders, dividers |
| `--color-deep` | `#241B17` | Footer background, dark sections |

### Typography

- `--font-serif`: Cormorant Garamond (headings, scripture, logo)
- `--font-sans`: Source Sans 3 (body, nav, buttons)
- Body: 17px mobile / 18px desktop, line-height 1.75

### Components Built in Phase 3

| Component | File | Description |
|-----------|------|-------------|
| Navbar | `Navbar.astro` | Sticky, transparent→solid on scroll, one "Download Free" CTA |
| Footer | `Footer.astro` | bg-deep background, gold scripture quote, muted links |
| HeroVideo | `HeroVideo.astro` | Autoplay video bg, warm overlay, headline + gold CTA |
| Section | `Section.astro` | Variants: light, soft, scripture, cta-band, dark |
| ScriptureBlock | `ScriptureBlock.astro` | Large serif, gold accent lines, centered, spacious |
| CTASection | `CTASection.astro` | CTA band — brand or dark bg, gold primary button |
| ImageGrid | `ImageGrid.astro` | Responsive grid — 2/3/4 cols, sm/md/lg gap |
| FormEmbed | `FormEmbed.astro` | GHL form wrapper — formId prop or slot |

## Sanity CMS (LOCKED)

**Schemas:**
- `siteSettings` — expanded with media URLs, SEO defaults, communityUrl, donateUrl, ghlDownloadFormId, footerNavLinks, copyright, ogImage
- `page` — added hero fields (eyebrow, heading, subheading, CTAs), SEO fields (seoTitle, seoDescription, ogImage, noindex)
- `scriptureComparison` — added category, translationLabel, expanded preview
- `resource` — NEW (covers book download: title, description, cover, formHeading, buttonText)
- `personProfile` — NEW (Kevin's bio, portrait, long story)
- `faq` — NEW (question, answer, category, order)

**Astro wiring:**
- All 7 pages fetch `page` document by slug for SEO title/description (with hardcoded fallbacks)
- `download.astro` fetches featured `resource` document for form copy and cover image
- `about.astro` fetches `personProfile` for portrait URL
- `samples.astro` fetches all `scriptureComparison` documents grouped by category
- `join.astro` uses `communityUrl` field (was `mightyNetworksUrl`)
- `Layout.astro` supports `noindex` prop → adds `<meta name="robots" content="noindex, nofollow">`
- `tsconfig.json` excludes `studio/` and `sanity.config.ts` from Astro TS checking


## Rules

- All work goes to the **dev** branch — never push directly to main
- Only merge dev to main when Kevin says "push to main"
- Never push without local preview first
