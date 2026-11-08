import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "disconnected";
  let latencyMs = 0;
  let dbError: string | null = null;

  let debugInfo: any = {};
  try {
    const { getCloudflareContext } = require("@opennextjs/cloudflare");
    const ctx = getCloudflareContext();
    debugInfo = {
      hasCtx: !!ctx,
      hasHyperdrive: !!ctx?.env?.HYPERDRIVE,
      hasHyperdriveConn: !!ctx?.env?.HYPERDRIVE?.connectionString,
      hasDatabaseUrl: !!ctx?.env?.DATABASE_URL,
    };
  } catch (e: any) {
    debugInfo = { error: e.message };
  }

  try {
    // اختبار استعلام خفيف جداً للتأكد من استجابة قاعدة البيانات
    await prisma.$queryRaw`SELECT 1`;
    latencyMs = Date.now() - startTime;
    dbStatus = "connected";
  } catch (err: any) {
    latencyMs = Date.now() - startTime;
    dbStatus = "disconnected";
    dbError = err?.message || "تعذر الاتصال بقاعدة البيانات";
  }

  // اختبار جلب المستخدم المشرف للتأكد من دالة تسجيل الدخول
  let adminCheck: any = null;
  try {
    const tAdmin = Date.now();
    const admin = await prisma.user.findFirst({
      where: { email: { equals: "admin@example.local", mode: "insensitive" } },
      select: { id: true, email: true, active: true, passwordHash: true },
    });
    adminCheck = {
      found: !!admin,
      active: admin?.active,
      hasHash: !!admin?.passwordHash,
      durationMs: Date.now() - tAdmin,
    };
  } catch (adminErr: any) {
    adminCheck = { error: adminErr?.message };
  }

  const isHealthy = dbStatus === "connected";

  return NextResponse.json(
    {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        latencyMs: `${latencyMs}ms`,
        error: dbError,
      },
      debugInfo,
      adminCheck,
      environment: process.env.NODE_ENV || "production",
      version: "0.1.0",
    },
    { status: isHealthy ? 200 : 503 }
  );
}
