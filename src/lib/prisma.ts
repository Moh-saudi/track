import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// يمنع إنشاء اتصالات متعددة بقاعدة البيانات أثناء التطوير مع Hot Reload
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    try {
      const isLocal =
        connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

      const pool = new Pool({
        connectionString,
        max: 1,
        maxUses: 1,
        connectionTimeoutMillis: 8000,
        ssl: isLocal ? false : { rejectUnauthorized: false },
      });

      const adapter = new PrismaPg(pool);
      return new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
      });
    } catch (e) {
      console.warn("PrismaPg adapter initialization failed, falling back to standard PrismaClient:", e);
    }
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

// استخدام Lazy Proxy يضمن عدم محاولة الاتصال بقاعدة البيانات أثناء الـ Build على السيرفر
let cachedClient: PrismaClient | null = null;

function getClient(): PrismaClient {
  if (!cachedClient) {
    cachedClient = globalForPrisma.prisma ?? createPrismaClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = cachedClient;
    }
  }
  return cachedClient;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as any)[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
