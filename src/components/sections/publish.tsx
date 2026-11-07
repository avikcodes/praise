import type { ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  GalleryHorizontal,
  Grid3x3,
  Quote,
  Rows3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";

type Layout = {
  icon: LucideIcon;
  title: string;
  description: string;
  preview: ReactNode;
};

const layouts: Layout[] = [
  {
    icon: Grid3x3,
    title: "Grid",
    description:
      "Cards in columns for landing pages, docs and any page with room to breathe.",
    preview: <GridPreview />,
  },
  {
    icon: Rows3,
    title: "Carousel",
    description:
      "One testimonial at a time with arrows and dots, for narrow or busy areas.",
    preview: <CarouselPreview />,
  },
  {
    icon: Quote,
    title: "Quote cards",
    description:
      "A single pull quote next to a headline, a feature block or a pricing table.",
    preview: <QuotePreview />,
  },
  {
    icon: GalleryHorizontal,
    title: "Wall of Love",
    description:
      "A whole page of every published testimonial, for a dedicated proof page.",
    preview: <WallPreview />,
  },
];

/**
 * Section 4 — the widget layouts you can drop on a site.
 */
export function Publish() {
  return (
    <Section id="publish" tone="white">
      <div className="flex flex-col gap-12">
        <SectionHeading
          eyebrow="Publish"
          title="Publish everywhere"
          description="Pick a layout, paste the embed on any page, and the widget renders there. Four layouts, the same testimonials you collected and approved."
        />

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {layouts.map(({ icon: Icon, title, description, preview }) => (
            <article key={title} className="surface flex flex-col overflow-hidden">
              <div
                role="img"
                aria-label={`${title} layout example`}
                className="border-b border-line bg-warm-50 p-4"
              >
                <div aria-hidden="true" className="min-h-[132px]">
                  {preview}
                </div>
              </div>

              <div className="flex flex-col gap-2 p-5">
                <span className="flex items-center gap-2">
                  <Icon size={16} className="text-brand-600" aria-hidden="true" />
                  <h3 className="text-base font-semibold tracking-tight text-ink-900">
                    {title}
                  </h3>
                </span>
                <p className="muted">{description}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Section>
  );
}

/** Two-by-two of skeleton testimonial cards. */
function GridPreview() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[0, 1, 2, 3].map((card) => (
        <div
          key={card}
          className="rounded-lg border border-line bg-white p-2.5"
        >
          <span className="block size-4 rounded-full bg-brand-100" />
          <span className="mt-2 block h-1.5 w-full rounded-full bg-warm-200" />
          <span className="mt-1.5 block h-1.5 w-2/3 rounded-full bg-warm-100" />
        </div>
      ))}
    </div>
  );
}

/** One card with paging controls on either side. */
function CarouselPreview() {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line bg-white text-ink-400">
        <ChevronLeft size={12} />
      </span>

      <div className="min-w-0 flex-1 rounded-lg border border-line bg-white p-3">
        <span className="block h-1.5 w-full rounded-full bg-warm-200" />
        <span className="mt-1.5 block h-1.5 w-3/4 rounded-full bg-warm-100" />
        <span className="mt-1.5 block h-1.5 w-1/2 rounded-full bg-warm-100" />
        <span className="mt-3 flex items-center justify-center gap-1.5">
          <span className="size-1.5 rounded-full bg-brand-500" />
          <span className="size-1.5 rounded-full bg-warm-200" />
          <span className="size-1.5 rounded-full bg-warm-200" />
        </span>
      </div>

      <span className="grid size-6 shrink-0 place-items-center rounded-full border border-line bg-white text-ink-400">
        <ChevronRight size={12} />
      </span>
    </div>
  );
}

/** A single pull quote with a byline row. */
function QuotePreview() {
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <Quote size={14} className="text-brand-300" />
      <span className="mt-2 block h-1.5 w-full rounded-full bg-warm-200" />
      <span className="mt-1.5 block h-1.5 w-4/5 rounded-full bg-warm-100" />
      <span className="mt-3 flex items-center gap-2">
        <span className="size-5 shrink-0 rounded-full bg-brand-100" />
        <span className="block h-1.5 w-20 rounded-full bg-warm-200" />
      </span>
    </div>
  );
}

/** Three columns of stacked cards. */
function WallPreview() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[0, 1, 2].map((column) => (
        <div key={column} className="flex flex-col gap-2">
          {[0, 1].map((card) => (
            <div
              key={card}
              className="rounded-lg border border-line bg-white p-2"
            >
              <span className="block size-3 rounded-full bg-brand-100" />
              <span
                className={`mt-1.5 block h-1.5 rounded-full bg-warm-200 ${
                  column === 1 ? "w-full" : "w-2/3"
                }`}
              />
              <span className="mt-1.5 block h-1.5 w-1/2 rounded-full bg-warm-100" />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
