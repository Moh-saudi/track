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

    let userTest: any = null;
    try {
      await prisma.$queryRaw`SELECT 1`;
      const t0 = Date.now();
      const u = await prisma.user.findUnique({
        where: { id: "cmtt6giaj002t68bdvsu2ra64" },
        include: { subCommittee: true, specialty: true },
      });
      userTest = { tUserMs: Date.now() - t0, found: !!u, email: u?.email };
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
          userTest,
        },
        hyperdrive: debugInfo.hasHyperdriveConn,
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
      },
      { status: 500 }
    );
  }
}
