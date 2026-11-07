import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Code2,
  Database,
  FileCode2,
  GitBranch,
  GitFork,
  GitPullRequest,
  MessageSquare,
  Package,
  Scale,
  Unlock,
  Users,
  XCircle,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section, SectionHeading } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import {
  REPOSITORY_URL,
  pageMetadata,
} from "@/lib/site";

export const metadata = pageMetadata({
  title: "Open Source — Free Software, AGPL-3.0 & Data Ownership",
  description:
    "Discover Praise's open-source commitments: AGPL-3.0 licensing, zero paywalls, self-hosting, community contributions, and true customer data sovereignty.",
  path: "/open-source",
});

const principles = [
  {
    icon: Package,
    title: "100% Free Software",
    description:
      "Every single capability of Praise is free. There are no artificial limits on submission numbers, no paywalled video minutes, no seat limits, and no 'contact sales' enterprise editions.",
  },
  {
    icon: Scale,
    title: "AGPL-3.0 Licensing",
    description:
      "Praise is developed under the GNU Affero General Public License v3.0 (AGPL-3.0), taking formal effect once the LICENSE file is present in the repository. This ensures all modifications remain free and community accessible.",
  },
  {
    icon: Database,
    title: "Complete Data Sovereignty",
    description:
      "Your customer video files, voice notes, and reviews live on your disks or object storage. Praise includes zero remote tracking or proprietary telemetry. Your customer data remains yours.",
  },
  {
    icon: Unlock,
    title: "No Vendor Lock-In",
    description:
      "Export everything at any time as standard JSON, CSV, and raw MP4/WebM files. If you ever decide to migrate, your data is completely accessible through standard PostgreSQL dumps.",
  },
  {
    icon: GitBranch,
    title: "Public Roadmap & Development",
    description:
      "Features, bug reports, and architectural decisions are made in the open. You can follow our progress, review pull requests, and influence the direction of the product.",
  },
  {
    icon: Users,
    title: "Community-Driven Ecosystem",
    description:
      "We encourage community contributions across widget designs, framework SDKs, documentation, language localizations, and integrations with CMS tools.",
  },
];

const comparisons = [
  {
    feature: "License Model",
    praise: "Free Open Source (AGPL-3.0 once LICENSE is present)",
    saas: "Proprietary, closed-source SaaS",
  },
  {
    feature: "Video Testimonial Limits",
    praise: "Unlimited (governed only by your disk storage)",
    saas: "Typically capped at 5 to 50 videos on basic tiers",
  },
  {
    feature: "Data Storage Location",
    praise: "Your self-hosted server, volume, or MinIO/S3 bucket",
    saas: "Vendor's multi-tenant cloud servers",
  },
  {
    feature: "Telemetry & Tracking",
    praise: "Zero phone-home telemetry or analytics tracking",
    saas: "Mandatory vendor analytics and session trackers",
  },
  {
    feature: "Branding Removal",
    praise: "Full white-labeling included with zero surcharges",
    saas: "Requires high-tier 'Enterprise' plans",
  },
  {
    feature: "Source Code Auditability",
    praise: "100% inspectable code for security and compliance",
    saas: "Black-box platform",
  },
];

export default function OpenSourcePage() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-line bg-warm-50 py-16 sm:py-20 lg:py-24">
        <Container className="flex flex-col items-center text-center">
          <span className="eyebrow">Open Source Commitment</span>
          <h1 className="display mt-4 max-w-3xl">
            Free software built for customer proof and full data ownership
          </h1>
          <p className="lead mt-4 max-w-2xl">
            Praise believes social proof should belong to the team that earned
            it. No feature paywalls, no per-video charges, and no vendor lock-in.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {REPOSITORY_URL ? (
              <ButtonLink
                href={REPOSITORY_URL}
                variant="primary"
                size="lg"
              >
                <GitFork size={16} />
                View on GitHub
              </ButtonLink>
            ) : (
              <ButtonLink
                href="/community/contributing"
                variant="primary"
                size="lg"
              >
                <GitFork size={16} />
                Contributing Guide
              </ButtonLink>
            )}
            <ButtonLink href="/self-host" variant="secondary" size="lg">
              Self-hosting guide
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Core Principles */}
      <Section id="ownership" tone="white">
        <div className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="Principles"
            title="Why we build Praise in the open"
            description="Software for collecting customer testimonials should be transparent, verifiable, and owned by the community."
          />

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {principles.map(({ icon: Icon, title, description }) => (
              <article key={title} className="card flex flex-col gap-3">
                <span className="icon-tile">
                  <Icon size={18} />
                </span>
                <h3 className="heading-md">{title}</h3>
                <p className="muted text-sm">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </Section>

      {/* Licensing Deep Dive */}
      <Section id="license" tone="muted">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="tag">Licensing</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Affero GPL v3
              </span>
            </div>
            <h2 className="heading-lg">
              AGPL-3.0: Protecting community freedom
            </h2>
            <p className="lead">
              Praise is intended to be distributed under the terms of the GNU
              Affero General Public License v3.0 (AGPL-3.0), which becomes
              formally effective upon the inclusion of the LICENSE file in the
              codebase repository.
            </p>
            <div className="flex flex-col gap-3 text-sm text-ink-700">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="mt-0.5 text-brand-600 shrink-0" />
                <span>
                  <strong>Freedom to Run:</strong> You may run Praise on your own
                  servers for personal, commercial, non-profit, or government use
                  without fee.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="mt-0.5 text-brand-600 shrink-0" />
                <span>
                  <strong>Freedom to Inspect:</strong> You and your security team
                  can audit every line of frontend and backend code before
                  deploying.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="mt-0.5 text-brand-600 shrink-0" />
                <span>
                  <strong>Copyleft Reciprocity:</strong> If you modify Praise and
                  offer it as a network service to users, the modified source code
                  must be shared with the community under the same AGPL terms.
                </span>
              </div>
            </div>

            <div className="surface p-4 text-xs text-ink-500">
              <strong>Note on Licensing Status:</strong> Please inspect the{" "}
              <code>LICENSE</code> file within the root of our GitHub repository
              for exact legal declarations and warranty disclaimers prior to
              production deployment.
            </div>
          </div>

          {/* License visual card */}
          <div className="surface overflow-hidden shadow-sm">
            <div className="border-b border-line bg-warm-50 px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-900">
                Open Source Architecture
              </span>
              <span className="chip text-[11px]">No Closed Tiers</span>
            </div>
            <div className="p-6 flex flex-col gap-4 font-mono text-xs">
              <div className="rounded-lg border border-line bg-warm-50 p-3">
                <span className="text-brand-700 font-semibold">
                  {"// Open Source Core Guarantee"}
                </span>
                <p className="mt-1 text-ink-600">
                  const enterpriseFeaturePaywall = false;
                  <br />
                  const whiteLabelAllowed = true;
                  <br />
                  const maxTestimonials = Infinity;
                  <br />
                  const dataPortability = &quot;100% Native SQL/JSON&quot;;
                </p>
              </div>
              <p className="font-sans text-xs text-ink-500 leading-relaxed">
                We believe that holding back security features (like SSO or audit
                logging) or white-label styling behind expensive enterprise tiers
                is counter to user trust. Everything we develop belongs to the
                entire community.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Comparison Table */}
      <Section tone="white">
        <div className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="Comparison"
            title="Praise vs. Proprietary SaaS Platforms"
            description="How an open-source, self-hosted approach compares to closed commercial alternatives."
          />

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-warm-50 text-ink-900">
                  <th className="py-3.5 px-4 font-semibold">Feature / Attribute</th>
                  <th className="py-3.5 px-4 font-semibold text-brand-700">
                    Praise (Open Source)
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-ink-500">
                    Proprietary SaaS
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {comparisons.map((row) => (
                  <tr key={row.feature} className="hover:bg-warm-50/50">
                    <td className="py-3 px-4 font-medium text-ink-900">
                      {row.feature}
                    </td>
                    <td className="py-3 px-4 text-brand-700 font-medium">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span>{row.praise}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-ink-500">
                      <div className="flex items-center gap-1.5">
                        <XCircle size={14} className="text-red-400 shrink-0" />
                        <span>{row.saas}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* Contributing Section */}
      <Section id="contributing" tone="muted">
        <div className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Community"
            title="How to contribute to Praise"
            description="Praise grows through contributions from developers, designers, and documentation writers."
          />

          <div className="grid gap-6 md:grid-cols-3">
            <div className="card flex flex-col gap-3">
              <span className="icon-tile">
                <Code2 size={18} />
              </span>
              <h3 className="heading-md">Code & SDKs</h3>
              <p className="muted text-xs">
                Contribute to the core Next.js application, build framework SDKs
                (Vue, Svelte, React), or optimize widget rendering speed.
              </p>
              <div className="mt-auto pt-4 border-t border-line">
                <Link
                  href="/community/contributing"
                  className="link text-xs flex items-center gap-1"
                >
                  <GitPullRequest size={13} />
                  Contributing guidelines &rarr;
                </Link>
              </div>
            </div>

            <div className="card flex flex-col gap-3">
              <span className="icon-tile">
                <FileCode2 size={18} />
              </span>
              <h3 className="heading-md">Docs & Guides</h3>
              <p className="muted text-xs">
                Help write self-hosting tutorials for cloud providers (Hetzner,
                AWS, DigitalOcean), improve widget examples, or translate forms.
              </p>
              <div className="mt-auto pt-4 border-t border-line">
                <Link href="/get-started" className="link text-xs flex items-center gap-1">
                  Read documentation guides &rarr;
                </Link>
              </div>
            </div>

            <div className="card flex flex-col gap-3">
              <span className="icon-tile">
                <MessageSquare size={18} />
              </span>
              <h3 className="heading-md">Issues & Roadmap</h3>
              <p className="muted text-xs">
                Report reproducible bugs, suggest new widget layouts, or
                participate in discussions regarding upcoming releases.
              </p>
              <div className="mt-auto pt-4 border-t border-line">
                <Link
                  href="/community/discussions"
                  className="link text-xs flex items-center gap-1"
                >
                  Join discussions &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Bottom CTA */}
      <Section tone="lavender">
        <div className="surface flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-10 sm:py-16">
          <span className="eyebrow">Own your social proof</span>
          <h2 className="heading-lg max-w-2xl">
            Run Praise without restrictions or monthly fees
          </h2>
          <p className="lead max-w-xl">
            Download our Docker Compose file, spin up your instance in minutes,
            and keep your customer testimonials safe on your own servers.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/dashboard" variant="primary" size="lg">
              Get started with Praise
              <ArrowRight size={17} />
            </ButtonLink>
            <ButtonLink href="/self-host" variant="secondary" size="lg">
              Deployment instructions
            </ButtonLink>
          </div>
        </div>
      </Section>
    </div>
  );
}
