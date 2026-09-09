import React from "react";
import {
  Stethoscope,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Award,
  TrendingUp,
  Building2,
  FileCheck2,
} from "lucide-react";

export interface SpecialtyStat {
  id?: string;
  name: string;
  count: number;
  percentage: number;
}

interface SpecialtiesDistributionChartProps {
  specialties: SpecialtyStat[];
  title?: string;
  subtitle?: string;
}

export function SpecialtiesDistributionChart({
  specialties,
  title = "توزيع القضايا حسب التخصصات الطبية",
  subtitle = "ترتيب التخصصات الأكثر طلباً وفحصاً ومعدل تمثيلها الإحصائي",
}: SpecialtiesDistributionChartProps) {
  const topSpecialty = specialties.length > 0 ? specialties[0] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5 font-body">
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

      {specialties.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-xs">
          لا توجد بيانات تخصصات مسجلة لهذه الفترة
        </div>
      ) : (
        <div className="space-y-3.5">
          {specialties.map((spec, idx) => {
            const isTop = idx === 0 && spec.count > 0;
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
                    <span>{spec.name}</span>
                  </span>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="font-bold text-slate-900">{spec.count} قضية</span>
                    <span className="text-slate-400 text-[11px] min-w-[42px] text-left">
                      {spec.percentage}%
                    </span>
                  </div>
                </div>

                {/* شريط بياني نسبي */}
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
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

// ─── جدول أعباء عمل اللجان الفرعية الـ 16 (Workload Across 16 SubCommittees) ───
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

export function SubCommitteesWorkloadTable({
  subCommittees,
  title = "مؤشرات عمل وتوزيع اللجان الفرعية الـ 16",
  subtitle = "مقارنة أعباء القضايا ومعدلات الإنجاز والمتأخرات عبر كافة لجان الجمهورية",
}: SubCommitteesWorkloadTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden font-body">
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-600" />
            <span>{title}</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg self-start sm:self-auto font-mono">
          {subCommittees.length} لجنة فرعية معتمدة
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs text-right">
          <thead className="bg-slate-50 text-slate-600 font-heading font-bold border-b border-slate-200 text-[11px]">
            <tr>
              <th className="p-3.5 whitespace-nowrap">اسم اللجنة الفرعية</th>
              <th className="p-3.5 text-center whitespace-nowrap">إجمالي الوارد</th>
              <th className="p-3.5 text-center whitespace-nowrap">قيد الفحص</th>
              <th className="p-3.5 text-center whitespace-nowrap">تم الإنجاز والرفع</th>
              <th className="p-3.5 text-center whitespace-nowrap">إعادة دراسة</th>
              <th className="p-3.5 text-center whitespace-nowrap">متأخرات المهلة</th>
              <th className="p-3.5 text-center whitespace-nowrap">متوسط الرد</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {subCommittees.map((sc) => (
              <tr key={sc.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-3.5 font-bold text-slate-900">
                  {sc.name}
                </td>
                <td className="p-3.5 text-center font-bold font-mono text-slate-900">
                  {sc.totalCases}
                </td>
                <td className="p-3.5 text-center">
                  <span className="inline-block px-2 py-0.5 rounded-full font-bold font-mono text-[11px] bg-amber-50 text-amber-800 border border-amber-200">
                    {sc.inReviewCases}
                  </span>
                </td>
                <td className="p-3.5 text-center">
                  <span className="inline-block px-2 py-0.5 rounded-full font-bold font-mono text-[11px] bg-teal-50 text-teal-800 border border-teal-200">
                    {sc.completedCases}
                  </span>
                </td>
                <td className="p-3.5 text-center font-mono">
                  {sc.referredCases > 0 ? (
                    <span className="inline-block px-2 py-0.5 rounded-full font-bold text-[11px] bg-rose-50 text-rose-800 border border-rose-200">
                      {sc.referredCases}
                    </span>
                  ) : (
                    <span className="text-slate-400">0</span>
                  )}
                </td>
                <td className="p-3.5 text-center font-mono">
                  {sc.overdueCases > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[11px] bg-red-50 text-red-800 border border-red-200">
                      <AlertTriangle className="w-3 h-3 text-red-600" />
                      <span>{sc.overdueCases}</span>
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-bold">0</span>
                  )}
                </td>
                <td className="p-3.5 text-center font-mono font-bold text-slate-700">
                  {sc.avgTurnaroundDays > 0 ? `${sc.avgTurnaroundDays} يوم` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── جراف توزيع جهات النيابة العامة (Prosecutions Distribution Chart) ───
export interface ProsecutionStat {
  id?: string;
  name: string;
  count: number;
  percentage: number;
}

interface ProsecutionsDistributionChartProps {
  prosecutions: ProsecutionStat[];
  title?: string;
  subtitle?: string;
}

export function ProsecutionsDistributionChart({
  prosecutions,
  title = "توزيع القضايا حسب جهات النيابة العامة",
  subtitle = "حصر النيابات الكلية والجزئية الأكثر إحالة للقضايا ونسبتها المئوية",
}: ProsecutionsDistributionChartProps) {
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

      {prosecutions.length === 0 ? (
        <div className="p-8 text-center text-slate-400 text-xs">
          لا توجد سجلات نيابة مسجلة خلال النطاق الزمني المحدد
        </div>
      ) : (
        <div className="space-y-3">
          {prosecutions.slice(0, 7).map((proc, idx) => {
            const isTop = idx === 0 && proc.count > 0;
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
                    <span className="truncate max-w-[200px] sm:max-w-[280px]" title={proc.name}>
                      {proc.name}
                    </span>
                  </span>
                  <div className="flex items-center gap-3 font-mono">
                    <span className="font-bold text-slate-900">{proc.count} سجل</span>
                    <span className="text-slate-400 text-[11px] min-w-[38px] text-left">
                      {proc.percentage}%
                    </span>
                  </div>
                </div>

                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isTop ? "bg-sky-600" : "bg-sky-400"
                    }`}
                    style={{ width: `${Math.max(proc.percentage, 4)}%` }}
                  />
                </div>
              </div>
            );
          })}
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

