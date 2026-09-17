import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RegistrationDashboardClient } from "./registration-dashboard-client";
import { SerializedCase } from "./cases-table";

export const revalidate = 0;

function safeIsoDate(d: any): string | null {
  if (!d) return null;
  const date = new Date(d);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

export default async function RegistrationDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const currentUserId = (session.user as any)?.id;

  // حساب بداية اليوم للتسجيلات
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [
    cases,
    totalSystemCasesCount,
    todaySystemCount,
    myTotalCasesCount,
    myTodayCount,
    myPendingRoutingCount,
    myComplaintsCount,
    myProsecutionCasesCount,
    myReportsCount,
    subCommittees,
  ] = await Promise.all([
    (async () => {
      try {
        if (!currentUserId) return [];
        return await prisma.case.findMany({
          where: { createdById: currentUserId },
          orderBy: { createdAt: "desc" },
          include: {
            subCommittee: { select: { id: true, name: true } },
            specialties: { include: { specialty: { select: { id: true, name: true } } } },
            createdBy: { select: { id: true, fullName: true } },
          },
          take: 300,
        });
      } catch (e1) {
        try {
          // Fallback if prosecutionCaseNumber or relation is pending migration
          return await prisma.case.findMany({
            where: { createdById: currentUserId },
            orderBy: { createdAt: "desc" },
            take: 300,
          });
        } catch {
          return [];
        }
      }
    })(),
    (async () => {
      try { return await prisma.case.count(); } catch { return 0; }
    })(),
    (async () => {
      try { return await prisma.case.count({ where: { createdAt: { gte: todayStart } } }); } catch { return 0; }
    })(),
    (async () => {
      try { return currentUserId ? await prisma.case.count({ where: { createdById: currentUserId } }) : 0; } catch { return 0; }
    })(),
    (async () => {
      try { return currentUserId ? await prisma.case.count({ where: { createdById: currentUserId, createdAt: { gte: todayStart } } }) : 0; } catch { return 0; }
    })(),
    (async () => {
      try { return currentUserId ? await prisma.case.count({ where: { createdById: currentUserId, status: "REGISTERED" } }) : 0; } catch { return 0; }
    })(),
    (async () => {
      try { return currentUserId ? await prisma.case.count({ where: { createdById: currentUserId, registrationType: "COMPLAINT" } }) : 0; } catch { return 0; }
    })(),
    (async () => {
      try { return currentUserId ? await prisma.case.count({ where: { createdById: currentUserId, registrationType: "CASE" } }) : 0; } catch { return 0; }
    })(),
    (async () => {
      try { return currentUserId ? await prisma.case.count({ where: { createdById: currentUserId, registrationType: "REPORT" } }) : 0; } catch { return 0; }
    })(),
    (async () => {
      try {
        return await prisma.subCommittee.findMany({
          where: { active: true },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        });
      } catch {
        return [];
      }
    })(),
  ]);

  const serializedCases: SerializedCase[] = (cases || []).map((c: any) => {
    const isCreatedByMe = c.createdById === currentUserId;
    const createdAtTime = c.createdAt ? new Date(c.createdAt).getTime() : 0;
    const updatedAtTime = c.updatedAt ? new Date(c.updatedAt).getTime() : 0;
    const isModified = updatedAtTime - createdAtTime > 60000;

    return {
      id: c.id,
      caseNumber: c.caseNumber || "—",
      caseYear: c.caseYear || new Date().getFullYear(),
      prosecutionCaseNumber: c.prosecutionCaseNumber || null,
      registrationType: c.registrationType || "COMPLAINT",
      complainantName: c.complainantName || null,
      prosecution: c.prosecution || null,
      respondentName: c.respondentName || c.hospitalName || null,
      incomingDate: safeIsoDate(c.incomingDate),
      attachmentsCount: typeof c.attachmentsCount === "number" ? c.attachmentsCount : 0,
      status: c.status || "REGISTERED",
      createdAt: safeIsoDate(c.createdAt) || new Date().toISOString(),
      updatedAt: safeIsoDate(c.updatedAt) || new Date().toISOString(),
      isModified,
      createdById: c.createdById || "",
      createdByName: c.createdBy?.fullName || "موظف تسجيل",
      isCreatedByMe,
      subCommittee: c.subCommittee || null,
      specialties: Array.isArray(c.specialties)
        ? c.specialties.map((s: any) => ({
            id: s.id,
            specialty: { id: s.specialty?.id || s.id, name: s.specialty?.name || "تخصص غير محدد" },
          }))
        : [],
    };
  });

  return (
    <RegistrationDashboardClient
      cases={serializedCases}
      totalSystemCasesCount={totalSystemCasesCount}
      myTotalCasesCount={myTotalCasesCount}
      myTodayCount={myTodayCount}
      todaySystemCount={todaySystemCount}
      myPendingRoutingCount={myPendingRoutingCount}
      myComplaintsCount={myComplaintsCount}
      myProsecutionCasesCount={myProsecutionCasesCount}
      myReportsCount={myReportsCount}
      subCommittees={subCommittees}
      currentUser={session.user}
      initialTab="overview"
    />
  );
}
