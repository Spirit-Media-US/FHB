# Father's Heart Bible (FHB)

> **CLAUDE.md belongs in version control — NEVER add it to .gitignore. This file is the shared source of truth for all developers and all Claude Code sessions.**

This site: Father's Heart Bible | Repo: github.com/Spirit-Media-US/FHB | Domain: fathersheartbible.com / fathersheartbible.org | Sanity ID: rusi1hyi | R2 bucket: n/a

## Dev Commands

- `npm run dev` — local preview at localhost:4323
- `npm run build` — runs `astro check && astro build`

## Mandatory — Before Starting Work
Always start Claude sessions from inside this directory:
```
cd ~/Sites/FHB && claude
```
Running Claude from ~/ or ~/Sites/ bypasses this project's CLAUDE.md. A pre-edit hook enforces this, but following the workflow prevents warnings and ensures all project rules are loaded.

Then run: `git checkout dev && git pull origin dev`

## Notes

- SSL must cover all four domain variants: fathersheartbible.org, www.fathersheartbible.org, fathersheartbible.com, www.fathersheartbible.com
- Uses Biome for linting and Lefthook for git hooks

---

## FHB SITE BUILD — PHASE 1 & 2 (LOCKED)

### PHASE 1 — INFRASTRUCTURE (LOCKED)

This project uses the following stack. These rules are mandatory.

**Repositories & Deployment**
- GitHub organization: Spirit-Media-US
- Repository contains code only — NO media files
- Netlify is used for hosting
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

### STATUS

- **Phase 1:** LOCKED
- **Phase 2:** LOCKED
- **Phase 3:** LOCKED

Proceed to Phase 4 (Pages) only after confirming all above is implemented.

---

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

**Netlify webhook:** 3 build hooks already exist in Netlify (from prior setup)

### Kevin's Required Manual Steps

1. **Deploy Sanity Studio schema** (run on Bethel in FHB directory):
   ```bash
   cd ~/Sites/FHB
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

5. **Verify Sanity → Netlify webhook** is active:
   - Go to: https://www.sanity.io/manage/project/rusi1hyi/api → Webhooks
   - Should see a webhook pointing to Netlify build hook URL
   - Netlify build hook URL: `https://api.netlify.com/build_hooks/69ac55086e54f35b43d2df8c`
   - If no webhook exists, create one: HTTP POST, URL above, trigger on document publish

---

## Rules

- All work goes to the **dev** branch — never push directly to main
- Only merge dev to main when Kevin says "push to main"
- Never push without local preview first

---

## Stitch MCP — AI Design Tool

Google Stitch 2.0 is an MCP server available in this project for AI-powered design work. It generates full page designs and auto-creates design systems (colors, typography, component rules). Configured at user scope in `~/.claude.json` — available automatically in all projects.

**When to use:** When Kevin asks for design work, new page layouts, or visual redesigns. Use Stitch first to get 80–90% of the design done visually, then implement in Astro/Tailwind.

**Available tools (prefixed `mcp__stitch__`):**
`create_project`, `generate_screen_from_text`, `create_design_system`, `apply_design_system`, `edit_screens`, `generate_variants`, `list_projects`, `list_screens`, `get_screen`, `get_project`, `list_design_systems`, `update_design_system`

**Workflow:**
1. Screenshot or paste URL into Stitch as style reference
2. Stitch generates full design + auto-creates design system
3. Export design.md / design system from Stitch
4. Hand off to Claude Code for Astro/Tailwind implementation

**Rules:**
- Use Gemini 3.1 Pro in Stitch (not 3.0 Flash)
- Stitch auto-generates a `design.md` — keep it in the project root for consistency
- This is the standard SMP workflow for all new site builds and major redesigns
