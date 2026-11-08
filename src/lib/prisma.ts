import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// يمنع إنشاء اتصالات متعددة بقاعدة البيانات أثناء التطوير مع Hot Reload
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const SUPABASE_FALLBACK_URL =
  "postgresql://postgres.wmgmikvjmsliizuagoer:142536475869Ph.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

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

  let url = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.trim().replace(/^["']|["']$/g, "")
    : "";

  if (!url) {
    url = SUPABASE_FALLBACK_URL;
  }

  if (url.includes("pooler.supabase.com:5432")) {
    url = url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
  }
  if (url.includes("pooler.supabase.com") && !url.includes("pgbouncer=true")) {
    url += (url.includes("?") ? "&" : "?") + "pgbouncer=true";
  }

  return url;
}

function createPrismaClient(connStr?: string): PrismaClient {
  const connectionString = connStr || getConnectionString();
  const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

  const pool = new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 1000,
    connectionTimeoutMillis: 6000,
    ssl: isLocal ? false : { rejectUnauthorized: false },
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

export function resetPrismaClient() {
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

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient();
    return (client as any)[prop];
  },
});
