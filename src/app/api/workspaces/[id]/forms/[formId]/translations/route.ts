import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireFormInWorkspace } from "@/lib/auth/guards";
import {
  DEFAULT_LANGUAGE,
  getLanguageConfig,
  isValidLanguageCode,
  SUPPORTED_LANGUAGES,
} from "@/lib/i18n/config";

type RouteParams = {
  params: Promise<{ id: string; formId: string }>;
};

/**
 * GET: Lists all translations for a collection form.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, formId } = await context.params;
    await requireFormInWorkspace(formId, workspaceId);

    const form = await prisma.collectionForm.findUnique({
      where: { id: formId },
      include: {
        fields: { orderBy: { orderIndex: "asc" } },
        translations: { orderBy: { language: "asc" } },
      },
    });

    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const translations = form.translations.map((t) => {
      let fieldTranslations = {};
      if (t.fieldTranslationsJson) {
        try {
          fieldTranslations = JSON.parse(t.fieldTranslationsJson);
        } catch {
          fieldTranslations = {};
        }
      }

      return {
        id: t.id,
        formId: t.formId,
        language: t.language,
        languageConfig: getLanguageConfig(t.language),
        title: t.title,
        description: t.description,
        headerPrompt: t.headerPrompt,
        thankYouMessage: t.thankYouMessage,
        consentText: t.consentText,
        videoInstructions: t.videoInstructions,
        fieldTranslations,
        isPublished: t.isPublished,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      };
    });

    return NextResponse.json({
      defaultLanguage: form.defaultLanguage || DEFAULT_LANGUAGE,
      defaultLanguageConfig: getLanguageConfig(form.defaultLanguage || DEFAULT_LANGUAGE),
      translations,
      supportedLanguages: SUPPORTED_LANGUAGES,
    });
  } catch (error: any) {
    console.error("Failed to fetch form translations:", error);
    if (error?.status === 401 || error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Failed to fetch translations" }, { status: 500 });
  }
}

/**
 * POST: Creates or updates a language variant for a form.
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, formId } = await context.params;
    await requireFormInWorkspace(formId, workspaceId);

    const body = await request.json();
    const {
      language,
      title,
      description,
      headerPrompt,
      thankYouMessage,
      consentText,
      videoInstructions,
      fieldTranslations,
      isPublished = true,
    } = body;

    if (!language || !isValidLanguageCode(language)) {
      return NextResponse.json({ error: "Valid language code is required (e.g. es, fr, de, ja, pt)" }, { status: 400 });
    }

    if (!title?.trim() || !headerPrompt?.trim()) {
      return NextResponse.json({ error: "Translated title and header prompt are required" }, { status: 400 });
    }

    const fieldTranslationsJson =
      fieldTranslations && typeof fieldTranslations === "object"
        ? JSON.stringify(fieldTranslations)
        : null;

    const translation = await prisma.formTranslation.upsert({
      where: {
        formId_language: {
          formId,
          language: language.toLowerCase().trim(),
        },
      },
      update: {
        title: title.trim(),
        description: description?.trim() || null,
        headerPrompt: headerPrompt.trim(),
        thankYouMessage: thankYouMessage?.trim() || null,
        consentText: consentText?.trim() || null,
        videoInstructions: videoInstructions?.trim() || null,
        fieldTranslationsJson,
        isPublished: Boolean(isPublished),
      },
      create: {
        formId,
        language: language.toLowerCase().trim(),
        title: title.trim(),
        description: description?.trim() || null,
        headerPrompt: headerPrompt.trim(),
        thankYouMessage: thankYouMessage?.trim() || null,
        consentText: consentText?.trim() || null,
        videoInstructions: videoInstructions?.trim() || null,
        fieldTranslationsJson,
        isPublished: Boolean(isPublished),
      },
    });

    return NextResponse.json({ translation }, { status: 200 });
  } catch (error: any) {
    console.error("Failed to save form translation:", error);
    if (error?.status === 401 || error?.message?.includes("Unauthorized")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Failed to save translation" }, { status: 500 });
  }
}
