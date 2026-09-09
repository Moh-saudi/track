import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminDashboardClient } from "./admin-dashboard-client";

export const revalidate = 0;

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user || (role !== "ADMIN" && role !== "RISK_OFFICER")) {
    redirect("/dashboard");
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const nowMs = Date.now();

  const [
    cases,
    subCommittees,
    specialties,
    users,
    totalLogsCount,
    todayLogsCount,
    todaySessionsCount,
    recentLogs,
    payments,
  ] = await Promise.all([
    prisma.case.findMany({
      select: {
        id: true,
        status: true,
        assignedAt: true,
        isRiskOverridden: true,
      },
    }),
    prisma.subCommittee.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.specialty.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.user.findMany({
      orderBy: { fullName: "asc" },
      include: {
        subCommittee: { select: { name: true } },
        specialty: { select: { name: true } },
        sessions: {
          take: 1,
          orderBy: { updatedAt: "desc" },
          select: { screenTimes: true },
        },
      },
    }),
    prisma.auditLog.count(),
    prisma.auditLog.count({
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.userSession.count({
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.auditLog.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            fullName: true,
            role: true,
            employer: true,
          },
        },
      },
    }),
    prisma.payment.findMany({
      select: {
        amount: true,
        status: true,
        entitled: true,
      },
    }),
  ]);

  // حساب إحصائيات السجلات ومؤشرات المدد
  const totalCasesCount = cases.length;
  const overdueCasesCount = cases.filter((c) => {
    if (c.status === "APPROVED" || c.status === "CLOSED") return false;
    if (c.status === "REFERRED_FOR_REVIEW") return true;
    if (c.assignedAt && nowMs - new Date(c.assignedAt).getTime() > thirtyDaysMs) return true;
    return false;
  }).length;

  const casesByStatus = {
    registered: cases.filter((c) => c.status === "REGISTERED").length,
    underSubcommittee: cases.filter((c) => c.status === "UNDER_SUBCOMMITTEE_REVIEW").length,
    pendingSupreme: cases.filter((c) => c.status === "PENDING_SUPREME_REVIEW").length,
    approved: cases.filter((c) => c.status === "APPROVED").length,
    referredBack: cases.filter((c) => c.status === "REFERRED_FOR_REVIEW").length,
  };

  // حساب مؤشرات المستخدمين والجلسات
  const totalUsersCount = users.length;
  const liveUsers = users.filter((u) => u.lastSeenAt && new Date(u.lastSeenAt) >= fiveMinutesAgo);
  const liveUsersCount = liveUsers.length;
  const todayActiveUsersCount = users.filter(
    (u) => (u.todayActiveMinutes && u.todayActiveMinutes > 0) || (u.lastSeenAt && new Date(u.lastSeenAt) >= todayStart)
  ).length;

  // حساب المؤشرات المالية للبدلات
  let paidAmount = 0;
  let pendingAmount = 0;
  let paidCount = 0;
  let pendingCount = 0;

  payments.forEach((p) => {
    const amt = Number(p.amount) || 0;
    if (p.status === "PAID") {
      paidCount++;
      paidAmount += amt;
    } else {
      pendingCount++;
      pendingAmount += amt;
    }
  });

  const serializedRecentLogs = recentLogs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  const serializedLiveUsers = liveUsers.map((u) => {
    let currentScreen: string | null = null;
    const st = u.sessions?.[0]?.screenTimes as Record<string, number> | null;
    if (st && typeof st === "object") {
      const entries = Object.entries(st);
      if (entries.length > 0) {
        currentScreen = entries[entries.length - 1][0];
      }
    }

    return {
      id: u.id,
      fullName: u.fullName,
      role: u.role,
      employer: u.employer,
      currentPath: currentScreen,
      lastSeenAt: u.lastSeenAt ? u.lastSeenAt.toISOString() : null,
      todayActiveMinutes: u.todayActiveMinutes || 0,
    };
  });

  return (
    <AdminDashboardClient
      totalCasesCount={totalCasesCount}
      overdueCasesCount={overdueCasesCount}
      casesByStatus={casesByStatus}
      totalUsersCount={totalUsersCount}
      liveUsersCount={liveUsersCount}
      todayActiveUsersCount={todayActiveUsersCount}
      todaySessionsCount={todaySessionsCount || todayActiveUsersCount}
      todayLogsCount={todayLogsCount}
      totalLogsCount={totalLogsCount}
      subCommitteesCount={subCommittees.length}
      specialtiesCount={specialties.length}
      paymentsStats={{
        totalCount: payments.length,
        paidCount,
        pendingCount,
        paidAmount,
        pendingAmount,
      }}
      recentLogs={serializedRecentLogs as any}
      liveUsers={serializedLiveUsers}
      users={users as any}
      subCommittees={subCommittees}
      specialties={specialties}
      currentUser={{
        name: session.user.name,
        fullName: (session.user as any).fullName,
        role: (session.user as any).role,
        employer: (session.user as any).employer,
      }}
      initialTab={searchParams?.tab === "users" ? "users" : "overview"}
    />
  );
}
