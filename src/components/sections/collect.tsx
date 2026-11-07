import {
  ArrowRight,
  AudioLines,
  Sparkles,
  Star,
  Type,
  Upload,
  Video,
} from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";
import { FeatureList } from "@/components/ui/feature-list";

const capabilities = [
  "Collection forms you share with a single link",
  "Custom questions in your wording, in any order",
  "Star ratings alongside the written answer",
  "Video and audio uploads next to text",
];

const formats = [
  { icon: Type, label: "Text", active: true },
  { icon: Video, label: "Video", active: false },
  { icon: AudioLines, label: "Audio", active: false },
];

export function Collect() {
  return (
    <Section id="collect" tone="white">
      <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-6">
          <SectionHeading
            align="left"
            eyebrow="Collect"
            title="Collect testimonials in every format"
            description="One form, three ways to answer. Customers can type it, record a video, or leave a voice note — and add a rating while they are at it."
          />
          <FeatureList items={capabilities} />
        </div>

        <FormPreview />
      </div>
    </Section>
  );
}

/**
 * Static preview of the collection form: fields, custom questions, rating
 * and a media dropzone — no prefilled answers.
 */
function FormPreview() {
  return (
    <div
      role="img"
      aria-label="Preview of a collection form with name and email fields, custom questions, an unrated five-star row and a video or audio upload area."
      className="surface overflow-hidden shadow-[0_24px_48px_-32px_rgba(27,26,24,0.28)]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-warm-50 px-4 py-3">
        <span className="text-xs font-semibold tracking-tight text-ink-900">
          New testimonial
        </span>
        <div className="flex flex-wrap gap-1.5">
          {formats.map(({ icon: Icon, label, active }) => (
            <span
              key={label}
              className={
                active
                  ? "chip border-brand-200 bg-brand-50 text-brand-700"
                  : "chip"
              }
            >
              <Icon size={12} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name" placeholder="Your name" />
          <Field label="Email" placeholder="you@company.com" />
        </div>

        <Field label="Company" placeholder="Where do you work?" />

        <div>
          <span className="block text-[11px] font-medium text-ink-700">
            What changed for you?
          </span>
          <span className="mt-1.5 flex h-20 items-start rounded-lg border border-line bg-white px-3 py-2 text-xs text-ink-400">
            Write your answer…
          </span>
        </div>

        <div>
          <span className="block text-[11px] font-medium text-ink-700">
            How would you rate it?
          </span>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="flex items-center gap-1" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((star) => (
                <Star key={star} size={16} className="text-ink-400" />
              ))}
            </div>
            <span className="text-[11px] text-ink-400">Not rated</span>
          </div>
        </div>

        <div>
          <span className="block text-[11px] font-medium text-ink-700">
            Photo, video or audio
          </span>
          <span className="mt-1.5 flex flex-col items-center gap-1 rounded-lg border border-dashed border-line bg-warm-50 px-4 py-5 text-center">
            <Upload size={16} className="text-ink-400" aria-hidden="true" />
            <span className="text-xs font-medium text-ink-700">
              Drop a file here, or browse
            </span>
            <span className="text-[11px] text-ink-400">
              Record it, or pick something you already have
            </span>
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="flex items-center gap-1.5 text-[11px] text-ink-400">
            <span
              aria-hidden="true"
              className="grid size-3.5 place-items-center rounded-sm bg-brand-500 text-white"
            >
              <Sparkles size={8} strokeWidth={3} />
            </span>
            Powered by Praise
          </span>
          <span className="btn btn-primary btn-sm">
            Submit testimonial
            <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <span className="block text-[11px] font-medium text-ink-700">
        {label}
      </span>
      <span className="mt-1.5 flex h-9 items-center rounded-lg border border-line bg-white px-3 text-xs text-ink-400">
        {placeholder}
      </span>
    </div>
  );
}
