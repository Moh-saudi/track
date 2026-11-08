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

// عميل موحد (Isolate Singleton) مع تفضيل تلقائي لـ Cloudflare Hyperdrive
let cachedClient: PrismaClient | null = null;

function getClient(): PrismaClient {
  if (cachedClient && (cachedClient as any).__usesHyperdrive) {
    return cachedClient;
  }

  let hyperdriveUrl: string | null = null;
  try {
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    if (ctx?.env?.HYPERDRIVE?.connectionString) {
      hyperdriveUrl = ctx.env.HYPERDRIVE.connectionString;
    }
  } catch {}

  if (hyperdriveUrl) {
    if (!cachedClient || !(cachedClient as any).__usesHyperdrive) {
      const client = createPrismaClient(hyperdriveUrl);
      (client as any).__usesHyperdrive = true;
      cachedClient = client;
      globalForPrisma.prisma = client;
    }
    return cachedClient;
  }

  if (cachedClient) return cachedClient;
  cachedClient = globalForPrisma.prisma ?? createPrismaClient();
  globalForPrisma.prisma = cachedClient;
  return cachedClient;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    return (client as any)[prop];
  },
});
