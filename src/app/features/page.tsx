import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  Clock,
  Code2,
  FileSpreadsheet,
  Film,
  FolderSync,
  Grid3x3,
  Inbox,
  MessageSquareQuote,
  PlaySquare,
  Plug,
  Share2,
  ShieldAlert,
  Sparkles,
  Type,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge, type FeatureStatus } from "@/components/ui/status-badge";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Product Features & Release Roadmap",
  description:
    "Explore Praise features across Core, Complete, and Intelligence releases. Complete testimonial collection, moderation, widgets, video assets, and developer tools.",
  path: "/features",
});

type FeatureItem = {
  title: string;
  description: string;
  status: FeatureStatus;
  statusLabel?: string;
  icon: typeof Type;
  release: "Core" | "Complete" | "Intelligence";
  details: string[];
};

const allFeatures: FeatureItem[] = [
  // Core Release
  {
    title: "Multi-Format Testimonial Collection",
    description:
      "Gather customer praise in the format that best fits their preference: written text with star ratings, in-browser recorded video, or quick audio voice notes.",
    status: "available",
    statusLabel: "Available",
    icon: Type,
    release: "Core",
    details: [
      "Rich text responses with configurable minimum and maximum character limits",
      "One-click browser webcam and microphone recording without external plugins",
      "Audio-only voice note mode for camera-shy respondents",
      "Explicit permission check and customer consent attribution",
    ],
  },
  {
    title: "Customizable Collection Forms",
    description:
      "Build branded collection pages with customizable prompts, targeted questionnaire steps, and your brand's look and feel.",
    status: "available",
    statusLabel: "Available",
    icon: Inbox,
    release: "Core",
    details: [
      "Custom question prompts (e.g. 'What problem were you trying to solve?')",
      "Optional 1-to-5 star ratings paired directly with testimonials",
      "Customer profile fields: full name, job title, company name, and avatar upload",
      "Direct shareable URL for every form — send via email, chat, or onboarding flows",
    ],
  },
  {
    title: "Moderation Queue & Review Library",
    description:
      "Keep full editorial control over what appears publicly. Submissions land in a private moderation inbox until an admin or editor approves them.",
    status: "available",
    statusLabel: "Available",
    icon: ShieldAlert,
    release: "Core",
    details: [
      "Status lifecycle: Pending Review, Approved, Hidden, or Rejected",
      "Inline video and audio player for instant review inside the dashboard",
      "Tag taxonomy for segmenting by feature, customer persona, or plan tier",
      "Global search across submitter names, companies, and text content",
    ],
  },
  {
    title: "Responsive Website Widgets & Walls of Love",
    description:
      "Embed customer proof on landing pages, documentation, and pricing blocks using four layout modes styled with CSS variables.",
    status: "available",
    statusLabel: "Available",
    icon: Grid3x3,
    release: "Core",
    details: [
      "Grid layout: Multi-column card layout responsive across mobile and desktop",
      "Carousel layout: Horizontal slider for hero sections and limited space",
      "Single Quote cards: Focused pull quotes for pricing and feature cards",
      "Wall of Love: Dedicated full-page gallery displaying all approved testimonials",
    ],
  },
  {
    title: "Full Data Exports & Ownership",
    description:
      "Retain 100% control over your assets. Export your raw data whenever you wish without vendor gatekeeping or export fees.",
    status: "available",
    statusLabel: "Available",
    icon: FileSpreadsheet,
    release: "Core",
    details: [
      "Direct JSON export of all testimonial metadata, questions, and ratings",
      "CSV export for importing into business intelligence tools or spreadsheets",
      "Direct filesystem access to raw video (MP4/WebM) and audio files",
      "Native PostgreSQL database access without proprietary intermediate schemas",
    ],
  },

  // Complete Release
  {
    title: "Customer Invitation Sequences",
    description:
      "Automate testimonial requests by sending personalized invitations through transactional email triggers or CRM webhooks.",
    status: "planned",
    statusLabel: "Planned",
    icon: Share2,
    release: "Complete",
    details: [
      "Magic collection links tied to specific customer IDs",
      "Configurable reminder intervals for unsubmitted invites",
      "Webhook-triggered invites when customers reach milestones (e.g. 30 days active)",
      "Invitation delivery analytics: sent, opened, clicked, and completed",
    ],
  },
  {
    title: "Multi-Platform Social Imports",
    description:
      "Import praise your brand has already earned across social media and public review directories into your centralized library.",
    status: "planned",
    statusLabel: "Planned",
    icon: FolderSync,
    release: "Complete",
    details: [
      "X (Twitter) tweet importer via public tweet URLs",
      "LinkedIn post and recommendation quote ingestion",
      "App Store & Google Play store review sync",
      "CSV bulk importer for legacy testimonial spreadsheets",
    ],
  },
  {
    title: "Video Trimming & Studio Polish",
    description:
      "Edit and refine video testimonials without opening heavy video editing suites. Clean up pauses and add brand touches.",
    status: "planned",
    statusLabel: "Planned",
    icon: Film,
    release: "Complete",
    details: [
      "In-browser start and end trim markers to clip dead air or restarts",
      "Auto-generated synchronized subtitles and captions (WebVTT)",
      "Custom brand watermarks, intro title cards, and logo overlays",
      "Optimized video transcoding for rapid mobile web playback",
    ],
  },
  {
    title: "Social Share Asset Generator",
    description:
      "Transform written quotes and video clips into styled graphics optimized for LinkedIn, X, Instagram, and slide presentations.",
    status: "planned",
    statusLabel: "Planned",
    icon: PlaySquare,
    release: "Complete",
    details: [
      "Square (1:1) and vertical (9:16) image export presets",
      "Dark mode and light mode templates matching your color palette",
      "Animated audiogram video clips for audio voice notes",
      "One-click PNG and MP4 asset downloads for marketing campaigns",
    ],
  },
  {
    title: "Interactive Case Study Builder",
    description:
      "Turn deep testimonial answers and metrics into structured mini case studies suitable for sales collateral and blog posts.",
    status: "planned",
    statusLabel: "Planned",
    icon: MessageSquareQuote,
    release: "Complete",
    details: [
      "Structured templates: Problem, Solution, and Measurable Outcomes",
      "Highlight pull quotes with company logo and metrics chips",
      "Exportable as clean markdown, static HTML, or standalone landing pages",
      "Deep links connecting case studies back to the verified video proof",
    ],
  },
  {
    title: "Analytics & Customer Insights",
    description:
      "Measure the direct impact of your customer proof and identify which testimonials drive the most engagement.",
    status: "planned",
    statusLabel: "Planned",
    icon: BarChart3,
    release: "Complete",
    details: [
      "Widget impression counts, video play counts, and watch duration",
      "Click-through tracking on CTA links embedded in widgets",
      "Sentiment breakdown across star ratings and question categories",
      "Privacy-first tracking with zero third-party telemetry cookies",
    ],
  },

  // Intelligence Release
  {
    title: "Model Context Protocol (MCP) Server",
    description:
      "Expose your approved testimonial database to local AI assistants and agents using the open Model Context Protocol standard.",
    status: "planned",
    statusLabel: "Planned",
    icon: Plug,
    release: "Intelligence",
    details: [
      "Local MCP endpoint compatible with Claude Desktop, Cursor, and Antigravity",
      "Semantic search by topic: query testimonials matching specific customer objections",
      "Read-only enforcement: AI tools can never alter or leak unapproved drafts",
      "Filter by customer segment, sentiment, and product tags directly via prompts",
    ],
  },
  {
    title: "AI Quote Extraction & Transcript Search",
    description:
      "Automatically transcribe audio and video submissions and let AI identify high-converting soundbites and pull quotes.",
    status: "planned",
    statusLabel: "Planned",
    icon: Sparkles,
    release: "Intelligence",
    details: [
      "High-accuracy automated speech-to-text transcription",
      "Automatic detection of high-impact punchy quotes (1-2 sentences)",
      "Full-text search inside video transcripts to jump to exact timestamped words",
      "Multi-language translation and localization for international customer feedback",
    ],
  },
  {
    title: "AI Landing Page Assistant",
    description:
      "Ask your AI assistant to recommend the ideal testimonials for specific landing pages, feature blocks, or sales email drafts.",
    status: "planned",
    statusLabel: "Planned",
    icon: Bot,
    release: "Intelligence",
    details: [
      "Context-aware recommendations: matching quotes to your page's target audience",
      "Automated draft case study generation based on transcript details",
      "Detection of trending feature requests and common customer praise points",
      "Planned ChatGPT App / GPT action connector for team workspaces",
    ],
  },
  {
    title: "Developer Platform: REST API, Webhooks & SDKs",
    description:
      "Full programmable access to ingest, query, and synchronize testimonials across any custom frontend, CMS, or data warehouse.",
    status: "in-development",
    statusLabel: "In development",
    icon: Code2,
    release: "Complete",
    details: [
      "REST JSON API for reading approved testimonials and submitting new entries",
      "Real-time HTTP webhooks fired on submission, approval, or deletion",
      "Lightweight headless JavaScript embed without third-party runtime bloat",
      "Planned React & Next.js native SDKs with server-component prefetching",
    ],
  },
];

export default function FeaturesPage() {
  const coreFeatures = allFeatures.filter((f) => f.release === "Core");
  const completeFeatures = allFeatures.filter((f) => f.release === "Complete");
  const intelligenceFeatures = allFeatures.filter(
    (f) => f.release === "Intelligence",
  );

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-line bg-warm-50 py-16 sm:py-20 lg:py-24">
        <Container className="flex flex-col items-center text-center">
          <span className="eyebrow">Product Capabilities</span>
          <h1 className="display mt-4 max-w-3xl">
            Everything you need to collect, organize, and showcase customer praise
          </h1>
          <p className="lead mt-4 max-w-2xl">
            A complete testimonial platform engineered for data sovereignty.
            Review our release roadmap to see what is shipping today, what is
            under active development, and what is planned next.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/dashboard" variant="primary" size="lg">
              Get started with Praise
              <ArrowRight size={16} />
            </ButtonLink>
            <ButtonLink href="/how-it-works" variant="secondary" size="lg">
              See how it works
            </ButtonLink>
          </div>

          {/* Quick Stats / Release Anchors */}
          <div className="mt-12 flex flex-wrap justify-center gap-2 sm:gap-4">
            <a
              href="#core"
              className="chip border-emerald-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-emerald-400"
            >
              <CheckCircle2 size={13} className="text-emerald-600" />
              Core Release (Available)
            </a>
            <a
              href="#complete"
              className="chip border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-amber-400"
            >
              <Clock size={13} className="text-amber-600" />
              Complete Release (In Development)
            </a>
            <a
              href="#intelligence"
              className="chip border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-brand-400"
            >
              <Sparkles size={13} className="text-brand-600" />
              Intelligence Release (Planned)
            </a>
          </div>
        </Container>
      </section>

      {/* 1. Core Release */}
      <Section id="core" tone="white">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-line pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="tag">Release 1.0</span>
                <StatusBadge status="available" label="Core Release" />
              </div>
              <h2 className="heading-lg mt-2">Core Collection & Publishing</h2>
              <p className="lead mt-1 max-w-2xl">
                The production foundation: multi-format collection forms,
                editorial moderation, responsive embed widgets, and unrestricted
                data ownership.
              </p>
            </div>
            <Link href="/self-host" className="link text-sm whitespace-nowrap">
              Deploy core release &rarr;
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {coreFeatures.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </Section>

      {/* 2. Complete Release */}
      <Section id="complete" tone="muted">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-line pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="tag">Release 2.0</span>
                <StatusBadge status="in-development" label="In Development" />
              </div>
              <h2 className="heading-lg mt-2">Complete Marketing & Automation</h2>
              <p className="lead mt-1 max-w-2xl">
                Extended distribution workflows: automated invitation emails,
                social network quote imports, in-browser video trimming, and
                social graphic assets.
              </p>
            </div>
            <Link href="/developers" className="link text-sm whitespace-nowrap">
              Review developer specs &rarr;
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {completeFeatures.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </Section>

      {/* 3. Intelligence Release */}
      <Section id="intelligence" tone="white">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 border-b border-line pb-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="tag">Release 3.0</span>
                <StatusBadge status="planned" label="Intelligence Roadmap" />
              </div>
              <h2 className="heading-lg mt-2">AI Integrations & Assistant MCP</h2>
              <p className="lead mt-1 max-w-2xl">
                Semantic understanding for your testimonial library: local Model
                Context Protocol (MCP) server, speech transcripts, and prompt-driven
                quote discovery for Claude and ChatGPT.
              </p>
            </div>
            <Link href="/ai-integrations" className="link text-sm whitespace-nowrap">
              Explore AI integrations &rarr;
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {intelligenceFeatures.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </Section>

      {/* Bottom CTA */}
      <Section id="features-cta" tone="lavender">
        <div className="surface flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-10 sm:py-16">
          <span className="eyebrow">Ready to begin?</span>
          <h2 className="heading-lg max-w-2xl">
            Start gathering genuine customer proof today
          </h2>
          <p className="lead max-w-xl">
            Praise is free software that runs on your infrastructure. Bring up
            the Docker container and start collecting text, video, and audio in
            minutes.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/dashboard" variant="primary" size="lg">
              Get started now
              <ArrowRight size={17} />
            </ButtonLink>
            <ButtonLink href="/open-source" variant="secondary" size="lg">
              Read open-source pledge
            </ButtonLink>
          </div>
        </div>
      </Section>
    </div>
  );
}

function FeatureCard({ feature }: { feature: FeatureItem }) {
  const Icon = feature.icon;
  return (
    <article className="card flex flex-col justify-between gap-5 transition-colors hover:border-brand-200">
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <span className="icon-tile">
            <Icon size={18} />
          </span>
          <StatusBadge
            status={feature.status}
            label={feature.statusLabel}
          />
        </div>
        <h3 className="heading-md">{feature.title}</h3>
        <p className="muted">{feature.description}</p>
      </div>

      <div className="border-t border-line/60 pt-4">
        <ul className="flex flex-col gap-2">
          {feature.details.map((detail) => (
            <li
              key={detail}
              className="flex items-start gap-2 text-xs leading-relaxed text-ink-700"
            >
              <CheckCircle2
                size={13}
                className="mt-0.5 shrink-0 text-brand-600"
                aria-hidden="true"
              />
              <span>{detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
