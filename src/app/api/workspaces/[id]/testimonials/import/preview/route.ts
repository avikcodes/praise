import { NextRequest, NextResponse } from "next/server";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { previewExternalImport } from "@/lib/import/external-importer";
import { getExternalAdapter } from "@/lib/import/adapters/registry";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: NextRequest, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { platform, rawData, credentials, params: adapterParams, customMappings } = body;

    if (!platform || typeof platform !== "string") {
      return NextResponse.json(
        { error: "Platform selection is required." },
        { status: 400 }
      );
    }

    const adapter = getExternalAdapter(platform);
    if (!adapter) {
      return NextResponse.json(
        { error: `Unsupported platform: "${platform}".` },
        { status: 400 }
      );
    }

    let payloadToParse = rawData;

    // If automated API fetch requested with credentials
    if (credentials && adapter.supportsAutomatedApi && adapter.fetch) {
      try {
        payloadToParse = await adapter.fetch(credentials, adapterParams || {});
      } catch (fetchErr: unknown) {
        const msg = fetchErr instanceof Error ? fetchErr.message : "Failed to connect to platform API.";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
    }

    if (!payloadToParse) {
      return NextResponse.json(
        { error: "No review data or credentials provided for import." },
        { status: 400 }
      );
    }

    const preview = await previewExternalImport({
      workspaceId,
      platform,
      rawData: payloadToParse,
      customMappings,
    });

    return NextResponse.json({
      success: true,
      preview,
    });
  } catch (error: any) {
    console.error("Failed to generate import preview:", error);
    return NextResponse.json(
      { error: error.message || "Failed to preview import" },
      { status: error.status || 500 }
    );
  }
}
