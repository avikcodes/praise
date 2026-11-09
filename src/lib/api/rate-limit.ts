/**
 * REST API In-Memory Sliding Window Rate Limiter.
 * Tracks request counts per API key hash or client IP without external infrastructure dependencies.
 */
import { getClientIp } from "@/lib/security/rate-limit";

type ApiRateLimitRecord = {
  timestamps: number[];
};

const tokenRateLimits = new Map<string, ApiRateLimitRecord>();

// Cleanup stale records every 5 minutes
if (typeof setInterval !== "undefined") {
  const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of tokenRateLimits.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
      if (record.timestamps.length === 0) {
        tokenRateLimits.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS).unref?.();
}

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
  headers: Record<string, string>;
};

/**
 * Checks and records rate limit usage for a given API identifier (Key Hash or Client IP).
 * 
 * @param identifier - Unique API token hash or client IP
 * @param limit - Maximum requests allowed in the window (default: 120 req/min for secret keys, 300 for public)
 * @param windowMs - Sliding window duration in milliseconds (default: 60,000 ms = 1 minute)
 */
export function checkApiRateLimit(
  identifier: string,
  limit = 120,
  windowMs = 60 * 1000
): RateLimitResult {
  const now = Date.now();
  const record = tokenRateLimits.get(identifier) || { timestamps: [] };

  // Retain only requests within the current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0] || now;
    const resetSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetSeconds,
      headers: {
        "X-RateLimit-Limit": String(limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(resetSeconds),
        "Retry-After": String(resetSeconds),
      },
    };
  }

  // Record this request
  record.timestamps.push(now);
  tokenRateLimits.set(identifier, record);

  const remaining = Math.max(0, limit - record.timestamps.length);
  const resetSeconds = Math.ceil(windowMs / 1000);

  return {
    allowed: true,
    limit,
    remaining,
    resetSeconds,
    headers: {
      "X-RateLimit-Limit": String(limit),
      "X-RateLimit-Remaining": String(remaining),
      "X-RateLimit-Reset": String(resetSeconds),
    },
  };
}

export { getClientIp };
