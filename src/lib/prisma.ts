import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // SQLite: one connection so the speed pragmas below apply to every query.
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  const url = raw.startsWith("file:") && !raw.includes("connection_limit") ? `${raw}${raw.includes("?") ? "&" : "?"}connection_limit=1` : raw;
  const client = new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  if (raw.startsWith("file:")) {
    // WAL + relaxed sync makes the many small writes of an auction tick far cheaper; failures are harmless.
    void client
      .$queryRawUnsafe("PRAGMA journal_mode = WAL;")
      .then(() => client.$executeRawUnsafe("PRAGMA synchronous = NORMAL;"))
      .catch(() => undefined);
  }
  return client;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
