import { PrismaClient } from "@prisma/client";
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

// تخزين عميل Prisma لكل سياق طلب في Cloudflare Workers (Request-scoped WeakMap)
// يمنع نهائياً تسريب مقابس TCP أو محاولة إعادة استخدام مقابس مغلقة بين الطلبات المنفصلة (Error 1101 / 1102)
const contextClientMap = new WeakMap<object, PrismaClient>();
let fallbackClient: PrismaClient | null = null;

function getClient(): PrismaClient {
  try {
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const cfContext = getCloudflareContext();
    if (cfContext) {
      const key = (cfContext.ctx || cfContext) as object;
      if (key && typeof key === "object") {
        let client = contextClientMap.get(key);
        if (!client) {
          const connectionString =
            cfContext.env?.HYPERDRIVE?.connectionString ||
            cfContext.env?.DATABASE_URL ||
            getConnectionString();
          const adapter = new PrismaPg({ connectionString });
          client = new PrismaClient({ adapter, log: ["error"] });
          contextClientMap.set(key, client);
        }
        return client;
      }
    }
  } catch {
    // خارج سياق طلب Cloudflare (أثناء البناء أو في بيئة Node)
  }

  if (!fallbackClient) {
    const connectionString = getConnectionString();
    const adapter = new PrismaPg({ connectionString });
    fallbackClient = new PrismaClient({ adapter, log: ["error"] });
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
