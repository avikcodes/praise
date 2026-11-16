import { NextRequest, NextResponse } from "next/server";
import { resolvePublicBrand } from "@/lib/brands/service";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

/**
 * GET /api/brand/[slug]
 * Resolves public brand profile data.
 */
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const isPreview = searchParams.get("preview") === "true";

    const { brandData, isUnpublished } = await resolvePublicBrand(slug, {
      preview: isPreview,
    });

    if (isUnpublished && !isPreview) {
      return NextResponse.json(
        { error: "This brand page is currently unpublished.", isUnpublished: true },
        { status: 403 }
      );
    }

    if (!brandData) {
      return NextResponse.json(
        { error: "Brand page not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: brandData,
    });
  } catch (error: any) {
    console.error("Failed to resolve public brand data:", error);
    return NextResponse.json(
      { error: "Internal server error resolving brand page." },
      { status: 500 }
    );
  }
}
