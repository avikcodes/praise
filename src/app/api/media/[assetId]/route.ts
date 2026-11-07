import { NextResponse } from "next/server";
import { retrieveMediaAsset } from "@/lib/storage/service";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";

type RouteParams = {
  params: Promise<{ assetId: string }>;
};

function getSafeFileExtension(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "video/mp4":
      return "mp4";
    case "video/webm":
      return "webm";
    case "video/quicktime":
      return "mov";
    default:
      return "bin";
  }
}

export async function GET(request: Request, context: RouteParams) {
  try {
    const { assetId } = await context.params;
    const { searchParams } = new URL(request.url);
    const isDownload =
      searchParams.get("download") === "true" ||
      searchParams.get("download") === "1";

    const media = await retrieveMediaAsset(assetId);
    if (!media) {
      return new NextResponse("Media asset not found", { status: 404 });
    }

    const { asset, buffer, testimonialStatus } = media;

    // 1. Access & Visibility Rules
    // If the media is attached to an unapproved testimonial (PENDING, REJECTED, ARCHIVED),
    // or if the user is downloading original media, verify workspace membership authorization.
    const isPublicApproved = !testimonialStatus || testimonialStatus === "APPROVED";

    if (!isPublicApproved || isDownload) {
      let isAuthorized = false;

      // In local development, permit access for rapid testing
      if (process.env.NODE_ENV !== "production") {
        isAuthorized = true;
      } else {
        const user = await getSessionUser();
        if (user) {
          const membership = await prisma.workspaceMember.findUnique({
            where: {
              workspaceId_userId: {
                workspaceId: asset.workspaceId,
                userId: user.id,
              },
            },
          });
          if (membership) {
            isAuthorized = true;
          }
        }
      }

      if (!isAuthorized) {
        if (isDownload) {
          return new NextResponse(
            "Unauthorized: You must be an authorized workspace member to download original media.",
            { status: 401 },
          );
        }
        return new NextResponse(
          "Access restricted: This media is pending moderation approval.",
          { status: 403 },
        );
      }
    }

    const totalSize = buffer.length;
    const rangeHeader = request.headers.get("range");
    const ext = getSafeFileExtension(asset.mimeType);
    const downloadFilename = `praise-${asset.type.toLowerCase()}-${asset.id}.${ext}`;

    // Standard security headers to prevent MIME confusion & script execution
    const baseHeaders = {
      "Content-Type": asset.mimeType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": isDownload
        ? "private, no-cache"
        : "public, max-age=31536000, immutable",
      "Content-Disposition": isDownload
        ? `attachment; filename="${downloadFilename}"`
        : `inline; filename="asset-${asset.id}.${ext}"`,
      "Accept-Ranges": "bytes",
    };

    // Range request handling for video playback & seeking (HTTP 206 Partial Content)
    if (rangeHeader && rangeHeader.startsWith("bytes=") && !isDownload) {
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (start >= totalSize || end >= totalSize || start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${totalSize}`,
          },
        });
      }

      const chunk = buffer.subarray(start, end + 1);
      return new NextResponse(new Uint8Array(chunk), {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Range": `bytes ${start}-${end}/${totalSize}`,
          "Content-Length": chunk.length.toString(),
        },
      });
    }

    // Full file response (HTTP 200)
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        ...baseHeaders,
        "Content-Length": totalSize.toString(),
      },
    });
  } catch (error) {
    console.error("Error serving media asset:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
