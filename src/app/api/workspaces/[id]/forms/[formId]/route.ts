import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { updateFormSchema } from "@/lib/auth/validation";

type RouteParams = {
  params: Promise<{ id: string; formId: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, formId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const form = await prisma.collectionForm.findFirst({
      where: { id: formId, workspaceId },
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

    if (!form) {
      return NextResponse.json({ error: "Collection form not found" }, { status: 404 });
    }

    return NextResponse.json({
      form: {
        ...form,
        submissionsCount: form._count.testimonials,
      },
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to fetch collection form";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, formId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const existing = await prisma.collectionForm.findFirst({
      where: { id: formId, workspaceId },
      include: { fields: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Collection form not found" }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateFormSchema.safeParse(body);

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

    // Check slug uniqueness if changed
    if (slug && slug !== existing.slug) {
      const slugConflict = await prisma.collectionForm.findUnique({
        where: {
          workspaceId_slug: {
            workspaceId,
            slug,
          },
        },
      });
      if (slugConflict) {
        return NextResponse.json(
          { error: `Slug "${slug}" is already in use by another form in this workspace.` },
          { status: 409 },
        );
      }
    }

    // Verify projectId if specified
    if (projectId !== undefined && projectId !== null) {
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

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update form settings
      await tx.collectionForm.update({
        where: { id: formId },
        data: {
          title: title ?? existing.title,
          slug: slug ?? existing.slug,
          description: description !== undefined ? description : existing.description,
          headerPrompt: headerPrompt ?? existing.headerPrompt,
          thankYouMessage: thankYouMessage !== undefined ? thankYouMessage : existing.thankYouMessage,
          allowVideo: allowVideo ?? existing.allowVideo,
          allowAudio: allowAudio ?? existing.allowAudio,
          allowText: allowText ?? existing.allowText,
          maxVideoDurationSeconds: maxVideoDurationSeconds ?? existing.maxVideoDurationSeconds,
          collectName: collectName ?? existing.collectName,
          nameRequired: nameRequired ?? existing.nameRequired,
          collectEmail: collectEmail ?? existing.collectEmail,
          emailRequired: emailRequired ?? existing.emailRequired,
          collectCompany: collectCompany ?? existing.collectCompany,
          companyRequired: companyRequired ?? existing.companyRequired,
          collectJobTitle: collectJobTitle ?? existing.collectJobTitle,
          jobTitleRequired: jobTitleRequired ?? existing.jobTitleRequired,
          collectWebsite: collectWebsite ?? existing.collectWebsite,
          websiteRequired: websiteRequired ?? existing.websiteRequired,
          collectRating: collectRating ?? existing.collectRating,
          ratingRequired: ratingRequired ?? existing.ratingRequired,
          collectText: collectText ?? existing.collectText,
          textRequired: textRequired ?? existing.textRequired,
          collectAvatar: collectAvatar ?? existing.collectAvatar,
          collectConsent: collectConsent ?? existing.collectConsent,
          consentRequired: consentRequired ?? existing.consentRequired,
          consentText: consentText ?? existing.consentText,
          submissionsEnabled: submissionsEnabled ?? existing.submissionsEnabled,
          redirectUrl: redirectUrl !== undefined ? (redirectUrl || null) : existing.redirectUrl,
          customLogoUrl: customLogoUrl !== undefined ? (customLogoUrl || null) : existing.customLogoUrl,
          accentColor: accentColor ?? existing.accentColor,
          theme: theme ?? existing.theme,
          isPublished: isPublished ?? existing.isPublished,
          projectId: projectId !== undefined ? projectId : existing.projectId,
        },
      });

      // 2. Sync custom fields if provided
      if (fields !== undefined) {
        const payloadFieldIds = fields
          .map((f) => f.id)
          .filter((id): id is string => Boolean(id));

        // Delete fields not in the payload
        await tx.formField.deleteMany({
          where: {
            formId,
            id: { notIn: payloadFieldIds },
          },
        });

        // Upsert each field
        for (let i = 0; i < fields.length; i++) {
          const f = fields[i];
          const orderIndex = f.orderIndex ?? i;
          if (f.id && existing.fields.some((ef) => ef.id === f.id)) {
            await tx.formField.update({
              where: { id: f.id },
              data: {
                label: f.label,
                description: f.description || null,
                placeholder: f.placeholder || null,
                type: f.type,
                isRequired: f.isRequired,
                orderIndex,
                optionsJson: f.optionsJson || null,
              },
            });
          } else {
            await tx.formField.create({
              data: {
                formId,
                label: f.label,
                description: f.description || null,
                placeholder: f.placeholder || null,
                type: f.type,
                isRequired: f.isRequired,
                orderIndex,
                optionsJson: f.optionsJson || null,
              },
            });
          }
        }
      }

      return tx.collectionForm.findUnique({
        where: { id: formId },
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
    });

    return NextResponse.json({
      form: updated,
      message: "Form updated successfully",
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to update collection form";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, formId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const form = await prisma.collectionForm.findFirst({
      where: { id: formId, workspaceId },
      include: {
        _count: {
          select: { testimonials: true },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Collection form not found" }, { status: 404 });
    }

    await prisma.collectionForm.delete({
      where: { id: formId },
    });

    return NextResponse.json({
      success: true,
      message: `Form "${form.title}" and its fields have been deleted. Testimonials submitted through this form remain safely preserved in the workspace.`,
    });
  } catch (error: unknown) {
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "Failed to delete collection form";
    return NextResponse.json({ error: message }, { status });
  }
}
