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

  // فحص وإلغاء أي قفل معلق على جدول المستخدمين (Locks Cleanup)
  let locksCleanup: any = null;
  try {
    const blockingProcesses: any = await prisma.$queryRawUnsafe(`
      SELECT pid, state, query, wait_event_type, wait_event, (now() - query_start) as duration
      FROM pg_stat_activity
      WHERE state <> 'idle'
        AND pid <> pg_backend_pid()
        AND (query ILIKE '%User%' OR query ILIKE '%ALTER TABLE%' OR query ILIKE '%LoginThrottle%')
    `);

    let terminatedCount = 0;
    if (Array.isArray(blockingProcesses) && blockingProcesses.length > 0) {
      for (const proc of blockingProcesses) {
        if (proc.pid) {
          await prisma.$executeRawUnsafe(`SELECT pg_terminate_backend(${proc.pid})`).catch(() => {});
          terminatedCount++;
        }
      }
    }

    locksCleanup = {
      found: blockingProcesses?.length || 0,
      terminatedCount,
      details: blockingProcesses,
    };
  } catch (lockErr: any) {
    locksCleanup = { error: lockErr?.message };
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
      locksCleanup,
      adminCheck,
      environment: process.env.NODE_ENV || "production",
      version: "0.1.0",
    },
    { status: isHealthy ? 200 : 503 }
  );
}
