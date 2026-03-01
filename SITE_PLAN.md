# Father's Heart Bible — Website Construction Plan

## Current State

**What's built:**
- ✅ Astro v5 + Tailwind v4 + TypeScript
- ✅ Design system (Cormorant Garamond / Source Sans 3, warm neutral palette, gold accent)
- ✅ Layout component with full SEO meta tags (OG, Twitter, canonical)
- ✅ Navbar (responsive, mobile hamburger, scroll background)
- ✅ Footer (scripture quote, nav links, copyright)
- ✅ Preface page (`/sample`) — full translator's preface
- ✅ 404 page
- ✅ Coming Soon homepage (placeholder)
- ✅ Deployment pipeline (two-branch Git → Cloudways)

**What needs to be built:**
- Homepage (full redesign from "coming soon" → real landing page)
- About page (`/about`)
- Partner page (`/partner`)
- Contact page (`/contact`)

---

## Page-by-Page Plan

### 1. Homepage (`/` — replace current coming soon)

**Purpose:** Introduce visitors to the Father's Heart Bible and move them to explore or partner.

**Sections (top to bottom):**

1. **Hero**
   - Large serif headline: *"Come home. You belong to me. You are my beloved child."*
   - Subhead: "A new Bible translation revealing our Father's heart — from Genesis to Revelation."
   - Two CTA buttons: "Read the Preface" → `/sample` | "Partner With Us" → `/partner`
   - Warm dark gradient background (consistent with current design)

2. **The Problem / Opportunity**
   - Short prose block drawn from the exec summary opening:
     > "For over forty years, I read the Bible faithfully — and connected to God as a servant to a master rather than as a beloved son to our loving Father."
   - Transition into: "No English Bible translation has yet been designed to reveal Him this way — until now."

3. **What FHB Reveals** (the 5 heart attributes)
   - Visual treatment of the five Father attributes from the exec summary:
     - **Pursues** His children with relentless love
     - **Delights** in them with singing and joy
     - **Grieves** when they wander
     - **Runs** to embrace them when they return
     - **Invites** them home with arms wide open
   - These could be rendered as elegant cards, a vertical list with icons, or a staggered layout

4. **John 3:16 Side-by-Side**
   - A compelling visual comparison:
     - Traditional: "For God so loved the world..."
     - FHB: "For our Father so loved the world..."
   - Brief explanatory text about the translation principle

5. **The Impact** (from exec summary)
   - Brief section: Bible is the best-selling book in history, demand is growing
   - Gen Z engagement rising — a fatherless generation seeking identity, meaning, belonging
   - "FHB speaks directly to this hunger"

6. **Invitation / CTA**
   - "Our Father's heart has one message for every reader: Come home."
   - CTA: "Read the Preface" | "Explore Partnership"

7. **Footer** (existing component)

**Content source:** Executive Summary (opening, "Beyond Name to Heart", "The Impact", "The Invitation")

---

### 2. About Page (`/about`)

**Purpose:** Tell the full story — who is behind this, what it is, and why it matters.

**Sections:**

1. **Header**
   - "About the Father's Heart Bible"
   - Subtitle: "A new interpretive English translation revealing God's identity as our Father"

2. **The Story / Why This Exists**
   - Kevin's personal story (the "40 years" passage from the exec summary/preface)
   - The John 14:6 revelation — the destination was always the Father
   - "This changed everything for me. And I don't believe I'm alone."

3. **What This Translation Does**
   - Draw from the preface's "What This Translation Does" section
   - The John 3:16 example (theos → our Father)
   - Why "our Father" instead of "the Father"

4. **Beyond Name to Heart**
   - The 5 attributes (Pursues, Delights, Grieves, Runs, Invites)
   - "The Father's ultimate desire is not servants who know His name, but friends who know His heart"

5. **Project Details** (table from exec summary)
   - Ownership: Father's Heart Bible LLC
   - Publisher: Spirit Media Inc
   - Lead Translator: Kevin White
   - Product: Premium full-canon Bible (Old & New Testaments)
   - Timeline: 18–22 months to publication

6. **CTA**
   - "Read the Preface" | "Explore Partnership" | "Contact Us"

**Content source:** Executive Summary + Preface (first few sections)

---

### 3. Partner Page (`/partner`)

**Purpose:** Invite financial and prayer partners into the project.

**Sections:**

1. **Header**
   - "Partner With Us"
   - Subtitle: "Our Father is our provider. The resources for this project are already in His hands."

2. **The Invitation** (from exec summary)
   - "We are not looking for donors. We are looking for partners who hear the Father's voice and recognize this as something He is doing."
   - "If you sense that stirring, we invite you first to pray."

3. **What Your Partnership Enables**
   - Translation & scholarship
   - Design & production of a premium Bible
   - Initial print run of 30,000 copies
   - Distribution and outreach

4. **How to Get Involved**
   - Pray — Ask the Father what role He would have you play
   - Request the Partnership Prospectus — for those led to explore financial partnership
   - Spread the word — share the vision with others

5. **Contact CTA**
   - "Ready to explore partnership?" → links to contact page or direct email/phone
   - Kevin White | (919) 332-1990 | kevin@spiritmedia.us

**Content source:** Executive Summary ("The Invitation" section)

---

### 4. Contact Page (`/contact`)

**Purpose:** Simple, warm way to reach Kevin / the team.

**Sections:**

1. **Header**
   - "Get in Touch"
   - Subtitle: "We'd love to hear from you."

2. **Contact Info**
   - Kevin White
   - (919) 332-1990
   - kevin@spiritmedia.us

3. **Contact Form** (optional — could be a simple Formspree or similar)
   - Name, Email, Message
   - Submit button

4. **Recommended Reading Path** (from exec summary)
   - "Ready to see more of the vision? We recommend:"
     1. Envision → Executive Summary
     2. Feel the heart → Sample Preface (`/sample`)
     3. See the product → Sample Booklet (link to Google Doc)
     4. Understand the opportunity → Partnership Prospectus (available upon request)

**Content source:** Executive Summary ("Contact" and closing sections)

---

## Build Order (Recommended)

| Phase | Task | Estimated Effort |
|-------|------|-----------------|
| **1** | Homepage — replace coming soon with full landing page | Medium-Large |
| **2** | About page | Medium |
| **3** | Contact page (simplest, quick win) | Small |
| **4** | Partner page | Medium |
| **5** | Polish pass — responsive testing, OG images, favicon | Small |

**Rationale:** The homepage is the front door and the most impactful change. About and Contact provide essential credibility. Partner is the conversion page and benefits from the others being in place first.

---

## Design Notes

- Maintain the current warm, editorial aesthetic (cream backgrounds, dark text, gold accents)
- Cormorant Garamond for headlines and scripture quotes
- Source Sans 3 for body text and UI
- Use the existing section pattern from the Preface page (centered content, max-w-2xl, generous whitespace, section dividers)
- Scripture quotes should always be styled distinctly (italic serif, slightly larger, centered)
- Photography: consider adding a hero image or subtle texture later (not required for launch)

---

## Technical Notes

- All pages use the existing `Layout.astro`, `Navbar.astro`, and `Footer.astro`
- Each page gets its own `title` and `description` for SEO
- Consider adding Astro Image optimization when photography is added
- Contact form: Formspree (free tier) or similar — no backend needed
- No JavaScript frameworks needed — Astro's static output is ideal
- Sitemap is already configured via `@astrojs/sitemap`
