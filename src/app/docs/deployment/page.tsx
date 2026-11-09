import {
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { TableOfContents, type TocItem } from "@/components/docs/toc";
import { DocsPager } from "@/components/docs/pager";
import { CodeBlock } from "@/components/docs/code-block";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Production Deployment Guide — Docker, PostgreSQL & Backups",
  description:
    "Production deployment instructions for Praise: Docker Compose setup, PostgreSQL database, media volume storage, reverse proxies (Caddy/Nginx), SSL certificates, routine backups, and maintenance.",
  path: "/docs/deployment",
});

const tocItems: TocItem[] = [
  { id: "system-requirements", title: "1. System Requirements" },
  { id: "docker-deployment", title: "2. Docker Deployment" },
  { id: "database-configuration", title: "3. Database Configuration" },
  { id: "media-storage", title: "4. Media Storage & Volumes" },
  { id: "environment-variables", title: "5. Environment Variables" },
  { id: "reverse-proxy", title: "6. Reverse Proxy Configuration" },
  { id: "https-certificates", title: "7. HTTPS & SSL Certificates" },
  { id: "domain-configuration", title: "8. Domain Configuration" },
  { id: "backups", title: "9. Creating Database & Media Backups" },
  { id: "restoring-backups", title: "10. Restoring from Backups" },
  { id: "updates", title: "11. Application Updates" },
  { id: "logs-troubleshooting", title: "12. Logs & Troubleshooting" },
  { id: "production-checklist", title: "13. Production Checklist" },
];

export default function DeploymentDocsPage() {
  return (
    <div className="flex flex-col xl:flex-row xl:gap-10">
      <article className="flex-1 min-w-0">
        <Breadcrumbs
          crumbs={[
            { label: "Overview", href: "/docs" },
            { label: "Production Deployment" },
          ]}
        />

        <div className="mb-8 border-b border-line pb-6">
          <span className="eyebrow mb-2">Production Operations</span>
          <h1 className="display text-3xl sm:text-4xl">Production Deployment</h1>
          <p className="lead mt-3 text-base text-ink-600">
            A production-grade guide to deploying, configuring, securing, and
            maintaining Praise on self-hosted Linux servers or virtual machines.
          </p>
        </div>

        {/* 1. System Requirements */}
        <section id="system-requirements" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">1. System Requirements</h2>
          <p className="muted text-sm leading-relaxed mb-4">
            Praise runs on any modern Linux distribution with Docker installed:
          </p>

          <div className="surface overflow-hidden divide-y divide-line text-xs my-4">
            <div className="p-3.5 flex items-start gap-3">
              <span className="font-semibold text-ink-900 w-32 shrink-0">
                Operating System
              </span>
              <span className="text-ink-600">
                Ubuntu 22.04 / 24.04 LTS, Debian 12, Rocky Linux 9, or Alpine
              </span>
            </div>
            <div className="p-3.5 flex items-start gap-3">
              <span className="font-semibold text-ink-900 w-32 shrink-0">
                Minimum Specs
              </span>
              <span className="text-ink-600">
                1 vCPU, 1 GB RAM, 10 GB SSD (suitable for text & voice notes)
              </span>
            </div>
            <div className="p-3.5 flex items-start gap-3">
              <span className="font-semibold text-ink-900 w-32 shrink-0">
                Recommended Specs
              </span>
              <span className="text-ink-600">
                2 vCPU, 2-4 GB RAM, 50+ GB SSD (for high-volume video uploads)
              </span>
            </div>
            <div className="p-3.5 flex items-start gap-3">
              <span className="font-semibold text-ink-900 w-32 shrink-0">
                Software
              </span>
              <span className="text-ink-600">
                Docker Engine 20.10+ and Docker Compose v2+
              </span>
            </div>
          </div>
        </section>

        {/* 2. Docker Deployment */}
        <section id="docker-deployment" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">2. Docker Deployment</h2>
          <p className="muted text-sm leading-relaxed mb-4">
            Praise utilizes Docker Compose to manage the web application and
            database dependencies:
          </p>

          <CodeBlock
            language="yaml"
            filename="docker-compose.yml"
            code={`services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    image: praise:latest
    container_name: praise-app
    restart: unless-stopped
    ports:
      - "\${HOST_PORT:-3000}:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - HOSTNAME=0.0.0.0
      - NEXT_PUBLIC_SITE_URL=\${NEXT_PUBLIC_SITE_URL:-http://localhost:3000}
      - DATABASE_URL=postgresql://\${POSTGRES_USER:-praise}:\${POSTGRES_PASSWORD}@db:5432/\${POSTGRES_DB:-praise}?schema=public
      - PRAISE_UPLOAD_DIR=/app/storage/uploads
      - PRAISE_DATA_DIR=/app/data
    volumes:
      - praise_media:/app/storage/uploads
      - praise_data:/app/data
    depends_on:
      db:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1"]
      interval: 15s
      timeout: 5s
      retries: 3
      start_period: 30s
    networks:
      - praise_network

  db:
    image: postgres:16-alpine
    container_name: praise-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=\${POSTGRES_DB:-praise}
      - POSTGRES_USER=\${POSTGRES_USER:-praise}
      - POSTGRES_PASSWORD=\${POSTGRES_PASSWORD}
    volumes:
      - praise_db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \\\$\${POSTGRES_USER:-praise} -d \\\$\${POSTGRES_DB:-praise}"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s
    networks:
      - praise_network

volumes:
  praise_db_data:
    name: praise_db_data
  praise_media:
    name: praise_media
  praise_data:
    name: praise_data

networks:
  praise_network:
    name: praise_network
    driver: bridge`}
          />

          <p className="muted text-sm leading-relaxed mb-2">
            Bring the stack up in detached background mode:
          </p>

          <CodeBlock
            language="bash"
            filename="Terminal"
            code={`docker compose up -d`}
          />
        </section>

        {/* 3. Database Configuration */}
        <section id="database-configuration" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">3. Database Configuration</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Praise stores structured records (submitter names, companies, custom
            question answers, ratings, and tag assignments) in PostgreSQL.
          </p>
          <ul className="list-disc pl-5 text-sm text-ink-600 space-y-1 mb-4">
            <li>PostgreSQL 15 or 16 is recommended.</li>
            <li>Database schema migrations run automatically on container boot via <code>prisma migrate deploy</code>.</li>
            <li>Data volume <code>praise_db_data</code> ensures persistence across restarts.</li>
          </ul>
        </section>

        {/* 4. Media Storage & Volumes */}
        <section id="media-storage" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">4. Media Storage &amp; Volumes</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Customer video recordings (WebM/MP4) and audio voice notes are stored
            on disk under the mounted media volume (<code>praise_media</code> mapped to <code>/app/storage/uploads</code>).
          </p>
          <div className="surface p-4 text-xs text-ink-700 space-y-2">
            <h4 className="font-semibold text-ink-900">Storage Sizing Guidelines:</h4>
            <ul className="list-disc pl-4 space-y-1 text-ink-600">
              <li>1 minute video submission: ~10 MB to 25 MB</li>
              <li>1 minute audio voice note: ~1 MB</li>
              <li>1,000 video testimonials: ~15 GB to 25 GB storage space</li>
            </ul>
          </div>
        </section>

        {/* 5. Environment Variables */}
        <section id="environment-variables" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">5. Environment Variables</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            The variables defined in <code>.env.example</code>:
          </p>

          <div className="surface overflow-hidden divide-y divide-line text-xs my-4">
            <div className="p-3.5 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-48 shrink-0">
                NEXT_PUBLIC_SITE_URL
              </code>
              <span className="text-ink-600">
                The public canonical origin (e.g. <code>https://praise.yourdomain.com</code>).
                Required for canonical tags, widget script hosts, and sitemaps.
              </span>
            </div>
            <div className="p-3.5 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-48 shrink-0">
                NODE_ENV
              </code>
              <span className="text-ink-600">
                Set to <code>production</code> in production environments.
              </span>
            </div>
          </div>
        </section>

        {/* 6. Reverse Proxy Configuration */}
        <section id="reverse-proxy" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">6. Reverse Proxy Configuration</h2>
          <p className="muted text-sm leading-relaxed mb-4">
            It is best practice to place Praise behind a reverse proxy that
            handles TLS certificates and forwards traffic to port 3000:
          </p>

          <h3 className="heading-md text-base mb-2">Option A: Caddy (Recommended for Simplicity)</h3>
          <p className="muted text-xs leading-relaxed mb-2">
            Caddy automatically provisions and renews Let&apos;s Encrypt SSL
            certificates with zero configuration:
          </p>

          <CodeBlock
            language="caddy"
            filename="/etc/caddy/Caddyfile"
            code={`praise.yourdomain.com {
    reverse_proxy 127.0.0.1:3000
    request_body {
        max_size 100MB
    }
}`}
          />

          <h3 className="heading-md text-base mt-6 mb-2">Option B: Nginx</h3>
          <CodeBlock
            language="nginx"
            filename="/etc/nginx/sites-available/praise"
            code={`server {
    server_name praise.yourdomain.com;
    client_max_body_size 100M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`}
          />
        </section>

        {/* 7. HTTPS & SSL Certificates */}
        <section id="https-certificates" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">7. HTTPS &amp; SSL Certificates</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            HTTPS is required because modern browsers forbid microphone and
            webcam video recording on insecure (HTTP) origins (except localhost).
          </p>
          <div className="surface border-amber-200 bg-amber-50/50 p-4 text-xs text-amber-900 leading-relaxed">
            <AlertTriangle size={15} className="inline text-amber-600 mr-1.5" />
            <strong>Media Permission Requirement:</strong> Customers cannot record
            video or audio testimonials if Praise is served over plain HTTP.
            Always configure valid TLS certificates.
          </div>
        </section>

        {/* 8. Domain Configuration */}
        <section id="domain-configuration" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">8. Domain Configuration</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            In your DNS registrar (Cloudflare, Namecheap, Route 53):
          </p>
          <ul className="list-disc pl-5 text-xs text-ink-600 space-y-1 mb-4">
            <li>Create an <code>A</code> record pointing <code>praise.yourdomain.com</code> to your server&apos;s public IPv4.</li>
            <li>Optionally create an <code>AAAA</code> record for IPv6.</li>
          </ul>
        </section>

        {/* 9. Backups */}
        <section id="backups" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">9. Creating Database &amp; Media Backups</h2>
          <p className="muted text-sm leading-relaxed mb-4">
            Praise Core includes unified backup tooling that bundles transactional
            PostgreSQL database dumps, customer media files (videos, audio, photos),
            and a cryptographic SHA-256 manifest into a single timestamped archive:
          </p>

          <CodeBlock
            language="bash"
            filename="Terminal"
            code={`# 1. Run the automated backup utility
npm run backup

# Or specify a custom output directory:
node scripts/backup.mjs --output-dir /opt/praise/backups

# 2. Verify archive integrity and cryptographic checksums
npm run backup:verify -- backups/praise-backup-2026-11-09T14-30-00Z.tar.gz`}
          />

          <div className="surface p-4 text-xs text-ink-700 space-y-2 mt-4">
            <h4 className="font-semibold text-ink-900">Automated Crontab Scheduling:</h4>
            <p className="text-ink-600">
              Run nightly backups at 02:00 UTC with an automated 14-day retention policy:
            </p>
            <pre className="font-mono bg-warm-50 p-2.5 rounded border border-line text-ink-800 text-[11px] overflow-x-auto">
              0 2 * * * cd /opt/praise &amp;&amp; RETENTION_DAYS=14 ./scripts/backup.sh &gt;&gt; /var/log/praise-backup.log 2&gt;&amp;1
            </pre>
          </div>
        </section>

        {/* 10. Restoring Backups */}
        <section id="restoring-backups" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">10. Restoring from Backups</h2>
          <p className="muted text-sm leading-relaxed mb-4">
            Restoring completely overwrites the target database and replaces media files.
            Praise enforces an explicit confirmation guard to prevent accidental data loss:
          </p>

          <CodeBlock
            language="bash"
            filename="Terminal"
            code={`# 1. Safe simulation (Dry-Run): validate archive and preview changes without modifying data
npm run restore -- backups/praise-backup-2026-11-09T14-30-00Z.tar.gz --dry-run

# 2. Execute live restoration with explicit confirmation
npm run restore -- backups/praise-backup-2026-11-09T14-30-00Z.tar.gz --confirm

# 3. Verify successful restoration via health probe
curl -s http://localhost:3000/api/health | jq`}
          />
        </section>

        {/* 11. Updates */}
        <section id="updates" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">11. Application Updates</h2>
          <p className="muted text-sm leading-relaxed mb-4">
            Updating Praise uses standard Docker Compose workflows:
          </p>

          <CodeBlock
            language="bash"
            filename="Terminal"
            code={`# Pull latest image
docker compose pull

# Recreate containers with zero manual database steps
docker compose up -d`}
          />
        </section>

        {/* 12. Logs & Troubleshooting */}
        <section id="logs-troubleshooting" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">12. Logs &amp; Troubleshooting</h2>
          <p className="muted text-sm leading-relaxed mb-4">
            Inspect live container output when diagnosing connectivity or startup
            issues:
          </p>

          <CodeBlock
            language="bash"
            filename="Terminal"
            code={`# View live application logs
docker compose logs -f app

# View database connection logs
docker compose logs -f db`}
          />
        </section>

        {/* 13. Production Checklist */}
        <section id="production-checklist" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">13. Production Checklist</h2>
          <div className="surface p-5 space-y-2 text-xs text-ink-700">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span><code>NEXT_PUBLIC_SITE_URL</code> set to production HTTPS domain in <code>.env</code></span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>Strong PostgreSQL password replaced in <code>docker-compose.yml</code></span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>Reverse proxy configured with active TLS/HTTPS certificate</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>Reverse proxy <code>client_max_body_size</code> set to at least 50MB-100MB for video</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>Automated cron backup scheduled for <code>pg_dump</code></span>
            </div>
          </div>
        </section>

        <DocsPager
          prev={{
            title: "Getting Started Guide",
            href: "/docs/getting-started",
          }}
          next={{
            title: "Widgets & Embedding",
            href: "/docs/widgets",
          }}
        />
      </article>

      <TableOfContents items={tocItems} />
    </div>
  );
}
