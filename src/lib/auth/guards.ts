import { WorkspaceRole } from "@prisma/client";
import { prisma } from "../db/client.ts";
import { getSessionUser } from "./session.ts";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
    this.name = "AuthError";
  }
}

/**
 * Local development fallback user when running locally without active session cookies.
 * This ensures that local testing works immediately without enforcing login/signup.
 */
const DEV_FALLBACK_USER = {
  id: "usr_dev_local",
  email: "dev@praise.local",
  name: "Local Developer",
  avatarUrl: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

async function getDevFallbackUser() {
  if (process.env.DATABASE_URL) {
    try {
      // Upsert dev user in DB so foreign key constraints are met
      const user = await prisma.user.upsert({
        where: { id: DEV_FALLBACK_USER.id },
        update: {},
        create: {
          id: DEV_FALLBACK_USER.id,
          email: DEV_FALLBACK_USER.email,
          name: DEV_FALLBACK_USER.name,
          passwordHash: "dev_bypass_hash",
        },
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
          createdAt: true,
        },
      });

      // Ensure dev user has a real workspace in the database
      const existingMembership = await prisma.workspaceMember.findFirst({
        where: { userId: DEV_FALLBACK_USER.id },
        include: { workspace: true },
      });

      if (!existingMembership) {
        await prisma.workspace.create({
          data: {
            name: "Local Dev Workspace",
            slug: "dev-workspace",
            members: {
              create: {
                userId: DEV_FALLBACK_USER.id,
                role: "OWNER",
              },
            },
            projects: {
              create: {
                name: "Main Product Web",
                slug: "web-app",
                description: "Primary website and web application testimonials.",
                color: "#7049D8",
              },
            },
          },
        });
      }

      return user;
    } catch {
      return DEV_FALLBACK_USER;
    }
  }
  return DEV_FALLBACK_USER;
}

/**
 * Requires an authenticated user session.
 * In local development (non-production), bypasses the guard to allow direct product testing.
 * Throws AuthError(401) if unauthenticated in production.
 */
export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    if (process.env.NODE_ENV !== "production") {
      return await getDevFallbackUser();
    }
    throw new AuthError("Authentication required", 401);
  }
  return user;
}

/**
 * Enforces strict workspace scoping and membership verification.
 * Prevents cross-workspace data access by checking that the authenticated
 * user holds active membership in the specified workspace.
 *
 * If the legacy alias "ws-default" or "default" is provided, safely resolves
 * to the authenticated user's actual active workspace from the database.
 * Never resolves to an arbitrary user's workspace.
 *
 * Throws AuthError(404) if the workspace does not exist.
 * Throws AuthError(403) if the user does not belong to the workspace or lacks the required role.
 */
export async function requireWorkspaceMember(
  workspaceId: string,
  allowedRoles?: WorkspaceRole[],
) {
  const user = await requireAuth();

  if (!workspaceId || typeof workspaceId !== "string" || !workspaceId.trim()) {
    throw new AuthError("Workspace ID is required", 400);
  }

  const normalizedWsId = workspaceId.trim();
  const isDefaultAlias =
    normalizedWsId === "ws-default" ||
    normalizedWsId === "default" ||
    normalizedWsId.startsWith("ws-default");

  if (isDefaultAlias) {
    // Resolve to the authenticated user's actual active workspace
    let membership = await prisma.workspaceMember.findFirst({
      where: { userId: user.id },
      include: {
        workspace: true,
      },
      orderBy: { createdAt: "asc" },
    });

    if (!membership) {
      // Check if user exists in User table
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      if (!dbUser) {
        throw new AuthError("User not found", 401);
      }

      // Provision an initial workspace for this user idempotently
      const workspaceName = `${user.name || "My"}'s Workspace`;
      const baseSlug = (user.name || "workspace")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "workspace";
      const safeSuffix = user.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6) || "team";
      const slug = `${baseSlug}-${safeSuffix}`;

      const existingSlug = await prisma.workspace.findUnique({ where: { slug } });
      const finalSlug = existingSlug
        ? `${slug}-${Math.floor(1000 + Math.random() * 9000)}`
        : slug;

      const createdWorkspace = await prisma.workspace.create({
        data: {
          name: workspaceName,
          slug: finalSlug,
          members: {
            create: {
              userId: user.id,
              role: "OWNER",
            },
          },
          projects: {
            create: {
              name: "Main Product Web",
              slug: "web-app",
              description: "Primary website and web application testimonials.",
              color: "#7049D8",
            },
          },
        },
        include: {
          members: {
            where: { userId: user.id },
            include: { workspace: true },
          },
        },
      });

      membership = createdWorkspace.members[0];
    }

    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(membership.role)) {
        throw new AuthError(
          `Insufficient permissions: Required role ${allowedRoles.join(" or ")}, but you have ${membership.role}`,
          403,
        );
      }
    }

    return {
      user,
      workspace: membership.workspace,
      role: membership.role,
    };
  }

  // Canonical workspace lookup
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: {
        workspaceId: normalizedWsId,
        userId: user.id,
      },
    },
    include: {
      workspace: true,
    },
  });

  if (!membership) {
    // Check if the workspace exists at all in the database
    const workspaceExists = await prisma.workspace.findUnique({
      where: { id: normalizedWsId },
      select: { id: true },
    });

    if (!workspaceExists) {
      throw new AuthError("Workspace not found", 404);
    }

    throw new AuthError("Access denied: You are not a member of this workspace", 403);
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(membership.role)) {
      throw new AuthError(
        `Insufficient permissions: Required role ${allowedRoles.join(" or ")}, but you have ${membership.role}`,
        403,
      );
    }
  }

  return {
    user,
    workspace: membership.workspace,
    role: membership.role,
  };
}

/**
 * Validates that a project belongs strictly to the user's workspace.
 */
export async function requireProjectInWorkspace(projectId: string, workspaceId: string) {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      workspaceId,
    },
  });

  if (!project) {
    throw new AuthError("Project not found in this workspace", 404);
  }

  return project;
}

/**
 * Validates that a collection form belongs strictly to the user's workspace.
 */
export async function requireFormInWorkspace(formId: string, workspaceId: string) {
  const form = await prisma.collectionForm.findFirst({
    where: {
      id: formId,
      workspaceId,
    },
  });

  if (!form) {
    throw new AuthError("Collection form not found in this workspace", 404);
  }

  return form;
}

/**
 * Validates that a testimonial belongs strictly to the user's workspace.
 */
export async function requireTestimonialInWorkspace(testimonialId: string, workspaceId: string) {
  const testimonial = await prisma.testimonial.findFirst({
    where: {
      id: testimonialId,
      workspaceId,
    },
  });

  if (!testimonial) {
    throw new AuthError("Testimonial not found in this workspace", 404);
  }

  return testimonial;
}

