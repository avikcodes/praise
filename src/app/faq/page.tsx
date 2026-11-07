import {
  ArrowRight,
  ChevronDown,
  MessageCircleQuestion,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import { JsonLd } from "@/components/seo/json-ld";
import { faqs } from "@/lib/faq";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Frequently Asked Questions (FAQ)",
  description:
    "Comprehensive answers to all common questions about Praise: free software, AGPL licensing, video and audio collection, self-hosting with Docker, widgets, API, and MCP.",
  path: "/faq",
});

/**
 * FAQPage JSON-LD schema matching visible answers
 */
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map(({ question, answer }) => ({
    "@type": "Question",
    name: question,
    acceptedAnswer: {
      "@type": "Answer",
      text: answer,
    },
  })),
};

export default function FaqPage() {
  return (
    <div>
      <JsonLd data={faqSchema} />

      {/* Hero */}
      <section className="border-b border-line bg-warm-50 py-16 sm:py-20 lg:py-24">
        <Container className="flex flex-col items-center text-center">
          <span className="eyebrow">Frequently Asked Questions</span>
          <h1 className="display mt-4 max-w-3xl">
            Everything you need to know about Praise
          </h1>
          <p className="lead mt-4 max-w-2xl">
            Detailed answers about pricing, open-source licensing, multi-format
            collection, self-hosting requirements, developer APIs, and AI
            integrations.
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
        </Container>
      </section>

      {/* FAQ Accordion List */}
      <Section tone="white">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
          {faqs.map(({ question, answer, category }, idx) => (
            <details
              key={question}
              open={idx < 4}
              className="surface group p-5 transition-colors hover:border-brand-200"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                <div className="flex items-center gap-2.5">
                  {category ? (
                    <span className="tag text-[10px] hidden sm:inline-flex">
                      {category}
                    </span>
                  ) : null}
                  <h2 className="text-base font-semibold tracking-tight text-ink-900 group-hover:text-brand-700">
                    {question}
                  </h2>
                </div>
                <ChevronDown
                  size={18}
                  aria-hidden="true"
                  className="shrink-0 text-ink-400 transition-transform duration-200 group-open:rotate-180"
                />
              </summary>
              <div className="mt-3.5 border-t border-line/60 pt-3 text-sm leading-relaxed text-ink-600 space-y-2">
                <p>{answer}</p>
              </div>
            </details>
          ))}
        </div>
      </Section>

      {/* Still Have Questions Box */}
      <Section tone="muted">
        <div className="surface p-8 sm:p-12 max-w-3xl mx-auto flex flex-col items-center text-center gap-4">
          <span className="icon-tile size-12">
            <MessageCircleQuestion size={22} />
          </span>
          <h2 className="heading-md">Still have questions about Praise?</h2>
          <p className="muted max-w-lg text-sm">
            Can&apos;t find what you&apos;re looking for? Reach out on GitHub
            Discussions, explore our self-hosting guide, or check our developer
            architecture specifications.
          </p>
          <div className="flex flex-wrap gap-3 mt-2">
            <ButtonLink href="/developers" variant="secondary" size="sm">
              Developer architecture
            </ButtonLink>
            <ButtonLink href="/self-host" variant="secondary" size="sm">
              Self-hosting guide
            </ButtonLink>
            <ButtonLink href="https://github.com" variant="secondary" size="sm">
              GitHub Discussions
            </ButtonLink>
          </div>
        </div>
      </Section>

      {/* Bottom CTA */}
      <Section tone="lavender">
        <div className="surface flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-10 sm:py-16">
          <span className="eyebrow">Ready to try Praise?</span>
          <h2 className="heading-lg max-w-2xl">
            Start collecting customer proof on your terms
          </h2>
          <p className="lead max-w-xl">
            Praise is free, open-source, and installs with Docker in minutes.
            Retain full ownership of every video, voice note, and quote.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/dashboard" variant="primary" size="lg">
              Get started now
              <ArrowRight size={17} />
            </ButtonLink>
            <ButtonLink href="/features" variant="secondary" size="lg">
              Explore all features
            </ButtonLink>
          </div>
        </div>
      </Section>
    </div>
  );
}
