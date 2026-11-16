import { Prisma } from "@prisma/client";

/**
 * Checks whether a database error is a transient connection failure
 * (e.g. Neon scale-to-zero compute cold start, PgBouncer pooler warmup,
 * idle socket timeout, or server-side socket closure).
 */
export function isTransientConnectionError(error: unknown): boolean {
  if (!error) return false;

  // Prisma known request errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const transientCodes = ["P1001", "P1002", "P1008", "P1017", "P2024"];
    if (transientCodes.includes(error.code)) {
      return true;
    }
  }

  // Prisma initialization errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    if (error.errorCode && ["P1001", "P1002", "P1008", "P1017"].includes(error.errorCode)) {
      return true;
    }
    const msg = error.message.toLowerCase();
    if (
      msg.includes("can't reach database server") ||
      msg.includes("connection timed out") ||
      msg.includes("closed the connection") ||
      msg.includes("kind: closed") ||
      msg.includes("connection closed")
    ) {
      return true;
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (
      msg.includes("p1001") ||
      msg.includes("p1002") ||
      msg.includes("p1008") ||
      msg.includes("p1017") ||
      msg.includes("p2024") ||
      msg.includes("can't reach database server") ||
      msg.includes("connection closed") ||
      msg.includes("closed the connection") ||
      msg.includes("kind: closed") ||
      msg.includes("error in postgresql connection") ||
      msg.includes("connection terminated unexpectedly") ||
      msg.includes("server has closed the connection") ||
      msg.includes("econnreset") ||
      msg.includes("etimedout") ||
      msg.includes("broken pipe") ||
      msg.includes("socket closed")
    ) {
      return true;
    }
  }

  return false;
}

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  backoffFactor?: number;
  operationName?: string;
}

/**
 * Executes a read-only or idempotent database operation with bounded retry
 * for transient connection failures (e.g. Neon scale-to-zero compute cold start).
 *
 * Never retries non-transient errors (such as schema errors, constraints, or authorization errors).
 */
export async function withDatabaseRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2;
  const initialDelayMs = options.initialDelayMs ?? 600;
  const backoffFactor = options.backoffFactor ?? 2;
  const opName = options.operationName ?? "database operation";

  let lastError: unknown;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt < maxRetries && isTransientConnectionError(error)) {
        console.warn(
          `[db-retry] Transient connection failure during ${opName} (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= backoffFactor;
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
