import Link from "next/link";
import {
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { TableOfContents, type TocItem } from "@/components/docs/toc";
import { DocsPager } from "@/components/docs/pager";
import { CodeBlock } from "@/components/docs/code-block";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Getting Started Guide — Setup & First Testimonial",
  description:
    "Complete walkthrough for getting started with Praise: prerequisites, local development, environment configuration, creating forms, approving testimonials, and embedding widgets.",
  path: "/docs/getting-started",
});

const tocItems: TocItem[] = [
  { id: "what-is-praise", title: "What is Praise?" },
  { id: "prerequisites", title: "Prerequisites" },
  { id: "installation-overview", title: "Installation Overview" },
  { id: "local-development", title: "Local Development Setup" },
  { id: "environment-configuration", title: "Environment Configuration" },
  { id: "starting-the-application", title: "Starting the Application" },
  { id: "creating-a-workspace", title: "Creating a Workspace & Project" },
  { id: "creating-a-form", title: "Creating a Testimonial Form" },
  { id: "approving-testimonials", title: "Approving Testimonials" },
  { id: "publishing-a-widget", title: "Publishing a Widget" },
  { id: "common-problems", title: "Common Installation Problems" },
];

export default function GettingStartedDocsPage() {
  return (
    <div className="flex flex-col xl:flex-row xl:gap-10">
      <article className="flex-1 min-w-0">
        <Breadcrumbs
          crumbs={[
            { label: "Overview", href: "/docs" },
            { label: "Getting Started" },
          ]}
        />

        <div className="mb-8 border-b border-line pb-6">
          <span className="eyebrow mb-2">Quickstart</span>
          <h1 className="display text-3xl sm:text-4xl">Getting Started with Praise</h1>
          <p className="lead mt-3 text-base text-ink-600">
            This guide walks you through setting up Praise, launching your
            workspace, building your first customer collection form, moderating
            submissions, and publishing a responsive widget on your website.
          </p>
        </div>

        {/* 1. What is Praise */}
        <section id="what-is-praise" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">1. What is Praise?</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Praise is an open-source, self-hosted social proof management
            platform. It provides founders, marketing teams, and developers with
            a centralized place to collect customer testimonials in three formats
            (written text, webcam video, and audio voice notes).
          </p>
          <p className="muted text-sm leading-relaxed">
            All customer records, ratings, and media files remain on your
            servers. Praise lets you review and tag testimonials before they go
            live, then embed them via responsive widgets on any website.
          </p>
        </section>

        {/* 2. Prerequisites */}
        <section id="prerequisites" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">2. Prerequisites</h2>
          <p className="muted text-sm leading-relaxed mb-4">
            Before setting up Praise, make sure you have the following installed
            or available:
          </p>

          <div className="surface overflow-hidden divide-y divide-line text-xs">
            <div className="p-3.5 flex items-start gap-3">
              <span className="font-semibold text-ink-900 w-36 shrink-0">
                Node.js
              </span>
              <span className="text-ink-600">
                Node.js 20.x LTS or Node.js 22.x LTS (for local Next.js development)
              </span>
            </div>
            <div className="p-3.5 flex items-start gap-3">
              <span className="font-semibold text-ink-900 w-36 shrink-0">
                Package Manager
              </span>
              <span className="text-ink-600">
                <code>npm</code> (bundled with Node), <code>pnpm</code>, or <code>yarn</code>
              </span>
            </div>
            <div className="p-3.5 flex items-start gap-3">
              <span className="font-semibold text-ink-900 w-36 shrink-0">
                Docker & Compose
              </span>
              <span className="text-ink-600">
                Docker Engine 20.10+ and Docker Compose v2 (recommended for containerized deployment)
              </span>
            </div>
            <div className="p-3.5 flex items-start gap-3">
              <span className="font-semibold text-ink-900 w-36 shrink-0">
                System Resources
              </span>
              <span className="text-ink-600">
                Minimum 1 vCPU and 1 GB RAM (2 vCPU / 2-4 GB RAM recommended for video transcoding)
              </span>
            </div>
          </div>
        </section>

        {/* 3. Installation Overview */}
        <section id="installation-overview" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">3. Installation Overview</h2>
          <p className="muted text-sm leading-relaxed mb-4">
            Praise can be run in two primary ways:
          </p>
          <ul className="list-disc pl-5 text-sm text-ink-600 space-y-2 mb-4">
            <li>
              <strong>Local Development:</strong> Running the Next.js application
              directly with <code>npm run dev</code> for customizing forms,
              modifying widget styling, or contributing code.
            </li>
            <li>
              <strong>Docker Compose:</strong> Running the complete production
              stack (web application, PostgreSQL database, and persistent media
              volumes) on a remote server or local VM.
            </li>
          </ul>
        </section>

        {/* 4. Local Development Setup */}
        <section id="local-development" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">4. Local Development Setup</h2>
          <p className="muted text-sm leading-relaxed mb-4">
            To clone the codebase and start the Next.js development server
            locally, run:
          </p>

          <CodeBlock
            language="bash"
            filename="Terminal"
            code={`# 1. Clone the repository
git clone https://github.com/ossproject/praise.git
cd praise

# 2. Install dependencies
npm install`}
          />

          <p className="muted text-xs leading-relaxed mt-2">
            The dependencies include Next.js 16, React 19, Lucide React icons,
            and Tailwind CSS v4.
          </p>
        </section>

        {/* 5. Environment Configuration */}
        <section id="environment-configuration" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">5. Environment Configuration</h2>
          <p className="muted text-sm leading-relaxed mb-4">
            Praise requires a <code>.env</code> file in the project root to
            resolve canonical URLs, Open Graph sharing cards, sitemap URLs, and
            embed script hosts:
          </p>

          <CodeBlock
            language="bash"
            filename="Terminal"
            code={`# Copy the example environment file
cp .env.example .env`}
          />

          <p className="muted text-sm leading-relaxed mb-2">
            Inspect the <code>.env</code> file. For local testing, the default
            is:
          </p>

          <CodeBlock
            language="env"
            filename=".env"
            code={`# Absolute origin used for canonical URLs, widget embeds and sitemap.xml
NEXT_PUBLIC_SITE_URL=http://localhost:3000`}
          />

          <div className="surface border-amber-200 bg-amber-50/50 p-4 my-4 flex items-start gap-3 text-xs text-amber-900">
            <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <div>
              <strong>Important for Production:</strong> When deploying to a
              public server, replace <code>http://localhost:3000</code> with your
              real production origin (e.g. <code>https://praise.yourdomain.com</code>).
              Next.js reads this value at build time.
            </div>
          </div>
        </section>

        {/* 6. Starting the Application */}
        <section id="starting-the-application" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">6. Starting the Application</h2>
          <p className="muted text-sm leading-relaxed mb-4">
            To start the development server with live reloading:
          </p>

          <CodeBlock
            language="bash"
            filename="Terminal"
            code={`npm run dev`}
          />

          <p className="muted text-sm leading-relaxed mb-4">
            Open your browser and navigate to{" "}
            <code>http://localhost:3000</code>. You will see the Praise
            landing and product pages.
          </p>

          <p className="muted text-sm leading-relaxed">
            To test a production-grade build locally:
          </p>

          <CodeBlock
            language="bash"
            filename="Terminal"
            code={`# Build static production assets
npm run build

# Start the optimized Node server
npm start`}
          />
        </section>

        {/* 7. Creating a Workspace */}
        <section id="creating-a-workspace" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">7. Creating a Workspace &amp; Project</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            In Praise, a <strong>Workspace</strong> represents your organization
            or account boundary. Within a workspace, you can create one or
            multiple <strong>Projects</strong> (for example, &quot;Main SaaS App&quot;,
            &quot;Developer API&quot;, or &quot;Client Services&quot;).
          </p>
          <ol className="list-decimal pl-5 text-sm text-ink-600 space-y-2 mb-4">
            <li>
              <strong>Initial Admin Registration:</strong> On your first launch,
              set up your admin account with an email and password.
            </li>
            <li>
              <strong>Create Project:</strong> Give your project a recognizable
              name and upload your brand logo. This logo appears automatically on
              customer collection forms.
            </li>
          </ol>
        </section>

        {/* 8. Creating a Testimonial Form */}
        <section id="creating-a-form" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">8. Creating a Testimonial Form</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Collection forms are the public entry point for your customers. Each
            form generates a unique shareable link (e.g.{" "}
            <code>https://praise.yourdomain.com/collect/my-product</code>).
          </p>
          <div className="surface p-4 my-4 space-y-2 text-xs text-ink-700">
            <h4 className="font-semibold text-ink-900">Configurable Options:</h4>
            <ul className="list-disc pl-4 space-y-1 text-ink-600">
              <li>
                <strong>Accepted Formats:</strong> Toggle Text, Webcam Video,
                and Voice Notes according to your preference.
              </li>
              <li>
                <strong>Prompt Questions:</strong> Add custom prompts (e.g.
                &quot;What specific metric improved after using our software?&quot;).
              </li>
              <li>
                <strong>Star Ratings:</strong> Enable 1-to-5 star ratings alongside
                written feedback.
              </li>
              <li>
                <strong>Consent Notice:</strong> Specify your legal permission
                disclaimer for customer attribution.
              </li>
            </ul>
          </div>
        </section>

        {/* 9. Approving Testimonials */}
        <section id="approving-testimonials" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">9. Approving Testimonials</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            To prevent spam or unintended publication, all customer submissions
            arrive in your dashboard in <strong>Pending</strong> state:
          </p>
          <ol className="list-decimal pl-5 text-sm text-ink-600 space-y-2 mb-4">
            <li>
              Navigate to the <strong>Moderation Queue</strong>.
            </li>
            <li>
              Click on a submission to inspect the written quote, listen to the
              audio note, or watch the video with playback controls.
            </li>
            <li>
              Assign relevant tags (e.g. <code>#enterprise</code>,{" "}
              <code>#speed</code>, <code>#support</code>).
            </li>
            <li>
              Click <strong>Approve</strong>. Only approved testimonials become
              visible to public widgets.
            </li>
          </ol>
        </section>

        {/* 10. Publishing a Widget */}
        <section id="publishing-a-widget" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">10. Publishing a Widget</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Once testimonials are approved, generate an embed snippet to place on
            your website:
          </p>

          <CodeBlock
            language="html"
            filename="index.html"
            code={`<!-- Container element where the widget will mount -->
<div id="praise-widget"></div>

<!-- Lightweight Praise Embed Loader -->
<script
  src="http://localhost:3000/embed.js"
  data-container="#praise-widget"
  data-widget="grid"
  data-tag="homepage"
  async>
</script>`}
          />

          <p className="muted text-xs leading-relaxed mt-2">
            For deeper layout options (Carousel, Quote cards, Wall of Love) and
            CSS token customization, see the{" "}
            <Link href="/docs/widgets" className="link">
              Widgets Documentation
            </Link>
            .
          </p>
        </section>

        {/* 11. Common Installation Problems */}
        <section id="common-problems" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">
            11. Common Installation Problems
          </h2>

          <div className="space-y-4 my-4">
            <div className="surface p-4">
              <h4 className="text-xs font-semibold text-ink-900 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-600" />
                Problem: &quot;Failed to fetch font from Google Fonts&quot; during build
              </h4>
              <p className="muted text-xs mt-1 leading-relaxed">
                <strong>Cause:</strong> If your build environment operates in an
                offline or sandboxed container without direct internet access,
                Next.js cannot fetch Google Fonts at build time.
                <br />
                <strong>Fix:</strong> Ensure outbound HTTPS access to{" "}
                <code>fonts.googleapis.com</code> during <code>npm run build</code>,
                or use standard system fonts.
              </p>
            </div>

            <div className="surface p-4">
              <h4 className="text-xs font-semibold text-ink-900 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-600" />
                Problem: Port 3000 is already in use
              </h4>
              <p className="muted text-xs mt-1 leading-relaxed">
                <strong>Cause:</strong> Another application or previous Node
                process is binding to port 3000.
                <br />
                <strong>Fix:</strong> Start Next.js on an alternate port:{" "}
                <code>npx next dev -p 3001</code>, or stop the conflicting
                process.
              </p>
            </div>

            <div className="surface p-4">
              <h4 className="text-xs font-semibold text-ink-900 flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-600" />
                Problem: Video upload fails with HTTP 413 (Payload Too Large)
              </h4>
              <p className="muted text-xs mt-1 leading-relaxed">
                <strong>Cause:</strong> Your reverse proxy (such as Nginx or
                Cloudflare) has a default 1 MB or 2 MB request body limit.
                <br />
                <strong>Fix:</strong> In Nginx, set <code>client_max_body_size 100M;</code>{" "}
                in your server configuration block to permit high-definition
                video uploads.
              </p>
            </div>
          </div>
        </section>

        <DocsPager
          prev={{
            title: "Documentation Overview",
            href: "/docs",
          }}
          next={{
            title: "Production Deployment",
            href: "/docs/deployment",
          }}
        />
      </article>

      <TableOfContents items={tocItems} />
    </div>
  );
}
