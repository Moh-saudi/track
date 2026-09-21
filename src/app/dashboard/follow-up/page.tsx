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
} from "./follow-up-dashboard-client";

import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function FollowUpDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  let cases: any[] = [];
  let allSubCommittees: any[] = [];
  try {
    const res = await Promise.all([
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
    cases = res[0] || [];
    allSubCommittees = res[1] || [];
  } catch (err) {
    console.error("Error fetching follow-up cases:", err);
  }

  const now = new Date();

  // ─── إحصائيات التخصصات الطبية الأكثر طلباً على مستوى الجمهورية ───
  const specialtyCounts: Record<string, { name: string; count: number }> = {};
  cases.forEach((c: any) => {
    (c.specialties || []).forEach((s: any) => {
      const specName = s.specialty?.name;
      if (!specName) return;
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

  // ─── حساب أعباء عمل اللجان الـ 16 ومعدلات الرد ───
  const subCommitteesWorkload: SubCommitteeWorkloadItem[] = allSubCommittees.map((sc) => {
    const scCases = cases.filter((c) => c.subCommitteeId === sc.id);
    const inReview = scCases.filter(
      (c) => c.status === "UNDER_SUBCOMMITTEE_REVIEW" || c.status === "REFERRED_FOR_REVIEW"
    );
    const completed = scCases.filter(
      (c) => c.status === "PENDING_SUPREME_REVIEW" || c.status === "APPROVED"
    );
    const referred = scCases.filter((c) => c.status === "REFERRED_FOR_REVIEW");

    const overdue = inReview.filter((c) => {
      if (!c.expectedDueDate) return false;
      return new Date(c.expectedDueDate).getTime() < now.getTime();
    });

    let scTurnaroundDays = 0;
    let completedCount = 0;
    scCases.forEach((c) => {
      if (c.actions.length > 0) {
        const action = c.actions[0];
        const start = action.receivedDate || c.createdAt;
        const end = action.reportDate || action.createdAt;
        const diff = Math.max(
          1,
          Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))
        );
        scTurnaroundDays += diff;
        completedCount++;
      }
    });

    return {
      id: sc.id,
      name: sc.name,
      totalCases: scCases.length,
      inReviewCases: inReview.length,
      completedCases: completed.length,
      referredCases: referred.length,
      overdueCases: overdue.length,
      avgTurnaroundDays: completedCount > 0 ? Math.round(scTurnaroundDays / completedCount) : 0,
    };
  });

  const serializedCases: SerializedFollowUpCase[] = cases.map((c) => ({
    id: c.id,
    caseNumber: c.caseNumber,
    caseYear: c.caseYear,
    registrationType: c.registrationType || "COMPLAINT",
    respondentName: c.respondentName,
    respondentPhone: c.respondentPhone,
    respondents: Array.isArray(c.respondents) && c.respondents.length > 0
      ? (c.respondents as any)
      : c.respondentName
      ? [{ name: c.respondentName, phone: c.respondentPhone }]
      : [],
    hospitalName: c.hospitalName,
    complainantName: c.complainantName,
    complainantPhone: c.complainantPhone,
    complainants: Array.isArray(c.complainants) && c.complainants.length > 0
      ? (c.complainants as any)
      : c.complainantName
      ? [{ name: c.complainantName, phone: c.complainantPhone }]
      : [],
    prosecution: c.prosecution,
    partialProsecution: c.partialProsecution,
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
    specialties: (c.specialties || []).map((s: any) => ({
      id: s.id,
      specialty: { id: s.specialty?.id || s.id, name: s.specialty?.name || "تخصص غير محدد" },
    })),
    status: c.status,
    meetingReschedules: (c.meetingReschedules || []).map((r: any) => ({
      id: r.id,
      oldDate: r.oldDate ? new Date(r.oldDate).toISOString() : null,
      newDate: r.newDate ? new Date(r.newDate).toISOString() : new Date().toISOString(),
      reason: r.reason,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      createdBy: r.createdBy ? { fullName: r.createdBy.fullName } : null,
    })),
    reviewers: (c.reviewers || []).map((rev: any) => ({
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
      initialTab="overview"
    />
  );
}
