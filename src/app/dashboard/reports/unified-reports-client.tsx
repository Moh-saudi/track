"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Inbox,
  Scale,
  FileCheck2,
  Building2,
  Stethoscope,
  Printer,
  Download,
  Filter,
  ArrowRight,
  ChevronLeft,
  Calendar,
  Layers,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import {
  SpecialtiesDistributionChart,
  SubCommitteesWorkloadTable,
  TurnaroundMetricCard,
  LiabilityDistributionChart,
  ProsecutionsDistributionChart,
  SpecialtyStat,
  SubCommitteeWorkloadItem,
  ProsecutionStat,
} from "@/components/analytics/AnalyticsCharts";
import { formatDate, formatNumber } from "@/lib/formatters";

export interface UnifiedCase {
  id: string;
  caseNumber: string;
  caseYear: number;
  prosecutionCaseNumber: string | null;
  reportYear: number | null;
  registrationType: "COMPLAINT" | "CASE" | "REPORT";
  status: string;
  hospitalName: string | null;
  complainantName: string | null;
  respondentName: string | null;
  prosecution: string | null;
  subCommitteeId: string | null;
  subCommittee: { id: string; name: string } | null;
  specialties: Array<{ id: string; name: string }>;
  createdAt: string;
  assignedAt: string | null;
  expectedDueDate: string | null;
  turnaroundDays: number;
  finalDecisionType?: "FAULT_CONFIRMED" | "NO_FAULT" | "INSUFFICIENT_DOCS" | null;
}

interface UnifiedReportsClientProps {
  initialCases: UnifiedCase[];
  subCommitteesList: Array<{ id: string; name: string }>;
  specialtiesList: SpecialtyStat[];
  prosecutionsList: ProsecutionStat[];
  userRole?: string;
}

const TYPE_CONFIG: Record<string, { label: string; badge: string }> = {
  COMPLAINT: { label: "شكوى", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  CASE: { label: "قضية", badge: "bg-purple-50 text-purple-800 border-purple-200" },
  REPORT: { label: "محضر", badge: "bg-slate-100 text-slate-800 border-slate-300" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; step: number }> = {
  REGISTERED: { label: "بانتظار التوجيه", color: "bg-amber-50 text-amber-800 border-amber-200", step: 1 },
  UNDER_SUBCOMMITTEE_REVIEW: { label: "قيد دراسة اللجنة الفرعية", color: "bg-teal-50 text-teal-800 border-teal-200", step: 2 },
  PENDING_SUPREME_REVIEW: { label: "بانتظار اعتماد اللجنة العليا", color: "bg-blue-50 text-blue-800 border-blue-200", step: 3 },
  APPROVED: { label: "معتمد (قرار نهائي)", color: "bg-emerald-50 text-emerald-800 border-emerald-200", step: 4 },
  REFERRED_FOR_REVIEW: { label: "محال لإعادة الدراسة", color: "bg-rose-50 text-rose-800 border-rose-200", step: 2 },
  CLOSED: { label: "مغلق بالأرشيف", color: "bg-slate-100 text-slate-700 border-slate-200", step: 5 },
};

export function UnifiedReportsClient({
  initialCases,
  subCommitteesList,
  specialtiesList,
  prosecutionsList,
}: UnifiedReportsClientProps) {
  // الفلاتر التفاعلية
  const [selectedYear, setSelectedYear] = useState<string>("ALL");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedSubCommittee, setSelectedSubCommittee] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const yearsAvailable = useMemo(() => {
    const years = Array.from(new Set(initialCases.map((c) => c.caseYear))).sort((a, b) => b - a);
    return years;
  }, [initialCases]);

  // تطبيق الفلاتر
  const filteredCases = useMemo(() => {
    return initialCases.filter((c) => {
      if (selectedYear !== "ALL" && c.caseYear.toString() !== selectedYear) return false;
      if (selectedType !== "ALL" && c.registrationType !== selectedType) return false;
      if (selectedSubCommittee !== "ALL" && c.subCommitteeId !== selectedSubCommittee) return false;
      if (selectedStatus !== "ALL" && c.status !== selectedStatus) return false;
      return true;
    });
  }, [initialCases, selectedYear, selectedType, selectedSubCommittee, selectedStatus]);

  // حساب مراحل المسار الإجرائي (Pipeline Funnel Stages)
  const pipelineMetrics = useMemo(() => {
    const total = filteredCases.length;
    const stage1_Registered = filteredCases.filter((c) => c.status === "REGISTERED" || !c.subCommitteeId).length;
    const stage2_InReview = filteredCases.filter(
      (c) => c.subCommitteeId && (c.status === "UNDER_SUBCOMMITTEE_REVIEW" || c.status === "REFERRED_FOR_REVIEW")
    ).length;
    const stage3_PendingSupreme = filteredCases.filter((c) => c.status === "PENDING_SUPREME_REVIEW").length;
    const stage4_Approved = filteredCases.filter((c) => c.status === "APPROVED" || c.status === "CLOSED").length;
    const stage_Referred = filteredCases.filter((c) => c.status === "REFERRED_FOR_REVIEW").length;

    // حساب المتأخرات
    const now = new Date();
    const overdueCount = filteredCases.filter((c) => {
      if (!c.expectedDueDate || c.status === "APPROVED" || c.status === "CLOSED") return false;
      return new Date(c.expectedDueDate).getTime() < now.getTime();
    }).length;

    // حساب متوسط زمن الإنجاز
    const completed = filteredCases.filter((c) => c.turnaroundDays > 0);
    const avgTurnaround = completed.length > 0
      ? Math.round(completed.reduce((acc, c) => acc + c.turnaroundDays, 0) / completed.length)
      : 0;

    // حساب المسؤولية الطبية
    const faultConfirmed = filteredCases.filter((c) => c.finalDecisionType === "FAULT_CONFIRMED").length;
    const noFault = filteredCases.filter((c) => c.finalDecisionType === "NO_FAULT").length;
    const insufficientDocs = filteredCases.filter((c) => c.finalDecisionType === "INSUFFICIENT_DOCS").length;

    return {
      total,
      stage1_Registered,
      stage2_InReview,
      stage3_PendingSupreme,
      stage4_Approved,
      stage_Referred,
      overdueCount,
      avgTurnaround,
      completedCount: completed.length,
      liability: {
        faultConfirmed,
        noFault,
        insufficientDocs,
        totalDecided: faultConfirmed + noFault + insufficientDocs,
      },
    };
  }, [filteredCases]);

  // تحديث أعباء اللجان الـ 16 بحسب الفلاتر
  const dynamicSubCommitteesWorkload: SubCommitteeWorkloadItem[] = useMemo(() => {
    return subCommitteesList.map((sc) => {
      const scCases = filteredCases.filter((c) => c.subCommitteeId === sc.id);
      const inReview = scCases.filter(
        (c) => c.status === "UNDER_SUBCOMMITTEE_REVIEW" || c.status === "REFERRED_FOR_REVIEW"
      );
      const completed = scCases.filter(
        (c) => c.status === "PENDING_SUPREME_REVIEW" || c.status === "APPROVED" || c.status === "CLOSED"
      );
      const referred = scCases.filter((c) => c.status === "REFERRED_FOR_REVIEW");
      const now = new Date();
      const overdue = scCases.filter((c) => {
        if (!c.expectedDueDate || c.status === "APPROVED" || c.status === "CLOSED") return false;
        return new Date(c.expectedDueDate).getTime() < now.getTime();
      });

      const completedWithDays = scCases.filter((c) => c.turnaroundDays > 0);
      const avgDays = completedWithDays.length > 0
        ? Math.round(completedWithDays.reduce((acc, c) => acc + c.turnaroundDays, 0) / completedWithDays.length)
        : 0;

      return {
        id: sc.id,
        name: sc.name,
        totalCases: scCases.length,
        inReviewCases: inReview.length,
        completedCases: completed.length,
        referredCases: referred.length,
        overdueCases: overdue.length,
        avgTurnaroundDays: avgDays,
      };
    });
  }, [subCommitteesList, filteredCases]);

  // تصدير CSV
  function handleExportCSV() {
    const headers = ["رقم السجل الداخلي", "سنة السجل", "رقم القضية / المحضر", "النوع", "الحالة", "الشاكي", "المشكو في حقه", "النيابة", "اللجنة الفرعية", "تاريخ القيد"];
    const rows = filteredCases.map((c) => [
      c.caseNumber,
      c.caseYear,
      c.prosecutionCaseNumber || "—",
      c.registrationType === "COMPLAINT" ? "شكوى" : c.registrationType === "CASE" ? "قضية" : "محضر",
      STATUS_CONFIG[c.status]?.label || c.status,
      c.complainantName || "—",
      c.respondentName || c.hospitalName || "—",
      c.prosecution || "—",
      c.subCommittee?.name || "—",
      formatDate(c.createdAt),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.map(val => `"${val}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_مؤشرات_القضايا_الشامل_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleResetFilters() {
    setSelectedYear("ALL");
    setSelectedType("ALL");
    setSelectedSubCommittee("ALL");
    setSelectedStatus("ALL");
  }

  const completionRate = pipelineMetrics.total > 0
    ? Math.round((pipelineMetrics.stage4_Approved / pipelineMetrics.total) * 100)
    : 0;

  return (
    <div className="space-y-6 font-body pb-12">
      {/* ─── الهيدر وأدوات التصدير والطباعة ─── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 tracking-tight">
                لوحة القيادة والتقارير الموحدة لمسار القضايا
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 font-body">
                المرصد التحليلي الشامل لكافة مراحل القضايا والشكاوى والمحاضر من القيد حتى صدور القرار النهائي
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>طباعة التقرير</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>تصدير إكسل / CSV</span>
          </button>
        </div>
      </div>

      {/* ─── شريط الفلاتر والتحكم الذكي ─── */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 font-heading">
            <Filter className="w-4 h-4 text-teal-600" />
            <span>فلاتر التحليل الإحصائي الموحد</span>
          </div>
          {(selectedYear !== "ALL" || selectedType !== "ALL" || selectedSubCommittee !== "ALL" || selectedStatus !== "ALL") && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          {/* فلتر السنة */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 block">سنة القيد:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
            >
              <option value="ALL">كافة السنوات ({initialCases.length})</option>
              {yearsAvailable.map((y) => (
                <option key={y} value={y.toString()}>
                  عام {y}
                </option>
              ))}
            </select>
          </div>

          {/* فلتر النوع */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 block">نوع القيد:</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
            >
              <option value="ALL">كافة الأنواع (شكاوى، قضايا، محاضر)</option>
              <option value="COMPLAINT">شكاوى فقط</option>
              <option value="CASE">قضايا فقط</option>
              <option value="REPORT">محاضر فقط</option>
            </select>
          </div>

          {/* فلتر اللجنة الفرعية */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 block">اللجنة الفرعية:</label>
            <select
              value={selectedSubCommittee}
              onChange={(e) => setSelectedSubCommittee(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
            >
              <option value="ALL">كافة اللجان الفرعية الـ 16</option>
              {subCommitteesList.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          {/* فلتر المرحلة الإجرائية */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 block">المرحلة الإجرائية:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 text-xs focus:ring-1 focus:ring-teal-600 focus:border-teal-600"
            >
              <option value="ALL">كافة المراحل</option>
              <option value="REGISTERED">بانتظار التوجيه</option>
              <option value="UNDER_SUBCOMMITTEE_REVIEW">قيد دراسة اللجنة الفرعية</option>
              <option value="PENDING_SUPREME_REVIEW">بانتظار اعتماد اللجنة العليا</option>
              <option value="APPROVED">معتمد (قرار نهائي)</option>
              <option value="REFERRED_FOR_REVIEW">محال لإعادة الدراسة</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── بطاقات المؤشرات التنفيذية الكبرى (Executive KPI Cards) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        <StatCard
          title="إجمالي الوارد العام"
          value={formatNumber(pipelineMetrics.total)}
          icon={<Layers className="w-5 h-5" />}
          variant="slate"
          description="شكاوى وقضايا ومحاضر مطابقة"
        />

        <StatCard
          title="بانتظار التوجيه"
          value={formatNumber(pipelineMetrics.stage1_Registered)}
          icon={<Inbox className="w-5 h-5" />}
          variant="sky"
          description="تتطلب الإحالة للجان الفرعية"
        />

        <StatCard
          title="قيد دراسة اللجان"
          value={formatNumber(pipelineMetrics.stage2_InReview)}
          icon={<Stethoscope className="w-5 h-5" />}
          variant="teal"
          description="أعمال الجلسات وفِرق الفحص"
        />

        <StatCard
          title="بانتظار اللجنة العليا"
          value={formatNumber(pipelineMetrics.stage3_PendingSupreme)}
          icon={<Scale className="w-5 h-5" />}
          variant="amber"
          description="تقارير مرفوعة للاعتماد النهائي"
        />

        <StatCard
          title="قرارات نهائية معتمدة"
          value={formatNumber(pipelineMetrics.stage4_Approved)}
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant="emerald"
          description={`نسبة الإنجاز: ${completionRate}%`}
        />
      </div>

      {/* ─── مخطط قمع المراحل الإجرائية (End-to-End Pipeline Funnel) ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-600" />
              <span>مخطط قمع تدفق القضايا عبر المراحل الخمس (Case Flow Pipeline)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              تتبع حجم القضايا ونسب التحويل بين كل خطوة إجرائية من التسجيل حتى صدور القرار النهائي
            </p>
          </div>

          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-200 self-start sm:self-auto">
            معدل الاعتماد الإجمالي: {completionRate}%
          </span>
        </div>

        {/* مسار الخطوات المرئي */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-1">
          {/* الخطوة 1: القيد والوارد */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 relative">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">1. القيد والوارد</span>
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold font-mono">1</span>
            </div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-bold font-heading text-slate-900">{pipelineMetrics.stage1_Registered}</span>
              <span className="text-xs text-slate-500">سجل</span>
            </div>
            <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-500 rounded-full"
                style={{ width: `${pipelineMetrics.total > 0 ? (pipelineMetrics.stage1_Registered / pipelineMetrics.total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[11px] text-slate-500 block">
              {pipelineMetrics.total > 0 ? Math.round((pipelineMetrics.stage1_Registered / pipelineMetrics.total) * 100) : 0}% من الوارد العام
            </span>
          </div>

          {/* الخطوة 2: دراسة اللجان الفرعية */}
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 space-y-2 relative">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-teal-900">2. دراسة اللجان الفرعية</span>
              <span className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">2</span>
            </div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-bold font-heading text-teal-950">{pipelineMetrics.stage2_InReview}</span>
              <span className="text-xs text-teal-700">قضية</span>
            </div>
            <div className="h-1.5 w-full bg-teal-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-teal-600 rounded-full"
                style={{ width: `${pipelineMetrics.total > 0 ? (pipelineMetrics.stage2_InReview / pipelineMetrics.total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[11px] text-teal-700 block">
              {pipelineMetrics.total > 0 ? Math.round((pipelineMetrics.stage2_InReview / pipelineMetrics.total) * 100) : 0}% قيد الفحص والتقارير
            </span>
          </div>

          {/* الخطوة 3: مداولة اللجنة العليا */}
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2 relative">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue-900">3. مداولة اللجنة العليا</span>
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">3</span>
            </div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-bold font-heading text-blue-950">{pipelineMetrics.stage3_PendingSupreme}</span>
              <span className="text-xs text-blue-700">تقرير</span>
            </div>
            <div className="h-1.5 w-full bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full"
                style={{ width: `${pipelineMetrics.total > 0 ? (pipelineMetrics.stage3_PendingSupreme / pipelineMetrics.total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[11px] text-blue-700 block">
              {pipelineMetrics.total > 0 ? Math.round((pipelineMetrics.stage3_PendingSupreme / pipelineMetrics.total) * 100) : 0}% بانتظار جلسة الاعتماد
            </span>
          </div>

          {/* الخطوة 4: القرارات المعتمدة */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 relative">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-emerald-900">4. قرارات معتمدة نهائياً</span>
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">4</span>
            </div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-bold font-heading text-emerald-950">{pipelineMetrics.stage4_Approved}</span>
              <span className="text-xs text-emerald-700">قرار</span>
            </div>
            <div className="h-1.5 w-full bg-emerald-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 rounded-full"
                style={{ width: `${pipelineMetrics.total > 0 ? (pipelineMetrics.stage4_Approved / pipelineMetrics.total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[11px] text-emerald-700 block">
              {completionRate}% معدل الإنجاز النهائي
            </span>
          </div>

          {/* مسار استثنائي: إعادة دراسة */}
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2 relative">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-rose-900">مسار تصحيحي / إعادة دراسة</span>
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold font-mono">!</span>
            </div>
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-2xl font-bold font-heading text-rose-950">{pipelineMetrics.stage_Referred}</span>
              <span className="text-xs text-rose-700">معادة</span>
            </div>
            <div className="h-1.5 w-full bg-rose-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-600 rounded-full"
                style={{ width: `${pipelineMetrics.total > 0 ? (pipelineMetrics.stage_Referred / pipelineMetrics.total) * 100 : 0}%` }}
              />
            </div>
            <span className="text-[11px] text-rose-700 block">
              قضايا أُعيدت للجان لاستيفاء نقاط فنية
            </span>
          </div>
        </div>
      </div>

      {/* ─── الجرافات والتحليلات المتخصصة ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* مؤشر معدل الرد وزمن الإنجاز SLA */}
        <TurnaroundMetricCard
          avgTurnaroundDays={pipelineMetrics.avgTurnaround}
          totalCompletedCases={pipelineMetrics.completedCount}
          onTrackPercentage={
            pipelineMetrics.total > 0
              ? Math.max(0, 100 - Math.round((pipelineMetrics.overdueCount / pipelineMetrics.total) * 100))
              : 100
          }
          title="معدل الرد والالتزام بالمدد (SLA)"
          description="متوسط المدة المستغرقة من قيد السجل وحتى اعتماد التقرير الفني ومؤشر المهلة القانونية"
        />

        {/* توزيع نتائج المسؤولية الطبية */}
        <LiabilityDistributionChart
          faultConfirmed={pipelineMetrics.liability.faultConfirmed}
          noFault={pipelineMetrics.liability.noFault}
          insufficientDocs={pipelineMetrics.liability.insufficientDocs}
          total={pipelineMetrics.liability.totalDecided}
        />
      </div>

      {/* ─── التوزيع التخصصي وأعباء اللجان الـ 16 ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <SpecialtiesDistributionChart
            specialties={specialtiesList}
            title="التوزيع التخصصي الطبي"
            subtitle="أعلى التخصصات طلباً في القضايا والشكاوى على مستوى الجمهورية"
          />
        </div>

        <div className="lg:col-span-2">
          <SubCommitteesWorkloadTable
            subCommittees={dynamicSubCommitteesWorkload}
            title="مؤشرات أداء وتوزيع اللجان الفرعية الـ 16"
            subtitle="مقارنة أعباء القضايا والمتأخرات ومعدل إنجاز كل لجنة معتمدة"
          />
        </div>
      </div>

      {/* ─── توزيع جهات النيابة العامة ─── */}
      {prosecutionsList.length > 0 && (
        <ProsecutionsDistributionChart
          prosecutions={prosecutionsList}
          title="توزيع القضايا حسب جهات النيابة العامة"
          subtitle="النيابات الأكثر إحالةً للقضايا والمحاضر الطبية"
        />
      )}

      {/* ─── جدول استعراض السجلات المطابقة ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold font-heading text-slate-900">
              قائمة السجلات والقضايا المطابقة ({filteredCases.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              استعراض مفصل ومباشر لكافة السجلات الخاضعة للتحليل الإحصائي
            </p>
          </div>
        </div>

        {filteredCases.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            لا توجد سجلات مطابقة للفلاتر المحددة حالياً.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 text-slate-600 font-heading font-bold border-b border-slate-200 text-[11px]">
                <tr>
                  <th className="p-3.5 whitespace-nowrap">رقم القضية / المحضر</th>
                  <th className="p-3.5 whitespace-nowrap">رقم السجل الداخلي</th>
                  <th className="p-3.5 whitespace-nowrap">النوع</th>
                  <th className="p-3.5 whitespace-nowrap">المرحلة الإجرائية</th>
                  <th className="p-3.5 whitespace-nowrap">الشاكي</th>
                  <th className="p-3.5 whitespace-nowrap">المشكو في حقه</th>
                  <th className="p-3.5 whitespace-nowrap">اللجنة الفرعية</th>
                  <th className="p-3.5 whitespace-nowrap">تاريخ القيد</th>
                  <th className="p-3.5 text-center whitespace-nowrap">الملف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {filteredCases.slice(0, 30).map((c) => {
                  const typeInfo = TYPE_CONFIG[c.registrationType] || { label: c.registrationType, badge: "bg-slate-100 text-slate-700" };
                  const statusInfo = STATUS_CONFIG[c.status] || { label: c.status, color: "bg-slate-100 text-slate-700" };

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-mono">
                        {c.prosecutionCaseNumber ? (
                          <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200" dir="auto">
                            {c.prosecutionCaseNumber} {c.reportYear ? `/ ${c.reportYear}` : ""}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="p-3.5 font-bold font-mono text-slate-900 whitespace-nowrap">
                        <Link
                          href={`/dashboard/registration/${c.id}`}
                          className="hover:text-teal-700 transition-colors"
                        >
                          #{c.caseNumber} / {c.caseYear}
                        </Link>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${typeInfo.badge}`}>
                          {typeInfo.label}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="p-3.5 font-medium text-slate-800 max-w-[150px] truncate" title={c.complainantName || ""}>
                        {c.complainantName || "—"}
                      </td>

                      <td className="p-3.5 font-medium text-slate-700 max-w-[150px] truncate" title={c.respondentName || c.hospitalName || ""}>
                        {c.respondentName || c.hospitalName || "—"}
                      </td>

                      <td className="p-3.5 text-slate-700 max-w-[140px] truncate" title={c.subCommittee?.name || ""}>
                        {c.subCommittee?.name || "بانتظار التوجيه"}
                      </td>

                      <td className="p-3.5 font-mono text-slate-500 whitespace-nowrap">
                        {formatDate(c.createdAt)}
                      </td>

                      <td className="p-3.5 text-center">
                        <Link
                          href={`/dashboard/registration/${c.id}`}
                          className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors"
                          title="عرض تفاصيل السجل"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filteredCases.length > 30 && (
          <div className="p-3 bg-slate-50 text-center text-xs text-slate-500 border-t border-slate-100">
            يتم عرض أول 30 سجلاً من إجمالي {filteredCases.length} سجل. يمكنك تصدير الملف بالكامل أو تصفية المعايير.
          </div>
        )}
      </div>
    </div>
  );
}
