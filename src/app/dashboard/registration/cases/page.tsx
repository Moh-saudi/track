import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RegistrationDashboardClient } from "../registration-dashboard-client";
import { SerializedCase } from "../cases-table";

export const revalidate = 0;

export default async function RegistrationCasesPage() {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as any)?.id;

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
    prisma.case.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subCommittee: { select: { id: true, name: true } },
        specialties: { include: { specialty: { select: { id: true, name: true } } } },
        createdBy: { select: { id: true, fullName: true } },
      },
      take: 200,
    }),
    prisma.case.count(),
    prisma.case.count({
      where: { createdAt: { gte: todayStart } },
    }),
    currentUserId
      ? prisma.case.count({ where: { createdById: currentUserId } })
      : 0,
    currentUserId
      ? prisma.case.count({
          where: {
            createdById: currentUserId,
            createdAt: { gte: todayStart },
          },
        })
      : 0,
    currentUserId
      ? prisma.case.count({
          where: {
            createdById: currentUserId,
            status: "REGISTERED",
          },
        })
      : 0,
    currentUserId
      ? prisma.case.count({
          where: {
            createdById: currentUserId,
            registrationType: "COMPLAINT",
          },
        })
      : 0,
    currentUserId
      ? prisma.case.count({
          where: {
            createdById: currentUserId,
            registrationType: "CASE",
          },
        })
      : 0,
    currentUserId
      ? prisma.case.count({
          where: {
            createdById: currentUserId,
            registrationType: "REPORT",
          },
        })
      : 0,
    prisma.subCommittee.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedCases: SerializedCase[] = cases.map((c) => {
    const isCreatedByMe = c.createdById === currentUserId;
    const isModified =
      new Date(c.updatedAt).getTime() - new Date(c.createdAt).getTime() > 60000;

    return {
      id: c.id,
      caseNumber: c.caseNumber,
      caseYear: c.caseYear,
      registrationType: c.registrationType,
      complainantName: c.complainantName,
      prosecution: c.prosecution,
      respondentName: c.respondentName || c.hospitalName || null,
      incomingDate: c.incomingDate ? c.incomingDate.toISOString() : null,
      attachmentsCount: c.attachmentsCount,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      isModified,
      createdById: c.createdById,
      createdByName: c.createdBy?.fullName || "موظف تسجيل",
      isCreatedByMe,
      subCommittee: c.subCommittee,
      specialties: c.specialties.map((s) => ({
        id: s.id,
        specialty: { id: s.specialty.id, name: s.specialty.name },
      })),
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
      currentUser={session?.user}
      initialTab="cases"
    />
  );
}
