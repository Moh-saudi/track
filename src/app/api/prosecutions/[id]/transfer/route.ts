import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const user = session.user as any;
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "صلاحية تحويل السجلات لمدير النظام فقط" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { targetPlenaryId, targetDistrictId, reason } = body;

    if (!targetPlenaryId) {
      return NextResponse.json({ error: "يرجى تحديد النيابة الكلية المحول إليها" }, { status: 400 });
    }

    // 1. فحص النيابة المصدر
    const sourcePros = await prisma.prosecution.findUnique({
      where: { id },
      include: { parent: true },
    });

    if (!sourcePros) {
      return NextResponse.json({ error: "النيابة المصدر غير موجودة" }, { status: 404 });
    }

    // 2. فحص النيابة الكلية الهدف
    const targetPlenary = await prisma.prosecution.findUnique({
      where: { id: targetPlenaryId },
    });

    if (!targetPlenary) {
      return NextResponse.json({ error: "النيابة الكلية الهدف غير موجودة" }, { status: 404 });
    }

    // 3. فحص النيابة الجزئية الهدف (إن وُجدت)
    let targetDistrict: any = null;
    if (targetDistrictId && targetDistrictId !== "NONE") {
      targetDistrict = await prisma.prosecution.findUnique({
        where: { id: targetDistrictId },
      });
      if (!targetDistrict) {
        return NextResponse.json({ error: "النيابة الجزئية الهدف غير موجودة" }, { status: 404 });
      }
    }

    // 4. استخراج كافة القضايا المرتبطة بالنيابة المصدر (برمجياً عبر الـ ID أو بالاسم النصي)
    const matchingCases = await prisma.case.findMany({
      where: {
        OR: [
          { prosecutionId: id },
          { partialProsecutionId: id },
          { prosecution: sourcePros.name },
          { partialProsecution: sourcePros.name },
        ],
      },
      select: { id: true, caseNumber: true, caseYear: true, prosecution: true, partialProsecution: true },
    });

    if (matchingCases.length === 0) {
      return NextResponse.json({
        success: true,
        updatedCount: 0,
        message: "لا توجد سجلات مسجلة على هذه النيابة لتحويلها.",
      });
    }

    const caseIds = matchingCases.map((c) => c.id);

    // 5. تجهيز بيانات التحديث
    const updatePayload: any = {
      prosecutionId: targetPlenary.id,
      prosecution: targetPlenary.name,
    };

    if (targetPlenary.governorate) {
      updatePayload.governorate = targetPlenary.governorate;
    }

    if (targetDistrict) {
      updatePayload.partialProsecutionId = targetDistrict.id;
      updatePayload.partialProsecution = targetDistrict.name;
    } else if (sourcePros.type === "DISTRICT" && targetDistrictId === "NONE") {
      updatePayload.partialProsecutionId = null;
      updatePayload.partialProsecution = null;
    }

    // 6. تنفيذ التحديث الشامل
    const updateResult = await prisma.case.updateMany({
      where: { id: { in: caseIds } },
      data: updatePayload,
    });

    // 7. توثيق حركة التدقيق الرقابي
    await writeAuditLog({
      entityType: "Case",
      entityId: "PROSECUTION_TRANSFER_BATCH",
      action: "UPDATE",
      userId: user.id,
      beforeData: {
        sourceProsecutionId: sourcePros.id,
        sourceProsecutionName: sourcePros.name,
        sourceType: sourcePros.type,
        affectedCount: caseIds.length,
        reason: reason || "تحويل ونقل اختصاص قضائي",
      },
      afterData: {
        targetPlenaryId: targetPlenary.id,
        targetPlenaryName: targetPlenary.name,
        targetDistrictId: targetDistrict?.id || null,
        targetDistrictName: targetDistrict?.name || null,
        updatedCount: updateResult.count,
      },
    });

    return NextResponse.json({
      success: true,
      updatedCount: updateResult.count,
      message: `تم تحويل ونقل (${updateResult.count}) سجل بنجاح من (${sourcePros.name}) إلى (${targetPlenary.name}${targetDistrict ? ` - ${targetDistrict.name}` : ""}).`,
    });
  } catch (err: any) {
    console.error("POST /api/prosecutions/[id]/transfer error:", err);
    return NextResponse.json({ error: err.message || "تعذر تحويل السجلات" }, { status: 500 });
  }
}
