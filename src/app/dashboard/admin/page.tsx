import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminDashboardClient } from "./admin-dashboard-client";
import type { UserItem } from "./users-table";

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
  ] = await Promise.all([
    (async () => {
      try {
        return await prisma.case.findMany({
          select: {
            id: true,
            status: true,
            assignedAt: true,
            isRiskOverridden: true,
          },
        });
      } catch {
        try {
          return await prisma.case.findMany({
            select: {
              id: true,
              status: true,
              assignedAt: true,
            },
          });
        } catch {
          return [];
        }
      }
    })(),
    (async () => {
      try {
        return await prisma.subCommittee.findMany({
          where: { active: true },
          orderBy: { code: "asc" },
          select: { id: true, name: true, code: true },
        });
      } catch {
        return [];
      }
    })(),
    (async () => {
      try {
        return await prisma.specialty.findMany({
          where: { active: true },
          orderBy: { name: "asc" },
          select: { id: true, name: true, code: true },
        });
      } catch {
        return [];
      }
    })(),
    (async () => {
      try {
        return await prisma.user.findMany({
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
        });
      } catch {
        try {
          return await prisma.user.findMany({
            orderBy: { fullName: "asc" },
            include: {
              subCommittee: { select: { name: true } },
              specialty: { select: { name: true } },
            },
          });
        } catch {
          return [];
        }
      }
    })(),
    prisma.auditLog.count().catch(() => 0),
    prisma.auditLog.count({ where: { createdAt: { gte: todayStart } } }).catch(() => 0),
    (async () => {
      try {
        return await prisma.userSession.count({ where: { createdAt: { gte: todayStart } } });
      } catch {
        return 0;
      }
    })(),
    (async () => {
      try {
        return await prisma.auditLog.findMany({
          where: { entityType: { not: "Payment" } },
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
        });
      } catch {
        return [];
      }
    })(),
  ]);

  const totalCasesCount = cases.length;
  const overdueCasesCount = cases.filter((c: any) => {
    if (c.status === "APPROVED" || c.status === "CLOSED") return false;
    if (c.status === "REFERRED_FOR_REVIEW") return true;
    if (c.assignedAt && nowMs - new Date(c.assignedAt).getTime() > thirtyDaysMs) return true;
    return false;
  }).length;

  const casesByStatus = {
    registered: cases.filter((c: any) => c.status === "REGISTERED").length,
    underSubcommittee: cases.filter((c: any) => c.status === "UNDER_SUBCOMMITTEE_REVIEW").length,
    pendingSupreme: cases.filter((c: any) => c.status === "PENDING_SUPREME_REVIEW").length,
    approved: cases.filter((c: any) => c.status === "APPROVED").length,
    referredBack: cases.filter((c: any) => c.status === "REFERRED_FOR_REVIEW").length,
  };

  const totalUsersCount = users.length;
  const liveUsers = users.filter((u: any) => {
    if (!u.lastSeenAt) return false;
    const time = new Date(u.lastSeenAt).getTime();
    return !isNaN(time) && time >= fiveMinutesAgo.getTime();
  });
  const liveUsersCount = liveUsers.length;
  const todayActiveUsersCount = users.filter((u: any) => {
    if (u.todayActiveMinutes && u.todayActiveMinutes > 0) return true;
    if (u.lastSeenAt) {
      const time = new Date(u.lastSeenAt).getTime();
      return !isNaN(time) && time >= todayStart.getTime();
    }
    return false;
  }).length;

  const serializedRecentLogs = (recentLogs || []).map((l: any) => ({
    id: String(l.id || ""),
    entityType: String(l.entityType || ""),
    entityId: String(l.entityId || ""),
    action: String(l.action || ""),
    createdAt: l.createdAt instanceof Date ? l.createdAt.toISOString() : (l.createdAt ? String(l.createdAt) : new Date().toISOString()),
    user: l.user ? {
      fullName: String(l.user.fullName || "مستخدم"),
      role: String(l.user.role || ""),
      employer: l.user.employer ?? null,
    } : null,
  }));

  const serializedLiveUsers = (liveUsers || []).map((u: any) => {
    let currentScreen: string | null = null;
    try {
      const st = u.sessions?.[0]?.screenTimes;
      if (st && typeof st === "object" && !Array.isArray(st)) {
        const entries = Object.entries(st);
        if (entries.length > 0) currentScreen = entries[entries.length - 1][0];
      }
    } catch {
      currentScreen = null;
    }

    return {
      id: String(u.id),
      fullName: String(u.fullName || ""),
      role: String(u.role || ""),
      employer: u.employer ?? null,
      currentPath: currentScreen,
      lastSeenAt: u.lastSeenAt instanceof Date ? u.lastSeenAt.toISOString() : (u.lastSeenAt ? String(u.lastSeenAt) : null),
      todayActiveMinutes: Number(u.todayActiveMinutes) || 0,
    };
  });

  const serializedUsers: UserItem[] = (users || []).map((u: any) => ({
    id: String(u.id),
    fullName: String(u.fullName || ""),
    email: String(u.email || ""),
    role: String(u.role || "REGISTRATION_CLERK"),
    employer: u.employer ?? null,
    active: Boolean(u.active),
    subCommitteeId: u.subCommitteeId ?? null,
    specialtyId: u.specialtyId ?? null,
    subCommittee: u.subCommittee ? { name: String(u.subCommittee.name || "") } : null,
    specialty: u.specialty ? { name: String(u.specialty.name || "") } : null,
  }));

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
      paymentsStats={{ totalCount: 0, paidCount: 0, pendingCount: 0, paidAmount: 0, pendingAmount: 0 }}
      recentLogs={serializedRecentLogs as any}
      liveUsers={serializedLiveUsers}
      users={serializedUsers}
      subCommittees={subCommittees}
      specialties={specialties}
      currentUser={{
        name: session.user.name || (session.user as any).fullName || "مدير المنظومة",
        fullName: (session.user as any).fullName || session.user.name || "مدير المنظومة",
        role: (session.user as any).role || "ADMIN",
        employer: (session.user as any).employer || null,
      }}
      initialTab={searchParams?.tab === "users" ? "users" : "overview"}
    />
  );
}
