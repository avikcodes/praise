import { NextResponse } from "next/server";
import { ApiResponse, ApiErrorResponse, PaginationMeta } from "./types";

export const API_VERSION = "2026-11-01";

const DEFAULT_HEADERS: Record<string, string> = {
  "API-Version": API_VERSION,
  "Cache-Control": "no-store, no-cache, must-revalidate",
};

/**
 * Creates a standardized 2xx JSON response wrapper conforming to the Praise API specification.
 */
export function apiSuccess<T>(
  data: T,
  meta?: PaginationMeta,
  status = 200,
  extraHeaders?: Record<string, string>
) {
  const body: ApiResponse<T> = { data };
  if (meta) {
    body.meta = meta;
  }

  return NextResponse.json(body, {
    status,
    headers: {
      ...DEFAULT_HEADERS,
      ...extraHeaders,
    },
  });
}

/**
 * Creates a standardized error JSON response wrapper conforming to the Praise API specification.
 */
export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
  extraHeaders?: Record<string, string>
) {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      status,
      ...(details !== undefined ? { details } : {}),
    },
  };

  return NextResponse.json(body, {
    status,
    headers: {
      ...DEFAULT_HEADERS,
      ...extraHeaders,
    },
  });
}

/**
 * Calculates standard pagination metadata.
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const safePage = Math.max(1, page);
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const totalPages = Math.ceil(total / safeLimit);

  return {
    total,
    page: safePage,
    limit: safeLimit,
    totalPages,
    hasMore: safePage < totalPages,
  };
}

