import { Database, GitFork, Package, Unlock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";

const points: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: Package,
    title: "Free software",
    description:
      "No licence keys, no seat counts, no trial clock. The whole product is free to run for as many projects as you have.",
  },
  {
    icon: GitFork,
    title: "Yours to change",
    description:
      "Fork it, patch it, or send changes back upstream. The source is there to be read, audited and adapted to how you work.",
  },
  {
    icon: Database,
    title: "Data ownership",
    description:
      "Testimonials, uploads and settings live in your database and your storage. Export the lot whenever you want.",
  },
  {
    icon: Unlock,
    title: "No vendor lock-in",
    description:
      "Nothing sits in a hosted account you cannot reach. If Praise stops fitting, move your data out or keep maintaining your own fork.",
  },
];

/**
 * Section — what "open source" buys you: free to run, free to change,
 * your data to keep.
 */
export function OpenSource() {
  return (
    <Section id="open-source" tone="lavender">
      <div className="flex flex-col gap-12">
        <SectionHeading
          eyebrow="Open source"
          title="Free software, your data included"
          description={
            <>
              Praise is open source from the licence down: free to run,
              yours to modify, and it keeps your customer proof in{" "}
              <a className="link" href="#self-host">
                storage you control
              </a>
              .
            </>
          }
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {points.map(({ icon: Icon, title, description }) => (
            <article key={title} className="card flex flex-col gap-3">
              <span className="icon-tile">
                <Icon size={18} />
              </span>
              <h3 className="heading-md">{title}</h3>
              <p className="muted">{description}</p>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}
