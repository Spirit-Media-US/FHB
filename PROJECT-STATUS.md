# Father's Heart Bible — Project Status & Knowledge Base
> Last updated: 2026-03-08
> **Claude: Read this file before making any statements about project state or touching any code.**

---

## Stack
- **Framework:** Astro v5 + Tailwind CSS
- **CMS:** Sanity (projectId: `rusi1hyi`, dataset: `production`)
- **Hosting:** Netlify
- **DNS:** Cloudflare
- **Domains:** fathersheartbible.com + fathersheartbible.org (Kevin owns both)
- **Repo:** `Spirit-Media-US/FHB` (GitHub org)

---

## Pages
| Page | Sanity | Notes |
|---|---|---|
| index.astro | partial | Check current fetch status |
| sample.astro | unknown | Check current fetch status |
| 404.astro | no | Static |

---

## Known Issues / Remaining Tasks
- SSL must cover all 4 variants: fathersheartbible.org, www.fathersheartbible.org, fathersheartbible.com, www.fathersheartbible.com — confirm coverage on Netlify
- Previously pointed to Cloudways at 161.35.131.217 — verify DNS fully cut over to Netlify
- No PROJECT-STATUS.md existed before 2026-03-08 — audit needed to fill in full details

---

## Key Rules
- All video: YouTube only, never in Git or public/
- All images: Sanity CDN via urlFor() or direct cdn.sanity.io URL
- Cloudflare CNAME for mail subdomains must be DNS-only (grey cloud)
- One session = one push = one Netlify build credit
