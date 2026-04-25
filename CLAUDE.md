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

## Perf — 2026-04-18 (dev, not yet on main)
- Mobile PSI: 67 → 97-98 stable (LCP 2.0s, FCP 1.7s, TBT 0, CLS 0)
- Desktop PSI: 100 stable (LCP 0.5-0.6s)
- Fixes applied:
  - Sanity webp poster (`?w=768&fm=webp`) is LCP, video deferred via `requestIdleCallback`
  - All Sanity image URLs use `sanityTransform()` helper for webp+quality params
  - Hero logo responsive srcset: 160w/240w/400w (mobile loads 4.9KB instead of 17KB)
  - Bible cover responsive srcset: w=512 mobile / w=640 tablet (saves ~38KB mobile)
  - Hero poster inlined as base64 data URI (~10.9KB) — eliminates LCP network RTT (without this score drops to 96-97)
  - Self-hosted fonts from R2, preconnect + preload for 400 weight only
  - `image-delivery-insight` Lighthouse score: 0.5 → 1.0
- Remaining 2pt gap (FCP 0.92, LCP 0.97): 32KB inline CSS + 16 @font-face declarations drive a ~260ms font critical chain. Further gains require critical-CSS extraction or trimming font-face variants (current usage spans blog/privacy pages so can't easily drop 700 weight).
- Files: src/pages/index.astro, src/layouts/Layout.astro, src/styles/global.css, public/fhb-logo-white-{160,240,400}.png

---

## FHB SITE BUILD — PHASE 1 & 2 (LOCKED)

### PHASE 1 — INFRASTRUCTURE (LOCKED)

This project uses the following stack. These rules are mandatory.

**Repositories & Deployment**
- GitHub organization: Spirit-Media-US
- Repository contains code only — NO media files
- Cloudflare Pages is used for hosting
- Auto-deploy from main branch

**Domain & Edge**
- Cloudflare handles: DNS, SSL, CDN, Security

**Media Handling**
- ALL images, video, and audio must be stored in Cloudflare R2
- No media assets stored in repo
- All media referenced via external URLs (R2 or Sanity)

**CMS**
- Sanity.io is used for content management
- All editable content must be modeled in Sanity
- Schemas must be defined before wiring

**Forms / CRM**
- GoHighLevel (GHL) is used for: forms, lead capture, tagging
- Do NOT build custom backend form handlers

**Monitoring**
- UptimeRobot monitors site every 5 minutes

**AI / Build Rules**
- Claude is used for development assistance
- This file (CLAUDE.md) must be followed at all times

**Core Constraints**
- No media in repo
- Use Tailwind design tokens (no hardcoded colors)
- Prefer Astro static rendering (minimal JS)
- Build reusable components only (no duplicated layouts)

---

### PHASE 2 — STRUCTURE (LOCKED)

This phase defines architecture only — NOT design.

**Framework Setup**
- Astro initialized
- Tailwind CSS installed
- Base layout created

**Route Map (Pages)**

| Route | File |
|-------|------|
| `/` | index.astro |
| `/the-fathers-heart-bible` | the-fathers-heart-bible.astro |
| `/samples` | samples.astro |
| `/download` | download.astro |
| `/join` | join.astro |
| `/partner` | partner.astro |
| `/about` | about.astro |

**Navigation (Structure Only)**

Top navigation must include:
- Home
- The Father's Heart Bible
- Samples
- Download
- Join the Movement
- Partner With Us
- About

**Footer (Structure Only)**

Footer must include:
- All primary navigation links
- Contact link
- Privacy Policy
- Terms

**Layout System**
- BaseLayout.astro
- Header component
- Footer component

No advanced styling at this stage.

**Typography Foundation (Minimal Only)**
- font-family for headings
- font-family for body
- base body size

Do NOT implement full theme system yet.

**Component Placeholders**

Create empty structural components (scaffolds only — no styling beyond layout):
- Hero
- Section
- CTA
- ScriptureBlock
- ImageGrid

**File Structure**
```
src/
  pages/
  layouts/
  components/
  styles/
```

**Build Rules**
- No page-specific styling yet
- No color system yet
- No design polish yet
- Focus ONLY on structure and architecture

---

### STATUS — as of 2026-04-16

- **Phase 1–5:** LOCKED
- **Phase 6:** LOCKED (design refinement done)
- **Phase 7:** QA complete — all fixes on dev branch
- **Phase 8:** Partially complete — domain live, deploy webhook, UptimeRobot, portal dashboard all done
- **Phase 8 BLOCKED:** 4 commits on dev awaiting merge to main (localhost SEO fix, blog/privacy/terms pages, EPERM build fix, blog nav link)
- **Phase 9:** Not started (client delivery, Sanity invite, roadmap)
- **Google Search Console:** Verification file on dev, needs main merge to go live
- **Site:** Live on production (main), but production is behind dev by 4 commits

---
## Phase 3 — Theme System (LOCKED)

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

### Phase 3 Rules

- Do NOT build pages in Phase 3 — components only
- No hardcoded content — all text via props or slots
- HeroVideo requires R2 video URL — passed via videoSrc prop
- FormEmbed requires GHL embed code from Kevin

---
## Phase 4 — Pages (LOCKED)

All 7 launch pages built and pushed to dev:

| Phase | Route | Status |
|-------|-------|--------|
| 4A | `/` | ✅ dev |
| 4B | `/the-fathers-heart-bible` | ✅ dev |
| 4C | `/samples` | ✅ dev |
| 4D | `/download` | ✅ dev |
| 4E | `/join` | ✅ dev |
| 4F | `/partner` | ✅ dev |
| 4G | `/about` | ✅ dev |

---

## Phase 5 — Sanity CMS Wiring (LOCKED)

### What Was Implemented

**Schemas added/updated:**
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

**Cloudflare Pages:** Auto-deploys on push to main (no webhook needed)

### Kevin's Required Manual Steps

1. **Deploy Sanity Studio schema** (run on Bethel in FHB directory):
   ```bash
   cd /srv/sites/FHB
   bunx sanity login        # authenticate with sanity.io
   bunx sanity deploy       # push updated schemas to Studio
   ```

2. **Create a Sanity write API token:**
   - Go to: https://www.sanity.io/manage/project/rusi1hyi/api
   - Click "Tokens" → "Add API token"
   - Name it "FHB Seed / Write" and set permission to "Editor"
   - Copy the token

3. **Seed initial content:**
   ```bash
   SANITY_API_TOKEN=<your-write-token> node scripts/seed-sanity.mjs
   ```
   This creates all page SEO docs, Kevin's profile, the resource doc, and all 10 scripture comparisons.

4. **Fill in siteSettings in Sanity Studio** (fathersheartbible.sanity.studio):
   - `communityUrl` — Mighty Networks community URL
   - `donateUrl` — giving/donation page URL
   - `ghlDownloadFormId` — paste GHL form embed ID once created
   - Media URLs — paste R2 URLs for hero video, book cover, portrait, people photos
   - Publish the siteSettings document

5. **Sanity → Cloudflare Pages rebuild:** Cloudflare Pages auto-deploys on push to main. For Sanity content changes to trigger a rebuild, a deploy hook can be configured in Cloudflare Pages settings if needed.

---

## Rules

- All work goes to the **dev** branch — never push directly to main
- Only merge dev to main when Kevin says "push to main"
- Never push without local preview first
