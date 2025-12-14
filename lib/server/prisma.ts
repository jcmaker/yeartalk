import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

// Always cache the Prisma client globally to prevent multiple instances
// This prevents "prepared statement already exists" errors in Next.js
// development (hot reload) and ensures singleton pattern in all environments
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
