import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { logCustomerActivity } from "@/lib/customers/crm";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId, ["OWNER", "ADMIN"]);

    const body = await request.json();
    const { action, customerIds, stage, tagIds } = body;

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one customer." },
        { status: 400 },
      );
    }

    if (action === "STAGE") {
      const targetStage = typeof stage === "string" ? stage.trim().toUpperCase() : "";
      if (!targetStage) {
        return NextResponse.json(
          { error: "Target lifecycle stage is required." },
          { status: 400 },
        );
      }

      await prisma.customer.updateMany({
        where: {
          id: { in: customerIds },
          workspaceId,
        },
        data: {
          stage: targetStage,
        },
      });

      for (const cid of customerIds) {
        await logCustomerActivity({
          workspaceId,
          customerId: cid,
          action: "STAGE_CHANGED",
          actorId: member.user.id,
          actorName: member.user.name,
          details: `Bulk updated lifecycle stage to ${targetStage}`,
          metadata: { targetStage },
        });
      }

      return NextResponse.json({
        success: true,
        message: `Updated lifecycle stage to "${targetStage}" for ${customerIds.length} customer(s).`,
      });
    }

    if (action === "TAG") {
      if (!Array.isArray(tagIds) || tagIds.length === 0) {
        return NextResponse.json(
          { error: "Please select at least one tag to apply." },
          { status: 400 },
        );
      }

      await prisma.$transaction(async (tx) => {
        for (const cid of customerIds) {
          for (const tid of tagIds) {
            await tx.customerTag.upsert({
              where: {
                customerId_tagId: {
                  customerId: cid,
                  tagId: tid,
                },
              },
              create: {
                customerId: cid,
                tagId: tid,
                workspaceId,
              },
              update: {},
            });
          }
        }
      });

      for (const cid of customerIds) {
        await logCustomerActivity({
          workspaceId,
          customerId: cid,
          action: "TAG_ADDED",
          actorId: member.user.id,
          actorName: member.user.name,
          details: `Applied ${tagIds.length} tag(s) in bulk`,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Applied ${tagIds.length} tag(s) to ${customerIds.length} customer(s).`,
      });
    }

    if (action === "UNTAG") {
      if (!Array.isArray(tagIds) || tagIds.length === 0) {
        return NextResponse.json(
          { error: "Please select at least one tag to remove." },
          { status: 400 },
        );
      }

      await prisma.customerTag.deleteMany({
        where: {
          customerId: { in: customerIds },
          tagId: { in: tagIds },
          workspaceId,
        },
      });

      for (const cid of customerIds) {
        await logCustomerActivity({
          workspaceId,
          customerId: cid,
          action: "TAG_REMOVED",
          actorId: member.user.id,
          actorName: member.user.name,
          details: `Removed tags in bulk`,
        });
      }

      return NextResponse.json({
        success: true,
        message: `Removed tags from ${customerIds.length} customer(s).`,
      });
    }

    if (action === "DELETE") {
      await prisma.customer.deleteMany({
        where: {
          id: { in: customerIds },
          workspaceId,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Permanently removed ${customerIds.length} customer record(s).`,
      });
    }

    return NextResponse.json(
      { error: `Unsupported bulk action "${action}".` },
      { status: 400 },
    );
  } catch (error) {
    console.error("Bulk customer action error:", error);
    return NextResponse.json(
      { error: "Failed to execute bulk customer action." },
      { status: 500 },
    );
  }
}
