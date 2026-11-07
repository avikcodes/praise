import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    // 14 days window for actual submission trend calculation
    const now = new Date();
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(now.getDate() - 13);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const [
      statusCounts,
      ratingAggregate,
      totalForms,
      totalProjects,
      totalCustomers,
      totalWidgets,
      recentTestimonials,
      trendTestimonials,
      recentForms,
      recentProjects,
    ] = await Promise.all([
      // Group testimonials by status
      prisma.testimonial.groupBy({
        by: ["status"],
        where: { workspaceId },
        _count: { _all: true },
      }),
      // Average rating
      prisma.testimonial.aggregate({
        where: {
          workspaceId,
          rating: { not: null },
        },
        _avg: { rating: true },
      }),
      // Resource counts
      prisma.collectionForm.count({ where: { workspaceId } }),
      prisma.project.count({ where: { workspaceId } }),
      prisma.customer.count({ where: { workspaceId } }),
      prisma.widget.count({ where: { workspaceId } }),
      // Recent testimonials with relations
      prisma.testimonial.findMany({
        where: { workspaceId },
        orderBy: { submittedAt: "desc" },
        take: 6,
        include: {
          customer: true,
          form: {
            select: { id: true, title: true, slug: true },
          },
          project: {
            select: { id: true, name: true, slug: true, color: true },
          },
          mediaAssets: {
            select: {
              id: true,
              type: true,
              url: true,
              mimeType: true,
              fileSizeBytes: true,
              durationSeconds: true,
            },
          },
        },
      }),
      // Testimonials within the 14-day window for trends
      prisma.testimonial.findMany({
        where: {
          workspaceId,
          submittedAt: { gte: fourteenDaysAgo },
        },
        select: {
          id: true,
          status: true,
          submittedAt: true,
        },
      }),
      // Recent forms for activity feed
      prisma.collectionForm.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 4,
        select: {
          id: true,
          title: true,
          slug: true,
          isPublished: true,
          createdAt: true,
        },
      }),
      // Recent projects for activity feed
      prisma.project.findMany({
        where: { workspaceId },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          id: true,
          name: true,
          slug: true,
          color: true,
          createdAt: true,
        },
      }),
    ]);

    // Format counts
    const counts = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      archived: 0,
      forms: totalForms,
      projects: totalProjects,
      customers: totalCustomers,
      widgets: totalWidgets,
      averageRating: ratingAggregate._avg.rating
        ? Number(ratingAggregate._avg.rating.toFixed(1))
        : null,
    };

    for (const group of statusCounts) {
      const key = group.status.toLowerCase() as "pending" | "approved" | "rejected" | "archived";
      if (key in counts) {
        counts[key] = group._count._all;
      }
      counts.total += group._count._all;
    }

    // Build 14-day trend data from actual database records
    const trendMap = new Map<
      string,
      { date: string; label: string; count: number; pendingCount: number; approvedCount: number }
    >();

    for (let i = 0; i < 14; i++) {
      const d = new Date(fourteenDaysAgo);
      d.setDate(d.getDate() + i);
      const dateKey = d.toISOString().split("T")[0]; // YYYY-MM-DD
      const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      trendMap.set(dateKey, {
        date: dateKey,
        label,
        count: 0,
        pendingCount: 0,
        approvedCount: 0,
      });
    }

    for (const t of trendTestimonials) {
      const dateKey = t.submittedAt.toISOString().split("T")[0];
      const entry = trendMap.get(dateKey);
      if (entry) {
        entry.count += 1;
        if (t.status === "PENDING") entry.pendingCount += 1;
        if (t.status === "APPROVED") entry.approvedCount += 1;
      }
    }

    const submissionTrends = Array.from(trendMap.values());

    // Build real activity stream from database records
    type ActivityItem = {
      id: string;
      type: "TESTIMONIAL" | "FORM" | "PROJECT";
      title: string;
      description: string;
      timestamp: string;
      link?: string;
      badge?: string;
    };

    const activities: ActivityItem[] = [];

    for (const item of recentTestimonials) {
      const respondent = item.customer?.name || "Customer";
      const ratingTxt = item.rating ? ` (${item.rating}★)` : "";
      const sourceTxt = item.form?.title ? ` via "${item.form.title}"` : "";
      activities.push({
        id: `act-test-${item.id}`,
        type: "TESTIMONIAL",
        title: `Testimonial from ${respondent}`,
        description: `Submitted feedback${ratingTxt}${sourceTxt}`,
        timestamp: item.submittedAt.toISOString(),
        link: "/dashboard/testimonials",
        badge: item.status,
      });
    }

    for (const form of recentForms) {
      activities.push({
        id: `act-form-${form.id}`,
        type: "FORM",
        title: `Form "${form.title}"`,
        description: form.isPublished
          ? "Published and accepting responses"
          : "Drafted collection form",
        timestamp: form.createdAt.toISOString(),
        link: "/dashboard/forms",
        badge: form.isPublished ? "PUBLISHED" : "DRAFT",
      });
    }

    for (const proj of recentProjects) {
      activities.push({
        id: `act-proj-${proj.id}`,
        type: "PROJECT",
        title: `Project "${proj.name}"`,
        description: "Created project container",
        timestamp: proj.createdAt.toISOString(),
        link: "/dashboard/projects",
      });
    }

    // Sort chronologically (newest first) and take top 8
    activities.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    const recentActivity = activities.slice(0, 8);

    return NextResponse.json({
      counts,
      recentSubmissions: recentTestimonials,
      recentActivity,
      submissionTrends,
    });
  } catch (error) {
    console.error("Workspace overview error:", error);
    return NextResponse.json(
      { error: "Failed to load workspace overview metrics" },
      { status: 500 },
    );
  }
}
