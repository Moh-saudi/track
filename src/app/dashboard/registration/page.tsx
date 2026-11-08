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

  let cases: any[] = [];
  try {
    if (currentUserId) {
      cases = await prisma.case.findMany({
        where: { createdById: currentUserId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          caseNumber: true,
          caseYear: true,
          registrationType: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          incomingDate: true,
          prosecution: true,
          prosecutionCaseNumber: true,
          complainantName: true,
          respondentName: true,
          entityName: true,
          hospitalName: true,
          createdById: true,
          subCommittee: { select: { id: true, name: true } },
          specialties: { select: { specialty: { select: { id: true, name: true } } } },
          createdBy: { select: { id: true, fullName: true } },
        },
        take: 100,
      });
    }
  } catch {
    cases = [];
  }

  let subCommittees: any[] = [];
  try {
    subCommittees = await prisma.subCommittee.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch {
    subCommittees = [];
  }

  const totalSystemCasesCount = cases.length;
  const todaySystemCount = cases.filter((c: any) => c.createdAt && new Date(c.createdAt) >= todayStart).length;

  // حساب إحصائيات الموظف محلياً في الذاكرة (0ms وبدون ضرب قاعدة البيانات 6 مرات)
  const myTotalCasesCount = (cases || []).length;
  let myTodayCount = 0;
  let myPendingRoutingCount = 0;
  let myComplaintsCount = 0;
  let myProsecutionCasesCount = 0;
  let myReportsCount = 0;

  for (const c of cases || []) {
    if (c.createdAt && new Date(c.createdAt) >= todayStart) {
      myTodayCount++;
    }
    if (c.status === "REGISTERED") {
      myPendingRoutingCount++;
    }
    if (c.registrationType === "COMPLAINT") {
      myComplaintsCount++;
    } else if (c.registrationType === "CASE") {
      myProsecutionCasesCount++;
    } else if (c.registrationType === "REPORT") {
      myReportsCount++;
    }
  }

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
      complainants: Array.isArray(c.complainants) && c.complainants.length > 0
        ? (c.complainants as any)
        : c.complainantName
        ? [{ name: c.complainantName, phone: c.complainantPhone }]
        : [],
      prosecution: c.prosecution || null,
      respondentName: c.respondentName || null,
      entityType: c.entityType || null,
      entityName: c.entityName || c.hospitalName || null,
      hospitalName: c.entityName || c.hospitalName || null,
      respondents: Array.isArray(c.respondents) && c.respondents.length > 0
        ? (c.respondents as any)
        : c.respondentName
        ? [{ name: c.respondentName, phone: c.respondentPhone }]
        : [],
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
