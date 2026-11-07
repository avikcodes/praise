import {
  ArrowRight,
  HelpCircle,
  Lightbulb,
  MessageSquare,
  Radio,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section, SectionHeading } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import { DISCUSSIONS_URL, pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Discussions & Community Forum Categories",
  description:
    "Explore Praise discussion categories: General questions, help & troubleshooting, feature requests, ideas, showcase projects, and development updates.",
  path: "/community/discussions",
});

const discussionCategories = [
  {
    icon: Users,
    name: "General Discussions",
    tag: "💬 General",
    description:
      "A friendly place for open-ended conversations, introductions, open-source musings, and discussing customer proof strategies.",
    exampleTopics: [
      "Say hello and introduce how your team uses Praise",
      "Strategies for increasing customer response rates on collection forms",
      "Open-source data governance considerations",
    ],
  },
  {
    icon: HelpCircle,
    name: "Questions & Help",
    tag: "🙋 Q&A",
    description:
      "Stuck on Docker Compose networking, reverse proxy SSL termination, or widget CSS customization? Get help from experienced community members.",
    exampleTopics: [
      "Configuring Caddy reverse proxy on Ubuntu 24.04",
      "Troubleshooting microphone/webcam permissions across browsers",
      "PostgreSQL volume backup automation questions",
    ],
  },
  {
    icon: Sparkles,
    name: "Feature Requests",
    tag: "✨ Features",
    description:
      "Propose specific capabilities for the Praise roadmap. Community votes and comments help maintainers prioritize upcoming development.",
    exampleTopics: [
      "Direct integration with Discourse or Ghost CMS",
      "CSV bulk importer for legacy testimonial spreadsheets",
      "Custom WebVTT subtitle formatting for video reviews",
    ],
  },
  {
    icon: Lightbulb,
    name: "Ideas & Feedback",
    tag: "💡 Ideas",
    description:
      "Brainstorm workflows, discuss user experience improvements for collection forms, and propose design system refinements.",
    exampleTopics: [
      "Interactive audio waveform animation concepts",
      "UX patterns for collecting video from mobile devices",
      "Feedback on the planned Model Context Protocol (MCP) tool shapes",
    ],
  },
  {
    icon: Trophy,
    name: "Showcase Projects",
    tag: "🙌 Showcase",
    description:
      "Proud of your landing page or Wall of Love? Share your live Praise implementation and show the community how you styled your widgets.",
    exampleTopics: [
      "Custom dark-mode CSS tokens matching our SaaS branding",
      "Dedicated Wall of Love with over 200 customer video reviews",
      "Astro and Hugo static site integration examples",
    ],
  },
  {
    icon: Radio,
    name: "Development Updates",
    tag: "📢 Updates",
    description:
      "Read release previews, architectural RFCs, and engineering notes directly from core project maintainers.",
    exampleTopics: [
      "Progress on the Complete Release milestone",
      "Architecture RFC: In-browser video trimming via WebCodecs",
      "Weekly changelog highlights and contributor shoutouts",
    ],
  },
];

export default function DiscussionsPage() {
  return (
    <div>
      {/* Hero */}
      <section className="py-8 sm:py-12">
        <Container className="flex flex-col items-center text-center">
          <span className="eyebrow mb-3">Community Forum</span>
          <h1 className="display max-w-3xl">
            Join the conversation and connect with Praise builders
          </h1>
          <p className="lead mt-4 max-w-2xl">
            Whether you need help debugging a deployment, want to suggest an
            innovative feature, or want to showcase your live Wall of Love, our
            community discussions are the place.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {DISCUSSIONS_URL ? (
              <ButtonLink
                href={DISCUSSIONS_URL}
                variant="primary"
                size="lg"
              >
                <MessageSquare size={16} />
                Open GitHub Discussions
              </ButtonLink>
            ) : (
              <ButtonLink
                href="/community/contributing"
                variant="primary"
                size="lg"
              >
                <Users size={16} />
                Contributing Guide
              </ButtonLink>
            )}
            <ButtonLink href="/community/roadmap" variant="secondary" size="lg">
              View Product Roadmap
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Discussion Categories */}
      <Section tone="white" className="py-12">
        <div className="flex flex-col gap-10">
          <SectionHeading
            eyebrow="Categories"
            title="Discussion Categories"
            description="Organized channels to keep technical help, creative ideas, and release announcements focused."
          />

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {discussionCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.name}
                  className="card flex flex-col justify-between gap-4 p-5"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <span className="icon-tile">
                        <Icon size={18} />
                      </span>
                      <span className="chip text-[11px] font-mono">
                        {cat.tag}
                      </span>
                    </div>

                    <h3 className="heading-md text-base">{cat.name}</h3>
                    <p className="muted text-xs leading-relaxed">
                      {cat.description}
                    </p>
                  </div>

                  <div className="border-t border-line/60 pt-3">
                    <span className="text-[11px] font-semibold text-ink-900 block mb-1.5">
                      Sample Topics:
                    </span>
                    <ul className="flex flex-col gap-1 text-[11px] text-ink-600">
                      {cat.exampleTopics.map((topic) => (
                        <li key={topic} className="flex items-start gap-1.5">
                          <span className="text-brand-500 mt-0.5">&bull;</span>
                          <span>{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* Repository URL Notice & Link */}
      <Section tone="muted">
        <div className="surface p-6 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-2xl">
            <h3 className="heading-md">Official GitHub Discussions Forum</h3>
            <p className="muted text-xs leading-relaxed">
              Praise uses GitHub Discussions as its official community forum. When
              the primary repository URL is configured, you will find active threads,
              pinned announcements, and Q&amp;A categories there.
            </p>
          </div>

          {DISCUSSIONS_URL ? (
            <ButtonLink
              href={DISCUSSIONS_URL}
              variant="primary"
              size="md"
              className="shrink-0"
            >
              Visit GitHub Discussions &rarr;
            </ButtonLink>
          ) : (
            <span className="chip text-xs text-ink-500">
              Configured via NEXT_PUBLIC_GITHUB_REPO_URL
            </span>
          )}
        </div>
      </Section>

      {/* Bottom CTA */}
      <Section tone="lavender">
        <div className="surface flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-10 sm:py-16">
          <span className="eyebrow">Have a question?</span>
          <h2 className="heading-lg max-w-2xl">
            We are here to help you get the most out of Praise
          </h2>
          <p className="lead max-w-xl">
            Check our documentation guides first, or post your question in our
            Help &amp; Questions category.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/docs" variant="primary" size="lg">
              Explore Documentation
              <ArrowRight size={17} />
            </ButtonLink>
            <ButtonLink href="/faq" variant="secondary" size="lg">
              Browse Common FAQs
            </ButtonLink>
          </div>
        </div>
      </Section>
    </div>
  );
}
