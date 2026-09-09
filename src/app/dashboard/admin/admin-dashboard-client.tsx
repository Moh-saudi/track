"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  History,
  Scale,
  Coins,
  ShieldAlert,
  Activity,
  Clock,
  Building,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Lock,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  LayoutDashboard,
  UserCheck,
  Monitor,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { UserWelcomeCard } from "@/components/ui/UserWelcomeCard";
import { AdminUsersTable, UserItem, SubCommitteeItem, SpecialtyItem } from "./users-table";
import { SCREEN_LABELS, ROLE_NAMES } from "./audit-logs/audit-logs-client";

export interface Props {
  // إحصائيات عامة
  totalCasesCount: number;
  overdueCasesCount: number;
  casesByStatus: {
    registered: number;
    underSubcommittee: number;
    pendingSupreme: number;
    approved: number;
    referredBack: number;
  };
  totalUsersCount: number;
  liveUsersCount: number;
  todayActiveUsersCount: number;
  todaySessionsCount: number;
  todayLogsCount: number;
  totalLogsCount: number;
  subCommitteesCount: number;
  specialtiesCount: number;
  paymentsStats: {
    totalCount: number;
    paidCount: number;
    pendingCount: number;
    paidAmount: number;
    pendingAmount: number;
  };

  // الأنشطة الحية
  recentLogs: Array<{
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    createdAt: string;
    user?: {
      fullName: string;
      role: string;
      employer?: string | null;
    } | null;
  }>;

  liveUsers: Array<{
    id: string;
    fullName: string;
    role: string;
    employer?: string | null;
    currentPath?: string | null;
    lastSeenAt?: string | null;
    todayActiveMinutes: number;
  }>;

  // لإدارة المستخدمين
  users: UserItem[];
  subCommittees: SubCommitteeItem[];
  specialties: SpecialtyItem[];

  // المستخدم الحالي
  currentUser?: {
    name?: string | null;
    fullName?: string | null;
    role?: string | null;
    employer?: string | null;
  } | null;

  // التبويب المبدئي
  initialTab?: "overview" | "users";
}

// دالة تنسيق الأرقام النقدية بشكل متطابق بين السيرفر والمتصفح لمنع مشاكل الـ Hydration
function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US").format(amount || 0);
}

// دالة حساب الوقت المنقضي بصياغة عربية
function formatRelativeTimeArabic(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return "منذ لحظات";
    if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    if (diffDays === 1) return "أمس";
    return `منذ ${diffDays} يوم`;
  } catch {
    return dateStr;
  }
}

// تحويل الحركات الإجرائية لعنوان عربي واضح وموجز
function humanizeActionShort(action: string, entityType: string) {
  if (action === "CREATE" && entityType === "Case") return "قيد سجل طبي جديد";
  if (action === "CREATE" && entityType === "Attachment") return "رفع وثائق ومرفقات طبية";
  if (action === "ROUTING") return "توجيه سجل للجنة المختصة";
  if (action === "ADMIN_RISK_OVERRIDE") return "تصحيح مسار استثنائي لقرار";
  if (action === "ADMIN_RISK_MODE_ENTER") return "دخول مصادق لوضع المخاطر";
  if (action === "CREATE" && entityType === "SupremeDecision") return "اعتماد قرار اللجنة العليا";
  if (action === "UPDATE" && entityType === "Payment") return "تسديد بدل حضور جلسة";
  if (action === "UPDATE" && entityType === "CaseAction") return "تحديث تقرير الجلسة الفرعية";
  if (action === "SCHEDULE_UPDATE") return "تعديل جدول انعقاد الجلسة";
  if (action === "CREATE" && entityType === "User") return "إنشاء حساب مستخدم جديد";
  if (action === "UPDATE" && entityType === "User") return "تعديل صلاحيات مستخدم";
  if (action === "DELETE") return "حذف قيد من المنظومة";
  return `إجراء ${action} على ${entityType}`;
}

export function AdminDashboardClient({
  totalCasesCount,
  overdueCasesCount,
  casesByStatus,
  totalUsersCount,
  liveUsersCount,
  todayActiveUsersCount,
  todaySessionsCount,
  todayLogsCount,
  totalLogsCount,
  subCommitteesCount,
  specialtiesCount,
  paymentsStats,
  recentLogs,
  liveUsers,
  users,
  subCommittees,
  specialties,
  currentUser,
  initialTab = "overview",
}: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "users">(initialTab);

  return (
    <div className="space-y-5 font-body">
      {/* ─── كارت الحساب الصغير ذو الشفافية الجمالية الهادئة ─── */}
      <UserWelcomeCard user={currentUser} />

      {/* ─── شريط التبويب الأنيق والهادئ ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all font-heading ${
              activeTab === "overview"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>مركز القيادة والمؤشرات المركزية</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all font-heading ${
              activeTab === "users"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>إدارة المستخدمين وحسابات المنظومة ({totalUsersCount})</span>
          </button>
        </div>

        <div className="hidden sm:inline-flex items-center gap-2 text-xs text-slate-500 font-body">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>حالة التشغيل: استقرار تام 100%</span>
        </div>
      </div>

      {/* ─── محتوى تبويب: مركز القيادة والمؤشرات ─── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* ١. بطاقات المؤشرات السيادية الأربعة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="المستخدمون المتصلون الآن"
              value={`${liveUsersCount} متصل`}
              icon={<Users className="w-6 h-6" />}
              variant={liveUsersCount > 0 ? "emerald" : "slate"}
              description={`${todayActiveUsersCount} مستخدم نشط اليوم عبر ${todaySessionsCount} جلسة عمل`}
            />

            <StatCard
              title="العمليات الرقابية لليوم"
              value={`${todayLogsCount} حركة`}
              icon={<History className="w-6 h-6" />}
              variant="sky"
              description={`من إجمالي ${totalLogsCount} عملية مقيدة بسجل التدقيق الرقابي`}
            />

            <StatCard
              title="موقف السجلات والالتزام الزمني"
              value={`${totalCasesCount} سجل وقضية`}
              icon={<Scale className="w-6 h-6" />}
              variant={overdueCasesCount > 0 ? "amber" : "teal"}
              description={
                overdueCasesCount > 0
                  ? `${overdueCasesCount} قضية متأخرة تجاوزت المدة أو معادة للدراسة`
                  : "كافة السجلات الطبية ضمن الإطار الزمني المحدد"
              }
            />

            <StatCard
              title="استحقاقات وبدلات حضور الجلسات"
              value={`${formatMoney(paymentsStats.paidAmount)} ج.م`}
              icon={<Coins className="w-6 h-6" />}
              variant="teal"
              description={`تم تسديد ${paymentsStats.paidCount} بدل • متبقي ${paymentsStats.pendingCount} تحت الصرف`}
            />
          </div>

          {/* ٢. بوابات وغرفة عمليات الوصول السريع (Command Hub Gateways) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-heading text-slate-800 flex items-center gap-2">
                <span className="w-2 h-5 bg-teal-600 rounded-full inline-block" />
                <span>غرفة العمليات وبوابات الإشراف المباشر</span>
              </h2>
              <span className="text-xs text-slate-500 font-body">وصول إداري مباشر لكافة أركان المنظومة</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* بوابة إدارة المستخدمين والصلاحيات */}
              <button
                type="button"
                onClick={() => setActiveTab("users")}
                className="group text-right p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all duration-200 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <Users className="w-5 h-5" />
                  </div>
                  <Badge variant="teal" className="text-[11px]">
                    {totalUsersCount} مستخدم
                  </Badge>
                </div>
                <h3 className="text-sm font-bold font-heading text-slate-800 group-hover:text-teal-700 transition-colors">
                  إدارة المستخدمين والصلاحيات
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed font-body">
                  إضافة مستخدمين، تعيين جهات العمل لفحص تعارض المصالح، وإعادة ضبط كلمات المرور.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-teal-700 group-hover:text-teal-800 font-heading">
                  <span>فتح شاشة الحسابات</span>
                  <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                </div>
              </button>

              {/* بوابة سجل الجلسات وتواجد المستخدمين */}
              <Link
                href="/dashboard/admin/audit-logs"
                className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-sky-500 hover:shadow-md transition-all duration-200 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
                    <Clock className="w-5 h-5" />
                  </div>
                  <Badge variant="sky" className="text-[11px]">
                    {todaySessionsCount} جلسة اليوم
                  </Badge>
                </div>
                <h3 className="text-sm font-bold font-heading text-slate-800 group-hover:text-sky-700 transition-colors">
                  سجل جلسات وتواجد المستخدمين
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed font-body">
                  رصد أوقات الدخول والخروج وفترات بقاء الموظف داخل كل شاشة وتفاصيل نشاطه.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-sky-700 group-hover:text-sky-800 font-heading">
                  <span>استعراض سجل الجلسات</span>
                  <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                </div>
              </Link>

              {/* بوابة سجل الحركات الرقابية الشامل */}
              <Link
                href="/dashboard/admin/audit-actions"
                className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-violet-500 hover:shadow-md transition-all duration-200 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-colors">
                    <History className="w-5 h-5" />
                  </div>
                  <Badge variant="slate" className="text-[11px]">
                    سجل عربي واضح
                  </Badge>
                </div>
                <h3 className="text-sm font-bold font-heading text-slate-800 group-hover:text-violet-700 transition-colors">
                  سجل الحركات الرقابية الشامل
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed font-body">
                  توثيق دائم لكافة العمليات الإجرائية بدون أي شاشات كود، مع مقارنة التعديلات.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-violet-700 group-hover:text-violet-800 font-heading">
                  <span>فتح السجل الرقابي</span>
                  <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                </div>
              </Link>

              {/* بوابة غرفة عمليات إدارة المخاطر وتصحيح المسار */}
              <Link
                href="/dashboard/admin/risk-mode"
                className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-rose-500 hover:shadow-md transition-all duration-200 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-colors">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <Badge variant="rose" className="text-[11px]">
                    بروتوكول الأزمات
                  </Badge>
                </div>
                <h3 className="text-sm font-bold font-heading text-slate-800 group-hover:text-rose-700 transition-colors">
                  غرفة المخاطر وتصحيح المسار
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed font-body">
                  التدخل الاستثنائي لمعالجة القرارات المعيبة وإعادة فتح السجلات بمذكرات مسببة.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-rose-700 group-hover:text-rose-800 font-heading">
                  <span>دخول غرفة المخاطر</span>
                  <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                </div>
              </Link>

              {/* بوابة المستخدمين المتصلين ومدة العمل */}
              <Link
                href="/dashboard/admin/active-users"
                className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all duration-200 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Activity className="w-5 h-5" />
                  </div>
                  <Badge variant="emerald" className="text-[11px]">
                    {liveUsersCount} متصل الآن
                  </Badge>
                </div>
                <h3 className="text-sm font-bold font-heading text-slate-800 group-hover:text-emerald-700 transition-colors">
                  المستخدمون المتصلون ومدة العمل
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed font-body">
                  مرصد التواجد المباشر واحتساب ساعات العمل التفاعلية لكل موظف خلال اليوم.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 group-hover:text-emerald-800 font-heading">
                  <span>متابعة التواجد اللحظي</span>
                  <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                </div>
              </Link>

              {/* بوابة مرصد التوجيه ومتابعة المدد */}
              <Link
                href="/dashboard/follow-up"
                className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-amber-500 hover:shadow-md transition-all duration-200 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <Scale className="w-5 h-5" />
                  </div>
                  <Badge variant="amber" className="text-[11px]">
                    {totalCasesCount} قضية
                  </Badge>
                </div>
                <h3 className="text-sm font-bold font-heading text-slate-800 group-hover:text-amber-700 transition-colors">
                  مرصد التوجيه ومتابعة المدد (SLA)
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed font-body">
                  متابعة توزيع السجلات على اللجان ومطابقة مدد الفحص مع الآجال المقررة.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-amber-700 group-hover:text-amber-800 font-heading">
                  <span>فتح مرصد التوجيه</span>
                  <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                </div>
              </Link>

              {/* بوابة إدارة اللجان الـ 16 والتخصصات */}
              <Link
                href="/dashboard/admin/subcommittees"
                className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all duration-200 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-colors">
                    <Building className="w-5 h-5" />
                  </div>
                  <Badge variant="teal" className="text-[11px]">
                    {subCommitteesCount} لجنة معتمدة
                  </Badge>
                </div>
                <h3 className="text-sm font-bold font-heading text-slate-800 group-hover:text-teal-700 transition-colors">
                  إدارة اللجان الـ 16 والتخصصات
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed font-body">
                  هيكلة اللجان الفرعية، ربط التخصصات الطبية، وإضافة التخصصات الدقيقة.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-teal-700 group-hover:text-teal-800 font-heading">
                  <span>سجل اللجان والتخصصات</span>
                  <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                </div>
              </Link>

              {/* بوابة المنظومة المالية وصرف البدلات */}
              <Link
                href="/dashboard/finance/payments"
                className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all duration-200 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Coins className="w-5 h-5" />
                  </div>
                  <Badge variant="emerald" className="text-[11px]">
                    {paymentsStats.totalCount} استحقاق
                  </Badge>
                </div>
                <h3 className="text-sm font-bold font-heading text-slate-800 group-hover:text-emerald-700 transition-colors">
                  منظومة صرف البدلات والمستحقات
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed font-body">
                  متابعة بدلات حضور الجلسات (5,000 ج.م للفرعية / 8,000 ج.م للعليا) وتوثيق التواريخ.
                </p>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 group-hover:text-emerald-800 font-heading">
                  <span>فتح جدول صرف البدلات</span>
                  <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                </div>
              </Link>
            </div>
          </div>

          {/* ٣. الرصد اللحظي للأنشطة والعمليات (Live Operations Stream) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* الجانب الأيمن (7 أعمدة): شريط العمليات الرقابية الحية */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold font-heading text-slate-800 flex items-center gap-2">
                  <History className="w-5 h-5 text-teal-600" />
                  <span>شريط العمليات والإجراءات الرقابية اللحظية</span>
                </h2>
                <Link
                  href="/dashboard/admin/audit-actions"
                  className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 font-heading"
                >
                  <span>عرض السجل الشامل</span>
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              </div>

              <Card className="divide-y divide-slate-100 overflow-hidden shadow-xs border-slate-200">
                {recentLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    لا توجد حركات مسجلة مؤخراً بالمنظومة
                  </div>
                ) : (
                  recentLogs.slice(0, 6).map((log) => (
                    <div
                      key={log.id}
                      className="p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800 font-heading">
                            {humanizeActionShort(log.action, log.entityType)}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            #{log.entityId.slice(-6)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 font-body">
                          <span>المنفذ:</span>
                          <span className="font-semibold text-slate-700">
                            {log.user?.fullName || "مستخدم النظام"}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-[11px] text-slate-500">
                            {ROLE_NAMES[log.user?.role || ""] || log.user?.role}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-left">
                        <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium font-body">
                          {formatRelativeTimeArabic(log.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </Card>
            </div>

            {/* الجانب الأيسر (5 أعمدة): الموظفون المتصلون الآن */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold font-heading text-slate-800 flex items-center gap-2">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  <span>المتصلون بالمنظومة الآن ({liveUsers.length})</span>
                </h2>
                <Link
                  href="/dashboard/admin/active-users"
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-heading"
                >
                  <span>متابعة التواجد والمدد</span>
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              </div>

              <Card className="divide-y divide-slate-100 overflow-hidden shadow-xs border-slate-200">
                {liveUsers.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">
                      لا يوجد موظفون متصلون حالياً بالمنظومة
                    </p>
                    <p className="text-[11px] text-slate-400">
                      يتم تفعيل المؤشر فور تسجيل دخول أي مستخدم وبدء تفاعله
                    </p>
                  </div>
                ) : (
                  liveUsers.slice(0, 5).map((u) => (
                    <div
                      key={u.id}
                      className="p-3.5 hover:bg-slate-50/80 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-9 h-9 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs font-heading">
                            {u.fullName.slice(0, 1)}
                          </div>
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                        </div>
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-slate-800 font-heading">
                            {u.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-body">
                            {ROLE_NAMES[u.role] || u.role}
                          </div>
                        </div>
                      </div>

                      <div className="text-left space-y-0.5">
                        <div className="inline-flex items-center gap-1 text-[11px] font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md font-body">
                          <Monitor className="w-3 h-3" />
                          <span>{SCREEN_LABELS[u.currentPath || ""] || "الرئيسية"}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          نشط: {u.todayActiveMinutes} دقيقة اليوم
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </Card>
            </div>
          </div>

          {/* ٤. مصفوفة النزاهة والحوكمة والأمان الرقمي (Digital Integrity & Governance) */}
          <Card className="p-6 bg-white border-slate-200 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold font-heading text-slate-800">
                  مصفوفة الأمان والحوكمة المؤسسية والنزاهة الرقمية
                </h3>
                <p className="text-xs text-slate-500 font-body">
                  معايير وزارة الصحة والسكان ورئاسة مجلس الوزراء لحماية البيانات القضائية والطبية الحساسة
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-heading text-slate-800">تشفير الأرقام القومية</span>
                  <Badge variant="teal" className="text-[10px]">مفعل • AES-256</Badge>
                </div>
                <p className="text-[11px] text-slate-500 font-body leading-relaxed">
                  تشفير كامل للأرقام القومية للأطباء وأعضاء اللجان لمنع أي تسريب للمعلومات.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-heading text-slate-800">سجل التدقيق الرقابي</span>
                  <Badge variant="teal" className="text-[10px]">غير قابل للتعديل</Badge>
                </div>
                <p className="text-[11px] text-slate-500 font-body leading-relaxed">
                  توثيق كافة التعديلات والتوجيهات والقرارات بنسخ ما قبل وما بعد التعديل.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-heading text-slate-800">تتبع الجلسات والشاشات</span>
                  <Badge variant="teal" className="text-[10px]">Heartbeat نشط</Badge>
                </div>
                <p className="text-[11px] text-slate-500 font-body leading-relaxed">
                  احتساب فترات العمل الفعلية للموظفين بدقة داخل كل شاشة دون تقدير عشوائي.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-heading text-slate-800">منع تعارض المصالح</span>
                  <Badge variant="teal" className="text-[10px]">تدقيق إلزامي</Badge>
                </div>
                <p className="text-[11px] text-slate-500 font-body leading-relaxed">
                  إثبات جهة عمل الطبيب لمنع تكليفه بأي سجل طبي يخص مستشفى يعمل بها.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ─── محتوى تبويب: إدارة المستخدمين وحسابات المنظومة ─── */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold font-heading text-slate-800">
                إدارة المستخدمين والصلاحيات وجهات العمل
              </h2>
              <p className="text-xs text-slate-500 font-body">
                إضافة مستخدمين، تعيين الأدوار والصلاحيات، فحص جهات العمل، وإعادة ضبط كلمات المرور.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-800 font-heading"
            >
              <ChevronLeft className="w-4 h-4 rotate-180" />
              <span>العودة لمركز القيادة والمؤشرات</span>
            </button>
          </div>

          <AdminUsersTable
            users={users}
            subCommittees={subCommittees}
            specialties={specialties}
          />
        </div>
      )}
    </div>
  );
}
