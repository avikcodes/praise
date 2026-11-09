import { WorkspaceRole, ApiKeyType } from "@prisma/client";
import { authenticateApiKey, hashApiKey } from "./keys";
import { checkApiRateLimit, getClientIp } from "./rate-limit";
import { apiError } from "./response";
import { ApiKeyContext } from "./types";
import { NextResponse } from "next/server";

export type AuthSuccessResult = {
  success: true;
  auth: ApiKeyContext;
  rateLimitHeaders: Record<string, string>;
};

export type AuthFailureResult = {
  success: false;
  response: NextResponse;
};

export type AuthResult = AuthSuccessResult | AuthFailureResult;

/**
 * Enforces API Key authentication, rate limiting, and role-based permissions for REST API routes.
 */
export async function requireApiAuth(
  request: Request,
  options: {
    allowedRoles?: WorkspaceRole[];
    allowPublishable?: boolean;
    requiredScope?: string;
  } = {}
): Promise<AuthResult> {
  const clientIp = getClientIp(request);

  // 1. Extract API key from headers
  const authHeader = request.headers.get("authorization") || request.headers.get("x-api-key") || "";
  let rawKey = "";

  if (authHeader.startsWith("Bearer ")) {
    rawKey = authHeader.slice(7).trim();
  } else if (authHeader.trim().length > 0) {
    rawKey = authHeader.trim();
  }

  // Determine rate limit identifier (token hash if provided, otherwise client IP)
  const rateLimitId = rawKey ? hashApiKey(rawKey) : clientIp;
  const isPublishable = rawKey.startsWith("praise_pk_");
  const requestLimit = isPublishable ? 300 : 120; // 300 req/min for public keys, 120 req/min for secret keys

  // 2. Check Sliding Window Rate Limit
  const rateLimit = checkApiRateLimit(rateLimitId, requestLimit);
  if (!rateLimit.allowed) {
    return {
      success: false,
      response: apiError(
        "rate_limit_exceeded",
        "API rate limit exceeded. Please throttle your requests.",
        429,
        { retryAfterSeconds: rateLimit.resetSeconds },
        rateLimit.headers
      ),
    };
  }

  // 3. Verify Presence of Key
  if (!rawKey) {
    return {
      success: false,
      response: apiError(
        "unauthorized",
        "Authentication required. Provide a valid Bearer token in the 'Authorization' header.",
        401,
        undefined,
        rateLimit.headers
      ),
    };
  }

  // 4. Authenticate Key against Database / Config
  const authContext = await authenticateApiKey(rawKey);
  if (!authContext) {
    return {
      success: false,
      response: apiError(
        "invalid_api_key",
        "The provided API key is invalid, inactive, or has expired.",
        401,
        undefined,
        rateLimit.headers
      ),
    };
  }

  // 5. Restrict Publishable Keys to Read-Only Public Endpoints
  if (authContext.type === ApiKeyType.PUBLISHABLE && !options.allowPublishable) {
    return {
      success: false,
      response: apiError(
        "forbidden",
        "Publishable API keys are restricted to public read-only endpoints. Use a secret key for management operations.",
        403,
        undefined,
        rateLimit.headers
      ),
    };
  }

  // 6. Role & Permission Verification
  if (options.allowedRoles && options.allowedRoles.length > 0) {
    // OWNER always has full superuser permissions
    const hasRole =
      authContext.role === WorkspaceRole.OWNER ||
      options.allowedRoles.includes(authContext.role);

    if (!hasRole) {
      return {
        success: false,
        response: apiError(
          "insufficient_permissions",
          `This operation requires one of the following roles: ${options.allowedRoles.join(", ")}.`,
          403,
          undefined,
          rateLimit.headers
        ),
      };
    }
  }

  return {
    success: true,
    auth: authContext,
    rateLimitHeaders: rateLimit.headers,
  };
}

