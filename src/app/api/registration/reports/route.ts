import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const user = session.user as any;
  const currentUserId = user.id;
  const allowedRoles = ["REGISTRATION_CLERK", "ADMIN", "FOLLOW_UP_OFFICER", "RISK_OFFICER"];
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ error: "غير مصرح لك بالاطلاع على تقارير وإحصائيات قيد السجلات" }, { status: 403 });
  }

  const url = new URL(req.url);
  const startDateStr = url.searchParams.get("startDate");
  const endDateStr = url.searchParams.get("endDate");
  const prosecutionId = url.searchParams.get("prosecutionId");
  const registrationType = url.searchParams.get("registrationType");
  const complainantName = url.searchParams.get("complainantName");
  const respondentName = url.searchParams.get("respondentName");
  const createdById = url.searchParams.get("createdById");
  const isClerk = user.role === "REGISTRATION_CLERK";

  const where: any = {};
  if (isClerk) where.createdById = currentUserId;
  else if (createdById && createdById !== "ALL") where.createdById = createdById;

  if (registrationType && registrationType !== "ALL") where.registrationType = registrationType as any;
  if (prosecutionId && prosecutionId !== "ALL") where.prosecutionId = prosecutionId;
  if (complainantName?.trim()) {
    where.complainantName = { contains: complainantName.trim(), mode: "insensitive" };
  }
  if (respondentName?.trim()) {
    where.OR = [
      { respondentName: { contains: respondentName.trim(), mode: "insensitive" } },
      { hospitalName: { contains: respondentName.trim(), mode: "insensitive" } },
    ];
  }
  if (startDateStr || endDateStr) {
    where.createdAt = {};
    if (startDateStr) {
      const start = new Date(startDateStr);
      if (Number.isNaN(start.getTime())) return NextResponse.json({ error: "تاريخ البداية غير صالح" }, { status: 400 });
      start.setHours(0, 0, 0, 0);
      where.createdAt.gte = start;
    }
    if (endDateStr) {
      const end = new Date(endDateStr);
      if (Number.isNaN(end.getTime())) return NextResponse.json({ error: "تاريخ النهاية غير صالح" }, { status: 400 });
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const globalScope = isClerk ? { createdById: currentUserId } : {};
  const usersWhere = isClerk
    ? { id: currentUserId }
    : { role: { in: ["REGISTRATION_CLERK", "ADMIN", "FOLLOW_UP_OFFICER"] as any[] } };

  const [globalTotalCases, myTotalCases, globalTodayCount, myTodayCount, filteredCases, usersList, prosecutionsList] = await Promise.all([
    prisma.case.count({ where: globalScope }),
    prisma.case.count({ where: { createdById: currentUserId } }),
    prisma.case.count({ where: { ...globalScope, createdAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.case.count({ where: { createdById: currentUserId, createdAt: { gte: todayStart, lte: todayEnd } } }),
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
      where: usersWhere as any,
      select: { id: true, fullName: true, email: true, role: true },
      orderBy: { fullName: "asc" },
    }),
    prisma.prosecution.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const usersWorkload = await Promise.all(usersList.map(async (u) => {
    const [userTotal, userToday, userPeriod] = await Promise.all([
      prisma.case.count({ where: { createdById: u.id } }),
      prisma.case.count({ where: { createdById: u.id, createdAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.case.count({
        where: {
          createdById: u.id,
          ...(startDateStr || endDateStr ? { createdAt: where.createdAt } : {}),
          ...(prosecutionId && prosecutionId !== "ALL" ? { prosecutionId } : {}),
          ...(registrationType && registrationType !== "ALL" ? { registrationType: registrationType as any } : {}),
        },
      }),
    ]);
    return {
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      totalRegistered: userTotal,
      todayRegistered: userToday,
      periodRegistered: userPeriod,
      sharePercent: globalTotalCases > 0 ? Number(((userTotal / globalTotalCases) * 100).toFixed(1)) : 0,
    };
  }));

  const typeBreakdown = {
    COMPLAINT: filteredCases.filter((c) => c.registrationType === "COMPLAINT").length,
    CASE: filteredCases.filter((c) => c.registrationType === "CASE").length,
    REPORT: filteredCases.filter((c) => c.registrationType === "REPORT").length,
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
    prosecutions: prosecutionsList,
    cases: filteredCases,
    currentUser: { id: currentUserId, name: user.name, role: user.role },
  });
}
