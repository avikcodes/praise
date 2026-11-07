import type { ReactNode } from "react";
import {
  AudioLines,
  GalleryHorizontal,
  Grid3x3,
  Inbox,
  LayoutGrid,
  ListChecks,
  Rows3,
  Type,
  Video,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";

type Step = {
  step: string;
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  preview: ReactNode;
};

const steps: Step[] = [
  {
    step: "01",
    icon: Inbox,
    title: "Collect",
    description: (
      <>
        Share one collect link.{" "}
        <a className="link" href="#collect">
          Customers answer in writing, on video, or out loud
        </a>{" "}
        — every submission lands in the same place.
      </>
    ),
    preview: (
      <div className="flex flex-wrap gap-2">
        <span className="chip">
          <Type size={13} />
          Text
        </span>
        <span className="chip">
          <Video size={13} />
          Video
        </span>
        <span className="chip">
          <AudioLines size={13} />
          Audio
        </span>
      </div>
    ),
  },
  {
    step: "02",
    icon: ListChecks,
    title: "Manage",
    description: (
      <>
        Nothing goes public until you say so. Approve, reject or hide a
        submission, then{" "}
        <a className="link" href="#manage">
          tag and organize your library
        </a>
        .
      </>
    ),
    preview: (
      <div className="flex items-center gap-2 rounded-lg border border-line bg-warm-50 px-3 py-2.5">
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-brand-400"
        />
        <span
          aria-hidden="true"
          className="h-2 min-w-6 flex-1 rounded-full bg-warm-200"
        />
        <span className="tag">#case-study</span>
      </div>
    ),
  },
  {
    step: "03",
    icon: LayoutGrid,
    title: "Publish",
    description: (
      <>
        <a className="link" href="#publish">
          Choose a layout
        </a>{" "}
        and add the widget to any page. Your testimonials stay on your site,
        styled the way you want.
      </>
    ),
    preview: (
      <div className="flex flex-wrap gap-2">
        <span className="chip">
          <Grid3x3 size={13} />
          Grid
        </span>
        <span className="chip">
          <Rows3 size={13} />
          Carousel
        </span>
        <span className="chip">
          <GalleryHorizontal size={13} />
          Wall of Love
        </span>
      </div>
    ),
  },
];

/**
 * Section 1 — how a testimonial travels: collect, manage, publish.
 */
export function Workflow() {
  return (
    <Section id="how-it-works" tone="lavender">
      <div className="flex flex-col gap-12">
        <SectionHeading
          eyebrow="How it works"
          title="Collect, manage, publish"
          description="Three steps from a customer's first words to a testimonial live on your site."
        />

        <ol className="grid gap-5 lg:grid-cols-3">
          {steps.map(({ icon: Icon, step, title, description, preview }) => (
            <li key={step} className="surface flex flex-col gap-3 p-6 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <span className="icon-tile">
                  <Icon size={18} />
                </span>
                <span className="font-mono text-sm font-medium text-ink-400">
                  {step}
                </span>
              </div>

              <h3 className="heading-md">{title}</h3>
              <p className="muted">{description}</p>

              <div className="mt-1 rounded-lg border border-line bg-warm-50 p-3">
                {preview}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
