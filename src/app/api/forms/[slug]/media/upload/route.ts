import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { uploadMediaAsset, MediaUploadError } from "@/lib/storage/service";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { MediaType } from "@/types/media";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  const clientIp = getClientIp(request);

  // Rate limit: Max 5 uploads per 3 minutes per IP to prevent storage flooding
  const rateLimit = checkRateLimit(`upload-${clientIp}`, 5, 3 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Too many upload requests. Please wait ${rateLimit.resetSeconds} seconds before trying again.`,
      },
      {
        status: 429,
        headers: { "Retry-After": rateLimit.resetSeconds.toString() },
      },
    );
  }

  try {
    const { slug } = await context.params;

    let form: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      form = await prisma.collectionForm.findFirst({
        where: { slug },
      });
    } catch {
      // Dev mode fallback
      if (process.env.NODE_ENV !== "production") {
        form = { workspaceId: "ws-default", isPublished: true, submissionsEnabled: true };
      }
    }

    if (!form || !form.isPublished) {
      return NextResponse.json(
        { error: "This collection form is unpublished or does not exist." },
        { status: 404 },
      );
    }

    if (!form.submissionsEnabled) {
      return NextResponse.json(
        { error: "Media uploads are temporarily paused for this collection form." },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const typeHint = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No media file provided." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let allowedTypes: MediaType[] = ["IMAGE", "VIDEO"];
    if (typeHint === "image") allowedTypes = ["IMAGE"];
    if (typeHint === "video") allowedTypes = ["VIDEO"];

    const asset = await uploadMediaAsset({
      buffer,
      workspaceId: form.workspaceId,
      allowedTypes,
    });

    return NextResponse.json(
      {
        success: true,
        asset,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (error instanceof MediaUploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      error instanceof Error ? error.message : "Media upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

