import {
  ArrowRight,
  Box,
  CheckCircle2,
  Database,
  FolderArchive,
  HardDrive,
  Layers,
  RefreshCw,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section, SectionHeading } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Self-Host Praise — Docker, PostgreSQL & Media Storage",
  description:
    "Self-hosting overview for Praise: Docker Compose deployment, PostgreSQL database, local and S3-compatible media storage, routine backups, and data portability.",
  path: "/self-host",
});

const architectureComponents = [
  {
    icon: Box,
    title: "Web Application Container",
    badge: "Next.js & Node.js",
    description:
      "Runs the Praise web application, including customer collection forms, editorial moderation dashboard, and public widget embed assets.",
  },
  {
    icon: Database,
    title: "PostgreSQL Database",
    badge: "Relational Storage",
    description:
      "Stores structured testimonial data: submitter details, star ratings, custom question responses, moderation status, and tag assignments.",
  },
  {
    icon: HardDrive,
    title: "Local Media Volume",
    badge: "Direct Filesystem",
    description:
      "Stores uploaded customer video recordings (WebM/MP4), audio voice notes, and customer avatar images on mounted host disk volumes.",
  },
  {
    icon: Layers,
    title: "Optional S3-Compatible Storage",
    badge: "MinIO, R2, or S3",
    description:
      "For teams with high media volume, Praise can optionally stream video and audio uploads directly to standard S3-compatible object storage.",
  },
];

const requirements = [
  {
    spec: "Operating System",
    value: "Any Linux distribution (Ubuntu, Debian, Fedora, Alpine) or macOS / Windows with Docker",
  },
  {
    spec: "Minimum Hardware",
    value: "1 vCPU, 1 GB RAM, 10 GB disk (suitable for text testimonials and small teams)",
  },
  {
    spec: "Recommended Hardware",
    value: "2 vCPU, 2-4 GB RAM, 40+ GB SSD storage (recommended for video uploads and media transcoding)",
  },
  {
    spec: "Container Engine",
    value: "Docker 20.10+ and Docker Compose v2+",
  },
  {
    spec: "Networking & SSL",
    value: "Port 80/443 with a reverse proxy (Caddy, Traefik, or Nginx) handling HTTPS certificates",
  },
];

export default function SelfHostPage() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-line bg-warm-50 py-16 sm:py-20 lg:py-24">
        <Container className="flex flex-col items-center text-center">
          <span className="eyebrow">Infrastructure &amp; Deployment</span>
          <h1 className="display mt-4 max-w-3xl">
            Deploy Praise on your own infrastructure
          </h1>
          <p className="lead mt-4 max-w-2xl">
            Keep every video testimonial, audio recording, and customer review on
            hardware you control. No third-party accounts, no seat limits, and no
            vendor lock-in.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/get-started" variant="primary" size="lg">
              Get started guide
              <ArrowRight size={16} />
            </ButtonLink>
            <ButtonLink href="/security" variant="secondary" size="lg">
              Review security practices
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Architecture Overview */}
      <Section id="architecture" tone="white">
        <div className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="Architecture"
            title="The Self-Hosted Stack"
            description="Praise is engineered with proven, open infrastructure components designed for predictable operation and easy maintenance."
          />

          <div className="grid gap-6 md:grid-cols-2">
            {architectureComponents.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="card flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="icon-tile">
                      <Icon size={18} />
                    </span>
                    <span className="chip text-xs">{item.badge}</span>
                  </div>
                  <h3 className="heading-md">{item.title}</h3>
                  <p className="muted text-sm leading-relaxed">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Deployment Workflow Illustration */}
      <Section tone="muted">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="tag">Workflow</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Docker Compose
              </span>
            </div>
            <h2 className="heading-lg">Straightforward Docker Deployment</h2>
            <p className="lead">
              Praise deploys as a containerized stack using Docker Compose. A
              single compose file orchestrates the web application container,
              attaches the PostgreSQL database service, and binds persistent
              storage volumes to your host.
            </p>

            <div className="flex flex-col gap-3 text-sm text-ink-700">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="mt-0.5 text-brand-600 shrink-0" />
                <span>
                  <strong>Isolated Container Networking:</strong> The application
                  and database communicate across an internal Docker network,
                  exposing only necessary HTTP/HTTPS web ports to the host.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="mt-0.5 text-brand-600 shrink-0" />
                <span>
                  <strong>Host Volume Persistence:</strong> All database tables
                  and media assets are written directly to volumes on your host disk,
                  surviving container restarts and updates.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="mt-0.5 text-brand-600 shrink-0" />
                <span>
                  <strong>Standard Reverse Proxy:</strong> Put Praise behind
                  Caddy, Nginx, Traefik, or Cloudflare Tunnel to terminate TLS and
                  serve custom domains.
                </span>
              </div>
            </div>
          </div>

          {/* Docker Terminal & Structure Preview */}
          <div className="surface overflow-hidden shadow-sm">
            <div className="border-b border-line bg-warm-50 px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-900">
                Deployment Flow
              </span>
              <span className="chip text-[11px]">Standard Command</span>
            </div>
            <div className="p-6 flex flex-col gap-4 font-mono text-xs">
              <div className="rounded-xl border border-line bg-warm-50 p-3.5 text-ink-800">
                <span className="text-ink-400">$ </span>
                <span className="font-semibold">docker compose up -d</span>
              </div>

              <div className="rounded-xl border border-line bg-white p-4 space-y-3 font-sans text-xs">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-semibold text-ink-900 flex items-center gap-1.5">
                    <Box size={14} className="text-brand-600" /> Praise Web App
                  </span>
                  <span className="chip text-[11px] bg-emerald-50 text-emerald-800 border-emerald-200">
                    Running
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-semibold text-ink-900 flex items-center gap-1.5">
                    <Database size={14} className="text-brand-600" /> PostgreSQL Service
                  </span>
                  <span className="chip text-[11px] bg-emerald-50 text-emerald-800 border-emerald-200">
                    Healthy
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-ink-900 flex items-center gap-1.5">
                    <HardDrive size={14} className="text-brand-600" /> Persistent Volume
                  </span>
                  <span className="text-ink-500 font-mono text-[11px]">
                    /var/lib/praise/data
                  </span>
                </div>
              </div>

              <p className="font-sans text-xs text-ink-500">
                Bring up or halt the full stack with standard Docker lifecycle
                commands. No custom binary managers required.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Hardware & System Requirements */}
      <Section tone="white">
        <div className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Prerequisites"
            title="System & Hardware Requirements"
            description="Praise runs comfortably on standard commodity virtual machines and cloud instances."
          />

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-warm-50 text-ink-900">
                  <th className="py-3 px-4 font-semibold w-1/3">Requirement</th>
                  <th className="py-3 px-4 font-semibold">Specification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {requirements.map((row) => (
                  <tr key={row.spec} className="hover:bg-warm-50/50">
                    <td className="py-3 px-4 font-medium text-ink-900">
                      {row.spec}
                    </td>
                    <td className="py-3 px-4 text-ink-700 text-xs sm:text-sm">
                      {row.value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Backups, Updates & Data Portability */}
      <Section tone="muted">
        <div className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Operations"
            title="Backups, Maintenance & Data Portability"
            description="How to keep your self-hosted Praise deployment healthy, up to date, and completely portable."
          />

          <div className="grid gap-6 md:grid-cols-3">
            <div className="card flex flex-col gap-3">
              <span className="icon-tile">
                <FolderArchive size={18} />
              </span>
              <h3 className="heading-md">Database Backups</h3>
              <p className="muted text-xs leading-relaxed">
                Back up your structured data using standard PostgreSQL utility
                tools like <code>pg_dump</code>. You can automate nightly dumps
                with standard cron jobs or cloud storage backup scripts.
              </p>
            </div>

            <div className="card flex flex-col gap-3">
              <span className="icon-tile">
                <RefreshCw size={18} />
              </span>
              <h3 className="heading-md">Zero-Friction Updates</h3>
              <p className="muted text-xs leading-relaxed">
                Updating Praise takes standard Docker Compose workflows: pull
                the newest container image, and restart the service. Database
                migrations apply safely during startup.
              </p>
            </div>

            <div className="card flex flex-col gap-3">
              <span className="icon-tile">
                <HardDrive size={18} />
              </span>
              <h3 className="heading-md">100% Data Portability</h3>
              <p className="muted text-xs leading-relaxed">
                Nothing is locked in proprietary formats. Raw video files
                (WebM/MP4) remain accessible on your filesystem, and structured
                records can be exported to JSON or CSV at any moment.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Bottom CTA */}
      <Section tone="lavender">
        <div className="surface flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-10 sm:py-16">
          <span className="eyebrow">Deploy Praise</span>
          <h2 className="heading-lg max-w-2xl">
            Take full ownership of your customer social proof
          </h2>
          <p className="lead max-w-xl">
            Get your self-hosted instance running today. Follow our step-by-step
            guide to set up your domain and start collecting praise.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/get-started" variant="primary" size="lg">
              Get started guide
              <ArrowRight size={17} />
            </ButtonLink>
            <ButtonLink href="/open-source" variant="secondary" size="lg">
              Read open-source license
            </ButtonLink>
          </div>
        </div>
      </Section>
    </div>
  );
}
