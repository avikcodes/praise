import { NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { uploadMediaAsset, MediaUploadError } from "@/lib/storage/service";
import { MediaType } from "@/types/media";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const testimonialId = formData.get("testimonialId") as string | null;
    const typeHint = formData.get("type") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file was provided in the upload request." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let allowedTypes: MediaType[] = ["IMAGE", "VIDEO"];
    if (typeHint === "image") allowedTypes = ["IMAGE"];
    if (typeHint === "video") allowedTypes = ["VIDEO"];

    const asset = await uploadMediaAsset({
      buffer,
      workspaceId,
      testimonialId,
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
    const status =
      typeof error === "object" && error && "status" in error
        ? Number(error.status)
        : 500;
    const message =
      error instanceof Error ? error.message : "An error occurred during file upload.";
    return NextResponse.json({ error: message }, { status });
  }
}

