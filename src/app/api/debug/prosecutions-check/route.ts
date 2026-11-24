import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. جلب حركات التدقيق الخاصة بالتحويل
    const transferLogs = await prisma.auditLog.findMany({
      where: {
        entityId: "PROSECUTION_TRANSFER_BATCH",
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // 2. البحث عن نيابات أكتوبر
    const octoberPros = await prisma.prosecution.findMany({
      where: {
        name: { contains: "أكتوبر" },
      },
      include: {
        parent: { select: { id: true, name: true } },
        _count: { select: { cases: true, partialCases: true, districts: true } },
      },
    });

    // 3. البحث عن القضايا التي تحتوي على "أكتوبر" في prosecution أو partialProsecution
    const cases = await prisma.case.findMany({
      where: {
        OR: [
          { prosecution: { contains: "أكتوبر" } },
          { partialProsecution: { contains: "أكتوبر" } },
        ],
      },
      select: {
        id: true,
        caseNumber: true,
        caseYear: true,
        prosecutionId: true,
        prosecution: true,
        partialProsecutionId: true,
        partialProsecution: true,
        governorate: true,
      },
      take: 100,
    });

    return NextResponse.json({
      transferLogs,
      octoberPros,
      casesSummary: {
        totalFound: cases.length,
        casesByProsecution: cases.reduce((acc: any, c) => {
          const k = `${c.prosecution || "بدون"} || ${c.partialProsecution || "بدون"}`;
          acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {}),
        casesByProsId: cases.reduce((acc: any, c) => {
          const k = `${c.prosecutionId || "null"} || ${c.partialProsecutionId || "null"}`;
          acc[k] = (acc[k] || 0) + 1;
          return acc;
        }, {}),
        sampleCases: cases.slice(0, 10),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
