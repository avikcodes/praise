import {
  ArrowRight,
  Box,
  CheckCircle2,
  Code2,
  Palette,
  Plug,
  Server,
  Webhook,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Developer Platform — API, Webhooks & SDKs",
  description:
    "Technical documentation and specifications for Praise: REST API, JavaScript embed snippets, planned React and Next.js SDKs, webhooks, and widget CSS customization.",
  path: "/developers",
});

export default function DevelopersPage() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-line bg-warm-50 py-16 sm:py-20 lg:py-24">
        <Container className="flex flex-col items-center text-center">
          <span className="eyebrow">Developer Platform</span>
          <h1 className="display mt-4 max-w-3xl">
            Integrate customer proof into any web stack or application
          </h1>
          <p className="lead mt-4 max-w-2xl">
            Praise is built to be driven from outside its own dashboard: drop in
            embed snippets, hook into event webhooks, or query the REST API.
            Review our implementation status and specifications below.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/dashboard" variant="primary" size="lg">
              Get started with Praise
              <ArrowRight size={16} />
            </ButtonLink>
            <ButtonLink href="/ai-integrations" variant="secondary" size="lg">
              Explore AI & MCP server
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Surface Status Overview */}
      <Section tone="white" className="py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SurfaceCard
            icon={Code2}
            title="JavaScript Embed"
            status="in-development"
            statusLabel="In development"
            description="A lightweight vanilla script tag that injects responsive widget iframes or web components into any static site, WordPress, or custom CMS."
          />
          <SurfaceCard
            icon={Palette}
            title="Widget Customization"
            status="available"
            statusLabel="Available"
            description="Full CSS variable override support for themes, typography, border radius, and dark/light surface tokens."
          />
          <SurfaceCard
            icon={Server}
            title="REST API"
            status="planned"
            statusLabel="Planned Specification"
            description="JSON REST endpoints for querying approved testimonials, creating new collection entries, and fetching widget configuration."
          />
          <SurfaceCard
            icon={Webhook}
            title="Webhooks"
            status="planned"
            statusLabel="Planned Specification"
            description="Outgoing HTTP POST payloads dispatched when new testimonials are submitted, approved, or rejected."
          />
          <SurfaceCard
            icon={Box}
            title="React & Next.js SDKs"
            status="planned"
            statusLabel="Planned"
            description="Native React components with zero runtime client-side flash and first-class Next.js Server Component support."
          />
          <SurfaceCard
            icon={Plug}
            title="Model Context Protocol"
            status="planned"
            statusLabel="Planned"
            description="Local MCP server exposing semantic queries to Cursor, Claude Desktop, and Antigravity."
          />
        </div>
      </Section>

      {/* 1. JavaScript Embed Snippet (Current Implementation Pattern) */}
      <Section id="widgets" tone="muted">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="tag">Embed</span>
              <StatusBadge status="in-development" label="In development" />
            </div>
            <h2 className="heading-lg">Lightweight JavaScript Embed</h2>
            <p className="lead">
              The embed snippet allows you to drop any approved testimonial
              widget onto any webpage with a single <code>&lt;script&gt;</code> tag.
              No bundlers, React runtimes, or npm dependencies are required.
            </p>

            <div className="flex flex-col gap-3 text-sm text-ink-700">
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 text-brand-600 shrink-0" />
                <span>Zero framework dependencies; works on HTML, Webflow, Shopify, Hugo, Astro, and WordPress.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 text-brand-600 shrink-0" />
                <span>Automatic iframe resizing or Shadow DOM isolation to prevent CSS pollution.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 size={16} className="mt-0.5 text-brand-600 shrink-0" />
                <span>Filter by tag attribute (e.g. <code>data-tag=&quot;pricing&quot;</code>) directly in HTML.</span>
              </div>
            </div>
          </div>

          <div className="surface overflow-hidden shadow-sm">
            <div className="border-b border-line bg-warm-50 px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-900">
                HTML Embed Example
              </span>
              <span className="chip text-[11px]">Static Script</span>
            </div>
            <div className="p-5 font-mono text-xs leading-relaxed overflow-x-auto bg-[#1b1a18] text-[#f6f4ef] rounded-b-2xl">
              <span className="text-ink-400">&lt;!-- Drop where widget should render --&gt;</span>
              <br />
              <span className="text-purple-300">&lt;div</span>{" "}
              <span className="text-amber-300">id</span>=
              <span className="text-emerald-300">&quot;praise-wall&quot;</span>
              <span className="text-purple-300">&gt;&lt;/div&gt;</span>
              <br /><br />
              <span className="text-ink-400">&lt;!-- Async script loader --&gt;</span>
              <br />
              <span className="text-purple-300">&lt;script</span>
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">src</span>=
              <span className="text-emerald-300">
                &quot;https://praise.yourdomain.com/embed.js&quot;
              </span>
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">data-container</span>=
              <span className="text-emerald-300">&quot;#praise-wall&quot;</span>
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">data-widget</span>=
              <span className="text-emerald-300">&quot;grid&quot;</span>
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">data-tag</span>=
              <span className="text-emerald-300">&quot;homepage&quot;</span>
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">data-theme</span>=
              <span className="text-emerald-300">&quot;light&quot;</span>
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">async</span>
              <br />
              <span className="text-purple-300">&gt;&lt;/script&gt;</span>
            </div>
          </div>
        </div>
      </Section>

      {/* 2. Widget Customization with CSS Tokens */}
      <Section tone="white">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="surface overflow-hidden shadow-sm order-2 lg:order-1">
            <div className="border-b border-line bg-warm-50 px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-900">
                CSS Token Overrides
              </span>
              <span className="chip text-[11px]">Design System</span>
            </div>
            <div className="p-5 font-mono text-xs leading-relaxed overflow-x-auto bg-[#1b1a18] text-[#f6f4ef] rounded-b-2xl">
              <span className="text-ink-400">{"/* Customize widget to match your site */"}</span>
              <br />
              <span className="text-purple-300">:root</span> &#123;
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">--praise-bg</span>:{" "}
              <span className="text-emerald-300">#ffffff</span>;
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">--praise-border</span>:{" "}
              <span className="text-emerald-300">#e7e3da</span>;
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">--praise-text-primary</span>:{" "}
              <span className="text-emerald-300">#1b1a18</span>;
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">--praise-accent</span>:{" "}
              <span className="text-emerald-300">#7049d8</span>;
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">--praise-radius</span>:{" "}
              <span className="text-emerald-300">1rem</span>;
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">--praise-font-family</span>:{" "}
              <span className="text-emerald-300">system-ui, sans-serif</span>;
              <br />
              &#125;
            </div>
          </div>

          <div className="flex flex-col gap-6 order-1 lg:order-2">
            <div className="flex items-center gap-2">
              <span className="tag">Styling</span>
              <StatusBadge status="available" label="Available" />
            </div>
            <h2 className="heading-lg">Widget Customization & Tokens</h2>
            <p className="lead">
              Praise widgets never clash with your website branding. Every
              element exposes CSS custom property hooks so you can align
              colors, border radii, shadows, and fonts with your existing design system.
            </p>
            <div className="flex flex-col gap-3 text-sm text-ink-700">
              <p>
                Widgets support both inline light/dark mode auto-detection and
                manual class overrides. With zero external fonts forced by
                default, widgets render fast and inherit your typographic scale.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* 3. REST API Specification (Planned) */}
      <Section tone="muted">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="tag">REST API</span>
                <StatusBadge status="planned" label="Planned Specification" />
              </div>
              <h2 className="heading-lg mt-2">REST API Architecture</h2>
              <p className="lead mt-1 max-w-2xl">
                The Praise backend is architected around predictable REST
                endpoints over HTTPS, authenticated with bearer API tokens.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Endpoint 1 */}
            <div className="card flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="chip font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 border-emerald-200">
                  GET
                </span>
                <code className="text-xs font-semibold text-ink-900">
                  /api/v1/testimonials
                </code>
              </div>
              <p className="muted text-xs">
                Fetch a paginated list of approved testimonials. Supports filtering
                by <code>tag</code>, <code>format</code> (text, video, audio),
                and <code>rating</code>.
              </p>
              <div className="mt-2 rounded-lg bg-warm-50 p-3 font-mono text-[11px] text-ink-700">
                <span className="text-ink-400">{"// Query parameters"}</span>
                <br />
                ?tag=enterprise&amp;format=video&amp;limit=10
              </div>
            </div>

            {/* Endpoint 2 */}
            <div className="card flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="chip font-mono text-[11px] font-bold text-brand-700 bg-brand-50 border-brand-200">
                  POST
                </span>
                <code className="text-xs font-semibold text-ink-900">
                  /api/v1/testimonials
                </code>
              </div>
              <p className="muted text-xs">
                Programmatically ingest a new testimonial from your custom app
                or native mobile client. Submissions enter the queue as
                &apos;pending&apos;.
              </p>
              <div className="mt-2 rounded-lg bg-warm-50 p-3 font-mono text-[11px] text-ink-700">
                <span className="text-ink-400">{"// Accepts multipart/form-data"}</span>
                <br />
                &#123; &quot;name&quot;: &quot;Alex&quot;, &quot;rating&quot;: 5, &quot;text&quot;: &quot;...&quot; &#125;
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* 4. Webhooks Specification (Planned) */}
      <Section tone="white">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="tag">Webhooks</span>
              <StatusBadge status="planned" label="Planned Specification" />
            </div>
            <h2 className="heading-lg">Event Webhooks</h2>
            <p className="lead">
              Connect Praise to your internal pipelines. Praise sends signed
              JSON payloads to your configured HTTP endpoint when key lifecycle
              events occur.
            </p>

            <div className="flex flex-col gap-3 text-sm text-ink-700">
              <div className="surface p-3 text-xs">
                <code className="font-semibold text-brand-700">testimonial.created</code>
                <p className="muted mt-1">Dispatched immediately when a customer submits feedback.</p>
              </div>
              <div className="surface p-3 text-xs">
                <code className="font-semibold text-brand-700">testimonial.approved</code>
                <p className="muted mt-1">Dispatched when a moderator marks a submission as approved.</p>
              </div>
              <div className="surface p-3 text-xs">
                <code className="font-semibold text-brand-700">testimonial.deleted</code>
                <p className="muted mt-1">Dispatched when an entry is purged for GDPR / customer consent.</p>
              </div>
            </div>
          </div>

          <div className="surface overflow-hidden shadow-sm">
            <div className="border-b border-line bg-warm-50 px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-900">
                Webhook Payload Preview
              </span>
              <span className="chip text-[11px]">JSON Event</span>
            </div>
            <div className="p-5 font-mono text-xs leading-relaxed overflow-x-auto bg-[#1b1a18] text-[#f6f4ef] rounded-b-2xl">
              &#123;
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">&quot;event&quot;</span>:{" "}
              <span className="text-emerald-300">&quot;testimonial.approved&quot;</span>,
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">&quot;id&quot;</span>:{" "}
              <span className="text-emerald-300">&quot;tst_98a7df12&quot;</span>,
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">&quot;format&quot;</span>:{" "}
              <span className="text-emerald-300">&quot;video&quot;</span>,
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">&quot;customer&quot;</span>: &#123;
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-amber-300">&quot;name&quot;</span>:{" "}
              <span className="text-emerald-300">&quot;Sarah Jenkins&quot;</span>,
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-amber-300">&quot;company&quot;</span>:{" "}
              <span className="text-emerald-300">&quot;ScaleFlow&quot;</span>
              <br />
              &nbsp;&nbsp;&#125;,
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">&quot;rating&quot;</span>:{" "}
              <span className="text-purple-300">5</span>,
              <br />
              &nbsp;&nbsp;<span className="text-amber-300">&quot;tags&quot;</span>: [
              <span className="text-emerald-300">&quot;enterprise&quot;</span>,{" "}
              <span className="text-emerald-300">&quot;support&quot;</span>]
              <br />
              &#125;
            </div>
          </div>
        </div>
      </Section>

      {/* 5. React & Next.js SDKs (Planned) */}
      <Section tone="muted">
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <span className="tag">Native SDKs</span>
            <StatusBadge status="planned" label="Planned" />
          </div>
          <h2 className="heading-lg">React & Next.js SDKs</h2>
          <p className="lead max-w-2xl">
            Planned typed component libraries will allow React and Next.js
            developers to render praise widgets with zero client bundle overhead
            using React Server Components (RSC).
          </p>

          <div className="surface p-5 text-sm text-ink-700 max-w-2xl">
            <p>
              The Next.js SDK is planned to support both server-rendered HTML for
              optimal Core Web Vitals and SEO, alongside interactive hydration
              for video playback and carousel navigation. Check the Praise
              repository for release announcements.
            </p>
          </div>
        </div>
      </Section>

      {/* Bottom CTA */}
      <Section tone="lavender">
        <div className="surface flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-10 sm:py-16">
          <span className="eyebrow">Build with Praise</span>
          <h2 className="heading-lg max-w-2xl">
            Bring customer proof into your product stack
          </h2>
          <p className="lead max-w-xl">
            Deploy your self-hosted Praise instance and start integrating via
            embeds and APIs today.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/dashboard" variant="primary" size="lg">
              Get started with Praise
              <ArrowRight size={17} />
            </ButtonLink>
            <ButtonLink href="/self-host" variant="secondary" size="lg">
              Deployment guide
            </ButtonLink>
          </div>
        </div>
      </Section>
    </div>
  );
}

function SurfaceCard({
  icon: Icon,
  title,
  status,
  statusLabel,
  description,
}: {
  icon: typeof Code2;
  title: string;
  status: "available" | "in-development" | "planned";
  statusLabel: string;
  description: string;
}) {
  return (
    <div className="card flex flex-col justify-between gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <span className="icon-tile">
            <Icon size={18} />
          </span>
          <StatusBadge status={status} label={statusLabel} />
        </div>
        <h3 className="heading-md">{title}</h3>
        <p className="muted text-xs">{description}</p>
      </div>
    </div>
  );
}
