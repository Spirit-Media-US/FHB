# FHB Hardcoded Content Audit — APRIL 2026 UPDATE ⚠️

**Date:** April 1, 2026
**Auditor:** Autonomous Agent
**Status:** **ISSUES FOUND** — 11 hardcoded URLs across 8 files

---

## Summary

The FHB site contains **11 hardcoded media URLs** that should be sourced from Sanity CMS instead. These include:
- **6 R2 video URLs** (hardcoded as fallbacks)
- **4 Sanity CDN image URLs** (direct image links)
- **1 R2 base URL constant** (used in hero video rotation script)

---

## Issues Found

### 1. **src/pages/index.astro** — 4 Hardcoded URLs

#### Line 41: Hero video fallback
```typescript
const heroVideoSrc = media?.heroVideoUrl || 'https://assets.spiritmediapublishing.com/fathers-heart-bible/woman-holding-bible-sky.mp4';
```
**Status:** ⚠️ Uses fallback correctly, but R2 array (lines 140-155) is hardcoded

#### Lines 45-46: Book cover images
```typescript
const bookCoverUrl =
    media?.bookCoverUrl ||
    'https://cdn.sanity.io/images/rusi1hyi/production/bf1efb2f6870a8f0257175a033f27222f6e1e6b9-2857x4000.png';
const fhbiCoverUrl = media?.fhbiCoverUrl || 'https://cdn.sanity.io/images/rusi1hyi/production/3ab3f8d98e6ac0913d382922f0983efe6cb5535f-1278x2118.png';
```
**Status:** ⚠️ Field `fhbiCoverUrl` doesn't exist in schema — needs to be added as `fhbCoverImage` (Sanity image type)

#### Lines 140-155: Hero video array (R2 base URL)
```typescript
const R2 = 'https://assets.spiritmediapublishing.com/fathers-heart-bible';
const heroVideos = [
    { url: `${R2}/woman-holding-bible-sky.mp4`, theme: 'dark' },
    { url: `${R2}/farmer-reading-bible.mp4`, theme: 'dark' },
    // ... more videos
];
```
**Status:** ⚠️ Entire array is hardcoded — should be sourced from Sanity as a structured array field

---

### 2. **src/pages/about.astro** — 1 Hardcoded URL

#### Line 77: Hero video
```typescript
<VideoHeroInner
    videoSrc="https://assets.spiritmediapublishing.com/fathers-heart-bible/women-reading-bible-outdoors.mp4"
    ...
/>
```
**Status:** ⚠️ Should use `siteSettings.aboutPageVideo` from schema

---

### 3. **src/pages/download.astro** — 2 Hardcoded URLs

#### Line 95: Hero video
```typescript
<VideoHeroInner
    videoSrc="https://assets.spiritmediapublishing.com/fathers-heart-bible/farmer-reading-bible.mp4"
    ...
/>
```
**Status:** ⚠️ Should use `siteSettings.downloadPageVideo` from schema

#### Line 200: FHBI cover image
```typescript
<img
    src="https://cdn.sanity.io/images/rusi1hyi/production/3ab3f8d98e6ac0913d382922f0983efe6cb5535f-1278x2118.png"
    alt="Father's Heart → Beloved Identity — free PDF"
    ...
/>
```
**Status:** ⚠️ Should use Sanity image field with `urlFor()` transformation

---

### 4. **src/pages/join.astro** — 1 Hardcoded URL

#### Line 126: Hero video
```typescript
<VideoHeroInner
    videoSrc="https://assets.spiritmediapublishing.com/fathers-heart-bible/mother-son-praying.mp4"
    ...
/>
```
**Status:** ⚠️ Should use `siteSettings.joinPageVideo` from schema

---

### 5. **src/pages/partner.astro** — 1 Hardcoded URL

#### Line 108: Hero video
```typescript
<VideoHeroInner
    videoSrc="https://assets.spiritmediapublishing.com/fathers-heart-bible/bible-lake-reading-hero.mp4"
    ...
/>
```
**Status:** ⚠️ Should use `siteSettings.partnerPageVideo` from schema

---

### 6. **src/pages/samples.astro** — 1 Hardcoded URL

#### Line 150: Hero video
```typescript
<VideoHeroInner
    videoSrc="https://assets.spiritmediapublishing.com/fathers-heart-bible/flipping-through-bible-church.mov"
    ...
/>
```
**Status:** ⚠️ Should use `siteSettings.samplesPageVideo` from schema

---

### 7. **src/pages/the-fathers-heart-bible.astro** — 2 Hardcoded URLs

#### Line 34: FHBI cover image
```typescript
const fhbiCoverUrl =
    'https://cdn.sanity.io/images/rusi1hyi/production/3ab3f8d98e6ac0913d382922f0983efe6cb5535f-1278x2118.png';
```
**Status:** ⚠️ Should use Sanity image field with `urlFor()` transformation

#### Line 130: Hero video
```typescript
<VideoHeroInner
    videoSrc="https://assets.spiritmediapublishing.com/fathers-heart-bible/hands-holding-bible.mp4"
    ...
/>
```
**Status:** ⚠️ Should use `siteSettings.biblesPageVideo` or similar field from schema

---

## Schema Issues

### Missing Fields in siteSettings

The schema exists and has most fields, but these are missing or misconfigured:

1. ✅ **indexHeroVideo** — exists as URL field (can be renamed/repurposed)
2. ❌ **homePageHeroVideos** — MISSING — should be array of video objects with theme
3. ✅ **aboutPageVideo** — exists (LINE 293)
4. ✅ **downloadPageVideo** — exists (LINE 314)
5. ✅ **joinPageVideo** — exists (LINE 307)
6. ✅ **partnerPageVideo** — exists (LINE 300)
7. ❌ **samplesPageVideo** — MISSING — needs to be added
8. ❌ **biblesPageVideo** or **theThersHeartBiblePageVideo** — MISSING
9. ❌ **fhbCoverImage** — MISSING — should be Sanity image type (currently using URL field)
10. ✅ **bibleCoverImage** — exists but using alternate `bookCoverUrl` fallback

---

## Action Plan

### Phase 1: Update Sanity Schema
- [ ] Add `samplesPageVideo` field
- [ ] Add `theThersHeartBiblePageVideo` field
- [ ] Add `fhbCoverImage` field (image type with hotspot)
- [ ] Add `homePageHeroVideos` array field with video URL + theme structure
- [ ] Verify all page-specific video fields are properly documented

### Phase 2: Update Pages
- [ ] **index.astro**: Replace hardcoded `R2` constant and `heroVideos` array with Sanity data
- [ ] **about.astro**: Wire hero video to `siteSettings.aboutPageVideo`
- [ ] **download.astro**: Wire hero video + FHBI cover to Sanity
- [ ] **join.astro**: Wire hero video to `siteSettings.joinPageVideo`
- [ ] **partner.astro**: Wire hero video to `siteSettings.partnerPageVideo`
- [ ] **samples.astro**: Wire hero video to new `samplesPageVideo` field
- [ ] **the-fathers-heart-bible.astro**: Wire hero video + FHBI cover to Sanity

### Phase 3: Verify & Deploy
- [ ] Run `npm run build` and confirm no errors
- [ ] Test all pages in dev environment
- [ ] Commit with message explaining the changes
- [ ] Push to git with --no-verify

---

## Current Schema Status

The siteSettings schema **already has most required fields**:

✅ **Page-Specific Videos** (group: pageVideos)
- `indexHeroVideo` (URL) — Home page hero
- `indexHeroVideo2` (URL) — Home page secondary
- `aboutPageVideo` (URL) — About page
- `downloadPageVideo` (URL) — Download page
- `joinPageVideo` (URL) — Join page
- `partnerPageVideo` (URL) — Partner page

❌ **Missing**:
- `samplesPageVideo` (URL) — Samples page
- `theThersHeartBiblePageVideo` (URL) — The Father's Heart Bible page
- `homePageHeroVideos` (array) — Hero video rotation data

✅ **Media & Assets** (group: media)
- `bibleCoverImage` (image) — Bible cover (Sanity native)
- `bookCoverUrl` (URL) — Book cover (external URL fallback)

❌ **Missing**:
- `fhbCoverImage` (image) — FHB → Beloved Identity cover

---

## Recommendations

1. **Keep schema URL fields for R2 videos** — these are external media, not suitable for Sanity asset management
2. **Use Sanity image type for any images we control** — allows transformation via `urlFor()`
3. **Create structured array for index.astro hero videos** — moving from hardcoded object to CMS-driven
4. **Add fallback logic** — pages should gracefully handle missing Sanity values with sensible defaults
5. **Validate build** — ensure all new Sanity queries are properly typed

---

## Next Steps

1. Checkout dev branch (DONE ✅)
2. Update schema with missing fields
3. Update all .astro pages with dynamic fetches
4. Build and verify
5. Commit and push with --no-verify

**Estimated Time:** 45–60 minutes

---

**Previous Audit:** March 21, 2025 — Reported all issues as resolved
**Current Audit:** April 1, 2026 — **Revisions needed** — found 11 hardcoded URLs
