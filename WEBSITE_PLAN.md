# Father's Heart Bible — Website Construction Plan

**Site:** [fathersheartbible.org](https://fathersheartbible.org)
**Stack:** Astro 5 · Tailwind CSS 4 · TypeScript · Cloudways
**Current State:** Coming soon page with email placeholder (non-functional)

---

## Site Map

```
fathersheartbible.org/
├── /                    ← Homepage (hero + overview)
├── /about               ← The vision, the story, Kevin's bio
├── /sample              ← Read a sample (preface + booklet excerpts)
├── /partner             ← Partnership invitation + contact form
├── /contact             ← Contact info + simple form
├── /privacy             ← Privacy policy
└── 404                  ← Already built
```

---

## Phase 1 — Foundation (Do First)

These are structural pieces every other page depends on.

### 1.1 Shared Components

| Component | Purpose |
|-----------|---------|
| `Navbar.astro` | Site-wide navigation with logo/wordmark, links, mobile hamburger menu |
| `Footer.astro` | Copyright, contact link, social links, Scripture quote |
| `Button.astro` | Reusable CTA button (primary/secondary variants) |
| `SectionHeading.astro` | Consistent section titles across pages |
| `SEOHead.astro` | Refactor Layout.astro to properly use title, description, OG image per page |

### 1.2 Design System Decisions

- **Typography:** Choose a serif font for Scripture/headings (e.g., Cormorant Garamond, Playfair Display) paired with a clean sans-serif for body (e.g., Inter, Source Sans)
- **Color palette:** Deep navy/slate base (already in place), warm gold or amber accent for CTAs and highlights, soft cream for light sections
- **Imagery direction:** Warm, inviting, relational — not stained glass or religious cliché. Think golden light, open doors, father-and-child moments
- **Logo / wordmark:** Decide whether to use a logomark or styled wordmark for "Father's Heart Bible"

### 1.3 Global Styles & Fonts

- Add custom fonts via `@fontsource` packages or Google Fonts
- Set up Tailwind theme extensions (colors, fonts) in `global.css` or Tailwind config
- Establish consistent spacing, max-widths, and section padding

---

## Phase 2 — Pages

### 2.1 Homepage (`/`)

The homepage replaces the current coming soon page. It's the front door — warm, clear, and inviting.

**Sections (top to bottom):**

1. **Hero**
   - Headline: "A Bible That Reveals Our Father's Heart"
   - Subheadline: Short version of the core message (1–2 sentences from executive summary)
   - CTA button: "Read a Sample" → /sample
   - Background: Full-width warm gradient or subtle image

2. **The Problem / The Why**
   - Brief, emotional version of Kevin's story: "For over forty years, I read the Bible faithfully — and connected to God as a servant to a master rather than as a beloved son."
   - The shift: Jesus said the destination was always *the Father*
   - Tone: personal, not academic

3. **What Is the Father's Heart Bible?**
   - Short description: a new interpretive English translation designed to reveal God as Father throughout Scripture
   - 3–5 feature cards:
     - Faithfully rendered from Hebrew, Aramaic & Greek
     - Reveals the Father's heart — not just His name
     - Designed for the fatherless generation
     - Full canon: Old & New Testaments
     - Premium print product

4. **The Father's Heart** (emotional center of the page)
   - The five "A Father who..." statements from the executive summary:
     - Pursues His children with relentless love
     - Delights in them with singing and joy
     - Grieves when they wander
     - Runs to embrace them when they return
     - Invites them home with arms wide open
   - Consider a visual treatment — icons, cards, or a flowing layout

5. **The Impact**
   - Bible sales are at record highs
   - Gen Z engagement is rising — especially young men
   - A generation marked by fatherlessness is actively seeking identity, meaning, and belonging
   - FHB speaks directly to this hunger

6. **Call to Action / Invitation**
   - "Come home. You belong to me. You are my beloved child."
   - Two paths: "Read a Sample" and "Partner With Us"

7. **Email Signup** (optional — if email list infrastructure is ready)

### 2.2 About Page (`/about`)

**Sections:**

1. **The Vision**
   - Expanded version of the executive summary's opening — Kevin's 40-year journey
   - The revelation: the destination has always been the Father
   - Why no existing translation fills this gap

2. **Beyond Name to Heart**
   - The distinction between revealing the Father's *name* and revealing the Father's *heart*
   - Not clinical substitution — relational transformation

3. **The Project**
   - Key facts table: ownership entity, publisher, lead translator, timeline, IP status
   - Where things stand now (translation phase, projected 18–22 months)

4. **Kevin White — Lead Translator**
   - Bio, background, qualifications
   - Photo
   - Personal connection to the project

5. **Spirit Media Inc**
   - Brief note about the publisher

### 2.3 Sample Page (`/sample`)

This is potentially the most important conversion page — where someone goes from curious to convinced.

**Sections:**

1. **Introduction**
   - Brief context: "Here's what reading the Father's Heart Bible sounds like"

2. **Sample Preface** (from the Google Doc)
   - Rendered as beautifully typeset content — not a PDF embed
   - Use the serif font, generous spacing, pull quotes

3. **Sample Booklet Excerpts** (from the Google Doc)
   - Select key passages that showcase the FHB difference
   - Consider side-by-side comparison: traditional translation vs. FHB rendering

4. **CTA**
   - "Want to bring this to the world? Partner with us."

### 2.4 Partner Page (`/partner`)

**Sections:**

1. **The Invitation**
   - Content from the executive summary's invitation section
   - "We are not looking for donors. We are looking for partners who hear the Father's voice."
   - Emphasis on prayer first

2. **How to Get Involved**
   - Pray — ask the Father what role He has for you
   - Request the Partnership Prospectus (contact form or email link)
   - Connect directly with Kevin

3. **Contact Form**
   - Name, email, message
   - Needs a form backend (see Phase 3)

### 2.5 Contact Page (`/contact`)

- Kevin White's contact info (phone, email)
- Simple contact form (shared with partner page)
- Mailing address if applicable

### 2.6 Privacy Policy (`/privacy`)

- Standard privacy policy covering the contact form and any email collection
- Required if collecting emails or using analytics

---

## Phase 3 — Functionality & Integrations

### 3.1 Contact / Partner Form Backend

Options (no server-side code on Cloudways PHP stack):
- **Formspree** — simple, free tier available, no backend needed
- **Netlify Forms** — if we ever migrate hosting
- **Google Forms embed** — quickest but least polished
- **Custom PHP endpoint** — possible since Cloudways runs PHP, but adds maintenance

**Recommendation:** Formspree. Zero backend, works with static sites, submissions go to email.

### 3.2 Email Signup

If you want to collect emails before launch:
- **Mailchimp** or **ConvertKit** embedded form
- Or simply route through the contact form with a "Keep me updated" checkbox

### 3.3 Google Analytics 4

- Already have `PUBLIC_GA_ID` in `.env.example`
- Add the GA4 script tag to `Layout.astro`
- Consider a cookie consent banner (simple is fine)

### 3.4 Favicon & Open Graph Image

- Design a proper favicon (SVG + PNG fallbacks)
- Create an OG image (1200×630px) for social sharing — will show when someone shares a link to the site

---

## Phase 4 — Polish & SEO

### 4.1 SEO

- Structured data (schema.org) — Organization, Book, WebSite
- Sitemap already configured via `@astrojs/sitemap`
- `robots.txt` already in `/public`
- Ensure every page has unique title and meta description

### 4.2 Performance

- Optimize images (Astro Image component or manual compression)
- Preload critical fonts
- Verify Lighthouse scores

### 4.3 Accessibility

- Semantic HTML throughout
- Proper heading hierarchy
- Alt text on all images
- Keyboard navigation for mobile menu
- Color contrast checks

---

## Suggested Build Order

| Step | Task | Est. Effort |
|------|------|-------------|
| 1 | Design decisions (fonts, colors, logo direction) | Discussion |
| 2 | Navbar + Footer components | 1 session |
| 3 | Homepage — all sections | 1–2 sessions |
| 4 | About page | 1 session |
| 5 | Sample page (needs preface + booklet content) | 1 session |
| 6 | Partner + Contact pages + Formspree setup | 1 session |
| 7 | GA4 + OG image + favicon | 1 session |
| 8 | SEO, accessibility pass, privacy policy | 1 session |
| 9 | Final review + deploy | 1 session |

---

## Content Needed From Kevin

Before building, we'll need:

- [ ] **Logo or wordmark** — do you have one, or should we design a text-based wordmark?
- [ ] **Kevin's bio + photo** — for the About page
- [ ] **Sample Preface text** — from the Google Doc (or permission to pull it)
- [ ] **Sample Booklet excerpts** — which passages to feature
- [ ] **Font preferences** — any existing brand typography?
- [ ] **Color preferences** — beyond the current dark navy/blue
- [ ] **Email list provider** — Mailchimp, ConvertKit, or skip for now?
- [ ] **Form destination email** — where should contact form submissions go?
- [ ] **Any photography or imagery** — or should we source stock/AI imagery?

---

*This plan is a living document. Update as decisions are made.*
