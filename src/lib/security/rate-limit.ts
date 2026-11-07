/**
 * Lightweight, in-memory rate limiter and anti-abuse protection
 * engineered for self-hosted Docker environments without requiring
 * external Redis or third-party CAPTCHAs.
 */

type RateLimitRecord = {
  timestamps: number[];
};

// Global in-memory storage for sliding window rate limiting
const ipRateLimits = new Map<string, RateLimitRecord>();

// Periodic cleanup of stale IP records every 5 minutes
if (typeof setInterval !== "undefined") {
  const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of ipRateLimits.entries()) {
      // Retain entries from the last 15 minutes only
      record.timestamps = record.timestamps.filter((ts) => now - ts < 15 * 60 * 1000);
      if (record.timestamps.length === 0) {
        ipRateLimits.delete(ip);
      }
    }
  }, CLEANUP_INTERVAL_MS).unref?.();
}

/**
 * Checks whether an incoming client IP has exceeded the allowed submission limit.
 * Default: Max 5 submissions per 3 minutes (180 seconds).
 */
export function checkRateLimit(
  clientIp: string,
  limit = 5,
  windowMs = 3 * 60 * 1000,
): { allowed: boolean; remaining: number; resetSeconds: number } {
  const now = Date.now();
  const record = ipRateLimits.get(clientIp) || { timestamps: [] };

  // Filter timestamps within the current sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= limit) {
    const oldest = record.timestamps[0];
    const resetSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetSeconds: Math.max(1, resetSeconds),
    };
  }

  // Record this submission attempt
  record.timestamps.push(now);
  ipRateLimits.set(clientIp, record);

  return {
    allowed: true,
    remaining: limit - record.timestamps.length,
    resetSeconds: Math.ceil(windowMs / 1000),
  };
}

/**
 * Extracts the real client IP from standard proxy headers.
 */
export function getClientIp(request: Request): string {
  const headers = request.headers;
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Return first IP from comma-separated list
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

/**
 * Spam heuristics inspection:
 * 1. Honeypot verification (must be empty).
 * 2. Minimum submission duration (humans take > 1.5s to read & submit).
 * 3. Link density check (excessive URLs indicate link farm spam).
 */
export function validateSpamHeuristics({
  honeypot,
  formLoadedAt,
  content,
}: {
  honeypot?: string | null;
  formLoadedAt?: number | null;
  content?: string | null;
}): { isSpam: boolean; reason?: string } {
  // 1. Honeypot check
  if (honeypot && honeypot.trim().length > 0) {
    return { isSpam: true, reason: "Automated submission detected (honeypot triggered)." };
  }

  // 2. Minimum form fill duration check
  if (formLoadedAt && typeof formLoadedAt === "number") {
    const durationMs = Date.now() - formLoadedAt;
    // Bots submit immediately (< 1200ms)
    if (durationMs < 1200) {
      return { isSpam: true, reason: "Submission rejected: Completed too quickly for a human." };
    }
  }

  // 3. Link spam check: reject content with 4 or more URLs
  if (content) {
    const urlMatches = content.match(/https?:\/\/[^\s]+/gi) || [];
    if (urlMatches.length >= 4) {
      return { isSpam: true, reason: "Submission contains excessive web links." };
    }
  }

  return { isSpam: false };
}

