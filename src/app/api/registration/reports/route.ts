import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrated } from "@/lib/db-migrate";
import { OFFICIAL_PROSECUTIONS_LIST } from "@/lib/constants/prosecutions";
import { EGYPT_GOVERNORATES } from "@/lib/constants/governorates";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

    const user = session.user as any;
    const currentUserId = user.id;
    const allowedRoles = ["REGISTRATION_CLERK", "ADMIN", "FOLLOW_UP_OFFICER", "RISK_OFFICER", "SUPREME_SUPERVISOR"];
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ error: "غير مصرح لك بالاطلاع على تقارير وإحصائيات قيد السجلات" }, { status: 403 });
    }

    await ensureSchemaMigrated();
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");
    const dateBasis = (searchParams.get("dateBasis") || "incomingDate") as "incomingDate" | "createdAt" | "caseYear";
    const prosecutionId = searchParams.get("prosecutionId");
    const partialProsecutionId = searchParams.get("partialProsecutionId");
    const registrationType = searchParams.get("registrationType");
    const complainantName = searchParams.get("complainantName");
    const respondentName = searchParams.get("respondentName");
    const createdById = searchParams.get("createdById");
    const governorate = searchParams.get("governorate");
    const subCommitteeId = searchParams.get("subCommitteeId");
    const status = searchParams.get("status");
    const entityType = searchParams.get("entityType");
    const branchOrHospital = searchParams.get("branchOrHospital");
    const caseYearStr = searchParams.get("caseYear");
    const reportYearStr = searchParams.get("reportYear");
    const reportMonthStr = searchParams.get("reportMonth");

    const where: any = {};

    // ─── إحكام الصلاحيات (RBAC Server-side Isolation) ───
    if (user.role === "REGISTRATION_CLERK") {
      where.createdById = currentUserId;
    } else if (createdById && createdById !== "ALL") {
      where.createdById = createdById;
    }

    // فلتر نوع القيد (شكوى / قضية / محضر)
    if (registrationType && registrationType !== "ALL") {
      where.registrationType = registrationType as any;
    }

    // فلتر عام القيد (سنة قيد القضية / المحضر / السجل)
    if (caseYearStr && caseYearStr !== "ALL") {
      const yr = Number(caseYearStr);
      if (!isNaN(yr)) {
        where.caseYear = yr;
      }
    }

    // فلتر مرحلة العمل / الحالة
    if (status && status !== "ALL") {
      where.status = status as any;
    }

    // فلتر اللجنة الفرعية
    if (subCommitteeId && subCommitteeId !== "ALL") {
      where.subCommitteeId = subCommitteeId;
    }

    // فلتر نوع الجهة / الفرع (مستشفى حكومي / خاص / جامعة / إلخ)
    if (entityType && entityType !== "ALL") {
      where.entityType = entityType;
    }

    // البحث باسم الفرع أو المستشفى
    if (branchOrHospital?.trim()) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { hospitalName: { contains: branchOrHospital.trim(), mode: "insensitive" } },
            { entityName: { contains: branchOrHospital.trim(), mode: "insensitive" } },
          ],
        },
      ];
    }

    // فلتر النيابة الكلية المختصة
    if (prosecutionId && prosecutionId !== "ALL") {
      let matchedName = "";
      if (prosecutionId.startsWith("official_")) {
        const idx = parseInt(prosecutionId.replace("official_", ""), 10) - 1;
        const officialItem = OFFICIAL_PROSECUTIONS_LIST.filter((p) => p.type === "PLENARY")[idx];
        if (officialItem) matchedName = officialItem.name;
      }

      if (!matchedName) {
        const pMatch = await prisma.prosecution.findUnique({
          where: { id: prosecutionId },
          select: { name: true },
        }).catch(() => null);
        if (pMatch) matchedName = pMatch.name;
      }

      if (!matchedName && isNaN(Number(prosecutionId))) {
        matchedName = prosecutionId.trim();
      }

      const orConditions: any[] = [];
      if (prosecutionId && !prosecutionId.startsWith("official_")) {
        orConditions.push({ prosecutionId: prosecutionId });
      }
      if (matchedName) {
        orConditions.push({ prosecution: matchedName });
        orConditions.push({ prosecution: { contains: matchedName, mode: "insensitive" } });
        orConditions.push({ prosecutionRel: { name: { contains: matchedName, mode: "insensitive" } } });
      }

      if (orConditions.length > 0) {
        where.AND = [
          ...(where.AND || []),
          { OR: orConditions },
        ];
      }
    }

    // فلتر النيابة الجزئية المختصة
    if (partialProsecutionId && partialProsecutionId !== "ALL") {
      let matchedPartialName = "";
      if (partialProsecutionId.startsWith("official_part_")) {
        const idx = parseInt(partialProsecutionId.replace("official_part_", ""), 10) - 1;
        const officialItem = OFFICIAL_PROSECUTIONS_LIST.filter((p) => p.type === "DISTRICT")[idx];
        if (officialItem) matchedPartialName = officialItem.name;
      }

      if (!matchedPartialName) {
        const pMatch = await prisma.prosecution.findUnique({
          where: { id: partialProsecutionId },
          select: { name: true },
        }).catch(() => null);
        if (pMatch) matchedPartialName = pMatch.name;
      }

      if (!matchedPartialName && isNaN(Number(partialProsecutionId))) {
        matchedPartialName = partialProsecutionId.trim();
      }

      const orPartialConds: any[] = [];
      if (partialProsecutionId && !partialProsecutionId.startsWith("official_part_")) {
        orPartialConds.push({ partialProsecutionId: partialProsecutionId });
      }
      if (matchedPartialName) {
        orPartialConds.push({ partialProsecution: matchedPartialName });
        orPartialConds.push({ partialProsecution: { contains: matchedPartialName, mode: "insensitive" } });
        orPartialConds.push({ partialProsecutionRel: { name: { contains: matchedPartialName, mode: "insensitive" } } });
      }

      if (orPartialConds.length > 0) {
        where.AND = [
          ...(where.AND || []),
          { OR: orPartialConds },
        ];
      }
    }

    // فلتر المحافظة (من حقل المحافظة بالسجل أو من محافظة النيابة التابعة لها)
    if (governorate && governorate !== "ALL") {
      if (governorate === "UNSPECIFIED" || governorate === "UNKNOWN" || governorate === "غير محدد") {
        where.AND = [
          ...(where.AND || []),
          {
            AND: [
              { OR: [{ governorate: null }, { governorate: "" }] },
              { OR: [{ prosecutionRel: null }, { prosecutionRel: { governorate: null } }] },
            ],
          },
        ];
      } else {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { governorate: governorate },
              { prosecutionRel: { governorate: governorate } },
            ],
          },
        ];
      }
    }

    // فلتر اسم الشاكي
    if (complainantName?.trim()) {
      where.complainantName = { contains: complainantName.trim(), mode: "insensitive" };
    }

    // فلتر اسم المشكو في حقه
    if (respondentName?.trim()) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { respondentName: { contains: respondentName.trim(), mode: "insensitive" } },
            { entityName: { contains: respondentName.trim(), mode: "insensitive" } },
            { entityType: { contains: respondentName.trim(), mode: "insensitive" } },
            { hospitalName: { contains: respondentName.trim(), mode: "insensitive" } },
          ],
        },
      ];
    }

    // فلترة التاريخ والفترة الزمنية بناءً على أساس التاريخ المختار (عام قيد القضية أو تاريخ الوارد أو تاريخ التسجيل الإلكتروني)
    if (reportYearStr && reportYearStr !== "ALL") {
      const yr = Number(reportYearStr);
      if (!isNaN(yr)) {
        if (dateBasis === "caseYear") {
          where.caseYear = yr;
        } else {
          let startD: Date;
          let endD: Date;
          if (reportMonthStr && reportMonthStr !== "ALL") {
            const m = Number(reportMonthStr) - 1;
            startD = new Date(yr, m, 1, 0, 0, 0, 0);
            endD = new Date(yr, m + 1, 0, 23, 59, 59, 999);
          } else {
            startD = new Date(yr, 0, 1, 0, 0, 0, 0);
            endD = new Date(yr, 11, 31, 23, 59, 59, 999);
          }

          if (dateBasis === "incomingDate") {
            where.AND = [
              ...(where.AND || []),
              {
                OR: [
                  { incomingDate: { gte: startD, lte: endD } },
                  { AND: [{ incomingDate: null }, { createdAt: { gte: startD, lte: endD } }] },
                ],
              },
            ];
          } else {
            where.createdAt = { gte: startD, lte: endD };
          }
        }
      }
    } else if (startDateStr || endDateStr) {
      const dateCond: any = {};
      if (startDateStr) {
        const start = new Date(startDateStr);
        if (!isNaN(start.getTime())) {
          start.setHours(0, 0, 0, 0);
          dateCond.gte = start;
        }
      }
      if (endDateStr) {
        const end = new Date(endDateStr);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          dateCond.lte = end;
        }
      }

      if (dateBasis === "incomingDate") {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { incomingDate: dateCond },
              { AND: [{ incomingDate: null }, { createdAt: dateCond }] },
            ],
          },
        ];
      } else {
        where.createdAt = dateCond;
      }
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // ─── استعلام شامل لكافة السجلات بدون تقييد Cloudflare السابق ───
    const [filteredCases, globalTotalCasesCount, globalTodayCasesCount, usersList, subCommitteesList, allDbCasesForMetadata] = await Promise.all([
      prisma.case.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          caseNumber: true,
          caseYear: true,
          prosecutionCaseNumber: true,
          registrationType: true,
          complainantName: true,
          complainantPhone: true,
          respondentName: true,
          respondentPhone: true,
          entityType: true,
          entityName: true,
          hospitalName: true,
          governorate: true,
          prosecution: true,
          prosecutionId: true,
          partialProsecution: true,
          partialProsecutionId: true,
          incomingDate: true,
          attachmentsCount: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          createdById: true,
          subCommitteeId: true,
          prosecutionRel: { select: { id: true, name: true, governorate: true } },
          partialProsecutionRel: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true, email: true, role: true } },
          subCommittee: { select: { id: true, name: true } },
        },
        take: 5000,
      }).catch((e) => {
        console.error("Error fetching filtered cases:", e);
        return [];
      }),
      prisma.case.count().catch(() => 0),
      prisma.case.count({ where: { createdAt: { gte: todayStart } } }).catch(() => 0),
      prisma.user.findMany({
        where: {
          role: { in: ["REGISTRATION_CLERK", "ADMIN", "FOLLOW_UP_OFFICER", "RISK_OFFICER"] },
        },
        select: { id: true, fullName: true, email: true, role: true },
        orderBy: { fullName: "asc" },
        take: 200,
      }).catch(() => []),
      prisma.subCommittee.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
        take: 200,
      }).catch(() => []),
      prisma.case.findMany({
        select: {
          caseYear: true,
          incomingDate: true,
          createdAt: true,
        },
      }).catch(() => []),
    ]);

    // استخراج السنوات والشهور الفعلية المسجلة بالكامل في قاعدة البيانات
    const caseYearsMap = new Map<number, number>();
    const incomingYearsMap = new Map<number, number>();
    const incomingMonthsMap: Record<string, number> = {};
    const createdYearsMap = new Map<number, number>();
    const createdMonthsMap: Record<string, number> = {};

    (allDbCasesForMetadata || []).forEach((c: any) => {
      if (c.caseYear && !isNaN(c.caseYear)) {
        caseYearsMap.set(c.caseYear, (caseYearsMap.get(c.caseYear) || 0) + 1);
      }
      if (c.incomingDate) {
        const d = new Date(c.incomingDate);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = d.getMonth() + 1;
          incomingYearsMap.set(y, (incomingYearsMap.get(y) || 0) + 1);
          const key = `${y}-${m}`;
          incomingMonthsMap[key] = (incomingMonthsMap[key] || 0) + 1;
        }
      }
      if (c.createdAt) {
        const d = new Date(c.createdAt);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = d.getMonth() + 1;
          createdYearsMap.set(y, (createdYearsMap.get(y) || 0) + 1);
          const key = `${y}-${m}`;
          createdMonthsMap[key] = (createdMonthsMap[key] || 0) + 1;
        }
      }
    });

    const realYearsMetadata = {
      caseYears: Array.from(caseYearsMap.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => b.year - a.year),
      incomingYears: Array.from(incomingYearsMap.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => b.year - a.year),
      incomingMonths: incomingMonthsMap,
      createdYears: Array.from(createdYearsMap.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => b.year - a.year),
      createdMonths: createdMonthsMap,
    };

    // ─── حساب الإحصائيات الشاملة ───
    const totalFiltered = filteredCases.length;
    const globalTotalCases = globalTotalCasesCount || totalFiltered;
    const globalTodayCount = globalTodayCasesCount || filteredCases.filter((c: any) => c.createdAt && new Date(c.createdAt) >= todayStart).length;
    const myFilteredCases = currentUserId ? filteredCases.filter((c: any) => c.createdById === currentUserId) : [];
    const myTotalCases = myFilteredCases.length;
    const myTodayCount = myFilteredCases.filter((c: any) => c.createdAt && new Date(c.createdAt) >= todayStart).length;

    // خريطة إنجاز المستخدمين في الذاكرة
    const userCountMap = new Map<string, number>();
    const userTodayMap = new Map<string, number>();
    for (const c of filteredCases) {
      if (c.createdById) {
        userCountMap.set(c.createdById, (userCountMap.get(c.createdById) || 0) + 1);
        if (c.createdAt && new Date(c.createdAt) >= todayStart) {
          userTodayMap.set(c.createdById, (userTodayMap.get(c.createdById) || 0) + 1);
        }
      }
    }

    // قائمة إنجاز المستخدمين
    const usersWorkload = usersList.map((u) => {
      const userTotal = userCountMap.get(u.id) || 0;
      const userToday = userTodayMap.get(u.id) || 0;

      return {
        id: u.id,
        fullName: u.fullName || u.email,
        email: u.email,
        role: u.role,
        totalRegistered: userTotal,
        todayRegistered: userToday,
        periodRegistered: userTotal,
        sharePercent: totalFiltered > 0 ? Number(((userTotal / totalFiltered) * 100).toFixed(1)) : 0,
      };
    });

    // قائمة النيابات من قاعدة البيانات مع دمج الثوابت الرسمية للمطابقة الكاملة
    const dbProsecutions = await prisma.prosecution.findMany({
      where: { active: true },
      select: { id: true, name: true, governorate: true, type: true, parentId: true },
      orderBy: [{ governorate: "asc" }, { name: "asc" }],
      take: 1000,
    }).catch(() => []);

    const prosecutions = dbProsecutions.length > 0
      ? dbProsecutions
      : OFFICIAL_PROSECUTIONS_LIST.map((p, idx) => ({
          id: p.type === "PLENARY" ? `official_${idx + 1}` : `official_part_${idx + 1}`,
          name: p.name,
          governorate: p.governorate,
          type: p.type,
          parentName: p.parentName,
        }));

    // تفريغ أنواع القيد
    const typeBreakdown = {
      COMPLAINT: filteredCases.filter((c: any) => c.registrationType === "COMPLAINT").length,
      CASE: filteredCases.filter((c: any) => c.registrationType === "CASE").length,
      REPORT: filteredCases.filter((c: any) => c.registrationType === "REPORT").length,
    };

    // ─── تفريغ مراحل العمل (Work Stages Breakdown) ───
    const stageBreakdown = {
      REGISTERED: filteredCases.filter((c: any) => c.status === "REGISTERED").length,
      UNDER_SUBCOMMITTEE_REVIEW: filteredCases.filter((c: any) => c.status === "UNDER_SUBCOMMITTEE_REVIEW").length,
      PENDING_SUPREME_REVIEW: filteredCases.filter((c: any) => c.status === "PENDING_SUPREME_REVIEW").length,
      REFERRED_FOR_REVIEW: filteredCases.filter((c: any) => c.status === "REFERRED_FOR_REVIEW").length,
      APPROVED: filteredCases.filter((c: any) => c.status === "APPROVED").length,
      CLOSED: filteredCases.filter((c: any) => c.status === "CLOSED").length,
    };

    // ─── 1. التقرير العددي للمحافظات مفصلاً بالأنواع (Governorates Numerical Breakdown) ───
    const govMap: Record<
      string,
      { governorate: string; complaints: number; cases: number; reports: number; total: number; percent: number }
    > = {};

    filteredCases.forEach((c: any) => {
      const gov = c.governorate || c.prosecutionRel?.governorate || "غير محدد";
      if (!govMap[gov]) {
        govMap[gov] = { governorate: gov, complaints: 0, cases: 0, reports: 0, total: 0, percent: 0 };
      }
      govMap[gov].total++;
      if (c.registrationType === "COMPLAINT") govMap[gov].complaints++;
      else if (c.registrationType === "CASE") govMap[gov].cases++;
      else if (c.registrationType === "REPORT") govMap[gov].reports++;
    });

    const governorateBreakdown = Object.values(govMap)
      .map((g) => ({
        ...g,
        count: g.total,
        percent: totalFiltered > 0 ? Number(((g.total / totalFiltered) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // ─── 2. التقرير العددي للنيابات مفصلاً بالأنواع (Prosecutions Numerical Breakdown) ───
    const prosMap: Record<
      string,
      { name: string; governorate: string; complaints: number; cases: number; reports: number; total: number; percent: number }
    > = {};

    filteredCases.forEach((c: any) => {
      const prosName =
        c.prosecutionRel?.name ||
        c.prosecution ||
        (c.registrationType === "COMPLAINT" ? "شكاوى مباشرة (بدون نيابة)" : "غير محددة");
      const gov = c.governorate || c.prosecutionRel?.governorate || "—";
      if (!prosMap[prosName]) {
        prosMap[prosName] = { name: prosName, governorate: gov, complaints: 0, cases: 0, reports: 0, total: 0, percent: 0 };
      }
      prosMap[prosName].total++;
      if (c.registrationType === "COMPLAINT") prosMap[prosName].complaints++;
      else if (c.registrationType === "CASE") prosMap[prosName].cases++;
      else if (c.registrationType === "REPORT") prosMap[prosName].reports++;
    });

    const prosecutionNumerical = Object.values(prosMap)
      .map((p) => ({
        ...p,
        percent: totalFiltered > 0 ? Number(((p.total / totalFiltered) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      metrics: {
        globalTotalCases, // إجمالي بدون فلتر وبدون مراحل
        myTotalCases,
        globalTodayCount,
        myTodayCount,
        filteredTotal: totalFiltered, // إجمالي بعد الفلاتر
        myContributionPercent: globalTotalCases > 0 ? Number(((myTotalCases / globalTotalCases) * 100).toFixed(1)) : 0,
      },
      usersWorkload,
      typeBreakdown,
      stageBreakdown,
      governorateBreakdown,
      prosecutionNumerical,
      prosecutions,
      subCommitteesList,
      governoratesList: EGYPT_GOVERNORATES,
      realYearsMetadata,
      cases: filteredCases,
      currentUser: {
        id: currentUserId,
        name: user.name || user.fullName || user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error("GET /api/registration/reports fatal error:", err);
    return NextResponse.json({ error: err.message || "تعذر معالجة تقرير التسجيل" }, { status: 500 });
  }
}
