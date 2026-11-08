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

function createPrismaClient(connStr?: string): PrismaClient {
  const connectionString = connStr || getConnectionString();

  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    ssl: false,
  });

  pool.on("error", (err) => {
    console.warn("[PG POOL ERROR]:", err?.message);
    cachedClient = null;
    globalForPrisma.prisma = undefined;
  });

  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter, log: ["error"] });
}

// عميل Prisma موحد على مستوى Isolate (Singleton) مع تفضيل فوري لـ Cloudflare Hyperdrive
let cachedClient: PrismaClient | null = null;

function resetCachedClient(reason?: string) {
  if (reason) {
    console.warn("[PRISMA RESET]:", reason);
  }
  cachedClient = null;
  globalForPrisma.prisma = undefined;
}

function getClient(): PrismaClient {
  let hyperdriveUrl: string | null = null;
  try {
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    if (ctx?.env?.HYPERDRIVE?.connectionString) {
      hyperdriveUrl = ctx.env.HYPERDRIVE.connectionString;
    }
  } catch {}

  // إذا كان العميل المخزن يعمل بالفعل عبر Hyperdrive، نستخدمه فورا
  if (cachedClient && (cachedClient as any).__usesHyperdrive) {
    return cachedClient;
  }

  // إذا توفر Hyperdrive في هذا الطلب، نقوم بإنشاء العميل وتثبيته في الذاكرة
  if (hyperdriveUrl) {
    const client = createPrismaClient(hyperdriveUrl);
    (client as any).__usesHyperdrive = true;
    cachedClient = client;
    globalForPrisma.prisma = client;
    return cachedClient;
  }

  if (cachedClient) return cachedClient;

  const fallbackUrl = getConnectionString();
  cachedClient = createPrismaClient(fallbackUrl);
  globalForPrisma.prisma = cachedClient;
  return cachedClient;
}

function isConnectionError(err: any): boolean {
  const msg = (err?.message || String(err)).toLowerCase();
  return (
    msg.includes("connect") ||
    msg.includes("closed") ||
    msg.includes("socket") ||
    msg.includes("timeout") ||
    msg.includes("terminated") ||
    msg.includes("connection")
  );
}

function wrapMethod(targetObj: any, fnName: string) {
  const original = targetObj[fnName];
  if (typeof original !== "function") return original;
  return function (...args: any[]) {
    try {
      const res = original.apply(targetObj, args);
      if (res && typeof res.then === "function") {
        return res.catch((err: any) => {
          if (isConnectionError(err)) {
            resetCachedClient(err?.message);
          }
          throw err;
        });
      }
      return res;
    } catch (err: any) {
      if (isConnectionError(err)) {
        resetCachedClient(err?.message);
      }
      throw err;
    }
  };
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = (client as any)[prop];

    if (typeof value === "function") {
      return wrapMethod(client, prop as string);
    }

    if (value && typeof value === "object") {
      return new Proxy(value, {
        get(modelTarget, modelProp) {
          const modelVal = modelTarget[modelProp];
          if (typeof modelVal === "function") {
            return wrapMethod(modelTarget, modelProp as string);
          }
          return modelVal;
        },
      });
    }

    return value;
  },
});
