import {
  Calendar,
  GitCommit,
  GitFork,
  Info,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import {
  RELEASES_URL,
  REPOSITORY_URL,
  pageMetadata,
} from "@/lib/site";

export const metadata = pageMetadata({
  title: "Project Changelog — Release Notes & History",
  description:
    "Official changelog for the Praise project: actual releases, feature additions, fixes, and pre-release notes following Keep a Changelog standards.",
  path: "/community/changelog",
});

type ChangeGroup = {
  type: "Added" | "Changed" | "Fixed" | "Security" | "Planned";
  items: string[];
};

type Release = {
  version: string;
  title: string;
  date?: string;
  badge: "Pre-Release" | "Planned" | "Stable";
  summary: string;
  changes: ChangeGroup[];
};

/**
 * Derived from CHANGELOG.md — the single source of truth for all releases.
 * Real releases only; no invented dates or pretended releases.
 */
const releases: Release[] = [
  {
    version: "Unreleased",
    title: "Version 1.0 (Praise Core) Milestone",
    badge: "Planned",
    summary:
      "Active work currently being implemented for the first stable production release.",
    changes: [
      {
        type: "Planned",
        items: [
          "Production Docker Compose bundle and database schema migrations.",
          "In-browser webcam video and microphone audio recording module.",
          "Editorial moderation queue with approval and tag taxonomy.",
          "Public embed script runtime supporting Grid, Carousel, Quote cards, and Wall of Love.",
        ],
      },
    ],
  },
  {
    version: "v0.1.0",
    title: "Initial Public Foundation Release",
    badge: "Pre-Release",
    summary:
      "The initial open-source codebase foundation, complete design system, documentation section, and community architecture.",
    changes: [
      {
        type: "Added",
        items: [
          "Complete landing page foundation and product presentation.",
          "Product feature pages: /features, /how-it-works, /open-source, /developers, /ai-integrations, /self-host, /security, /faq, and /get-started.",
          "Full technical documentation section: /docs, /docs/getting-started, /docs/api-reference, /docs/widgets, and /docs/deployment.",
          "Community hubs and governance: /community, /community/discussions, /community/contributing, /community/roadmap, and /community/changelog.",
          "Legal and compliance templates: /privacy, /terms, and /cookies with self-host data controller notices.",
          "Brand vector assets, logo geometry specifications, and social preview cards.",
          "Design tokens with warm white surfaces, charcoal ink typography, and purple accents.",
          "Responsive widget blueprints and CSS variable customization system.",
          "Model Context Protocol (MCP) server specifications and assistant integration designs.",
          "Schema.org structured data (Organization, SoftwareApplication, FAQPage).",
          "Static sitemap generator and robots.txt configuration.",
          "Contributor guidelines (CONTRIBUTING.md) and Code of Conduct (CODE_OF_CONDUCT.md).",
        ],
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div>
      {/* Hero */}
      <section className="py-8 sm:py-12">
        <Container className="flex flex-col items-center text-center">
          <span className="eyebrow mb-3">Release History</span>
          <h1 className="display max-w-3xl">
            Praise Project Changelog
          </h1>
          <p className="lead mt-4 max-w-2xl">
            Documented changes, pre-releases, and feature improvements derived
            directly from our repository&apos;s <code>CHANGELOG.md</code>. We follow{" "}
            <a
              href="https://semver.org"
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              Semantic Versioning
            </a>{" "}
            and{" "}
            <a
              href="https://keepachangelog.com"
              target="_blank"
              rel="noopener noreferrer"
              className="link"
            >
              Keep a Changelog
            </a>{" "}
            standards.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {RELEASES_URL ? (
              <ButtonLink
                href={RELEASES_URL}
                variant="primary"
                size="lg"
              >
                <GitCommit size={16} />
                Releases on GitHub
              </ButtonLink>
            ) : null}
            <ButtonLink href="/community/roadmap" variant="secondary" size="lg">
              View Product Roadmap
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Pre-Release Status Notice */}
      <Section tone="white" className="py-6">
        <div className="surface border-brand-200 bg-brand-50/50 p-5 sm:p-6 flex items-start gap-3.5 text-xs text-ink-800">
          <Info size={18} className="text-brand-600 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <span className="font-semibold text-brand-900 block text-sm">
              Early Development Foundation (v0.1.0)
            </span>
            <p className="text-ink-600 leading-relaxed">
              Praise is currently in its initial public foundation phase (version{" "}
              <code>0.1.0</code>). We do not invent fictional versions or pretend
              unimplemented features have shipped. Major releases will be published
              here alongside commit hashes and GitHub release tags.
            </p>
          </div>
        </div>
      </Section>

      {/* Timeline Releases */}
      <Section tone="white" className="py-8">
        <div className="flex flex-col gap-12 max-w-3xl mx-auto">
          {releases.map((rel) => (
            <article
              key={rel.version}
              className="surface overflow-hidden p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4 mb-5">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-bold text-ink-900">
                    {rel.version}
                  </span>
                  <span
                    className={
                      rel.badge === "Stable"
                        ? "chip border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px]"
                        : rel.badge === "Pre-Release"
                        ? "chip border-brand-200 bg-brand-50 text-brand-700 text-[11px]"
                        : "chip border-dashed border-amber-300 bg-amber-50 text-amber-800 text-[11px]"
                    }
                  >
                    {rel.badge}
                  </span>
                </div>

                {rel.date ? (
                  <span className="flex items-center gap-1.5 text-xs text-ink-400">
                    <Calendar size={13} />
                    <span>{rel.date}</span>
                  </span>
                ) : null}
              </div>

              <h2 className="heading-md text-base mb-2">{rel.title}</h2>
              <p className="muted text-xs leading-relaxed mb-6">
                {rel.summary}
              </p>

              <div className="space-y-6">
                {rel.changes.map((group) => (
                  <div key={group.type} className="flex flex-col gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-700">
                      {group.type}
                    </span>
                    <ul className="flex flex-col gap-1.5 text-xs text-ink-600 pl-4 list-disc">
                      {group.items.map((item, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </Section>

      {/* Bottom CTA */}
      <Section tone="lavender">
        <div className="surface flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-10 sm:py-16">
          <span className="eyebrow">Stay up to date</span>
          <h2 className="heading-lg max-w-2xl">
            Watch Praise releases on GitHub
          </h2>
          <p className="lead max-w-xl">
            Star or watch our repository to get notified when Version 1.0
            (Praise Core) is tagged and published.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {REPOSITORY_URL ? (
              <ButtonLink
                href={REPOSITORY_URL}
                variant="primary"
                size="lg"
              >
                <GitFork size={17} />
                Star on GitHub
              </ButtonLink>
            ) : null}
            <ButtonLink href="/community/discussions" variant="secondary" size="lg">
              Development Updates
            </ButtonLink>
          </div>
        </div>
      </Section>
    </div>
  );
}
