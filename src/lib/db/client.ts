import { PrismaClient } from "@prisma/client";
import { isTransientConnectionError } from "./retry.ts";

const READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
]);

function createPrismaClient() {
  const baseClient = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const isReadOnly = READ_OPERATIONS.has(operation);

          // For non-read operations, execute directly without blind retries
          // to prevent duplicate writes or phantom updates
          if (!isReadOnly) {
            return query(args);
          }

          // For read-only operations, handle transient socket drops (e.g. idle timeout / PgBouncer pooler recycle)
          let lastError: unknown;
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              return await query(args);
            } catch (error) {
              lastError = error;
              if (attempt === 0 && isTransientConnectionError(error)) {
                // Short backoff (250ms) to allow pooler reconnect or cold-start warmup
                await new Promise((resolve) => setTimeout(resolve, 250));
                continue;
              }
              throw error;
            }
          }
          throw lastError;
        },
      },
    },
  });
}

type ExtendedPrismaClient = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma: ExtendedPrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

