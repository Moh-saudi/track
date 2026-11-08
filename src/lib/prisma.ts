import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

// يمنع إنشاء اتصالات متعددة بقاعدة البيانات أثناء التطوير مع Hot Reload
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const SUPABASE_FALLBACK_URL =
  "postgresql://postgres.wmgmikvjmsliizuagoer:142536475869Ph.@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require";

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

  // في البيئات السحابية Serverless (Cloudflare)، منفذ 6543 مع pgbouncer=true و sslmode=require إلزامي لمنع انقطاع الاتصالات
  if (url.includes("pooler.supabase.com:5432")) {
    url = url.replace("pooler.supabase.com:5432", "pooler.supabase.com:6543");
  }
  if (url.includes("pooler.supabase.com") && !url.includes("pgbouncer=true")) {
    url += (url.includes("?") ? "&" : "?") + "pgbouncer=true";
  }
  if (url.includes("pooler.supabase.com") && !url.includes("sslmode=")) {
    url += (url.includes("?") ? "&" : "?") + "sslmode=require";
  }

  return url;
}

function createPrismaClient(): PrismaClient {
  const connectionString = getConnectionString();
  const isHyperdriveOrLocal =
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1") ||
    connectionString.includes("hyperdrive");

  try {
    const pool = new Pool({
      connectionString,
      max: isHyperdriveOrLocal ? 5 : 1,
      idleTimeoutMillis: isHyperdriveOrLocal ? 30000 : 3000,
      connectionTimeoutMillis: 10000,
      ssl: isHyperdriveOrLocal ? false : { rejectUnauthorized: false },
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

// في Cloudflare Workers، تجميد الـ Isolates بين الطلبات يؤدي إلى موت الـ Sockets مع Supabase إذا تم تخزين العميل عالمياً.
// لذلك في بيئة الإنتاج السحابية، ننشئ عميلاً جديداً خفيفاً لضمان وجود Socket سليم ونشط دون اتصالات ميتة.
let cachedClient: PrismaClient | null = null;

function getClient(): PrismaClient {
  const url = getConnectionString();
  const isHyperdrive = url.includes("hyperdrive") || url.includes("127.0.0.1");

  if (isHyperdrive) {
    if (!cachedClient) {
      cachedClient = createPrismaClient();
    }
    return cachedClient;
  }

  if (process.env.NODE_ENV === "production") {
    return createPrismaClient();
  }
  if (!cachedClient) {
    cachedClient = globalForPrisma.prisma ?? createPrismaClient();
    globalForPrisma.prisma = cachedClient;
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
