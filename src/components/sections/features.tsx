import {
  ChartColumn,
  Eye,
  Send,
  SlidersHorizontal,
  Target,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";

const features: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: Send,
    title: "Praise in seconds",
    description:
      "Send recognition from the web or chat without breaking your flow — a line of context and a value tag is all it takes.",
  },
  {
    icon: Target,
    title: "Tie praise to values",
    description:
      "Attach every shout-out to a company value so culture shows up in daily work instead of a slide deck.",
  },
  {
    icon: Eye,
    title: "One shared feed",
    description:
      "A single, searchable feed surfaces great work across teams and time zones, so good deeds don't go unnoticed.",
  },
  {
    icon: Workflow,
    title: "Fits your stack",
    description:
      "Connect the chat, HR, and project tools your team already uses, and recognize people where the work happens.",
  },
  {
    icon: ChartColumn,
    title: "See what matters",
    description:
      "Notice which values your people celebrate most, and where recognition is thin on the ground.",
  },
  {
    icon: SlidersHorizontal,
    title: "Controls for admins",
    description:
      "Roles, moderation, and export options keep your program tidy as your company grows.",
  },
];

export function Features() {
  return (
    <Section id="features" tone="white">
      <div className="flex flex-col gap-12">
        <SectionHeading
          eyebrow="Features"
          title="Make recognition a habit, not an afterthought"
          description="Everything your team needs to notice good work, say so out loud, and build a culture people want to be part of."
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="card flex flex-col gap-3 transition-colors hover:border-brand-200"
            >
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
