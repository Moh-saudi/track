import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// يمنع إنشاء اتصالات متعددة بقاعدة البيانات أثناء التطوير مع Hot Reload
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const SUPABASE_FALLBACK_URL =
  "postgresql://postgres.wmgmikvjmsliizuagoer:142536475869Ph.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=disable";

function getConnectionString(): string {
  try {
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    if (ctx?.env?.HYPERDRIVE?.connectionString) {
      console.log("[PRISMA] Using Cloudflare Hyperdrive connection string");
      return ctx.env.HYPERDRIVE.connectionString;
    }
    if (ctx?.env?.DATABASE_URL) {
      return ctx.env.DATABASE_URL.trim();
    }
  } catch {
    // getCloudflareContext is only available inside Cloudflare Workers request context
  }

  let url = process.env.DATABASE_URL ? process.env.DATABASE_URL.trim() : "";

  if (!url) {
    url = SUPABASE_FALLBACK_URL;
  }

  // في البيئات السحابية Serverless (Cloudflare)، منفذ 6543 مع pgbouncer=true مطلوب لمجمع الاتصالات
  if (url.includes("pooler.supabase.com:5432")) {
    url = url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
  }
  if (url.includes("pooler.supabase.com") && !url.includes("pgbouncer=true")) {
    url += (url.includes("?") ? "&" : "?") + "pgbouncer=true";
  }
  if (url.includes("sslmode=require")) {
    url = url.replace("sslmode=require", "sslmode=disable");
  }

  return url;
}

function createPrismaClient(customConnStr?: string): PrismaClient {
  const connectionString = customConnStr || getConnectionString();

  try {
    const pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 4000,
      ssl: false,
    });

    pool.on("error", (err) => {
      console.warn("[PG POOL WARNING]:", err?.message);
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

// استخدام WeakMap لربط عميل Prisma بسياق طلب Cloudflare دون تعديل كائن البيئة المجمد (Frozen Context)
const contextClientMap = new WeakMap<object, PrismaClient>();
let fallbackClient: PrismaClient | null = null;

function getClient(): PrismaClient {
  try {
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const cfContext = getCloudflareContext();
    if (cfContext) {
      const key = (cfContext.ctx || cfContext.env || cfContext) as object;
      if (key && typeof key === "object") {
        let client = contextClientMap.get(key);
        if (!client) {
          const url =
            cfContext.env?.HYPERDRIVE?.connectionString ||
            cfContext.env?.DATABASE_URL;
          client = createPrismaClient(url);
          contextClientMap.set(key, client);
        }
        return client;
      }
    }
  } catch {
    // خارج سياق الطلب (أثناء البناء أو في بيئة Node)
  }

  if (!fallbackClient) {
    fallbackClient = globalForPrisma.prisma ?? createPrismaClient();
    globalForPrisma.prisma = fallbackClient;
  }
  return fallbackClient;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    return (client as any)[prop];
  },
});
