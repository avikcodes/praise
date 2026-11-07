import { WorkspaceRole } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { getSessionUser } from "@/lib/auth/session";

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
 * In local development (non-production), allows testing without blocking if unseeded.
 * Throws AuthError(403) if the user does not belong to the workspace or lacks the role.
 */
export async function requireWorkspaceMember(
  workspaceId: string,
  allowedRoles?: WorkspaceRole[],
) {
  const user = await requireAuth();

  try {
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
      include: {
        workspace: true,
      },
    });

    if (!membership) {
      if (process.env.NODE_ENV !== "production") {
        return {
          user,
          workspace: {
            id: workspaceId,
            name: "Default Workspace",
            slug: "default",
            logoUrl: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          role: "OWNER" as WorkspaceRole,
        };
      }
      throw new AuthError("Access denied: You are not a member of this workspace", 403);
    }

    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(membership.role)) {
        if (process.env.NODE_ENV !== "production") {
          return {
            user,
            workspace: membership.workspace,
            role: "OWNER" as WorkspaceRole,
          };
        }
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
  } catch (error) {
    if (error instanceof AuthError) {
      throw error;
    }
    if (process.env.NODE_ENV !== "production") {
      return {
        user,
        workspace: {
          id: workspaceId,
          name: "Default Workspace",
          slug: "default",
          logoUrl: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        role: "OWNER" as WorkspaceRole,
      };
    }
    throw error;
  }
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

