import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { FollowUpQuestion } from "@/types/surveys";

type RouteParams = {
  params: Promise<{ id: string; surveyId: string }>;
};

function escapeCsvCell(value: any): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === "object") {
    value = JSON.stringify(value);
  }
  const str = String(value);
  const escaped = str.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * GET: Exports survey responses as CSV or JSON.
 */
export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, surveyId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const survey = await prisma.survey.findFirst({
      where: { id: surveyId, workspaceId },
      include: {
        responses: {
          orderBy: { submittedAt: "desc" },
        },
      },
    });

    if (!survey) {
      return NextResponse.json({ error: "Survey not found." }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format")?.toLowerCase() || "csv";

    let questions: FollowUpQuestion[] = [];
    try {
      questions = survey.questionsJson ? JSON.parse(survey.questionsJson) : [];
    } catch {
      questions = [];
    }

    const formattedResponses = survey.responses.map((r) => {
      let answers: Record<string, any> = {};
      try {
        answers = r.answersJson ? JSON.parse(r.answersJson) : {};
      } catch {
        answers = {};
      }
      return {
        id: r.id,
        score: r.score,
        scoreType: r.scoreType,
        feedback: r.feedback,
        respondentName: r.respondentName,
        respondentEmail: r.respondentEmail,
        respondentCompany: r.respondentCompany,
        answers,
        submittedAt: r.submittedAt.toISOString(),
      };
    });

    if (format === "json") {
      const jsonContent = JSON.stringify(
        {
          survey: {
            id: survey.id,
            title: survey.title,
            slug: survey.slug,
            type: survey.type,
            primaryPrompt: survey.primaryPrompt,
            questions,
            exportedAt: new Date().toISOString(),
          },
          responses: formattedResponses,
        },
        null,
        2
      );

      return new NextResponse(jsonContent, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="survey-${survey.slug}-responses.json"`,
        },
      });
    }

    // Default: CSV export
    const headers = [
      "Response ID",
      "Submitted At",
      "Score",
      "Score Type",
      "Written Feedback",
      "Respondent Name",
      "Respondent Email",
      "Respondent Company",
      ...questions.map((q) => q.label || `Question ${q.id}`),
    ];

    const csvRows: string[] = [headers.map(escapeCsvCell).join(",")];

    for (const r of formattedResponses) {
      const row = [
        r.id,
        r.submittedAt,
        r.score !== null ? r.score : "",
        r.scoreType,
        r.feedback || "",
        r.respondentName || "",
        r.respondentEmail || "",
        r.respondentCompany || "",
        ...questions.map((q) => {
          const ans = r.answers[q.id];
          if (ans === undefined || ans === null) return "";
          if (Array.isArray(ans)) return ans.join("; ");
          return ans;
        }),
      ];
      csvRows.push(row.map(escapeCsvCell).join(","));
    }

    const csvContent = "\uFEFF" + csvRows.join("\r\n"); // UTF-8 BOM for Excel compatibility

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="survey-${survey.slug}-responses.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to export survey responses." },
      { status: error?.status || 500 }
    );
  }
}
