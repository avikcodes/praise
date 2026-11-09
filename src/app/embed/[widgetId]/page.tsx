import { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { parseCustomerMeta } from "@/lib/customers/utils";
import { parseWidgetConfig } from "@/lib/widgets/utils";
import { WidgetRenderer, EmbedResizeListener } from "@/components/widgets";
import { PublicTestimonialCard } from "@/types/widgets";
import { recordAnalyticsEvent } from "@/lib/analytics/tracker";
import { Prisma } from "@prisma/client";

type EmbedPageProps = {
  params: Promise<{ widgetId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const metadata: Metadata = {
  title: "Praise Testimonial Widget",
  description: "Embeddable customer testimonials powered by Praise.",
  robots: {
    index: false,
    follow: false,
  },
};

const devFallbackCards: PublicTestimonialCard[] = [
  {
    id: "demo-1",
    content:
      "Praise completely transformed how we showcase social proof. Conversions increased by 24% in the first two weeks of launch.",
    rating: 5,
    type: "TEXT",
    isFeatured: true,
    submittedAt: new Date().toISOString(),
    customer: {
      name: "Sarah Chen",
      company: "HyperScale",
      title: "Head of Growth",
      avatarUrl: null,
      website: "https://hyperscale.so",
    },
    tags: ["High NPS", "Conversion"],
    source: "Verified Review",
    media: [],
  },
  {
    id: "demo-2",
    content:
      "Collecting video testimonials used to be a nightmare of scheduling calls. With Praise, our users simply record directly in the browser.",
    rating: 5,
    type: "VIDEO",
    isFeatured: false,
    submittedAt: new Date(Date.now() - 86400000).toISOString(),
    customer: {
      name: "Marcus Vance",
      company: "Relay Cloud",
      title: "VP of Product",
      avatarUrl: null,
      website: "https://relay.io",
    },
    tags: ["Video Feedback", "Productivity"],
    source: "Verified Review",
    media: [],
  },
  {
    id: "demo-3",
    content:
      "The easiest setup we've ever experienced. Our customers love the seamless submission flow, and widgets blend into our design perfectly.",
    rating: 5,
    type: "TEXT",
    isFeatured: false,
    submittedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    customer: {
      name: "Elena Rostova",
      company: "Vanguard Design",
      title: "Design Director",
      avatarUrl: null,
      website: "https://vanguard.studio",
    },
    tags: ["UX", "Design"],
    source: "Verified Review",
    media: [],
  },
];

export default async function EmbedWidgetPage({
  params,
  searchParams,
}: EmbedPageProps) {
  const { widgetId } = await params;
  const sParams = await searchParams;

  const typeParam = typeof sParams.type === "string" ? sParams.type : null;
  const themeParam = typeof sParams.theme === "string" ? sParams.theme : null;
  const accentParam = typeof sParams.accent === "string" ? sParams.accent : null;
  const instanceIdParam = typeof sParams.instanceId === "string" ? sParams.instanceId : null;
  const originParam = typeof sParams.origin === "string" ? sParams.origin : null;

  let testimonials: PublicTestimonialCard[] = [];
  let widgetType = typeParam || "grid";
  let theme = (themeParam as "warm" | "light" | "dark" | "transparent") || "transparent";
  let accentColor = accentParam || "#7049D8";
  let showRatings = true;
  let showCompany = true;
  let showAvatar = true;
  let showDate = true;
  let showTags = true;
  let allowVideoPlayback = true;
  let widgetFound = false;
  let queryError = false;

  try {
    const cleanId = widgetId.trim().toLowerCase();

    // 1. Locate widget by ID or slug in configJson
    let widget = await prisma.widget.findFirst({
      where: {
        OR: [
          { id: cleanId },
          { configJson: { contains: `"slug":"${cleanId}"` } },
        ],
      },
    });

    if (!widget) {
      // Check project slug
      const matchedProject = await prisma.project.findFirst({
        where: { slug: cleanId },
      });
      if (matchedProject) {
        widget = await prisma.widget.findFirst({
          where: { projectId: matchedProject.id, workspaceId: matchedProject.workspaceId },
        });
      }
    }

    if (widget) {
      widgetFound = true;
      const config = parseWidgetConfig(widget.configJson, widget.name);
      widgetType = typeParam || config.widgetType || widget.type.toLowerCase();
      theme = (themeParam as typeof theme) || config.theme || "transparent";
      accentColor = accentParam || config.accentColor || "#7049D8";
      showRatings = config.showRatings;
      showCompany = config.showCompany;
      showAvatar = config.showAvatar;
      showDate = config.showDate;
      showTags = config.showTags;
      allowVideoPlayback = config.allowVideoPlayback;

      // 2. Query ONLY APPROVED testimonials
      const whereCondition: Prisma.TestimonialWhereInput = {
        workspaceId: widget.workspaceId,
        status: "APPROVED",
      };

      if (widget.projectId) {
        whereCondition.projectId = widget.projectId;
      }

      if (config.minRating > 0) {
        whereCondition.rating = { gte: config.minRating };
      }

      // Filter specific manual testimonials if configured
      if (
        config.selectionMode === "manual" &&
        config.selectedTestimonialIds &&
        config.selectedTestimonialIds.length > 0
      ) {
        whereCondition.id = { in: config.selectedTestimonialIds };
      }

      // Filter by tags if configured
      if (config.filterTags && config.filterTags.length > 0) {
        whereCondition.tags = {
          some: {
            tag: {
              name: { in: config.filterTags },
            },
          },
        };
      }

      const rows = await prisma.testimonial.findMany({
        where: whereCondition,
        include: {
          customer: true,
          project: {
            select: { id: true, name: true, slug: true },
          },
          tags: {
            include: { tag: true },
          },
          mediaAssets: true,
        },
        orderBy: config.ordering === "featured_first"
          ? [{ isFeatured: "desc" }, { submittedAt: "desc" }]
          : config.ordering === "highest_rated"
          ? [{ rating: "desc" }, { submittedAt: "desc" }]
          : [{ submittedAt: "desc" }],
      });

      // 3. Sanitize data strictly (no emails, internal CRM handles, or private IP)
      testimonials = rows.map((t) => {
        let customerMetaWebsite: string | null = null;
        if (t.customer?.socialHandle) {
          const meta = parseCustomerMeta(t.customer.socialHandle);
          customerMetaWebsite = meta.website;
        }

        return {
          id: t.id,
          content: t.content,
          rating: t.rating,
          type: t.type,
          isFeatured: t.isFeatured,
          submittedAt: t.submittedAt.toISOString(),
          customer: {
            name: t.customer?.name || "Anonymous",
            company: config.showCompany ? t.customer?.company || null : null,
            title: config.showCompany ? t.customer?.title || null : null,
            avatarUrl: config.showAvatar ? t.customer?.avatarUrl || null : null,
            website: customerMetaWebsite,
          },
          project: t.project,
          tags: config.showTags ? t.tags.map((rel) => rel.tag.name) : [],
          source: config.showSource ? "Verified Review" : null,
          media: t.mediaAssets.map((m) => ({
            id: m.id,
            type: m.type,
            url: m.url,
            mimeType: m.mimeType,
            fileSizeBytes: m.fileSizeBytes,
            durationSeconds: m.durationSeconds,
          })),
        };
      });

      if (widget?.id && !widget.id.startsWith("proj-")) {
        recordAnalyticsEvent({
          workspaceId: widget.workspaceId,
          targetType: "WIDGET",
          targetId: widget.id,
          eventType: "VIEW",
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error("Embed query error:", err);
    queryError = true;
  }

  const isDemo = widgetId.startsWith("demo") || widgetId === "preview";

  // Local development / demo fallback
  if (testimonials.length === 0 && (isDemo || (!widgetFound && process.env.NODE_ENV !== "production"))) {
    testimonials = devFallbackCards;
    widgetFound = true;
  }

  // Graceful failure titles & messages
  let emptyTitle = "No Testimonials Published Yet";
  let emptyMessage = "Approved customer testimonials will appear here once verified.";

  if (queryError) {
    emptyTitle = "Unable to Load Testimonials";
    emptyMessage = "A temporary server error occurred. Please try refreshing in a few moments.";
  } else if (!widgetFound) {
    emptyTitle = "Widget Not Found";
    emptyMessage = "This testimonial widget could not be located. It may have been archived or removed.";
  }

  return (
    <div
      id="praise-embed-root"
      className={`w-full bg-transparent p-0 m-0 overflow-hidden font-sans antialiased ${
        theme === "dark" ? "dark bg-zinc-950 text-white" : ""
      }`}
    >
      <EmbedResizeListener
        widgetId={widgetId}
        instanceId={instanceIdParam}
        theme={theme}
        allowedOrigin={originParam}
      />
      <WidgetRenderer
        type={widgetType}
        testimonials={testimonials}
        emptyTitle={emptyTitle}
        emptyMessage={emptyMessage}
        config={{
          theme,
          accentColor,
          showRatings,
          showCompany,
          showAvatar,
          showDate,
          showTags,
          allowVideoPlayback,
          autoplay: true,
          autoplayInterval: 5000,
        }}
      />
    </div>
  );
}

