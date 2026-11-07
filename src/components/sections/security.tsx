import { Database, KeyRound, Lock, ShieldCheck, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";

const controls: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: KeyRound,
    title: "Single sign-on",
    description:
      "Connect the identity provider your company already uses, so access follows your org chart.",
  },
  {
    icon: Users,
    title: "Role-based permissions",
    description:
      "Give admins, managers, and members exactly the access they need — nothing more.",
  },
  {
    icon: Lock,
    title: "Encryption by default",
    description:
      "Data is encrypted in transit and at rest, wherever it lives in the product.",
  },
  {
    icon: Database,
    title: "Export and retention controls",
    description:
      "Keep ownership of your data with straightforward export and retention settings.",
  },
];

export function Security() {
  return (
    <Section id="security" tone="white">
      <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-6">
          <SectionHeading
            align="left"
            eyebrow="Security"
            title="Control that scales with your company"
            description="Praise is built to meet the standards your organization already holds — from identity to data handling."
          />

          <div className="surface flex items-center gap-4 p-5">
            <span className="icon-tile">
              <ShieldCheck size={18} />
            </span>
            <p className="text-sm leading-relaxed text-ink-700">
              Questions about compliance, procurement, or rollout? The Praise
              team will walk your security review step by step.
            </p>
          </div>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {controls.map(({ icon: Icon, title, description }) => (
            <li key={title} className="card flex flex-col gap-3">
              <span className="icon-tile">
                <Icon size={18} />
              </span>
              <h3 className="text-base font-semibold tracking-tight text-ink-900">
                {title}
              </h3>
              <p className="muted">{description}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
