import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrated } from "@/lib/db-migrate";
import { OFFICIAL_PROSECUTIONS_LIST } from "@/lib/constants/prosecutions";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = session.user as any;
  const currentUserId = user.id;
  const allowedRoles = ["REGISTRATION_CLERK", "ADMIN", "FOLLOW_UP_OFFICER", "RISK_OFFICER"];
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

    const where: any = {};

    // الفلترة بالموظف القائم بالقيد
    if (createdById && createdById !== "ALL") {
      where.createdById = createdById;
    }

    if (registrationType && registrationType !== "ALL") {
      where.registrationType = registrationType as any;
    }

    if (prosecutionId && prosecutionId !== "ALL") {
      const pMatch = await prisma.prosecution.findUnique({
        where: { id: prosecutionId },
        select: { name: true },
      }).catch(() => null);

      if (pMatch) {
        where.OR = [
          { prosecutionId: prosecutionId },
          { prosecution: pMatch.name },
        ];
      } else {
        where.prosecutionId = prosecutionId;
      }
    }

    if (complainantName?.trim()) {
      where.complainantName = { contains: complainantName.trim(), mode: "insensitive" };
    }

    if (respondentName?.trim()) {
      where.OR = [
        ...(where.OR || []),
        { respondentName: { contains: respondentName.trim(), mode: "insensitive" } },
        { hospitalName: { contains: respondentName.trim(), mode: "insensitive" } },
      ];
    }

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

    // استعلامات تجميع سريعة وخفيفة تمنع استنزاف موارد خادم قاعدة البيانات
    const [
      globalTotalCases,
      myTotalCases,
      globalTodayCount,
      myTodayCount,
      filteredCases,
      usersList,
      dbProsecutions,
      totalByUserGroup,
      todayByUserGroup,
    ] = await Promise.all([
      prisma.case.count().catch(() => 0),
      currentUserId ? prisma.case.count({ where: { createdById: currentUserId } }).catch(() => 0) : 0,
      prisma.case.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }).catch(() => 0),
      currentUserId ? prisma.case.count({ where: { createdById: currentUserId, createdAt: { gte: todayStart, lte: todayEnd } } }).catch(() => 0) : 0,
      prisma.case.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          prosecutionRel: { select: { id: true, name: true } },
          createdBy: { select: { id: true, fullName: true, email: true, role: true } },
          subCommittee: { select: { id: true, name: true } },
        },
        take: 1000,
      }).catch((e) => {
        console.error("Error fetching filtered cases:", e);
        return [];
      }),
      prisma.user.findMany({
        where: {
          role: { in: ["REGISTRATION_CLERK", "ADMIN", "FOLLOW_UP_OFFICER"] },
        },
        select: { id: true, fullName: true, email: true, role: true },
        orderBy: { fullName: "asc" },
      }).catch(() => []),
      prisma.prosecution.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
        take: 300,
      }).catch(() => []),
      prisma.case.groupBy({
        by: ["createdById"],
        _count: { id: true },
      }).catch(() => []),
      prisma.case.groupBy({
        by: ["createdById"],
        where: { createdAt: { gte: todayStart, lte: todayEnd } },
        _count: { id: true },
      }).catch(() => []),
    ]);

    // خرائط الإحصائيات في الذاكرة لتفادي إطلاق استعلامات متكررة
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

    // النيابات مع بديل احتياطي فوري
    const prosecutions = dbProsecutions.length > 0
      ? dbProsecutions
      : OFFICIAL_PROSECUTIONS_LIST.filter((p) => p.type === "PLENARY").map((p, idx) => ({
          id: `official_${idx + 1}`,
          name: p.name,
        }));

    const typeBreakdown = {
      COMPLAINT: filteredCases.filter((c: any) => c.registrationType === "COMPLAINT").length,
      CASE: filteredCases.filter((c: any) => c.registrationType === "CASE").length,
      REPORT: filteredCases.filter((c: any) => c.registrationType === "REPORT").length,
    };

    return NextResponse.json({
      metrics: {
        globalTotalCases,
        myTotalCases,
        globalTodayCount,
        myTodayCount,
        filteredTotal: filteredCases.length,
        myContributionPercent: globalTotalCases > 0 ? Number(((myTotalCases / globalTotalCases) * 100).toFixed(1)) : 0,
      },
      usersWorkload,
      typeBreakdown,
      prosecutions,
      cases: filteredCases,
      currentUser: { id: currentUserId, name: user.name || user.fullName || user.email, role: user.role },
    });
  } catch (err: any) {
    console.error("GET /api/registration/reports fatal error:", err);
    return NextResponse.json({ error: err.message || "تعذر معالجة تقرير التسجيل" }, { status: 500 });
  }
}
