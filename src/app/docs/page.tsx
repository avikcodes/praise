import Link from "next/link";
import {
  Code2,
  HardDrive,
  LayoutGrid,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { TableOfContents, type TocItem } from "@/components/docs/toc";
import { DocsPager } from "@/components/docs/pager";
import { CodeBlock } from "@/components/docs/code-block";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Documentation Overview",
  description:
    "Official documentation for Praise: a free, open-source, self-hosted testimonial platform. Guides for installation, widgets, REST API, and production deployment.",
  path: "/docs",
});

const tocItems: TocItem[] = [
  { id: "what-is-praise", title: "What is Praise?" },
  { id: "documentation-sections", title: "Documentation Sections" },
  { id: "quickstart-preview", title: "Quickstart Preview" },
  { id: "core-principles", title: "Core Architectural Principles" },
];

export default function DocsHomePage() {
  return (
    <div className="flex flex-col xl:flex-row xl:gap-10">
      <article className="flex-1 min-w-0">
        <Breadcrumbs crumbs={[{ label: "Overview" }]} />

        <div className="mb-8 border-b border-line pb-6">
          <span className="eyebrow mb-2">Documentation</span>
          <h1 className="display text-3xl sm:text-4xl">Praise Documentation</h1>
          <p className="lead mt-3 text-base text-ink-600">
            Welcome to the official Praise technical documentation. Praise is a
            free, open-source, self-hosted platform engineered to collect text,
            video, and audio testimonials, organize customer proof, and publish
            high-converting widgets on your website.
          </p>
        </div>

        {/* Section 1: What is Praise */}
        <section id="what-is-praise" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">What is Praise?</h2>
          <p className="muted text-sm leading-relaxed mb-4">
            Most testimonial platforms are closed proprietary SaaS services that
            charge monthly subscriptions, impose artificial caps on video
            storage, inject third-party trackers, and hold customer reviews
            behind vendor paywalls.
          </p>
          <p className="muted text-sm leading-relaxed mb-4">
            Praise provides a self-hosted alternative: you deploy the application
            on your own infrastructure with Docker Compose, store customer media
            on your own filesystem volumes or private object buckets, and publish
            responsive widgets using standard script embeds or React components.
          </p>

          <div className="grid gap-4 sm:grid-cols-3 my-6">
            <div className="surface p-4">
              <span className="text-xs font-semibold text-brand-700 block mb-1">
                Multi-Format
              </span>
              <p className="text-xs text-ink-600">
                Collect text with star ratings, in-browser webcam videos, and
                audio voice notes in one form.
              </p>
            </div>
            <div className="surface p-4">
              <span className="text-xs font-semibold text-brand-700 block mb-1">
                Editorial Control
              </span>
              <p className="text-xs text-ink-600">
                Submissions remain private until approved. Organize your archive
                using flexible tag taxonomies.
              </p>
            </div>
            <div className="surface p-4">
              <span className="text-xs font-semibold text-brand-700 block mb-1">
                Embeddable Proof
              </span>
              <p className="text-xs text-ink-600">
                Publish via responsive Grids, Carousels, single Quote cards, or a
                full Wall of Love.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Documentation Sections */}
        <section id="documentation-sections" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">Documentation Sections</h2>
          <p className="muted text-sm leading-relaxed mb-6">
            Explore our comprehensive guides and technical references based on
            what you are building today:
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Getting Started Card */}
            <Link
              href="/docs/getting-started"
              className="card group flex flex-col justify-between gap-3 p-5 transition-colors hover:border-brand-200"
            >
              <div>
                <span className="icon-tile mb-2">
                  <Rocket size={18} />
                </span>
                <h3 className="text-base font-semibold text-ink-900 group-hover:text-brand-700">
                  Getting Started &rarr;
                </h3>
                <p className="muted text-xs mt-1 leading-relaxed">
                  Local development setup, environment variables, launching your
                  first workspace, creating collection forms, and publishing
                  widgets.
                </p>
              </div>
              <span className="text-xs font-medium text-brand-600">
                Read quickstart &rarr;
              </span>
            </Link>

            {/* Deployment Card */}
            <Link
              href="/docs/deployment"
              className="card group flex flex-col justify-between gap-3 p-5 transition-colors hover:border-brand-200"
            >
              <div>
                <span className="icon-tile mb-2">
                  <HardDrive size={18} />
                </span>
                <h3 className="text-base font-semibold text-ink-900 group-hover:text-brand-700">
                  Production Deployment &rarr;
                </h3>
                <p className="muted text-xs mt-1 leading-relaxed">
                  System requirements, Docker Compose stack, PostgreSQL setup,
                  reverse proxy with HTTPS, volume backups, and recovery.
                </p>
              </div>
              <span className="text-xs font-medium text-brand-600">
                Read deployment guide &rarr;
              </span>
            </Link>

            {/* Widgets Card */}
            <Link
              href="/docs/widgets"
              className="card group flex flex-col justify-between gap-3 p-5 transition-colors hover:border-brand-200"
            >
              <div>
                <span className="icon-tile mb-2">
                  <LayoutGrid size={18} />
                </span>
                <h3 className="text-base font-semibold text-ink-900 group-hover:text-brand-700">
                  Widgets & Embedding &rarr;
                </h3>
                <p className="muted text-xs mt-1 leading-relaxed">
                  Available layouts (Grid, Carousel, Quote cards, Wall of Love),
                  CSS token customization, and React/Next.js integration.
                </p>
              </div>
              <span className="text-xs font-medium text-brand-600">
                Explore widget layouts &rarr;
              </span>
            </Link>

            {/* API Reference Card */}
            <Link
              href="/docs/api-reference"
              className="card group flex flex-col justify-between gap-3 p-5 transition-colors hover:border-brand-200"
            >
              <div>
                <span className="icon-tile mb-2">
                  <Code2 size={18} />
                </span>
                <h3 className="text-base font-semibold text-ink-900 group-hover:text-brand-700">
                  REST API Reference &rarr;
                </h3>
                <p className="muted text-xs mt-1 leading-relaxed">
                  Authentication, endpoints for testimonials, projects, and
                  forms, query pagination, filtering, and event webhooks.
                </p>
              </div>
              <span className="text-xs font-medium text-brand-600">
                Review API specifications &rarr;
              </span>
            </Link>
          </div>
        </section>

        {/* Section 3: Quickstart Preview */}
        <section id="quickstart-preview" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">Quickstart Preview</h2>
          <p className="muted text-sm leading-relaxed mb-4">
            Deploying a basic Praise instance requires only Docker and Docker
            Compose. You configure your site URL and run one command:
          </p>

          <CodeBlock
            language="bash"
            filename="Terminal"
            code={`# Clone the repository
git clone https://github.com/ossproject/praise.git
cd praise

# Set your public site URL
cp .env.example .env

# Launch the container stack
docker compose up -d`}
          />

          <p className="muted text-xs leading-relaxed mt-2">
            Once started, open <code>http://localhost:3000</code> (or your
            configured domain) to create your initial administrator account.
            For full local setup details, proceed to the{" "}
            <Link href="/docs/getting-started" className="link">
              Getting Started guide
            </Link>
            .
          </p>
        </section>

        {/* Section 4: Architectural Principles */}
        <section id="core-principles" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">
            Core Architectural Principles
          </h2>
          <div className="surface p-5 space-y-4 text-xs text-ink-700 leading-relaxed">
            <div className="flex items-start gap-3">
              <ShieldCheck size={16} className="text-brand-600 mt-0.5 shrink-0" />
              <div>
                <strong className="text-ink-900">Zero Telemetry:</strong> Praise
                does not transmit customer feedback, usage metrics, or video
                recordings to external telemetry aggregators.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck size={16} className="text-brand-600 mt-0.5 shrink-0" />
              <div>
                <strong className="text-ink-900">Standard Formats:</strong> Data
                is saved in PostgreSQL and standard media formats (MP4, WebM,
                WAV) on disk. You are never trapped in a proprietary schema.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck size={16} className="text-brand-600 mt-0.5 shrink-0" />
              <div>
                <strong className="text-ink-900">No Artificial Paywalls:</strong>{" "}
                All capabilities—from custom branding and widget embed options to
                video storage—remain accessible without tier upgrades.
              </div>
            </div>
          </div>
        </section>

        <DocsPager
          next={{
            title: "Getting Started Guide",
            href: "/docs/getting-started",
          }}
        />
      </article>

      <TableOfContents items={tocItems} />
    </div>
  );
}
