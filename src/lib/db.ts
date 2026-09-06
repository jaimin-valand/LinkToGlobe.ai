import { PrismaClient } from "@/generated/prisma";

/**
 * Prisma client singleton. In dev, Next's module reloading would otherwise
 * open a new connection pool on every edit.
 *
 * Nothing in Step 1 queries the database — this is the wiring only.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
