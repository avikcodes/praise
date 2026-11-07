import Link from "next/link";
import {
  ArrowRight,
  Bug,
  Compass,
  GitFork,
  GitPullRequest,
  History,
  Lightbulb,
  MessageSquare,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section, SectionHeading } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import { REPOSITORY_URL, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Praise Community — Open Source Collaboration",
  description:
    "Join the Praise community: participate in GitHub discussions, contribute code or docs, follow our 3-version roadmap, and track the latest changelog releases.",
  path: "/community",
});

const communityPillars = [
  {
    icon: MessageSquare,
    title: "Discussions & Ideas",
    description:
      "Ask questions, share self-hosting tips, brainstorm widget layouts, and discuss product architecture with other developers and founders.",
    href: "/community/discussions",
    cta: "Join discussions",
  },
  {
    icon: GitPullRequest,
    title: "Contributing Guide",
    description:
      "Learn how to set up local development, find good first issues, report bugs responsibly, and submit clean pull requests.",
    href: "/community/contributing",
    cta: "Start contributing",
  },
  {
    icon: Compass,
    title: "Product Roadmap",
    description:
      "Review our 3-phase release roadmap across Praise Core, Praise Complete, and Praise Intelligence milestones.",
    href: "/community/roadmap",
    cta: "Explore roadmap",
  },
  {
    icon: History,
    title: "Project Changelog",
    description:
      "Inspect documented changes, version updates, and historical release notes following semantic versioning.",
    href: "/community/changelog",
    cta: "View changelog",
  },
];

const participationWays = [
  {
    icon: Bug,
    title: "Report Problems",
    description:
      "Encountered a bug or installation hiccup? Report it with reproduction steps so maintainers and the community can fix it.",
    linkText: "How to report bugs &rarr;",
    href: "/community/contributing#reporting-bugs",
  },
  {
    icon: Lightbulb,
    title: "Suggest Features",
    description:
      "Have an idea for a new widget layout, notification webhook, or CMS plugin? Propose it in feature discussions.",
    linkText: "Browse feature requests &rarr;",
    href: "/community/discussions",
  },
  {
    icon: GitFork,
    title: "Contribute Code & Docs",
    description:
      "From fixing typos in documentation to building framework SDKs, pull requests of all sizes are celebrated.",
    linkText: "Contributor guide &rarr;",
    href: "/community/contributing",
  },
];

export default function CommunityHomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="py-8 sm:py-12">
        <Container className="flex flex-col items-center text-center">
          <span className="eyebrow mb-3">Open Source Community</span>
          <h1 className="display max-w-3xl">
            Built by and for teams who believe customer proof should be owned
          </h1>
          <p className="lead mt-4 max-w-2xl">
            Praise exists because testimonial collection should be transparent,
            free from vendor paywalls, and governed by an active community.
            Explore ways to participate, discuss, and build together.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/community/discussions" variant="primary" size="lg">
              Explore discussions
              <ArrowRight size={16} />
            </ButtonLink>
            <ButtonLink href="/community/contributing" variant="secondary" size="lg">
              Contributor guide
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Main Navigation Pillars */}
      <Section tone="white" className="py-12">
        <div className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Hub"
            title="Community Hub"
            description="Explore project discussions, contributor guidelines, phased roadmaps, and documented release histories."
          />

          <div className="grid gap-6 sm:grid-cols-2">
            {communityPillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="card group flex flex-col justify-between gap-4 p-6 transition-colors hover:border-brand-200"
                >
                  <div className="flex flex-col gap-3">
                    <span className="icon-tile">
                      <Icon size={18} />
                    </span>
                    <h3 className="heading-md group-hover:text-brand-700 transition-colors">
                      {pillar.title}
                    </h3>
                    <p className="muted text-sm leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-line/60">
                    <Link
                      href={pillar.href}
                      className="link text-xs font-semibold flex items-center gap-1"
                    >
                      <span>{pillar.cta}</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* How People Can Participate */}
      <Section tone="muted">
        <div className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Participate"
            title="How to Get Involved"
            description="Everyone has something valuable to bring to Praise — whether you are writing code, auditing security, or sharing feedback."
          />

          <div className="grid gap-6 md:grid-cols-3">
            {participationWays.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="card flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-3">
                    <span className="icon-tile">
                      <Icon size={18} />
                    </span>
                    <h3 className="heading-md">{item.title}</h3>
                    <p className="muted text-xs leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-line/60">
                    <Link
                      href={item.href}
                      className="link text-xs"
                      dangerouslySetInnerHTML={{ __html: item.linkText }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Bottom CTA */}
      <Section tone="lavender">
        <div className="surface flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-10 sm:py-16">
          <span className="eyebrow">Connect with us</span>
          <h2 className="heading-lg max-w-2xl">
            Help shape the future of Praise
          </h2>
          <p className="lead max-w-xl">
            Join the discussions, follow our roadmap, or star the repository on
            GitHub.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            {REPOSITORY_URL ? (
              <ButtonLink
                href={REPOSITORY_URL}
                variant="primary"
                size="lg"
              >
                <GitFork size={17} />
                GitHub Repository
              </ButtonLink>
            ) : null}
            <ButtonLink href="/community/roadmap" variant="secondary" size="lg">
              View Version Roadmap
            </ButtonLink>
          </div>
        </div>
      </Section>
    </div>
  );
}
