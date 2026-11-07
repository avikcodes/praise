import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { createFormSchema } from "@/lib/auth/validation";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    try {
      const forms = await prisma.collectionForm.findMany({
        where: {
          workspaceId,
          ...(projectId ? { projectId } : {}),
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
              color: true,
            },
          },
          fields: {
            orderBy: { orderIndex: "asc" },
          },
          _count: {
            select: { testimonials: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        forms: forms.map((f) => ({
          ...f,
          submissionsCount: f._count.testimonials,
        })),
      });
    } catch (dbError) {
      if (process.env.NODE_ENV !== "production") {
        return NextResponse.json({ forms: [] });
      }
      throw dbError;
    }
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to fetch collection forms";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json();
    const validated = createFormSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.format() },
        { status: 400 },
      );
    }

    const {
      title,
      slug,
      description,
      headerPrompt,
      thankYouMessage,
      allowVideo,
      allowAudio,
      allowText,
      maxVideoDurationSeconds,
      collectName,
      nameRequired,
      collectEmail,
      emailRequired,
      collectCompany,
      companyRequired,
      collectJobTitle,
      jobTitleRequired,
      collectWebsite,
      websiteRequired,
      collectRating,
      ratingRequired,
      collectText,
      textRequired,
      collectAvatar,
      collectConsent,
      consentRequired,
      consentText,
      submissionsEnabled,
      redirectUrl,
      customLogoUrl,
      accentColor,
      theme,
      isPublished,
      projectId,
      fields,
    } = validated.data;

    // Check slug uniqueness within workspace
    const existingSlug = await prisma.collectionForm.findUnique({
      where: {
        workspaceId_slug: {
          workspaceId,
          slug,
        },
      },
    });

    if (existingSlug) {
      return NextResponse.json(
        { error: `A collection form with slug "${slug}" already exists in this workspace.` },
        { status: 409 },
      );
    }

    // Verify projectId if provided
    if (projectId) {
      const project = await prisma.project.findFirst({
        where: { id: projectId, workspaceId },
      });
      if (!project) {
        return NextResponse.json(
          { error: "Referenced project does not exist in this workspace." },
          { status: 400 },
        );
      }
    }

    // Create form and fields atomically
    const form = await prisma.$transaction(async (tx) => {
      const created = await tx.collectionForm.create({
        data: {
          workspaceId,
          projectId: projectId || null,
          title,
          slug,
          description: description || null,
          headerPrompt,
          thankYouMessage: thankYouMessage || "Thank you for sharing your feedback!",
          allowVideo,
          allowAudio,
          allowText,
          maxVideoDurationSeconds,
          collectName,
          nameRequired,
          collectEmail,
          emailRequired,
          collectCompany,
          companyRequired,
          collectJobTitle,
          jobTitleRequired,
          collectWebsite,
          websiteRequired,
          collectRating,
          ratingRequired,
          collectText,
          textRequired,
          collectAvatar,
          collectConsent,
          consentRequired,
          consentText,
          submissionsEnabled: submissionsEnabled ?? true,
          redirectUrl: redirectUrl || null,
          customLogoUrl: customLogoUrl || null,
          accentColor: accentColor || "#7049D8",
          theme: theme || "warm",
          isPublished,
          fields: {
            create: fields.map((f, index) => ({
              label: f.label,
              description: f.description || null,
              placeholder: f.placeholder || null,
              type: f.type,
              isRequired: f.isRequired,
              orderIndex: f.orderIndex ?? index,
              optionsJson: f.optionsJson || null,
            })),
          },
        },
        include: {
          fields: {
            orderBy: { orderIndex: "asc" },
          },
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
              color: true,
            },
          },
        },
      });

      return created;
    });

    return NextResponse.json(
      { form, message: "Form created successfully" },
      { status: 201 },
    );
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to create collection form";
    return NextResponse.json({ error: message }, { status });
  }
}

