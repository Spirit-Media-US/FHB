# Father's Heart Bible (FHB)

> **CLAUDE.md belongs in version control — NEVER add it to .gitignore. This file is the shared source of truth for all developers and all Claude Code sessions.**

This site: Father's Heart Bible | Repo: github.com/Spirit-Media-US/FHB | Domain: fathersheartbible.com / fathersheartbible.org | Sanity ID: rusi1hyi | R2 bucket: n/a

## Dev Commands

- `npm run dev` — local preview at localhost:4323
- `npm run build` — runs `astro check && astro build`

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

## Rules

- All work goes to the **dev** branch — never push directly to main
- Only merge dev to main when Kevin says "push to main"
- Never push without local preview first
