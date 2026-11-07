import { Bot, Plug, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";
import { PlannedChip } from "@/components/ui/planned-chip";

/**
 * Planned connections. Nothing here is implemented — every row is marked
 * as such so the page never implies a live integration.
 */
const plannedConnections: Array<{
  icon: LucideIcon;
  name: string;
  note: string;
}> = [
  {
    icon: Bot,
    name: "ChatGPT",
    note: "Pull approved testimonials into a conversation",
  },
  {
    icon: Sparkles,
    name: "Claude",
    note: "Reference customer proof while it writes",
  },
  {
    icon: Plug,
    name: "Any MCP-compatible tool",
    note: "Read the library through the same protocol",
  },
];

/**
 * Section — planned MCP connections to AI tools, labelled as not
 * implemented yet.
 */
export function AiIntegrations() {
  return (
    <Section id="ai" tone="white">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-6">
          <SectionHeading
            align="left"
            eyebrow="AI integrations"
            title="MCP connections are planned, not shipped"
            description="The direction: expose your testimonial library over the Model Context Protocol, so assistants like ChatGPT and Claude can read the proof you have collected — with the same access rules as everyone else."
          />

          <div className="surface flex items-center gap-4 p-5">
            <span className="icon-tile">
              <Plug size={18} />
            </span>
            <p className="text-sm leading-relaxed text-ink-700">
              No MCP server exists in Praise today, and nothing on this list
              is connected. It is the roadmap, written down so you can plan
              around it — the REST API, embed, SDK and webhook surfaces live
              in{" "}
              <a className="link" href="#developers">
                Developers
              </a>
              . Check the repository for what has actually landed.
            </p>
          </div>
        </div>

        <PlannedConnections />
      </div>
    </Section>
  );
}

/** Preview of the connections list, every row stamped as planned. */
function PlannedConnections() {
  return (
    <div
      role="img"
      aria-label="Preview of a connections list showing ChatGPT, Claude and any MCP-compatible tool, each marked as planned and not implemented yet."
      className="surface overflow-hidden shadow-[0_24px_48px_-32px_rgba(27,26,24,0.28)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-warm-50 px-4 py-3">
        <span className="text-xs font-semibold tracking-tight text-ink-900">
          Connections
        </span>
        <PlannedChip label="Not implemented yet" />
      </div>

      <ul>
        {plannedConnections.map(({ icon: Icon, name, note }) => (
          <li
            key={name}
            className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3.5"
          >
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-warm-100 text-ink-400"
            >
              <Icon size={15} />
            </span>

            <span className="min-w-0 flex-1 basis-40">
              <span className="block text-sm font-medium tracking-tight text-ink-900">
                {name}
              </span>
              <span className="mt-0.5 block text-xs text-ink-400">{note}</span>
            </span>

            <PlannedChip />
          </li>
        ))}
      </ul>

      <div className="bg-warm-50 px-4 py-3 text-[11px] leading-relaxed text-ink-400">
        These integrations are not implemented yet. They are described here so
        you know where the product is heading.
      </div>
    </div>
  );
}
