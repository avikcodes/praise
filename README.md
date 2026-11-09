This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Praise landing page

The landing-page foundation for **Praise** lives in `src/app` and `src/components`.

### Design system

Tokens and reusable styles are defined in `src/app/globals.css`:

- **Surfaces**: warm white (`--color-warm-50`, `--color-warm-100`) with subtle borders (`--color-line`).
- **Text**: dark charcoal ink (`--color-ink-900` … `--color-ink-400`).
- **Accent**: purple `#7049D8` (`--color-brand-500`) with soft lavender backgrounds (`bg-brand-50`, `bg-brand-100`).
- **Type**: Geist via `next/font`, mapped to Tailwind's `font-sans` / `font-mono`.

Component classes you can reuse anywhere:

| Class | Purpose |
| --- | --- |
| `.container-page` | Page gutter + max width |
| `.section` | Shared vertical rhythm + scroll offset for the sticky header |
| `.display`, `.heading-lg`, `.heading-md`, `.lead`, `.muted` | Type scale |
| `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-sm/md/lg` | Buttons |
| `.card`, `.surface`, `.icon-tile` | Surfaces |
| `.eyebrow`, `.tag`, `.chip`, `.avatar` | Small UI pieces |
| `.nav-link`, `.footer-link` | Navigation and footer links |
| `.link` | Inline text link inside section copy (underlined, brand accent) |

### Logo and brand assets

One logo, defined once:

- **`src/lib/logo.json`** is the single source of truth. It holds the colours
  (`#7049d8` purple, `#ffffff`, `#1b1a18` ink), the icon shapes on the 32 × 32
  grid (rounded speech bubble, tail, the Geist quotation-glyph path, sparkle),
  and the horizontal lockup — icon + the `Praise` wordmark as vector outlines
  generated from Geist SemiBold, so the wordmark needs no font to render.
- **`src/lib/logo.ts`** exposes that JSON as typed values for React.
- **`src/components/brand.tsx`** renders it: `<PraiseLogo>` (icon + wordmark)
  and `<PraiseIcon>` (mark only). Both accept `size` (`sm` 24, `md` 32, `lg` 48
  or any number), `className` and `decorative`. They expose `role="img"` with
  `aria-label="Praise"` by default, or `aria-hidden` when `decorative` is set
  because a parent link already carries the accessible name.
- **`scripts/export-brand.mjs`** writes every static asset from the same JSON.
  Edit the geometry, then run:

  ```bash
  npm run brand:export
  ```

| File | Purpose |
| --- | --- |
| `public/brand/praise-logo.svg` | Horizontal lockup (icon + wordmark) |
| `public/brand/praise-icon.svg` | Icon only |
| `public/brand/praise-icon-512.png` | 512 × 512 app icon on an opaque white tile |
| `public/brand/praise-social.png` | 1200 × 630 sharing card |
| `src/app/favicon.ico` | Browser tab icon, 16/32/48 multi-resolution |
| `src/app/icon.svg` | Browser tab icon, vector |
| `src/app/apple-icon.png` | 180 × 180 home-screen icon |

Where it appears: the navbar and footer both render `<PraiseLogo>` from the
root layout, so every route — landing page, and the product, documentation,
community and legal pages as they are added — carries the identical mark;
`opengraph-image.tsx` / `twitter-image.tsx` render the same component for
share cards. No page invents its own version, and no emoji or icon font
stands in for the logo. See `public/brand/README.md` for usage rules.

### Components

| Path | Purpose |
| --- | --- |
| `src/components/ui/button.tsx` | `Button` (element) and `ButtonLink` (`next/link`) with shared variants/sizes |
| `src/components/ui/container.tsx` | Page gutter + max width |
| `src/components/ui/section.tsx` | `Section` (colour band + container) and `SectionHeading` |
| `src/components/ui/feature-list.tsx` | `FeatureList` — check-mark capability bullets |
| `src/components/ui/planned-chip.tsx` | `PlannedChip` — labels capabilities that are not implemented yet |
| `src/components/site-header.tsx` | Sticky navigation with a mobile menu |
| `src/components/site-footer.tsx` | Footer with Product / Documentation / Community / GitHub link columns |
| `src/components/brand.tsx` | `PraiseLogo` and `PraiseIcon` — the logo components |
| `src/lib/logo.json` + `src/lib/logo.ts` | Logo geometry (single source of truth) and its typed accessors |
| `src/components/seo/json-ld.tsx` | `JsonLd` — structured data as a native `<script>` tag with `<` escaped |
| `src/components/seo/social-image.tsx` | `ImageResponse` renderer shared by the Open Graph and Twitter card images |
| `src/components/sections/*` | Hero, Features, How it works, Collect, Manage, Publish, Open source, Developers, AI integrations, Self-host, Security, FAQ, CTA |

Sections on the home page: `Hero` → `Features` → `Workflow` (`#how-it-works`) → `Collect` (`#collect`) → `Manage` (`#manage`) → `Publish` (`#publish`) → `OpenSource` (`#open-source`) → `Developers` (`#developers`) → `AiIntegrations` (`#ai`) → `SelfHost` (`#self-host`) → `Security` → `Faq` (`#faq`) → `CTA`.
The product explanation sections are `Workflow`, `Collect`, `Manage` and `Publish`: three steps, then one section each for collecting, managing and publishing testimonials. `OpenSource`, `Developers`, `AiIntegrations`, `SelfHost` and `Faq` cover licensing and data ownership, the API/embed/SDK/webhook surfaces, planned MCP connections, the Docker deployment and pre-adoption questions.
Product previews are static and structural — skeleton lines, chips and empty states instead of invented testimonials or numbers. Nothing that is not implemented (the MCP server, the ChatGPT/Claude connections) is presented without a `PlannedChip` label, and no repository URL, customer counts or ratings are invented; `href="#"` links are placeholders until those routes exist.
The header links to `#features`, `#how-it-works` and `#self-host`; `Documentation` and `GitHub` are `#` placeholders until those routes exist.
Copy and `href="#"` links are placeholders — swap them for real routes as they are built.

### SEO, structured data and indexing

Everything lives in `src/app` and `src/lib/site.ts` (the single source for the
origin, title and descriptions):

| File | Purpose |
| --- | --- |
| `src/app/layout.tsx` | `metadataBase`, `title` default + `%s \| Praise` template, description, `alternates.canonical`, Open Graph, Twitter card, `robots` (index/follow + `googlebot` snippet limits), and the `Organization` + `SoftwareApplication` JSON-LD |
| `src/app/page.tsx` | `FAQPage` JSON-LD, built from the same `faqs` array the section renders |
| `src/lib/faq.ts` | FAQ copy shared by the section and the schema, so they cannot drift |
| `src/app/sitemap.ts` | Single-URL sitemap (fragments are not URLs) |
| `src/app/robots.ts` | `Allow: /` plus the sitemap pointer |
| `src/app/opengraph-image.tsx`, `src/app/twitter-image.tsx` | 1200×630 card images generated at build time, with exported `alt` text |
| `src/app/not-found.tsx` | Branded 404 with `robots: noindex` and no canonical |

Heading structure: one `<h1>` (hero), section titles as `<h2>`, cards and FAQ
questions (inside `<summary>`) as `<h3>`. There is no `Article` schema because
there are no articles, and no `BreadcrumbList` because the site is a single
page. No ratings, reviews, prices, logo or social profiles are claimed in the
schema because none are established.

**Manual configuration**

1. Set `NEXT_PUBLIC_SITE_URL` (see `.env.example`) to the production origin
   *before* `next build` — canonical URLs, the sitemap, robots.txt and the
   JSON-LD `@id`s all resolve against it. The `http://localhost:3000` fallback
   must not ship.
2. `href="#"` links (Documentation, GitHub, API reference, Community, legal)
   are placeholders: replace them when the real routes or repository URL
   exist. They cannot be guessed without inventing a URL.
3. After deploy, submit `sitemap.xml` in Google Search Console / Bing
   Webmaster Tools and validate the JSON-LD with the Schema Markup Validator.

## Self-Hosting with Docker Compose

Praise Core is engineered to run seamlessly on your own infrastructure with Docker Compose and PostgreSQL.

### Prerequisites

- **Docker Engine** (v20.10 or newer)
- **Docker Compose** (v2.0 or newer)
- **Minimum hardware**: 1 vCPU, 1 GB RAM, 10 GB disk space (2 vCPU, 2-4 GB RAM recommended for video testimonials)

---

### Quick Start (Production)

1. **Clone the repository and prepare your environment file:**

   ```bash
   git clone https://github.com/your-org/praise.git
   cd praise
   cp .env.example .env
   ```

2. **Configure your environment secrets:**

   Edit `.env` and set a strong database password and your public domain:

   ```bash
   # Generate a random 24-byte hex password
   openssl rand -hex 24
   ```

   In `.env`:
   ```dotenv
   NEXT_PUBLIC_SITE_URL=https://praise.yourdomain.com
   POSTGRES_PASSWORD=your_generated_secure_password
   ```

3. **Start the stack in detached background mode:**

   ```bash
   docker compose up -d
   ```

   This launches:
   - **PostgreSQL 16** (`praise-db`) with an internal health check.
   - **Praise Core** (`praise-app`) on port `3000`.
   - Automatic execution of database migrations via `prisma migrate deploy`.
   - Named volumes: `praise_db_data` (database) and `praise_media` (videos/photos).

4. **Verify container health:**

   ```bash
   docker compose ps
   curl -s http://localhost:3000/api/health | jq
   ```

5. **Create your initial administrator account:**

   Open `http://localhost:3000/signup` (or `https://praise.yourdomain.com/signup`) in your browser to create your primary workspace owner account.

---

### Architecture & Persistence

| Service | Container | Internal Port | Description |
| --- | --- | --- | --- |
| `app` | `praise-app` | `3000` | Next.js 16 production web application & API |
| `db` | `praise-db` | `5432` | PostgreSQL 16 Alpine relational database |

#### Persistent Volumes

Praise writes all permanent state to dedicated host volumes:

- **`praise_db_data`** (`/var/lib/postgresql/data`): All user accounts, workspaces, forms, testimonials, and verifiable consent audit ledgers.
- **`praise_media`** (`/app/storage/uploads`): All customer video recordings (MP4/WebM), voice clips, and avatar photos.
- **`praise_data`** (`/app/data`): Internal disaster recovery tombstones and analytics cache.

Data survives container restarts, updates, and recreations (`docker compose down && docker compose up -d`).

---

### Database Migration Workflow

Migrations are automatically applied on container boot by `docker-entrypoint.sh` using:

```bash
npx prisma migrate deploy
```

To run migrations manually or check migration status inside the running container:

```bash
docker compose exec app npx prisma migrate status
```

---

### Backup & Disaster Recovery

Praise Core includes production-grade backup and restore tooling designed to create unified, timestamped, cryptographically verified `.tar.gz` archives. Each archive bundles:
- Complete PostgreSQL transactional database dump (`database.sql`).
- All customer media files (video recordings, voice clips, avatar photos).
- Cryptographic `manifest.json` containing per-file SHA-256 checksums, table statistics, and environment metadata.

#### 1. Create a Backup

Run the automated backup tool:

```bash
npm run backup
```

Or execute directly with custom options:

```bash
node scripts/backup.mjs --output-dir ./backups
```

This generates a timestamped archive: `backups/praise-backup-YYYY-MM-DDTHH-mm-ssZ.tar.gz`.

*Available Options:*
- `--output-dir <path>`: Target directory for backup archives (default: `./backups`).
- `--docker`: Force database dump via `docker compose exec -T db pg_dump`.
- `--no-media`: Exclude uploaded media files (database-only backup).
- `--media-dir <path>`: Specify custom local media storage directory.

#### 2. Verify Archive Integrity

Before storing or replicating archives, verify that the archive is uncorrupted and that all database records and media files match their declared SHA-256 checksums:

```bash
npm run backup:verify -- backups/praise-backup-2026-11-09T14-30-00Z.tar.gz
```

Add `--verbose` to list individual media files and tables.

#### 3. Restore from Backup

> [!WARNING]
> Restoring a backup is a destructive operation that completely overwrites existing database tables and replaces matching media files on disk. Praise enforces an explicit safety confirmation guard.

##### Pre-flight Simulation (Dry-Run):
Inspect the archive, validate all checksums, and preview the restoration plan without modifying any live data:

```bash
npm run restore -- backups/praise-backup-2026-11-09T14-30-00Z.tar.gz --dry-run
```

##### Live Restoration:
Execute the restoration by providing the explicit `--confirm` flag:

```bash
npm run restore -- backups/praise-backup-2026-11-09T14-30-00Z.tar.gz --confirm
```

##### How to Verify a Successful Restore:
1. **Automated Verification:** The restore tool computes SHA-256 checksums of restored files against the manifest upon completion.
2. **Probe System Health:**
   ```bash
   curl -s http://localhost:3000/api/health | jq
   ```
3. **Inspect Database Migration Status:**
   ```bash
   docker compose exec app npx prisma migrate status
   ```

#### 4. Automated Backup Scheduling (Cron)

To schedule nightly automated backups at 02:00 UTC with a 14-day retention policy:

```bash
# Open server crontab
crontab -e

# Add nightly Praise backup job:
0 2 * * * cd /opt/praise && RETENTION_DAYS=14 ./scripts/backup.sh >> /var/log/praise-backup.log 2>&1
```

#### 5. Off-Site Replication Best Practices

Never store backups exclusively on the host server disk. Replicate verified archives to remote object storage (AWS S3, Cloudflare R2, or Backblaze B2):

```bash
# Using AWS CLI:
aws s3 sync /opt/praise/backups/ s3://my-praise-backups/ --exclude "*" --include "praise-backup-*.tar.gz"

# Or using rclone:
rclone sync /opt/praise/backups/ remote:praise-backups/
```

---

### Reverse Proxy Configuration

For production HTTPS termination, place Praise behind a reverse proxy such as Caddy or Nginx.

#### Caddy Example (`Caddyfile`):

```caddy
praise.yourdomain.com {
    reverse_proxy 127.0.0.1:3000 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
}
```

#### Nginx Example:

```nginx
server {
    server_name praise.yourdomain.com;
    listen 80;
    listen 443 ssl http2;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }
}
```

---

### Local Development (without Docker)

If developing locally without containers:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the development server.
