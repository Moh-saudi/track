import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sourceId = "cmtt6fw29001n68bdcb9yi6ys"; // السادس من أكتوبر الكلية
    const targetId = "cmtt6fsn6001f68bd5dyos433"; // أكتوبر الكلية

    // نقل وتصحيح ربط الـ 14 سجلاً التابعة لمعرف السادس من أكتوبر الكلية لتصبح تابعة لمعرف أكتوبر الكلية
    const updateResult = await prisma.case.updateMany({
      where: {
        prosecutionId: sourceId,
      },
      data: {
        prosecutionId: targetId,
        prosecution: "أكتوبر الكلية",
        governorate: "الجيزة",
      },
    });

    // إعادة فحص الإحصائيات بعد التحديث
    const octoberPros = await prisma.prosecution.findMany({
      where: {
        name: { contains: "أكتوبر" },
      },
      include: {
        _count: { select: { cases: true, partialCases: true, children: true } },
      },
    });

    return NextResponse.json({
      success: true,
      updatedCasesCount: updateResult.count,
      octoberPros: octoberPros.map((p) => ({
        id: p.id,
        name: p.name,
        active: p.active,
        casesCount: (p._count?.cases || 0) + (p._count?.partialCases || 0),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
