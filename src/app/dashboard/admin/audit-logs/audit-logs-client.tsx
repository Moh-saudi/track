"use client";

import { useState, useMemo } from "react";
import {
  Search,
  Filter,
  History,
  ShieldAlert,
  User,
  Clock,
  Eye,
  X,
  FileText,
  AlertCircle,
  ArrowRight,
  Database,
  Calendar,
  Layers,
  Activity,
  CheckCircle2,
  Building2,
  Monitor,
  ExternalLink,
  ChevronLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table";

export interface UserSessionItem {
  id: string;
  userId: string;
  sessionDate: string; // YYYY-MM-DD
  loginAt: string;
  lastActiveAt: string;
  logoutAt: string | null;
  totalMinutes: number;
  screenTimes: Record<string, number> | null;
  actionsCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    role: string;
    employer?: string | null;
    subCommittee?: { name: string } | null;
  } | null;
}

export interface AuditLogItem {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  userId: string;
  beforeData: any;
  afterData: any;
  createdAt: string;
  user?: {
    fullName: string;
    email: string;
    role: string;
    employer?: string | null;
  } | null;
}

interface Props {
  initialSessions: UserSessionItem[];
  initialLogs: AuditLogItem[];
  users: Array<{ id: string; fullName: string; role?: string; employer?: string | null }>;
  initialTab?: "sessions" | "actions";
}

// أسماء الشاشات الرسمية باللغة العربية
export const SCREEN_LABELS: Record<string, string> = {
  "/dashboard": "لوحة المتابعة العامة",
  "/dashboard/registration": "سجل القضايا والشكاوى",
  "/dashboard/registration/new": "قيد سجل جديد",
  "/dashboard/registration/reports": "تقارير معدلات التسجيل",
  "/dashboard/follow-up": "مرصد التوجيه ومتابعة المدد",
  "/dashboard/subcommittee": "دراسة السجلات باللجنة الفرعية",
  "/dashboard/subcommittee/reports": "تقارير اللجنة الفرعية",
  "/dashboard/subcommittee/doctors": "سجل أطباء واستشاري اللجنة",
  "/dashboard/supreme": "لوحة تحليلات اللجنة العليا",
  "/dashboard/supreme/cases": "مراجعة واعتماد قرارات اللجنة العليا",
  "/dashboard/supreme/schedule": "أجندة وجلسات اللجنة العليا",
  "/dashboard/finance": "لوحة المؤشرات المالية",
  "/dashboard/finance/payments": "صرف بدلات حضور الجلسات",
  "/dashboard/finance/doctors": "الحسابات المصرفية للأطباء",
  "/dashboard/admin": "إدارة المستخدمين والصلاحيات",
  "/dashboard/admin/subcommittees": "إدارة اللجان والتخصصات",
  "/dashboard/admin/specialties": "سجل التخصصات الطبية",
  "/dashboard/admin/prosecutions": "سجل جهات النيابة العامة",
  "/dashboard/admin/risk-mode": "وضع إدارة المخاطر وتصحيح المسار",
  "/dashboard/admin/audit-logs": "سجل الجلسات والحركات الرقابية",
  "/dashboard/admin/active-users": "المستخدمون المتصلون ومدة العمل",
  "/dashboard/profile": "الملف الشخصي وإعدادات الأمان",
};

// أسماء الأدوار الرسمية
export const ROLE_NAMES: Record<string, string> = {
  ADMIN: "مدير المنظومة",
  FOLLOW_UP_OFFICER: "موظف المتابعة والتوجيه",
  REGISTRATION_CLERK: "موظف التسجيل والقيد",
  SUBCOMMITTEE_MEMBER: "عضو لجنة فرعية",
  SUPREME_COMMITTEE: "عضو اللجنة العليا",
  FINANCE: "الشؤون المالية",
  RISK_OFFICER: "مسؤول إدارة المخاطر",
};

// تنسيق المبالغ النقدية بشكل ثابت بين السيرفر والعميل
function formatMoney(amount: number | string | undefined | null): string {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("en-US").format(num);
}

// تحويل الدقائق إلى صيغة عربية (ساعات ودقائق)
function formatMinutesArabic(totalMin: number): string {
  if (!totalMin || totalMin <= 0) return "أقل من دقيقة";
  const hours = Math.floor(totalMin / 60);
  const minutes = totalMin % 60;
  if (hours > 0 && minutes > 0) return `${hours} ساعة و ${minutes} دقيقة`;
  if (hours > 0) return `${hours} ساعة`;
  return `${minutes} دقيقة`;
}

// تنسيق التاريخ والوقت
function formatDateTimeArabic(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

function formatDateOnlyArabic(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

// تحويل كائن الحركة الرقابية إلى نصوص وتفاصيل مفهومة بدون JSON إطلاقاً
function humanizeAuditLog(log: AuditLogItem) {
  const { entityType, action, beforeData, afterData } = log;
  let title = "إجراء إداري عام";
  let summary = "تم تسجيل العملية في قاعدة البيانات الرقابية";
  const changesList: Array<{ label: string; before: string; after: string }> = [];

  const statusMap: Record<string, string> = {
    NOT_PAID: "لم يُسدَّد",
    PAID: "تم التسديد",
    UNDER_SETTLEMENT: "تحت التسوية",
    REGISTERED: "مسجل — بانتظار التوجيه",
    UNDER_SUBCOMMITTEE_REVIEW: "تحت دراسة اللجنة الفرعية",
    PENDING_SUPREME_REVIEW: "بانتظار اعتماد اللجنة العليا",
    REFERRED_FOR_REVIEW: "محال لإعادة الدراسة",
    APPROVED: "معتمد — قرار نهائي",
    CLOSED: "مغلق",
  };

  if (entityType === "Payment") {
    title = action === "CREATE" ? "استحقاق بدل جلسة جديد" : "تسديد وتحديث بدل حضور جلسة";
    const amount = afterData?.amount || beforeData?.amount || 5000;
    const recipient = afterData?.recipientRole || beforeData?.recipientRole || "عضو لجنة";
    summary = `بدل حضور جلسة (${recipient}) بقيمة ${formatMoney(amount)} جنيه مصري`;

    if (beforeData?.status || afterData?.status) {
      changesList.push({
        label: "حالة السداد المالي",
        before: statusMap[beforeData?.status] || beforeData?.status || "لم يُسدَّد",
        after: statusMap[afterData?.status] || afterData?.status || "تم التسديد",
      });
    }
    if (afterData?.paidAt) {
      changesList.push({
        label: "تاريخ السداد الفعلي",
        before: "غير مسدد",
        after: formatDateOnlyArabic(afterData.paidAt),
      });
    }
    changesList.push({
      label: "قيمة البدل المقرر",
      before: `${formatMoney(amount)} ج.م`,
      after: `${formatMoney(amount)} ج.م`,
    });
  } else if (entityType === "Case") {
    if (action === "CREATE") {
      title = "قيد سجل طبي جديد";
      summary = `قيد سجل برقم (${afterData?.caseNumber || "جديد"}) — مقدم الشكوى: (${afterData?.complainantName || "غير محدد"})`;
      changesList.push(
        { label: "نوع السجل", before: "—", after: afterData?.registrationType === "COMPLAINT" ? "شكوى مواطن" : afterData?.registrationType === "REPORT" ? "محضر شرطة" : "قضية نيابة" },
        { label: "جهة النيابة / الشرطة", before: "—", after: afterData?.prosecution || "—" },
        { label: "المحافظة", before: "—", after: afterData?.governorate || "—" }
      );
    } else if (action === "ROUTING") {
      title = "توجيه السجل إلى اللجنة الفرعية";
      summary = `إحالة السجل للجنة الفاحصة المختصة لبدء دراسة الخطأ الطبي`;
      changesList.push(
        { label: "حالة السجل", before: "بانتظار التوجيه", after: "قيد الدراسة باللجنة الفرعية" },
        { label: "اللجنة الموجه إليها", before: "—", after: afterData?.subCommitteeName || "اللجنة الفرعية المختصة" }
      );
    } else if (action.includes("RISK")) {
      title = "تصحيح مسار استثنائي (وضع المخاطر)";
      summary = `إعادة فتح وتصحيح مسار السجل بموجب سند إداري ومذكرة رسمية`;
      changesList.push(
        { label: "المسار الجديد", before: statusMap[beforeData?.status] || "معتمد", after: statusMap[afterData?.status] || "إعادة للدراسة" },
        { label: "رقم السند أو القرار الآمر", before: "—", after: afterData?.riskOverrideDocument || "مذكرة إدارية" },
        { label: "مبرر القرار وتوصيف المخاطرة", before: "—", after: afterData?.riskOverrideReason || "—" }
      );
    } else {
      title = "تحديث بيانات السجل";
      summary = `تعديل ومتابعة إجراءات السجل الطبي`;
      if (beforeData?.status || afterData?.status) {
        changesList.push({
          label: "مرحلة السجل",
          before: statusMap[beforeData?.status] || beforeData?.status || "—",
          after: statusMap[afterData?.status] || afterData?.status || "—",
        });
      }
    }
  } else if (entityType === "User") {
    title = action === "CREATE" ? "إنشاء حساب مستخدم جديد" : "تعديل صلاحيات أو كلمة مرور مستخدم";
    summary = `حساب المستخدم: ${afterData?.fullName || beforeData?.fullName || log.entityId}`;
    if (afterData?.role) {
      changesList.push({
        label: "الدور والصلاحية",
        before: ROLE_NAMES[beforeData?.role] || beforeData?.role || "—",
        after: ROLE_NAMES[afterData?.role] || afterData?.role || "—",
      });
    }
    if (afterData?.employer) {
      changesList.push({
        label: "جهة العمل (تعارض المصالح)",
        before: beforeData?.employer || "—",
        after: afterData?.employer || "—",
      });
    }
    if (afterData?.active !== undefined) {
      changesList.push({
        label: "حالة تفعيل الحساب",
        before: beforeData?.active ? "نشط" : "معطل",
        after: afterData?.active ? "نشط" : "معطل",
      });
    }
  } else if (entityType === "SubCommittee") {
    title = action === "CREATE" ? "إضافة لجنة فرعية جديدة" : "تعديل أو تعليق نشاط لجنة فرعية";
    summary = `اللجنة: ${afterData?.name || beforeData?.name || "اللجنة الفرعية"}`;
    if (afterData?.active !== undefined) {
      changesList.push({
        label: "حالة نشاط اللجنة",
        before: beforeData?.active ? "مفعلة وتستقبل قضايا" : "موقوفة مؤقتاً",
        after: afterData?.active ? "مفعلة وتستقبل قضايا" : "موقوفة مؤقتاً",
      });
    }
  } else if (entityType === "SystemSecurity") {
    title = "إجراء أمني على النظام";
    summary = afterData?.message || "تم تسجيل عملية أمنية";
  }

  // إذا لم يكن هناك تغييرات محددة، نضع الحقول العامة بدون أكواد
  if (changesList.length === 0 && afterData) {
    Object.keys(afterData).forEach((k) => {
      if (!["id", "createdAt", "updatedAt", "passwordHash", "subCommitteeId", "userId"].includes(k)) {
        changesList.push({
          label: k,
          before: beforeData?.[k] !== undefined ? String(beforeData[k]) : "—",
          after: String(afterData[k]),
        });
      }
    });
  }

  return { title, summary, changesList };
}

export function AuditLogsClient({ initialSessions, initialLogs, users, initialTab = "sessions" }: Props) {
  // التبويب النشط: sessions (سجل الجلسات والشاشات) أو actions (سجل الحركات الإجرائية)
  const [activeTab, setActiveTab] = useState<"sessions" | "actions">(initialTab);

  // فلاتر سجل الجلسات
  const [sessionUserFilter, setSessionUserFilter] = useState("ALL");
  const [sessionDateFilter, setSessionDateFilter] = useState("ALL");
  const [sessionCustomDate, setSessionCustomDate] = useState("");
  const [sessionStatusFilter, setSessionStatusFilter] = useState("ALL");
  const [sessionSearch, setSessionSearch] = useState("");

  // فلاتر سجل الحركات
  const [actionSearch, setActionSearch] = useState("");
  const [actionEntityFilter, setActionEntityFilter] = useState("ALL");
  const [actionTypeFilter, setActionTypeFilter] = useState("ALL");
  const [actionUserFilter, setActionUserFilter] = useState("ALL");

  // نوافذ التفاصيل
  const [selectedSessionForActions, setSelectedSessionForActions] = useState<UserSessionItem | null>(null);
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogItem | null>(null);

  // تصفية الجلسات
  const filteredSessions = useMemo(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    return initialSessions.filter((s) => {
      // فلتر المستخدم
      if (sessionUserFilter !== "ALL" && s.userId !== sessionUserFilter) return false;

      // فلتر التاريخ
      if (sessionDateFilter === "TODAY" && s.sessionDate !== todayStr) return false;
      if (sessionDateFilter === "YESTERDAY" && s.sessionDate !== yesterday) return false;
      if (sessionDateFilter === "LAST_7_DAYS" && s.sessionDate < sevenDaysAgo) return false;
      if (sessionDateFilter === "CUSTOM" && sessionCustomDate && s.sessionDate !== sessionCustomDate) return false;

      // فلتر الحالة
      if (sessionStatusFilter === "ACTIVE" && !s.isActive) return false;
      if (sessionStatusFilter === "ENDED" && s.isActive) return false;

      // البحث
      if (sessionSearch.trim()) {
        const q = sessionSearch.toLowerCase().trim();
        const userName = s.user?.fullName?.toLowerCase() || "";
        const email = s.user?.email?.toLowerCase() || "";
        const employer = s.user?.employer?.toLowerCase() || "";
        return userName.includes(q) || email.includes(q) || employer.includes(q);
      }

      return true;
    });
  }, [initialSessions, sessionUserFilter, sessionDateFilter, sessionCustomDate, sessionStatusFilter, sessionSearch]);

  // تصفية الحركات
  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      if (actionEntityFilter !== "ALL" && log.entityType !== actionEntityFilter) return false;
      if (actionTypeFilter !== "ALL" && log.action !== actionTypeFilter) return false;
      if (actionUserFilter !== "ALL" && log.userId !== actionUserFilter) return false;

      if (actionSearch.trim()) {
        const q = actionSearch.toLowerCase().trim();
        const userName = log.user?.fullName?.toLowerCase() || "";
        const entityId = log.entityId?.toLowerCase() || "";
        const action = log.action?.toLowerCase() || "";
        const entityType = log.entityType?.toLowerCase() || "";
        return userName.includes(q) || entityId.includes(q) || action.includes(q) || entityType.includes(q);
      }

      return true;
    });
  }, [initialLogs, actionEntityFilter, actionTypeFilter, actionUserFilter, actionSearch]);

  // استخراج الحركات الخاصة بجلسة محددة
  const sessionActions = useMemo(() => {
    if (!selectedSessionForActions) return [];
    const sessionDate = selectedSessionForActions.sessionDate;
    const userId = selectedSessionForActions.userId;
    return initialLogs.filter((l) => {
      const logDate = new Date(l.createdAt).toISOString().split("T")[0];
      return l.userId === userId && logDate === sessionDate;
    });
  }, [selectedSessionForActions, initialLogs]);

  return (
    <div className="space-y-6">
      {/* ─── التبويبات العلوية الرئيسية ─── */}
      <div className="flex border-b border-slate-200 bg-white p-2 rounded-2xl shadow-2xs gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("sessions")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold font-heading transition-all ${
            activeTab === "sessions"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>سجل جلسات وتواجد المستخدمين وفترة استخدام الشاشات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("actions")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs sm:text-sm font-bold font-heading transition-all ${
            activeTab === "actions"
              ? "bg-teal-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <History className="w-4 h-4" />
          <span>سجل الحركات والإجراءات الرقابية الموثقة</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {/* التبويب الأول: سجل جلسات واستخدام المستخدمين (المطلوب نصاً من المستخدم)       */}
      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "sessions" && (
        <div className="space-y-4">
          {/* شريط فلاتر الجلسات */}
          <Card className="p-4 bg-white border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* البحث باسم الموظف أو جهة العمل */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={sessionSearch}
                    onChange={(e) => setSessionSearch(e.target.value)}
                    placeholder="ابحث باسم الموظف أو البريد أو جهة العمل..."
                    className="w-full h-10 pr-9 pl-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-600 focus:bg-white"
                  />
                </div>

                {/* فلتر المستخدمين */}
                <select
                  value={sessionUserFilter}
                  onChange={(e) => setSessionUserFilter(e.target.value)}
                  className="h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-teal-600"
                >
                  <option value="ALL">كافة المستخدمين</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} {u.role ? `(${ROLE_NAMES[u.role] || u.role})` : ""}
                    </option>
                  ))}
                </select>

                {/* فلتر الأيام والتاريخ */}
                <select
                  value={sessionDateFilter}
                  onChange={(e) => setSessionDateFilter(e.target.value)}
                  className="h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-teal-600"
                >
                  <option value="ALL">على مدار كل الأيام</option>
                  <option value="TODAY">اليوم الحالي</option>
                  <option value="YESTERDAY">يوم أمس</option>
                  <option value="LAST_7_DAYS">آخر 7 أيام</option>
                  <option value="CUSTOM">تحديد تاريخ مخصص...</option>
                </select>

                {/* حقل إدخال التاريخ المخصص */}
                {sessionDateFilter === "CUSTOM" && (
                  <input
                    type="date"
                    value={sessionCustomDate}
                    onChange={(e) => setSessionCustomDate(e.target.value)}
                    className="h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700"
                  />
                )}

                {/* فلتر حالة الجلسة */}
                <select
                  value={sessionStatusFilter}
                  onChange={(e) => setSessionStatusFilter(e.target.value)}
                  className="h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-teal-600"
                >
                  <option value="ALL">كافة الحالات (نشط / منتهية)</option>
                  <option value="ACTIVE">متصل ونشط الآن</option>
                  <option value="ENDED">جلسات مكتملة ومنتهية</option>
                </select>
              </div>

              <div className="text-xs text-slate-500 font-body">
                إجمالي الجلسات: <strong>{filteredSessions.length}</strong> جلسة
              </div>
            </div>
          </Card>

          {/* جدول سجل الجلسات واستخدام الشاشات */}
          <Card className="p-0 overflow-hidden border border-slate-200 shadow-2xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-heading">
                  سجل مواعيد الدخول والخروج والمدد الزمنية داخل كل شاشة
                </h2>
                <p className="text-xs text-slate-500 font-body mt-0.5">
                  بيان دقيق بحضور وتواجد الموظف وتوزيع أوقات عمله على شاشات المنظومة
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-600 font-body">
                عرض {filteredSessions.length} سجل
              </span>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف / المستخدم</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>وقت تسجيل الدخول</TableHead>
                  <TableHead>وقت تسجيل الخروج / آخر نشاط</TableHead>
                  <TableHead>إجمالي مدة الجلسة</TableHead>
                  <TableHead>توزيع البقاء داخل الشاشات</TableHead>
                  <TableHead>الحركات المنفذة</TableHead>
                  <TableHead className="text-center">حالة الجلسة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-400 text-xs">
                      لا توجد سجلات جلسات تطابق معايير التاريخ والبحث المحددة
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSessions.map((session) => {
                    const screenTimesObj = session.screenTimes || {};
                    const screenEntries = Object.entries(screenTimesObj).filter(([_, min]) => min > 0);

                    return (
                      <TableRow key={session.id}>
                        {/* الموظف */}
                        <TableCell className="font-medium text-xs font-body">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 block font-heading">
                              {session.user?.fullName || "مستخدم غير مسجل"}
                            </span>
                            <div className="flex items-center gap-1 text-[11px] text-slate-500">
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                                {ROLE_NAMES[session.user?.role || ""] || session.user?.role}
                              </span>
                              {session.user?.employer && (
                                <span className="text-slate-400">• {session.user.employer}</span>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* التاريخ */}
                        <TableCell className="text-xs font-mono text-slate-700 font-semibold whitespace-nowrap">
                          {formatDateOnlyArabic(session.sessionDate)}
                        </TableCell>

                        {/* وقت تسجيل الدخول */}
                        <TableCell className="text-xs font-mono text-emerald-800 whitespace-nowrap font-medium">
                          <span className="inline-flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{formatDateTimeArabic(session.loginAt)}</span>
                          </span>
                        </TableCell>

                        {/* وقت تسجيل الخروج */}
                        <TableCell className="text-xs font-mono text-slate-700 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 bg-slate-100 px-2 py-0.5 rounded-md text-slate-700 border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                            <span>{formatDateTimeArabic(session.logoutAt || session.lastActiveAt)}</span>
                          </span>
                        </TableCell>

                        {/* إجمالي مدة الجلسة */}
                        <TableCell className="text-xs font-bold text-teal-800 font-heading whitespace-nowrap">
                          {formatMinutesArabic(session.totalMinutes)}
                        </TableCell>

                        {/* توزيع المدة داخل الشاشات */}
                        <TableCell className="max-w-[280px]">
                          {screenEntries.length === 0 ? (
                            <span className="text-slate-400 text-xs">—</span>
                          ) : (
                            <div className="space-y-1">
                              {screenEntries.slice(0, 3).map(([path, min]) => (
                                <div key={path} className="flex items-center justify-between text-[11px] gap-2">
                                  <span className="text-slate-700 truncate font-body">
                                    • {SCREEN_LABELS[path] || path}
                                  </span>
                                  <span className="font-bold text-teal-700 shrink-0 font-heading">
                                    {formatMinutesArabic(min)}
                                  </span>
                                </div>
                              ))}
                              {screenEntries.length > 3 && (
                                <span className="text-[10px] text-slate-400 block font-body">
                                  + {screenEntries.length - 3} شاشات أخرى
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>

                        {/* الحركات المنفذة */}
                        <TableCell className="whitespace-nowrap">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedSessionForActions(session)}
                            icon={<History className="w-3.5 h-3.5 text-teal-600" />}
                            title="استعراض العمليات والإجراءات التي قام بها هذا الموظف في هذا اليوم"
                          >
                            <span>تحركات الموظف ({session.actionsCount || 0})</span>
                          </Button>
                        </TableCell>

                        {/* حالة الجلسة */}
                        <TableCell className="text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                              session.isActive
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                session.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                              }`}
                            />
                            <span>{session.isActive ? "متصل ونشط الآن" : "انتهت الجلسة"}</span>
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {/* التبويب الثاني: سجل الحركات والإجراءات الرقابية الموثقة                         */}
      {/* ══════════════════════════════════════════════════════════════════════════════ */}
      {activeTab === "actions" && (
        <div className="space-y-4">
          <Card className="p-4 bg-white border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={actionSearch}
                    onChange={(e) => setActionSearch(e.target.value)}
                    placeholder="ابحث بالإجراء، اسم القائم به، أو السجل..."
                    className="w-full h-10 pr-9 pl-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-teal-600"
                  />
                </div>

                <select
                  value={actionEntityFilter}
                  onChange={(e) => setActionEntityFilter(e.target.value)}
                  className="h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-teal-600"
                >
                  <option value="ALL">كافة السجلات والكيانات</option>
                  <option value="Case">القضايا والشكاوى (Case)</option>
                  <option value="Payment">البدلات والمستحقات (Payment)</option>
                  <option value="SubCommittee">اللجان الفرعية (SubCommittee)</option>
                  <option value="User">المستخدمون (User)</option>
                  <option value="SystemSecurity">أمان المنظومة (SystemSecurity)</option>
                </select>

                <select
                  value={actionTypeFilter}
                  onChange={(e) => setActionTypeFilter(e.target.value)}
                  className="h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-teal-600"
                >
                  <option value="ALL">كافة أنواع الإجراءات</option>
                  <option value="CREATE">إنشاء وقيد جديد</option>
                  <option value="UPDATE">تعديل وتسديد</option>
                  <option value="ROUTING">توجيه وإحالة</option>
                  <option value="ADMIN_RISK_OVERRIDE">تصحيح مسار (وضع المخاطر)</option>
                  <option value="DELETE">حذف</option>
                </select>

                <select
                  value={actionUserFilter}
                  onChange={(e) => setActionUserFilter(e.target.value)}
                  className="h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-hidden focus:border-teal-600"
                >
                  <option value="ALL">كافة المسؤولين والمستخدمين</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-500 font-body">
                إجمالي الحركات: <strong>{filteredLogs.length}</strong> حركة
              </div>
            </div>
          </Card>

          <Card className="p-0 overflow-hidden border border-slate-200 shadow-2xs">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 font-heading">
                  سجل الحركات والإجراءات الإدارية الموثقة
                </h2>
                <p className="text-xs text-slate-500 font-body mt-0.5">
                  رصد موثق بالتاريخ والساعة والدقيقة والثانية لكل حركة تتم على المنظومة
                </p>
              </div>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>توقيت الحركة</TableHead>
                  <TableHead>القائم بالإجراء</TableHead>
                  <TableHead>طبيعة الإجراء</TableHead>
                  <TableHead>الكيان / السجل</TableHead>
                  <TableHead>ملخص التغيير</TableHead>
                  <TableHead className="text-center">التفاصيل الكاملة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                      لا توجد حركات تطابق معايير الفلترة المحددة
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const info = humanizeAuditLog(log);
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-xs text-slate-700 whitespace-nowrap">
                          {formatDateOnlyArabic(log.createdAt)} — {formatDateTimeArabic(log.createdAt)}
                        </TableCell>

                        <TableCell className="text-xs font-body">
                          <span className="font-bold text-slate-900 block">
                            {log.user?.fullName || "مستخدم غير مسجل"}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {ROLE_NAMES[log.user?.role || ""] || log.user?.role}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                              log.action.includes("RISK")
                                ? "bg-rose-50 text-rose-800 border-rose-200"
                                : log.action === "CREATE"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : log.action === "UPDATE"
                                ? "bg-sky-50 text-sky-800 border-sky-200"
                                : "bg-slate-100 text-slate-700 border-slate-200"
                            }`}
                          >
                            {log.action.includes("RISK") ? "⚠️ تصحيح مسار (مخاطر)" : info.title}
                          </span>
                        </TableCell>

                        <TableCell className="text-xs text-slate-700 font-medium">
                          {log.entityType}
                        </TableCell>

                        <TableCell className="text-xs text-slate-600 max-w-[280px] truncate">
                          {info.summary}
                        </TableCell>

                        <TableCell className="text-center whitespace-nowrap">
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedAuditLog(log)}
                            icon={<Eye className="w-3.5 h-3.5 text-teal-600" />}
                          >
                            بيان الحركة
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      )}

      {/* ─── مودال استعراض تحركات الموظف خلال جلسته (بدون JSON) ─── */}
      {selectedSessionForActions && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-body">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-4 my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">
                    سجل تحركات وإجراءات الموظف في هذا اليوم
                  </h3>
                  <p className="text-xs text-slate-500">
                    الموظف: {selectedSessionForActions.user?.fullName} — تاريخ:{" "}
                    {formatDateOnlyArabic(selectedSessionForActions.sessionDate)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSessionForActions(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* بطاقة معلومات الجلسة */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">تسجيل الدخول:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {formatDateTimeArabic(selectedSessionForActions.loginAt)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">تسجيل الخروج:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {formatDateTimeArabic(selectedSessionForActions.logoutAt || selectedSessionForActions.lastActiveAt)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">مدة الجلسة:</span>
                <span className="font-bold text-teal-700">
                  {formatMinutesArabic(selectedSessionForActions.totalMinutes)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">عدد العمليات:</span>
                <span className="font-bold text-slate-800">{sessionActions.length} إجراء</span>
              </div>
            </div>

            {/* قائمة التحركات الزمنية */}
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {sessionActions.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
                  لم يقم الموظف بإجراء تعديلات أو حفظ بيانات في هذا اليوم (جلسة اطلاع وتصفح فقط)
                </div>
              ) : (
                sessionActions.map((log) => {
                  const info = humanizeAuditLog(log);
                  return (
                    <div
                      key={log.id}
                      className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5 hover:border-teal-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center gap-1.5 font-heading">
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                          <span>{info.title}</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {formatDateTimeArabic(log.createdAt)}
                        </span>
                      </div>
                      <p className="text-slate-600 text-xs">{info.summary}</p>
                      {info.changesList.length > 0 && (
                        <div className="pt-1.5 border-t border-slate-100 flex flex-wrap gap-2 text-[11px]">
                          {info.changesList.map((ch, idx) => (
                            <span key={idx} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                              <strong>{ch.label}:</strong> {ch.after}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedSessionForActions(null)}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── مودال تفاصيل الحركة الإجرائية (المُعاد تصميمه بالكامل — خالي تماماً من JSON) ─── */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-body">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 my-8 animate-in fade-in zoom-in-95">
            {/* الرأس */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">
                    {humanizeAuditLog(selectedAuditLog).title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {formatDateOnlyArabic(selectedAuditLog.createdAt)} في تمام الساعة{" "}
                    {formatDateTimeArabic(selectedAuditLog.createdAt)}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* بيانات القائم بالحركة */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">القائم بالإجراء:</span>
                <span className="font-bold text-slate-900">
                  {selectedAuditLog.user?.fullName || "مستخدم غير مسجل"} ({ROLE_NAMES[selectedAuditLog.user?.role || ""] || selectedAuditLog.user?.role})
                </span>
              </div>
              {selectedAuditLog.user?.employer && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">جهة العمل:</span>
                  <span className="text-slate-700 font-medium">{selectedAuditLog.user.employer}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">نوع السجل الإداري:</span>
                <span className="text-slate-800 font-semibold">{selectedAuditLog.entityType}</span>
              </div>
            </div>

            {/* ملخص الإجراء بصياغة مفهومة */}
            <div className="p-3 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-950 font-medium">
              {humanizeAuditLog(selectedAuditLog).summary}
            </div>

            {/* جدول التغييرات بصياغة عربية واضحة ومقارنة (قبل وبعد) بدون أي JSON */}
            {humanizeAuditLog(selectedAuditLog).changesList.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 font-heading">
                  بيان القيم السابقة والقيم المعتمدة الجديدة:
                </h4>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs text-right">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                      <tr>
                        <th className="p-2.5">البيان / الحقل</th>
                        <th className="p-2.5">القيمة السابقة</th>
                        <th className="p-2.5">القيمة الجديدة المعتمدة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {humanizeAuditLog(selectedAuditLog).changesList.map((ch, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60">
                          <td className="p-2.5 font-semibold text-slate-800">{ch.label}</td>
                          <td className="p-2.5 text-slate-500 font-body">{ch.before}</td>
                          <td className="p-2.5 text-teal-800 font-bold font-body">{ch.after}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setSelectedAuditLog(null)}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
