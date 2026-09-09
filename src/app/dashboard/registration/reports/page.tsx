"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDate, formatDateTime, formatNumber } from "@/lib/formatters";
import {
  ClipboardList,
  Download,
  Printer,
  BarChart3,
  User,
  Zap,
  TrendingUp,
  Filter,
  Users,
} from "lucide-react";

interface UserWorkload {
  id: string;
  fullName: string;
  email: string;
  role: string;
  totalRegistered: number;
  todayRegistered: number;
  periodRegistered: number;
  sharePercent: number;
}

interface CaseItem {
  id: string;
  caseNumber: string;
  caseYear: number;
  registrationType: "COMPLAINT" | "CASE" | "REPORT";
  complainantName: string | null;
  respondentName: string | null;
  hospitalName?: string | null;
  prosecution: string | null;
  prosecutionRel: { id: string; name: string } | null;
  attachmentsCount: number;
  status: string;
  createdAt: string;
  createdBy: { id: string; fullName: string; email: string; role: string };
  subCommittee: { id: string; name: string } | null;
}

interface ReportData {
  metrics: {
    globalTotalCases: number;
    myTotalCases: number;
    globalTodayCount: number;
    myTodayCount: number;
    filteredTotal: number;
    myContributionPercent: number;
  };
  usersWorkload: UserWorkload[];
  typeBreakdown: {
    COMPLAINT: number;
    CASE: number;
    REPORT: number;
  };
  prosecutions: { id: string; name: string }[];
  cases: CaseItem[];
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
}

const TYPE_CONFIG: Record<string, { label: string; badge: string }> = {
  COMPLAINT: { label: "شكوى", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  CASE:      { label: "قضية", badge: "bg-purple-50 text-purple-800 border-purple-200" },
  REPORT:    { label: "محضر", badge: "bg-slate-100 text-slate-800 border-slate-300" },
};

const STATUS_LABELS: Record<string, string> = {
  REGISTERED: "بانتظار التوجيه",
  UNDER_SUBCOMMITTEE_REVIEW: "قيد دراسة اللجنة الفرعية",
  PENDING_SUPREME_REVIEW: "بانتظار اعتماد اللجنة العليا",
  APPROVED: "معتمد (قرار نهائي)",
  REFERRED_FOR_REVIEW: "محال لإعادة الدراسة",
  CLOSED: "مغلق",
};

export default function RegistrationReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // فلاتر البحث والاستخراج
  const [prosecutionId, setProsecutionId] = useState("ALL");
  const [registrationType, setRegistrationType] = useState("ALL");
  const [complainantName, setComplainantName] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [createdById, setCreatedById] = useState("ALL");

  const [activeTab, setActiveTab] = useState<"summary" | "cases" | "workload">("summary");

  function fetchReport() {
    setLoading(true);
    const params = new URLSearchParams();
    if (prosecutionId !== "ALL") params.set("prosecutionId", prosecutionId);
    if (registrationType !== "ALL") params.set("registrationType", registrationType);
    if (complainantName.trim()) params.set("complainantName", complainantName.trim());
    if (respondentName.trim()) params.set("respondentName", respondentName.trim());
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (createdById !== "ALL") params.set("createdById", createdById);

    fetch(`/api/registration/reports?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) {
          setData(json);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchReport();
  }, []);

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchReport();
  }

  function handleResetFilters() {
    setProsecutionId("ALL");
    setRegistrationType("ALL");
    setComplainantName("");
    setRespondentName("");
    setStartDate("");
    setEndDate("");
    setCreatedById("ALL");

    setLoading(true);
    fetch("/api/registration/reports")
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) setData(json);
      })
      .finally(() => setLoading(false));
  }

  function handleExportCSV() {
    if (!data || !data.cases.length) return;
    const headers = [
      "رقم السجل",
      "سنة السجل",
      "النوع",
      "اسم الشاكي",
      "المشكو في حقه",
      "النيابة",
      "الموظف المسجل",
      "تاريخ القيد",
      "عدد المرفقات",
      "الحالة",
    ];

    const rows = data.cases.map((c) => [
      `"${c.caseNumber}"`,
      `"${c.caseYear}"`,
      `"${TYPE_CONFIG[c.registrationType]?.label || c.registrationType}"`,
      `"${c.complainantName || ""}"`,
      `"${c.respondentName || c.hospitalName || ""}"`,
      `"${c.prosecutionRel?.name || c.prosecution || ""}"`,
      `"${c.createdBy?.fullName || ""}"`,
      `"${formatDate(c.createdAt)}"`,
      `"${c.attachmentsCount}"`,
      `"${STATUS_LABELS[c.status] || c.status}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `تقرير_قيد_السجلات_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <div className="space-y-6">
      {/* ─── رأس الصفحة الموحد ─── */}
      <div className="print:hidden">
        <PageHeader
          breadcrumbs={[
            { label: "الرئيسية", href: "/dashboard" },
            { label: "قيد السجلات", href: "/dashboard/registration" },
            { label: "تقارير ومعدلات التسجيل" },
          ]}
          title="تقارير ومعدلات تسجيل القضايا والشكاوى"
          description="مؤشرات أداء القيد اليومية والشهرية واستخراج البيانات الإحصائية."
          actions={
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/registration"
                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 shadow-xs"
              >
                <ClipboardList className="w-3.5 h-3.5 text-slate-500" />
                <span>سجل القضايا</span>
              </Link>
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={!data || data.cases.length === 0}
                className="inline-flex items-center gap-1.5 h-10 px-3.5 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-medium hover:bg-slate-50 shadow-xs disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>تصدير Excel</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة التقرير</span>
              </button>
            </div>
          }
        />
      </div>

      {/* ترويسة رسمية خاصة بالطباعة الورقية فقط */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-800">جمهورية مصر العربية</p>
            <p className="text-xs font-bold text-slate-800">رئاسة مجلس الوزراء</p>
            <p className="text-xs font-bold text-slate-900">اللجنة العليا للمسؤولية الطبية وسلامة المريض</p>
            <p className="text-[11px] text-slate-600">الأمانة الفنية لقيد وتوثيق الموضوعات</p>
          </div>
          <div className="text-center">
            <h2 className="text-base font-black text-slate-900">تقرير حصر ومعدلات تسجيل القضايا والشكاوى</h2>
            <p className="text-xs text-slate-600 font-mono mt-1">تاريخ الاستخراج: {formatDateTime(new Date())}</p>
          </div>
          <div className="text-left text-xs font-bold text-slate-700">
            <p>الموظف المستخرج: {data?.currentUser?.name}</p>
            <p className="font-mono">إجمالي السجلات المستخرجة: {data?.cases.length || 0}</p>
          </div>
        </div>
      </div>

      {/* بطاقات المؤشرات ومعدلات التشغيل اليومية والعامة */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="stat-card">
          <div className="stat-icon bg-slate-100 text-slate-800"><BarChart3 className="w-5 h-5 text-slate-700" /></div>
          <div>
            <p className="text-2xl font-black text-slate-900 font-mono">
              {formatNumber(data?.metrics.globalTotalCases)}
            </p>
            <p className="text-xs font-bold text-slate-500">إجمالي القضايا عموماً</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-blue-50 text-blue-700 border border-blue-200"><User className="w-5 h-5 text-sky-700" /></div>
          <div>
            <p className="text-2xl font-black text-blue-700 font-mono">
              {formatNumber(data?.metrics.myTotalCases)}
            </p>
            <p className="text-xs font-bold text-slate-500">سجلات هذا الحساب</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-emerald-50 text-emerald-700 border border-emerald-200"><Zap className="w-5 h-5 text-emerald-700" /></div>
          <div>
            <p className="text-2xl font-black text-emerald-700 font-mono">
              {formatNumber(data?.metrics.myTodayCount)}
            </p>
            <p className="text-xs font-bold text-slate-500">قيد هذا الحساب اليوم</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-purple-50 text-purple-700 border border-purple-200"><TrendingUp className="w-5 h-5 text-purple-700" /></div>
          <div>
            <p className="text-2xl font-black text-purple-700 font-mono">
              {data?.metrics.myContributionPercent}%
            </p>
            <p className="text-xs font-bold text-slate-500">معدل تشغيل الحساب</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-amber-50 text-amber-700 border border-amber-200"><Filter className="w-5 h-5 text-amber-700" /></div>
          <div>
            <p className="text-2xl font-black text-amber-700 font-mono">
              {formatNumber(data?.metrics.filteredTotal)}
            </p>
            <p className="text-xs font-bold text-slate-500">السجلات حسب الفلترة</p>
          </div>
        </div>
      </div>

      {/* قسم الفلاتر للبحث واستخراج التقارير — بدون أي تلميحات للحقول وفقاً للتعليمات الصارمة */}
      <div className="card bg-white p-4 print:hidden">
        <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">تصفية واستخراج تقارير السجلات</span>
          <span className="text-xs font-mono font-bold text-teal-800">
            نتائج البحث: {formatNumber(data?.cases.length)} سجل
          </span>
        </div>

        <form onSubmit={handleFilterSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* النيابة */}
            <div>
              <label className="label">النيابة العامة</label>
              <select
                value={prosecutionId}
                onChange={(e) => setProsecutionId(e.target.value)}
                className="input"
              >
                <option value="ALL">جميع النيابات</option>
                {data?.prosecutions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* النوع */}
            <div>
              <label className="label">نوع السجل</label>
              <select
                value={registrationType}
                onChange={(e) => setRegistrationType(e.target.value)}
                className="input"
              >
                <option value="ALL">جميع الأنواع</option>
                <option value="COMPLAINT">شكوى</option>
                <option value="CASE">قضية</option>
                <option value="REPORT">محضر</option>
              </select>
            </div>

            {/* الشاكي */}
            <div>
              <label className="label">اسم الشاكي</label>
              <input
                type="text"
                value={complainantName}
                onChange={(e) => setComplainantName(e.target.value)}
                className="input"
              />
            </div>

            {/* المشكو في حقه */}
            <div>
              <label className="label">المشكو في حقه</label>
              <input
                type="text"
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                className="input"
              />
            </div>

            {/* من تاريخ */}
            <div>
              <label className="label">من تاريخ</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input font-mono"
              />
            </div>

            {/* إلى تاريخ */}
            <div>
              <label className="label">إلى تاريخ</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="input font-mono"
              />
            </div>

            {/* حساب الموظف */}
            <div>
              <label className="label">الموظف المسجل</label>
              <select
                value={createdById}
                onChange={(e) => setCreatedById(e.target.value)}
                className="input"
              >
                <option value="ALL">جميع حسابات التسجيل</option>
                {data?.usersWorkload.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({formatNumber(u.totalRegistered)} سجل)
                  </option>
                ))}
              </select>
            </div>

            {/* أزرار الفلترة */}
            <div className="flex items-end gap-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 justify-center"
              >
                {loading ? "جاري الفرز..." : "تطبيق الفلترة"}
              </button>
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 border border-slate-300"
              >
                إعادة ضبط
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* تبويبات العرض (التقرير التفصيلي / معدلات التشغيل لكل حساب) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 print:hidden">
        <button
          onClick={() => setActiveTab("summary")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "summary"
              ? "bg-teal-600 text-white shadow-sm"
              : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" /><span>قائمة السجلات والتقرير التفصيلي</span> ({formatNumber(data?.cases.length)})
        </button>

        <button
          onClick={() => setActiveTab("workload")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "workload"
              ? "bg-teal-600 text-white shadow-sm"
              : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
          }`}
        >
          <Users className="w-3.5 h-3.5" /><span>معدلات تشغيل الحسابات منفصلة</span> ({formatNumber(data?.usersWorkload.length)})
        </button>
      </div>

      {/* التبويب الأول: قائمة السجلات المقيدة والتفصيلية */}
      {(activeTab === "summary" || typeof window !== "undefined") && (
        <div className={`space-y-4 ${activeTab !== "summary" ? "hidden print:block" : ""}`}>
          {/* ملخص أعداد الأنواع في التقرير الحالي */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900">الشكاوى</span>
              <span className="text-lg font-black text-blue-900 font-mono">
                {formatNumber(data?.typeBreakdown.COMPLAINT)}
              </span>
            </div>
            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg flex items-center justify-between">
              <span className="text-xs font-bold text-purple-900">القضايا</span>
              <span className="text-lg font-black text-purple-900 font-mono">
                {formatNumber(data?.typeBreakdown.CASE)}
              </span>
            </div>
            <div className="p-3 bg-slate-100 border border-slate-300 rounded-lg flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">المحاضر</span>
              <span className="text-lg font-black text-slate-900 font-mono">
                {formatNumber(data?.typeBreakdown.REPORT)}
              </span>
            </div>
          </div>

          <div className="card p-0 overflow-hidden">
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                بيانات السجلات المشمولة بالتقرير ({formatNumber(data?.cases.length)})
              </span>
            </div>

            {loading ? (
              <div className="p-12 text-center text-slate-500 text-xs font-bold">
                جاري تحميل بيانات التقرير...
              </div>
            ) : !data?.cases.length ? (
              <div className="p-12 text-center text-slate-400 text-xs font-bold">
                لا توجد سجلات مطابقة لشروط الفلترة المحددة
              </div>
            ) : (
              <div className="table-wrapper border-0 rounded-none shadow-none">
                <table className="table-custom">
                  <thead>
                    <tr>
                      <th>رقم السجل / السنة</th>
                      <th>النوع</th>
                      <th>الشاكي</th>
                      <th>المشكو في حقه</th>
                      <th>النيابة</th>
                      <th>الموظف المسجل</th>
                      <th>تاريخ القيد</th>
                      <th>المرفقات</th>
                      <th>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cases.map((c) => {
                      const typeInfo = TYPE_CONFIG[c.registrationType] ?? {
                        label: c.registrationType,
                        badge: "bg-slate-100",
                      };
                      return (
                        <tr key={c.id}>
                          <td className="font-bold text-slate-900 font-mono whitespace-nowrap">
                            {c.caseNumber} / {c.caseYear}
                          </td>
                          <td>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold border ${typeInfo.badge}`}>
                              {typeInfo.label}
                            </span>
                          </td>
                          <td className="font-bold text-slate-800 text-xs">
                            {c.complainantName || "—"}
                          </td>
                          <td className="font-medium text-slate-800 text-xs">
                            {c.respondentName || c.hospitalName || "—"}
                          </td>
                          <td className="text-xs text-slate-700">
                            {c.prosecutionRel?.name || c.prosecution || "—"}
                          </td>
                          <td className="text-xs font-bold text-slate-800 whitespace-nowrap">
                            {c.createdBy?.fullName || "—"}
                          </td>
                          <td className="text-xs font-mono text-slate-600 whitespace-nowrap">
                            {formatDate(c.createdAt)}
                          </td>
                          <td className="text-xs font-mono text-slate-700 whitespace-nowrap">
                            {c.attachmentsCount} ملف
                          </td>
                          <td className="text-xs whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold">
                              {STATUS_LABELS[c.status] || c.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* التبويب الثاني: معدلات تشغيل الحسابات منفصلة */}
      {activeTab === "workload" && (
        <div className="space-y-4">
          <div className="card p-0 overflow-hidden">
            <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">
                جدول معدلات تشغيل حسابات موظفي التسجيل
              </span>
            </div>

            <div className="table-wrapper border-0 rounded-none shadow-none">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>اسم الموظف / الحساب</th>
                    <th>الدور الوظيفي</th>
                    <th>إجمالي السجلات المقيدة</th>
                    <th>معدل تسجيل اليوم</th>
                    <th>السجلات في الفترة المحددة</th>
                    <th>نسبة المشاركة في إجمالي التشغيل</th>
                    <th className="print:hidden">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.usersWorkload.map((u) => {
                    const isCurrent = u.id === data.currentUser.id;
                    return (
                      <tr key={u.id} className={isCurrent ? "bg-blue-50/40 font-bold" : ""}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 text-xs">
                              {u.fullName}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 text-[10px] font-bold border border-blue-200">
                                حسابك الحالي
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="text-xs text-slate-600">
                          {u.role === "REGISTRATION_CLERK"
                            ? "موظف قيد السجلات"
                            : u.role === "ADMIN"
                            ? "مدير المنظومة"
                            : u.role}
                        </td>
                        <td className="font-mono font-black text-slate-900 text-sm">
                          {formatNumber(u.totalRegistered)}
                        </td>
                        <td className="font-mono font-bold text-emerald-700 text-sm">
                          {formatNumber(u.todayRegistered)}
                        </td>
                        <td className="font-mono font-bold text-purple-700 text-sm">
                          {formatNumber(u.periodRegistered)}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-teal-600 h-2 rounded-full"
                                style={{ width: `${Math.min(u.sharePercent, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-bold text-slate-700">
                              {u.sharePercent}%
                            </span>
                          </div>
                        </td>
                        <td className="print:hidden">
                          <button
                            onClick={() => {
                              setCreatedById(u.id);
                              setActiveTab("summary");
                              // trigger fetch for this clerk
                              setLoading(true);
                              const params = new URLSearchParams();
                              if (prosecutionId !== "ALL") params.set("prosecutionId", prosecutionId);
                              if (registrationType !== "ALL") params.set("registrationType", registrationType);
                              if (complainantName.trim()) params.set("complainantName", complainantName.trim());
                              if (respondentName.trim()) params.set("respondentName", respondentName.trim());
                              if (startDate) params.set("startDate", startDate);
                              if (endDate) params.set("endDate", endDate);
                              params.set("createdById", u.id);
                              fetch(`/api/registration/reports?${params.toString()}`)
                                .then((res) => res.json())
                                .then((json) => {
                                  if (!json.error) setData(json);
                                })
                                .finally(() => setLoading(false));
                            }}
                            className="px-2.5 py-1 rounded bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
                          >
                            عرض سجلاته فقط
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
