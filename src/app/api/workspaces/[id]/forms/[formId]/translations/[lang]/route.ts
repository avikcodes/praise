import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireFormInWorkspace } from "@/lib/auth/guards";

type RouteParams = {
  params: Promise<{ id: string; formId: string; lang: string }>;
};

/**
 * DELETE: Removes a translation for a specific language.
 */
export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, formId, lang } = await context.params;
    await requireFormInWorkspace(formId, workspaceId);

    const existing = await prisma.formTranslation.findUnique({
      where: {
        formId_language: {
          formId,
          language: lang.toLowerCase().trim(),
        },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Translation not found" }, { status: 404 });
    }

    await prisma.formTranslation.delete({
      where: {
        formId_language: {
          formId,
          language: lang.toLowerCase().trim(),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete translation:", error);
    if (error?.status === 401 || error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Failed to delete translation" }, { status: 500 });
  }
}
