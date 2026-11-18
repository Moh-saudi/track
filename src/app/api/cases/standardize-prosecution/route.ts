import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { OFFICIAL_PROSECUTIONS_LIST } from "@/lib/constants/prosecutions";

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

function normalizeProsName(str: string): string {
  let s = str
    .replace(/^نيابة\s+/g, "")
    .replace(/\s+الكلية$/g, "")
    .replace(/\s+الجزئية$/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/[\s\-_]+/g, " ")
    .trim();

  // توحيد نمط السادس من أكتوبر مع أكتوبر
  if (s.includes("السادس من اكتوبر") || s.includes("6 اكتوبر")) {
    s = "اكتوبر";
  }
  return s;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح - هذه الميزة مخصصة لمدير النظام (Admin) فقط" }, { status: 403 });
  }

  try {
    // 1. جلب كافة القضايا لفحص التكرارات والمسميات المتعددة
    const allCases = await prisma.case.findMany({
      select: {
        id: true,
        caseNumber: true,
        caseYear: true,
        registrationType: true,
        prosecution: true,
        partialProsecution: true,
        prosecutionCaseNumber: true,
        governorate: true,
        complainantName: true,
        complainantPhone: true,
        respondentName: true,
        respondentPhone: true,
        hospitalName: true,
        entityName: true,
        incomingDate: true,
        createdAt: true,
        status: true,
        createdBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // 2. فحص حالة نيابة أكتوبر تحديداً
    const sixthOctoberCases = allCases.filter((c) => {
      const p = c.prosecution || "";
      return (
        SIXTH_OCTOBER_VARIANTS.includes(p) ||
        p.includes("السادس من") ||
        p.includes("6 أكتوبر") ||
        p.includes("6 اكتوبر")
      );
    });

    const octoberStandardCases = allCases.filter((c) => {
      const p = c.prosecution || "";
      return (
        p === "أكتوبر الكلية" ||
        p === "اكتوبر الكلية" ||
        p === "نيابة أكتوبر الكلية" ||
        p === "نيابة اكتوبر الكلية"
      );
    });

    // 3. تحليل مسميات النيابات المكررة أو المتعددة (Prosecution Duplicates & Variants)
    const exactNameCounts = new Map<string, { count: number; governorate?: string; cases: any[] }>();
    allCases.forEach((c) => {
      const p = (c.prosecution || "").trim();
      if (!p) return;
      if (!exactNameCounts.has(p)) {
        exactNameCounts.set(p, { count: 0, governorate: c.governorate || undefined, cases: [] });
      }
      const entry = exactNameCounts.get(p)!;
      entry.count++;
      if (entry.cases.length < 5) entry.cases.push(c);
    });

    // تجميع المسميات المتطابقة في الجذر
    const rootGroups = new Map<string, { originalNames: string[]; totalCases: number }>();
    for (const [name, info] of exactNameCounts.entries()) {
      const root = normalizeProsName(name);
      if (!rootGroups.has(root)) {
        rootGroups.set(root, { originalNames: [], totalCases: 0 });
      }
      const g = rootGroups.get(root)!;
      g.originalNames.push(name);
      g.totalCases += info.count;
    }

    const officialPlenaries = OFFICIAL_PROSECUTIONS_LIST.filter((p) => p.type === "PLENARY");

    // استخراج مجموعات الازدواج (المجموعات التي تحوي أكثر من مسمى فعلي في قاعدة البيانات)
    const prosecutionDuplicates = Array.from(rootGroups.entries())
      .filter(([_, g]) => g.originalNames.length > 1)
      .map(([root, g]) => {
        // تحديد المسمى الرسمي المعتمد المقترح
        let suggestedTarget = "";
        let suggestedGov = "";

        // أولاً: البحث في القائمة الرسمية المعتمدة
        const officialMatch = officialPlenaries.find(
          (op) => normalizeProsName(op.name) === root || g.originalNames.includes(op.name)
        );
        if (officialMatch) {
          suggestedTarget = officialMatch.name;
          suggestedGov = officialMatch.governorate || "";
        }

        // ثانياً: إذا لم يتطابق مع القائمة الرسمية، نفضل المسمى المنتهي بـ "الكلية" أو الأعلى استخداماً
        if (!suggestedTarget) {
          const withKoleya = g.originalNames.find((n) => n.endsWith("الكلية"));
          if (withKoleya) {
            suggestedTarget = withKoleya;
          } else {
            // اختيار المسمى الأعلى تكراراً
            suggestedTarget = g.originalNames.slice().sort((a, b) => {
              const ca = exactNameCounts.get(a)?.count || 0;
              const cb = exactNameCounts.get(b)?.count || 0;
              return cb - ca;
            })[0];
          }
        }

        if (!suggestedGov) {
          suggestedGov = exactNameCounts.get(suggestedTarget)?.governorate || "غير محدد";
        }

        const variants = g.originalNames.map((name) => ({
          name,
          count: exactNameCounts.get(name)?.count || 0,
          governorate: exactNameCounts.get(name)?.governorate,
          isTarget: name === suggestedTarget,
        }));

        const nonTargetCasesCount = variants
          .filter((v) => !v.isTarget)
          .reduce((sum, v) => sum + v.count, 0);

        return {
          rootName: root,
          suggestedTarget,
          suggestedGovernorate: suggestedGov,
          totalCases: g.totalCases,
          pendingMigrationCount: nonTargetCasesCount,
          isFullyStandardized: nonTargetCasesCount === 0,
          variants,
        };
      })
      .sort((a, b) => b.pendingMigrationCount - a.pendingMigrationCount);

    // 4. كشف القضايا المكررة بنفس الرقم والسنة والنيابة (Duplicate Case Records)
    const caseMap = new Map<string, any[]>();
    allCases.forEach((c) => {
      if (c.prosecutionCaseNumber && c.prosecutionCaseNumber.trim()) {
        const num = c.prosecutionCaseNumber.trim();
        const yr = c.caseYear || "";
        const pros = normalizeProsName(c.prosecution || "");
        const key = `${num}_${yr}_${pros}`;
        if (!caseMap.has(key)) caseMap.set(key, []);
        caseMap.get(key)!.push(c);
      }
    });

    const duplicateCases = Array.from(caseMap.entries())
      .filter(([_, list]) => list.length > 1)
      .map(([_, list]) => {
        const creators = Array.from(
          new Set(list.map((c) => c.createdBy?.fullName || c.createdBy?.email || "غير محدد"))
        );
        const differentCreators = creators.length > 1;
        const partials = Array.from(new Set(list.map((c) => c.partialProsecution).filter(Boolean)));
        const hospitals = Array.from(new Set(list.map((c) => c.hospitalName || c.entityName).filter(Boolean)));

        const mappedCases = list.map((c) => ({
          id: c.id,
          caseNumber: c.caseNumber,
          caseYear: c.caseYear,
          registrationType: c.registrationType,
          prosecutionCaseNumber: c.prosecutionCaseNumber,
          prosecution: c.prosecution,
          partialProsecution: c.partialProsecution || "—",
          governorate: c.governorate || "غير محدد",
          complainantName: c.complainantName || "—",
          complainantPhone: c.complainantPhone || null,
          respondentName: c.respondentName || "—",
          respondentPhone: c.respondentPhone || null,
          hospitalName: c.hospitalName || c.entityName || "—",
          incomingDate: c.incomingDate,
          createdAt: c.createdAt,
          status: c.status,
          registeredBy: c.createdBy?.fullName || c.createdBy?.email || "غير محدد",
          registeredById: c.createdBy?.id,
        }));

        return {
          prosecutionCaseNumber: list[0].prosecutionCaseNumber,
          caseYear: list[0].caseYear,
          prosecution: list[0].prosecution,
          count: list.length,
          differentCreators,
          creators,
          hasDifferentPartials: partials.length > 1,
          hasDifferentHospitals: hospitals.length > 1,
          cases: mappedCases,
          records: mappedCases,
        };
      })
      .sort((a, b) => b.count - a.count);

    const totalPendingDuplicates =
      sixthOctoberCases.length +
      prosecutionDuplicates.reduce((sum, p) => sum + p.pendingMigrationCount, 0) +
      duplicateCases.length;

    return NextResponse.json({
      targetStandardName: "أكتوبر الكلية",
      sixthOctoberCount: sixthOctoberCases.length,
      octoberStandardCount: octoberStandardCases.length,
      totalCombined: sixthOctoberCases.length + octoberStandardCases.length,
      toMigrateCases: sixthOctoberCases,
      existingStandardCases: octoberStandardCases,
      isOctoberDone: sixthOctoberCases.length === 0,
      prosecutionDuplicates,
      duplicateCases,
      totalPendingDuplicates,
    });
  } catch (err: any) {
    console.error("Error checking duplicates & prosecutions:", err);
    return NextResponse.json({ error: err.message || "فشل فحص التكرارات والنيابات" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح - هذه الميزة مخصصة لمدير النظام (Admin) فقط" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const targetProsecution = (body.targetProsecution || "أكتوبر الكلية").trim();
    const targetGovernorate = (body.targetGovernorate || "الجيزة").trim();
    const sourceVariants: string[] = body.sourceVariants || [];
    const caseIds: string[] = body.caseIds || [];

    // إذا تم تمرير مسميات معينة للتوحيد
    let targetCaseIds = caseIds;
    if (sourceVariants.length > 0 && targetCaseIds.length === 0) {
      const candidates = await prisma.case.findMany({
        where: { prosecution: { in: sourceVariants } },
        select: { id: true },
      });
      targetCaseIds = candidates.map((c) => c.id);
    } else if (targetCaseIds.length === 0) {
      // الافتراضي لنيابة أكتوبر
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
        message: `لا توجد سجلات تحتاج إلى التوحيد، كافة السجلات موحدة بالفعل تحت مسمى "${targetProsecution}".`,
        updatedCount: 0,
      });
    }

    // تنفيذ التحديث الموحد
    const updateResult = await prisma.case.updateMany({
      where: { id: { in: targetCaseIds } },
      data: {
        prosecution: targetProsecution,
        ...(targetGovernorate ? { governorate: targetGovernorate } : {}),
      },
    });

    // تسجيل حركة تدقيق رقابية
    await writeAuditLog({
      entityType: "Case",
      entityId: "BATCH_PROSECUTION_STANDARDIZATION",
      action: "UPDATE",
      userId: (session.user as any).id,
      beforeData: {
        targetCaseIds,
        sourceVariants: sourceVariants.length > 0 ? sourceVariants : SIXTH_OCTOBER_VARIANTS,
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
      message: `تم توحيد ودمج (${updateResult.count}) سجل بنجاح تحت المسمى الرسمي المعتمد "${targetProsecution}"${targetGovernorate ? ` بمحافظة "${targetGovernorate}"` : ""}.`,
      updatedCount: updateResult.count,
    });
  } catch (err: any) {
    console.error("Error standardizing prosecutions:", err);
    return NextResponse.json({ error: err.message || "تعذر إتمام عملية توحيد النيابة" }, { status: 500 });
  }
}
