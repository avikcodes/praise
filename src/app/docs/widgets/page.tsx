import {
  GalleryHorizontal,
  Grid3x3,
  List as ListIcon,
  MessageSquareQuote,
  Rows3,
  Video,
} from "lucide-react";
import { Breadcrumbs } from "@/components/docs/breadcrumbs";
import { TableOfContents, type TocItem } from "@/components/docs/toc";
import { DocsPager } from "@/components/docs/pager";
import { CodeBlock } from "@/components/docs/code-block";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Widget Documentation — Grid, Carousel, Quote, List, JS & iframe Embeds",
  description:
    "Comprehensive guide to Praise widgets: Grid, Carousel, Single Quote, List, Wall of Love, JavaScript embedding loader, iframe embedding with auto-height adjustment, and theme customization.",
  path: "/docs/widgets",
});

const tocItems: TocItem[] = [
  { id: "available-types", title: "1. Core Widget Types" },
  { id: "grid-layout", title: "2. Grid Layout" },
  { id: "carousel-layout", title: "3. Carousel Slider Layout" },
  { id: "quote-layout", title: "4. Single Quote Cards" },
  { id: "list-layout", title: "5. List Layout" },
  { id: "video-audio-cards", title: "6. Video & Audio Playback" },
  { id: "wall-of-love", title: "7. Standalone Wall of Love" },
  { id: "themes-tokens", title: "8. Themes & Design Tokens" },
  { id: "responsive-behavior", title: "9. Container Queries & Sizing" },
  { id: "javascript-embed", title: "10. JavaScript Widget Embedding" },
  { id: "iframe-embed", title: "11. iframe Embedding (Auto-Height)" },
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
            Publish customer testimonials across your website, marketing landing
            pages, and documentation. Praise provides four distinct widget
            layouts, standalone Walls of Love, lightweight JavaScript embed
            loaders, and responsive iframe embeds with auto-height resizing.
          </p>
        </div>

        {/* 1. Available Widget Types */}
        <section id="available-types" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">1. Core Widget Types</h2>
          <p className="muted text-sm leading-relaxed mb-4">
            Praise includes four purposeful widget presentation types designed
            specifically for modern web layouts:
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 my-4">
            <div className="surface p-4 flex flex-col gap-2">
              <span className="icon-tile">
                <Grid3x3 size={18} />
              </span>
              <h4 className="font-semibold text-ink-900 text-sm">Grid</h4>
              <p className="muted text-xs">
                Multi-column card layout that adapts from 1 to 3 columns based on
                container width. Perfect for feature and pricing pages.
              </p>
            </div>

            <div className="surface p-4 flex flex-col gap-2">
              <span className="icon-tile">
                <Rows3 size={18} />
              </span>
              <h4 className="font-semibold text-ink-900 text-sm">Carousel</h4>
              <p className="muted text-xs">
                Horizontal sliding slider with arrow controls and pagination dots.
                Ideal for hero sections and limited-height blocks.
              </p>
            </div>

            <div className="surface p-4 flex flex-col gap-2">
              <span className="icon-tile">
                <MessageSquareQuote size={18} />
              </span>
              <h4 className="font-semibold text-ink-900 text-sm">Single Quote</h4>
              <p className="muted text-xs">
                Focused testimonial callout highlighting a high-impact customer
                sentence with avatar and verification badge.
              </p>
            </div>

            <div className="surface p-4 flex flex-col gap-2">
              <span className="icon-tile">
                <ListIcon size={18} />
              </span>
              <h4 className="font-semibold text-ink-900 text-sm">List</h4>
              <p className="muted text-xs">
                Clean vertical stream of reviews with dividers. Fits naturally in
                sidebars, blog posts, and documentation.
              </p>
            </div>

            <div className="surface p-4 flex flex-col gap-2">
              <span className="icon-tile">
                <Video size={18} />
              </span>
              <h4 className="font-semibold text-ink-900 text-sm">Video &amp; Audio</h4>
              <p className="muted text-xs">
                Inline responsive video player (WebM/MP4) with custom playback
                controls and duration indicators.
              </p>
            </div>

            <div className="surface p-4 flex flex-col gap-2">
              <span className="icon-tile">
                <GalleryHorizontal size={18} />
              </span>
              <h4 className="font-semibold text-ink-900 text-sm">Wall of Love</h4>
              <p className="muted text-xs">
                Dedicated standalone public page (<code>/w/:slug</code>) celebrating
                all approved customer feedback in a masonry stream.
              </p>
            </div>
          </div>
        </section>

        {/* 2. Grid Layout */}
        <section id="grid-layout" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">2. Grid Layout</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            The Grid widget arranges customer testimonials into structured cards.
            Using CSS Container Queries, it transitions seamlessly:
          </p>
          <ul className="list-disc pl-5 text-xs text-ink-600 space-y-1 mb-4">
            <li><strong>&lt; 500px:</strong> 1 column (mobile stack)</li>
            <li><strong>500px &ndash; 850px:</strong> 2 columns (tablet)</li>
            <li><strong>&gt; 850px:</strong> 3 columns (desktop)</li>
          </ul>

          <CodeBlock
            language="html"
            filename="Grid Widget Markup"
            code={`<!-- Container element where the widget will mount -->
<div id="praise-grid-container"></div>

<!-- Praise JavaScript Widget Loader -->
<script
  src="https://praise.yourdomain.com/embed.js"
  data-widget-id="cm3b1x..."
  data-container="#praise-grid-container"
  async>
</script>`}
          />
        </section>

        {/* 3. Carousel Slider Layout */}
        <section id="carousel-layout" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">3. Carousel Slider Layout</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            The Carousel widget displays customer cards horizontally. It supports
            touch swipe gestures on mobile, previous/next button navigation, and
            full keyboard support (arrow keys) with accessible ARIA announcements.
          </p>
        </section>

        {/* 4. Single Quote Cards */}
        <section id="quote-layout" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">4. Single Quote Cards</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Single quote cards are designed for high-conversion placements
            directly next to sign-up buttons, pricing tiers, or checkout forms.
            They emphasize customer words with large quotation marks and an
            author credential badge.
          </p>
        </section>

        {/* 5. List Layout */}
        <section id="list-layout" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">5. List Layout</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            The List widget arranges feedback vertically with clean horizontal
            dividers, optimal for compact columns, documentation sidebars, or
            case study sections.
          </p>
        </section>

        {/* 6. Video & Audio Playback */}
        <section id="video-audio-cards" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">6. Video &amp; Audio Playback</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Video testimonials record in WebM or MP4 format and stream directly
            from your self-hosted media storage. Widgets render native HTML5
            video elements with poster frames and full play/pause controls. Audio
            notes render with waveform playback indicators.
          </p>
        </section>

        {/* 7. Standalone Wall of Love */}
        <section id="wall-of-love" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">7. Standalone Wall of Love</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Every project has a dedicated public URL:
          </p>
          <div className="surface p-3 font-mono text-xs my-2">
            <code>https://praise.yourdomain.com/w/:project_slug</code>
          </div>
          <p className="muted text-xs leading-relaxed">
            The Wall of Love aggregates all approved reviews for that project
            with real-time tag filtering, star-rating filters, and a &quot;Submit
            Your Feedback&quot; link.
          </p>
        </section>

        {/* 8. Themes & Design Tokens */}
        <section id="themes-tokens" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">8. Themes &amp; Design Tokens</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Praise widgets support four theme modes (<code>LIGHT</code>, <code>DARK</code>, <code>WARM</code>, and <code>AUTO</code>):
          </p>

          <div className="surface overflow-hidden divide-y divide-line text-xs my-3">
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-28 shrink-0">LIGHT</code>
              <span className="text-ink-600">Clean crisp white card backgrounds with high-contrast slate text.</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-28 shrink-0">DARK</code>
              <span className="text-ink-600">Dark charcoal card backgrounds (#18181b) with light ink text.</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-28 shrink-0">WARM</code>
              <span className="text-ink-600">Editorial soft-amber surface (#fdfcf8) with rich coffee text.</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-28 shrink-0">AUTO</code>
              <span className="text-ink-600">Automatically follows visitor device preferences via <code>prefers-color-scheme</code>.</span>
            </div>
          </div>
        </section>

        {/* 9. Container Queries & Sizing */}
        <section id="responsive-behavior" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">9. Container Queries &amp; Sizing</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            Praise widgets are built with CSS Container Queries. Rather than
            querying the entire browser viewport (<code>@media</code>), cards
            adjust based on their specific parent <code>&lt;div&gt;</code> container width.
            This ensures that a widget placed inside a 300px sidebar renders
            perfectly without overlapping.
          </p>
        </section>

        {/* 10. JavaScript Widget Embedding */}
        <section id="javascript-embed" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">10. JavaScript Widget Embedding</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            The JavaScript embed loader is the recommended integration method for
            custom websites, Webflow, WordPress, and Shopify:
          </p>

          <CodeBlock
            language="html"
            filename="HTML Snippet"
            code={`<!-- 1. Target Container -->
<div id="praise-widget"></div>

<!-- 2. Praise Embed Loader -->
<script
  src="https://praise.yourdomain.com/embed.js"
  data-widget-id="wid_88fa12c9"
  data-container="#praise-widget"
  async>
</script>`}
          />

          <h4 className="font-semibold text-ink-900 text-xs mt-4 mb-2">Supported Data Attributes:</h4>
          <div className="surface overflow-hidden divide-y divide-line text-xs">
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-36 shrink-0">data-widget-id</code>
              <span className="text-ink-600">The unique identifier of your saved Praise widget configuration.</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-36 shrink-0">data-container</code>
              <span className="text-ink-600">CSS selector for the mounting container (e.g. <code>#praise-widget</code>).</span>
            </div>
            <div className="p-3 flex items-start gap-3">
              <code className="font-semibold text-ink-900 w-36 shrink-0">data-theme</code>
              <span className="text-ink-600">Optional theme override: <code>light</code>, <code>dark</code>, <code>warm</code>, or <code>auto</code>.</span>
            </div>
          </div>
        </section>

        {/* 11. iframe Embedding */}
        <section id="iframe-embed" className="mb-12 scroll-mt-24">
          <h2 className="heading-lg text-2xl mb-3">11. iframe Embedding (Auto-Height)</h2>
          <p className="muted text-sm leading-relaxed mb-3">
            When embedding inside platforms that restrict custom JavaScript (such
            as Notion, Wix, or strict intranet sites), use the dedicated public
            iframe route:
          </p>

          <div className="surface p-3 font-mono text-xs my-2">
            <code>https://praise.yourdomain.com/embed/:widget_id</code>
          </div>

          <p className="muted text-xs leading-relaxed my-3">
            Praise iframes emit a <code>praise-resize</code> postMessage event
            whenever cards render or viewport dimensions change, allowing the
            parent page to dynamically adjust iframe height without scrollbars:
          </p>

          <CodeBlock
            language="html"
            filename="Responsive iframe with Auto-Height"
            code={`<iframe
  id="praise-iframe-wid_88fa12c9"
  src="https://praise.yourdomain.com/embed/wid_88fa12c9?theme=auto"
  width="100%"
  height="600"
  frameborder="0"
  scrolling="no"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
  style="border: none; max-width: 100%; width: 100%; display: block;"
  title="Customer Testimonials">
</iframe>

<script>
  window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'praise-resize' && event.data.widgetId === 'wid_88fa12c9') {
      var iframe = document.getElementById('praise-iframe-wid_88fa12c9');
      if (iframe && event.data.height) {
        iframe.style.height = event.data.height + 'px';
      }
    }
  });
</script>`}
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
