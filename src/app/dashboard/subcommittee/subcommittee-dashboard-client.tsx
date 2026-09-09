"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Stethoscope,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Users,
  Coins,
  Calendar,
  Eye,
  RotateCcw,
  ArrowRight,
  ChevronLeft,
  Building,
  UserCheck,
  Search,
  Filter,
  BarChart3,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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
import { formatDate } from "@/lib/formatters";

export interface SerializedSubCommitteeCase {
  id: string;
  caseNumber: string;
  caseYear: number;
  registrationType: string;
  complainantName: string;
  respondentName?: string | null;
  hospitalName?: string | null;
  prosecution?: string | null;
  assignedAt?: string | null;
  expectedDueDate?: string | null;
  status: string;
  createdAt: string;
  specialties: Array<{
    id: string;
    specialty: { id: string; name: string };
  }>;
  actions: Array<{
    id: string;
    receivedDate?: string | null;
    meetingDate?: string | null;
    reportDate?: string | null;
    faultDescription?: string | null;
  }>;
  reviewers: Array<{
    id: string;
    doctor?: { name: string } | null;
    user?: { fullName: string } | null;
  }>;
}

export interface Props {
  cases: SerializedSubCommitteeCase[];
  subCommittee: {
    id: string;
    name: string;
    code: string;
    active: boolean;
    deactivationReason?: string | null;
  } | null;
  doctorsCount: number;
  paymentsStats: {
    totalCount: number;
    paidCount: number;
    pendingCount: number;
    totalAmount: number;
    paidAmount: number;
  };
  currentUser?: {
    name?: string | null;
    fullName?: string | null;
    role?: string | null;
    employer?: string | null;
    subCommitteeName?: string | null;
  } | null;
  initialTab?: "overview" | "cases";
}

const STATUS_CONFIG: Record<string, { label: string; variant: "slate" | "amber" | "sky" | "emerald" | "rose" }> = {
  UNDER_SUBCOMMITTEE_REVIEW: { label: "قيد دراسة اللجنة", variant: "amber" },
  PENDING_SUPREME_REVIEW: { label: "بانتظار اعتماد اللجنة العليا", variant: "sky" },
  APPROVED: { label: "معتمد (قرار نهائي)", variant: "emerald" },
  REFERRED_FOR_REVIEW: { label: "محال لإعادة الدراسة", variant: "rose" },
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US").format(amount || 0);
}

export function SubCommitteeDashboardClient({
  cases,
  subCommittee,
  doctorsCount,
  paymentsStats,
  currentUser,
  initialTab = "overview",
}: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "cases">(initialTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const nowMs = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  // الحسابات الإحصائية
  const pending = cases.filter(
    (c) => c.status === "UNDER_SUBCOMMITTEE_REVIEW" || c.status === "REFERRED_FOR_REVIEW"
  ).length;

  const done = cases.filter(
    (c) => c.status === "PENDING_SUPREME_REVIEW" || c.status === "APPROVED"
  ).length;

  const overdueCount = cases.filter((c) => {
    if (c.status === "APPROVED" || c.status === "PENDING_SUPREME_REVIEW") return false;
    if (c.expectedDueDate && new Date(c.expectedDueDate).getTime() < nowMs) return true;
    if (c.assignedAt && nowMs - new Date(c.assignedAt).getTime() > thirtyDaysMs) return true;
    return false;
  }).length;

  const casesWithReviewers = cases.filter((c) => c.reviewers.length > 0).length;

  // الجلسات المجدولة القادمة
  const upcomingMeetings = cases
    .filter((c) => {
      const mDate = c.actions[0]?.meetingDate;
      if (!mDate) return false;
      return new Date(mDate).getTime() >= nowMs - 24 * 60 * 60 * 1000;
    })
    .sort((a, b) => {
      const dateA = new Date(a.actions[0].meetingDate!).getTime();
      const dateB = new Date(b.actions[0].meetingDate!).getTime();
      return dateA - dateB;
    })
    .slice(0, 4);

  // تصفية السجلات لجدول القضايا
  const filteredCases = cases.filter((c) => {
    if (statusFilter !== "ALL" && c.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      const num = `${c.caseNumber}/${c.caseYear}`.toLowerCase();
      const complainant = (c.complainantName || "").toLowerCase();
      const respondent = (c.respondentName || c.hospitalName || "").toLowerCase();
      return num.includes(q) || complainant.includes(q) || respondent.includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-5 font-body">
      {/* ─── كارت الترحيب الجمالي الهادئ للجنة الفرعية ─── */}
      <UserWelcomeCard
        user={{
          ...currentUser,
          role: "SUBCOMMITTEE_MEMBER",
          subCommitteeName: subCommittee?.name || currentUser?.subCommitteeName,
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
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>لوحة قيادة ومؤشرات اللجنة</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("cases")}
            className={`inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all font-heading ${
              activeTab === "cases"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:text-slate-900 border border-slate-200"
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>السجلات والقضايا المحالة ({cases.length})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/subcommittee/doctors"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs font-heading"
          >
            <Users className="w-3.5 h-3.5 text-amber-600" />
            <span>أطباء اللجنة ({doctorsCount})</span>
          </Link>

          <Link
            href="/dashboard/subcommittee/reports"
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs font-heading"
          >
            <BarChart3 className="w-3.5 h-3.5 text-teal-600" />
            <span>التقارير الإحصائية</span>
          </Link>
        </div>
      </div>

      {/* ─── محتوى تبويب: لوحة قيادة ومؤشرات اللجنة ─── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* ١. بطاقات المؤشرات الأربعة للجنة الفرعية */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="إجمالي السجلات المحالة"
              value={`${cases.length} ملف`}
              icon={<FileText className="w-6 h-6" />}
              variant="teal"
              description={`تم إنجاز ${done} تقريراً (${Math.round((done / (cases.length || 1)) * 100)}% معدل الإنجاز)`}
            />

            <StatCard
              title="قيد الدراسة وجلسات الفحص"
              value={`${pending} ملف`}
              icon={<Clock className="w-6 h-6" />}
              variant="amber"
              description={`${casesWithReviewers} ملف تم تشكيل فرقه الطبية الفاحصة`}
            />

            <StatCard
              title="سجلات قاربت أو تجاوزت المهلة"
              value={`${overdueCount} سجل`}
              icon={<AlertTriangle className="w-6 h-6" />}
              variant={overdueCount > 0 ? "rose" : "slate"}
              isZeroNeutral={true}
              description={
                overdueCount > 0
                  ? "تتطلب سرعة تحديد الجلسة أو إصدار التقرير"
                  : "كافة السجلات ضمن الإطار الزمني المحدد (30 يوماً)"
              }
            />

            <StatCard
              title="استحقاق بدلات حضور الجلسات"
              value={`${formatMoney(paymentsStats.totalAmount)} ج.م`}
              icon={<Coins className="w-6 h-6" />}
              variant="emerald"
              description={`تم تسديد ${paymentsStats.paidCount} بدل • متبقي ${paymentsStats.pendingCount} قيد الصرف`}
            />
          </div>

          {/* ٢. أجندة الجلسات القادمة + فريق العمل والاستشاريين */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* الجانب الأيمن (7 أعمدة): أجندة جلسات الفحص القادمة */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold font-heading text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  <span>أجندة جلسات الفحص الطبي المجدولة</span>
                </h2>
                <span className="text-xs text-slate-500 font-body">مواعيد انعقاد اللجنة</span>
              </div>

              <Card className="divide-y divide-slate-100 overflow-hidden shadow-xs border-slate-200">
                {upcomingMeetings.length === 0 ? (
                  <div className="p-8 text-center space-y-2">
                    <div className="w-10 h-10 mx-auto rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-semibold text-slate-700 font-heading">
                      لا توجد جلسات فحص مجدولة قادمة حالياً
                    </p>
                    <p className="text-[11px] text-slate-400 font-body">
                      يمكنك فتح أي سجل محال وتحديد موعد انعقاد جلسته الأولى وتشكيل الفريق الطبي.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab("cases")}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 hover:text-amber-800 font-heading"
                    >
                      <span>استعراض السجلات المحالة وجدولتها</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  upcomingMeetings.map((c) => {
                    const action = c.actions[0];
                    const meetingDateStr = action?.meetingDate;
                    return (
                      <div
                        key={c.id}
                        className="p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono font-heading text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                              سجل #{c.caseNumber} / {c.caseYear}
                            </span>
                            <Badge variant="amber" size="sm">
                              جلسة فحص
                            </Badge>
                          </div>

                          <p className="text-xs text-slate-700 font-medium font-body">
                            المشكو في حقه: {c.respondentName || c.hospitalName || "مستشفى / طبيب"}
                          </p>

                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-body">
                            <span>الفريق الطبي:</span>
                            <span className="font-semibold text-slate-700">
                              {c.reviewers.length > 0
                                ? c.reviewers.map((r) => r.doctor?.name || r.user?.fullName).join("، ")
                                : "بانتظار اكتمال التشكيل"}
                            </span>
                          </div>
                        </div>

                        <div className="text-left space-y-1.5 shrink-0">
                          <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md font-heading">
                            <Clock className="w-3 h-3" />
                            <span>{meetingDateStr ? formatDate(meetingDateStr) : "محدد"}</span>
                          </div>

                          <div>
                            <Link
                              href={`/dashboard/subcommittee/${c.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:text-teal-800 font-heading"
                            >
                              <span>فتح المحضر</span>
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </Card>
            </div>

            {/* الجانب الأيسر (5 أعمدة): جاهزية الفريق الطبي والاستشاريين */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold font-heading text-slate-800 flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-600" />
                  <span>فريق العمل والاستشاريين ({doctorsCount})</span>
                </h2>
                <Link
                  href="/dashboard/subcommittee/doctors"
                  className="text-xs font-semibold text-teal-700 hover:text-teal-800 flex items-center gap-1 font-heading"
                >
                  <span>سجل الأطباء</span>
                  <ChevronLeft className="w-4 h-4" />
                </Link>
              </div>

              <Card className="p-5 space-y-4 border-slate-200 shadow-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 font-heading">
                        {subCommittee?.name || "اللجنة الفرعية المختصة"}
                      </div>
                      <div className="text-[11px] text-slate-500 font-body">
                        كود اللجنة: {subCommittee?.code || "SC-01"}
                      </div>
                    </div>
                  </div>
                  <Badge variant="teal" size="sm">
                    {subCommittee?.active ? "نشطة ومعتمدة" : "معطلة"}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700 font-heading">قواعد العمل المعتمدة:</div>
                  <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside font-body">
                    <li>بدل حضور الجلسة: <strong className="text-emerald-700">5,000 ج.م</strong> لكل عضو فاحص.</li>
                    <li>مهلة إعداد وإصدار التقرير الطبي: <strong className="text-amber-700">30 يوماً</strong> كحد أقصى.</li>
                    <li>إلزامية التحقق من عدم وجود تعارض مصالح للأطباء قبل مباشرة الفحص.</li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href="/dashboard/subcommittee/doctors"
                    className="w-full text-center py-2 px-3 rounded-lg bg-teal-50 text-teal-800 hover:bg-teal-100 text-xs font-bold font-heading transition-colors"
                  >
                    إدارة أسماء وحسابات أطباء اللجنة
                  </Link>
                </div>
              </Card>
            </div>
          </div>

          {/* ٣. جدول أحدث السجلات المحالة للجنة */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold font-heading text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <span>أحدث السجلات المحالة للجنة</span>
              </h2>

              <button
                type="button"
                onClick={() => setActiveTab("cases")}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800 flex items-center gap-1 font-heading"
              >
                <span>عرض كافة السجلات ({cases.length})</span>
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>

            <Card className="p-0 overflow-hidden shadow-xs border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">رقم السجل / السنة</TableHead>
                    <TableHead className="whitespace-nowrap">النوع</TableHead>
                    <TableHead className="min-w-[160px]">المشكو في حقه</TableHead>
                    <TableHead className="whitespace-nowrap">تاريخ الإحالة</TableHead>
                    <TableHead className="whitespace-nowrap">فريق الفحص</TableHead>
                    <TableHead className="whitespace-nowrap">الحالة</TableHead>
                    <TableHead className="text-center whitespace-nowrap">الإجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.slice(0, 5).map((c) => {
                    const statusInfo = STATUS_CONFIG[c.status] ?? { label: c.status, variant: "slate" };
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-bold text-slate-900 font-mono whitespace-nowrap font-heading">
                          {c.caseNumber} / {c.caseYear}
                        </TableCell>
                        <TableCell>
                          <Badge variant="slate" size="sm">
                            {c.registrationType === "COMPLAINT" ? "شكوى" : c.registrationType === "CASE" ? "قضية" : "محضر"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-slate-800 text-xs">
                          {c.respondentName || c.hospitalName || "—"}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-slate-600 whitespace-nowrap">
                          {c.assignedAt ? formatDate(c.assignedAt) : "—"}
                        </TableCell>
                        <TableCell>
                          {c.reviewers.length > 0 ? (
                            <span className="text-xs font-semibold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md">
                              {c.reviewers.length} أطباء
                            </span>
                          ) : (
                            <Badge variant="amber" size="sm">
                              بانتظار التشكيل
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant} size="sm">
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          <Link
                            href={`/dashboard/subcommittee/${c.id}`}
                            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors shadow-2xs font-body"
                          >
                            <span>فتح ودراسة</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          </div>
        </div>
      )}

      {/* ─── محتوى تبويب: السجلات والقضايا المحالة للفحص ─── */}
      {activeTab === "cases" && (
        <div className="space-y-4">
          {/* شريط البحث وفلاتر الحالة */}
          <Card className="p-4 border-slate-200">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث برقم السجل، اسم الشاكي، أو المستشفى..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pr-9 pl-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 font-body"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                <button
                  type="button"
                  onClick={() => setStatusFilter("ALL")}
                  className={`h-9 px-3 text-xs font-semibold rounded-lg shrink-0 transition-colors font-heading ${
                    statusFilter === "ALL" ? "bg-amber-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  الكل ({cases.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("UNDER_SUBCOMMITTEE_REVIEW")}
                  className={`h-9 px-3 text-xs font-semibold rounded-lg shrink-0 transition-colors font-heading ${
                    statusFilter === "UNDER_SUBCOMMITTEE_REVIEW"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  قيد الدراسة
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("PENDING_SUPREME_REVIEW")}
                  className={`h-9 px-3 text-xs font-semibold rounded-lg shrink-0 transition-colors font-heading ${
                    statusFilter === "PENDING_SUPREME_REVIEW"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  بانتظار العليا
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter("APPROVED")}
                  className={`h-9 px-3 text-xs font-semibold rounded-lg shrink-0 transition-colors font-heading ${
                    statusFilter === "APPROVED"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  معتمدة نهائياً
                </button>
              </div>
            </div>
          </Card>

          {/* جدول القضايا المحالة الشامل */}
          <Card className="p-0 overflow-hidden shadow-xs border-slate-200">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 font-heading">السجلات المسندة للجنة</h2>
              <span className="text-xs font-semibold text-slate-500 font-body">{filteredCases.length} قضية</span>
            </div>

            {filteredCases.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-medium font-body">
                لا توجد سجلات مطابقة للبحث أو الفلتر المحدد
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">رقم السجل / السنة</TableHead>
                    <TableHead className="whitespace-nowrap">النوع</TableHead>
                    <TableHead className="min-w-[160px]">المشكو في حقه</TableHead>
                    <TableHead className="min-w-[160px]">التخصصات المعنية</TableHead>
                    <TableHead className="whitespace-nowrap">تاريخ الإحالة</TableHead>
                    <TableHead className="whitespace-nowrap">المهلة المحددة</TableHead>
                    <TableHead className="min-w-[200px]">فريق الفحص</TableHead>
                    <TableHead className="whitespace-nowrap">الحالة</TableHead>
                    <TableHead className="text-center whitespace-nowrap">الإجراء</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.map((c) => {
                    const statusInfo = STATUS_CONFIG[c.status] ?? { label: c.status, variant: "slate" };
                    const respondent = c.respondentName || c.hospitalName;
                    return (
                      <TableRow key={c.id}>
                        <TableCell className="font-bold text-slate-900 font-mono whitespace-nowrap font-heading">
                          {c.caseNumber} / {c.caseYear}
                        </TableCell>

                        <TableCell>
                          <Badge variant="slate" size="sm">
                            {c.registrationType === "COMPLAINT" ? "شكوى" : c.registrationType === "CASE" ? "قضية" : "محضر"}
                          </Badge>
                        </TableCell>

                        <TableCell className="font-medium text-slate-800 text-xs">
                          {respondent ? (
                            <span className="font-semibold text-slate-900 truncate block max-w-[180px]" title={respondent}>
                              {respondent}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {c.specialties.map((s) => (
                              <Badge key={s.id} variant="slate" size="sm">
                                {s.specialty.name}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>

                        <TableCell className="text-xs font-mono text-slate-600 whitespace-nowrap">
                          {c.assignedAt ? formatDate(c.assignedAt) : "—"}
                        </TableCell>

                        <TableCell className="text-xs font-mono font-semibold whitespace-nowrap">
                          {c.expectedDueDate ? (
                            <span className="text-teal-700 font-bold">
                              {formatDate(c.expectedDueDate)}
                            </span>
                          ) : (
                            "30 يوماً"
                          )}
                        </TableCell>

                        <TableCell className="min-w-[200px]">
                          {c.reviewers.length > 0 ? (
                            <div className="flex flex-col gap-1.5 py-1">
                              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200/80 w-fit font-heading">
                                <Users className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                <span>فريق الفحص ({c.reviewers.length})</span>
                              </div>
                              <div className="flex flex-col gap-1">
                                {c.reviewers.map((r) => (
                                  <div
                                    key={r.id}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200/70 px-2 py-0.5 rounded-md w-fit whitespace-nowrap font-body"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />
                                    <span>{r.doctor?.name || r.user?.fullName || "طبيب فاحص"}</span>
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

                        <TableCell>
                          <Badge variant={statusInfo.variant} size="sm">
                            {statusInfo.label}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-center whitespace-nowrap">
                          {c.status === "PENDING_SUPREME_REVIEW" || c.status === "APPROVED" ? (
                            <Link
                              href={`/dashboard/subcommittee/${c.id}`}
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors font-body"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>الاطلاع فقط</span>
                            </Link>
                          ) : c.status === "REFERRED_FOR_REVIEW" ? (
                            <Link
                              href={`/dashboard/subcommittee/${c.id}`}
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 shadow-xs transition-colors font-body animate-pulse"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>فتح وإعادة الدراسة</span>
                            </Link>
                          ) : (
                            <Link
                              href={`/dashboard/subcommittee/${c.id}`}
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 shadow-xs transition-colors font-body"
                            >
                              <span>فتح ودراسة السجل</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
