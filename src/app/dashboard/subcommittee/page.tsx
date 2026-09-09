import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubCommitteeDashboardClient } from "./subcommittee-dashboard-client";

export const revalidate = 0;

export default async function SubCommitteeDashboard({
  searchParams,
}: {
  searchParams?: { tab?: string };
}) {
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

  const [cases, subCommittee, doctorsCount, payments] = await Promise.all([
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
    prisma.payment.findMany({
      where: userSubCommitteeId ? { case: { subCommitteeId: userSubCommitteeId } } : {},
      select: { amount: true, status: true },
    }),
  ]);

  // حساب إحصائيات البدلات
  let paidCount = 0;
  let pendingCount = 0;
  let totalAmount = 0;
  let paidAmount = 0;

  payments.forEach((p) => {
    const amt = Number(p.amount) || 0;
    totalAmount += amt;
    if (p.status === "PAID") {
      paidCount++;
      paidAmount += amt;
    } else {
      pendingCount++;
    }
  });

  const serializedCases = cases.map((c) => ({
    id: c.id,
    caseNumber: c.caseNumber,
    caseYear: c.caseYear,
    registrationType: c.registrationType,
    complainantName: c.complainantName,
    respondentName: c.respondentName,
    hospitalName: c.hospitalName,
    prosecution: c.prosecution,
    assignedAt: c.assignedAt ? c.assignedAt.toISOString() : null,
    expectedDueDate: c.expectedDueDate ? c.expectedDueDate.toISOString() : null,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    specialties: c.specialties.map((s) => ({
      id: s.id,
      specialty: { id: s.specialty.id, name: s.specialty.name },
    })),
    actions: c.actions.map((a) => ({
      id: a.id,
      receivedDate: a.receivedDate ? a.receivedDate.toISOString() : null,
      meetingDate: a.meetingDate ? a.meetingDate.toISOString() : null,
      reportDate: a.reportDate ? a.reportDate.toISOString() : null,
      faultDescription: a.faultDescription,
    })),
    reviewers: c.reviewers.map((r) => ({
      id: r.id,
      doctor: r.doctor ? { name: r.doctor.name } : null,
      user: r.user ? { fullName: r.user.fullName } : null,
    })),
  }));

  return (
    <SubCommitteeDashboardClient
      cases={serializedCases as any}
      subCommittee={subCommittee}
      doctorsCount={doctorsCount}
      paymentsStats={{
        totalCount: payments.length,
        paidCount,
        pendingCount,
        totalAmount,
        paidAmount,
      }}
      currentUser={{
        name: session.user.name,
        fullName: user.fullName,
        role: user.role,
        employer: user.employer,
        subCommitteeName: subCommittee?.name,
      }}
      initialTab={searchParams?.tab === "cases" ? "cases" : "overview"}
    />
  );
}
