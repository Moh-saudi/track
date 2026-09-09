import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  SubCommitteeWorkloadItem,
  SpecialtyStat,
} from "@/components/analytics/AnalyticsCharts";
import {
  FollowUpDashboardClient,
  SerializedFollowUpCase,
} from "../follow-up-dashboard-client";

export const revalidate = 0;

export default async function FollowUpCasesPage() {
  const session = await getServerSession(authOptions);

  const [cases, allSubCommittees] = await Promise.all([
    prisma.case.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subCommittee: true,
        specialties: { include: { specialty: true } },
        createdBy: { select: { fullName: true } },
        actions: { select: { reportDate: true, receivedDate: true, createdAt: true } },
        meetingReschedules: {
          orderBy: { createdAt: "desc" },
          include: {
            createdBy: { select: { fullName: true } },
          },
        },
        reviewers: {
          include: {
            user: { select: { fullName: true, employer: true } },
            doctor: { select: { name: true, employer: true } },
          },
        },
      },
    }),
    prisma.subCommittee.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const specialtyCounts: Record<string, { name: string; count: number }> = {};
  cases.forEach((c) => {
    c.specialties.forEach((s) => {
      const specName = s.specialty.name;
      if (!specialtyCounts[specName]) {
        specialtyCounts[specName] = { name: specName, count: 0 };
      }
      specialtyCounts[specName].count++;
    });
  });

  const totalSpecialtyReferences = Object.values(specialtyCounts).reduce(
    (sum, cur) => sum + cur.count,
    0
  );

  const specialtiesList: SpecialtyStat[] = Object.values(specialtyCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((item) => ({
      name: item.name,
      count: item.count,
      percentage:
        totalSpecialtyReferences > 0
          ? Math.round((item.count / totalSpecialtyReferences) * 100)
          : 0,
    }));

  const subCommitteesWorkload: SubCommitteeWorkloadItem[] = allSubCommittees.map((sc) => {
    const scCases = cases.filter((c) => c.subCommitteeId === sc.id);
    const inReview = scCases.filter(
      (c) => c.status === "UNDER_SUBCOMMITTEE_REVIEW" || c.status === "REFERRED_FOR_REVIEW"
    );
    const completed = scCases.filter(
      (c) => c.status === "PENDING_SUPREME_REVIEW" || c.status === "APPROVED"
    );
    const referred = scCases.filter((c) => c.status === "REFERRED_FOR_REVIEW");

    return {
      id: sc.id,
      name: sc.name,
      totalCases: scCases.length,
      inReviewCases: inReview.length,
      completedCases: completed.length,
      referredCases: referred.length,
      overdueCases: 0,
      avgTurnaroundDays: 0,
    };
  });

  const serializedCases: SerializedFollowUpCase[] = cases.map((c) => ({
    id: c.id,
    caseNumber: c.caseNumber,
    caseYear: c.caseYear,
    registrationType: c.registrationType,
    respondentName: c.respondentName,
    hospitalName: c.hospitalName,
    complainantName: c.complainantName,
    prosecution: c.prosecution,
    attachmentsCount: c.attachmentsCount,
    createdAt: c.createdAt.toISOString(),
    assignedAt: c.assignedAt ? c.assignedAt.toISOString() : null,
    expectedDueDate: c.expectedDueDate ? c.expectedDueDate.toISOString() : null,
    meetingDate: c.meetingDate ? c.meetingDate.toISOString() : null,
    meetingDateReason: c.meetingDateReason,
    prosecutionNotifiedAt: c.prosecutionNotifiedAt ? c.prosecutionNotifiedAt.toISOString() : null,
    prosecutionLetterNumber: c.prosecutionLetterNumber,
    prosecutionNotificationNotes: c.prosecutionNotificationNotes,
    subCommittee: c.subCommittee ? { id: c.subCommittee.id, name: c.subCommittee.name } : null,
    subCommitteeId: c.subCommitteeId,
    specialties: c.specialties.map((s) => ({
      id: s.id,
      specialty: { id: s.specialty.id, name: s.specialty.name },
    })),
    status: c.status,
    meetingReschedules: c.meetingReschedules.map((r) => ({
      id: r.id,
      oldDate: r.oldDate ? r.oldDate.toISOString() : null,
      newDate: r.newDate.toISOString(),
      reason: r.reason,
      createdAt: r.createdAt.toISOString(),
      createdBy: r.createdBy ? { fullName: r.createdBy.fullName } : null,
    })),
    reviewers: c.reviewers.map((rev) => ({
      id: rev.id,
      status: rev.status,
      user: rev.user ? { fullName: rev.user.fullName, employer: rev.user.employer } : null,
      doctor: rev.doctor ? { name: rev.doctor.name, employer: rev.doctor.employer } : null,
    })),
  }));

  return (
    <FollowUpDashboardClient
      cases={serializedCases}
      allSubCommittees={allSubCommittees.map((sc) => ({ id: sc.id, name: sc.name }))}
      specialtiesList={specialtiesList}
      subCommitteesWorkload={subCommitteesWorkload}
      currentUser={session?.user}
      initialTab="unassigned"
    />
  );
}
