# Father's Heart Bible (FHB)

> **CLAUDE.md belongs in version control — NEVER add it to .gitignore. This file is the shared source of truth for all developers and all Claude Code sessions.**

This site: Father's Heart Bible | Repo: github.com/Spirit-Media-US/FHB | Domain: fathersheartbible.com / fathersheartbible.org | Sanity ID: rusi1hyi | R2 bucket: n/a

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

## Notes

- SSL must cover all four domain variants: fathersheartbible.org, www.fathersheartbible.org, fathersheartbible.com, www.fathersheartbible.com
- Uses Biome for linting and Lefthook for git hooks

## Status — as of 2026-04-25

- Site live on main at fathersheartbible.com / .org
- Phases 1–7 done. Phase 8 partial: 4 commits on dev awaiting merge (localhost SEO fix, blog/privacy/terms pages, EPERM build fix, blog nav link). Google Search Console verification file lives on dev — needs main merge to go live.
- Phase 9 (client delivery, Sanity invite, roadmap) not started.
- **Perf**: mobile PSI 97–98 stable (LCP ~2.0s), desktop 100 stable. Hero is `requestIdleCallback`-deferred Sanity webp poster; hero poster inlined as base64 data URI to eliminate LCP RTT; self-hosted fonts from R2 with preload for 400 weight only. Remaining 2pt gap is the 32KB inline CSS + 16 @font-face critical chain.

## Routes & Nav (FHB-specific)

| Route | File |
|-------|------|
| `/` | index.astro |
| `/the-fathers-heart-bible` | the-fathers-heart-bible.astro |
| `/samples` | samples.astro |
| `/download` | download.astro |
| `/join` | join.astro |
| `/partner` | partner.astro |
| `/about` | about.astro |

Nav order: Home, The Father's Heart Bible, Samples, Download, Join the Movement, Partner With Us, About.

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
