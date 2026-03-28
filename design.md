# FHB Design System: Aether & Hearth (Modern Minimalist)

> Source: Stitch project `4030429222026291321`, design system `assets/e8524cd1dabe4966a1d69918b990e685`
> Applied: 2026-03-28

## Stitch Screen Reference (v2 — Modern Minimalist)

| Page | Screen ID | Title |
|------|-----------|-------|
| Home | `9233d529ead24d8089f5d04bb4242b53` | Home: Modern Minimalist (v2) |
| Discover (The Father's Heart Bible) | `12f807dee1a343c7a5a99ba0e7960cd3` | Discover: Modern Minimalist (v2) |
| Sample Reading | `bf67b64ab0a84ab6892e2c95f6f474d8` | Sample Reading: Modern Minimalist (v2) |
| Partner With Us | `4b888ef10ec64cd79f4e581e9778a89f` | Partner With Us |

---

## 1. Overview & Creative North Star: "The Modern Gallery"

This design system is engineered to provide a stark, contemporary counterpoint to the traditional textures of the Bible. While the physical book is tactile and classical, the digital experience must feel architectural, airy, and hyper-modern.

The **Creative North Star** for this system is **"The Modern Gallery."** Think of the UI as a white-walled, high-ceilinged space where content is curated with absolute precision. We avoid the "clutter" of traditional editorial design — no serif drop caps, no ornate borders, and no parchment textures. Instead, we use aggressive whitespace, bold sans-serif scales, and a monochromatic foundation to make the product photography the undisputed protagonist of the screen. We break the template look by using asymmetrical layouts and high-contrast text overlays that feel like a high-end fashion or architectural journal.

---

## 2. Colors & Surface Architecture

The palette is rooted in high-contrast neutrals with a sophisticated "Deep Berry" (`primary: #300117`) used sparingly for moments of maximum impact.

### Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#300117` | Maximum-impact moments, CTAs, icons, active states |
| `--color-primary-container` | `#4A152C` | Hero backgrounds, gradient endpoints |
| `--color-on-primary` | `#FFFFFF` | Text on primary backgrounds |
| `--color-secondary` | `#546067` | Subtle accents |
| `--color-secondary-container` | `#D7E4EC` | Secondary component backgrounds |
| `--color-tertiary` | `#001904` | Deep dark (replaces black) |
| `--color-surface` | `#F9F9F9` | Base page background |
| `--color-surface-container-low` | `#F3F3F3` | Alternate section background |
| `--color-surface-container` | `#EEEEEE` | Component backgrounds |
| `--color-surface-container-high` | `#E8E8E8` | Elevated elements |
| `--color-surface-container-highest` | `#E2E2E2` | Highest elevation |
| `--color-surface-container-lowest` | `#FFFFFF` | Cards, modals, lifted elements |
| `--color-on-surface` | `#1A1C1C` | Primary text |
| `--color-on-surface-variant` | `#514347` | Secondary text, labels |
| `--color-outline` | `#847377` | Subtle borders (sparingly) |
| `--color-outline-variant` | `#D6C1C6` | Ghost borders (15% opacity max) |
| `--color-inverse-surface` | `#2F3131` | Dark hero sections |
| `--color-inverse-on-surface` | `#F1F1F1` | Text on dark sections |

### The "No-Line" Rule

**1px solid borders are strictly prohibited for sectioning.** Boundaries must be defined solely through:
- **Background Color Shifts:** Placing a `surface-container-low` section against a `surface` background.
- **Aggressive Whitespace:** Using `spacing-20` (5rem) or `spacing-24` (6rem) tokens.

### Surface Hierarchy & Nesting

Treat the UI as a series of physical layers:
- **Base Layer:** `surface` (#F9F9F9)
- **Secondary Section:** `surface-container-low` (#F3F3F3)
- **Component Backgrounds:** `surface-container-lowest` (#FFFFFF) for subtle "lift"

### Glass & Signature Textures

- **Glassmorphism:** For floating navigation — semi-transparent `surface` at 70% opacity with 20px backdrop blur.
- **Sophisticated Gradients:** Primary CTAs transition from `primary` (#300117) to `primary_container` (#4A152C) at 135 degrees.

---

## 3. Typography: Bold Geometric Authority

| Role | Font | Usage |
|------|------|-------|
| **Headlines** | Epilogue | Display, headlines — "Editorial Voice" |
| **Body** | Manrope | Body text, titles — "Functional Voice" |
| **Labels** | Manrope | Uppercase captions, small text |

### Scale

- `display-lg`: 3.5rem with tight letter spacing — hero moments
- `body-lg`: 1rem — long-form reading
- High-contrast pairing: `display-lg` headline + `label-md` uppercase caption = editorial masthead feel

---

## 4. Elevation & Depth: Tonal Layering

No heavy shadows. Depth through light and tone.

- **Ambient Shadows** (floating elements only): `on-surface` at 5% opacity, 40-60px blur, 10px Y-offset
- **Ghost Border** (accessibility fallback): `outline-variant` at 15% opacity max. Never 100% opaque.

---

## 5. Components

### Buttons
- **Primary:** `primary` (#300117) fill + `on-primary` (#FFF) text. `rounded-sm` (0.125rem) — sharp, architectural.
- **Secondary:** Transparent + Ghost Border + `primary` text.
- **Hover:** Shift from `primary` to `primary_container`.

### Input Fields
- Fill: `surface-container-highest`. No bottom lines.
- Labels: `label-sm` in `on-surface-variant`, positioned above.
- Focus: Background shifts to `surface_container`, subtle ghost border.

### Cards & Lists
- **No divider lines.** Separate with `spacing-4` (1.4rem) or alternating surface fills.
- **Asymmetric Cards:** Varying vertical offsets to break grid rigidity.

### Signature: "High-Contrast Hero"
Full-width `inverse_surface` (#2F3131) with `inverse_on_surface` text. `display-lg` typography. Dramatic backdrop for Bible imagery.

---

## 6. Do's and Don'ts

### Do
- Use generous whitespace (`spacing-20`, `spacing-24`). If it feels "finished," add 20% more padding.
- Use asymmetrical image placement — text left, image bleeding right.
- Use `primary` (#300117) sparingly — icons, active states, CTAs only.

### Don't
- Don't use 1px solid borders or heavy drop shadows.
- Don't use serif fonts or editorial flourishes (let the physical Bible be "traditional").
- Don't center-align long text blocks. Left-aligned grid for architectural feel.
- Don't use pure black (#000). Use `on_background` (#1A1C1C).

---

## 7. Screen Summaries (from Stitch v2)

### Home Page
- Scripture archive: "1.2M Verses Indexed" across "50+ Translations"
- Morning Devotional: "distraction-free, high-contrast interface"
- Silent Journaling: "permanent and private as stone"
- Gallery of Grace: photography + minimalist typography
- Nav: Home, Scripture, Journal, Gallery
- Grayscale hero imagery with contrast/brightness filters

### Discover Page (The Father's Heart Bible)
- Premium goat-skin leather binding, 100gsm archival paper
- Smyth-sewn binding for flat opening
- Heritage typography inspired by 16th-century design
- "The Pulse Marker" — custom bookmark/navigational tool
- "The Heart Marker" — passage designation tool
- Companion app, sustainable/global shipping
- Glass-morphism navigation

### Sample Reading
- Featured: Psalm 23 (KJV), 3 numbered verses
- Audio/video play controls
- Text formatting options (font size, dark mode, share)
- "Journal this Verse" CTA
- Typography controls panel

### Partner With Us
- Translation & Editing Support
- Ambassador Program (host readings, lead discussions)
- Prayer Foundation (global prayer circle, monthly prompts)
- Institutional Partnerships (churches, seminaries, curriculum)
- Monthly giving tiers: $25, $50, $100 + one-time donations
- Tax-deductible, transparent stewardship
- Testimonial: Dr. Elias Thorne (partner since 2021)
