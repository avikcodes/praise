import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { logCustomerActivity } from "@/lib/customers/crm";

type RouteParams = {
  params: Promise<{ id: string; customerId: string }>;
};

export async function GET(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, customerId } = await context.params;
    await requireWorkspaceMember(workspaceId);

    const notes = await prisma.customerNote.findMany({
      where: {
        workspaceId,
        customerId,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      notes: notes.map((n) => ({
        id: n.id,
        content: n.content,
        authorName: n.authorName,
        authorEmail: n.authorEmail,
        isPinned: n.isPinned,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("List customer notes error:", error);
    return NextResponse.json(
      { error: "Failed to load customer notes." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, customerId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId);

    const body = await request.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";

    if (!content) {
      return NextResponse.json(
        { error: "Note content cannot be empty." },
        { status: 400 },
      );
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId, workspaceId },
      select: { id: true, name: true },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found." },
        { status: 404 },
      );
    }

    const note = await prisma.customerNote.create({
      data: {
        workspaceId,
        customerId,
        authorId: member.user.id,
        authorName: member.user.name,
        authorEmail: member.user.email,
        content,
        isPinned: Boolean(body.isPinned),
      },
    });

    await logCustomerActivity({
      workspaceId,
      customerId,
      action: "NOTE_ADDED",
      actorId: member.user.id,
      actorName: member.user.name,
      details: content.length > 80 ? `${content.slice(0, 77)}...` : content,
    });

    return NextResponse.json(
      {
        success: true,
        note: {
          id: note.id,
          content: note.content,
          authorName: note.authorName,
          authorEmail: note.authorEmail,
          isPinned: note.isPinned,
          createdAt: note.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create customer note error:", error);
    return NextResponse.json(
      { error: "Failed to create customer note." },
      { status: 500 },
    );
  }
}
