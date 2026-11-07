import { Hero } from "@/components/sections/hero";
import { Features } from "@/components/sections/features";
import { Workflow } from "@/components/sections/workflow";
import { Collect } from "@/components/sections/collect";
import { Manage } from "@/components/sections/manage";
import { Publish } from "@/components/sections/publish";
import { OpenSource } from "@/components/sections/open-source";
import { Developers } from "@/components/sections/developers";
import { AiIntegrations } from "@/components/sections/ai-integrations";
import { SelfHost } from "@/components/sections/self-host";
import { Security } from "@/components/sections/security";
import { Faq } from "@/components/sections/faq";
import { CTA } from "@/components/sections/cta";
import { JsonLd } from "@/components/seo/json-ld";
import { faqs } from "@/lib/faq";
import { pageMetadata, SITE_DESCRIPTION } from "@/lib/site";

/**
 * The home page keeps `title` unset: `title.template` in the root layout
 * does not apply to the layout's own route segment, so a `title` here
 * would bypass the template. `pageMetadata()` still supplies the
 * canonical URL and social tags.
 */
export const metadata = pageMetadata({
  description: SITE_DESCRIPTION,
  path: "/",
});

/**
 * Mirrors the FAQ section below — the questions and answers come from
 * the same `faqs` array, so the schema always matches the visible copy.
 */
const faqPage = {
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

export default function Home() {
  return (
    <>
      <JsonLd data={faqPage} />
      <Hero />
      <Features />
      <Workflow />
      <Collect />
      <Manage />
      <Publish />
      <OpenSource />
      <Developers />
      <AiIntegrations />
      <SelfHost />
      <Security />
      <Faq />
      <CTA />
    </>
  );
}
