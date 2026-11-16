import { prisma } from "../db/client.ts";
import { authenticateApiKey } from "../api/keys.ts";
import { TestimonialStatus } from "@prisma/client";
import { logModerationActivity } from "../moderation/activity.ts";
import { formatCustomerMeta, INTERNAL_EMAIL_SUFFIX } from "../customers/utils.ts";

export interface ExtensionAuthContext {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  userId?: string | null;
  userName?: string | null;
  role?: string;
  allWorkspaces?: Array<{ id: string; name: string; slug: string }>;
}

/**
 * Authenticates extension requests via API Key (x-api-key or Authorization header)
 * or active browser session cookie.
 */
export async function authenticateExtensionRequest(
  request: Request
): Promise<ExtensionAuthContext | null> {
  // 1. Check API Key header
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");
  const rawKey =
    apiKeyHeader || (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : authHeader);

  if (rawKey) {
    const keyContext = await authenticateApiKey(rawKey);
    if (keyContext && keyContext.workspaceId) {
      const workspace = await prisma.workspace.findUnique({
        where: { id: keyContext.workspaceId },
        select: { id: true, name: true, slug: true },
      });

      if (workspace) {
        return {
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          workspaceSlug: workspace.slug,
          userId: null,
          userName: `API Key (${keyContext.name || "Extension"})`,
          role: keyContext.role || "MEMBER",
        };
      }
    }
  }

  // 2. Check Session Cookie (for users already logged into dashboard)
  try {
    const { getSessionUser } = await import("../auth/session.ts");
    const user = await getSessionUser();
    if (user) {
      // Find user's accessible workspaces
      const members = await prisma.workspaceMember.findMany({
        where: { userId: user.id },
        include: { workspace: { select: { id: true, name: true, slug: true } } },
        orderBy: { createdAt: "asc" },
      });

      if (members.length > 0) {
        const primary = members[0].workspace;
        return {
          workspaceId: primary.id,
          workspaceName: primary.name,
          workspaceSlug: primary.slug,
          userId: user.id,
          userName: user.name || user.email,
          role: members[0].role,
          allWorkspaces: members.map((m) => m.workspace),
        };
      }
    }
  } catch {
    // Session check error or bailing out during prerender
  }

  return null;
}

/**
 * Checks whether a testimonial with identical text or source URL already exists.
 */
export async function checkExtensionDuplicate(
  params: {
    workspaceId: string;
    content: string;
    sourceUrl?: string | null;
  },
  dbClient: any = prisma
) {
  const { workspaceId, content, sourceUrl } = params;

  if (sourceUrl && sourceUrl.trim()) {
    const existingByUrl = await dbClient.testimonial.findFirst({
      where: {
        workspaceId,
        sourceUrl: sourceUrl.trim(),
      },
      select: { id: true, content: true, customer: { select: { name: true } } },
    });

    if (existingByUrl) {
      return {
        isDuplicate: true,
        duplicateReason: `A testimonial with this source URL already exists (Author: ${existingByUrl.customer?.name || "Customer"}).`,
        existingTestimonialId: existingByUrl.id,
      };
    }
  }

  if (content && content.trim()) {
    const normalizedTarget = content.trim().toLowerCase().replace(/\s+/g, " ");

    // Fetch recent testimonials to match text
    const recent = await dbClient.testimonial.findMany({
      where: { workspaceId },
      select: { id: true, content: true },
      take: 100,
      orderBy: { createdAt: "desc" },
    });

    for (const item of recent) {
      const norm = item.content.trim().toLowerCase().replace(/\s+/g, " ");
      if (norm === normalizedTarget) {
        return {
          isDuplicate: true,
          duplicateReason: "An identical testimonial text already exists in your workspace.",
          existingTestimonialId: item.id,
        };
      }
    }
  }

  return { isDuplicate: false };
}

export interface CaptureTestimonialParams {
  workspaceId: string;
  projectId?: string | null;
  content: string;
  authorName: string;
  authorEmail?: string | null;
  authorCompany?: string | null;
  authorTitle?: string | null;
  authorHandle?: string | null;
  authorAvatarUrl?: string | null;
  sourceUrl: string;
  sourcePlatform?: string | null;
  rating?: number | null;
  submittedAt?: string | Date | null;
  tags?: string[] | null;
  internalNote?: string | null;
  actorUserId?: string | null;
  actorName?: string | null;
}

/**
 * Ingests a captured testimonial from the browser extension.
 * STRICT COMPLIANCE:
 * - Always saved with status: PENDING (held in moderation until approved).
 * - Avoids duplicate customers and testimonials.
 * - Records provenance, sourceUrl, and internal audit logs.
 */
export async function captureExtensionTestimonial(
  params: CaptureTestimonialParams,
  dbClient: any = prisma
) {
  const {
    workspaceId,
    projectId,
    content,
    authorName,
    authorEmail,
    authorCompany,
    authorTitle,
    authorHandle,
    authorAvatarUrl,
    sourceUrl,
    sourcePlatform,
    rating = 5,
    submittedAt,
    tags,
    internalNote,
    actorUserId,
    actorName = "Browser Extension",
  } = params;

  if (!content || !content.trim()) {
    throw new Error("Testimonial content is required.");
  }

  if (!sourceUrl || !sourceUrl.trim()) {
    throw new Error("Source URL is required for web-captured testimonials.");
  }

  // 1. Deduplicate or create Customer profile
  let customerId: string;
  const platformTag = (sourcePlatform || "WEB").toUpperCase();

  if (authorEmail && authorEmail.trim()) {
    const cleanEmail = authorEmail.trim().toLowerCase();
    let customer = await dbClient.customer.findUnique({
      where: { workspaceId_email: { workspaceId, email: cleanEmail } },
    });

    if (!customer) {
      customer = await dbClient.customer.create({
        data: {
          workspaceId,
          name: authorName?.trim() || "Customer",
          email: cleanEmail,
          company: authorCompany?.trim() || null,
          title: authorTitle?.trim() || null,
          avatarUrl: authorAvatarUrl?.trim() || null,
          socialHandle: authorHandle?.trim() || null,
        },
      });
    }
    customerId = customer.id;
  } else {
    // Generate unique internal identifier for web author without known email
    const rand = Math.random().toString(36).substring(2, 8);
    const internalEmail = `capture-${platformTag.toLowerCase()}-${Date.now()}-${rand}${INTERNAL_EMAIL_SUFFIX}`;
    const meta = formatCustomerMeta(sourceUrl, `Captured via Browser Extension (${platformTag})`);

    const customer = await dbClient.customer.create({
      data: {
        workspaceId,
        name: authorName?.trim() || `${platformTag} User`,
        email: internalEmail,
        company: authorCompany?.trim() || null,
        title: authorTitle?.trim() || null,
        avatarUrl: authorAvatarUrl?.trim() || null,
        socialHandle: authorHandle?.trim() || meta,
      },
    });
    customerId = customer.id;
  }

  // 2. Parse Date
  let effectiveDate = new Date();
  if (submittedAt) {
    const d = new Date(submittedAt);
    if (!isNaN(d.getTime())) effectiveDate = d;
  }

  // 3. Normalized Rating (1-5 range)
  const finalRating = rating ? Math.max(1, Math.min(5, Math.round(Number(rating)))) : 5;

  // 4. Create Testimonial record (STRICT COMPLIANCE: ALWAYS PENDING)
  const testimonial = await dbClient.testimonial.create({
    data: {
      workspaceId,
      projectId: projectId || null,
      customerId,
      content: content.trim(),
      rating: finalRating,
      type: "TEXT",
      status: TestimonialStatus.PENDING, // Strictly unpublished until approved
      isFeatured: false,
      sourceType: platformTag,
      sourceUrl: sourceUrl.trim(),
      createdAt: effectiveDate,
    },
  });

  // 5. Attach tags if provided
  const tagsToAttach = Array.isArray(tags) ? [...tags] : [];
  if (!tagsToAttach.includes(platformTag)) {
    tagsToAttach.push(platformTag);
  }
  if (!tagsToAttach.includes("Extension Capture")) {
    tagsToAttach.push("Extension Capture");
  }

  for (const tagName of tagsToAttach) {
    if (!tagName.trim()) continue;
    try {
      const tag = await dbClient.tag.upsert({
        where: { workspaceId_name: { workspaceId, name: tagName.trim() } },
        update: {},
        create: { workspaceId, name: tagName.trim() },
      });

      await dbClient.testimonialTag.create({
        data: { testimonialId: testimonial.id, tagId: tag.id },
      });
    } catch {
      // Ignore tag relation collisions
    }
  }

  // 6. Optional Internal Team Note
  if (internalNote && internalNote.trim()) {
    try {
      await dbClient.testimonialNote.create({
        data: {
          workspaceId,
          testimonialId: testimonial.id,
          authorUserId: actorUserId || null,
          authorName,
          note: internalNote.trim(),
        },
      });
    } catch {
      // Ignore note persistence errors
    }
  }

  // 7. Log Moderation Activity
  try {
    if (dbClient?.moderationActivity?.create) {
      await logModerationActivity(
        {
          workspaceId,
          testimonialId: testimonial.id,
          actorId: actorUserId || null,
          actorName,
          action: "SUBMITTED",
          details: `Captured from ${platformTag} via Praise Browser Extension (${sourceUrl})`,
        },
        dbClient
      );
    }
  } catch {
    // Activity logging is non-blocking
  }

  return {
    testimonialId: testimonial.id,
    status: testimonial.status,
    customerId,
  };
}
