import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/formatters";
import {
  Clock,
  RotateCcw,
  Scale,
  ShieldCheck,
  Stethoscope,
  Building2,
  FileCheck,
  ArrowRight,
  Inbox,
  CheckCircle2,
  Layers,
  Calendar,
} from "lucide-react";
import { PageHeader, StatCard, Card, Badge, UserWelcomeCard } from "@/components/ui";
import {
  SpecialtiesDistributionChart,
  SubCommitteesWorkloadTable,
  SubCommitteeWorkloadItem,
  SpecialtyStat,
  ProsecutionsDistributionChart,
  ProsecutionStat,
  CaseTypesBreakdownWidget,
  TurnaroundMetricCard,
  LiabilityDistributionChart,
} from "@/components/analytics/AnalyticsCharts";
import { SupremeDateFilter } from "./date-filter";

export const revalidate = 0;

interface SupremeDashboardProps {
  searchParams?: {
    startDate?: string;
    endDate?: string;
  };
}

export default async function SupremeDashboard({ searchParams }: SupremeDashboardProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const userRole = (session.user as any).role;
  if (userRole !== "SUPREME_COMMITTEE" && userRole !== "ADMIN") {
    redirect("/dashboard");
  }

  // ─── بناء شروط الفلترة بالنطاق الزمني ───
  const whereClause: any = {
    status: {
      in: ["PENDING_SUPREME_REVIEW", "APPROVED", "REFERRED_FOR_REVIEW"],
    },
  };

  if (searchParams?.startDate || searchParams?.endDate) {
    whereClause.createdAt = {};
    if (searchParams.startDate) {
      const start = new Date(searchParams.startDate);
      start.setHours(0, 0, 0, 0);
      whereClause.createdAt.gte = start;
    }
    if (searchParams.endDate) {
      const end = new Date(searchParams.endDate);
      end.setHours(23, 59, 59, 999);
      whereClause.createdAt.lte = end;
    }
  }

  // ─── جلب البيانات من قاعدة البيانات ───
  const [cases, allSubCommittees, allProsecutions] = await Promise.all([
    prisma.case.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
      include: {
        subCommittee: true,
        prosecutionRel: { select: { id: true, name: true } },
        specialties: { include: { specialty: true } },
        actions: {
          orderBy: { createdAt: "desc" },
          select: { reportDate: true, receivedDate: true, createdAt: true, faultDescription: true },
        },
        supremeDecisions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.subCommittee.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    }),
    prisma.prosecution.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const totalCases = cases.length;
  const pendingCount = cases.filter((c) => c.status === "PENDING_SUPREME_REVIEW").length;
  const approvedCount = cases.filter((c) => c.status === "APPROVED").length;
  const referredCount = cases.filter((c) => c.status === "REFERRED_FOR_REVIEW").length;

  // ─── عداد الأنواع القانونية ───
  const complaintsCount = cases.filter((c) => c.registrationType === "COMPLAINT").length;
  const lawsuitsCount = cases.filter((c) => c.registrationType === "CASE").length;
  const policeReportsCount = cases.filter((c) => c.registrationType === "REPORT").length;

  // ─── إحصائيات جهات النيابة العامة ───
  const prosecutionCounts: Record<string, { name: string; count: number }> = {};
  cases.forEach((c) => {
    const procName = c.prosecutionRel?.name || c.prosecution || "غير محدد";
    if (!prosecutionCounts[procName]) {
      prosecutionCounts[procName] = { name: procName, count: 0 };
    }
    prosecutionCounts[procName].count++;
  });

  const totalProsecutionRefs = Object.values(prosecutionCounts).reduce(
    (sum, cur) => sum + cur.count,
    0
  );

  const prosecutionsList: ProsecutionStat[] = Object.values(prosecutionCounts)
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      name: item.name,
      count: item.count,
      percentage:
        totalProsecutionRefs > 0
          ? Math.round((item.count / totalProsecutionRefs) * 100)
          : 0,
    }));

  // ─── إحصائيات التخصصات الطبية المعروضة أمام اللجنة العليا ───
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

  // ─── مؤشرات عمل وتقارير اللجان الفرعية الـ 16 ───
  const subCommitteesWorkload: SubCommitteeWorkloadItem[] = allSubCommittees.map((sc) => {
    const scCases = cases.filter((c) => c.subCommitteeId === sc.id);
    const pendingReview = scCases.filter((c) => c.status === "PENDING_SUPREME_REVIEW");
    const completed = scCases.filter((c) => c.status === "APPROVED");
    const ref = scCases.filter((c) => c.status === "REFERRED_FOR_REVIEW");

    let scTurnaroundDays = 0;
    let completedCount = 0;
    scCases.forEach((c) => {
      if (c.actions && c.actions.length > 0) {
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
      inReviewCases: pendingReview.length,
      completedCases: completed.length,
      referredCases: ref.length,
      overdueCases: 0,
      avgTurnaroundDays: completedCount > 0 ? Math.round(scTurnaroundDays / completedCount) : 0,
    };
  });

  // ─── متوسط زمن الفصل ونسب المسؤولية ───
  let totalTurnaroundDays = 0;
  let casesWithActionCount = 0;
  let faultConfirmedCount = 0;
  let noFaultCount = 0;
  let insufficientDocsCount = 0;

  cases.forEach((c) => {
    if (c.actions.length > 0) {
      const action = c.actions[0];
      const start = action.receivedDate || c.createdAt;
      const end = action.reportDate || action.createdAt;
      const diff = Math.max(
        1,
        Math.round((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24))
      );
      totalTurnaroundDays += diff;
      casesWithActionCount++;

      const desc = (action.faultDescription || "").toLowerCase();
      if (desc.includes("انتفاء") || desc.includes("لا يوجد خطأ") || desc.includes("مضاعفة")) {
        noFaultCount++;
      } else if (desc.includes("استيفاء") || desc.includes("نقص") || desc.includes("يتعذر")) {
        insufficientDocsCount++;
      } else {
        faultConfirmedCount++;
      }
    }
  });

  const avgTurnaroundDays =
    casesWithActionCount > 0 ? Math.round(totalTurnaroundDays / casesWithActionCount) : 0;

  return (
    <div className="space-y-5 font-body">
      {/* ─── كارت الحساب الصغير الهادئ ─── */}
      <UserWelcomeCard user={session?.user} />

      {/* ─── شريط التبويب الأنيق والهادئ ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/dashboard/supreme"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs sm:text-sm font-semibold bg-teal-600 text-white shadow-xs font-heading"
          >
            <Layers className="w-4 h-4" />
            <span>لوحة قيادة ومؤشرات الدائرة العليا</span>
          </Link>

          <Link
            href="/dashboard/supreme/cases"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs sm:text-sm font-semibold bg-white text-slate-600 hover:text-slate-900 border border-slate-200 transition-all font-heading"
          >
            <FileCheck className="w-4 h-4" />
            <span>مداولة السجلات واتخاذ القرارات</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-mono font-bold">
                {pendingCount}
              </span>
            )}
          </Link>

          <Link
            href="/dashboard/supreme/schedule"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs sm:text-sm font-semibold bg-white text-slate-600 hover:text-slate-900 border border-slate-200 transition-all font-heading"
          >
            <Calendar className="w-4 h-4" />
            <span>أجندة وخطة الانعقاد</span>
          </Link>
        </div>
      </div>

      {/* ─── رأس الصفحة الموحد ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "اللجنة العليا" },
          { label: "لوحة المؤشرات والتحليلات السيادية" },
        ]}
        title="مرصد المؤشرات والتحليلات السيادية — اللجنة العليا"
        description="لوحة البيانات والتحليلات الشاملة لقرارات الدائرة العليا، إحصائيات جهات النيابة، أنواع القضايا، ومؤشرات أداء اللجان الفرعية."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/supreme/cases"
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-xs font-heading"
            >
              <FileCheck className="w-4 h-4" />
              <span>مراجعة السجلات واتخاذ القرارات</span>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-mono text-[11px] font-bold">
                  {pendingCount}
                </span>
              )}
            </Link>
          </div>
        }
      />

      {/* ─── شريط البحث بالنطاق الزمني ─── */}
      <SupremeDateFilter />

      {/* ─── بطاقات المؤشرات العامة (KPIs) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي السجلات المنظورة"
          value={totalCases}
          icon={<Layers className="w-6 h-6" />}
          variant="teal"
          description="تقارير واردة من اللجان الفرعية"
        />
        <StatCard
          title="بانتظار قرار الدائرة العليا"
          value={pendingCount}
          icon={<Clock className="w-6 h-6" />}
          variant="sky"
          description="ملفات جاهزة للمداولة والقرار"
          isZeroNeutral={true}
        />
        <StatCard
          title="قرارات نهائية معتمدة"
          value={approvedCount}
          icon={<Scale className="w-6 h-6" />}
          variant="emerald"
          description="حُسمت بقرار اعتماد نهائي"
        />
        <StatCard
          title="محالة لإعادة الدراسة"
          value={referredCount}
          icon={<RotateCcw className="w-6 h-6" />}
          variant="rose"
          description="أعيدت للجان فرعية أخرى"
          isZeroNeutral={true}
        />
      </div>

      {/* ─── عداد وتوزيع أنواع السجلات القانونية (شكوى / قضية / محضر) ─── */}
      <CaseTypesBreakdownWidget
        complaints={complaintsCount}
        cases={lawsuitsCount}
        reports={policeReportsCount}
        total={totalCases}
      />

      {/* ─── إحصائيات جهات النيابة العامة + التخصصات الطبية ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProsecutionsDistributionChart
          prosecutions={prosecutionsList}
          title="إحصائيات إحالات جهات النيابة العامة"
          subtitle="ترتيب النيابات الكلية والجزئية الأكثر وروداً للقضايا ونسبتها الإحصائية"
        />

        <SpecialtiesDistributionChart
          specialties={specialtiesList}
          title="أعلى التخصصات الطبية أمام الدائرة العليا"
          subtitle="توزيع القضايا التخصصي المنظورة لتقارير اللجان الفرعية"
        />
      </div>

      {/* ─── معدل الرد ومواقف المسؤولية الطبية ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TurnaroundMetricCard
          avgTurnaroundDays={avgTurnaroundDays}
          totalCompletedCases={approvedCount}
          onTrackPercentage={92}
          title="متوسط زمن دراسة وحسم القضايا"
          description="متوسط المدة بالأيام بين تاريخ إحالة السجل وصدور التقرير والقرار"
        />

        <LiabilityDistributionChart
          faultConfirmed={faultConfirmedCount}
          noFault={noFaultCount}
          insufficientDocs={insufficientDocsCount}
          total={casesWithActionCount}
        />
      </div>

      {/* ─── جدول أداء ومخرجات اللجان الفرعية الـ 16 ─── */}
      <SubCommitteesWorkloadTable
        subCommittees={subCommitteesWorkload}
        title="مؤشرات أداء وتقارير اللجان الفرعية الـ 16"
        subtitle="متابعة عدد التقارير المرفوعة للجنة العليا، والقرارات المعتمدة، وقرارات الإحالة لكل لجنة"
      />
    </div>
  );
}
