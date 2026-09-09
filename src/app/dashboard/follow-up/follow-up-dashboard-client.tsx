"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Clock,
  AlertTriangle,
  Inbox,
  CheckCircle2,
  User,
  Users,
  Paperclip,
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  Scale,
  Building2,
  Stethoscope,
  ShieldCheck,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { UserWelcomeCard } from "@/components/ui/UserWelcomeCard";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import {
  SpecialtiesDistributionChart,
  SubCommitteesWorkloadTable,
  SubCommitteeWorkloadItem,
  SpecialtyStat,
} from "@/components/analytics/AnalyticsCharts";
import { ProsecutionNotificationCell } from "@/components/follow-up/ProsecutionNotificationCell";
import { formatDate, formatNumber } from "@/lib/formatters";

export interface SerializedFollowUpCase {
  id: string;
  caseNumber: string;
  caseYear: number;
  registrationType: string;
  respondentName?: string | null;
  hospitalName?: string | null;
  complainantName?: string | null;
  prosecution?: string | null;
  attachmentsCount: number;
  createdAt: string;
  assignedAt?: string | null;
  expectedDueDate?: string | null;
  meetingDate?: string | null;
  meetingDateReason?: string | null;
  prosecutionNotifiedAt?: string | null;
  prosecutionLetterNumber?: string | null;
  prosecutionNotificationNotes?: string | null;
  subCommittee?: { id: string; name: string } | null;
  subCommitteeId?: string | null;
  specialties: Array<{ id: string; specialty: { id: string; name: string } }>;
  status: string;
  meetingReschedules: Array<{
    id: string;
    oldDate?: string | null;
    newDate: string;
    reason: string;
    createdAt: string;
    createdBy?: { fullName: string | null } | null;
  }>;
  reviewers: Array<{
    id: string;
    status: string;
    user?: { fullName: string | null; employer: string | null } | null;
    doctor?: { name: string; employer: string | null } | null;
  }>;
}

export interface FollowUpDashboardProps {
  cases: SerializedFollowUpCase[];
  allSubCommittees: Array<{ id: string; name: string }>;
  specialtiesList: SpecialtyStat[];
  subCommitteesWorkload: SubCommitteeWorkloadItem[];
  currentUser?: {
    name?: string | null;
    fullName?: string | null;
    role?: string | null;
    employer?: string | null;
  } | null;
  initialTab?: "overview" | "unassigned" | "timeline";
}

export function FollowUpDashboardClient({
  cases,
  allSubCommittees,
  specialtiesList,
  subCommitteesWorkload,
  currentUser,
  initialTab = "overview",
}: FollowUpDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "unassigned" | "timeline">(initialTab);

  const now = new Date();

  // 1. السجلات غير الموزعة (بانتظار التوجيه)
  const unassignedCases = cases.filter((c) => c.status === "REGISTERED" || !c.subCommitteeId);

  // السجلات التي تأخر توزيعها أكثر من 3 أيام من تاريخ قيدها
  const delayedUnassigned = unassignedCases.filter((c) => {
    const diffDays = Math.floor((now.getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 3;
  });

  // 2. السجلات قيد دراسة اللجان الفرعية لمتابعة المدد الزمنية
  const inReviewCases = cases.filter(
    (c) => c.subCommitteeId && (c.status === "UNDER_SUBCOMMITTEE_REVIEW" || c.status === "REFERRED_FOR_REVIEW")
  );

  let onTrackCount = 0;
  let nearingDeadlineCount = 0;
  let overdueCount = 0;

  inReviewCases.forEach((c) => {
    if (c.expectedDueDate) {
      const due = new Date(c.expectedDueDate).getTime();
      const diffDays = Math.ceil((due - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        overdueCount++;
      } else if (diffDays <= 5) {
        nearingDeadlineCount++;
      } else {
        onTrackCount++;
      }
    } else {
      onTrackCount++;
    }
  });

  return (
    <div className="space-y-5 font-body">
      {/* ─── كارت الحساب الصغير الهادئ لموظف التوجيه والمتابعة ─── */}
      <UserWelcomeCard
        user={{
          ...currentUser,
          role: "ROUTING_OFFICER",
        }}
      />

      {/* ─── شريط التبويب الأنيق والهادئ ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all font-heading ${
              activeTab === "overview"
                ? "bg-violet-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>لوحة قيادة ومؤشرات التوجيه</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("unassigned")}
            className={`inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all font-heading ${
              activeTab === "unassigned"
                ? "bg-violet-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>بانتظار التوجيه ({unassignedCases.length})</span>
            {delayedUnassigned.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold">
                {delayedUnassigned.length} متأخر
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("timeline")}
            className={`inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all font-heading ${
              activeTab === "timeline"
                ? "bg-violet-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>مرصد مدد اللجان ({inReviewCases.length})</span>
            {overdueCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold">
                {overdueCount} تجاوز المهلة
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {delayedUnassigned.length > 0 && (
            <Badge variant="delayed" size="sm" icon={<AlertTriangle className="w-3.5 h-3.5 text-red-700" />}>
              {delayedUnassigned.length} سجل تأخر توجيهه
            </Badge>
          )}
        </div>
      </div>

      {/* ─── محتوى تبويب: لوحة قيادة ومؤشرات التوجيه ─── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* ١. بطاقات المؤشرات الأربعة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="بانتظار التوجيه"
              value={formatNumber(unassignedCases.length)}
              icon={<Inbox className="w-6 h-6" />}
              variant="sky"
              description="سجلات مقيدة تتطلب الإحالة للجان الفرعية"
            />
            <StatCard
              title="تأخر توجيهها (> 3 أيام)"
              value={formatNumber(delayedUnassigned.length)}
              icon={<AlertTriangle className="w-6 h-6" />}
              variant="rose"
              isZeroNeutral={true}
              description="تجاوزت المهلة المعيارية للتوزيع"
            />
            <StatCard
              title="لجان ضمن المهلة"
              value={formatNumber(onTrackCount)}
              icon={<CheckCircle2 className="w-6 h-6" />}
              variant="emerald"
              description="قضايا تسير ضمن الـ 30 يوماً القانونية"
            />
            <StatCard
              title="لجان متأخرة عن المهلة"
              value={formatNumber(overdueCount)}
              icon={<Clock className="w-6 h-6" />}
              variant="rose"
              isZeroNeutral={true}
              description="قضايا تجاوزت الموعد المقرر لتقرير الفحص"
            />
          </div>

          {/* ٢. بوابات التوجيه السريع والتنبيهات العاجلة */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-violet-400 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center font-bold">
                    <Inbox className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {unassignedCases.length} سجل للتوجيه
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold font-heading text-slate-900">
                    قضايا وسجلات بانتظار التوجيه وتحديد اللجان
                  </h3>
                  <p className="text-xs text-slate-500 font-body mt-1 leading-relaxed">
                    إحالة كل قضية مسجلة حديثاً إلى لجنتها الفرعية المختصة من بين الـ 16 لجنة وتحديد مهلة الإنجاز الرسمية.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("unassigned")}
                  className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold font-body transition-colors shadow-xs"
                >
                  <span>فتح جدول السجلات للتوجيه</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-teal-400 transition-all flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200">
                    {inReviewCases.length} قيد الدراسة
                  </span>
                </div>
                <div>
                  <h3 className="text-base font-bold font-heading text-slate-900">
                    مرصد الالتزام الزمني ومتابعة تقارير اللجان
                  </h3>
                  <p className="text-xs text-slate-500 font-body mt-1 leading-relaxed">
                    متابعة جلسات اللجان، استهلاك مهلة الـ 30 يوماً، مخاطبات النيابة، وسجل تأجيلات الجلسات وفِرق الفحص.
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab("timeline")}
                  className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold font-body transition-colors shadow-xs"
                >
                  <span>فتح مرصد مدد اللجان الفرعية</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ٣. التحليلات: التوزيع التخصصي وأعباء اللجان الـ 16 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <SpecialtiesDistributionChart
                specialties={specialtiesList}
                title="أعلى التخصصات بالجمهورية"
                subtitle="ترتيب التخصصات الطبية الأكثر طلباً في الشكاوى والقضايا"
              />
            </div>
            <div className="lg:col-span-2">
              <SubCommitteesWorkloadTable
                subCommittees={subCommitteesWorkload}
                title="مؤشرات أداء وتوزيع اللجان الفرعية الـ 16"
                subtitle="متابعة عبء القضايا، المتأخرات، ومعدل إنجاز كل لجنة على مستوى الجمهورية"
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── محتوى تبويب: السجلات بانتظار التوجيه ─── */}
      {activeTab === "unassigned" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-600" />
              <h2 className="text-lg font-bold font-heading text-slate-900">
                السجلات بانتظار التوجيه إلى اللجان الفرعية
              </h2>
              <Badge variant="slate" size="sm">
                {unassignedCases.length} سجل
              </Badge>
            </div>
          </div>

          {unassignedCases.length === 0 ? (
            <div className="p-8 text-center text-emerald-800 text-xs font-semibold bg-emerald-50 rounded-2xl border border-emerald-200 font-body">
              تم توجيه وتوزيع كافة السجلات المقيدة بنجاح
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>موقف التوزيع</TableHead>
                  <TableHead>رقم السجل / السنة</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المشكو في حقه</TableHead>
                  <TableHead>الشاكي / النيابة</TableHead>
                  <TableHead>المرفقات</TableHead>
                  <TableHead>التخصصات المعنية</TableHead>
                  <TableHead>تاريخ القيد</TableHead>
                  <TableHead className="text-center">إجراء التوجيه</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unassignedCases.map((c) => {
                  const daysSinceReg = Math.floor((now.getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                  const isDelayed = daysSinceReg >= 3;

                  return (
                    <TableRow key={c.id} delayed={isDelayed}>
                      <TableCell>
                        {isDelayed ? (
                          <Badge variant="delayed" size="sm" icon={<AlertTriangle className="w-3 h-3 text-red-700" />}>
                            متأخر (+{daysSinceReg} أيام)
                          </Badge>
                        ) : (
                          <Badge variant="slate" size="sm">
                            منذ {daysSinceReg === 0 ? "اليوم" : `${daysSinceReg} يوم`}
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="font-bold text-slate-900 font-mono whitespace-nowrap font-heading">
                        {c.caseNumber} / {c.caseYear}
                      </TableCell>

                      <TableCell>
                        <Badge variant="slate" size="sm">
                          {c.registrationType === "COMPLAINT" ? "شكوى" : c.registrationType === "CASE" ? "قضية" : "محضر"}
                        </Badge>
                      </TableCell>

                      <TableCell className="text-xs">
                        {c.respondentName || c.hospitalName ? (
                          <span className="truncate flex items-center gap-1 max-w-[180px] font-semibold text-slate-900" title={c.respondentName || c.hospitalName || ""}>
                            <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{c.respondentName || c.hospitalName}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="text-xs">
                          <p className="font-semibold text-slate-800">{c.complainantName || "—"}</p>
                          <p className="text-[11px] text-slate-500">{c.prosecution || "—"}</p>
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium font-mono border border-slate-200">
                          <Paperclip className="w-3 h-3 text-slate-500" />
                          <span>{c.attachmentsCount} ملف</span>
                        </span>
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {c.specialties.length > 0 ? (
                            c.specialties.map((s) => (
                              <Badge key={s.id} variant="teal" size="sm">
                                {s.specialty.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs">بانتظار التوجيه</span>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-mono text-slate-600 whitespace-nowrap">
                        {formatDate(c.createdAt)}
                      </TableCell>

                      <TableCell className="text-center whitespace-nowrap">
                        <Link
                          href={`/dashboard/follow-up/${c.id}/assign`}
                          className={`inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg text-xs font-medium transition-colors ${
                            isDelayed
                              ? "bg-rose-600 text-white hover:bg-rose-700"
                              : "bg-teal-600 text-white hover:bg-teal-700"
                          }`}
                        >
                          <span>توجيه وتحديد المهلة</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* ─── محتوى تبويب: مرصد مدد اللجان الفرعية ─── */}
      {activeTab === "timeline" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
              <h2 className="text-lg font-bold font-heading text-slate-900">
                مرصد متابعة مدد إنجاز اللجان الفرعية (30 يوماً)
              </h2>
              <Badge variant="review" size="sm">
                {inReviewCases.length} قيد الدراسة
              </Badge>
            </div>
            <span className="text-xs text-slate-500 font-medium font-body">
              مؤشر الالتزام بالمهلة القانونية الرسمية
            </span>
          </div>

          {inReviewCases.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-medium bg-white rounded-2xl border border-slate-200 font-body">
              لا توجد قضايا قيد دراسة اللجان الفرعية حالياً
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم السجل / السنة</TableHead>
                  <TableHead>اللجنة الفرعية المحال إليها</TableHead>
                  <TableHead>التخصصات</TableHead>
                  <TableHead>تاريخ التوجيه</TableHead>
                  <TableHead>موعد انعقاد الجلسة</TableHead>
                  <TableHead>مخاطبة النيابة بموعد الجلسة</TableHead>
                  <TableHead>الموعد النهائي للإنجاز</TableHead>
                  <TableHead>نسبة استهلاك المهلة</TableHead>
                  <TableHead>موقف الالتزام بالمهلة</TableHead>
                  <TableHead className="min-w-[200px]">فريق الفحص</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inReviewCases.map((c) => {
                  const assignedDate = c.assignedAt ? new Date(c.assignedAt) : new Date(c.createdAt);
                  const dueDate = c.expectedDueDate ? new Date(c.expectedDueDate) : null;

                  let totalDays = 30;
                  let daysElapsed = 0;
                  let daysRemaining = 0;
                  let percent = 0;
                  let isOverdue = false;
                  let isCritical = false;

                  if (dueDate) {
                    totalDays = Math.max(1, Math.round((dueDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24)));
                    daysElapsed = Math.max(0, Math.floor((now.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24)));
                    daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    percent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));
                    if (daysRemaining < 0) isOverdue = true;
                    else if (daysRemaining <= 5) isCritical = true;
                  }

                  return (
                    <TableRow key={c.id} delayed={isOverdue}>
                      <TableCell className="font-bold text-slate-900 font-mono whitespace-nowrap font-heading">
                        {c.caseNumber} / {c.caseYear}
                      </TableCell>

                      <TableCell className="font-semibold text-slate-800 text-xs">
                        {c.subCommittee?.name || "—"}
                      </TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                          {c.specialties.map((s) => (
                            <Badge key={s.id} variant="slate" size="sm">
                              {s.specialty.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>

                      <TableCell className="text-xs font-mono text-slate-600 whitespace-nowrap">
                        {formatDate(assignedDate)}
                      </TableCell>

                      {/* موعد انعقاد الجلسة وسجل كافة التعديلات والتأجيلات */}
                      <TableCell className="text-xs font-mono">
                        {c.meetingDate ? (
                          <div className="space-y-1.5 min-w-[210px]">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-900 whitespace-nowrap">{formatDate(c.meetingDate)}</span>
                              {c.meetingReschedules.length > 0 ? (
                                <Badge variant="delayed" size="sm">
                                  عُدّل ({c.meetingReschedules.length})
                                </Badge>
                              ) : c.meetingDateReason ? (
                                <Badge variant="delayed" size="sm">
                                  مُعدّل
                                </Badge>
                              ) : null}
                            </div>

                            {/* سجل كافة التعديلات والتأجيلات إن وجدت */}
                            {c.meetingReschedules.length > 0 ? (
                              <details className="group mt-1">
                                <summary className="cursor-pointer text-[11px] font-bold text-amber-900 bg-amber-50 hover:bg-amber-100/90 px-2 py-1 rounded-md border border-amber-200 flex items-center justify-between transition-colors list-none select-none">
                                  <span className="flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>سجل كافة التعديلات ({c.meetingReschedules.length})</span>
                                  </span>
                                  <span className="text-[10px] text-amber-700 group-open:rotate-180 transition-transform font-mono">▼</span>
                                </summary>
                                <div className="mt-1.5 space-y-1.5 pr-1 border-r-2 border-amber-300">
                                  {c.meetingReschedules.map((r, idx) => (
                                    <div
                                      key={r.id}
                                      className="p-2 rounded-md bg-white border border-amber-200/80 shadow-2xs text-[11px] space-y-1 font-body"
                                    >
                                      <div className="flex items-center justify-between gap-1 text-[10px] text-slate-500 border-b border-slate-100 pb-1">
                                        <span className="font-bold text-amber-950">
                                          تعديل #{c.meetingReschedules.length - idx}
                                        </span>
                                        <span className="font-mono text-slate-500">{formatDate(r.createdAt)}</span>
                                      </div>
                                      <div className="text-[10px] text-slate-600 flex items-center gap-1 font-mono">
                                        {r.oldDate && (
                                          <span className="line-through text-slate-400">{formatDate(r.oldDate)}</span>
                                        )}
                                        <span className="font-bold text-teal-800">← {formatDate(r.newDate)}</span>
                                      </div>
                                      <p className="text-slate-800 whitespace-normal leading-tight">
                                        <strong className="text-amber-950">السبب: </strong>
                                        <span>{r.reason}</span>
                                      </p>
                                      {r.createdBy?.fullName && (
                                        <span className="text-[10px] text-slate-500 block truncate">
                                          القائم بالتعديل: {r.createdBy.fullName}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </details>
                            ) : c.meetingDateReason ? (
                              <div
                                className="p-1.5 rounded-md bg-amber-50 border border-amber-200 text-[11px] text-amber-900 max-w-[210px] whitespace-normal leading-tight font-body"
                                title={c.meetingDateReason}
                              >
                                <strong className="text-amber-950 font-bold block mb-0.5">سبب التعديل:</strong>
                                <span>{c.meetingDateReason}</span>
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <Badge variant="amber" size="sm">
                            لم يُحدد بعد
                          </Badge>
                        )}
                      </TableCell>

                      {/* مخاطبة النيابة بموعد الجلسة */}
                      <TableCell className="whitespace-nowrap">
                        <ProsecutionNotificationCell
                          caseId={c.id}
                          caseNumber={c.caseNumber}
                          caseYear={c.caseYear}
                          prosecutionName={c.prosecution}
                          notifiedAt={c.prosecutionNotifiedAt}
                          letterNumber={c.prosecutionLetterNumber}
                          notes={c.prosecutionNotificationNotes}
                        />
                      </TableCell>

                      <TableCell className="text-xs font-mono font-semibold whitespace-nowrap">
                        {dueDate ? formatDate(dueDate) : "غير محدد"}
                      </TableCell>

                      {/* شريط استهلاك المهلة */}
                      <TableCell className="min-w-[150px]">
                        <div className="w-full">
                          <div className="flex justify-between text-[11px] font-medium text-slate-500 mb-1">
                            <span>مضى {daysElapsed} يوم</span>
                            <span>{percent}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isOverdue ? "bg-red-600" : isCritical ? "bg-amber-500" : "bg-emerald-600"
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* موقف الالتزام */}
                      <TableCell>
                        {isOverdue ? (
                          <Badge variant="delayed" size="sm" icon={<AlertCircle className="w-3 h-3 text-red-700" />}>
                            متأخرة (+{Math.abs(daysRemaining)} يوم)
                          </Badge>
                        ) : isCritical ? (
                          <Badge variant="review" size="sm" icon={<Clock className="w-3 h-3 text-amber-700" />}>
                            أوشكت (متبقي {daysRemaining} أيام)
                          </Badge>
                        ) : (
                          <Badge variant="approved" size="sm" icon={<CheckCircle2 className="w-3 h-3 text-emerald-700" />}>
                            في المهلة (متبقي {daysRemaining} يوم)
                          </Badge>
                        )}
                      </TableCell>

                      {/* فريق الفحص */}
                      <TableCell className="min-w-[200px]">
                        {c.reviewers.length > 0 ? (
                          <div className="flex flex-col gap-1.5 py-1">
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/80 w-fit font-heading">
                              <Users className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>فريق الفحص ({c.reviewers.length})</span>
                            </div>
                            <div className="flex flex-col gap-1">
                              {c.reviewers.map((rev) => (
                                <div
                                  key={rev.id}
                                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200/70 px-2 py-0.5 rounded-md w-fit whitespace-nowrap font-body"
                                >
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${rev.status === "RECUSED" ? "bg-rose-500" : "bg-teal-600"}`} />
                                  <span>{rev.doctor?.name || rev.user?.fullName || "عضو فاحص"}</span>
                                  {rev.status === "RECUSED" && (
                                    <span className="text-[10px] text-rose-600 font-bold mr-1">(تنحى)</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <Badge variant="amber" size="sm">
                            بانتظار التشكيل
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
