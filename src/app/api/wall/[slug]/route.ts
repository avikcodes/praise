import { NextResponse } from "next/server";
import { resolvePublicWall } from "@/lib/walls/service";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const isPreview = searchParams.get("preview") === "true";

    const { wallData, isUnpublished } = await resolvePublicWall(slug, { preview: isPreview });

    if (isUnpublished) {
      return NextResponse.json(
        {
          error: "This Wall of Love is currently unpublished or draft.",
          isUnpublished: true,
        },
        { status: 403 }
      );
    }

    if (!wallData) {
      return NextResponse.json(
        { error: "Wall of Love page not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      ...wallData,
    });
  } catch (error: any) {
    console.error("Public Wall of Love API error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching Wall of Love." },
      { status: 500 }
    );
  }
}
