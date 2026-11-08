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
  searchParams?: Promise<{ tab?: string }>;
}) {
  try {
    const resolvedSearchParams = await searchParams;
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

  // استعلامات متتالية خفيفة لتفادي إجهاد مجمع اتصالات TCP في Cloudflare Workers
  let cases: any[] = [];
  try {
    cases = await prisma.case.findMany({
      take: 200,
      select: {
        id: true,
        status: true,
        assignedAt: true,
        isRiskOverridden: true,
      },
    });
  } catch {
    cases = [];
  }

  let subCommittees: any[] = [];
  try {
    subCommittees = await prisma.subCommittee.findMany({
      where: { active: true },
      orderBy: { code: "asc" },
      select: { id: true, name: true, code: true },
    });
  } catch {
    subCommittees = [];
  }

  let specialties: any[] = [];
  try {
    specialties = await prisma.specialty.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    });
  } catch {
    specialties = [];
  }

  let users: any[] = [];
  try {
    users = await prisma.user.findMany({
      take: 100,
      orderBy: { fullName: "asc" },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        employer: true,
        active: true,
        phone: true,
        nationalId: true,
        initialPassword: true,
        lastSeenAt: true,
        todayActiveMinutes: true,
        createdAt: true,
        subCommitteeId: true,
        specialtyId: true,
        subCommittee: { select: { name: true } },
        specialty: { select: { name: true } },
      },
    });
  } catch {
    users = [];
  }

  let recentLogs: any[] = [];
  try {
    recentLogs = await prisma.auditLog.findMany({
      where: { entityType: { not: "Payment" } },
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        entityType: true,
        entityId: true,
        action: true,
        createdAt: true,
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
    recentLogs = [];
  }

  const totalLogsCount = recentLogs.length;
  const todayLogsCount = recentLogs.filter((l: any) => l.createdAt && new Date(l.createdAt) >= todayStart).length;
  const todaySessionsCount = users.filter((u: any) => u.lastSeenAt && new Date(u.lastSeenAt) >= todayStart).length;

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

  const serializedLiveUsers = (liveUsers || []).map((u: any) => ({
    id: String(u.id),
    fullName: String(u.fullName || ""),
    role: String(u.role || ""),
    employer: u.employer ?? null,
    currentPath: null,
    lastSeenAt: u.lastSeenAt instanceof Date ? u.lastSeenAt.toISOString() : (u.lastSeenAt ? String(u.lastSeenAt) : null),
    todayActiveMinutes: Number(u.todayActiveMinutes) || 0,
  }));

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
    phone: u.phone ?? null,
    nationalId: u.nationalId ?? null,
    initialPassword: u.initialPassword ?? null,
    lastSeenAt: u.lastSeenAt instanceof Date ? u.lastSeenAt.toISOString() : (u.lastSeenAt ? String(u.lastSeenAt) : null),
    todayActiveMinutes: Number(u.todayActiveMinutes) || 0,
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : (u.createdAt ? String(u.createdAt) : null),
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
      initialTab={resolvedSearchParams?.tab === "users" ? "users" : "overview"}
    />
  );
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT")) throw err;
    console.error("[ADMIN_DASHBOARD_ERROR]:", err);
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 m-6">
        <h2 className="text-base font-bold font-heading mb-2">تعذر تحميل بيانات لوحة التحكم الإدارية</h2>
        <p className="text-xs text-rose-700 font-mono">{err?.message}</p>
      </div>
    );
  }
}
