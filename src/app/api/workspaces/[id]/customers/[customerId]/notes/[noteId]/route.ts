import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { requireWorkspaceMember } from "@/lib/auth/guards";
import { logCustomerActivity } from "@/lib/customers/crm";

type RouteParams = {
  params: Promise<{ id: string; customerId: string; noteId: string }>;
};

export async function DELETE(request: Request, context: RouteParams) {
  try {
    const { id: workspaceId, customerId, noteId } = await context.params;
    const member = await requireWorkspaceMember(workspaceId);

    const note = await prisma.customerNote.findUnique({
      where: {
        id: noteId,
        customerId,
        workspaceId,
      },
    });

    if (!note) {
      return NextResponse.json(
        { error: "Note not found." },
        { status: 404 },
      );
    }

    // Only note author or workspace admin/owner can delete
    const isAuthor = note.authorId === member.user.id;
    const isAdmin = member.role === "OWNER" || member.role === "ADMIN";

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        { error: "You do not have permission to delete this note." },
        { status: 403 },
      );
    }

    await prisma.customerNote.delete({
      where: { id: noteId },
    });

    await logCustomerActivity({
      workspaceId,
      customerId,
      action: "NOTE_DELETED",
      actorId: member.user.id,
      actorName: member.user.name,
      details: "Deleted internal note",
    });

    return NextResponse.json({
      success: true,
      message: "Note deleted successfully.",
    });
  } catch (error) {
    console.error("Delete customer note error:", error);
    return NextResponse.json(
      { error: "Failed to delete customer note." },
      { status: 500 },
    );
  }
}
