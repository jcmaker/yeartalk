import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client singleton for Next.js
 *
 * Automatically adds pgbouncer=true to DATABASE_URL to prevent
 * "prepared statement already exists" errors in serverless environments
 * with connection pooling (e.g., Supabase, Vercel).
 */
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  // If pgbouncer parameter is already present, return as-is
  if (url.includes("pgbouncer=true")) {
    return url;
  }

  // Add pgbouncer=true and connection_limit=1 for serverless environments
  // This disables prepared statements which are incompatible with connection poolers
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}pgbouncer=true&connection_limit=1`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  });

// Always cache the Prisma client globally to prevent multiple instances
// This prevents "prepared statement already exists" errors in Next.js
// development (hot reload) and ensures singleton pattern in all environments
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
