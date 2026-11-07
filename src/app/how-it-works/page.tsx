import Link from "next/link";
import {
  ArrowRight,
  AudioLines,
  Check,
  Filter,
  GalleryHorizontal,
  Grid3x3,
  MessageSquareQuote,
  Rows3,
  Search,
  ShieldCheck,
  Sliders,
  Star,
  Type,
  Video,
  X,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { ButtonLink } from "@/components/ui/button";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "How It Works — Step-by-Step Testimonial Workflow",
  description:
    "Learn how Praise collects multi-format testimonials, streamlines moderation and tagging, and publishes widgets on your website in three simple steps.",
  path: "/how-it-works",
});

export default function HowItWorksPage() {
  return (
    <div>
      {/* Hero */}
      <section className="border-b border-line bg-warm-50 py-16 sm:py-20 lg:py-24">
        <Container className="flex flex-col items-center text-center">
          <span className="eyebrow">The Praise Workflow</span>
          <h1 className="display mt-4 max-w-3xl">
            From customer feedback to high-converting social proof in three steps
          </h1>
          <p className="lead mt-4 max-w-2xl">
            Praise replaces fragmented emails, messy spreadsheets, and expensive
            proprietary tools with a unified, self-hosted system that you own
            completely.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/dashboard" variant="primary" size="lg">
              Start collecting now
              <ArrowRight size={16} />
            </ButtonLink>
            <ButtonLink href="/features" variant="secondary" size="lg">
              View all features
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Interactive Workflow Diagram / Overview Strip */}
      <Section tone="white" className="py-12 sm:py-16">
        <div className="surface overflow-hidden p-6 sm:p-10">
          <div className="text-center mb-10">
            <h2 className="heading-lg">The Complete Lifecycle</h2>
            <p className="muted mt-2 max-w-xl mx-auto">
              How Praise moves customer praise smoothly from an invitation link
              to your production landing pages.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3 relative">
            {/* Step 1 Card */}
            <div className="card flex flex-col justify-between border-brand-200 bg-brand-50/30 p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-500 font-mono text-sm font-bold text-white">
                    01
                  </span>
                  <span className="chip bg-white text-brand-700 border-brand-200">
                    Collection
                  </span>
                </div>
                <h3 className="heading-md">Collect feedback</h3>
                <p className="muted">
                  Share a branded form. Customers respond in writing, record a
                  webcam video, or send an audio note.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 pt-4 border-t border-line/60 text-xs font-medium text-brand-700">
                <span>Text, video, audio & ratings</span>
              </div>
            </div>

            {/* Step 2 Card */}
            <div className="card flex flex-col justify-between border-brand-200 bg-brand-50/30 p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-500 font-mono text-sm font-bold text-white">
                    02
                  </span>
                  <span className="chip bg-white text-brand-700 border-brand-200">
                    Moderation
                  </span>
                </div>
                <h3 className="heading-md">Manage & approve</h3>
                <p className="muted">
                  Submissions land in your inbox. Review content, verify customer
                  details, assign tags, and approve for display.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 pt-4 border-t border-line/60 text-xs font-medium text-brand-700">
                <span>Editorial control & tag taxonomy</span>
              </div>
            </div>

            {/* Step 3 Card */}
            <div className="card flex flex-col justify-between border-brand-200 bg-brand-50/30 p-6">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="grid size-9 place-items-center rounded-xl bg-brand-500 font-mono text-sm font-bold text-white">
                    03
                  </span>
                  <span className="chip bg-white text-brand-700 border-brand-200">
                    Publishing
                  </span>
                </div>
                <h3 className="heading-md">Publish anywhere</h3>
                <p className="muted">
                  Drop responsive widgets into any website, documentation site,
                  or build a standalone Wall of Love.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 pt-4 border-t border-line/60 text-xs font-medium text-brand-700">
                <span>Grid, Carousel, Quote cards & Wall</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Step 1 Deep Dive */}
      <Section id="step-1" tone="muted">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="tag">Step 01</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Capture Customer Sentiment
              </span>
            </div>
            <h2 className="heading-lg">
              Collect customer feedback in every format
            </h2>
            <p className="lead">
              Customers have different preferences: some prefer writing a concise
              paragraph, some want to speak freely into their microphone, and
              others are happy to record a quick webcam video. Praise handles
              all three within a single form.
            </p>

            <div className="flex flex-col gap-3">
              <div className="surface p-4 flex gap-3.5 items-start">
                <span className="icon-tile shrink-0">
                  <Type size={18} />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-ink-900">
                    Text submissions & structured questions
                  </h4>
                  <p className="muted mt-1 text-xs">
                    Ask tailored questions such as &quot;What changed after using our
                    product?&quot; or &quot;What would you tell someone considering us?&quot;
                    paired with star ratings.
                  </p>
                </div>
              </div>

              <div className="surface p-4 flex gap-3.5 items-start">
                <span className="icon-tile shrink-0">
                  <Video size={18} />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-ink-900">
                    Seamless in-browser video recording
                  </h4>
                  <p className="muted mt-1 text-xs">
                    Zero third-party apps required. Customers record straight
                    from their browser with countdown timer, mic preview, and
                    instant re-record options.
                  </p>
                </div>
              </div>

              <div className="surface p-4 flex gap-3.5 items-start">
                <span className="icon-tile shrink-0">
                  <AudioLines size={18} />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-ink-900">
                    Voice notes for camera-shy respondents
                  </h4>
                  <p className="muted mt-1 text-xs">
                    Voice notes eliminate camera friction while capturing
                    authentic vocal enthusiasm and nuance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 1 Visual Representation */}
          <div className="surface overflow-hidden shadow-sm">
            <div className="border-b border-line bg-warm-50 px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-900">
                praise.yourdomain.com/collect/core
              </span>
              <span className="chip text-[11px]">Live Form Preview</span>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div>
                <span className="text-xs font-semibold text-ink-700">
                  Share your experience with Acme Corp
                </span>
                <p className="text-xs text-ink-400 mt-0.5">
                  Your feedback helps others make informed decisions.
                </p>
              </div>

              <div className="flex gap-2">
                <span className="chip border-brand-200 bg-brand-50 text-brand-700 text-xs font-medium">
                  <Type size={12} /> Text
                </span>
                <span className="chip text-xs">
                  <Video size={12} /> Video
                </span>
                <span className="chip text-xs">
                  <AudioLines size={12} /> Audio Note
                </span>
              </div>

              <div className="rounded-xl border border-line bg-warm-50 p-4">
                <span className="text-xs font-medium text-ink-700 block">
                  How has Praise improved your social proof workflow?
                </span>
                <div className="mt-2 h-16 rounded-lg border border-line bg-white p-2.5 text-xs text-ink-400">
                  &quot;Deploying Praise on our own VM gave us 100% control over our
                  customer video files with zero recurring per-video fees...&quot;
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={15}
                      className="fill-amber-400 text-amber-400"
                    />
                  ))}
                  <span className="text-xs text-ink-500 ml-1">5.0</span>
                </div>
                <span className="btn btn-primary btn-sm">Submit feedback</span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Step 2 Deep Dive */}
      <Section id="step-2" tone="white">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Step 2 Visual Representation */}
          <div className="surface overflow-hidden shadow-sm order-2 lg:order-1">
            <div className="border-b border-line bg-warm-50 px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-900">
                Praise Dashboard &mdash; Moderation Queue
              </span>
              <div className="flex items-center gap-2">
                <span className="chip text-[11px]">
                  <Filter size={11} /> 1 Pending
                </span>
              </div>
            </div>

            <div className="p-4 flex flex-col gap-3">
              {/* Row 1: Pending item */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3.5 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="chip bg-white border-amber-300 text-amber-800 text-[11px]">
                      Pending Review
                    </span>
                    <span className="tag">#enterprise</span>
                  </div>
                  <span className="text-[11px] text-ink-400">2 hours ago</span>
                </div>
                <div className="text-xs text-ink-700">
                  <span className="font-semibold text-ink-900">Alex Reed</span> &bull; CTO at ScaleFlow
                  <p className="mt-1 text-ink-500 italic">
                    &quot;Having our video testimonials hosted on our own MinIO bucket
                    complies with our data security policies effortlessly.&quot;
                  </p>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-200/60">
                  <span className="btn btn-secondary btn-sm h-7 text-xs px-2.5 text-ink-700">
                    <X size={12} className="text-red-500" /> Reject
                  </span>
                  <span className="btn btn-primary btn-sm h-7 text-xs px-2.5">
                    <Check size={12} /> Approve Testimonial
                  </span>
                </div>
              </div>

              {/* Row 2: Approved item */}
              <div className="rounded-xl border border-line bg-white p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="chip border-emerald-200 bg-emerald-50 text-emerald-800 text-[11px]">
                      Approved
                    </span>
                    <span className="tag">#speed</span>
                  </div>
                  <span className="text-xs font-medium text-ink-900 mt-1 block">
                    Sarah Jenkins &bull; Product Lead
                  </span>
                </div>
                <span className="chip text-xs">Video &bull; 0:42</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 order-1 lg:order-2">
            <div className="flex items-center gap-2">
              <span className="tag">Step 02</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Editorial Control & Organization
              </span>
            </div>
            <h2 className="heading-lg">
              Manage, verify, and approve testimonials
            </h2>
            <p className="lead">
              Nothing touches your public website without deliberate editorial
              approval. Praise gives your team a clean moderation cockpit to
              review quotes, play media, and categorize submissions.
            </p>

            <div className="flex flex-col gap-3">
              <div className="surface p-4 flex gap-3.5 items-start">
                <span className="icon-tile shrink-0">
                  <ShieldCheck size={18} />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-ink-900">
                    Never publish without approval
                  </h4>
                  <p className="muted mt-1 text-xs">
                    Submissions are kept strictly private in Pending status until
                    an administrator or team member explicitly clicks Approve.
                  </p>
                </div>
              </div>

              <div className="surface p-4 flex gap-3.5 items-start">
                <span className="icon-tile shrink-0">
                  <Sliders size={18} />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-ink-900">
                    Multi-dimensional tag taxonomy
                  </h4>
                  <p className="muted mt-1 text-xs">
                    Tag entries by customer type (e.g. <code>#enterprise</code>,
                    <code>#startup</code>), feature focus (<code>#api</code>,
                    <code>#support</code>), or funnel stage for targeted widgets.
                  </p>
                </div>
              </div>

              <div className="surface p-4 flex gap-3.5 items-start">
                <span className="icon-tile shrink-0">
                  <Search size={18} />
                </span>
                <div>
                  <h4 className="text-sm font-semibold text-ink-900">
                    Search and filter across your entire archive
                  </h4>
                  <p className="muted mt-1 text-xs">
                    Find any customer quote by keyword, reviewer company, star
                    rating, or media format instantly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Step 3 Deep Dive */}
      <Section id="step-3" tone="muted">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-2">
              <span className="tag">Step 03</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Display & Conversion
              </span>
            </div>
            <h2 className="heading-lg">
              Publish on websites and marketing channels
            </h2>
            <p className="lead">
              Display your approved social proof anywhere your audience makes
              decisions. Embed widgets into landing pages, blogs, or link to a
              full-page Wall of Love.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="card p-4">
                <span className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <Grid3x3 size={16} className="text-brand-600" />
                  Grid Layout
                </span>
                <p className="muted mt-1.5 text-xs">
                  Clean card columns for product landing pages and documentation.
                </p>
              </div>

              <div className="card p-4">
                <span className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <Rows3 size={16} className="text-brand-600" />
                  Carousel Layout
                </span>
                <p className="muted mt-1.5 text-xs">
                  Space-efficient sliding carousel for headers and feature cards.
                </p>
              </div>

              <div className="card p-4">
                <span className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <MessageSquareQuote size={16} className="text-brand-600" />
                  Quote Cards
                </span>
                <p className="muted mt-1.5 text-xs">
                  Punchy highlighted quotes paired next to pricing tiers.
                </p>
              </div>

              <div className="card p-4">
                <span className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <GalleryHorizontal size={16} className="text-brand-600" />
                  Wall of Love
                </span>
                <p className="muted mt-1.5 text-xs">
                  A comprehensive dedicated page showcasing every piece of praise.
                </p>
              </div>
            </div>

            <div className="pt-2">
              <Link href="/developers" className="link text-sm">
                Learn how to customize embed styling and SDKs &rarr;
              </Link>
            </div>
          </div>

          {/* Step 3 Visual Representation */}
          <div className="surface overflow-hidden shadow-sm">
            <div className="border-b border-line bg-warm-50 px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-semibold text-ink-900">
                Embed Snippet
              </span>
              <span className="chip text-[11px]">Copy & Paste</span>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="rounded-xl border border-line bg-warm-50 p-3.5 font-mono text-xs text-ink-800 overflow-x-auto">
                <span className="text-brand-600">&lt;script</span>
                <br />
                &nbsp;&nbsp;src=
                <span className="text-emerald-700">
                  &quot;https://praise.example.com/widget.js&quot;
                </span>
                <br />
                &nbsp;&nbsp;data-widget=
                <span className="text-emerald-700">&quot;grid&quot;</span>
                <br />
                &nbsp;&nbsp;data-tag=
                <span className="text-emerald-700">&quot;homepage&quot;</span>
                <br />
                <span className="text-brand-600">&gt;&lt;/script&gt;</span>
              </div>

              <div className="rounded-xl border border-line bg-white p-4">
                <span className="text-xs font-semibold text-ink-500 uppercase tracking-wider block mb-3">
                  Rendered Result
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-line bg-warm-50/50 p-3 text-[11px]">
                    <div className="flex text-amber-400 text-xs mb-1">★★★★★</div>
                    <p className="text-ink-700 italic">
                      &quot;Migrated from our legacy SaaS in 10 minutes.&quot;
                    </p>
                    <span className="mt-2 block font-semibold text-ink-900">
                      David Chen
                    </span>
                  </div>
                  <div className="rounded-lg border border-line bg-warm-50/50 p-3 text-[11px]">
                    <div className="flex text-amber-400 text-xs mb-1">★★★★★</div>
                    <p className="text-ink-700 italic">
                      &quot;The audio notes feature doubled our response rate.&quot;
                    </p>
                    <span className="mt-2 block font-semibold text-ink-900">
                      Elena Rostova
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Bottom CTA */}
      <Section tone="lavender">
        <div className="surface flex flex-col items-center gap-6 px-6 py-12 text-center sm:px-10 sm:py-16">
          <span className="eyebrow">Ready for effortless social proof?</span>
          <h2 className="heading-lg max-w-2xl">
            Put the Praise workflow to work on your site
          </h2>
          <p className="lead max-w-xl">
            Set up your instance today and start receiving genuine customer video
            and written proof without paywalls or volume limits.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/dashboard" variant="primary" size="lg">
              Get started with Praise
              <ArrowRight size={17} />
            </ButtonLink>
            <ButtonLink href="/self-host" variant="secondary" size="lg">
              Explore self-hosting options
            </ButtonLink>
          </div>
        </div>
      </Section>
    </div>
  );
}
