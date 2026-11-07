import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";
import { hashPassword } from "@/lib/auth/password";
import { createSession, setSessionCookie } from "@/lib/auth/session";
import { signupSchema } from "@/lib/auth/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = signupSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validated.error.format() },
        { status: 400 },
      );
    }

    const { email, password, name, workspaceName } = validated.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email address already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const resolvedWorkspaceName = workspaceName || `${name.split(" ")[0]}'s Workspace`;
    const workspaceSlug = resolvedWorkspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Atomic transaction: Create User, Workspace, WorkspaceMember(OWNER), and initial Project
    const { user, workspace } = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
        },
      });

      // Ensure unique workspace slug
      let uniqueSlug = workspaceSlug || "workspace";
      let counter = 1;
      while (await tx.workspace.findUnique({ where: { slug: uniqueSlug } })) {
        uniqueSlug = `${workspaceSlug}-${counter++}`;
      }

      const newWorkspace = await tx.workspace.create({
        data: {
          name: resolvedWorkspaceName,
          slug: uniqueSlug,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: newWorkspace.id,
          userId: newUser.id,
          role: "OWNER",
        },
      });

      // Create default project within workspace
      await tx.project.create({
        data: {
          workspaceId: newWorkspace.id,
          name: "Main Product Web",
          slug: "web-app",
          description: "Primary website and web application testimonials.",
          color: "#7049D8",
        },
      });

      return { user: newUser, workspace: newWorkspace };
    });

    // Create session & set secure HttpOnly cookie
    const sessionToken = await createSession(user.id);
    await setSessionCookie(sessionToken);

    return NextResponse.json(
      {
        message: "Account created successfully.",
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        workspace: {
          id: workspace.id,
          name: workspace.name,
          slug: workspace.slug,
          role: "OWNER",
        },
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during signup." },
      { status: 500 },
    );
  }
}
