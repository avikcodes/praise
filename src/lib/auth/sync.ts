import type { User, WorkspaceMember, Workspace, Prisma } from "@prisma/client";
import { prisma } from "../db/client.ts";

export interface NeonUserData {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}

export type UserWithMemberships = User & {
  memberships: (WorkspaceMember & {
    workspace: Workspace;
  })[];
};

// In-flight synchronization promise map to deduplicate concurrent requests for the same user
const syncLocks = new Map<string, Promise<UserWithMemberships>>();

/**
 * Synchronizes an authenticated Neon Auth user with Praise's application database.
 * - Idempotently maps the Neon Auth user ID to the local Prisma User model.
 * - Prevents race conditions and duplicate ID errors under concurrent requests.
 * - Does not store passwords in Prisma (passwords belong to Neon Auth).
 * - Ensures the user has an initial Workspace and WorkspaceMember (OWNER) role in a transaction.
 * - Ensures the initial Workspace has a default Project.
 * - Preserves existing user profiles, workspace memberships, and roles.
 */
export async function syncNeonUser(neonUser: NeonUserData): Promise<UserWithMemberships> {
  if (!neonUser || !neonUser.id) {
    throw new Error("Neon user data with a valid ID is required for synchronization");
  }

  const normalizedEmail = (neonUser.email || "").toLowerCase().trim();
  const lockKey = neonUser.id;

  const inFlight = syncLocks.get(lockKey);
  if (inFlight) {
    return inFlight;
  }

  const syncPromise = performSync(neonUser, normalizedEmail).finally(() => {
    syncLocks.delete(lockKey);
  });

  syncLocks.set(lockKey, syncPromise);
  return syncPromise;
}

async function performSync(
  neonUser: NeonUserData,
  normalizedEmail: string,
): Promise<UserWithMemberships> {
  const displayName =
    neonUser.name?.trim() ||
    (normalizedEmail ? normalizedEmail.split("@")[0] : "") ||
    "User";

  // 1. Primary lookup by Neon Auth ID
  let user: UserWithMemberships | null = await prisma.user.findUnique({
    where: { id: neonUser.id },
    include: {
      memberships: {
        include: {
          workspace: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // 2. Secondary lookup by normalized email if user wasn't found by ID
  if (!user && normalizedEmail) {
    user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          include: {
            workspace: true,
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    // If existing local user was found by email, preserve profile and reuse
    if (user) {
      const updates: Prisma.UserUpdateInput = {};
      if (!user.name && displayName) {
        updates.name = displayName;
      }
      if (!user.avatarUrl && neonUser.image) {
        updates.avatarUrl = neonUser.image;
      }

      if (Object.keys(updates).length > 0) {
        try {
          user = await prisma.user.update({
            where: { id: user.id },
            data: updates,
            include: {
              memberships: {
                include: {
                  workspace: true,
                },
                orderBy: { createdAt: "asc" },
              },
            },
          });
        } catch {
          // Ignore concurrent update errors
        }
      }
    }
  }

  // 3. User does not exist yet: create with P2002 conflict handling
  if (!user) {
    try {
      user = await prisma.user.create({
        data: {
          id: neonUser.id,
          email: normalizedEmail,
          name: displayName,
          avatarUrl: neonUser.image || null,
          passwordHash: null, // Neon Auth owns authentication credentials
        },
        include: {
          memberships: {
            include: {
              workspace: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });
    } catch (error: any) {
      // If a concurrent request created this user simultaneously, catch P2002 and retrieve it
      if (error?.code === "P2002") {
        user = await prisma.user.findFirst({
          where: {
            OR: [
              { id: neonUser.id },
              ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
            ],
          },
          include: {
            memberships: {
              include: {
                workspace: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        });

        if (!user) {
          throw error;
        }
      } else {
        throw error;
      }
    }
  }

  // 4. Ensure user has at least one Workspace and WorkspaceMember(OWNER)
  if (!user.memberships || user.memberships.length === 0) {
    user = await provisionUserWorkspace(user, displayName);
  }

  return user;
}

/**
 * Idempotently provisions a default workspace and project for a user within a transaction.
 */
async function provisionUserWorkspace(
  user: UserWithMemberships,
  displayName: string,
): Promise<UserWithMemberships> {
  return await prisma.$transaction(
    async (tx) => {
      // 1. Re-check inside transaction to avoid race condition creating multiple workspaces
      const existingMembership = await tx.workspaceMember.findFirst({
        where: { userId: user.id },
        include: {
          workspace: true,
        },
      });

      if (existingMembership) {
        const refreshed = await tx.user.findUnique({
          where: { id: user.id },
          include: {
            memberships: {
              include: {
                workspace: true,
              },
              orderBy: { createdAt: "asc" },
            },
          },
        });
        return refreshed || user;
      }

      // 2. Generate clean, unique workspace slug
      const workspaceName = `${displayName}'s Workspace`;
      const baseSlug =
        workspaceName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "workspace";

      const safeSuffix = user.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6) || "team";
      let uniqueSlug = `${baseSlug}-${safeSuffix}`;

      // Single nested write creating Workspace + WorkspaceMember(OWNER) + default Project atomically
      try {
        await tx.workspace.create({
          data: {
            name: workspaceName,
            slug: uniqueSlug,
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
        });
      } catch (err: any) {
        if (err?.code === "P2002" && err?.meta?.target?.includes("slug")) {
          uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;
          await tx.workspace.create({
            data: {
              name: workspaceName,
              slug: uniqueSlug,
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
          });
        } else {
          throw err;
        }
      }

      // Re-fetch user with new membership
      const refreshed = await tx.user.findUnique({
        where: { id: user.id },
        include: {
          memberships: {
            include: {
              workspace: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      });

      return refreshed || user;
    },
    {
      maxWait: 15000,
      timeout: 25000,
    },
  );
}
