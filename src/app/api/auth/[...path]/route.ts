import { auth } from "@/lib/auth/server";

/**
 * Neon Managed Better Auth API Route Handler.
 * Proxies auth requests from the client to the Neon Auth instance.
 */
export const { GET, POST, PUT, DELETE, PATCH } = auth.handler();
