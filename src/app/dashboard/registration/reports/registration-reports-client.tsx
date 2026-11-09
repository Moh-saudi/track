"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDate, formatDateTime, formatNumber } from "@/lib/formatters";
import { generateStyledProtectedExcel } from "@/lib/excel-export";
import { UnifiedPrintLayout } from "@/components/reports/UnifiedPrintLayout";
import {
  ClipboardList,
  Printer,
  BarChart3,
  User,
  Zap,
  Filter,
  Users,
  AlertCircle,
  MapPin,
  Building2,
  RotateCcw,
  Layers,
  FileSpreadsheet,
  Search,
  Hash,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Wand2,
  Eye,
  Edit3,
  X,
  Phone,
  FileText,
  Clock,
  Calendar,
  Info,
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
  prosecutionCaseNumber: string | null;
  registrationType: "COMPLAINT" | "CASE" | "REPORT";
  complainantName: string | null;
  complainantPhone?: string | null;
  respondentName: string | null;
  respondentPhone?: string | null;
  entityType?: string | null;
  entityName?: string | null;
  hospitalName?: string | null;
  governorate?: string | null;
  prosecution: string | null;
  prosecutionId?: string | null;
  prosecutionRel: { id: string; name: string; governorate?: string | null } | null;
  partialProsecution?: string | null;
  partialProsecutionId?: string | null;
  partialProsecutionRel?: { id: string; name: string } | null;
  description?: string | null;
  incomingDate?: string | null;
  attachmentsCount: number;
  status: string;
  createdAt: string;
  updatedAt?: string;
  createdBy: { id: string; fullName: string; email: string; role: string };
  subCommittee: { id: string; name: string } | null;
}

interface GovernorateStat {
  governorate: string;
  count: number;
  percent: number;
  complaints: number;
  cases: number;
  reports: number;
  total: number;
}

interface ProsecutionStatItem {
  name: string;
  governorate: string;
  complaints: number;
  cases: number;
  reports: number;
  total: number;
  percent: number;
}

interface ReportData {
  metrics: {
    globalTotalCases: number; // إجمالي بدون فلتر وبدون مراحل
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
  stageBreakdown: {
    REGISTERED: number;
    UNDER_SUBCOMMITTEE_REVIEW: number;
    PENDING_SUPREME_REVIEW: number;
    REFERRED_FOR_REVIEW: number;
    APPROVED: number;
    CLOSED: number;
  };
  governorateBreakdown: GovernorateStat[];
  prosecutionNumerical: ProsecutionStatItem[];
  prosecutions: { id: string; name: string; governorate?: string | null }[];
  subCommitteesList: { id: string; name: string }[];
  governoratesList: string[];
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

const STATUS_LABELS: Record<string, { label: string; badge: string; step: number }> = {
  REGISTERED: { label: "1. بانتظار التوجيه", badge: "bg-amber-50 text-amber-800 border-amber-200", step: 1 },
  UNDER_SUBCOMMITTEE_REVIEW: { label: "2. قيد دراسة الفرعية", badge: "bg-teal-50 text-teal-800 border-teal-200", step: 2 },
  PENDING_SUPREME_REVIEW: { label: "3. بانتظار اعتماد العليا", badge: "bg-blue-50 text-blue-800 border-blue-200", step: 3 },
  REFERRED_FOR_REVIEW: { label: "4. محال لإعادة الدراسة", badge: "bg-rose-50 text-rose-800 border-rose-200", step: 4 },
  APPROVED: { label: "5. معتمد (قرار نهائي)", badge: "bg-emerald-50 text-emerald-800 border-emerald-200", step: 5 },
  CLOSED: { label: "6. مغلق بالأرشيف", badge: "bg-slate-100 text-slate-700 border-slate-200", step: 6 },
};

const ENTITY_TYPES = [
  "مستشفى حكومي",
  "مستشفى خاص",
  "مستشفى جامعي",
  "تأمين صحي",
  "قوات مسلحة",
  "شرطة",
  "مركز طبي خاص",
  "عيادة خاصة",
  "أخرى",
];

export default function RegistrationReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  // الفلاتر الشاملة
  const [governorate, setGovernorate] = useState("ALL");
  const [prosecutionId, setProsecutionId] = useState("ALL");
  const [entityType, setEntityType] = useState("ALL");
  const [branchOrHospital, setBranchOrHospital] = useState("");
  const [subCommitteeId, setSubCommitteeId] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [registrationType, setRegistrationType] = useState("ALL");
  const [createdById, setCreatedById] = useState("ALL");
  const [complainantName, setComplainantName] = useState("");
  const [respondentName, setRespondentName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dateShortcut, setDateShortcut] = useState<"ALL" | "TODAY" | "YESTERDAY" | "THIS_MONTH" | "THIS_YEAR">("ALL");

  // التبويب النشط (الافتراضي: التقرير العددي الإحصائي بالأرقام فقط)
  const [activeTab, setActiveTab] = useState<"numerical" | "cases" | "governorates" | "prosecutions" | "stages" | "workload">("numerical");
  const [error, setError] = useState<string | null>(null);

  // نظام الإشعارات والتنبيهات المودرن التفاعلي (In-App Toast System)
  const [toast, setToast] = useState<{
    type: "success" | "error" | "info";
    title?: string;
    message: string;
  } | null>(null);

  function showToast(message: string, type: "success" | "error" | "info" = "success", title?: string) {
    setToast({ message, type, title });
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 4500);
  }

  // حالة نافذة المعالجة والاستنتاج الذكي للمحافظات
  const [showAutoDetectModal, setShowAutoDetectModal] = useState(false);
  const [autoDetectData, setAutoDetectData] = useState<any>(null);
  const [detecting, setDetecting] = useState(false);
  const [applyingBatch, setApplyingBatch] = useState(false);

  // نافذة معاينة بيانات السجل التفصيلية (Pop-up)
  const [selectedCaseModal, setSelectedCaseModal] = useState<CaseItem | null>(null);

  // نافذة وتعديل بيانات السجل مع تدوين سند الرقابة والتدقيق
  const [editingCase, setEditingCase] = useState<CaseItem | null>(null);
  const [editForm, setEditForm] = useState({
    governorate: "",
    hospitalName: "",
    entityType: "",
    complainantName: "",
    complainantPhone: "",
    respondentName: "",
    respondentPhone: "",
    prosecutionCaseNumber: "",
    description: "",
    reason: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function handleOpenEdit(c: CaseItem) {
    setEditingCase(c);
    setEditForm({
      governorate: c.governorate || c.prosecutionRel?.governorate || "",
      hospitalName: c.hospitalName || c.entityName || "",
      entityType: c.entityType || "",
      complainantName: c.complainantName || "",
      complainantPhone: c.complainantPhone || "",
      respondentName: c.respondentName || "",
      respondentPhone: c.respondentPhone || "",
      prosecutionCaseNumber: c.prosecutionCaseNumber || "",
      description: c.description || "",
      reason: "",
    });
    setEditError(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCase) return;
    if (!editForm.reason.trim()) {
      setEditError("يرجى ذكر سبب وسند التعديل (إلزامي للرقابة والتدقيق الأمني)");
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/cases/${editingCase.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          governorate: editForm.governorate.trim() || null,
          hospitalName: editForm.hospitalName.trim() || null,
          entityName: editForm.hospitalName.trim() || null,
          entityType: editForm.entityType.trim() || null,
          complainantName: editForm.complainantName.trim() || null,
          complainantPhone: editForm.complainantPhone.trim() || null,
          respondentName: editForm.respondentName.trim() || null,
          respondentPhone: editForm.respondentPhone.trim() || null,
          prosecutionCaseNumber: editForm.prosecutionCaseNumber.trim() || null,
          description: editForm.description.trim(),
          reason: editForm.reason.trim(),
        }),
      });

      const updated = await res.json();
      if (!res.ok) {
        throw new Error(updated.error || "تعذر حفظ التعديل");
      }

      // تحديث السجل محلياً في الجدول فوراً
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cases: prev.cases.map((c) => (c.id === editingCase.id ? { ...c, ...updated } : c)),
        };
      });

      if (selectedCaseModal && selectedCaseModal.id === editingCase.id) {
        setSelectedCaseModal((prev) => (prev ? { ...prev, ...updated } : null));
      }

      setEditingCase(null);
      showToast("تم حفظ التعديل بنجاح وتوثيق اسمك وسند التعديل في سجل الرقابة والتدقيق الأمني.", "success", "تم الاعتماد والحفظ");
      fetchReport();
    } catch (err: any) {
      setEditError(err.message || "حدث خطأ أثناء حفظ التعديل");
    } finally {
      setSavingEdit(false);
    }
  }

  // النيابات المتاحة مفلترة بحسب المحافظة المحددة لتسهيل الاختيار
  const filteredProsecutions = useMemo(() => {
    if (!data?.prosecutions) return [];
    if (governorate === "ALL" || governorate === "UNSPECIFIED") return data.prosecutions;
    return data.prosecutions.filter((p) => !p.governorate || p.governorate === governorate);
  }, [data?.prosecutions, governorate]);

  // بناء نص ملخص الفلاتر المطبقة للترويسة والطباعة
  function getFilterSummaryText(): string {
    const parts: string[] = [];
    if (governorate !== "ALL") {
      parts.push(governorate === "UNSPECIFIED" ? "المحافظة: غير محددة (شكاوى بدون نيابة)" : `المحافظة: ${governorate}`);
    }
    if (prosecutionId !== "ALL") {
      const p = data?.prosecutions.find((x) => x.id === prosecutionId);
      parts.push(`النيابة: ${p?.name || prosecutionId}`);
    }
    if (entityType !== "ALL") parts.push(`فئة الجهة: ${entityType}`);
    if (branchOrHospital.trim()) parts.push(`الفرع/المنشأة: ${branchOrHospital.trim()}`);
    if (subCommitteeId !== "ALL") {
      const s = data?.subCommitteesList.find((x) => x.id === subCommitteeId);
      parts.push(`اللجنة: ${s?.name || subCommitteeId}`);
    }
    if (status !== "ALL") {
      parts.push(`المرحلة: ${STATUS_LABELS[status]?.label || status}`);
    }
    if (registrationType !== "ALL") {
      parts.push(`النوع: ${TYPE_CONFIG[registrationType]?.label || registrationType}`);
    }
    if (createdById !== "ALL") {
      const u = data?.usersWorkload.find((x) => x.id === createdById);
      parts.push(`الموظف: ${u?.fullName || createdById}`);
    }
    if (startDate || endDate) {
      parts.push(`الفترة: ${startDate || "البداية"} إلى ${endDate || "الآن"}`);
    }
    return parts.length > 0 ? parts.join(" | ") : "جميع السجلات (إجمالي عام بدون فلترة وبدون مراحل)";
  }

  function fetchReport(overrideGov?: string) {
    setLoading(true);
    setError(null);
    const activeGov = overrideGov !== undefined ? overrideGov : governorate;
    const params = new URLSearchParams();
    if (activeGov !== "ALL") params.set("governorate", activeGov);
    if (prosecutionId !== "ALL") params.set("prosecutionId", prosecutionId);
    if (entityType !== "ALL") params.set("entityType", entityType);
    if (branchOrHospital.trim()) params.set("branchOrHospital", branchOrHospital.trim());
    if (subCommitteeId !== "ALL") params.set("subCommitteeId", subCommitteeId);
    if (status !== "ALL") params.set("status", status);
    if (registrationType !== "ALL") params.set("registrationType", registrationType);
    if (complainantName.trim()) params.set("complainantName", complainantName.trim());
    if (respondentName.trim()) params.set("respondentName", respondentName.trim());
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (createdById !== "ALL") params.set("createdById", createdById);

    fetch(`/api/registration/reports?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `خطأ في الخادم (${res.status})`);
        }
        return res.json();
      })
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json);
      })
      .catch((err: any) => {
        console.error("fetchReport error:", err);
        setError(err.message || "تعذر تحميل تقارير التسجيل، يرجى المحاولة لاحقاً");
      })
      .finally(() => setLoading(false));
  }

  // تعيين سريع للمحافظة من داخل جدول السجلات
  async function handleQuickAssignGov(caseId: string, gov: string) {
    if (!gov) return;
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ governorate: gov }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "تعذر تحديث المحافظة");
      }
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cases: prev.cases.map((c) => (c.id === caseId ? { ...c, governorate: gov } : c)),
        };
      });
      fetchReport();
      showToast("تم تحديد وتثبيت المحافظة للسجل بنجاح.", "success");
    } catch (e: any) {
      showToast(e.message || "حدث خطأ أثناء حفظ المحافظة", "error");
    }
  }

  // فتح نافذة الاستنتاج والمعالجة الذكية
  async function openAutoDetect() {
    setShowAutoDetectModal(true);
    setDetecting(true);
    try {
      const res = await fetch("/api/cases/auto-detect-governorates");
      const json = await res.json();
      setAutoDetectData(json);
    } catch (e: any) {
      showToast("تعذر جلب مقترحات المحافظات في الوقت الحالي", "error");
    } finally {
      setDetecting(false);
    }
  }

  // تطبيق حزمة المقترحات دفعة واحدة
  async function applyDetectedBatch(updates: { caseId: string; governorate: string }[]) {
    if (!updates.length) return;
    setApplyingBatch(true);
    try {
      const res = await fetch("/api/cases/auto-detect-governorates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل تطبيق التحديثات");
      showToast(`تم بنجاح تحديث وتثبيت محافظات ${json.successCount} سجل في قاعدة البيانات.`, "success", "اكتمل التحديث الذكي");
      setShowAutoDetectModal(false);
      fetchReport();
    } catch (e: any) {
      showToast(e.message || "تعذر تطبيق التحديثات", "error");
    } finally {
      setApplyingBatch(false);
    }
  }

  useEffect(() => {
    fetchReport();
  }, []);

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    fetchReport();
  }

  // تطبيق الاختصارات السريعة للفترات الزمنية
  function applyDateShortcut(shortcut: "ALL" | "TODAY" | "YESTERDAY" | "THIS_MONTH" | "THIS_YEAR") {
    setDateShortcut(shortcut);
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (shortcut === "ALL") {
      setStartDate("");
      setEndDate("");
    } else if (shortcut === "TODAY") {
      const s = fmt(today);
      setStartDate(s);
      setEndDate(s);
    } else if (shortcut === "YESTERDAY") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const s = fmt(y);
      setStartDate(s);
      setEndDate(s);
    } else if (shortcut === "THIS_MONTH") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(fmt(first));
      setEndDate(fmt(today));
    } else if (shortcut === "THIS_YEAR") {
      const first = new Date(today.getFullYear(), 0, 1);
      setStartDate(fmt(first));
      setEndDate(fmt(today));
    }
  }

  // إعادة ضبط كاملة لكافة الفلاتر (عرض الإجمالي بدون فلتر وبدون مراحل)
  function handleResetFilters() {
    setGovernorate("ALL");
    setProsecutionId("ALL");
    setEntityType("ALL");
    setBranchOrHospital("");
    setSubCommitteeId("ALL");
    setStatus("ALL");
    setRegistrationType("ALL");
    setComplainantName("");
    setRespondentName("");
    setStartDate("");
    setEndDate("");
    setDateShortcut("ALL");
    setCreatedById("ALL");
    setError(null);
    setLoading(true);

    fetch("/api/registration/reports")
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `خطأ في الخادم (${res.status})`);
        }
        return res.json();
      })
      .then((json) => {
        setData(json);
      })
      .catch((err: any) => {
        console.error("handleResetFilters error:", err);
        setError("تعذر إعادة ضبط الفلاتر");
      })
      .finally(() => setLoading(false));
  }

  // تصدير إكسيل محمي ومنسق وفق التبويب الحالي
  function handleExportProtectedExcel() {
    if (!data) return;

    if (activeTab === "numerical" || activeTab === "governorates") {
      const fileName = `تقرير_إحصائي_عددي_${new Date().toISOString().slice(0, 10)}`;
      generateStyledProtectedExcel({
        fileName,
        sheetName: "الحصر العددي بالمحافظات",
        reportTitle: "التقرير الإحصائي العددي لحصر السجلات المسجلة بالمحافظات",
        organizationName: "جمهورية مصر العربية — رئاسة مجلس الوزراء",
        committeeName: "اللجنة العليا للمسؤولية الطبية وسلامة المريض",
        extractedBy: data.currentUser.name,
        extractedAt: formatDateTime(new Date()),
        filterSummary: getFilterSummaryText(),
        totalRecords: data.governorateBreakdown.length,
        columns: [
          { header: "م", key: "index", width: 40, align: "center", type: "Number" },
          { header: "المحافظة", key: "governorate", width: 140, align: "right" },
          { header: "عدد الشكاوى", key: "complaints", width: 100, align: "center", type: "Number" },
          { header: "عدد القضايا", key: "cases", width: 100, align: "center", type: "Number" },
          { header: "عدد المحاضر", key: "reports", width: 100, align: "center", type: "Number" },
          { header: "إجمالي السجلات (عدد)", key: "total", width: 130, align: "center", type: "Number" },
          { header: "النسبة المئوية (%)", key: "percent", width: 110, align: "center" },
        ],
        rows: data.governorateBreakdown.map((g, i) => ({
          index: i + 1,
          governorate: `محافظة ${g.governorate}`,
          complaints: g.complaints,
          cases: g.cases,
          reports: g.reports,
          total: g.total,
          percent: `${g.percent}%`,
        })),
        isProtected: true,
      });
      return;
    }

    if (activeTab === "prosecutions") {
      const fileName = `تقرير_عددي_النيابات_${new Date().toISOString().slice(0, 10)}`;
      generateStyledProtectedExcel({
        fileName,
        sheetName: "الحصر العددي بالنيابات",
        reportTitle: "التقرير الإحصائي العددي لحصر السجلات بالنيابات المختصة",
        organizationName: "جمهورية مصر العربية — رئاسة مجلس الوزراء",
        committeeName: "اللجنة العليا للمسؤولية الطبية وسلامة المريض",
        extractedBy: data.currentUser.name,
        extractedAt: formatDateTime(new Date()),
        filterSummary: getFilterSummaryText(),
        totalRecords: data.prosecutionNumerical.length,
        columns: [
          { header: "م", key: "index", width: 40, align: "center", type: "Number" },
          { header: "اسم النيابة / جهة الورود", key: "name", width: 160, align: "right" },
          { header: "المحافظة", key: "governorate", width: 120, align: "center" },
          { header: "عدد الشكاوى", key: "complaints", width: 100, align: "center", type: "Number" },
          { header: "عدد القضايا", key: "cases", width: 100, align: "center", type: "Number" },
          { header: "عدد المحاضر", key: "reports", width: 100, align: "center", type: "Number" },
          { header: "إجمالي النيابة (عدد)", key: "total", width: 130, align: "center", type: "Number" },
          { header: "النسبة المئوية (%)", key: "percent", width: 110, align: "center" },
        ],
        rows: data.prosecutionNumerical.map((p, i) => ({
          index: i + 1,
          name: p.name,
          governorate: p.governorate,
          complaints: p.complaints,
          cases: p.cases,
          reports: p.reports,
          total: p.total,
          percent: `${p.percent}%`,
        })),
        isProtected: true,
      });
      return;
    }

    // تصدير التقرير التفصيلي
    const fileName = `تقرير_سجلات_تفصيلي_${new Date().toISOString().slice(0, 10)}`;
    generateStyledProtectedExcel({
      fileName,
      sheetName: "سجل القضايا والشكاوى",
      reportTitle: "تقرير حصر ومعدلات تسجيل القضايا والشكاوى والمحاضر",
      organizationName: "جمهورية مصر العربية — رئاسة مجلس الوزراء",
      committeeName: "اللجنة العليا للمسؤولية الطبية وسلامة المريض",
      extractedBy: data.currentUser.name,
      extractedAt: formatDateTime(new Date()),
      filterSummary: getFilterSummaryText(),
      totalRecords: data.cases.length,
      columns: [
        { header: "م", key: "index", width: 40, align: "center", type: "Number" },
        { header: "رقم السجل", key: "caseNumber", width: 90, align: "center" },
        { header: "سنة السجل", key: "caseYear", width: 70, align: "center", type: "Number" },
        { header: "نوع السجل", key: "typeLabel", width: 80, align: "center" },
        { header: "رقم المحضر / القضية / الشكوى", key: "prosecutionCaseNumber", width: 160, align: "center" },
        { header: "المحافظة", key: "governorate", width: 100, align: "center" },
        { header: "النيابة المختصة", key: "prosecution", width: 140, align: "right" },
        { header: "الفرع / المنشأة المشكو في حقها", key: "hospitalName", width: 160, align: "right" },
        { header: "اسم الشاكي", key: "complainantName", width: 130, align: "right" },
        { header: "اسم المشكو في حقه", key: "respondentName", width: 130, align: "right" },
        { header: "اللجنة الفرعية", key: "subCommittee", width: 120, align: "center" },
        { header: "المرحلة الحالية", key: "statusLabel", width: 140, align: "center" },
        { header: "الموظف المسجل", key: "createdByName", width: 120, align: "center" },
        { header: "تاريخ القيد", key: "createdAtFormatted", width: 90, align: "center" },
      ],
      rows: data.cases.map((c, i) => {
        let prosNo = "—";
        if (c.registrationType === "REPORT") {
          prosNo = c.prosecutionCaseNumber ? `محضر رقم ${c.prosecutionCaseNumber}` : "محضر بدون رقم";
        } else if (c.registrationType === "CASE") {
          prosNo = c.prosecutionCaseNumber ? `قضية رقم ${c.prosecutionCaseNumber}` : "قضية نيابة";
        } else {
          prosNo = c.prosecutionCaseNumber ? `شكوى رقم ${c.prosecutionCaseNumber}` : "شكوى مباشرة";
        }

        return {
          index: i + 1,
          caseNumber: c.caseNumber,
          caseYear: c.caseYear,
          typeLabel: TYPE_CONFIG[c.registrationType]?.label || c.registrationType,
          prosecutionCaseNumber: prosNo,
          governorate: c.governorate || c.prosecutionRel?.governorate || "غير محدد",
          prosecution: c.prosecutionRel?.name || c.prosecution || (c.registrationType === "COMPLAINT" ? "شكوى مباشرة" : "—"),
          partialProsecution: c.partialProsecutionRel?.name || c.partialProsecution || "—",
          hospitalName: c.hospitalName || c.entityName || "—",
          complainantName: c.complainantName || "—",
          respondentName: c.respondentName || "—",
          subCommittee: c.subCommittee?.name || "لم تحدد بعد",
          statusLabel: STATUS_LABELS[c.status]?.label || c.status,
          createdByName: c.createdBy?.fullName || "—",
          createdAtFormatted: formatDate(c.createdAt),
        };
      }),
      isProtected: true,
    });
  }

  const isClerk = data?.currentUser.role === "REGISTRATION_CLERK";

  return (
    <div className="space-y-6">
      {/* ─── شريط العمليات والطباعة الرئيسي البارز جداً ─── */}
      <div className="bg-white p-4 rounded-2xl border-2 border-teal-600/30 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-right">
            <h1 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-teal-700" />
              <span>منظومة التقارير والإحصائيات الشاملة</span>
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">
              حصر عددي وإحصائي بالمحافظات والنيابات والمراحل مع طباعة موحدة A4 بالعرض وحفظ PDF وتصدير Excel محمي.
            </p>
          </div>

          {/* أزرار العمليات الرئيسية: طباعة PDF - تصدير Excel - تصفير */}
          <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-end">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-black shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer"
              title="طباعة التقرير فوراً أو حفظه كملف PDF بتنسيق A4 بالعرض"
            >
              <Printer className="w-5 h-5" />
              <span>طباعة / حفظ PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportProtectedExcel}
              disabled={!data || data.cases.length === 0}
              className="inline-flex items-center gap-2 h-11 px-4.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              title="تصدير ملف Excel رسمي منسق ومحمي ضد التعديل"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير Excel محمي</span>
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 h-11 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition-colors cursor-pointer"
              title="تصفير كافة الفلاتر والرجوع للإجمالي العام بدون مراحل وبدون قيود"
            >
              <RotateCcw className="w-4 h-4 text-slate-500" />
              <span>إجمالي بدون فلتر</span>
            </button>

            <Link
              href="/dashboard/registration"
              className="inline-flex items-center gap-1.5 h-11 px-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-300 transition-colors"
            >
              <ClipboardList className="w-4 h-4 text-slate-500" />
              <span>سجل القيد</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── تنبيه الخطأ إن وجد ─── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchReport()}
            className="px-3 py-1 bg-white border border-rose-300 rounded-lg text-rose-700 font-bold hover:bg-rose-100/50 transition-colors"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* ─── بطاقات المؤشرات: إجمالي عام بدون فلتر + إجمالي بالفلتر + اليوم ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print:hidden">
        {/* 1. الإجمالي العام للنظام (بدون فلتر وبدون مراحل) */}
        <div className="stat-card border-slate-300 bg-white">
          <div className="stat-icon bg-slate-100 text-slate-800">
            <BarChart3 className="w-5 h-5 text-slate-700" />
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 font-mono">
              {formatNumber(data?.metrics.globalTotalCases)}
            </p>
            <p className="text-xs font-bold text-slate-500">الإجمالي العام (بدون فلتر)</p>
          </div>
        </div>

        {/* 2. الإجمالي المطابق للفلاتر المحددة */}
        <div className="stat-card border-teal-200 bg-teal-50/30">
          <div className="stat-icon bg-teal-100 text-teal-800 border border-teal-200">
            <Filter className="w-5 h-5 text-teal-700" />
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-teal-700 font-mono">
                {formatNumber(data?.metrics.filteredTotal)}
              </span>
              {data?.metrics.globalTotalCases ? (
                <span className="text-[11px] font-mono text-teal-600 font-bold">
                  ({Math.round(((data.metrics.filteredTotal || 0) / (data.metrics.globalTotalCases || 1)) * 100)}%)
                </span>
              ) : null}
            </div>
            <p className="text-xs font-bold text-slate-600">السجلات حسب الفلاتر النشطة</p>
          </div>
        </div>

        {/* 3. سجلات اليوم */}
        <div className="stat-card border-emerald-200 bg-emerald-50/20">
          <div className="stat-icon bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Zap className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-700 font-mono">
              {formatNumber(data?.metrics.globalTodayCount)}
            </p>
            <p className="text-xs font-bold text-slate-500">إجمالي المقيد اليوم</p>
          </div>
        </div>

        {/* 4. حساب المستخدم الحالي */}
        <div className="stat-card border-blue-200 bg-blue-50/20">
          <div className="stat-icon bg-blue-100 text-blue-800 border border-blue-200">
            <User className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-blue-700 font-mono">
                {formatNumber(data?.metrics.myTotalCases)}
              </span>
              <span className="text-[10px] text-blue-600 font-bold font-mono">
                (اليوم: {data?.metrics.myTodayCount})
              </span>
            </div>
            <p className="text-xs font-bold text-slate-500">
              {isClerk ? "سجلات حسابك (وفق صلاحيتك)" : "سجلات حسابك الشخصي"}
            </p>
          </div>
        </div>
      </div>

      {/* ─── قسم الفلاتر الشامل: المحافظات، النيابات، الفروع، اللجان، المراحل، الموظف، الفترة ─── */}
      <div className="card bg-white p-4.5 border border-slate-200 shadow-xs print:hidden">
        <div className="border-b border-slate-200 pb-3 mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-teal-700" />
            <span className="text-xs font-black text-slate-900">محددات وتصفية التقارير الشاملة</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              النتائج الحالية: {formatNumber(data?.cases.length)} سجل
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors border border-slate-300"
              title="تصفير كافة الفلاتر والرجوع للإجمالي العام بدون مراحل وبدون قيود"
            >
              <RotateCcw className="w-3 h-3 text-slate-500" />
              <span>إجمالي بدون فلتر</span>
            </button>
          </div>
        </div>

        {/* أزرار سريعة للفترات الزمنية */}
        <div className="mb-4 pb-3 border-b border-dashed border-slate-200 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-600 ml-1">الفترة الزمنية السريعة:</span>
          {(
            [
              { id: "ALL", label: "كامل المدة (الكل)" },
              { id: "TODAY", label: "سجلات اليوم" },
              { id: "YESTERDAY", label: "سجلات أمس" },
              { id: "THIS_MONTH", label: "هذا الشهر" },
              { id: "THIS_YEAR", label: "هذا العام" },
            ] as const
          ).map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => applyDateShortcut(btn.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                dateShortcut === btn.id
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleFilterSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {/* 1. فلتر المحافظة */}
            <div>
              <label className="label flex items-center gap-1">
                <MapPin className="w-3 h-3 text-rose-600" />
                <span>المحافظة</span>
              </label>
              <select
                value={governorate}
                onChange={(e) => {
                  setGovernorate(e.target.value);
                  setProsecutionId("ALL");
                }}
                className="input"
              >
                <option value="ALL">جميع المحافظات (27 محافظة)</option>
                <option value="UNSPECIFIED" className="font-bold text-amber-800 bg-amber-50">
                  ⚠️ غير محددة المحافظة (شكاوى مباشرة بدون نيابة / غير مسجلة)
                </option>
                {data?.governoratesList.map((gov) => (
                  <option key={gov} value={gov}>
                    محافظة {gov}
                  </option>
                ))}
              </select>
            </div>

            {/* 2. فلتر النيابة المختصة */}
            <div>
              <label className="label">النيابة المختصة</label>
              <select
                value={prosecutionId}
                onChange={(e) => setProsecutionId(e.target.value)}
                className="input"
              >
                <option value="ALL">
                  {governorate === "ALL" ? "جميع النيابات" : `نيابات ${governorate}`}
                </option>
                {filteredProsecutions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 3. فلتر الفرع / نوع الجهة المشكو في حقها */}
            <div>
              <label className="label flex items-center gap-1">
                <Building2 className="w-3 h-3 text-teal-600" />
                <span>فئة الفرع / المنشأة</span>
              </label>
              <select
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="input"
              >
                <option value="ALL">جميع فئات المنشآت</option>
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. اسم الفرع أو المستشفى */}
            <div>
              <label className="label">اسم المستشفى / الفرع المشكو فيه</label>
              <input
                type="text"
                value={branchOrHospital}
                onChange={(e) => setBranchOrHospital(e.target.value)}
                placeholder="مثال: القصر العيني، الهلال..."
                className="input text-xs"
              />
            </div>

            {/* 5. فلتر اللجنة الفرعية */}
            <div>
              <label className="label">اللجنة الفرعية المختصة</label>
              <select
                value={subCommitteeId}
                onChange={(e) => setSubCommitteeId(e.target.value)}
                className="input"
              >
                <option value="ALL">جميع اللجان الفرعية</option>
                {data?.subCommitteesList.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 6. المرحلة بناءً على مراحل العمل */}
            <div>
              <label className="label flex items-center gap-1">
                <Layers className="w-3 h-3 text-purple-600" />
                <span>المرحلة الحالية بسير العمل</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input font-semibold"
              >
                <option value="ALL">جميع المراحل (إجمالي عام بدون مراحل)</option>
                <option value="REGISTERED">1. بانتظار التوجيه (قيد جديد)</option>
                <option value="UNDER_SUBCOMMITTEE_REVIEW">2. قيد دراسة اللجنة الفرعية</option>
                <option value="PENDING_SUPREME_REVIEW">3. بانتظار اعتماد اللجنة العليا</option>
                <option value="REFERRED_FOR_REVIEW">4. محال لإعادة الدراسة</option>
                <option value="APPROVED">5. معتمد (قرار نهائي)</option>
                <option value="CLOSED">6. مغلق بالأرشيف</option>
              </select>
            </div>

            {/* 7. نوع السجل */}
            <div>
              <label className="label">نوع السجل</label>
              <select
                value={registrationType}
                onChange={(e) => setRegistrationType(e.target.value)}
                className="input"
              >
                <option value="ALL">جميع الأنواع (شكوى / قضية / محضر)</option>
                <option value="COMPLAINT">شكوى</option>
                <option value="CASE">قضية</option>
                <option value="REPORT">محضر</option>
              </select>
            </div>

            {/* 8. الموظف القائم بالقيد (خاضع للصلاحيات) */}
            <div>
              <label className="label flex items-center gap-1">
                <User className="w-3 h-3 text-blue-600" />
                <span>الموظف القائم بالقيد</span>
              </label>
              {isClerk ? (
                <div className="input bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-between border-slate-300">
                  <span>{data?.currentUser.name}</span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded border border-blue-200">
                    مقيد بحسابك
                  </span>
                </div>
              ) : (
                <select
                  value={createdById}
                  onChange={(e) => setCreatedById(e.target.value)}
                  className="input"
                >
                  <option value="ALL">جميع موظفي التسجيل</option>
                  {data?.usersWorkload.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({formatNumber(u.totalRegistered)} سجل)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 9. من تاريخ */}
            <div>
              <label className="label">من تاريخ قيد</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDateShortcut("ALL");
                }}
                className="input font-mono text-xs"
              />
            </div>

            {/* 10. إلى تاريخ */}
            <div>
              <label className="label">إلى تاريخ قيد</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDateShortcut("ALL");
                }}
                className="input font-mono text-xs"
              />
            </div>

            {/* 11. اسم الشاكي */}
            <div>
              <label className="label">اسم الشاكي</label>
              <input
                type="text"
                value={complainantName}
                onChange={(e) => setComplainantName(e.target.value)}
                placeholder="بحث باسم الشاكي..."
                className="input text-xs"
              />
            </div>

            {/* 12. المشكو في حقه */}
            <div>
              <label className="label">المشكو في حقه</label>
              <input
                type="text"
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                placeholder="اسم الطبيب / المشكو في حقه..."
                className="input text-xs"
              />
            </div>
          </div>

          {/* أزرار تطبيق الفلترة وإعادة التعيين */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition-colors"
            >
              إلغاء الفلاتر وعرض الإجمالي
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-6 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{loading ? "جاري الفرز..." : "تطبيق الفلترة"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* ─── تنبيه ومعالج السجلات غير المحددة المحافظات ─── */}
      {data?.governorateBreakdown.some((g) => g.governorate === "غير محدد" && g.total > 0) && (
        <div className="bg-amber-50/80 border-2 border-amber-300 p-4 rounded-2xl flex items-center justify-between gap-4 flex-wrap print:hidden shadow-xs animate-in fade-in-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-950 flex items-center gap-2">
                <span>توجد ({data.governorateBreakdown.find((g) => g.governorate === "غير محدد")?.total || 0}) شكوى/سجل غير محددة المحافظة</span>
                <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">شكاوى مباشرة بدون نيابة</span>
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                يمكنك حصرها واستعراضها بالجدول، أو استخدام المعالج الذكي لاستنتاج وتحديد محافظاتها تلقائياً من واقع أسماء المستشفيات.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setGovernorate("UNSPECIFIED");
                setActiveTab("cases");
                fetchReport("UNSPECIFIED");
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-amber-300 text-amber-900 text-xs font-bold hover:bg-amber-100 transition-colors shadow-xs flex items-center gap-1.5"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>حصر وعرض الـ ({data.governorateBreakdown.find((g) => g.governorate === "غير محدد")?.total || 0}) بالجدول</span>
            </button>
            <button
              type="button"
              onClick={openAutoDetect}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
            >
              <Wand2 className="w-4 h-4" />
              <span>المعالج الذكي لاستنتاج المحافظات</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── تبويبات التقرير التفاعلية ─── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 print:hidden overflow-x-auto">
        {/* التبويب 1: التقرير العددي الإحصائي (أعداد فقط) */}
        <button
          onClick={() => setActiveTab("numerical")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === "numerical"
              ? "bg-teal-700 text-white shadow-sm"
              : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
          }`}
        >
          <Hash className="w-3.5 h-3.5" />
          <span>التقرير العددي الإحصائي (أعداد فقط)</span>
          <span className="font-mono bg-white/20 text-white px-1.5 py-0.2 rounded text-[11px]">
            {formatNumber(data?.cases.length)} سجل
          </span>
        </button>

        {/* التبويب 2: جدول السجلات التفصيلي */}
        <button
          onClick={() => setActiveTab("cases")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === "cases"
              ? "bg-teal-700 text-white shadow-sm"
              : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          <span>جدول السجلات التفصيلي</span>
        </button>

        {/* التبويب 3: تقرير وتوزيع المحافظات */}
        <button
          onClick={() => setActiveTab("governorates")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === "governorates"
              ? "bg-teal-700 text-white shadow-sm"
              : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>حصر المحافظات</span>
          <span className="font-mono bg-slate-200 text-slate-800 px-1.5 py-0.2 rounded text-[11px]">
            {data?.governorateBreakdown.length || 0} محافظة
          </span>
        </button>

        {/* التبويب 4: حصر النيابات */}
        <button
          onClick={() => setActiveTab("prosecutions")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === "prosecutions"
              ? "bg-teal-700 text-white shadow-sm"
              : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
          }`}
        >
          <Scale className="w-3.5 h-3.5" />
          <span>حصر النيابات</span>
        </button>

        {/* التبويب 5: مراحل سير العمل */}
        <button
          onClick={() => setActiveTab("stages")}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
            activeTab === "stages"
              ? "bg-teal-700 text-white shadow-sm"
              : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>مراحل سير العمل</span>
        </button>

        {!isClerk && (
          <button
            onClick={() => setActiveTab("workload")}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap ${
              activeTab === "workload"
                ? "bg-teal-700 text-white shadow-sm"
                : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>معدل إنجاز الموظفين</span>
          </button>
        )}
      </div>

      {/* ─── الحاوية الموحدة للطباعة الورقية A4 ─── */}
      <UnifiedPrintLayout
        title={
          activeTab === "numerical"
            ? "التقرير العددي الإحصائي لحصر السجلات بالمحافظات والنيابات"
            : activeTab === "governorates"
            ? "تقرير حصر وتوزيع السجلات المسجلة بالمحافظات"
            : activeTab === "prosecutions"
            ? "تقرير حصر السجلات بالنيابات المختصة"
            : activeTab === "stages"
            ? "تقرير حصر السجلات بمراحل سير العمل"
            : activeTab === "workload"
            ? "تقرير معدلات تشغيل وإنجاز موظفي قيد السجلات"
            : "تقرير حصر ومعدلات تسجيل القضايا والشكاوى والمحاضر"
        }
        filterSummary={getFilterSummaryText()}
        currentUser={data?.currentUser}
        totalCount={data?.cases.length || 0}
        globalTotal={data?.metrics.globalTotalCases}
        orientation="landscape"
      >
        {/* ═══════════════════════════════════════════════════════
            التبويب الأول: التقرير العددي الإحصائي (أعداد فقط)
            ═══════════════════════════════════════════════════════ */}
        {activeTab === "numerical" && (
          <div className="space-y-4">
            {/* بطاقة ملخص الفلتر النشط إن وجد */}
            {governorate !== "ALL" && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs font-bold text-teal-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-700" />
                  <span>
                    حصر عددي خاص بمحافظة: <strong>{governorate}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span>إجمالي المحافظة: <strong>{data?.cases.length} سجل</strong></span>
                  <span className="text-blue-800">شكاوى: {data?.typeBreakdown.COMPLAINT}</span>
                  <span className="text-purple-800">قضايا: {data?.typeBreakdown.CASE}</span>
                  <span className="text-emerald-800">محاضر: {data?.typeBreakdown.REPORT}</span>
                </div>
              </div>
            )}

            {/* بطاقات الإجماليات العددية السريعة */}
            <div className="grid grid-cols-4 gap-3 print:grid-cols-4">
              <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-center">
                <span className="text-[11px] font-bold text-slate-600 block">إجمالي السجلات (عدد)</span>
                <span className="text-xl font-mono font-black text-slate-900 block mt-0.5">
                  {formatNumber(data?.cases.length)}
                </span>
              </div>
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-lg text-center">
                <span className="text-[11px] font-bold text-blue-900 block">عدد الشكاوى</span>
                <span className="text-xl font-mono font-black text-blue-900 block mt-0.5">
                  {formatNumber(data?.typeBreakdown.COMPLAINT)}
                </span>
              </div>
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-lg text-center">
                <span className="text-[11px] font-bold text-purple-900 block">عدد القضايا</span>
                <span className="text-xl font-mono font-black text-purple-900 block mt-0.5">
                  {formatNumber(data?.typeBreakdown.CASE)}
                </span>
              </div>
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-center">
                <span className="text-[11px] font-bold text-emerald-900 block">عدد المحاضر</span>
                <span className="text-xl font-mono font-black text-emerald-900 block mt-0.5">
                  {formatNumber(data?.typeBreakdown.REPORT)}
                </span>
              </div>
            </div>

            {/* جدول 1: الحصر العددي حسب المحافظات والأنواع (أعداد فقط) */}
            <div className="card p-0 overflow-hidden border border-slate-200">
              <div className="p-2.5 bg-slate-100 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                <span>أولاً: الحصر العددي للسجلات حسب المحافظات والأنواع (أعداد فقط)</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  إجمالي المحافظات المسجلة: {data?.governorateBreakdown.length || 0}
                </span>
              </div>
              <div className="table-wrapper border-0 rounded-none shadow-none">
                <table className="table-custom print-table" style={{ width: "100%", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "5%" }}>م</th>
                      <th style={{ width: "27%" }}>المحافظة</th>
                      <th style={{ width: "13%" }}>عدد الشكاوى</th>
                      <th style={{ width: "13%" }}>عدد القضايا</th>
                      <th style={{ width: "13%" }}>عدد المحاضر</th>
                      <th style={{ width: "16%" }} className="bg-teal-50 text-teal-900">إجمالي السجلات (عدد)</th>
                      <th style={{ width: "13%" }}>النسبة المئوية (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.governorateBreakdown.map((g, idx) => (
                      <tr key={g.governorate}>
                        <td className="text-center font-mono text-xs">{idx + 1}</td>
                        <td className="font-bold text-slate-900 text-right">
                          {g.governorate === "غير محدد" ? (
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              <span className="text-amber-900 font-bold flex items-center gap-1 text-xs">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>غير محددة (شكاوى بدون نيابة)</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setGovernorate("UNSPECIFIED");
                                  setActiveTab("cases");
                                  fetchReport("UNSPECIFIED");
                                }}
                                className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold transition-colors border border-amber-300 print:hidden"
                                title="عرض وحصر السجلات بالتفصيل"
                              >
                                عرض السجلات ({g.total})
                              </button>
                            </div>
                          ) : (
                            `محافظة ${g.governorate}`
                          )}
                        </td>
                        <td className="text-center font-mono font-bold text-blue-800">{g.complaints}</td>
                        <td className="text-center font-mono font-bold text-purple-800">{g.cases}</td>
                        <td className="text-center font-mono font-bold text-emerald-800">{g.reports}</td>
                        <td className="text-center font-mono font-black text-slate-900 text-sm bg-teal-50/40">
                          {formatNumber(g.total)}
                        </td>
                        <td className="text-center font-mono font-bold text-slate-700">{g.percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400">
                      <td colSpan={2} className="text-right font-black">الإجمالي الكلي العام</td>
                      <td className="text-center font-mono font-black text-blue-900">
                        {data?.typeBreakdown.COMPLAINT}
                      </td>
                      <td className="text-center font-mono font-black text-purple-900">
                        {data?.typeBreakdown.CASE}
                      </td>
                      <td className="text-center font-mono font-black text-emerald-900">
                        {data?.typeBreakdown.REPORT}
                      </td>
                      <td className="text-center font-mono font-black text-base text-teal-900 bg-teal-100/60">
                        {data?.cases.length}
                      </td>
                      <td className="text-center font-mono font-black">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* جدول 2: الحصر العددي حسب النيابات المختصة (أعداد فقط) */}
            <div className="card p-0 overflow-hidden border border-slate-200">
              <div className="p-2.5 bg-slate-100 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                <span>ثانياً: الحصر العددي للسجلات حسب النيابات المختصة (أعداد فقط)</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  إجمالي جهات القيد والنيابات: {data?.prosecutionNumerical.length || 0}
                </span>
              </div>
              <div className="table-wrapper border-0 rounded-none shadow-none">
                <table className="table-custom print-table" style={{ width: "100%", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "5%" }}>م</th>
                      <th style={{ width: "25%" }}>اسم النيابة / جهة الورود</th>
                      <th style={{ width: "15%" }}>المحافظة</th>
                      <th style={{ width: "11%" }}>عدد الشكاوى</th>
                      <th style={{ width: "11%" }}>عدد القضايا</th>
                      <th style={{ width: "11%" }}>عدد المحاضر</th>
                      <th style={{ width: "12%" }} className="bg-teal-50 text-teal-900">إجمالي النيابة (عدد)</th>
                      <th style={{ width: "10%" }}>النسبة (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.prosecutionNumerical.map((p, idx) => (
                      <tr key={p.name}>
                        <td className="text-center font-mono text-xs">{idx + 1}</td>
                        <td className="font-bold text-slate-900 text-right">{p.name}</td>
                        <td className="text-center text-xs font-semibold text-slate-700">{p.governorate}</td>
                        <td className="text-center font-mono font-bold text-blue-800">{p.complaints}</td>
                        <td className="text-center font-mono font-bold text-purple-800">{p.cases}</td>
                        <td className="text-center font-mono font-bold text-emerald-800">{p.reports}</td>
                        <td className="text-center font-mono font-black text-slate-900 text-sm bg-teal-50/40">
                          {formatNumber(p.total)}
                        </td>
                        <td className="text-center font-mono font-bold text-slate-700">{p.percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400">
                      <td colSpan={3} className="text-right font-black">الإجمالي الكلي للنيابات</td>
                      <td className="text-center font-mono font-black text-blue-900">
                        {data?.typeBreakdown.COMPLAINT}
                      </td>
                      <td className="text-center font-mono font-black text-purple-900">
                        {data?.typeBreakdown.CASE}
                      </td>
                      <td className="text-center font-mono font-black text-emerald-900">
                        {data?.typeBreakdown.REPORT}
                      </td>
                      <td className="text-center font-mono font-black text-base text-teal-900 bg-teal-100/60">
                        {data?.cases.length}
                      </td>
                      <td className="text-center font-mono font-black">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* جدول 3: الحصر العددي بمراحل سير العمل (أعداد فقط) */}
            <div className="card p-0 overflow-hidden border border-slate-200">
              <div className="p-2.5 bg-slate-100 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center justify-between">
                <span>ثالثاً: الحصر العددي بمراحل سير العمل (أعداد فقط)</span>
              </div>
              <div className="table-wrapper border-0 rounded-none shadow-none">
                <table className="table-custom print-table" style={{ width: "100%", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "6%" }}>م</th>
                      <th style={{ width: "54%" }}>مرحلة سير العمل</th>
                      <th style={{ width: "20%" }}>إجمالي السجلات (عدد)</th>
                      <th style={{ width: "20%" }}>النسبة المئوية (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(STATUS_LABELS).map(([key, info], idx) => {
                      const count = (data?.stageBreakdown as any)?.[key] || 0;
                      const total = data?.cases.length || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <tr key={key}>
                          <td className="text-center font-mono text-xs">{idx + 1}</td>
                          <td className="font-bold text-slate-900 text-right">{info.label}</td>
                          <td className="text-center font-mono font-black text-slate-900 text-sm">
                            {formatNumber(count)}
                          </td>
                          <td className="text-center font-mono font-bold text-slate-700">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400">
                      <td colSpan={2} className="text-right font-black">إجمالي كافة المراحل</td>
                      <td className="text-center font-mono font-black text-base text-teal-900 bg-teal-100/60">
                        {data?.cases.length}
                      </td>
                      <td className="text-center font-mono font-black">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            التبويب الثاني: جدول السجلات والتقرير التفصيلي
            (منسق بدقة A4 ومطابق للعرض المتاح 100% بدون أي خروج)
            ═══════════════════════════════════════════════════════ */}
        {activeTab === "cases" && (
          <div className="space-y-4">
            <div className="card p-0 overflow-hidden border border-slate-200">
              <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between print:hidden">
                <span className="text-xs font-bold text-slate-800">
                  قائمة السجلات المشمولة بالتقرير ({formatNumber(data?.cases.length)} سجل)
                </span>
                <span className="text-[11px] text-slate-500 font-medium">
                  جدول تفصيلي يتضمن رقم السجل ورقم المحضر والقضية والشاكي والمشكو في حقه
                </span>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-500 text-xs font-bold">
                  جاري استخراج السجلات وفرزها...
                </div>
              ) : !data?.cases.length ? (
                <div className="p-12 text-center text-slate-400 text-xs font-bold">
                  لا توجد سجلات مطابقة لشروط الفلترة المحددة
                </div>
              ) : (
                <div className="table-wrapper border-0 rounded-none shadow-none overflow-x-auto">
                  <table className="table-custom print-table" style={{ width: "100%", tableLayout: "fixed" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "3.5%" }}>م</th>
                        <th style={{ width: "9.5%" }}>رقم السجل / السنة</th>
                        <th style={{ width: "6%" }}>النوع</th>
                        <th style={{ width: "13%" }}>رقم المحضر / القضية / الشكوى</th>
                        <th style={{ width: "7.5%" }}>المحافظة</th>
                        <th style={{ width: "11.5%" }}>النيابة المختصة</th>
                        <th style={{ width: "12%" }}>الفرع / المنشأة المشكو فيها</th>
                        <th style={{ width: "9.5%" }}>الشاكي</th>
                        <th style={{ width: "9.5%" }}>المشكو في حقه</th>
                        <th style={{ width: "9.5%" }}>اللجنة الفرعية</th>
                        <th style={{ width: "7%" }}>المرحلة</th>
                        <th style={{ width: "6%" }} className="print:hidden">خيارات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.cases.map((c, idx) => {
                        const typeInfo = TYPE_CONFIG[c.registrationType] ?? {
                          label: c.registrationType,
                          badge: "bg-slate-100",
                        };
                        const statusInfo = STATUS_LABELS[c.status] ?? {
                          label: c.status,
                          badge: "bg-slate-100",
                        };
                        const govName = c.governorate || c.prosecutionRel?.governorate || "—";

                        // تحديد رقم المحضر أو الشكوى أو القضية حسب نوع السجل
                        let recordDetails = "—";
                        if (c.registrationType === "REPORT") {
                          recordDetails = c.prosecutionCaseNumber ? `محضر: ${c.prosecutionCaseNumber}` : "محضر بدون رقم";
                        } else if (c.registrationType === "CASE") {
                          recordDetails = c.prosecutionCaseNumber ? `قضية: ${c.prosecutionCaseNumber}` : "قضية نيابة";
                        } else {
                          recordDetails = c.prosecutionCaseNumber ? `شكوى: ${c.prosecutionCaseNumber}` : "شكوى مباشرة";
                        }

                        return (
                          <tr
                            key={c.id}
                            onClick={() => setSelectedCaseModal(c)}
                            className="hover:bg-teal-50/60 transition-colors group cursor-pointer"
                            title="اضغط لمعاينة كامل بيانات السجل أو تعديلها"
                          >
                            <td className="text-center font-mono text-[10px] text-slate-500">
                              {idx + 1}
                            </td>
                            <td className="text-center font-bold text-slate-900 font-mono text-xs">
                              {/* ─── معاينة سريعة عند المرور بالماوس (Hover Tooltip) ─── */}
                              <div className="relative group/tip inline-flex items-center justify-center gap-1">
                                <span className="font-bold text-slate-900 font-mono text-xs underline decoration-teal-400 decoration-dotted underline-offset-4 group-hover:text-teal-700">
                                  {c.caseNumber} / {c.caseYear}
                                </span>
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="hidden group-hover/tip:block absolute z-50 right-0 top-full mt-2 w-80 p-3.5 bg-slate-900 text-white rounded-2xl shadow-2xl text-xs space-y-2 pointer-events-none border border-slate-700 print:hidden text-right animate-in fade-in-50 zoom-in-95"
                                >
                                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                    <span className="font-bold text-teal-400">سجل: {c.caseNumber} لسنة {c.caseYear}</span>
                                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold">{typeInfo.label}</span>
                                  </div>
                                  <div className="space-y-1.5 text-[11px] leading-relaxed">
                                    <div className="p-2 bg-slate-800/80 rounded-lg text-slate-200">
                                      <p className="text-[10px] text-teal-400 font-bold mb-0.5">موضوع الشكوى / الواقعة:</p>
                                      <p className="line-clamp-3 text-slate-300">{c.description || "لم يسجل ملخص"}</p>
                                    </div>
                                    {c.complainantPhone && (
                                      <p className="text-slate-300 flex items-center justify-between">
                                        <span className="text-slate-400">هاتف الشاكي:</span>
                                        <span className="font-mono text-teal-300">{c.complainantPhone}</span>
                                      </p>
                                    )}
                                    {c.respondentPhone && (
                                      <p className="text-slate-300 flex items-center justify-between">
                                        <span className="text-slate-400">هاتف المشكو فيه:</span>
                                        <span className="font-mono text-teal-300">{c.respondentPhone}</span>
                                      </p>
                                    )}
                                    <p className="text-slate-300 flex items-center justify-between">
                                      <span className="text-slate-400">الجهة المشكو فيها:</span>
                                      <span className="font-bold text-slate-200">{c.hospitalName || c.entityName || "—"}</span>
                                    </p>
                                    {c.attachmentsCount > 0 && (
                                      <p className="text-slate-300 flex items-center justify-between">
                                        <span className="text-slate-400">عدد المرفقات:</span>
                                        <span className="font-bold text-teal-300 font-mono">{c.attachmentsCount} ملف</span>
                                      </p>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-teal-300/80 pt-1.5 border-t border-slate-800 flex items-center justify-between">
                                    <span>اضغط على السطر لفتح النافذة والتعديل</span>
                                    <span>👁️ عرض كامل</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${typeInfo.badge} print:border-0 print:bg-transparent print:p-0`}>
                                {typeInfo.label}
                              </span>
                            </td>
                            <td className="text-center font-bold text-teal-900 font-mono text-xs">
                              {recordDetails}
                            </td>
                            <td className="font-semibold text-slate-800 text-xs" onClick={(e) => e.stopPropagation()}>
                              {govName === "—" || govName === "غير محدد" ? (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold">
                                    غير محدد
                                  </span>
                                  <select
                                    defaultValue=""
                                    onChange={(e) => handleQuickAssignGov(c.id, e.target.value)}
                                    className="text-[10px] py-0.5 px-1 bg-white border border-teal-500 rounded font-bold cursor-pointer hover:bg-teal-50 print:hidden text-teal-900"
                                    title="تحديد المحافظة فورياً لهذا السجل"
                                  >
                                    <option value="" disabled>+ تعيين</option>
                                    {data.governoratesList.map((g) => (
                                      <option key={g} value={g}>{g}</option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                govName
                              )}
                            </td>
                            <td className="text-xs text-slate-700">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold text-slate-800">
                                  {c.prosecutionRel?.name || c.prosecution || (c.registrationType === "COMPLAINT" ? "شكوى مباشرة" : "—")}
                                </span>
                                {(c.partialProsecutionRel?.name || c.partialProsecution) && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/80 w-fit max-w-[180px] truncate">
                                    <span className="font-bold">جزئية:</span>
                                    <span className="truncate">{c.partialProsecutionRel?.name || c.partialProsecution}</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="text-xs">
                              {c.hospitalName || c.entityName || "—"}
                            </td>
                            <td className="font-semibold text-slate-800 text-xs">
                              {c.complainantName || "—"}
                            </td>
                            <td className="font-medium text-slate-800 text-xs">
                              {c.respondentName || "—"}
                            </td>
                            <td className="text-xs text-slate-700">
                              {c.subCommittee?.name || "لم تحدد"}
                            </td>
                            <td className="text-xs">
                              <span className="font-bold text-slate-900 print:text-[8.5px]">
                                {statusInfo.label}
                              </span>
                            </td>
                            <td className="text-center print:hidden" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCaseModal(c)}
                                  className="p-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-800 transition-colors"
                                  title="معاينة تفاصيل السجل في نافذة منبثقة"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(c)}
                                  className="p-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-800 transition-colors"
                                  title="تعديل بيانات السجل (مع تسجيل السند)"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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

        {/* ═══════════════════════════════════════════════════════
            التبويب الثالث: تقرير وتوزيع السجلات بالمحافظات
            ═══════════════════════════════════════════════════════ */}
        {activeTab === "governorates" && (
          <div className="space-y-4">
            <div className="card p-0 overflow-hidden border border-slate-200">
              <div className="table-wrapper border-0 rounded-none shadow-none">
                <table className="table-custom print-table" style={{ width: "100%", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "6%" }}>م</th>
                      <th style={{ width: "24%" }}>المحافظة</th>
                      <th style={{ width: "14%" }}>عدد الشكاوى</th>
                      <th style={{ width: "14%" }}>عدد القضايا</th>
                      <th style={{ width: "14%" }}>عدد المحاضر</th>
                      <th style={{ width: "16%" }} className="bg-teal-50 text-teal-900">إجمالي السجلات</th>
                      <th style={{ width: "12%" }}>النسبة المئوية (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.governorateBreakdown.map((govItem, idx) => (
                      <tr key={govItem.governorate}>
                        <td className="text-center font-mono text-xs text-slate-500">{idx + 1}</td>
                        <td className="font-bold text-slate-900 text-sm text-right">
                          {govItem.governorate === "غير محدد" ? (
                            <div className="flex items-center justify-between gap-1.5 flex-wrap">
                              <span className="text-amber-900 font-bold flex items-center gap-1 text-xs">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>غير محددة (شكاوى بدون نيابة)</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setGovernorate("UNSPECIFIED");
                                  setActiveTab("cases");
                                  fetchReport("UNSPECIFIED");
                                }}
                                className="px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 text-[11px] font-bold transition-colors border border-amber-300 print:hidden"
                                title="عرض وحصر السجلات بالتفصيل"
                              >
                                عرض السجلات ({govItem.total})
                              </button>
                            </div>
                          ) : (
                            `محافظة ${govItem.governorate}`
                          )}
                        </td>
                        <td className="text-center font-mono font-bold text-blue-800">{govItem.complaints}</td>
                        <td className="text-center font-mono font-bold text-purple-800">{govItem.cases}</td>
                        <td className="text-center font-mono font-bold text-emerald-800">{govItem.reports}</td>
                        <td className="text-center font-mono font-black text-slate-900 text-base bg-teal-50/40">
                          {formatNumber(govItem.total)}
                        </td>
                        <td className="text-center font-mono font-bold text-teal-800 text-sm">
                          {govItem.percent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400">
                      <td colSpan={2} className="text-right font-black">إجمالي كافة المحافظات</td>
                      <td className="text-center font-mono font-black text-blue-900">{data?.typeBreakdown.COMPLAINT}</td>
                      <td className="text-center font-mono font-black text-purple-900">{data?.typeBreakdown.CASE}</td>
                      <td className="text-center font-mono font-black text-emerald-900">{data?.typeBreakdown.REPORT}</td>
                      <td className="text-center font-mono font-black text-base text-teal-900 bg-teal-100/60">{data?.cases.length}</td>
                      <td className="text-center font-mono font-black">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            التبويب الرابع: حصر النيابات المختصة
            ═══════════════════════════════════════════════════════ */}
        {activeTab === "prosecutions" && (
          <div className="space-y-4">
            <div className="card p-0 overflow-hidden border border-slate-200">
              <div className="table-wrapper border-0 rounded-none shadow-none">
                <table className="table-custom print-table" style={{ width: "100%", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "5%" }}>م</th>
                      <th style={{ width: "25%" }}>اسم النيابة / جهة الورود</th>
                      <th style={{ width: "15%" }}>المحافظة</th>
                      <th style={{ width: "11%" }}>عدد الشكاوى</th>
                      <th style={{ width: "11%" }}>عدد القضايا</th>
                      <th style={{ width: "11%" }}>عدد المحاضر</th>
                      <th style={{ width: "12%" }} className="bg-teal-50 text-teal-900">إجمالي النيابة</th>
                      <th style={{ width: "10%" }}>النسبة (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.prosecutionNumerical.map((p, idx) => (
                      <tr key={p.name}>
                        <td className="text-center font-mono text-xs">{idx + 1}</td>
                        <td className="font-bold text-slate-900 text-right">{p.name}</td>
                        <td className="text-center text-xs font-semibold text-slate-700">{p.governorate}</td>
                        <td className="text-center font-mono font-bold text-blue-800">{p.complaints}</td>
                        <td className="text-center font-mono font-bold text-purple-800">{p.cases}</td>
                        <td className="text-center font-mono font-bold text-emerald-800">{p.reports}</td>
                        <td className="text-center font-mono font-black text-slate-900 text-sm bg-teal-50/40">
                          {formatNumber(p.total)}
                        </td>
                        <td className="text-center font-mono font-bold text-slate-700">{p.percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400">
                      <td colSpan={3} className="text-right font-black">الإجمالي الكلي للنيابات</td>
                      <td className="text-center font-mono font-black text-blue-900">
                        {data?.typeBreakdown.COMPLAINT}
                      </td>
                      <td className="text-center font-mono font-black text-purple-900">
                        {data?.typeBreakdown.CASE}
                      </td>
                      <td className="text-center font-mono font-black text-emerald-900">
                        {data?.typeBreakdown.REPORT}
                      </td>
                      <td className="text-center font-mono font-black text-base text-teal-900 bg-teal-100/60">
                        {data?.cases.length}
                      </td>
                      <td className="text-center font-mono font-black">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            التبويب الخامس: تقرير مراحل سير العمل
            ═══════════════════════════════════════════════════════ */}
        {activeTab === "stages" && (
          <div className="space-y-4">
            <div className="card p-0 overflow-hidden border border-slate-200">
              <div className="table-wrapper border-0 rounded-none shadow-none">
                <table className="table-custom print-table" style={{ width: "100%", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "8%" }}>م</th>
                      <th style={{ width: "42%" }}>مرحلة سير العمل</th>
                      <th style={{ width: "25%" }}>عدد السجلات المقيدة</th>
                      <th style={{ width: "25%" }}>النسبة المئوية من الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(STATUS_LABELS).map(([key, info], idx) => {
                      const count = (data?.stageBreakdown as any)?.[key] || 0;
                      const total = data?.cases.length || 1;
                      const pct = Math.round((count / total) * 100);
                      return (
                        <tr key={key}>
                          <td className="text-center font-mono text-xs text-slate-500">{idx + 1}</td>
                          <td className="font-bold text-slate-900 text-right">{info.label}</td>
                          <td className="text-center font-mono font-black text-slate-900 text-sm">
                            {formatNumber(count)}
                          </td>
                          <td className="text-center font-mono font-bold text-teal-800 text-sm">{pct}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400">
                      <td colSpan={2} className="text-right font-black">الإجمالي العام لجميع المراحل</td>
                      <td className="text-center font-mono font-black text-base text-teal-900 bg-teal-100/60">
                        {data?.cases.length}
                      </td>
                      <td className="text-center font-mono font-black">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════
            التبويب السادس: معدل إنجاز الموظفين (للإدارة فقط)
            ═══════════════════════════════════════════════════════ */}
        {activeTab === "workload" && !isClerk && (
          <div className="space-y-4">
            <div className="card p-0 overflow-hidden border border-slate-200">
              <div className="table-wrapper border-0 rounded-none shadow-none">
                <table className="table-custom print-table" style={{ width: "100%", tableLayout: "fixed" }}>
                  <thead>
                    <tr>
                      <th style={{ width: "6%" }}>م</th>
                      <th style={{ width: "34%" }}>اسم الموظف المسجل</th>
                      <th style={{ width: "15%" }}>إجمالي المقيد</th>
                      <th style={{ width: "15%" }}>المقيد اليوم</th>
                      <th style={{ width: "15%" }}>المقيد بالفترة</th>
                      <th style={{ width: "15%" }}>نسبة المساهمة (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.usersWorkload.map((u, idx) => (
                      <tr key={u.id}>
                        <td className="text-center font-mono text-xs text-slate-500">{idx + 1}</td>
                        <td className="font-bold text-slate-900 text-right">{u.fullName}</td>
                        <td className="text-center font-mono font-black text-slate-900 text-sm">
                          {formatNumber(u.totalRegistered)}
                        </td>
                        <td className="text-center font-mono font-bold text-emerald-800 text-sm">
                          {formatNumber(u.todayRegistered)}
                        </td>
                        <td className="text-center font-mono font-bold text-blue-800 text-sm">
                          {formatNumber(u.periodRegistered)}
                        </td>
                        <td className="text-center font-mono font-bold text-teal-800 text-sm">
                          {u.sharePercent}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-400">
                      <td colSpan={2} className="text-right font-black">إجمالي كافة الموظفين</td>
                      <td className="text-center font-mono font-black text-base text-teal-900 bg-teal-100/60">
                        {data?.cases.length}
                      </td>
                      <td className="text-center font-mono font-black text-emerald-900">
                        {data?.metrics.globalTodayCount}
                      </td>
                      <td className="text-center font-mono font-black text-blue-900">
                        {data?.cases.length}
                      </td>
                      <td className="text-center font-mono font-black">100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </UnifiedPrintLayout>

      {/* ─── نافذة المعالج الذكي لتحديد واستنتاج المحافظات ─── */}
      {showAutoDetectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:hidden animate-in fade-in-50">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-teal-900 to-slate-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">المعالج الذكي لاستنتاج وتحديد المحافظات للسجلات غير المحددة</h3>
                  <p className="text-[11px] text-teal-200">
                    استنتاج المحافظة آلياً من واقع أسماء المستشفيات والجهات واللجان المشكو في حقها
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAutoDetectModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              {detecting ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-700">جاري فحص السجلات واستنتاج المحافظات من أسماء المستشفيات...</p>
                </div>
              ) : !autoDetectData || autoDetectData.totalUnspecified === 0 ? (
                <div className="py-12 text-center text-slate-500 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <p className="text-sm font-bold text-slate-800">ممتاز! لا توجد حالياً أي سجلات غير محددة المحافظة.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 p-3 bg-teal-50 rounded-xl border border-teal-200 text-xs text-teal-900">
                    <span>
                      إجمالي السجلات غير المحددة: <strong>{autoDetectData.totalUnspecified}</strong> | تم استنتاج محافظة لـ:{" "}
                      <strong className="text-emerald-700">{autoDetectData.autoDetectedCount} سجل</strong>
                    </span>
                    <span className="text-[11px] text-teal-700">
                      يمكنك مراجعة أو تعديل المحافظة المقترحة لكل سجل قبل الحفظ
                    </span>
                  </div>

                  <div className="table-wrapper border border-slate-200 rounded-xl max-h-96">
                    <table className="table-custom text-xs w-full">
                      <thead>
                        <tr>
                          <th style={{ width: "6%" }}>م</th>
                          <th style={{ width: "16%" }}>رقم السجل</th>
                          <th style={{ width: "24%" }}>المستشفى / الجهة</th>
                          <th style={{ width: "18%" }}>الشاكي</th>
                          <th style={{ width: "22%" }}>المحافظة المقترحة</th>
                          <th style={{ width: "14%" }}>سند الاستنتاج</th>
                        </tr>
                      </thead>
                      <tbody>
                        {autoDetectData.suggestions.map((s: any, i: number) => (
                          <tr key={s.id} className={s.suggestedGovernorate ? "bg-emerald-50/20" : ""}>
                            <td className="text-center font-mono text-[11px] text-slate-500">{i + 1}</td>
                            <td className="font-bold text-slate-900 font-mono text-center">
                              {s.caseNumber} / {s.caseYear}
                            </td>
                            <td className="font-semibold text-slate-800">{s.hospitalName}</td>
                            <td className="text-slate-700">{s.complainantName}</td>
                            <td>
                              <select
                                value={s.suggestedGovernorate || ""}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setAutoDetectData((prev: any) => ({
                                    ...prev,
                                    suggestions: prev.suggestions.map((item: any) =>
                                      item.id === s.id ? { ...item, suggestedGovernorate: val, matchedReason: "تحديد يدوي" } : item
                                    ),
                                  }));
                                }}
                                className="form-select text-xs py-1 px-2 border-teal-500 bg-white font-bold text-teal-950 w-full rounded-lg"
                              >
                                <option value="">-- حدد المحافظة --</option>
                                {data?.governoratesList.map((g) => (
                                  <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                            </td>
                            <td className="text-[11px] text-slate-500">
                              {s.matchedReason || "لم يستدل تلقائياً"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setShowAutoDetectModal(false)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                إغلاق
              </button>
              {autoDetectData && autoDetectData.suggestions?.length > 0 && (
                <button
                  type="button"
                  disabled={applyingBatch}
                  onClick={() => {
                    const validUpdates = autoDetectData.suggestions
                      .filter((s: any) => s.suggestedGovernorate)
                      .map((s: any) => ({ caseId: s.id, governorate: s.suggestedGovernorate }));
                    if (validUpdates.length === 0) {
                      showToast("يرجى اختيار محافظة لسجل واحد على الأقل قبل الحفظ", "error");
                      return;
                    }
                    applyDetectedBatch(validUpdates);
                  }}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {applyingBatch
                      ? "جاري الحفظ والاعتماد..."
                      : `اعتماد وتثبيت المحافظات (${autoDetectData.suggestions.filter((s: any) => s.suggestedGovernorate).length} سجل)`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── نافذة تفاصيل وبيانات السجل المنبثقة (Pop-up Modal) ─── */}
      {selectedCaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:hidden animate-in fade-in-50">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-teal-900 via-teal-800 to-slate-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-teal-300 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-sm">
                      تفاصيل وبيانات السجل: ({selectedCaseModal.caseNumber}) لسنة ({selectedCaseModal.caseYear})
                    </h3>
                    <span className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full font-bold">
                      {TYPE_CONFIG[selectedCaseModal.registrationType]?.label || selectedCaseModal.registrationType}
                    </span>
                  </div>
                  <p className="text-[11px] text-teal-200 mt-0.5">
                    المرحلة: {STATUS_LABELS[selectedCaseModal.status]?.label || selectedCaseModal.status}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCaseModal(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-sm"
                title="إغلاق النافذة"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              {/* قسم 1: بيانات القيد والنيابة */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <Scale className="w-3.5 h-3.5 text-teal-700" />
                  <span>بيانات القيد والجهة القضائية</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">رقم وسنة السجل:</span>
                    <strong className="text-slate-900 font-mono">{selectedCaseModal.caseNumber} / {selectedCaseModal.caseYear}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">نوع القيد:</span>
                    <strong className="text-slate-900">{TYPE_CONFIG[selectedCaseModal.registrationType]?.label}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">المحافظة:</span>
                    <strong className="text-teal-900">{selectedCaseModal.governorate || selectedCaseModal.prosecutionRel?.governorate || "غير محدد"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">النيابة الكلية:</span>
                    <strong className="text-slate-900">{selectedCaseModal.prosecutionRel?.name || selectedCaseModal.prosecution || "شكوى مباشرة (بدون نيابة)"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">النيابة الجزئية:</span>
                    <strong className="text-slate-800">{selectedCaseModal.partialProsecutionRel?.name || selectedCaseModal.partialProsecution || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">رقم القضية / المحضر:</span>
                    <strong className="text-teal-900 font-mono">{selectedCaseModal.prosecutionCaseNumber || "—"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">عدد المرفقات:</span>
                    <strong className="text-slate-800 font-mono">{selectedCaseModal.attachmentsCount} ملف</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">تاريخ التسجيل:</span>
                    <strong className="text-slate-800 font-mono">{formatDate(selectedCaseModal.createdAt)}</strong>
                  </div>
                </div>
              </div>

              {/* قسم 2: أطراف الشكوى والمنشأة المشكو فيها */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <Building2 className="w-3.5 h-3.5 text-teal-700" />
                  <span>أطراف النزاع والمنشأة الطبية</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">الشاكي:</span>
                    <strong className="text-slate-900 block text-sm">{selectedCaseModal.complainantName || "—"}</strong>
                    {selectedCaseModal.complainantPhone && (
                      <span className="text-teal-700 font-mono text-[11px] block mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>{selectedCaseModal.complainantPhone}</span>
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">المشكو في حقه:</span>
                    <strong className="text-slate-900 block text-sm">{selectedCaseModal.respondentName || "—"}</strong>
                    {selectedCaseModal.respondentPhone && (
                      <span className="text-teal-700 font-mono text-[11px] block mt-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>{selectedCaseModal.respondentPhone}</span>
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-slate-500 block text-[11px]">المنشأة الطبية / الفرع:</span>
                    <strong className="text-slate-900 block text-sm">{selectedCaseModal.hospitalName || selectedCaseModal.entityName || "—"}</strong>
                    <span className="text-slate-500 text-[11px] block mt-1">
                      الفئة: {selectedCaseModal.entityType || "غير محددة"}
                    </span>
                  </div>
                </div>
              </div>

              {/* قسم 3: موضوع الشكوى وملخص الواقعة */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-teal-700" />
                  <span>موضوع الشكوى وملخص الواقعة</span>
                </h4>
                <div className="p-3.5 bg-slate-50 rounded-xl text-slate-800 text-xs leading-relaxed whitespace-pre-wrap border border-slate-200 font-body">
                  {selectedCaseModal.description || "لا يوجد ملخص مسجل للواقعة."}
                </div>
              </div>

              {/* قسم 4: التوجيه والمتابعة */}
              <div className="flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200 flex-wrap gap-2">
                <div>
                  <span className="text-slate-500">اللجنة الفرعية: </span>
                  <strong className="text-slate-900">{selectedCaseModal.subCommittee?.name || "لم تحدد بعد"}</strong>
                </div>
                <div>
                  <span className="text-slate-500">موظف القيد: </span>
                  <strong className="text-slate-900">{selectedCaseModal.createdBy?.fullName || selectedCaseModal.createdBy?.email || "—"}</strong>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedCaseModal(null)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors"
              >
                إغلاق النافذة
              </button>
              <button
                type="button"
                onClick={() => {
                  handleOpenEdit(selectedCaseModal);
                  setSelectedCaseModal(null);
                }}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                <span>تعديل بيانات السجل</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── نافذة تعديل بيانات السجل وتوثيق سبب التعديل (Edit Modal) ─── */}
      {editingCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:hidden animate-in fade-in-50">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-amber-700 to-amber-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-amber-200 shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">
                    تعديل بيانات السجل: {editingCase.caseNumber} / {editingCase.caseYear}
                  </h3>
                  <p className="text-[11px] text-amber-200">
                    سيتم تدوين اسمك وتاريخ التعديل وسبب التعديل تلقائياً في سجل الرقابة والتدقيق
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingCase(null)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveEdit} className="p-5 overflow-y-auto flex-1 space-y-3.5 text-xs">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* المحافظة */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">المحافظة *</label>
                  <select
                    value={editForm.governorate}
                    onChange={(e) => setEditForm({ ...editForm, governorate: e.target.value })}
                    required
                    className="input w-full"
                  >
                    <option value="">-- اختر المحافظة --</option>
                    {data?.governoratesList.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* فئة المنشأة */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">فئة المنشأة الطبية</label>
                  <select
                    value={editForm.entityType}
                    onChange={(e) => setEditForm({ ...editForm, entityType: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">-- اختر فئة المنشأة --</option>
                    {ENTITY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                {/* اسم المستشفى */}
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-800 block mb-1">اسم المستشفى / المركز الطبي المشكو فيه</label>
                  <input
                    type="text"
                    value={editForm.hospitalName}
                    onChange={(e) => setEditForm({ ...editForm, hospitalName: e.target.value })}
                    className="input w-full"
                    placeholder="مثال: مستشفيات جامعة القاهرة (قصر العيني)"
                  />
                </div>

                {/* رقم المحضر أو القضية */}
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-800 block mb-1">رقم المحضر / القضية المرتبط (إن وجد)</label>
                  <input
                    type="text"
                    value={editForm.prosecutionCaseNumber}
                    onChange={(e) => setEditForm({ ...editForm, prosecutionCaseNumber: e.target.value })}
                    className="input w-full"
                    placeholder="رقم المحضر أو القضية بالنيابة العامة"
                  />
                </div>

                {/* اسم الشاكي */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">اسم الشاكي</label>
                  <input
                    type="text"
                    value={editForm.complainantName}
                    onChange={(e) => setEditForm({ ...editForm, complainantName: e.target.value })}
                    className="input w-full"
                  />
                </div>

                {/* هاتف الشاكي */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">هاتف الشاكي</label>
                  <input
                    type="text"
                    value={editForm.complainantPhone}
                    onChange={(e) => setEditForm({ ...editForm, complainantPhone: e.target.value })}
                    className="input w-full font-mono text-left"
                    placeholder="01XXXXXXXXX"
                  />
                </div>

                {/* اسم المشكو في حقه */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">المشكو في حقه (الطبيب/المنشأة)</label>
                  <input
                    type="text"
                    value={editForm.respondentName}
                    onChange={(e) => setEditForm({ ...editForm, respondentName: e.target.value })}
                    className="input w-full"
                  />
                </div>

                {/* هاتف المشكو في حقه */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">هاتف المشكو فيه</label>
                  <input
                    type="text"
                    value={editForm.respondentPhone}
                    onChange={(e) => setEditForm({ ...editForm, respondentPhone: e.target.value })}
                    className="input w-full font-mono text-left"
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </div>

              {/* ملخص الواقعة وموضوع الشكوى */}
              <div>
                <label className="font-bold text-slate-800 block mb-1">ملخص الواقعة / موضوع الشكوى</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="input w-full leading-relaxed"
                />
              </div>

              {/* ─── حقل إلزامي: سبب وسند التعديل للرقابة والتدقيق ─── */}
              <div className="p-3 bg-amber-50 rounded-xl border-2 border-amber-300 space-y-1">
                <label className="font-black text-amber-950 flex items-center justify-between">
                  <span>سبب وسند التعديل (إلزامي للرقابة والتدقيق الأمني) *</span>
                  <span className="text-[10px] text-amber-700 font-normal">يُسجل في سجل الحركات Audit Log</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.reason}
                  onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                  className="input w-full bg-white border-amber-300 font-medium"
                  placeholder="مثال: تصحيح المحافظة واسم المستشفى بناءً على المستندات المقدمة بالشكوى"
                />
              </div>

              {/* Footer Buttons */}
              <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingCase(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{savingEdit ? "جاري الحفظ والتدوين..." : "حفظ التعديل واعتماده"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ─── إشعار تفاعلي عصري أنيق (In-App Modern Toast Notification) ─── */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] max-w-lg w-[92%] sm:w-auto min-w-[340px] pointer-events-auto animate-in fade-in-50 slide-in-from-top-4 duration-300">
          <div
            className={`p-4 rounded-2xl shadow-2xl border flex items-start gap-3 backdrop-blur-md ${
              toast.type === "success"
                ? "bg-slate-900/95 text-white border-emerald-500/60 shadow-emerald-950/30"
                : toast.type === "error"
                ? "bg-slate-900/95 text-white border-rose-500/60 shadow-rose-950/30"
                : "bg-slate-900/95 text-white border-teal-500/60 shadow-teal-950/30"
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                toast.type === "success"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : toast.type === "error"
                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  : "bg-teal-500/20 text-teal-400 border border-teal-500/30"
              }`}
            >
              {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {toast.type === "error" && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {toast.type === "info" && <Info className="w-5 h-5 text-teal-400" />}
            </div>
            <div className="flex-1 text-right pt-0.5">
              {toast.title && <p className="font-black text-xs text-white mb-0.5">{toast.title}</p>}
              <p className="text-xs text-slate-200 leading-relaxed font-medium">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
