import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// يمنع إنشاء اتصالات متعددة بقاعدة البيانات أثناء التطوير مع Hot Reload
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const SUPABASE_FALLBACK_URL =
  "postgresql://postgres.wmgmikvjmsliizuagoer:142536475869Ph.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

function getConnectionString(): string {
  let url = "";
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "") {
    url = process.env.DATABASE_URL.trim();
  } else {
    try {
      const { getCloudflareContext } = require("@opennextjs/cloudflare");
      const ctx = getCloudflareContext();
      if (ctx?.env?.DATABASE_URL) {
        url = ctx.env.DATABASE_URL.trim();
      }
    } catch {
      // getCloudflareContext is only available inside Cloudflare Workers request context
    }
  }

  if (!url) {
    url = SUPABASE_FALLBACK_URL;
  }

  // في البيئات السحابية Serverless (Cloudflare)، منفذ 6543 مع pgbouncer=true إلزامي لمنع انقطاع الاتصالات
  if (url.includes("pooler.supabase.com:5432")) {
    url = url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
    if (!url.includes("pgbouncer=true")) {
      url += (url.includes("?") ? "&" : "?") + "pgbouncer=true";
    }
  }

  return url;
}

function createPrismaClient(): PrismaClient {
  const connectionString = getConnectionString();
  const isLocal =
    connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

  try {
    const pool = new Pool({
      connectionString,
      max: 1,
      maxUses: 1,
      idleTimeoutMillis: 1000,
      connectionTimeoutMillis: 10000,
      ssl: isLocal ? false : { rejectUnauthorized: false },
    });

    const adapter = new PrismaPg(pool);
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  } catch (e) {
    console.warn("PrismaPg adapter initialization failed:", e);
    return new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
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
