# Father's Heart Bible (FHB)

> **CLAUDE.md belongs in version control — NEVER add it to .gitignore. This file is the shared source of truth for all developers and all Claude Code sessions.**

This site: Father's Heart Bible | Repo: github.com/Spirit-Media-US/FHB | Domain: fathersheartbible.com / fathersheartbible.org | Sanity ID: rusi1hyi | R2 bucket: n/a

## Dev Commands

- `npm run dev` — local preview at localhost:4323
- `npm run build` — runs `astro check && astro build`

## Notes

- SSL must cover all four domain variants: fathersheartbible.org, www.fathersheartbible.org, fathersheartbible.com, www.fathersheartbible.com
- Uses Biome for linting and Lefthook for git hooks

## Status — as of 2026-03-24

### Completed & Live on Main
- Site live at fathersheartbible.com + fathersheartbible.org (both domains active)
- Pages: Home (index.astro), 404, Sample
- Sanity CMS fully wired: all content dynamic via siteSettings (nav, footer, phone, email, social links, OG image)
- All images served via urlFor() — no hardcoded image URLs
- Hardcoded content audit passed (A+ grade — all content from Sanity)
- Git hygiene: Lefthook hooks (block-main-push, large-file blocker, secret scanner), full .gitignore
- Astro 5 + Tailwind v4

### Still Pending
- Additional pages beyond Home (Bible reading, devotionals, etc.) — scope TBD with Kevin
- R2 bucket if audio/video assets are needed

## Rules

- All work goes to the **dev** branch — never push directly to main
- Only merge dev to main when Kevin says "push to main"
- Never push without local preview first
