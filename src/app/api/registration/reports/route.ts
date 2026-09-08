import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const user = session.user as any;
  const currentUserId = user.id;

  const url = new URL(req.url);
  const startDateStr = url.searchParams.get("startDate");
  const endDateStr = url.searchParams.get("endDate");
  const prosecutionId = url.searchParams.get("prosecutionId");
  const registrationType = url.searchParams.get("registrationType");
  const complainantName = url.searchParams.get("complainantName");
  const respondentName = url.searchParams.get("respondentName");
  const createdById = url.searchParams.get("createdById");

  // بناء شروط التصفية
  const where: any = {};

  if (registrationType && registrationType !== "ALL") {
    where.registrationType = registrationType as any;
  }

  if (prosecutionId && prosecutionId !== "ALL") {
    where.prosecutionId = prosecutionId;
  }

  if (complainantName && complainantName.trim() !== "") {
    where.complainantName = {
      contains: complainantName.trim(),
      mode: "insensitive",
    };
  }

  if (respondentName && respondentName.trim() !== "") {
    where.respondentName = {
      contains: respondentName.trim(),
      mode: "insensitive",
    };
  }

  if (createdById && createdById !== "ALL") {
    where.createdById = createdById;
  }

  if (startDateStr || endDateStr) {
    where.createdAt = {};
    if (startDateStr) {
      const start = new Date(startDateStr);
      start.setHours(0, 0, 0, 0);
      where.createdAt.gte = start;
    }
    if (endDateStr) {
      const end = new Date(endDateStr);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  // حساب بداية ونهاية اليوم الحالي
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // جلب البيانات والإحصائيات
  const [
    globalTotalCases,
    myTotalCases,
    globalTodayCount,
    myTodayCount,
    filteredCases,
    usersList,
    prosecutionsList,
  ] = await Promise.all([
    prisma.case.count(),
    prisma.case.count({ where: { createdById: currentUserId } }),
    prisma.case.count({ where: { createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.case.count({
      where: {
        createdById: currentUserId,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    }),
    prisma.case.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        prosecutionRel: { select: { id: true, name: true } },
        createdBy: { select: { id: true, fullName: true, email: true, role: true } },
        subCommittee: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({
      where: {
        role: { in: ["REGISTRATION_CLERK", "ADMIN", "FOLLOW_UP_OFFICER"] },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.prosecution.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  // احتساب معدلات التشغيل لكل حساب منفصل
  const usersWorkload = await Promise.all(
    usersList.map(async (u) => {
      const [userTotal, userToday, userPeriod] = await Promise.all([
        prisma.case.count({ where: { createdById: u.id } }),
        prisma.case.count({
          where: {
            createdById: u.id,
            createdAt: { gte: todayStart, lte: todayEnd },
          },
        }),
        prisma.case.count({
          where: {
            createdById: u.id,
            ...(startDateStr || endDateStr ? { createdAt: where.createdAt } : {}),
            ...(prosecutionId && prosecutionId !== "ALL" ? { prosecutionId } : {}),
            ...(registrationType && registrationType !== "ALL" ? { registrationType: registrationType as any } : {}),
          },
        }),
      ]);

      const sharePercent =
        globalTotalCases > 0
          ? Number(((userTotal / globalTotalCases) * 100).toFixed(1))
          : 0;

      return {
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        totalRegistered: userTotal,
        todayRegistered: userToday,
        periodRegistered: userPeriod,
        sharePercent,
      };
    })
  );

  // تصنيف السجلات حسب النوع
  const typeBreakdown = {
    COMPLAINT: filteredCases.filter((c) => c.registrationType === "COMPLAINT").length,
    CASE: filteredCases.filter((c) => c.registrationType === "CASE").length,
    REPORT: filteredCases.filter((c) => c.registrationType === "REPORT").length,
  };

  const myContributionPercent =
    globalTotalCases > 0
      ? Number(((myTotalCases / globalTotalCases) * 100).toFixed(1))
      : 0;

  return NextResponse.json({
    metrics: {
      globalTotalCases,
      myTotalCases,
      globalTodayCount,
      myTodayCount,
      filteredTotal: filteredCases.length,
      myContributionPercent,
    },
    usersWorkload,
    typeBreakdown,
    prosecutions: prosecutionsList,
    cases: filteredCases,
    currentUser: {
      id: currentUserId,
      name: user.name,
      role: user.role,
    },
  });
}
