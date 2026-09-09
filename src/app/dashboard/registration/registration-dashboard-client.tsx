"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ClipboardList,
  PlusCircle,
  BarChart3,
  Clock,
  CheckCircle2,
  FileText,
  Building2,
  Calendar,
  Search,
  ArrowRight,
  ChevronLeft,
  ShieldCheck,
  Inbox,
  AlertCircle,
  UserCheck,
  Globe,
  Layers,
  Edit3,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { UserWelcomeCard } from "@/components/ui/UserWelcomeCard";
import { CasesTable, SerializedCase } from "./cases-table";
import { formatNumber } from "@/lib/formatters";

export interface Props {
  cases: SerializedCase[];
  totalSystemCasesCount: number;
  myTotalCasesCount: number;
  myTodayCount: number;
  todaySystemCount: number;
  myPendingRoutingCount: number;
  myComplaintsCount: number;
  myProsecutionCasesCount: number;
  myReportsCount: number;
  subCommittees: Array<{ id: string; name: string }>;
  currentUser?: {
    name?: string | null;
    fullName?: string | null;
    role?: string | null;
    employer?: string | null;
  } | null;
  initialTab?: "overview" | "cases";
}

export function RegistrationDashboardClient({
  cases,
  totalSystemCasesCount,
  myTotalCasesCount,
  myTodayCount,
  todaySystemCount,
  myPendingRoutingCount,
  myComplaintsCount,
  myProsecutionCasesCount,
  myReportsCount,
  subCommittees,
  currentUser,
  initialTab = "overview",
}: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "cases">(initialTab);

  // أحدث السجلات المقيدة مؤخراً
  const recentCases = cases.slice(0, 6);

  // النسبة المئوية لإنجاز الموظف من إجمالي المنظومة
  const myPercentage =
    totalSystemCasesCount > 0
      ? Math.round((myTotalCasesCount / totalSystemCasesCount) * 100)
      : 0;

  return (
    <div className="space-y-5 font-body">
      {/* ─── كارت الترحيب الجمالي الهادئ لموظف التسجيل ─── */}
      <UserWelcomeCard
        user={{
          ...currentUser,
          role: "REGISTRATION_CLERK",
        }}
      />

      {/* ─── شريط التبويب الأنيق والهادئ ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all font-heading ${
              activeTab === "overview"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>لوحة قيادة ومؤشرات التسجيل</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cases")}
            className={`inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all font-heading ${
              activeTab === "cases"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>سجل القضايا والشكاوى والمحاضر ({totalSystemCasesCount})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/registration/reports"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs font-heading"
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
            <span>تقارير التسجيل</span>
          </Link>

          <Link
            href="/dashboard/registration/new"
            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-2xs font-heading"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>قيد سجل جديد</span>
          </Link>
        </div>
      </div>

      {/* ─── محتوى تبويب: لوحة قيادة ومؤشرات التسجيل المخصصة للموظف ─── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* ١. بطاقات المؤشرات الأربعة المخصصة لموظف التسجيل ومساره العملي */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* كارت 1: إجمالي السجلات بالمنظومة منذ بدء العمل */}
            <StatCard
              title="إجمالي السجلات بالمنظومة"
              value={formatNumber(totalSystemCasesCount)}
              icon={<Globe className="w-6 h-6" />}
              variant="slate"
              description="إجمالي السجلات المقيدة منذ بدء تشغيل المنظومة"
            />

            {/* كارت 2: إجمالي السجلات الخاصة بحسابه هو الشخصي */}
            <StatCard
              title="إجمالي تسجيلاتي الشخصية"
              value={formatNumber(myTotalCasesCount)}
              icon={<UserCheck className="w-6 h-6" />}
              variant="sky"
              description={`تمثل ${myPercentage}% من إجمالي سجلات المنظومة (${formatNumber(totalSystemCasesCount)})`}
            />

            {/* كارت 3: تسجيلات حسابه اليوم */}
            <StatCard
              title="تسجيلاتي المقيدة اليوم"
              value={formatNumber(myTodayCount)}
              icon={<Clock className="w-6 h-6" />}
              variant={myTodayCount > 0 ? "teal" : "slate"}
              description={`سجلات قيدتها اليوم (من إجمالي ${formatNumber(todaySystemCount)} بالمنظومة)`}
            />

            {/* كارت 4: سجلات حسابه بانتظار التوجيه */}
            <StatCard
              title="سجلاتي بانتظار التوجيه"
              value={formatNumber(myPendingRoutingCount)}
              icon={<Inbox className="w-6 h-6" />}
              variant={myPendingRoutingCount > 0 ? "amber" : "slate"}
              isZeroNeutral={true}
              description={`قضايا: ${myProsecutionCasesCount} • شكاوى: ${myComplaintsCount} • محاضر: ${myReportsCount}`}
            />
          </div>

          {/* ٢. بوابات العمليات السريعة + الرصد اللحظي */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* الجانب الأيمن (7 أعمدة): أحدث السجلات المقيدة مع توضيح المسجّل والتعديل */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold font-heading text-slate-800 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-sky-600" />
                  <span>أحدث السجلات المقيدة على المنظومة</span>
                </h2>

                <button
                  type="button"
                  onClick={() => setActiveTab("cases")}
                  className="text-xs font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-1 font-heading"
                >
                  <span>عرض الكل ({totalSystemCasesCount})</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>

              <Card className="divide-y divide-slate-100 overflow-hidden shadow-xs border-slate-200">
                {recentCases.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    لا توجد سجلات مسجلة مؤخراً
                  </div>
                ) : (
                  recentCases.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1.5 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold font-mono font-heading text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                            #{c.caseNumber} / {c.caseYear}
                          </span>
                          <Badge variant="slate" size="sm">
                            {c.registrationType === "COMPLAINT" ? "شكوى" : c.registrationType === "CASE" ? "قضية" : "محضر"}
                          </Badge>
                          {c.incomingDate && (
                            <span className="text-[11px] font-mono text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200/60 font-medium">
                              وارد: {c.incomingDate.split("T")[0]}
                            </span>
                          )}

                          {/* مسجل السجل */}
                          {c.isCreatedByMe ? (
                            <span className="text-[10px] font-bold text-sky-800 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                              قيدتك أنت
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                              بواسطة: {c.createdByName}
                            </span>
                          )}

                          {/* حالة التعديل */}
                          {c.isModified && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              مُعدّل
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-600 font-body truncate">
                          <span>الشاكي:</span>
                          <span className="font-semibold text-slate-800 truncate">
                            {c.complainantName || "—"}
                          </span>
                          {c.prosecution && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500 text-[11px]">
                                النيابة: {c.prosecution}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-left">
                        <Link
                          href={`/dashboard/registration/${c.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-900 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200 font-heading transition-colors shadow-2xs"
                        >
                          <span>عرض الملف</span>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </Card>
            </div>

            {/* الجانب الأيسر (5 أعمدة): بوابات القيد وإرشادات النزاهة */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold font-heading text-slate-800 flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-teal-600" />
                  <span>بوابات الإدخال والتسجيل السريع</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <Link
                  href="/dashboard/registration/new"
                  className="group p-4 rounded-xl bg-gradient-to-l from-teal-50 to-white border border-teal-200 hover:border-teal-500 hover:shadow-xs transition-all flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold">
                      <PlusCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 font-heading group-hover:text-teal-700 transition-colors">
                        قيد قضية أو شكوى أو محضر جديد
                      </div>
                      <div className="text-[11px] text-slate-500 font-body">
                        تسجيل بيانات النيابة، الشاكي، والمشكو في حقه، وتاريخ الوارد.
                      </div>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:-translate-x-1 transition-all shrink-0" />
                </Link>

                <button
                  type="button"
                  onClick={() => setActiveTab("cases")}
                  className="w-full text-right p-4 rounded-xl bg-white border border-slate-200 hover:border-sky-500 hover:shadow-xs transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center font-bold group-hover:bg-sky-600 group-hover:text-white transition-colors">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 font-heading group-hover:text-sky-700 transition-colors">
                        البحث في الأرشيف والسجلات المقيدة
                      </div>
                      <div className="text-[11px] text-slate-500 font-body">
                        البحث برقم السجل، اسم الشاكي، النيابة، أو معرفة القائم بالقيد وموقف التعديل.
                      </div>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:text-sky-600 group-hover:-translate-x-1 transition-all shrink-0" />
                </button>
              </div>

              {/* بطاقة معايير وضوابط القيد الحكومية */}
              <Card className="p-4 bg-slate-50 border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 font-heading">
                  <ShieldCheck className="w-4 h-4 text-teal-600" />
                  <span>ضوابط القيد والتوثيق المعتمدة:</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside font-body">
                  <li><strong>تاريخ الوارد:</strong> إلزامي لتوثيق تاريخ الاستلام الحقيقي من النيابة.</li>
                  <li><strong>المرفقات:</strong> رفع صورة المحضر والتقرير الطبي المبدئي بصيغة PDF.</li>
                  <li><strong>التوجيه:</strong> منوط حصرياً بموظف المتابعة والتوجيه بعد اكتمال القيد.</li>
                </ul>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ─── محتوى تبويب: سجل القضايا والشكاوى والمحاضر ─── */}
      {activeTab === "cases" && (
        <CasesTable initialCases={cases} subCommittees={subCommittees} />
      )}
    </div>
  );
}
