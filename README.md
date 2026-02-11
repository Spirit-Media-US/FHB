# FHB — Father's Heart Bible

**Website:** [fathersheartbible.org](https://fathersheartbible.org)
**Repo:** [github.com/Spirit-Media-US/FHB](https://github.com/Spirit-Media-US/FHB)

## Tech Stack

| Tool | Purpose |
|------|---------|
| [Astro](https://astro.build) v5 | Static site framework |
| [Tailwind CSS](https://tailwindcss.com) v4 | Utility-first styling via `@tailwindcss/vite` |
| [Biome](https://biomejs.dev) | Linter & formatter (replaces ESLint + Prettier) |
| [Lefthook](https://github.com/evilmartians/lefthook) | Git pre-commit hooks for auto-formatting |
| [Bun](https://bun.sh) | JavaScript runtime & package manager |
| TypeScript | Type safety (strict mode) |

## Project Structure

```
FHB/
├── .env                    # Secrets — git-ignored
├── .env.example            # Template for env vars
├── .gitignore
├── astro.config.mjs        # Astro + Tailwind + Sitemap config
├── biome.json              # Linting & formatting rules
├── lefthook.yml            # Pre-commit hook config
├── package.json
├── tsconfig.json
├── public/
│   ├── .htaccess           # Apache: serve index.html over index.php
│   ├── favicon.svg
│   └── robots.txt
├── scripts/
│   ├── deploy.sh           # Git-based deploy to Cloudways
│   └── deploy.ts           # SFTP deploy (unused — kept for reference)
└── src/
    ├── components/
    ├── layouts/
    │   └── Layout.astro    # Base layout with SEO meta tags
    ├── pages/
    │   ├── index.astro     # Homepage (coming soon)
    │   └── 404.astro       # Custom 404 page
    └── styles/
        └── global.css      # Tailwind import
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) — `brew install bun`
- [Git](https://git-scm.com) — `brew install git`
- [Node.js](https://nodejs.org) — `brew install node`

### Setup

```bash
git clone git@github.com:Spirit-Media-US/FHB.git
cd FHB
bun install
```

### Development

```bash
bun run dev           # Start dev server at localhost:4321
```

### Build

```bash
bun run build         # Type-check + build to ./dist
bun run preview       # Preview the production build locally
```

### Linting & Formatting

```bash
bun run check         # Run Biome fix on all files
```

Biome also runs automatically on every commit via Lefthook pre-commit hooks.
Staged files matching `*.{js,ts,jsx,tsx,json,css,astro}` are checked and
auto-fixed before the commit completes.

## Deployment

### How It Works

The site is hosted on **Cloudways** (PHP stack). Since there's no Node/Bun on
the server, we build locally and push only the static output.

- **`main` branch** — source code
- **`deploy` branch** — built static files (what Cloudways pulls)

### Deploy to Production

```bash
bun run deploy
```

This runs `scripts/deploy.sh`, which:

1. Builds the site (`bun run build`)
2. Switches to the `deploy` branch
3. Replaces all files with the contents of `./dist`
4. Commits and force-pushes to `origin/deploy`
5. Switches back to `main`

After pushing, go to **Cloudways → Application → Deployment via Git → Pull**
to pull the latest.

### Cloudways Configuration

- **Server IP:** 161.35.131.217
- **Git repo:** `git@github.com:Spirit-Media-US/FHB.git`
- **Branch:** `deploy`
- **Deployment path:** `public_html`
- **SSH access:** RSA key at `~/.ssh/cloudways_rsa`

### SSH into Cloudways

```bash
ssh -i ~/.ssh/cloudways_rsa master_zrtbnqxanz@161.35.131.217
```

The FHB application files live at:
```
/home/master/applications/njcgwurpkq/public_html/
```

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

| Variable | Description |
|----------|-------------|
| `SFTP_HOST` | Cloudways server IP (for SFTP deploy — optional) |
| `SFTP_USER` | Cloudways SSH username |
| `SFTP_PASSWORD` | Cloudways SSH password |
| `SFTP_REMOTE_PATH` | Remote path to `public_html` |
| `PUBLIC_SITE_URL` | Live site URL (`https://fathersheartbible.org`) |
| `PUBLIC_GA_ID` | Google Analytics 4 measurement ID |

## Commands Cheat Sheet

```bash
bun install                       # Install dependencies
bun run dev                       # Dev server (localhost:4321)
bun run build                     # Production build
bun run preview                   # Preview production build
bun run deploy                    # Build + push to deploy branch
bun run check                     # Lint & format all files
bunx astro check                  # TypeScript type checking
bunx lefthook run pre-commit      # Manually run pre-commit hooks
```

## Next Steps

- [ ] Set up SSL (Let's Encrypt) in Cloudways
- [ ] Add custom fonts
- [ ] Add Google Analytics 4
- [ ] Build out site pages (About, Contact, etc.)
- [ ] Add Navbar and Footer components
- [ ] Configure Astro Image optimization
- [ ] Add structured data (schema.org) for SEO
- [ ] Set up Content Collections for blog/articles

## DNS

Domain `fathersheartbible.org` is managed in GoDaddy.

| Type | Name | Value |
|------|------|-------|
| A | @ | 161.35.131.217 |
| CNAME | www | fathersheartbible.org |

---

Built with ❤️ by Spirit Media US
