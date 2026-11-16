import { NextRequest, NextResponse } from "next/server";
import { authenticateExtensionRequest, captureExtensionTestimonial } from "@/lib/extension/service";

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateExtensionRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing Praise API key." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      workspaceId = auth.workspaceId,
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
      rating,
      submittedAt,
      tags,
      internalNote,
    } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Testimonial text content is required." },
        { status: 400 }
      );
    }

    if (!sourceUrl || !sourceUrl.trim()) {
      return NextResponse.json(
        { error: "Source webpage URL is required." },
        { status: 400 }
      );
    }

    const result = await captureExtensionTestimonial({
      workspaceId,
      projectId: projectId || null,
      content,
      authorName: authorName?.trim() || "Customer",
      authorEmail: authorEmail?.trim() || null,
      authorCompany: authorCompany?.trim() || null,
      authorTitle: authorTitle?.trim() || null,
      authorHandle: authorHandle?.trim() || null,
      authorAvatarUrl: authorAvatarUrl?.trim() || null,
      sourceUrl: sourceUrl.trim(),
      sourcePlatform: sourcePlatform || "WEB",
      rating: rating ? Number(rating) : 5,
      submittedAt: submittedAt || new Date().toISOString(),
      tags,
      internalNote,
      actorUserId: auth.userId,
      actorName: auth.userName || "Praise Browser Extension",
    });

    return NextResponse.json({
      success: true,
      testimonialId: result.testimonialId,
      status: result.status,
      message: "Testimonial successfully captured and queued in moderation inbox.",
    });
  } catch (error: any) {
    console.error("Extension capture error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to capture testimonial." },
      { status: 400 }
    );
  }
}
