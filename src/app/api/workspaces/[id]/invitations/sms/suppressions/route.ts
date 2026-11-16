import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import {
  suppressPhoneNumber,
  unsuppressPhoneNumber,
  normalizePhoneNumber,
} from "@/lib/sms/campaign-service";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");

    const where: any = { workspaceId };
    if (search?.trim()) {
      where.phoneNumber = { contains: search.trim() };
    }

    const suppressions = await prisma.smsSuppression.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      suppressions,
      count: suppressions.length,
    });
  } catch (error: any) {
    console.error("Failed to fetch SMS suppressions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch SMS suppressions" },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { phoneNumber, reason = "MANUAL_OPTOUT", details } = body;

    if (!phoneNumber?.trim()) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 }
      );
    }

    const normalized = normalizePhoneNumber(phoneNumber);
    if (!normalized) {
      return NextResponse.json(
        { error: "Invalid phone number format." },
        { status: 400 }
      );
    }

    const entry = await suppressPhoneNumber(workspaceId, normalized, reason, details);

    return NextResponse.json({
      success: true,
      entry,
      message: `Phone number ${normalized} has been added to the SMS suppression list.`,
    });
  } catch (error: any) {
    console.error("Failed to add SMS suppression:", error);
    return NextResponse.json(
      { error: error.message || "Failed to add SMS suppression" },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const { searchParams } = new URL(request.url);
    const phoneNumber = searchParams.get("phoneNumber");

    if (!phoneNumber?.trim()) {
      return NextResponse.json(
        { error: "Phone number query parameter is required." },
        { status: 400 }
      );
    }

    await unsuppressPhoneNumber(workspaceId, phoneNumber);

    return NextResponse.json({
      success: true,
      message: `Phone number ${phoneNumber} removed from suppression list.`,
    });
  } catch (error: any) {
    console.error("Failed to remove SMS suppression:", error);
    return NextResponse.json(
      { error: error.message || "Failed to remove SMS suppression" },
      { status: error.status || 500 }
    );
  }
}
