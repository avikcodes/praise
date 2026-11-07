import {
  GalleryHorizontal,
  Grid3x3,
  Layers,
  MessageSquareQuote,
  Rows3,
  Video,
} from "lucide-react";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { TableOfContents, type TocItem } from "@/components/docs/toc";
import { DocsPager } from "@/components/docs/pager";
import { CodeBlock } from "@/components/docs/code-block";
import { StatusBadge } from "@/components/ui/status-badge";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Widget Documentation — Grid, Carousel, Wall of Love & Embeds",
  description:
    "Comprehensive guide to Praise widgets: Grid, Carousel, Masonry, Quote cards, Video/Audio cards, Wall of Love, CSS token styling, and React/Next.js integration.",
  path: "/docs/widgets",
});

const tocItems: TocItem[] = [
  { id: "available-types", title: "Available Widget Types" },
  { id: "grid-masonry", title: "Grid & Masonry Layouts" },
  { id: "carousel", title: "Horizontal Carousel Slider" },
  { id: "quote-cards", title: "Quote Cards (Pull Quotes)" },
  { id: "video-audio-cards", title: "Video & Audio Media Cards" },
  { id: "wall-of-love", title: "Dedicated Wall of Love" },
  { id: "customization-tokens", title: "Widget Customization & CSS Tokens" },
  { id: "themes", title: "Themes (Light, Dark & Auto)" },
  { id: "colors-typography", title: "Colors & Typography Rules" },
  { id: "responsive-behavior", title: "Responsive Behavior" },
  { id: "embedding-script", title: "Embedding via Script Tag" },
  { id: "react-nextjs", title: "React & Next.js Integration (Planned)" },
];

export default function WidgetsDocsPage() {
  return (
    <div className="flex flex-col xl:flex-row xl:gap-10">
      <article className="flex-1 min-w-0">
        <Breadcrumbs
          crumbs={[
            { label: "Overview", href: "/docs" },
            { label: "Widgets & Embedding" },
          ]}
        />

        <div className="mb-8 border-b border-line pb-6">
          <span className="eyebrow mb-2">Display &amp; Publishing</span>
          <h1 className="display text-3xl sm:text-4xl">Widget Documentation</h1>
          <p className="lead mt-3 text-base text-ink-600">
            Publish your customer testimonials across landing pages, blogs, and
            documentation. Learn about our layout options, CSS tokens, themes,
            and embedding mechanisms.
          </p>
        </div>

        {/* 1. Available Widget Types */}
        <section id="available-types" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">1. Available Widget Types</h2>
          <p className="muted text-sm leading-relaxed mb-4">
            Praise provides multiple responsive presentation styles designed for
            different parts of your marketing website:
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 my-4">
            <div className="surface p-4 flex flex-col gap-2">
              <span className="icon-tile">
                <Grid3x3 size={18} />
              </span>
              <h4 className="font-semibold text-ink-900 text-sm">Grid</h4>
              <p className="muted text-xs">
                Multi-column card layout responsive across phone, tablet, and desktop.
              </p>
            </div>

            <div className="surface p-4 flex flex-col gap-2">
              <span className="icon-tile">
                <Rows3 size={18} />
              </span>
              <h4 className="font-semibold text-ink-900 text-sm">Carousel</h4>
              <p className="muted text-xs">
                Horizontal sliding carousel for hero sections and limited-width blocks.
              </p>
            </div>

            <div className="surface p-4 flex flex-col gap-2">
              <span className="icon-tile">
                <Layers size={18} />
              </span>
              <h4 className="font-semibold text-ink-900 text-sm">Masonry</h4>
              <p className="muted text-xs">
                Dynamic variable-height column layout that eliminates empty vertical gaps.
              </p>
            </div>

            <div className="surface p-4 flex flex-col gap-2">
              <span className="icon-tile">
                <MessageSquareQuote size={18} />
              </span>
              <h4 className="font-semibold text-ink-900 text-sm">Quote Cards</h4>
              <p className="muted text-xs">
                Minimal pull quotes highlighting a single punchy sentence next to pricing.
              </p>
            </div>

            <div className="surface p-4 flex flex-col gap-2">
              <span className="icon-tile">
                <Video size={18} />
              </span>
              <h4 className="font-semibold text-ink-900 text-sm">Video & Audio</h4>
              <p className="muted text-xs">
                Rich cards with inline playable video controls and audiogram playback.
              </p>
            </div>

            <div className="surface p-4 flex flex-col gap-2">
              <span className="icon-tile">
                <GalleryHorizontal size={18} />
              </span>
              <h4 className="font-semibold text-ink-900 text-sm">Wall of Love</h4>
              <p className="muted text-xs">
                Dedicated standalone page showcasing every approved customer review.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Grid & Masonry Layouts */}
        <section id="grid-masonry" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">2. Grid &amp; Masonry Layouts</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            <strong>Grid:</strong> Arranges cards in 1, 2, or 3 columns with
            uniform row heights. Best suited for landing pages with balanced
            quote lengths.
          </p>
          <p className="muted text-sm leading-relaxed mb-3">
            <strong>Masonry:</strong> Organizes cards in columns where each card
            expands to match its natural text length. Ideal when mixing short
            sentences with multi-paragraph case studies.
          </p>

          <CodeBlock
            language="html"
            filename="Grid Embed Example"
            code={`<!-- Render a 3-column Grid filtered by tag -->
<div id="testimonials-grid"></div>
<script
  src="https://praise.yourdomain.com/embed.js"
  data-container="#testimonials-grid"
  data-widget="grid"
  data-columns="3"
  data-tag="homepage"
  async>
</script>`}
          />
        </section>

        {/* 3. Horizontal Carousel Slider */}
        <section id="carousel" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">3. Horizontal Carousel Slider</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            The carousel displays one or two cards at a time with previous/next
            arrow navigation and dot indicators. It supports touch swipe on
            mobile and keyboard arrow navigation for accessibility.
          </p>

          <CodeBlock
            language="html"
            filename="Carousel Embed Example"
            code={`<!-- Horizontal Carousel with auto-advance -->
<div id="testimonials-carousel"></div>
<script
  src="https://praise.yourdomain.com/embed.js"
  data-container="#testimonials-carousel"
  data-widget="carousel"
  data-autoplay="false"
  data-theme="light"
  async>
</script>`}
          />
        </section>

        {/* 4. Quote Cards */}
        <section id="quote-cards" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">4. Quote Cards (Pull Quotes)</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Quote cards are streamlined single-item embeds. They render a
            prominent quotation glyph, the customer quote, author name, company,
            and star rating with minimal padding.
          </p>
          <p className="muted text-sm leading-relaxed">
            Use quote cards next to signup forms, within pricing table tiers
            (&quot;Pro Plan&quot;), or alongside feature deep-dives.
          </p>
        </section>

        {/* 5. Video & Audio Cards */}
        <section id="video-audio-cards" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">5. Video &amp; Audio Media Cards</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Media cards feature native HTML5 video and audio players styled to
            match your theme:
          </p>
          <ul className="list-disc pl-5 text-sm text-ink-600 space-y-1 mb-3">
            <li>
              <strong>Video:</strong> Custom poster thumbnail, inline play/pause
              button, volume toggle, and full-screen option.
            </li>
            <li>
              <strong>Audio Notes:</strong> Waveform visualizer, duration timer,
              and synchronized written transcript.
            </li>
          </ul>
        </section>

        {/* 6. Dedicated Wall of Love */}
        <section id="wall-of-love" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">6. Dedicated Wall of Love</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            A Wall of Love is a full-page social proof gallery. You can link to
            it as a standalone URL (e.g.{" "}
            <code>https://praise.yourdomain.com/wall/my-product</code>) or embed
            it into a dedicated <code>/wall-of-love</code> page on your main site.
          </p>
          <p className="muted text-sm leading-relaxed">
            It includes interactive category filter buttons so prospective
            customers can sort by topic, star rating, or format.
          </p>
        </section>

        {/* 7. Widget Customization & CSS Tokens */}
        <section id="customization-tokens" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">
            7. Widget Customization &amp; CSS Tokens
          </h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Praise widgets inherit styles through CSS custom properties. You can
            override these variables in your parent stylesheet:
          </p>

          <CodeBlock
            language="css"
            filename="styles.css"
            code={`/* Custom Praise Widget Theme Variables */
:root {
  --praise-bg: #ffffff;
  --praise-border: #e7e3da;
  --praise-text-primary: #1b1a18;
  --praise-text-muted: #6b675f;
  --praise-accent: #7049d8;
  --praise-star-color: #f59e0b;
  --praise-radius: 1rem;
  --praise-font-family: var(--font-geist-sans), sans-serif;
}`}
          />
        </section>

        {/* 8. Themes */}
        <section id="themes" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">8. Themes (Light, Dark &amp; Auto)</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Set the <code>data-theme</code> attribute on your script tag:
          </p>
          <div className="surface overflow-hidden divide-y divide-line text-xs my-3">
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-24 shrink-0">data-theme=&quot;light&quot;</code>
              <span className="text-ink-600">Forces warm white surfaces and dark ink text.</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-24 shrink-0">data-theme=&quot;dark&quot;</code>
              <span className="text-ink-600">Forces dark charcoal surfaces with white and muted text.</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-24 shrink-0">data-theme=&quot;auto&quot;</code>
              <span className="text-ink-600">Detects OS preference via <code>prefers-color-scheme</code>.</span>
            </div>
          </div>
        </section>

        {/* 9. Colors & Typography Rules */}
        <section id="colors-typography" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">9. Colors &amp; Typography Rules</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Praise widgets are designed with zero forced web fonts. By default,
            widgets adopt system fonts or inherit the <code>font-family</code> of
            the host container. This prevents layout shifts (CLS) and extra HTTP
            requests.
          </p>
        </section>

        {/* 10. Responsive Behavior */}
        <section id="responsive-behavior" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">10. Responsive Behavior</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Widgets use CSS Container Queries (<code>@container</code>). Rather
            than sizing based on the entire browser window, widgets
            automatically adapt their column counts based on the width of their
            parent container:
          </p>
          <ul className="list-disc pl-5 text-xs text-ink-600 space-y-1 mb-4">
            <li><strong>&lt; 500px:</strong> Single column stacked cards</li>
            <li><strong>500px &ndash; 800px:</strong> 2 columns</li>
            <li><strong>&gt; 800px:</strong> 3 columns (or configured count)</li>
          </ul>
        </section>

        {/* 11. Embedding via Script Tag */}
        <section id="embedding-script" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">11. Embedding via Script Tag</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            The lightweight script loader is the official production embed
            mechanism:
          </p>

          <CodeBlock
            language="html"
            filename="Complete Embed Snippet"
            code={`<div id="customer-proof"></div>
<script
  src="https://praise.yourdomain.com/embed.js"
  data-container="#customer-proof"
  data-widget="grid"
  data-tag="enterprise"
  data-theme="auto"
  async>
</script>`}
          />
        </section>

        {/* 12. React & Next.js Integration */}
        <section id="react-nextjs" className="mb-12 scroll-mt-24">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="heading-lg text-2xl">12. React &amp; Next.js Integration</h2>
            <StatusBadge status="planned" label="Planned" />
          </div>
          <p className="muted text-sm leading-relaxed mb-3">
            Native React and Next.js Server Component wrappers are planned for
            the Complete Release. When released, you will be able to install:
          </p>

          <CodeBlock
            language="bash"
            filename="Planned npm Package"
            code={`# Planned package
npm install @praise/react`}
          />

          <CodeBlock
            language="tsx"
            filename="Planned Component Usage"
            code={`// Planned Next.js Server Component
import { PraiseWall } from "@praise/react";

export default function PricingPage() {
  return (
    <section>
      <h2>What our customers say</h2>
      <PraiseWall
        endpoint="https://praise.yourdomain.com"
        tag="pricing"
        layout="grid"
      />
    </section>
  );
}`}
          />
        </section>

        <DocsPager
          prev={{
            title: "Getting Started Guide",
            href: "/docs/getting-started",
          }}
          next={{
            title: "REST API Reference",
            href: "/docs/api-reference",
          }}
        />
      </article>

      <TableOfContents items={tocItems} />
    </div>
  );
}
