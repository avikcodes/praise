import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/section";

export function CTA() {
  return (
    <Section id="cta" tone="lavender">
      <div className="surface flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-10 sm:py-16">
        <span className="eyebrow">Get started</span>

        <h2 className="heading-lg max-w-2xl">
          Start showcasing genuine customer proof today
        </h2>

        <p className="lead max-w-xl">
          Deploy Praise on your own infrastructure, gather text, video, and
          audio testimonials, and publish high-converting social proof on your
          website.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/dashboard" variant="primary" size="lg">
            Get started with Praise
            <ArrowRight size={17} />
          </ButtonLink>
          <ButtonLink href="/how-it-works" variant="secondary" size="lg">
            See how it works
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
