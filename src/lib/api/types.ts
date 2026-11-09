import { WorkspaceRole, ApiKeyType } from "@prisma/client";

export type ApiKeyContext = {
  keyId: string;
  keyPrefix: string;
  name: string;
  workspaceId: string;
  role: WorkspaceRole;
  type: ApiKeyType;
  scopes?: string[];
};

export type PaginationParams = {
  page: number;
  limit: number;
  skip: number;
};

export type PaginationMeta = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
};

export type SortParams = {
  sortBy: string;
  order: "asc" | "desc";
};

export type ApiResponse<T> = {
  data: T;
  meta?: PaginationMeta;
};

export type ApiErrorResponse = {
  error: {
    code: string;
    message: string;
    status: number;
    details?: unknown;
  };
};

