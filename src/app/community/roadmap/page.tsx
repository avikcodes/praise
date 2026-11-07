import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Clock,
  MessageSquare,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import { DISCUSSIONS_URL, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Praise Product Roadmap — Core, Complete & Intelligence",
  description:
    "Follow the Praise product roadmap across Version 1 (Core), Version 2 (Complete), and Version 3 (Intelligence) with accurate development status labels.",
  path: "/community/roadmap",
});

type RoadmapItem = {
  title: string;
  description: string;
  status: "completed" | "in-progress" | "planned";
  tag?: string;
};

type ReleaseMilestone = {
  version: string;
  name: string;
  summary: string;
  status: "In progress" | "Planned" | "Foundation Completed";
  items: RoadmapItem[];
};

const roadmapMilestones: ReleaseMilestone[] = [
  {
    version: "Version 1",
    name: "Praise Core",
    summary:
      "The self-hosted foundation for collecting multi-format feedback, managing submissions, and publishing website proof.",
    status: "In progress",
    items: [
      {
        title: "Multi-Format Collection Forms",
        description:
          "Capture written reviews, in-browser webcam videos, and audio voice notes with custom questionnaire prompts.",
        status: "completed",
        tag: "Collection",
      },
      {
        title: "Moderation Queue & Inbox",
        description:
          "Private review dashboard with approve, reject, and hide actions to prevent unauthorized publishing.",
        status: "completed",
        tag: "Management",
      },
      {
        title: "Centralized Testimonial Library",
        description:
          "Tag taxonomy, keyword search, and format filters across all approved customer submissions.",
        status: "completed",
        tag: "Management",
      },
      {
        title: "Basic Embed Widgets",
        description:
          "Responsive Grid, horizontal Carousel, and single Quote Card layouts with CSS token override support.",
        status: "in-progress",
        tag: "Publishing",
      },
      {
        title: "Dedicated Wall of Love",
        description:
          "Full-page standalone proof gallery showcasing approved customer reviews with topic filtering.",
        status: "in-progress",
        tag: "Publishing",
      },
      {
        title: "Direct Data Exports",
        description:
          "Export testimonial metadata and star ratings directly to standard JSON and CSV files without paywalls.",
        status: "completed",
        tag: "Portability",
      },
      {
        title: "Docker Compose Self-Hosting",
        description:
          "Production container stack with PostgreSQL database, persistent media storage volumes, and reverse proxy support.",
        status: "in-progress",
        tag: "Infrastructure",
      },
    ],
  },
  {
    version: "Version 2",
    name: "Praise Complete",
    summary:
      "Extended distribution workflows, automated requests, developer APIs, social network imports, and developer SDKs.",
    status: "Planned",
    items: [
      {
        title: "Advanced Video & Audio Workflows",
        description:
          "In-browser start/end video trimming, automated WebVTT subtitles, and brand logo watermarking.",
        status: "planned",
        tag: "Studio",
      },
      {
        title: "Advanced Custom Forms",
        description:
          "Multi-step questionnaires, conditional logic, and custom branding themes per form.",
        status: "planned",
        tag: "Collection",
      },
      {
        title: "Automated Customer Invitations",
        description:
          "Magic invitation links and automated reminder sequences triggered via email or CRM webhooks.",
        status: "planned",
        tag: "Automation",
      },
      {
        title: "Multi-Platform Imports",
        description:
          "Import quotes and posts from X (Twitter), LinkedIn recommendations, and App Store review portals.",
        status: "planned",
        tag: "Ingestion",
      },
      {
        title: "Advanced Dynamic Widgets",
        description:
          "Masonry layouts, pop-up social proof toasts, and animated audiogram cards for voice notes.",
        status: "planned",
        tag: "Publishing",
      },
      {
        title: "REST API & Webhooks",
        description:
          "Complete programmatic JSON API for querying proof and outbound webhooks for real-time CRM updates.",
        status: "planned",
        tag: "Developers",
      },
      {
        title: "React & Next.js Native SDKs",
        description:
          "Typed component wrappers with Server Component prefetching and zero layout shift.",
        status: "planned",
        tag: "Developers",
      },
      {
        title: "Model Context Protocol (MCP) Server",
        description:
          "Local MCP server interface allowing coding assistants and tools to query approved customer proof securely.",
        status: "planned",
        tag: "AI / Protocol",
      },
    ],
  },
  {
    version: "Version 3",
    name: "Praise Intelligence",
    summary:
      "AI-driven semantic analysis, automated case study generation, customer verification passports, and assistant connectors.",
    status: "Planned",
    items: [
      {
        title: "AI Semantic Search",
        description:
          "Query your customer proof library naturally by customer objection, product sentiment, or feature theme.",
        status: "planned",
        tag: "AI",
      },
      {
        title: "Customer Proof Analytics",
        description:
          "Measure widget impression counts, video watch duration, and click-through rates without third-party tracking cookies.",
        status: "planned",
        tag: "Analytics",
      },
      {
        title: "Automated Case Studies",
        description:
          "Transform long-form video transcripts and questionnaire metrics into structured, publishable customer stories.",
        status: "planned",
        tag: "Content",
      },
      {
        title: "Proof Passport",
        description:
          "Cryptographically verifiable proof attestation allowing customers to verify the authenticity of their testimonials.",
        status: "planned",
        tag: "Verification",
      },
      {
        title: "Smart Proof Matching",
        description:
          "Context-aware recommendation engine suggesting the most effective customer quotes for specific landing pages or sales emails.",
        status: "planned",
        tag: "Intelligence",
      },
      {
        title: "Proof Gap Detection",
        description:
          "Identifies key personas, features, or industries that lack testimonial coverage so you can target review requests.",
        status: "planned",
        tag: "Insights",
      },
      {
        title: "ChatGPT App Integration",
        description:
          "Planned custom GPT action enabling authorized team members to converse with their self-hosted library inside ChatGPT.",
        status: "planned",
        tag: "Assistant",
      },
    ],
  },
];

export default function RoadmapPage() {
  return (
    <div>
      {/* Hero */}
      <section className="py-8 sm:py-12">
        <Container className="flex flex-col items-center text-center">
          <span className="eyebrow mb-3">Product Roadmap</span>
          <h1 className="display max-w-3xl">
            The three phases of the Praise vision
          </h1>
          <p className="lead mt-4 max-w-2xl">
            From our core self-hosted foundation to AI-powered semantic matching,
            follow what we are building, what is completed, and what is planned.
            Release dates are deliberately not invented — development moves in the open.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {DISCUSSIONS_URL ? (
              <ButtonLink
                href={DISCUSSIONS_URL}
                variant="primary"
                size="lg"
              >
                <MessageSquare size={16} />
                Discuss Features on GitHub
              </ButtonLink>
            ) : null}
            <ButtonLink href="/community/changelog" variant="secondary" size="lg">
              View Changelog
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Roadmap Milestones */}
      <Section tone="white" className="py-12">
        <div className="flex flex-col gap-16">
          {roadmapMilestones.map((milestone) => (
            <div key={milestone.version} className="flex flex-col gap-6">
              {/* Milestone Header */}
              <div className="border-b border-line pb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="tag text-xs font-semibold">
                      {milestone.version}
                    </span>
                    <span className="chip text-[11px] bg-warm-100 border-line text-ink-700">
                      {milestone.status}
                    </span>
                  </div>
                  <h2 className="heading-lg">{milestone.name}</h2>
                  <p className="muted text-sm mt-1 max-w-2xl">
                    {milestone.summary}
                  </p>
                </div>
              </div>

              {/* Items Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {milestone.items.map((item) => (
                  <div
                    key={item.title}
                    className="card flex flex-col justify-between gap-3 p-5"
                  >
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-mono text-ink-500">
                          {item.tag}
                        </span>
                        <StatusIndicator status={item.status} />
                      </div>

                      <h3 className="heading-md text-base">{item.title}</h3>
                      <p className="muted text-xs leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* GitHub Feature Discussions Notice */}
      <Section tone="muted">
        <div className="surface p-6 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <h3 className="heading-md">Influence Roadmap Priorities</h3>
            <p className="muted text-xs leading-relaxed">
              Every feature starts as a community conversation. If you need a
              specific integration or workflow in Praise Complete or Intelligence,
              open or upvote a thread in our GitHub Feature Discussions.
            </p>
          </div>

          {DISCUSSIONS_URL ? (
            <ButtonLink
              href={DISCUSSIONS_URL}
              variant="secondary"
              size="md"
              className="shrink-0"
            >
              Open Feature Discussions &rarr;
            </ButtonLink>
          ) : (
            <span className="chip text-xs text-ink-500">
              Discussions will link here when configured
            </span>
          )}
        </div>
      </Section>

      {/* Bottom CTA */}
      <Section tone="lavender">
        <div className="surface flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-10 sm:py-16">
          <span className="eyebrow">Build with us</span>
          <h2 className="heading-lg max-w-2xl">
            Help turn the Praise roadmap into reality
          </h2>
          <p className="lead max-w-xl">
            Praise is completely open source. Pick an in-progress or planned
            feature and help build it.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/community/contributing" variant="primary" size="lg">
              Contributor Guide
              <ArrowRight size={17} />
            </ButtonLink>
            <ButtonLink href="/docs" variant="secondary" size="lg">
              Read Documentation
            </ButtonLink>
          </div>
        </div>
      </Section>
    </div>
  );
}

function StatusIndicator({ status }: { status: "completed" | "in-progress" | "planned" }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 border border-emerald-200">
        <CheckCircle2 size={11} className="text-emerald-600" />
        Completed
      </span>
    );
  }

  if (status === "in-progress") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 border border-amber-200">
        <Clock size={11} className="text-amber-600" />
        In progress
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 border border-dashed border-brand-300">
      <CircleDashed size={11} className="text-brand-500" />
      Planned
    </span>
  );
}
