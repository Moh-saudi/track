import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/formatters";
import { PageHeader, StatCard, Card, Badge } from "@/components/ui";
import {
  FileText,
  Clock,
  CheckCircle2,
  RotateCcw,
  Stethoscope,
  Eye,
  FileCheck,
  Calendar,
  User,
  Layers,
} from "lucide-react";
import {
  SpecialtiesDistributionChart,
  TurnaroundMetricCard,
  LiabilityDistributionChart,
  SpecialtyStat,
} from "@/components/analytics/AnalyticsCharts";

export default async function SubCommitteeReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const user = session.user as any;
  const userRole = user.role;
  const userSubCommitteeId = user.subCommitteeId;

  // التحقق من الصلاحيات
  if (userRole !== "SUBCOMMITTEE_MEMBER" && userRole !== "ADMIN") {
    redirect("/dashboard");
  }

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

  // استعلام السجلات الخاصة باللجنة
  const [cases, subCommittee] = await Promise.all([
    prisma.case.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        subCommittee: true,
        specialties: { include: { specialty: true } },
        actions: { orderBy: { createdAt: "desc" } },
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
  ]);

  const totalCases = cases.length;
  const inReview = cases.filter(
    (c) => c.status === "UNDER_SUBCOMMITTEE_REVIEW" || c.status === "REFERRED_FOR_REVIEW"
  ).length;
  const completed = cases.filter(
    (c) => c.status === "PENDING_SUPREME_REVIEW" || c.status === "APPROVED"
  ).length;
  const referredBack = cases.filter((c) => c.status === "REFERRED_FOR_REVIEW").length;
  const fullyApproved = cases.filter((c) => c.status === "APPROVED").length;

  // ─── احتساب متوسط زمن الرد بالأيام (Turnaround Time) ───
  let totalTurnaroundDays = 0;
  let casesWithTurnaroundCount = 0;

  cases.forEach((c) => {
    if (c.actions.length > 0) {
      const action = c.actions[0];
      const start = action.receivedDate || c.createdAt;
      const end = action.reportDate || action.createdAt;
      const diffDays = Math.max(
        1,
        Math.round(
          (new Date(end).getTime() - new Date(start).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      );
      totalTurnaroundDays += diffDays;
      casesWithTurnaroundCount++;
    }
  });

  const avgTurnaroundDays =
    casesWithTurnaroundCount > 0
      ? Math.round(totalTurnaroundDays / casesWithTurnaroundCount)
      : 0;

  // نسبة الالتزام بالمهلة المعيارية (30 يوماً كمعيار)
  const onTrackCount = cases.filter((c) => {
    if (c.actions.length === 0) return true;
    const action = c.actions[0];
    const start = action.receivedDate || c.createdAt;
    const end = action.reportDate || action.createdAt;
    const diffDays = Math.round(
      (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays <= 30;
  }).length;

  const onTrackPercentage =
    totalCases > 0 ? Math.round((onTrackCount / totalCases) * 100) : 100;

  // ─── تجميع إحصائيات التخصصات الطبية (Specialties Ranking) ───
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
    .map((item) => ({
      name: item.name,
      count: item.count,
      percentage:
        totalSpecialtyReferences > 0
          ? Math.round((item.count / totalSpecialtyReferences) * 100)
          : 0,
    }));

  // ─── احتساب مواقف المسؤولية والخطأ الطبي من التقارير ───
  let faultConfirmedCount = 0;
  let noFaultCount = 0;
  let insufficientDocsCount = 0;

  cases.forEach((c) => {
    if (c.actions.length > 0) {
      const desc = (c.actions[0].faultDescription || "").toLowerCase();
      if (desc.includes("انتفاء") || desc.includes("لا يوجد خطأ") || desc.includes("مضاعفة")) {
        noFaultCount++;
      } else if (desc.includes("استيفاء") || desc.includes("نقص") || desc.includes("يتعذر")) {
        insufficientDocsCount++;
      } else if (desc.includes("ثبوت") || desc.includes("خطأ") || desc.includes("مسؤولية")) {
        faultConfirmedCount++;
      } else {
        // الافتراضي وفق صياغة التقرير
        faultConfirmedCount++;
      }
    }
  });

  const reportsCompleted = cases.filter((c) => c.actions.length > 0);

  return (
    <div className="space-y-6 font-body">
      {/* ─── رأس الصفحة الموحد ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "اللجان الفرعية", href: "/dashboard/subcommittee" },
          { label: "إحصائيات وتقارير اللجنة" },
        ]}
        title={
          subCommittee
            ? `إحصائيات ومؤشرات أداء ${subCommittee.name}`
            : "إحصائيات وتقارير أداء اللجان الفرعية"
        }
        description="متابعة معدلات إنجاز القضايا، مؤشرات سرعة الرد، أعلى التخصصات الطبية وروداً، ونتائج تقارير المسؤولية الطبية."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/subcommittee"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
            >
              <Stethoscope className="w-4 h-4 text-teal-600" />
              <span>جدول السجلات والقضايا</span>
            </Link>
          </div>
        }
      />

      {/* ─── بطاقات المؤشرات الأساسية (KPIs) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي السجلات الواردة"
          value={totalCases}
          icon={<Layers className="w-6 h-6" />}
          variant="teal"
          description="كافة السجلات المسندة للجنة"
        />
        <StatCard
          title="قيد الفحص والمداولة"
          value={inReview}
          icon={<Clock className="w-6 h-6" />}
          variant="amber"
          description="بانتظار انعقاد الجلسة والتقرير"
          isZeroNeutral={true}
        />
        <StatCard
          title="تقارير منجزة ومرفوعة"
          value={completed}
          icon={<CheckCircle2 className="w-6 h-6" />}
          variant="emerald"
          description="مرفوعة لرئاسة اللجنة العليا"
        />
        <StatCard
          title="محالة لإعادة الدراسة"
          value={referredBack}
          icon={<RotateCcw className="w-6 h-6" />}
          variant="rose"
          description="بقرار إعادة من اللجنة العليا"
          isZeroNeutral={true}
        />
      </div>

      {/* ─── قسم التحليلات البصرية (الجرافات ومعدل الرد) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TurnaroundMetricCard
          avgTurnaroundDays={avgTurnaroundDays}
          totalCompletedCases={completed}
          onTrackPercentage={onTrackPercentage}
          title="معدل الرد وزمن إنجاز القضايا"
          description="متوسط المدة المستغرقة بين إحالة السجل للجنة وصدور التقرير الطبي الفني"
        />

        <LiabilityDistributionChart
          faultConfirmed={faultConfirmedCount}
          noFault={noFaultCount}
          insufficientDocs={insufficientDocsCount}
          total={reportsCompleted.length}
        />
      </div>

      {/* ─── جراف التخصصات الطبية للجنة ─── */}
      <SpecialtiesDistributionChart
        specialties={specialtiesList}
        title="توزيع قضايا اللجنة حسب التخصصات الطبية"
        subtitle="حصر التخصصات الأكثر وروداً وتحديد التخصص الأعلى طلباً لتعزيز استشاريي الفحص"
      />

      {/* ─── سجل التقارير الطبية الصادرة للجنة ─── */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900 font-heading">
              سجل التقارير الطبية الصادرة من اللجنة
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500 font-body">
            {reportsCompleted.length} تقرير صادر
          </span>
        </div>

        {reportsCompleted.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium font-body">
            لم يتم إصدار أي تقرير طبي فني حتى الآن
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 text-slate-600 font-heading font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">رقم السجل / السنة</th>
                  <th className="p-3.5 whitespace-nowrap">المشكو في حقه</th>
                  <th className="p-3.5 whitespace-nowrap">الشاكي / المريض</th>
                  <th className="p-3.5 whitespace-nowrap">تاريخ الجلسة</th>
                  <th className="p-3.5 whitespace-nowrap">تاريخ صدور التقرير</th>
                  <th className="p-3.5 whitespace-nowrap">الحالة الحالية</th>
                  <th className="p-3.5 text-center whitespace-nowrap">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-body">
                {reportsCompleted.map((c) => {
                  const report = c.actions[0];
                  const respondent = c.respondentName || c.hospitalName;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold font-mono text-slate-900">
                        {c.caseNumber} / {c.caseYear}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-900 max-w-[180px] truncate" title={respondent || ""}>
                        {respondent || "—"}
                      </td>
                      <td className="p-3.5 text-slate-700 max-w-[160px] truncate" title={c.complainantName || ""}>
                        {c.complainantName || "—"}
                      </td>
                      <td className="p-3.5 font-mono text-slate-700 whitespace-nowrap">
                        {c.meetingDate ? formatDate(c.meetingDate) : "—"}
                      </td>
                      <td className="p-3.5 font-mono text-teal-800 font-bold whitespace-nowrap">
                        {report?.reportDate ? formatDate(report.reportDate) : formatDate(report.createdAt)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {c.status === "APPROVED" ? (
                          <Badge variant="emerald" size="sm">معتمد نهائياً</Badge>
                        ) : c.status === "REFERRED_FOR_REVIEW" ? (
                          <Badge variant="rose" size="sm">محال لإعادة الدراسة</Badge>
                        ) : (
                          <Badge variant="sky" size="sm">بانتظار اللجنة العليا</Badge>
                        )}
                      </td>
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <Link
                          href={`/dashboard/subcommittee/${c.id}/report`}
                          className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>عرض التقرير</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
