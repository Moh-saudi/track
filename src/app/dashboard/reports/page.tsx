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

  try {
    const res = await Promise.all([
      prisma.case.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          subCommittee: { select: { id: true, name: true } },
          specialties: { include: { specialty: true } },
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
    ]);

    cases = res[0] || [];
    subCommittees = res[1] || [];
    prosecutions = res[2] || [];
    specialties = res[3] || [];
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

  return (
    <UnifiedReportsClient
      initialCases={unifiedCases}
      subCommitteesList={subCommittees}
      specialtiesList={specialtiesList}
      prosecutionsList={prosecutionsList}
      userRole={userRole}
    />
  );
}
