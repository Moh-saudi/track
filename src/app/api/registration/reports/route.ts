import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrated } from "@/lib/db-migrate";
import { OFFICIAL_PROSECUTIONS_LIST } from "@/lib/constants/prosecutions";
import { EGYPT_GOVERNORATES } from "@/lib/constants/governorates";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = session.user as any;
  const currentUserId = user.id;
  const allowedRoles = ["REGISTRATION_CLERK", "ADMIN", "FOLLOW_UP_OFFICER", "RISK_OFFICER", "SUPREME_SUPERVISOR"];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "غير مصرح لك بالاطلاع على تقارير وإحصائيات قيد السجلات" }, { status: 403 });
  }

  await ensureSchemaMigrated();

  try {
    const url = new URL(req.url);
    const startDateStr = url.searchParams.get("startDate");
    const endDateStr = url.searchParams.get("endDate");
    const prosecutionId = url.searchParams.get("prosecutionId");
    const registrationType = url.searchParams.get("registrationType");
    const complainantName = url.searchParams.get("complainantName");
    const respondentName = url.searchParams.get("respondentName");
    const createdById = url.searchParams.get("createdById");
    const governorate = url.searchParams.get("governorate");
    const subCommitteeId = url.searchParams.get("subCommitteeId");
    const status = url.searchParams.get("status");
    const entityType = url.searchParams.get("entityType");
    const branchOrHospital = url.searchParams.get("branchOrHospital");

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

    // فلتر النيابة المختصة
    if (prosecutionId && prosecutionId !== "ALL") {
      const pMatch = await prisma.prosecution.findUnique({
        where: { id: prosecutionId },
        select: { name: true },
      }).catch(() => null);

      if (pMatch) {
        where.AND = [
          ...(where.AND || []),
          {
            OR: [
              { prosecutionId: prosecutionId },
              { prosecution: pMatch.name },
            ],
          },
        ];
      } else {
        where.prosecutionId = prosecutionId;
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

    // فلترة التاريخ والفترة الزمنية
    if (startDateStr || endDateStr) {
      where.createdAt = {};
      if (startDateStr) {
        const start = new Date(startDateStr);
        if (!isNaN(start.getTime())) {
          start.setHours(0, 0, 0, 0);
          where.createdAt.gte = start;
        }
      }
      if (endDateStr) {
        const end = new Date(endDateStr);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          where.createdAt.lte = end;
        }
      }
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // استعلامات متتالية خفيفة وسريعة لتفادي استنزاف موارد المعالج وخنق مسبح الاتصالات
    const globalTotalCases = await prisma.case.count().catch(() => 0);
    const myTotalCases = currentUserId
      ? await prisma.case.count({ where: { createdById: currentUserId } }).catch(() => 0)
      : 0;
    const globalTodayCount = await prisma.case.count({
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
    }).catch(() => 0);
    const myTodayCount = currentUserId
      ? await prisma.case.count({
          where: { createdById: currentUserId, createdAt: { gte: todayStart, lte: todayEnd } },
        }).catch(() => 0)
      : 0;

    const filteredCases = await prisma.case.findMany({
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
        description: true,
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
      take: 500,
    }).catch((e) => {
      console.error("Error fetching filtered cases:", e);
      return [];
    });

    const usersList = await prisma.user.findMany({
      where: {
        role: { in: ["REGISTRATION_CLERK", "ADMIN", "FOLLOW_UP_OFFICER", "RISK_OFFICER"] },
      },
      select: { id: true, fullName: true, email: true, role: true },
      orderBy: { fullName: "asc" },
    }).catch(() => []);

    const dbProsecutions = await prisma.prosecution.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, governorate: true },
      take: 300,
    }).catch(() => []);

    const subCommitteesList = await prisma.subCommittee.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }).catch(() => []);

    const totalByUserGroup = await prisma.case.groupBy({
      by: ["createdById"],
      _count: { id: true },
    }).catch(() => []);

    const todayByUserGroup = await prisma.case.groupBy({
      by: ["createdById"],
      where: { createdAt: { gte: todayStart, lte: todayEnd } },
      _count: { id: true },
    }).catch(() => []);

    // خرائط الإحصائيات في الذاكرة لتفادي استهلاك الموارد
    const totalMap = new Map<string, number>();
    totalByUserGroup.forEach((g: any) => {
      if (g.createdById) totalMap.set(g.createdById, g._count.id);
    });

    const todayMap = new Map<string, number>();
    todayByUserGroup.forEach((g: any) => {
      if (g.createdById) todayMap.set(g.createdById, g._count.id);
    });

    // قائمة إنجاز المستخدمين
    const usersWorkload = usersList.map((u) => {
      const userTotal = totalMap.get(u.id) || 0;
      const userToday = todayMap.get(u.id) || 0;
      const userPeriod = filteredCases.filter((c: any) => c.createdById === u.id).length;

      return {
        id: u.id,
        fullName: u.fullName || u.email,
        email: u.email,
        role: u.role,
        totalRegistered: userTotal,
        todayRegistered: userToday,
        periodRegistered: userPeriod,
        sharePercent: globalTotalCases > 0 ? Number(((userTotal / globalTotalCases) * 100).toFixed(1)) : 0,
      };
    });

    // النيابات الرسمية مع بديل احتياطي فوري
    const prosecutions = dbProsecutions.length > 0
      ? dbProsecutions
      : OFFICIAL_PROSECUTIONS_LIST.filter((p) => p.type === "PLENARY").map((p, idx) => ({
          id: `official_${idx + 1}`,
          name: p.name,
          governorate: p.governorate,
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

    const totalFiltered = filteredCases.length;

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
