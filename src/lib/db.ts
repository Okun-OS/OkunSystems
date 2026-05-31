import { PrismaClient } from "@/generated/prisma";
import { PrismaLibSql } from "@prisma/adapter-libsql";

function resolveDbUrl() {
  const raw = process.env.DATABASE_URL ?? "file:./dev.db";
  if (typeof window === "undefined" && raw.startsWith("file:./")) {
    return raw.replace("file:./", `file:${process.cwd()}/`);
  }
  return raw;
}

function createPrismaClient() {
  const url = resolveDbUrl();
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const options = authToken ? { url, authToken } : { url };
  const adapter = new PrismaLibSql(options) as any;
  return new PrismaClient({ adapter } as any);
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
export const db = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
