import { requireApiAuth } from "@/lib/api/auth";
import { formatCustomer } from "@/lib/api/formatters";
import { apiSuccess, apiError, buildPaginationMeta } from "@/lib/api/response";
import { parseJsonBody, parsePagination, parseSort } from "@/lib/api/validation";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@prisma/client";

/**
 * GET /api/v1/customers
 * Lists customers in the workspace with pagination, sorting, and search.
 */
export async function GET(request: Request) {
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;
  const url = new URL(request.url);

  const { page, limit, skip } = parsePagination(url);
  const { sortBy, order } = parseSort(url, ["name", "email", "createdAt", "updatedAt"], "createdAt");
  const searchQuery = url.searchParams.get("search") || url.searchParams.get("q") || "";

  const whereClause: Prisma.CustomerWhereInput = {
    workspaceId: auth.workspaceId,
    ...(searchQuery
      ? {
          OR: [
            { name: { contains: searchQuery, mode: "insensitive" } },
            { email: { contains: searchQuery, mode: "insensitive" } },
            { company: { contains: searchQuery, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  try {
    const [total, customers] = await Promise.all([
      prisma.customer.count({ where: whereClause }),
      prisma.customer.findMany({
        where: whereClause,
        orderBy: { [sortBy]: order },
        skip,
        take: limit,
      }),
    ]);

    const meta = buildPaginationMeta(total, page, limit);
    return apiSuccess(customers.map(formatCustomer), meta, 200, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to retrieve customers.", 500, error instanceof Error ? error.message : undefined);
  }
}

/**
 * POST /api/v1/customers
 * Creates or registers a customer profile.
 */
export async function POST(request: Request) {
  const authResult = await requireApiAuth(request);
  if (!authResult.success) {
    return authResult.response;
  }

  const { auth, rateLimitHeaders } = authResult;
  const { data: body, error: bodyError } = await parseJsonBody<{
    name?: string;
    email?: string;
    company?: string;
    title?: string;
    avatarUrl?: string;
    socialHandle?: string;
  }>(request);

  if (bodyError || !body) {
    return apiError("invalid_request", bodyError || "Invalid request body.", 400, undefined, rateLimitHeaders);
  }

  if (!body.name || !body.name.trim()) {
    return apiError("validation_error", "Field 'name' is required.", 400, undefined, rateLimitHeaders);
  }

  if (!body.email || !body.email.includes("@")) {
    return apiError("validation_error", "Field 'email' must be a valid email address.", 400, undefined, rateLimitHeaders);
  }

  const email = body.email.trim().toLowerCase();

  try {
    const customer = await prisma.customer.upsert({
      where: {
        workspaceId_email: {
          workspaceId: auth.workspaceId,
          email,
        },
      },
      update: {
        name: body.name.trim(),
        ...(body.company !== undefined && { company: body.company?.trim() || null }),
        ...(body.title !== undefined && { title: body.title?.trim() || null }),
        ...(body.avatarUrl !== undefined && { avatarUrl: body.avatarUrl?.trim() || null }),
        ...(body.socialHandle !== undefined && { socialHandle: body.socialHandle?.trim() || null }),
      },
      create: {
        workspaceId: auth.workspaceId,
        name: body.name.trim(),
        email,
        company: body.company?.trim() || null,
        title: body.title?.trim() || null,
        avatarUrl: body.avatarUrl?.trim() || null,
        socialHandle: body.socialHandle?.trim() || null,
      },
    });

    return apiSuccess(formatCustomer(customer), undefined, 201, rateLimitHeaders);
  } catch (error) {
    return apiError("internal_error", "Failed to create or update customer.", 500, error instanceof Error ? error.message : undefined);
  }
}

