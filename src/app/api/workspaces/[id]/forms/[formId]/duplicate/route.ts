import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";

type RouteParams = {
  params: Promise<{ id: string; formId: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, formId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const original = await prisma.collectionForm.findFirst({
      where: { id: formId, workspaceId },
      include: {
        fields: {
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!original) {
      return NextResponse.json({ error: "Source collection form not found" }, { status: 404 });
    }

    // Generate unique slug
    let newSlug = `${original.slug}-copy`;
    let counter = 1;
    while (
      await prisma.collectionForm.findUnique({
        where: {
          workspaceId_slug: {
            workspaceId,
            slug: newSlug,
          },
        },
      })
    ) {
      counter += 1;
      newSlug = `${original.slug}-copy-${counter}`;
    }

    const duplicated = await prisma.$transaction(async (tx) => {
      const newForm = await tx.collectionForm.create({
        data: {
          workspaceId,
          projectId: original.projectId,
          title: `${original.title} (Copy${counter > 1 ? ` ${counter}` : ""})`,
          slug: newSlug,
          description: original.description,
          headerPrompt: original.headerPrompt,
          thankYouMessage: original.thankYouMessage,
          allowVideo: original.allowVideo,
          allowAudio: original.allowAudio,
          allowText: original.allowText,
          maxVideoDurationSeconds: original.maxVideoDurationSeconds,
          collectName: original.collectName,
          nameRequired: original.nameRequired,
          collectEmail: original.collectEmail,
          emailRequired: original.emailRequired,
          collectCompany: original.collectCompany,
          companyRequired: original.companyRequired,
          collectJobTitle: original.collectJobTitle,
          jobTitleRequired: original.jobTitleRequired,
          collectWebsite: original.collectWebsite,
          websiteRequired: original.websiteRequired,
          collectRating: original.collectRating,
          ratingRequired: original.ratingRequired,
          collectText: original.collectText,
          textRequired: original.textRequired,
          collectAvatar: original.collectAvatar,
          collectConsent: original.collectConsent,
          consentRequired: original.consentRequired,
          consentText: original.consentText,
          isPublished: original.isPublished,
          fields: {
            create: original.fields.map((f) => ({
              label: f.label,
              description: f.description,
              placeholder: f.placeholder,
              type: f.type,
              isRequired: f.isRequired,
              orderIndex: f.orderIndex,
              optionsJson: f.optionsJson,
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
          _count: {
            select: { testimonials: true },
          },
        },
      });

      return newForm;
    });

    return NextResponse.json(
      {
        form: {
          ...duplicated,
          submissionsCount: 0,
        },
        message: "Form duplicated successfully",
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to duplicate collection form";
    return NextResponse.json({ error: message }, { status });
  }
}

