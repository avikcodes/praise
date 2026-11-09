import { PaginationParams, SortParams } from "./types";

/**
 * Parses and sanitizes standard 'page' and 'limit' query parameters.
 */
export function parsePagination(url: URL): PaginationParams {
  const pageStr = url.searchParams.get("page");
  const limitStr = url.searchParams.get("limit");

  let page = parseInt(pageStr || "1", 10);
  let limit = parseInt(limitStr || "20", 10);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100; // Hard maximum to protect database memory

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Parses and sanitizes standard 'sort_by' and 'order' query parameters.
 */
export function parseSort(
  url: URL,
  allowedFields: string[],
  defaultField = "createdAt"
): SortParams {
  const rawSortBy = url.searchParams.get("sort_by") || url.searchParams.get("sort") || defaultField;
  const rawOrder = (url.searchParams.get("order") || "desc").toLowerCase();

  const sortBy = allowedFields.includes(rawSortBy) ? rawSortBy : defaultField;
  const order: "asc" | "desc" = rawOrder === "asc" ? "asc" : "desc";

  return { sortBy, order };
}

/**
 * Safely parses JSON request body with robust syntax error trapping.
 */
export async function parseJsonBody<T = Record<string, unknown>>(
  request: Request
): Promise<{ data: T | null; error?: string }> {
  try {
    const text = await request.text();
    if (!text || !text.trim()) {
      return { data: null, error: "Request body cannot be empty." };
    }
    const parsed = JSON.parse(text) as T;
    return { data: parsed };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid JSON syntax.";
    return { data: null, error: `Malformed JSON: ${message}` };
  }
}

