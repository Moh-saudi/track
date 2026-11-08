import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
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

    // اختبار جلب المستخدم المشرف واختبار المصادقة فعلياً
    let authCheck: any = null;
    try {
      const tAuth = Date.now();
      const inputEmail = "admin@example.local";
      const user = await prisma.user.findFirst({
        where: { email: { equals: inputEmail, mode: "insensitive" } },
        select: {
          id: true,
          email: true,
          active: true,
          passwordHash: true,
          role: true,
        },
      });

      const bcrypt = require("bcryptjs");
      const isPasswordMatch = user ? await bcrypt.compare("ChangeMe123!", user.passwordHash) : false;

      authCheck = {
        userFound: !!user,
        userActive: user?.active,
        hasHash: !!user?.passwordHash,
        hashPrefix: user?.passwordHash ? user.passwordHash.substring(0, 7) : null,
        passwordMatches: isPasswordMatch,
        role: user?.role,
        durationMs: Date.now() - tAuth,
      };
    } catch (authErr: any) {
      authCheck = {
        error: authErr?.message,
        stack: authErr?.stack,
      };
    }

    const isHealthy = dbStatus === "connected" && authCheck?.passwordMatches === true;

    return NextResponse.json(
      {
        status: isHealthy ? "healthy" : "unhealthy",
        timestamp: new Date().toISOString(),
        database: {
          status: dbStatus,
          latencyMs: `${latencyMs}ms`,
          error: dbError,
        },
        hyperdrive: debugInfo.hasHyperdriveConn,
        auth: authCheck,
        environment: process.env.NODE_ENV || "production",
        version: "0.1.0",
      },
      { status: isHealthy ? 200 : 503 }
    );
  } catch (fatalError: any) {
    return NextResponse.json(
      {
        status: "fatal_error",
        message: fatalError?.message || "Unknown error",
        stack: fatalError?.stack,
      },
      { status: 500 }
    );
  }
}
