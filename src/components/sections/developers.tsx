import { Box, Code2, Package, Plug, Server, Webhook } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";
import { PlannedChip } from "@/components/ui/planned-chip";

const surfaces: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
  planned?: boolean;
}> = [
  {
    icon: Server,
    title: "REST API",
    description:
      "Read and write testimonials over a JSON API, so a CMS, an internal tool or a script works from the same library as the dashboard.",
  },
  {
    icon: Code2,
    title: "JavaScript embed",
    description:
      "One script tag on any page and the widget renders — no bundler, no framework, no build step.",
  },
  {
    icon: Package,
    title: "React SDK",
    description:
      "Drop the testimonial widget into an existing React app and let it fetch its own data.",
  },
  {
    icon: Box,
    title: "Next.js SDK",
    description:
      "Render testimonials in Next.js pages, with the data fetched on the server when the page renders.",
  },
  {
    icon: Webhook,
    title: "Webhooks",
    description:
      "Have Praise POST to your endpoint when a submission arrives or changes status, then pass it on to whatever you run.",
  },
  {
    icon: Plug,
    title: "MCP server",
    description:
      "An MCP server so AI assistants can query your library. Not implemented yet — shown here as planned work.",
    planned: true,
  },
];

/**
 * Section — the surfaces you can build against: HTTP, embed, SDKs,
 * webhooks and MCP.
 */
export function Developers() {
  return (
    <Section id="developers" tone="muted">
      <div className="flex flex-col gap-12">
        <SectionHeading
          eyebrow="Developers"
          title="Wire it into your stack"
          description={
            <>
              Praise is meant to be driven from outside its own UI: a REST
              API, an embeddable widget, SDKs for the usual frameworks,
              webhooks for events, and{" "}
              <a className="link" href="#ai">
                MCP for AI tools
              </a>
              .
            </>
          }
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {surfaces.map(({ icon: Icon, title, description, planned }) => (
            <article
              key={title}
              className="card flex flex-col gap-3 transition-colors hover:border-brand-200"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="icon-tile">
                  <Icon size={18} />
                </span>
                {planned ? <PlannedChip /> : null}
              </div>
              <h3 className="heading-md">{title}</h3>
              <p className="muted">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
