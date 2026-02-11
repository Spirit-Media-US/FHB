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

### Architecture Overview

The site is hosted on **Cloudways** (standard PHP stack on DigitalOcean). Since
Cloudways PHP servers don't have Node.js or Bun installed, we can't build on
the server. Instead, we use a **two-branch strategy**:

- **`main` branch** — full source code (Astro, components, configs, etc.)
- **`deploy` branch** — only the built static files from `./dist`

Cloudways Git deployment is configured to pull from the `deploy` branch into
the application's `public_html` directory. The workflow is:

```
Local: edit code → commit to main → run bun run deploy
  ↓
deploy.sh: builds site → pushes static files to deploy branch
  ↓
Cloudways: pull deploy branch → files land in public_html → site is live
```

### Deploy to Production

```bash
bun run deploy
```

This runs `scripts/deploy.sh`, which:

1. Runs `bun run build` (TypeScript check + Astro build)
2. Copies `./dist` contents to a temp directory
3. Backs up `node_modules` (so the branch switch doesn't destroy them)
4. Switches to the `deploy` branch
5. Cleans out all files and replaces them with the build output
6. Commits with a timestamped message and force-pushes to `origin/deploy`
7. Switches back to `main` and restores `node_modules`

After pushing, go to **Cloudways → Application → Deployment via Git → Pull**
to pull the latest files onto the server.

### Cloudways Git Integration Setup

This is the one-time setup that was done to connect Cloudways to GitHub.
Documenting here for reference or if it needs to be reconfigured.

#### 1. GitHub Repository

The repo lives under the **Spirit-Media-US** organization on GitHub:
`git@github.com:Spirit-Media-US/FHB.git`

The `deploy` branch was created as an orphan branch containing only the
static build output (HTML, CSS, assets). It has no shared history with `main`.

#### 2. Cloudways Deploy Key

Cloudways needs read access to the GitHub repo. This is done via a **deploy key**:

1. In **Cloudways → Application → Deployment via Git**, Cloudways generates
   an SSH public key
2. That key was added to the GitHub repo at:
   **GitHub → Spirit-Media-US/FHB → Settings → Deploy Keys**
3. The key was given **read-only** access (Cloudways only needs to pull)

#### 3. Cloudways Git Deployment Settings

In **Cloudways → Application → Deployment via Git**:

| Setting | Value |
|---------|-------|
| Git Repository | `git@github.com:Spirit-Media-US/FHB.git` |
| Branch | `deploy` |
| Deployment Path | `public_html` |

After configuring, click **Pull** to deploy. Each subsequent deploy requires
clicking Pull again (or setting up a webhook for auto-deploy).

#### 4. Apache Configuration

Cloudways PHP stack uses Apache behind Nginx. The default Cloudways app ships
with an `index.php` that shows a "PHP Stack" landing page. Two things were
done to ensure our static site is served correctly:

- **Deleted `index.php`** from `public_html` on the server (it was overriding
  our `index.html` because Apache defaults to serving PHP files first)
- **Added `public/.htaccess`** with `DirectoryIndex index.html index.php` to
  ensure Apache always prioritizes `index.html` even if an `index.php` is
  ever recreated

The `.htaccess` is in the `public/` folder of the source code, which Astro
copies to `dist/` during build, and `deploy.sh` copies dotfiles to the
`deploy` branch (using `cp -r dist/. "$DEPLOY_DIR/"` to include hidden files).

### Cloudways Server Details

| Detail | Value |
|--------|-------|
| Server IP | 161.35.131.217 |
| Server Type | DigitalOcean — PHP Stack |
| Master User | `master_zrtbnqxanz` |
| App Code | `njcgwurpkq` |
| App Path | `/home/master/applications/njcgwurpkq/` |
| Public HTML | `/home/master/applications/njcgwurpkq/public_html/` |

### SSH Access to Cloudways

A 4096-bit RSA key was generated specifically for Cloudways (they don't accept
ed25519 keys — minimum 1024-bit RSA required):

- **Private key:** `~/.ssh/cloudways_rsa`
- **Public key:** `~/.ssh/cloudways_rsa.pub`

The public key was added in **Cloudways → Server → Security → SSH Keys**.

To connect:

```bash
ssh -i ~/.ssh/cloudways_rsa master_zrtbnqxanz@161.35.131.217
```

### Troubleshooting Deployment

**Site shows "PHP Stack" page instead of FHB:**
The default `index.php` is taking priority. Delete it:
```bash
ssh -i ~/.ssh/cloudways_rsa master_zrtbnqxanz@161.35.131.217 \
  "rm /home/master/applications/njcgwurpkq/public_html/index.php"
```

**Deploy script fails with "command not found":**
The deploy script includes a PATH export for Homebrew binaries. If Bun or
Astro can't be found, ensure `/opt/homebrew/bin` is in your shell PATH or
update the PATH line in `scripts/deploy.sh`.

**Cloudways Pull fails (permission denied):**
The deploy key may have been removed from GitHub. Re-add it:
GitHub → Spirit-Media-US/FHB → Settings → Deploy Keys → Add the key
from Cloudways → Application → Deployment via Git.

**`.htaccess` missing after deploy:**
The deploy script uses `cp -r dist/. "$DEPLOY_DIR/"` (note the `.` after
`dist/`) to copy hidden files. If this was changed to `dist/*`, dotfiles
like `.htaccess` will be skipped. Verify the script uses the correct syntax.

**CSS not loading on production:**
The built CSS lives in `/_astro/` directory. Make sure the `_astro` folder
was included in the deploy. Check the `deploy` branch on GitHub to verify.

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
