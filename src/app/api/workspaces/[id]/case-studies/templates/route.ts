import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { CASE_STUDY_TEMPLATES, DEFAULT_QUESTIONS_CONFIG } from "@/lib/case-studies/templates";
import { CaseStudyTemplateItem } from "@/lib/case-studies/types";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET: Lists all available case study templates (system + workspace custom).
 */
export async function GET(_request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const customTemplates = await prisma.caseStudyTemplate.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    const parsedCustom: CaseStudyTemplateItem[] = customTemplates.map((t) => {
      let config: any = {};
      try {
        config = JSON.parse(t.configJson);
      } catch {}

      return {
        id: t.id,
        name: t.name,
        description: t.description || "",
        category: (t.category as any) || "GENERAL",
        icon: config.icon || "file-text",
        isSystem: false,
        welcomeHeading: config.welcomeHeading || "Share Your Success Story",
        welcomeText: config.welcomeText || "Tell us how our product helped your team achieve real results.",
        questionsConfig: config.questionsConfig || DEFAULT_QUESTIONS_CONFIG,
        sampleOutcomes: config.sampleOutcomes || [],
      };
    });

    // Merge system templates with custom templates
    const allTemplates = [...CASE_STUDY_TEMPLATES, ...parsedCustom];

    return NextResponse.json({ templates: allTemplates });
  } catch (error: any) {
    console.error("Error fetching case study templates:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch case study templates" },
      { status: error.status || 500 }
    );
  }
}

/**
 * POST: Saves a new custom case study template for the workspace.
 */
export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const body = await request.json();
    const { name, description, category = "GENERAL", welcomeHeading, welcomeText, questionsConfig, sampleOutcomes } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Template name is required" }, { status: 400 });
    }

    const configJson = JSON.stringify({
      welcomeHeading: welcomeHeading || "Share Your Success Story",
      welcomeText: welcomeText || "Tell us how our product helped your team achieve real results.",
      questionsConfig: questionsConfig || DEFAULT_QUESTIONS_CONFIG,
      sampleOutcomes: sampleOutcomes || [],
      icon: "file-text",
    });

    const created = await prisma.caseStudyTemplate.create({
      data: {
        workspaceId,
        name: name.trim(),
        description: description?.trim() || null,
        category,
        isSystem: false,
        configJson,
      },
    });

    return NextResponse.json(
      {
        template: {
          id: created.id,
          name: created.name,
          description: created.description || "",
          category: created.category as any,
          icon: "file-text",
          isSystem: false,
          welcomeHeading,
          welcomeText,
          questionsConfig: questionsConfig || DEFAULT_QUESTIONS_CONFIG,
          sampleOutcomes: sampleOutcomes || [],
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating case study template:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create case study template" },
      { status: error.status || 500 }
    );
  }
}
