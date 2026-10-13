import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "disconnected";
  let latencyMs = 0;
  let dbError: string | null = null;

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
      environment: process.env.NODE_ENV || "production",
      version: "0.1.0",
    },
    { status: isHealthy ? 200 : 503 }
  );
}
