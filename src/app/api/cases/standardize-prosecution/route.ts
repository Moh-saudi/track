import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

// أنماط مسميات نيابة السادس من أكتوبر المختلفة
const SIXTH_OCTOBER_VARIANTS = [
  "السادس من أكتوبر",
  "السادس من اكتوبر",
  "السادس من أكتوبر الكلية",
  "السادس من اكتوبر الكلية",
  "نيابة السادس من أكتوبر",
  "نيابة السادس من اكتوبر",
  "نيابة السادس من أكتوبر الكلية",
  "نيابة السادس من اكتوبر الكلية",
  "6 أكتوبر",
  "6 اكتوبر",
  "6 أكتوبر الكلية",
  "6 اكتوبر الكلية",
  "نيابة 6 أكتوبر",
  "نيابة 6 اكتوبر",
  "نيابة 6 أكتوبر الكلية",
  "نيابة 6 اكتوبر الكلية",
];

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  try {
    // 1. جلب السجلات المسجلة تحت أي من مسميات "السادس من أكتوبر"
    const sixthOctoberCases = await prisma.case.findMany({
      where: {
        OR: [
          { prosecution: { in: SIXTH_OCTOBER_VARIANTS } },
          { prosecution: { contains: "السادس من", mode: "insensitive" } },
          { prosecution: { contains: "6 أكتوبر", mode: "insensitive" } },
          { prosecution: { contains: "6 اكتوبر", mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        caseNumber: true,
        caseYear: true,
        registrationType: true,
        prosecution: true,
        partialProsecution: true,
        governorate: true,
        complainantName: true,
        hospitalName: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. جلب السجلات المسجلة بالفعل تحت "أكتوبر الكلية"
    const octoberStandardCases = await prisma.case.findMany({
      where: {
        OR: [
          { prosecution: "أكتوبر الكلية" },
          { prosecution: "اكتوبر الكلية" },
          { prosecution: "نيابة أكتوبر الكلية" },
          { prosecution: "نيابة اكتوبر الكلية" },
        ],
      },
      select: {
        id: true,
        caseNumber: true,
        caseYear: true,
        registrationType: true,
        prosecution: true,
        partialProsecution: true,
        governorate: true,
        complainantName: true,
        hospitalName: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      targetStandardName: "أكتوبر الكلية",
      sixthOctoberCount: sixthOctoberCases.length,
      octoberStandardCount: octoberStandardCases.length,
      totalCombined: sixthOctoberCases.length + octoberStandardCases.length,
      toMigrateCases: sixthOctoberCases,
      existingStandardCases: octoberStandardCases,
    });
  } catch (err: any) {
    console.error("Error checking October prosecutions:", err);
    return NextResponse.json({ error: err.message || "فشل فحص سجلات نيابة أكتوبر" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const allowedRoles = ["ADMIN", "REGISTRATION_CLERK", "FOLLOW_UP_OFFICER", "SUPREME_SUPERVISOR"];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "غير مصرح لك بتوحيد وتحديث النيابات" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const targetProsecution = (body.targetProsecution || "أكتوبر الكلية").trim();
    const targetGovernorate = (body.targetGovernorate || "الجيزة").trim();
    const caseIds: string[] = body.caseIds || [];

    // إذا تم تحديد IDs معينة يتم تحديثها، وإلا يتم تحديث كافة سجلات "السادس من أكتوبر"
    let targetCaseIds = caseIds;
    if (!targetCaseIds || targetCaseIds.length === 0) {
      const candidates = await prisma.case.findMany({
        where: {
          OR: [
            { prosecution: { in: SIXTH_OCTOBER_VARIANTS } },
            { prosecution: { contains: "السادس من", mode: "insensitive" } },
            { prosecution: { contains: "6 أكتوبر", mode: "insensitive" } },
            { prosecution: { contains: "6 اكتوبر", mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      targetCaseIds = candidates.map((c) => c.id);
    }

    if (targetCaseIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "لا توجد سجلات تحتاج إلى التوحيد، كافة السجلات موحدة بالفعل على أكتوبر الكلية.",
        updatedCount: 0,
      });
    }

    // تنفيذ التحديث
    const updateResult = await prisma.case.updateMany({
      where: { id: { in: targetCaseIds } },
      data: {
        prosecution: targetProsecution,
        governorate: targetGovernorate,
      },
    });

    // تسجيل حركة تدقيق رقابية
    await writeAuditLog({
      entityType: "Case",
      entityId: "BATCH_OCTOBER_STANDARDIZATION",
      action: "UPDATE",
      userId: (session.user as any).id,
      beforeData: {
        targetCaseIds,
        previousProsecution: "السادس من أكتوبر",
      },
      afterData: {
        updatedCount: updateResult.count,
        standardProsecution: targetProsecution,
        governorate: targetGovernorate,
        updatedBy: (session.user as any).name || (session.user as any).fullName,
      },
    });

    return NextResponse.json({
      success: true,
      message: `تم توحيد ودمج (${updateResult.count}) سجل بنجاح تحت مسمى "${targetProsecution}" بمحافظة "${targetGovernorate}".`,
      updatedCount: updateResult.count,
    });
  } catch (err: any) {
    console.error("Error standardizing October prosecutions:", err);
    return NextResponse.json({ error: err.message || "تعذر إتمام عملية توحيد النيابة" }, { status: 500 });
  }
}
