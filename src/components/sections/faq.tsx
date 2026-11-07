import { ChevronDown } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";
import { faqs } from "@/lib/faq";

/**
 * The questions people ask before they commit. The copy lives in
 * `@/lib/faq` so the FAQPage structured data stays identical to what is
 * rendered here.
 */
export function Faq() {
  return (
    <Section id="faq" tone="muted">
      <div className="flex flex-col gap-12">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions worth asking"
          description="What people usually want to know before they collect, store and publish someone else's words."
        />

        <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
          {faqs.map(({ question, answer }) => (
            <details key={question} className="surface group px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
                {/* h1–h6 are allowed inside <summary>, so the questions
                    read as real headings to screen readers and crawlers. */}
                <h3 className="text-sm font-semibold tracking-tight text-ink-900">
                  {question}
                </h3>
                <ChevronDown
                  size={16}
                  aria-hidden="true"
                  className="shrink-0 text-ink-400 transition-transform duration-150 group-open:rotate-180"
                />
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-ink-500">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
