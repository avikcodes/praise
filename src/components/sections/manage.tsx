import {
  AudioLines,
  Check,
  ListFilter,
  Search,
  Type,
  Video,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";
import { FeatureList } from "@/components/ui/feature-list";

const capabilities = [
  "Approve, reject or hide a submission before it is published",
  "Tags that group testimonials by topic, plan or customer",
  "Search across text, video and audio submissions",
  "Filter by status, format or tag to pull up one testimonial",
];

const statusFilters = ["All", "Pending", "Approved"];

/** Rows are structural: format, tag and status, never an invented quote. */
const rows: Array<{
  icon: LucideIcon;
  format: string;
  tag: string;
  pending?: boolean;
}> = [
  { icon: Video, format: "Video", tag: "#case-study", pending: true },
  { icon: Type, format: "Text", tag: "#onboarding" },
  { icon: AudioLines, format: "Audio", tag: "#support" },
];

/**
 * Section 3 — the library behind the collect link: moderation, tags,
 * search and filters in one screen.
 */
export function Manage() {
  return (
    <Section id="manage" tone="muted">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <LibraryPreview />

        <div className="flex flex-col gap-6">
          <SectionHeading
            align="left"
            eyebrow="Manage"
            title="Manage customer proof"
            description="Everything you collect lands in one library. Review what came in, approve what is ready, and tag and search the rest until you need it."
          />
          <FeatureList items={capabilities} />
        </div>
      </div>
    </Section>
  );
}

/**
 * Static preview of the testimonial library: a search and filter toolbar
 * over rows showing format, tag and moderation state.
 */
function LibraryPreview() {
  return (
    <div
      role="img"
      aria-label="Preview of the testimonial library: a search field and status filters above rows with a format chip, a tag, and either approve and reject actions or an approved state."
      className="surface overflow-hidden shadow-[0_24px_48px_-32px_rgba(27,26,24,0.28)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-warm-50 px-4 py-3">
        <span className="text-xs font-semibold tracking-tight text-ink-900">
          Testimonials
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-8 items-center gap-2 rounded-full border border-line bg-white px-3 text-xs text-ink-400">
            <Search size={13} aria-hidden="true" />
            Search
          </span>
          <span className="chip">
            <ListFilter size={12} />
            Filter
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 px-4 pt-4">
        {statusFilters.map((filter, index) => (
          <span
            key={filter}
            className={
              index === 0
                ? "chip border-brand-200 bg-brand-50 text-brand-700"
                : "chip"
            }
          >
            {filter}
          </span>
        ))}
      </div>

      <ul className="mt-4">
        {rows.map(({ icon: Icon, format, tag, pending }) => (
          <li
            key={tag}
            className="flex flex-wrap items-center gap-3 border-t border-line px-4 py-3.5"
          >
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center rounded-lg bg-warm-100 text-ink-400"
            >
              <Icon size={15} />
            </span>

            <span className="min-w-0 flex-1 basis-32">
              <span
                aria-hidden="true"
                className="block h-2 w-full rounded-full bg-warm-200"
              />
              <span
                aria-hidden="true"
                className="mt-1.5 block h-2 w-2/3 rounded-full bg-warm-100"
              />
            </span>

            <span className="chip">
              <Icon size={12} />
              {format}
            </span>
            <span className="tag">{tag}</span>

            {pending ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-brand-500 px-3 text-xs font-medium whitespace-nowrap text-white">
                  <Check size={13} strokeWidth={3} aria-hidden="true" />
                  Approve
                </span>
                <span className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-white px-3 text-xs font-medium whitespace-nowrap text-ink-700">
                  <X size={13} aria-hidden="true" />
                  Reject
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-brand-600">
                <Check size={13} strokeWidth={3} aria-hidden="true" />
                Approved
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
