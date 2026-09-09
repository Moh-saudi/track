import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { UserWelcomeCard } from "@/components/ui/UserWelcomeCard";
import { RiskModeClient } from "./risk-mode-client";
import {
  ShieldAlert,
  Clock,
  RotateCcw,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Scale,
} from "lucide-react";

export const revalidate = 0;

export default async function AdminRiskModePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session?.user || (role !== "ADMIN" && role !== "RISK_OFFICER")) {
    redirect("/dashboard");
  }

  // جلب كافة السجلات بالمنظومة لتمكين غرفة إدارة المخاطر من المتابعة والتدخل الشامل
  const cases = await prisma.case.findMany({
    orderBy: [{ isRiskOverridden: "desc" }, { updatedAt: "desc" }],
    include: {
      subCommittee: { select: { id: true, name: true } },
      actions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          receivedDate: true,
          meetingDate: true,
          reportDate: true,
        },
      },
      supremeDecisions: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          decisionType: true,
          meetingDate: true,
          decisionDetails: true,
        },
      },
    },
  });

  const now = new Date().getTime();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  // إحصائيات المخاطر الذكية
  const totalCasesCount = cases.length;
  const overriddenCount = cases.filter((c) => c.isRiskOverridden).length;
  const approvedCount = cases.filter((c) => c.status === "APPROVED").length;

  // القضايا المتأخرة: محالة من أكثر من 30 يوماً دون اعتماد أو محالة لإعادة الدراسة
  const overdueCount = cases.filter((c) => {
    if (c.status === "APPROVED" || c.status === "CLOSED") return false;
    if (c.status === "REFERRED_FOR_REVIEW") return true;
    if (c.assignedAt && now - new Date(c.assignedAt).getTime() > thirtyDaysMs) return true;
    return false;
  }).length;

  // القضايا المعادة للدراسة أو بقرارات مغايرة
  const referredBackCount = cases.filter(
    (c) =>
      c.status === "REFERRED_FOR_REVIEW" ||
      c.supremeDecisions[0]?.decisionType === "REFER_BACK" ||
      c.supremeDecisions[0]?.decisionType === "DIFFERENT"
  ).length;

  const serializedCases = cases.map((c) => ({
    ...c,
    assignedAt: c.assignedAt ? c.assignedAt.toISOString() : null,
    incomingDate: c.incomingDate ? c.incomingDate.toISOString() : null,
    riskOverriddenAt: c.riskOverriddenAt ? c.riskOverriddenAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    supremeDecisions: c.supremeDecisions.map((d) => ({
      ...d,
      meetingDate: d.meetingDate ? d.meetingDate.toISOString() : d.meetingDate,
    })),
    actions: c.actions.map((a) => ({
      ...a,
      receivedDate: a.receivedDate ? a.receivedDate.toISOString() : null,
      meetingDate: a.meetingDate ? a.meetingDate.toISOString() : null,
      reportDate: a.reportDate ? a.reportDate.toISOString() : null,
    })),
  }));

  return (
    <div className="space-y-5">
      {/* ─── كارت الحساب الصغير الهادئ ─── */}
      <UserWelcomeCard user={session?.user} />

      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "الإدارة والنظام", href: "/dashboard/admin" },
          { label: "وضع إدارة المخاطر وتصحيح المسار" },
        ]}
        title="غرفة عمليات إدارة المخاطر وتصحيح المسار الإجرائي"
        description="مؤشرات الخطر والتعثر الزمني وإمكانية التدخل الاستثنائي لإعادة فتح السجلات واستدراك القرارات المعيبة بموجب سند إداري موثق."
      />

      {/* بطاقات مؤشرات المخاطر المتقدمة */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي القضايا تحت الرقابة"
          value={totalCasesCount}
          icon={<Scale className="w-6 h-6" />}
          variant="teal"
          description="كافة السجلات المسجلة بالمنظومة"
        />

        <StatCard
          title="قضايا متأخرة (خطر التعثر)"
          value={overdueCount}
          icon={<AlertTriangle className="w-6 h-6" />}
          variant={overdueCount > 0 ? "rose" : "slate"}
          description="تجاوزت الإطار الزمني أو محالة للمراجعة"
        />

        <StatCard
          title="قضايا تم تصحيح مسارها"
          value={overriddenCount}
          icon={<RotateCcw className="w-6 h-6" />}
          variant={overriddenCount > 0 ? "amber" : "slate"}
          description="خضعت لاستدراك وتصحيح مسار إداري"
        />

        <StatCard
          title="خلافات فنية وإعادة دراسة"
          value={referredBackCount}
          icon={<ShieldAlert className="w-6 h-6" />}
          variant={referredBackCount > 0 ? "purple" : "slate"}
          description="قرارات مغايرة أو إحالات لإعادة الفحص"
        />
      </div>

      <RiskModeClient cases={serializedCases as any} />
    </div>
  );
}
