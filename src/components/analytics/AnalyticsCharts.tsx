"use client";

import React, { useState, useMemo } from "react";
import {
  Stethoscope,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  TrendingUp,
  Building2,
  FileCheck2,
  BarChart3,
  Table as TableIcon,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
} from "lucide-react";

export interface SpecialtyStat {
  id?: string;
  name: string;
  count: number;
  percentage: number;
}

interface SpecialtiesDistributionChartProps {
  specialties: SpecialtyStat[];
  totalClassifiedCases?: number;
  unclassifiedCases?: number;
  title?: string;
  subtitle?: string;
}

export function SpecialtiesDistributionChart({
  specialties,
  totalClassifiedCases,
  unclassifiedCases,
  title = "توزيع القضايا حسب التخصصات الطبية",
  subtitle = "ترتيب التخصصات الأكثر طلباً وفحصاً ومعدل تمثيلها الإحصائي",
}: SpecialtiesDistributionChartProps) {
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSpecialties = useMemo(() => {
    if (!searchQuery.trim()) return specialties;
    const q = searchQuery.trim().toLowerCase();
    return specialties.filter((s) => s.name.toLowerCase().includes(q));
  }, [specialties, searchQuery]);

  const displayedSpecialties = useMemo(() => {
    if (showAll || searchQuery.trim().length > 0) return filteredSpecialties;
    return filteredSpecialties.slice(0, 8);
  }, [filteredSpecialties, showAll, searchQuery]);

  const remainingSpecialties = useMemo(() => {
    if (showAll || searchQuery.trim().length > 0 || filteredSpecialties.length <= 8) return [];
    return filteredSpecialties.slice(8);
  }, [filteredSpecialties, showAll, searchQuery]);

  const remainingCount = remainingSpecialties.reduce((sum, s) => sum + s.count, 0);
  const totalCountAll = specialties.reduce((sum, s) => sum + s.count, 0);
  const remainingPercentage = totalCountAll > 0 ? Math.round((remainingCount / totalCountAll) * 100) : 0;

  const topSpecialty = specialties.length > 0 ? specialties[0] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 font-body">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-600" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {topSpecialty && topSpecialty.count > 0 && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200/80 text-teal-800 text-xs font-semibold self-start sm:self-auto">
            <Award className="w-4 h-4 text-teal-600 shrink-0" />
            <span>أعلى تخصص: <strong>{topSpecialty.name}</strong> ({topSpecialty.count} سجل)</span>
          </div>
        )}
      </div>

      {/* شريط توضيحي لمعدل تصنيف القضايا */}
      {(totalClassifiedCases !== undefined || unclassifiedCases !== undefined) && (
        <div className="p-2.5 rounded-xl bg-teal-50/60 border border-teal-100 flex flex-wrap items-center justify-between gap-2 text-xs text-teal-900">
          <div className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              <strong>{totalClassifiedCases ?? 0}</strong> قضية محدد لها تخصص طبي باللجان
            </span>
          </div>
          {unclassifiedCases !== undefined && unclassifiedCases > 0 && (
            <span className="text-[11px] text-teal-700 bg-white/80 px-2 py-0.5 rounded-md border border-teal-200/60 font-semibold">
              {unclassifiedCases} قيد وارد قيد الفحص والتوجيه المبدئي
            </span>
          )}
        </div>
      )}

      {/* شريط البحث إن كانت التخصصات متعددة */}
      {specialties.length > 8 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث في التخصصات الطبية..."
            className="w-full h-8 pr-8 pl-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-600 focus:bg-white transition-colors"
          />
        </div>
      )}

      {displayedSpecialties.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-xs">
          لا توجد بيانات تخصصات مسجلة مطابقة للبحث
        </div>
      ) : (
        <div className="space-y-3">
          {displayedSpecialties.map((spec, idx) => {
            const isTop = idx === 0 && spec.count > 0 && !searchQuery;
            return (
              <div key={spec.id || spec.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                        isTop ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="truncate max-w-[200px] sm:max-w-[260px]" title={spec.name}>
                      {spec.name}
                    </span>
                  </span>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="font-extrabold text-sm text-slate-900">{spec.count} قضية</span>
                    <span className="text-slate-500 font-bold text-xs min-w-[36px] text-left">
                      {spec.percentage}%
                    </span>
                  </div>
                </div>

                {/* شريط بياني نسبي */}
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isTop
                        ? "bg-teal-600"
                        : idx === 1
                        ? "bg-teal-500"
                        : idx === 2
                        ? "bg-teal-400"
                        : "bg-slate-400"
                    }`}
                    style={{ width: `${Math.max(spec.percentage, 3)}%` }}
                  />
                </div>
              </div>
            );
          })}

          {/* بطاقة باقي التخصصات الطبية */}
          {!showAll && remainingSpecialties.length > 0 && !searchQuery && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  باقي التخصصات الطبية (<strong>{remainingSpecialties.length}</strong> تخصص):
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="font-extrabold text-sm text-slate-900">{remainingCount} قضية</span>
                <span className="text-slate-500 font-bold text-xs">{remainingPercentage}%</span>
              </div>
            </div>
          )}

          {/* زر التبديل بين أعلى 8 وكافة التخصصات */}
          {specialties.length > 8 && !searchQuery && (
            <div className="pt-2 text-center border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800 transition-colors"
              >
                <span>{showAll ? "عرض أعلى 8 تخصصات فقط" : `عرض كافة التخصصات (${specialties.length})`}</span>
                {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── بطاقة مؤشر معدل الرد وزمن الإنجاز (Turnaround Time & Response Rate) ───
interface TurnaroundMetricProps {
  avgTurnaroundDays: number;
  totalCompletedCases: number;
  onTrackPercentage?: number;
  title?: string;
  description?: string;
}

export function TurnaroundMetricCard({
  avgTurnaroundDays,
  totalCompletedCases,
  onTrackPercentage = 100,
  title = "معدل الرد وزمن الإنجاز الطبي",
  description = "متوسط المدة المستغرقة بالأيام من استلام السجل وحتى اعتماد التقرير الفني",
}: TurnaroundMetricProps) {
  // تصنيف الأداء
  let performanceStatus: { label: string; color: string; badge: string };
  if (avgTurnaroundDays === 0) {
    performanceStatus = { label: "قيد القياس", color: "text-slate-600", badge: "bg-slate-100 text-slate-700" };
  } else if (avgTurnaroundDays <= 14) {
    performanceStatus = { label: "استجابة قياسية ممتازة (≤ 14 يوم)", color: "text-emerald-700", badge: "bg-emerald-50 text-emerald-800 border border-emerald-200" };
  } else if (avgTurnaroundDays <= 30) {
    performanceStatus = { label: "ضمن الإطار الزمني المعتاد (≤ 30 يوم)", color: "text-teal-700", badge: "bg-teal-50 text-teal-800 border border-teal-200" };
  } else {
    performanceStatus = { label: "يتطلب تسريع وتيرة الفحص (> 30 يوم)", color: "text-amber-700", badge: "bg-amber-50 text-amber-800 border border-amber-200" };
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 font-body">
      <div>
        <h3 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-teal-600" />
          <span>{title}</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <span className="text-xs font-semibold text-slate-600 block">متوسط زمن الرد</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-heading text-slate-900 font-mono">
              {avgTurnaroundDays > 0 ? avgTurnaroundDays : "—"}
            </span>
            <span className="text-xs text-slate-500 font-bold">يوم عمل</span>
          </div>
          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold mt-1 ${performanceStatus.badge}`}>
            {performanceStatus.label}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <span className="text-xs font-semibold text-slate-600 block">إجمالي التقارير المنجزة</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-heading text-slate-900 font-mono">
              {totalCompletedCases}
            </span>
            <span className="text-xs text-slate-500 font-bold">تقرير فني صادر</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 mt-1">
            <FileCheck2 className="w-3.5 h-3.5 text-teal-600" />
            <span>معتمدة ومرفوعة للجنة العليا</span>
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
          <span className="text-xs font-semibold text-slate-600 block">نسبة الالتزام بالمدد (SLA)</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold font-heading text-teal-700 font-mono">
              {onTrackPercentage}%
            </span>
            <span className="text-xs text-teal-600 font-bold">في الموعد المقبول</span>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mt-1.5">
            <div
              className="h-full bg-teal-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(onTrackPercentage, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── بطاقة توزيع مواقف الخطأ والمسؤولية الطبية ───
interface LiabilityDistributionProps {
  faultConfirmed: number;
  noFault: number;
  insufficientDocs: number;
  total: number;
}

export function LiabilityDistributionChart({
  faultConfirmed,
  noFault,
  insufficientDocs,
  total,
}: LiabilityDistributionProps) {
  const faultPercent = total > 0 ? Math.round((faultConfirmed / total) * 100) : 0;
  const noFaultPercent = total > 0 ? Math.round((noFault / total) * 100) : 0;
  const docPercent = total > 0 ? Math.round((insufficientDocs / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 font-body">
      <div>
        <h3 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-teal-600" />
          <span>توزيع نتائج ومواقف المسؤولية الطبية</span>
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          نسب ثبوت الأخطاء المهنية مقابل انتفاء الخطأ واستيفاء الأوراق في تقارير اللجنة
        </p>
      </div>

      {/* شريط بياني ثلاثي مجزأ */}
      <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
        {faultPercent > 0 && (
          <div
            className="bg-rose-500 h-full transition-all duration-500"
            style={{ width: `${faultPercent}%` }}
            title={`ثبوت خطأ: ${faultConfirmed} (${faultPercent}%)`}
          />
        )}
        {noFaultPercent > 0 && (
          <div
            className="bg-emerald-500 h-full transition-all duration-500"
            style={{ width: `${noFaultPercent}%` }}
            title={`انتفاء خطأ: ${noFault} (${noFaultPercent}%)`}
          />
        )}
        {docPercent > 0 && (
          <div
            className="bg-amber-400 h-full transition-all duration-500"
            style={{ width: `${docPercent}%` }}
            title={`استيفاء مستندات: ${insufficientDocs} (${docPercent}%)`}
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-900">ثبوت الخطأ الطبي</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          </div>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-xl font-bold font-heading text-rose-950">{faultConfirmed}</span>
            <span className="text-xs text-rose-700 font-semibold">({faultPercent}%)</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-900">انتفاء الخطأ والتقصير</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-xl font-bold font-heading text-emerald-950">{noFault}</span>
            <span className="text-xs text-emerald-700 font-semibold">({noFaultPercent}%)</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-900">استيفاء المستندات</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          </div>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-xl font-bold font-heading text-amber-950">{insufficientDocs}</span>
            <span className="text-xs text-amber-700 font-semibold">({docPercent}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── جدول وجراف أعباء عمل ومؤشرات اللجان الفرعية الـ 16 ───
export interface SubCommitteeWorkloadItem {
  id: string;
  name: string;
  totalCases: number;
  inReviewCases: number;
  completedCases: number;
  referredCases: number;
  overdueCases: number;
  avgTurnaroundDays: number;
}

interface SubCommitteesWorkloadTableProps {
  subCommittees: SubCommitteeWorkloadItem[];
  title?: string;
  subtitle?: string;
}

type SubCommitteeSortField =
  | "totalCases"
  | "inReviewCases"
  | "completedCases"
  | "referredCases"
  | "overdueCases"
  | "avgTurnaroundDays"
  | "name";

export function SubCommitteesWorkloadTable({
  subCommittees,
  title = "مؤشرات أداء وتوزيع اللجان الفرعية الـ 16",
  subtitle = "مقارنة أعباء القضايا والمتأخرات ومعدل إنجاز كل لجنة معتمدة",
}: SubCommitteesWorkloadTableProps) {
  const [viewMode, setViewMode] = useState<"split" | "chart" | "table">("split");
  const [sortField, setSortField] = useState<SubCommitteeSortField>("totalCases");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [activeOnly, setActiveOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

  function handleSort(field: SubCommitteeSortField) {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  const activeCommitteesCount = useMemo(() => {
    return subCommittees.filter((sc) => sc.totalCases > 0).length;
  }, [subCommittees]);

  const totalAssignedCases = useMemo(() => {
    return subCommittees.reduce((sum, sc) => sum + sc.totalCases, 0);
  }, [subCommittees]);

  const totalInReviewCases = useMemo(() => {
    return subCommittees.reduce((sum, sc) => sum + sc.inReviewCases, 0);
  }, [subCommittees]);

  const totalCompletedCases = useMemo(() => {
    return subCommittees.reduce((sum, sc) => sum + sc.completedCases, 0);
  }, [subCommittees]);

  const sortedSubCommittees = useMemo(() => {
    let list = [...subCommittees];
    if (activeOnly) {
      list = list.filter((sc) => sc.totalCases > 0);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((sc) => sc.name.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];
      if (typeof valA === "string") {
        return sortOrder === "asc"
          ? valA.localeCompare(valB, "ar")
          : valB.localeCompare(valA, "ar");
      }
      return sortOrder === "asc" ? valA - valB : valB - valA;
    });
    return list;
  }, [subCommittees, sortField, sortOrder, activeOnly, searchQuery]);

  // اللجان النشطة لعرض الجراف البياني
  const activeForGraph = useMemo(() => {
    const active = sortedSubCommittees.filter((sc) => sc.totalCases > 0);
    return active.length > 0 ? active : sortedSubCommittees.slice(0, 6);
  }, [sortedSubCommittees]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden font-body space-y-0">
      {/* رأس المكون وشريط التحكم الذكي */}
      <div className="p-5 border-b border-slate-100 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              <span>{title}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
          </div>

          {/* تبديل وضع العرض */}
          <div className="inline-flex items-center p-1 bg-slate-100 rounded-xl text-xs font-semibold self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("chart")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === "chart"
                  ? "bg-white text-teal-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>جراف بياني</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-white text-teal-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>جدول تفصيلي</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("split")}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                viewMode === "split"
                  ? "bg-white text-teal-700 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>عرض مدمج</span>
            </button>
          </div>
        </div>

        {/* مؤشرات إجمالية سريعة + أدوات الفرز والبحث */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 border-t border-slate-50">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="bg-teal-50 text-teal-900 border border-teal-200/80 px-2.5 py-1 rounded-lg font-bold font-mono">
              إجمالي الموزع: {totalAssignedCases} سجل
            </span>
            <span className="bg-amber-50 text-amber-900 border border-amber-200/80 px-2.5 py-1 rounded-lg font-semibold font-mono">
              قيد الفحص: {totalInReviewCases}
            </span>
            <span className="bg-emerald-50 text-emerald-900 border border-emerald-200/80 px-2.5 py-1 rounded-lg font-semibold font-mono">
              تم الإنجاز: {totalCompletedCases}
            </span>
            <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-semibold">
              {activeCommitteesCount} لجنة بها قضايا من أصل {subCommittees.length}
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* فلتر اللجان النشطة فقط */}
            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={(e) => setActiveOnly(e.target.checked)}
                className="rounded text-teal-600 focus:ring-teal-500 h-3.5 w-3.5 border-slate-300"
              />
              <span>اللجان النشطة فقط ({activeCommitteesCount})</span>
            </label>

            {/* حقل بحث بالاسم */}
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث باسم اللجنة..."
                className="w-full h-8 pr-7 pl-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-600 focus:bg-white transition-colors"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── وضع الجراف البياني المرئي (Visual Workload Chart) ─── */}
      {(viewMode === "chart" || viewMode === "split") && (
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
            <span className="flex items-center gap-1.5 text-slate-800 font-bold">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              <span>جراف توزيع الأعباء ونسب الإنجاز باللجان الفرعية</span>
            </span>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                <span>تم الإنجاز والرفع</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>قيد الفحص</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span>إعادة دراسة</span>
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {activeForGraph.map((sc, idx) => {
              const maxCases = Math.max(...subCommittees.map((s) => s.totalCases), 1);
              const relativeWidth = sc.totalCases > 0 ? Math.max((sc.totalCases / maxCases) * 100, 6) : 0;
              const completedPercent = sc.totalCases > 0 ? Math.round((sc.completedCases / sc.totalCases) * 100) : 0;
              const inReviewPercent = sc.totalCases > 0 ? Math.round((sc.inReviewCases / sc.totalCases) * 100) : 0;
              const referredPercent = sc.totalCases > 0 ? Math.round((sc.referredCases / sc.totalCases) * 100) : 0;

              return (
                <div key={sc.id} className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-[10px] font-bold font-mono shrink-0">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{sc.name}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap font-mono">
                      <span className="text-xs sm:text-sm font-extrabold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-md">
                        {sc.totalCases} سجل وارد
                      </span>
                      {sc.inReviewCases > 0 && (
                        <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {sc.inReviewCases} قيد الفحص
                        </span>
                      )}
                      {sc.completedCases > 0 && (
                        <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                          {sc.completedCases} تم الإنجاز
                        </span>
                      )}
                      {sc.overdueCases > 0 && (
                        <span className="text-xs font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded-md border border-red-200 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          <span>{sc.overdueCases} متأخر</span>
                        </span>
                      )}
                      {sc.avgTurnaroundDays > 0 && (
                        <span className="text-xs font-semibold text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md">
                          ⏱ {sc.avgTurnaroundDays} يوم
                        </span>
                      )}
                    </div>
                  </div>

                  {/* شريط الإنجاز البياني الملون */}
                  <div className="space-y-1">
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      {sc.totalCases === 0 ? (
                        <div className="h-full w-full bg-slate-100" />
                      ) : (
                        <>
                          {completedPercent > 0 && (
                            <div
                              className="bg-teal-500 h-full transition-all duration-500"
                              style={{ width: `${completedPercent}%` }}
                              title={`تم الإنجاز: ${sc.completedCases}`}
                            />
                          )}
                          {inReviewPercent > 0 && (
                            <div
                              className="bg-amber-400 h-full transition-all duration-500"
                              style={{ width: `${inReviewPercent}%` }}
                              title={`قيد الفحص: ${sc.inReviewCases}`}
                            />
                          )}
                          {referredPercent > 0 && (
                            <div
                              className="bg-rose-500 h-full transition-all duration-500"
                              style={{ width: `${referredPercent}%` }}
                              title={`إعادة دراسة: ${sc.referredCases}`}
                            />
                          )}
                        </>
                      )}
                    </div>
                    {sc.totalCases > 0 && (
                      <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono">
                        <span>معدل إنجاز اللجنة: <strong>{completedPercent}%</strong></span>
                        <span>مقارنة بأعلى أعباء واردة: <strong>{Math.round(relativeWidth)}%</strong></span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── جدول المؤشرات التفصيلي مع فرز تفاعلي وأرقام واضحة ─── */}
      {(viewMode === "table" || viewMode === "split") && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-50 text-slate-700 font-heading font-bold border-b border-slate-200 text-xs">
              <tr>
                <th
                  onClick={() => handleSort("name")}
                  className="p-3.5 whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>اسم اللجنة الفرعية</span>
                    {sortField === "name" ? (
                      sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("totalCases")}
                  className="p-3.5 text-center whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>إجمالي الوارد</span>
                    {sortField === "totalCases" ? (
                      sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("inReviewCases")}
                  className="p-3.5 text-center whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>قيد الفحص</span>
                    {sortField === "inReviewCases" ? (
                      sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-amber-600" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("completedCases")}
                  className="p-3.5 text-center whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>تم الإنجاز والرفع</span>
                    {sortField === "completedCases" ? (
                      sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("referredCases")}
                  className="p-3.5 text-center whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>إعادة دراسة</span>
                    {sortField === "referredCases" ? (
                      sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-rose-600" /> : <ArrowDown className="w-3.5 h-3.5 text-rose-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("overdueCases")}
                  className="p-3.5 text-center whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>متأخرات المهلة</span>
                    {sortField === "overdueCases" ? (
                      sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-red-600" /> : <ArrowDown className="w-3.5 h-3.5 text-red-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort("avgTurnaroundDays")}
                  className="p-3.5 text-center whitespace-nowrap cursor-pointer hover:bg-slate-100 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>متوسط الرد</span>
                    {sortField === "avgTurnaroundDays" ? (
                      sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-teal-600" /> : <ArrowDown className="w-3.5 h-3.5 text-teal-600" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {sortedSubCommittees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 text-xs">
                    لا توجد لجان مطابقة لمعايير البحث الحالية
                  </td>
                </tr>
              ) : (
                sortedSubCommittees.map((sc) => (
                  <tr key={sc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900 text-xs sm:text-sm">
                      {sc.name}
                    </td>
                    <td className="p-3.5 text-center font-extrabold font-mono text-sm sm:text-base text-slate-950">
                      {sc.totalCases}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-block px-3 py-1 rounded-lg font-bold font-mono text-xs sm:text-sm bg-amber-50 text-amber-900 border border-amber-200">
                        {sc.inReviewCases}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="inline-block px-3 py-1 rounded-lg font-bold font-mono text-xs sm:text-sm bg-teal-50 text-teal-900 border border-teal-200">
                        {sc.completedCases}
                      </span>
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {sc.referredCases > 0 ? (
                        <span className="inline-block px-3 py-1 rounded-lg font-bold text-xs sm:text-sm bg-rose-50 text-rose-900 border border-rose-200">
                          {sc.referredCases}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">0</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono">
                      {sc.overdueCases > 0 ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg font-bold text-xs sm:text-sm bg-red-50 text-red-900 border border-red-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                          <span>{sc.overdueCases}</span>
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold text-xs">0</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold text-xs sm:text-sm text-slate-800">
                      {sc.avgTurnaroundDays > 0 ? `${sc.avgTurnaroundDays} يوم` : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── جراف وتوزيع جهات النيابة العامة الشامل والشفاف ───
export interface ProsecutionStat {
  id?: string;
  name: string;
  count: number;
  percentage: number;
}

interface ProsecutionsDistributionChartProps {
  prosecutions: ProsecutionStat[];
  totalCasesCount?: number;
  casesWithoutProsCount?: number;
  title?: string;
  subtitle?: string;
}

export function ProsecutionsDistributionChart({
  prosecutions,
  totalCasesCount,
  casesWithoutProsCount = 0,
  title = "توزيع القضايا حسب جهات النيابة العامة",
  subtitle = "حصر النيابات الكلية والجزئية الأكثر إحالة للقضايا ونسبتها المئوية",
}: ProsecutionsDistributionChartProps) {
  const [showAll, setShowAll] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const totalProsCases = useMemo(() => {
    return prosecutions.reduce((sum, p) => sum + p.count, 0);
  }, [prosecutions]);

  const filteredProsecutions = useMemo(() => {
    if (!searchQuery.trim()) return prosecutions;
    const q = searchQuery.trim().toLowerCase();
    return prosecutions.filter((p) => p.name.toLowerCase().includes(q));
  }, [prosecutions, searchQuery]);

  const displayedProsecutions = useMemo(() => {
    if (showAll || searchQuery.trim().length > 0) return filteredProsecutions;
    return filteredProsecutions.slice(0, 8);
  }, [filteredProsecutions, showAll, searchQuery]);

  const remainingProsecutions = useMemo(() => {
    if (showAll || searchQuery.trim().length > 0 || filteredProsecutions.length <= 8) return [];
    return filteredProsecutions.slice(8);
  }, [filteredProsecutions, showAll, searchQuery]);

  const remainingCount = remainingProsecutions.reduce((sum, p) => sum + p.count, 0);
  const remainingPercentage = totalProsCases > 0 ? Math.round((remainingCount / totalProsCases) * 100) : 0;

  const topProsecution = prosecutions.length > 0 && prosecutions[0].count > 0 ? prosecutions[0] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5 font-body">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-600" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>

        {topProsecution && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs font-semibold self-start sm:self-auto">
            <Award className="w-4 h-4 text-sky-600 shrink-0" />
            <span>النيابة الأكثر إحالة: <strong>{topProsecution.name}</strong> ({topProsecution.count} سجل)</span>
          </div>
        )}
      </div>

      {/* شريط الإحصائيات الشاملة لتوضيح كافة السجلات وتوزيعها */}
      <div className="p-3 rounded-xl bg-sky-50/60 border border-sky-100 flex flex-wrap items-center justify-between gap-2 text-xs text-sky-950">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold">
            إجمالي السجلات الواردة من النيابة العامة: <strong className="font-mono text-sm font-extrabold text-sky-900">{totalProsCases}</strong> سجل
          </span>
          <span className="text-slate-400">|</span>
          <span>
            موزعة على <strong>{prosecutions.length}</strong> جهة نيابة عامة على مستوى الجمهورية
          </span>
        </div>

        {casesWithoutProsCount > 0 && (
          <span className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 font-semibold">
            {casesWithoutProsCount} شكوى مباشرة بدون جهة نيابة
          </span>
        )}
      </div>

      {/* شريط البحث في جهات النيابة */}
      {prosecutions.length > 8 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث باسم النيابة الكلية أو الجزئية..."
            className="w-full h-8.5 pr-8.5 pl-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-sky-600 focus:bg-white transition-colors"
          />
        </div>
      )}

      {displayedProsecutions.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-xs">
          لا توجد سجلات نيابة مسجلة مطابقة لمعيار البحث
        </div>
      ) : (
        <div className="space-y-3">
          {displayedProsecutions.map((proc, idx) => {
            const isTop = idx === 0 && proc.count > 0 && !searchQuery;
            return (
              <div key={proc.id || proc.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold font-mono ${
                        isTop ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="truncate max-w-[220px] sm:max-w-[320px]" title={proc.name}>
                      {proc.name}
                    </span>
                  </span>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="font-extrabold text-sm text-slate-900">{proc.count} سجل</span>
                    <span className="text-slate-500 font-bold text-xs min-w-[38px] text-left">
                      {proc.percentage}%
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isTop ? "bg-sky-600" : "bg-sky-400"
                    }`}
                    style={{ width: `${Math.max(proc.percentage, 3)}%` }}
                  />
                </div>
              </div>
            );
          })}

          {/* بطاقة باقي جهات النيابة العامة لتوضيح النسبة المتبقية 100% */}
          {!showAll && remainingProsecutions.length > 0 && !searchQuery && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  باقي جهات النيابة العامة (<strong>{remainingProsecutions.length}</strong> جهة أخرى):
                </span>
              </div>
              <div className="flex items-center gap-3 font-mono">
                <span className="font-extrabold text-sm text-slate-900">{remainingCount} سجل</span>
                <span className="text-slate-500 font-bold text-xs">{remainingPercentage}%</span>
              </div>
            </div>
          )}

          {/* زر التبديل بين أعلى 8 وكافة النيابات */}
          {prosecutions.length > 8 && !searchQuery && (
            <div className="pt-2 text-center border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAll((prev) => !prev)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-800 transition-colors cursor-pointer"
              >
                <span>{showAll ? "عرض أعلى 8 نيابات فقط" : `عرض كافة جهات النيابة (${prosecutions.length} جهة)`}</span>
                {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── عداد وتوزيع أنواع السجلات (شكوى / قضية / محضر) ───
interface CaseTypesBreakdownProps {
  complaints: number;
  cases: number;
  reports: number;
  total: number;
}

export function CaseTypesBreakdownWidget({
  complaints,
  cases,
  reports,
  total,
}: CaseTypesBreakdownProps) {
  const complaintPct = total > 0 ? Math.round((complaints / total) * 100) : 0;
  const casePct = total > 0 ? Math.round((cases / total) * 100) : 0;
  const reportPct = total > 0 ? Math.round((reports / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 font-body">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
            <span>توزيع السجلات حسب النوع القانوني</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">حصر القضايا الجنائية والشكاوى المباشرة ومحاضر الشرطة</p>
        </div>
        <span className="text-xs font-bold font-mono text-slate-700 bg-slate-100 px-3 py-1 rounded-lg">
          {total} إجمالي السجلات
        </span>
      </div>

      {/* شريط بياني ثلاثي مجزأ */}
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
        {casePct > 0 && (
          <div
            className="bg-teal-600 h-full transition-all duration-500"
            style={{ width: `${casePct}%` }}
            title={`قضايا: ${cases} (${casePct}%)`}
          />
        )}
        {complaintPct > 0 && (
          <div
            className="bg-sky-500 h-full transition-all duration-500"
            style={{ width: `${complaintPct}%` }}
            title={`شكاوى: ${complaints} (${complaintPct}%)`}
          />
        )}
        {reportPct > 0 && (
          <div
            className="bg-amber-500 h-full transition-all duration-500"
            style={{ width: `${reportPct}%` }}
            title={`محاضر: ${reports} (${reportPct}%)`}
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-900">القضايا (نيابة عامة)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
          </div>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold font-heading text-teal-950">{cases}</span>
            <span className="text-xs text-teal-700 font-semibold">({casePct}%)</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-900">الشكاوى المباشرة</span>
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
          </div>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold font-heading text-sky-950">{complaints}</span>
            <span className="text-xs text-sky-700 font-semibold">({complaintPct}%)</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">المحاضر وأقسام الشرطة</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="flex items-baseline gap-2 font-mono">
            <span className="text-2xl font-bold font-heading text-amber-950">{reports}</span>
            <span className="text-xs text-amber-700 font-semibold">({reportPct}%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

