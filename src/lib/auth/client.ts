"use client";

import { createAuthClient } from "@neon/auth/next";

/**
 * Browser-side Neon Auth client singleton.
 * Uses Better Auth client wrapper configured for Neon Managed Auth.
 */
export const authClient = createAuthClient();

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
