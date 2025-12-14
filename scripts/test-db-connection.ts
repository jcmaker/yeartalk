// Test database connection
// Run: npx tsx scripts/test-db-connection.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

async function testConnection() {
  try {
    console.log("Testing database connection...");
    await prisma.$connect();
    console.log("✅ Database connection successful!");

    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log("✅ Query test successful:", result);

    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error(error);
    process.exit(1);
  }
}

testConnection();
