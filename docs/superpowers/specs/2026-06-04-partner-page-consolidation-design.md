# Partner Page Consolidation & Monthly-Partner Pivot — Design

**Date:** 2026-06-04
**File:** `src/pages/partner.astro`
**Goal:** Re-align the partner page to the monthly-partnership vision, fix inconsistent
impact math, and consolidate ~16 sections down to ~8 per donation-page best practice
(form-first, no repetition, every section earns its scroll).

## Strategic frame (from Kevin's hero-video script, 2026-06-04)

- **Monthly partnership is the spine.** Primary call: **500 partners × $100/month = $50,000/month.**
- **$50k is the memorable milestone unit.** English digital + print = $50k · ComfortLeather = $50k ·
  **each language = $50k.**
- **Impact measured in Bibles throughout. $5 = 1 Bible.** So $100/mo = **20 Bibles every month**.
  (Fixes the stale `$33 = 1 Bible` impact stats currently on the page.)
- **$100+/month partners receive a free ComfortLeather™ edition.** (Replaces the one-time
  "Founder's First Edition, capped at 750" collector reward.)
- **Gifts of all sizes welcomed**; ask for monthly $100+ but "if you need to give less, every gift matters."
- **24-month vision:** publish in the **top 20 languages → ~75% of humanity** within 24 months.
  Per-language reach to cite: **English 1.5B · Spanish 550M · Mandarin 1.1B · Hindi 600M.**
- **Sponsor a whole language for $50,000** — open invitation to **families, businesses, and foundations.**
- **Distribution goal:** 20,000 copies across all formats by **Dec 31, 2026** (unchanged; this is the
  live progress-bar goal).

## What the code already does (no change needed)

- `DonationForm.astro` already defaults to **Monthly** (recurring) with a one-time toggle, and its
  amount tiers are already in **$5/Bible** language ($100 = 20 Bibles).
- `ProgressBar.astro` already leads with **Bibles distributed toward 20,000**, live from tools-api.
  **Decision: leave the progress bar as-is.** No backend change.
- The "500 partners / $100/mo / $50,000/mo" figures become **animated counter stats** (same
  `data-counter` mechanism already used in the Tangible Impact section) — presentational, not live.

## Target structure — ~8 sections

| # | Section | Built from current | Notes |
|---|---------|--------------------|-------|
| 1 | **Hero** | §1 | Keep `VideoHeroInner`, placeholder image until Kevin's hero video is ready. Heading "Partner With Us"; subheading → *"Partner with us to take the Father's Heart Bible to the nations."* `darkHero={true}` preserved. |
| 2 | **Give** | §1.5 + new counters | Rewrite pitch banner to the monthly frame (headline: *"500 partners at $100/month takes the Father's Heart Bible to the nations"*; math: $100/mo = 20 Bibles/mo → 500 partners = $50,000/mo; note $100+/mo earns a free ComfortLeather edition; all-gift-sizes line). First milestone framed as **$50,000/month**, not the old one-time $100k. Keep ProgressBar + DonorFeed + DonationForm untouched. Add an animated counter row: **500 partners · $100/mo · $50,000/mo**. `id="donate"` preserved (all CTAs scroll here). |
| 3 | **What your partnership unlocks** | §1.6 reward + §1.78 | Drop the one-time donor-tiers table entirely. Single clean reward callout: **$100+/month → free ComfortLeather™ edition**, paired with the ComfortLeather showcase image. CTA → "Become a Monthly Partner" (→ `#donate`). |
| 4 | **The 24-month vision** | §1.75 + §1.8 + §1.85 | Merge: the $50k-per-milestone ladder, the production timeline, Phase 2 global translation with **per-language reader reach** (English 1.5B · Spanish 550M · Mandarin 1.1B · Hindi 600M), top-20 → 75% of humanity in 24 months, the **"sponsor a whole language for $50,000 — families, businesses & foundations"** invitation, and the `UnlockMap`. |
| 5 | **Why this matters** | §2 + §3 + §4 + §5 | One tightened "why" section. Weave the corrected impact math in as a compact stat row: **$5 = 1 Bible · $100/mo = 20 Bibles every month · $50,000 = a whole language.** Fold in scope-of-work + what-makes-this-different points without five separate headers. |
| 6 | **Scripture capstone** | §6 | Keep John 15:16 `ScriptureBlock` + the movement-first paragraph. Short emotional beat before the close. |
| 7 | **Final CTA** | replaces dead §7 | Remove the dead "Donation integration area — Kevin connects payment provider here" placeholder. Replace with a short closing monthly-partner CTA that scrolls to `#donate`. Preserve the contact email (`hello@fathersheartbible.com`, obfuscated) here so it isn't lost. |
| 8 | **Join the FH Family + images** | §8 + final ImageGrid | Keep. "Belonging comes before giving" community path + the 3-image grid. |

## Removed outright

- **§1.6 one-time donor-tiers table** (Sponsor / Founding Supporter / Patron / Founder, "capped 750").
- **§1.7 campaign mechanics** (early-bird Founders #1–100, public donor wall, permanent
  acknowledgments, numbered limited edition, bulk gifting `$40 = 10 Bibles`, launch event) — all
  one-time/collector framing the monthly pivot drops. (Note: the `$40 = 10 Bibles` line also
  contradicted $5/Bible — another reason to drop it.)
- **§7 dead donation placeholder.**

## Must-preserve (pre-commit content protection)

- The full JSON-LD `@graph` (WebPage + BreadcrumbList) in the `Layout` props.
- SEO `title` / `description` (Sanity-fetched with fallbacks).
- `darkHero={true}`.
- The working donation flow components (`DonationForm`, `DonorFeed`, `ProgressBar`, `UnlockMap`).
- The contact email, relocated to the final CTA.
- Sanity fetch for `pageData` (SEO). The `partnerData` (whyMatters/scope/whyDifferent/impactStats)
  and `media` fetches will be revised to match the consolidated copy; keep fetching what's still used.

## Out of scope

- The hero video itself (Kevin is producing it separately; we keep the placeholder image until delivered).
- Any tools-api / backend change (progress bar stays as-is).
- The `/nations` page that also renders `UnlockMap` (component is standalone; unaffected).

## Verification

- `npm run build` passes (`astro check && astro build`).
- `git diff HEAD` reviewed — confirm JSON-LD, SEO meta, and donation components are intact.
- Push to dev, then "inspect dev preview" to catch broken images / empty sections / layout issues.
- Grep the file for stale numbers (`\$33`, `\$100,000`, `750`, `Founder's First Edition`) → zero
  unintended remaining.
