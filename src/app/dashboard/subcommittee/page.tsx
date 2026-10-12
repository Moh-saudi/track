import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubCommitteeDashboardClient } from "./subcommittee-dashboard-client";

export const revalidate = 0;

export default async function SubCommitteeDashboard({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }> ;
}) {
  const resolvedSearchParams = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  const userRole = user.role;
  const userSubCommitteeId = user.subCommitteeId;

  const whereClause: any = {};
  if (userRole !== "ADMIN") {
    if (!userSubCommitteeId) {
      return (
        <div className="p-8 text-center text-slate-500 font-body">
          حسابك غير مرتبط بأي لجنة فرعية حالياً. يرجى مراجعة إدارة النظام.
        </div>
      );
    }
    whereClause.subCommitteeId = userSubCommitteeId;
  }

  function safeIsoDate(d: any): string | null {
    if (!d) return null;
    const date = new Date(d);
    return isNaN(date.getTime()) ? null : date.toISOString();
  }

  let cases: any[] = [];
  let subCommittee: any = null;
  let doctorsCount = 0;

  try {
    const [fetchedCases, fetchedSubCommittee, fetchedDoctorsCount] = await Promise.all([
      prisma.case.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        include: {
          subCommittee: true,
          specialties: { include: { specialty: true } },
          actions: {
            orderBy: { createdAt: "desc" },
          },
          reviewers: {
            include: {
              doctor: { select: { name: true } },
              user: { select: { fullName: true } },
            },
          },
        },
      }),
      userSubCommitteeId
        ? prisma.subCommittee.findUnique({ where: { id: userSubCommitteeId } })
        : null,
      prisma.subCommitteeDoctor.count({
        where: userSubCommitteeId ? { subCommitteeId: userSubCommitteeId } : {},
      }),
    ]);
    cases = fetchedCases || [];
    subCommittee = fetchedSubCommittee;
    doctorsCount = fetchedDoctorsCount || 0;
  } catch (dbErr) {
    console.error("SubCommitteeDashboard DB fetch error:", dbErr);
  }

  const serializedCases = (cases || []).map((c) => ({
    id: c.id,
    caseNumber: c.caseNumber || "—",
    caseYear: c.caseYear || new Date().getFullYear(),
    registrationType: c.registrationType || "COMPLAINT",
    complainantName: c.complainantName || null,
    respondentName: c.respondentName || null,
    hospitalName: c.hospitalName || null,
    prosecution: c.prosecution || null,
    assignedAt: safeIsoDate(c.assignedAt),
    expectedDueDate: safeIsoDate(c.expectedDueDate),
    status: c.status || "UNDER_SUBCOMMITTEE_REVIEW",
    createdAt: safeIsoDate(c.createdAt) || new Date().toISOString(),
    specialties: Array.isArray(c.specialties)
      ? c.specialties.map((s: any) => ({
          id: s.id,
          specialty: { id: s.specialty?.id || s.id, name: s.specialty?.name || "تخصص غير محدد" },
        }))
      : [],
    actions: Array.isArray(c.actions)
      ? c.actions.map((a: any) => ({
          id: a.id,
          receivedDate: safeIsoDate(a.receivedDate),
          meetingDate: safeIsoDate(a.meetingDate),
          reportDate: safeIsoDate(a.reportDate),
          faultDescription: a.faultDescription,
        }))
      : [],
    reviewers: Array.isArray(c.reviewers)
      ? c.reviewers.map((r: any) => ({
          id: r.id,
          doctor: r.doctor ? { name: r.doctor.name } : null,
          user: r.user ? { fullName: r.user.fullName } : null,
        }))
      : [],
  }));

  return (
    <SubCommitteeDashboardClient
      cases={serializedCases as any}
      subCommittee={subCommittee}
      doctorsCount={doctorsCount}
      currentUser={{
        name: session.user.name,
        fullName: user.fullName,
        role: user.role,
        employer: user.employer,
        subCommitteeName: subCommittee?.name,
      }}
      initialTab={resolvedSearchParams?.tab === "cases" ? "cases" : "overview"}
    />
  );
}
