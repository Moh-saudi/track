import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import {
  SpecialtyStat,
  ProsecutionStat,
} from "@/components/analytics/AnalyticsCharts";
import {
  UnifiedReportsClient,
  UnifiedCase,
  DoctorStat,
  CommitteeCompletionStat,
  CommitteeSpecialtyStat,
} from "./unified-reports-client";

export const revalidate = 0;

export const metadata = {
  title: "لوحة القيادة والتقارير الموحدة | اللجنة العليا للمسؤولية الطبية",
  description: "المرصد التحليلي الشامل لكافة مراحل القضايا والشكاوى والمحاضر من القيد حتى صدور القرار النهائي",
};

export default async function UnifiedReportsPage() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  if (!session?.user || !can(userRole, "VIEW_UNIFIED_REPORTS")) {
    redirect("/dashboard");
  }

  let cases: any[] = [];
  let subCommittees: any[] = [];
  let prosecutions: any[] = [];
  let specialties: any[] = [];
  let rawDoctors: any[] = [];

  try {
    const res = await Promise.all([
      prisma.case.findMany({
        orderBy: { createdAt: "desc" },
        take: 3000,
        include: {
          subCommittee: { select: { id: true, name: true } },
          specialties: { select: { id: true, specialty: { select: { id: true, name: true } } } },
          prosecutionRel: { select: { id: true, name: true } },
          partialProsecutionRel: { select: { id: true, name: true } },
          actions: {
            select: {
              reportDate: true,
              receivedDate: true,
              actionTaken: true,
              createdAt: true,
            },
          },
          supremeDecisions: {
            take: 1,
            orderBy: { createdAt: "desc" },
            select: { decisionType: true, createdAt: true },
          },
        },
      }),
      prisma.subCommittee.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.prosecution.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.specialty.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      prisma.subCommitteeDoctor.findMany({
        select: {
          id: true,
          name: true,
          active: true,
          subCommitteeId: true,
          subCommittee: { select: { id: true, name: true } },
          specialtyId: true,
          specialty: { select: { id: true, name: true } },
          _count: { select: { reviewAssignments: true } },
        },
      }),
    ]);

    cases = res[0] || [];
    subCommittees = res[1] || [];
    prosecutions = res[2] || [];
    specialties = res[3] || [];
    rawDoctors = res[4] || [];
  } catch (err) {
    console.error("Error fetching unified reports data:", err);
  }

  // ─── إحصائيات التخصصات الطبية الأكثر طلباً ───
  const specialtyCounts: Record<string, { id: string; name: string; count: number }> = {};
  cases.forEach((c) => {
    (c.specialties || []).forEach((s: any) => {
      const specName = s.specialty?.name;
      const specId = s.specialty?.id || s.specialtyId;
      if (!specName) return;
      if (!specialtyCounts[specName]) {
        specialtyCounts[specName] = { id: specId, name: specName, count: 0 };
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
      id: item.id,
      name: item.name,
      count: item.count,
      percentage:
        totalSpecialtyReferences > 0
          ? Math.round((item.count / totalSpecialtyReferences) * 100)
          : 0,
    }));

  // ─── إحصائيات جهات النيابة العامة ───
  const prosCounts: Record<string, { name: string; count: number }> = {};
  cases.forEach((c) => {
    const pName =
      c.prosecutionRel?.name ||
      c.prosecution ||
      c.partialProsecutionRel?.name ||
      (c.partialProsecution ? `نيابة ${c.partialProsecution}` : null);
    if (!pName) return;
    if (!prosCounts[pName]) {
      prosCounts[pName] = { name: pName, count: 0 };
    }
    prosCounts[pName].count++;
  });

  const totalProsCases = Object.values(prosCounts).reduce((sum, cur) => sum + cur.count, 0);

  const prosecutionsList: ProsecutionStat[] = Object.values(prosCounts)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
    .map((item) => ({
      name: item.name,
      count: item.count,
      percentage: totalProsCases > 0 ? Math.round((item.count / totalProsCases) * 100) : 0,
    }));

  // ─── تجهيز بيانات القضايا مع مدد الاستجابة والقرارات ───
  const unifiedCases: UnifiedCase[] = cases.map((c) => {
    let turnaroundDays = 0;
    if (c.assignedAt) {
      const start = new Date(c.assignedAt).getTime();
      const reportAction = (c.actions || []).find(
        (a: any) => a.reportDate || a.actionTaken
      );
      if (reportAction) {
        const end = new Date(reportAction.reportDate || reportAction.createdAt).getTime();
        turnaroundDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      } else if (c.status === "APPROVED" || c.status === "CLOSED" || c.status === "PENDING_SUPREME_REVIEW") {
        const end = new Date(c.updatedAt || c.createdAt).getTime();
        turnaroundDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      }
    }

    // استخلاص نوع القرار النهائي إن وجد
    let finalDecisionType: "FAULT_CONFIRMED" | "NO_FAULT" | "INSUFFICIENT_DOCS" | null = null;
    const latestDecision = c.supremeDecisions?.[0]?.decisionType;
    if (latestDecision) {
      if (latestDecision.includes("FAULT_CONFIRMED") || latestDecision === "PROVE_ERROR") {
        finalDecisionType = "FAULT_CONFIRMED";
      } else if (latestDecision.includes("NO_FAULT") || latestDecision === "NO_ERROR") {
        finalDecisionType = "NO_FAULT";
      } else if (latestDecision.includes("INSUFFICIENT") || latestDecision.includes("DOCUMENTS")) {
        finalDecisionType = "INSUFFICIENT_DOCS";
      }
    }

    const resolvedProsName =
      c.prosecutionRel?.name ||
      c.prosecution ||
      (c.partialProsecution ? `نيابة ${c.partialProsecution}` : null) ||
      null;

    const resolvedPartialProsName =
      c.partialProsecutionRel?.name ||
      c.partialProsecution ||
      null;

    return {
      id: c.id,
      caseNumber: c.caseNumber,
      caseYear: c.caseYear,
      incomingDate: c.incomingDate ? new Date(c.incomingDate).toISOString() : null,
      prosecutionCaseNumber: c.prosecutionCaseNumber || null,
      reportYear: c.reportYear || null,
      registrationType: c.registrationType || "COMPLAINT",
      status: c.status,
      entityType: c.entityType || null,
      entityName: c.entityName || c.hospitalName || null,
      hospitalName: c.entityName || c.hospitalName || null,
      complainantName: c.complainantName || null,
      respondentName: c.respondentName || null,
      prosecution: resolvedProsName,
      partialProsecution: resolvedPartialProsName,
      subCommitteeId: c.subCommitteeId || null,
      subCommittee: c.subCommittee ? { id: c.subCommittee.id, name: c.subCommittee.name } : null,
      specialties: (c.specialties || []).map((s: any) => ({
        id: s.specialty?.id || s.id,
        name: s.specialty?.name || "غير محدد",
      })),
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
      assignedAt: c.assignedAt ? new Date(c.assignedAt).toISOString() : null,
      expectedDueDate: c.expectedDueDate ? new Date(c.expectedDueDate).toISOString() : null,
      turnaroundDays,
      finalDecisionType,
    };
  });

  // ─── إحصائيات الأطباء: الأكثر مشاركة في اللجان ───
  const topDoctors: DoctorStat[] = rawDoctors
    .map((d: any) => ({
      id: d.id,
      name: d.name,
      active: d.active,
      subCommitteeName: d.subCommittee?.name || "—",
      specialtyName: d.specialty?.name || "—",
      assignmentCount: d._count?.reviewAssignments ?? 0,
    }))
    .sort((a: DoctorStat, b: DoctorStat) => b.assignmentCount - a.assignmentCount)
    .slice(0, 10);

  // ─── أكثر اللجان إنجازاً (APPROVED + CLOSED) ───
  const committeeCompletionMap: Record<string, { id: string; name: string; completed: number; total: number }> = {};
  cases.forEach((c: any) => {
    const id = c.subCommittee?.id;
    const name = c.subCommittee?.name;
    if (!id || !name) return;
    if (!committeeCompletionMap[id]) committeeCompletionMap[id] = { id, name, completed: 0, total: 0 };
    committeeCompletionMap[id].total++;
    if (c.status === "APPROVED" || c.status === "CLOSED") committeeCompletionMap[id].completed++;
  });
  const topCompletedCommittees: CommitteeCompletionStat[] = Object.values(committeeCompletionMap)
    .filter((c) => c.total > 0)
    .sort((a, b) => b.completed - a.completed)
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      name: c.name,
      completed: c.completed,
      total: c.total,
      completionRate: Math.round((c.completed / c.total) * 100),
    }));

  // ─── التخصصات الأعلى في كل لجنة فرعية ───
  const committeeSpecialtyMap: Record<string, Record<string, { name: string; count: number }>> = {};
  cases.forEach((c: any) => {
    const commId = c.subCommittee?.id;
    const commName = c.subCommittee?.name;
    if (!commId || !commName) return;
    if (!committeeSpecialtyMap[commId]) committeeSpecialtyMap[commId] = {};
    (c.specialties || []).forEach((s: any) => {
      const specName = s.specialty?.name;
      if (!specName) return;
      if (!committeeSpecialtyMap[commId][specName]) committeeSpecialtyMap[commId][specName] = { name: specName, count: 0 };
      committeeSpecialtyMap[commId][specName].count++;
    });
  });

  const committeeTopSpecialties: CommitteeSpecialtyStat[] = Object.entries(committeeSpecialtyMap)
    .map(([commId, specMap]) => {
      const commName = cases.find((c: any) => c.subCommittee?.id === commId)?.subCommittee?.name || commId;
      const topSpecs = Object.values(specMap)
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);
      const total = Object.values(specMap).reduce((s, v) => s + v.count, 0);
      return { commId, commName, topSpecs, total };
    })
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 9);

  return (
    <UnifiedReportsClient
      initialCases={unifiedCases}
      subCommitteesList={subCommittees}
      specialtiesList={specialtiesList}
      prosecutionsList={prosecutionsList}
      topDoctors={topDoctors}
      topCompletedCommittees={topCompletedCommittees}
      committeeTopSpecialties={committeeTopSpecialties}
      userRole={userRole}
    />
  );
}
