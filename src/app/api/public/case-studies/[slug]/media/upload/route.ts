import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { uploadMediaAsset } from "@/lib/storage/service";
import { checkRateLimit, getClientIp } from "@/lib/security/rate-limit";
import { MediaType } from "@/types/media";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

/**
 * POST: Uploads image proof or video testimonial response for a case study.
 * Public access: Does not require customer registration.
 */
export async function POST(request: Request, context: RouteParams) {
  const clientIp = getClientIp(request);

  // Rate limit: Max 8 uploads per 5 minutes per IP
  const rateLimit = checkRateLimit(`cs-upload-${clientIp}`, 8, 5 * 60 * 1000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: `Too many upload requests. Please wait ${rateLimit.resetSeconds}s.` },
      { status: 429 }
    );
  }

  try {
    const { slug } = await context.params;

    const form = await prisma.caseStudyForm.findFirst({
      where: { slug },
    });

    if (!form || form.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "This case study form is not currently accepting uploads." },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const typeHint = (formData.get("type") as string) || "image";

    if (!file) {
      return NextResponse.json({ error: "No media file provided." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let allowedTypes: MediaType[] = ["IMAGE", "VIDEO"];
    if (typeHint === "image") allowedTypes = ["IMAGE"];
    if (typeHint === "video") allowedTypes = ["VIDEO"];

    const asset = await uploadMediaAsset({
      buffer,
      workspaceId: form.workspaceId,
      allowedTypes,
      typeHint,
    });

    return NextResponse.json({
      assetId: asset.id,
      url: asset.url,
      type: asset.type,
      mimeType: asset.mimeType,
      fileSizeBytes: asset.fileSizeBytes,
    });
  } catch (error: any) {
    console.error("Error in case study media upload:", error);
    return NextResponse.json(
      { error: error.message || "Failed to upload media file" },
      { status: 500 }
    );
  }
}
