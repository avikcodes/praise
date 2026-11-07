import {
  ArrowRight,
  Copy,
  LayoutGrid,
  Link2,
  MessageSquareQuote,
  PanelTop,
  Plus,
  Quote,
  Search,
  Settings2,
  Sparkles,
  Upload,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/utils";

/** Left rail of the dashboard preview. */
const railItems = [
  { icon: LayoutGrid, label: "Testimonials", active: true },
  { icon: Link2, label: "Collect link" },
  { icon: PanelTop, label: "Widget" },
  { icon: Settings2, label: "Settings" },
];

/** Format filters — mirrors the text / video / audio copy above. */
const formatFilters = ["All", "Text", "Video", "Audio"];

/** Grey blocks standing in for the page the widget sits on. */
const pageSkeleton = [
  { width: "w-28", tall: true },
  { width: "w-44", tall: false },
  { width: "w-36", tall: false },
  { width: "w-52", tall: false },
  { width: "w-40", tall: false },
];

export function Hero() {
  return (
    <Section tone="base" aria-label="Introduction">
      <div className="flex flex-col items-center gap-12 pt-6 sm:pt-10 lg:pt-14">
        <div className="flex max-w-3xl flex-col items-center gap-6 text-center">
          <span className="eyebrow uppercase">
            Open source testimonial platform
          </span>

          <h1 className="display">
            Collect customer love. Keep it yours.
          </h1>

          <p className="lead max-w-2xl">
            Collect text, video and audio testimonials. Organize your
            customer proof and showcase it beautifully. Built for product
            teams, founders and marketers whose customer praise is scattered
            across inboxes and chat threads. Free, open-source and
            self-hosted.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/dashboard" variant="primary" size="lg">
              Get started
              <ArrowRight size={17} />
            </ButtonLink>
            <ButtonLink href="/how-it-works" variant="secondary" size="lg">
              See how it works
            </ButtonLink>
          </div>
        </div>

        <ProductPreview />
      </div>
    </Section>
  );
}

/**
 * Product preview: a testimonials dashboard beside the website widget it
 * powers. Both panes show empty states — no invented quotes or numbers.
 */
function ProductPreview() {
  return (
    <div
      role="img"
      aria-label="Product preview: an empty testimonials dashboard next to a website widget waiting for its first published testimonial."
      className="w-full"
    >
      <div className="surface overflow-hidden shadow-[0_24px_48px_-32px_rgba(27,26,24,0.35)]">
        {/* Window chrome */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-line bg-warm-50 px-4 py-3">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-warm-200" />
            <span className="size-2.5 rounded-full bg-warm-200" />
            <span className="size-2.5 rounded-full bg-warm-200" />
          </div>
          <span className="text-xs font-medium text-ink-400">
            Praise — Testimonials
          </span>
          <span className="hidden justify-end sm:flex" aria-hidden="true">
            <PanelTop size={14} className="text-ink-400" />
          </span>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]">
          <DashboardPane />
          <WidgetPane />
        </div>
      </div>
    </div>
  );
}

/** Dashboard: rail, toolbar, format filters and the empty state. */
function DashboardPane() {
  return (
    <div className="flex min-w-0 border-b border-line lg:border-r lg:border-b-0">
      <nav
        aria-hidden="true"
        className="hidden w-14 shrink-0 flex-col items-center gap-2 border-r border-line bg-warm-50 py-4 sm:flex"
      >
        {railItems.map(({ icon: Icon, label, active }) => (
          <span
            key={label}
            title={label}
            className={cn(
              "grid size-8 place-items-center rounded-lg",
              active ? "bg-brand-50 text-brand-600" : "text-ink-400",
            )}
          >
            <Icon size={16} />
          </span>
        ))}
      </nav>

      <div className="min-w-0 flex-1 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="block text-sm font-semibold tracking-tight text-ink-900">
              Testimonials
            </span>
            <p className="text-xs text-ink-400">Everything you collect</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-3 text-xs text-ink-400">
              <Search size={14} aria-hidden="true" />
              Search
            </span>
            <span className="btn btn-primary btn-sm">
              <Plus size={14} />
              New
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {formatFilters.map((filter, index) => (
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

        <div className="mt-4 rounded-xl border border-dashed border-line bg-warm-50 px-6 py-8 text-center">
          <span className="icon-tile mx-auto">
            <MessageSquareQuote size={18} />
          </span>
          <span className="mt-3 block text-sm font-semibold tracking-tight text-ink-900">
            No testimonials yet
          </span>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-ink-500">
            Share your collect link with a customer, or import one you have
            already received. Text, video and audio all land here.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="btn btn-primary btn-sm">
              <Copy size={14} />
              Copy collect link
            </span>
            <span className="btn btn-secondary btn-sm">
              <Upload size={14} />
              Import
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Website canvas with the widget parked in the corner, waiting for content. */
function WidgetPane() {
  return (
    <div className="flex min-w-0 flex-col gap-3 bg-warm-50 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold tracking-wide text-ink-400 uppercase">
          Widget preview
        </span>
        <span className="flex items-center gap-1.5 text-xs text-ink-400">
          <Sparkles size={13} />
          On your site
        </span>
      </div>

      {/* Mock page the widget sits on */}
      <div className="relative min-h-[240px] overflow-hidden rounded-xl border border-line bg-white p-4">
        <div className="flex flex-col gap-2.5" aria-hidden="true">
          {pageSkeleton.map(({ width, tall }) => (
            <span
              key={width}
              className={cn(
                "block rounded-full",
                width,
                tall ? "h-3.5 bg-warm-200" : "h-2.5 bg-warm-100",
              )}
            />
          ))}
        </div>

        {/* The widget */}
        <div className="absolute right-3 bottom-3 w-[68%] max-w-[200px] rounded-lg border border-line bg-white p-3 shadow-[0_8px_20px_-12px_rgba(27,26,24,0.4)]">
          <div className="flex items-center gap-2">
            <span className="grid size-5 place-items-center rounded bg-brand-500 text-white">
              <Sparkles size={11} strokeWidth={2.5} />
            </span>
            <span className="text-[11px] font-semibold tracking-tight text-ink-900">
              Testimonials
            </span>
          </div>

          <div className="mt-2 rounded-md border border-dashed border-line bg-warm-50 px-2.5 py-3 text-center">
            <Quote
              size={13}
              className="mx-auto text-ink-400"
              aria-hidden="true"
            />
            <p className="mt-1 text-[11px] leading-snug font-medium text-ink-700">
              Nothing published yet
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-ink-400">
              Publish a testimonial and it shows up here.
            </p>
          </div>

          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-ink-400">
            <span className="grid size-3.5 place-items-center rounded-sm bg-brand-500 text-white">
              <Sparkles size={8} strokeWidth={3} />
            </span>
            Powered by Praise
          </div>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-ink-400">
        Drop the widget on any page — it stays empty until you publish
        something.
      </p>
    </div>
  );
}
