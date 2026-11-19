"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatDate, formatDateTime, formatNumber } from "@/lib/formatters";
import { generateStyledProtectedExcel } from "@/lib/excel-export";
import { UnifiedPrintLayout } from "@/components/reports/UnifiedPrintLayout";
import { OFFICIAL_PROSECUTIONS_LIST } from "@/lib/constants/prosecutions";
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
  Check,
  Trash2,
  Archive,
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
  prosecutions: {
    id: string;
    name: string;
    governorate?: string | null;
    type?: string;
    parentId?: string | null;
    parentName?: string | null;
  }[];
  subCommitteesList: { id: string; name: string }[];
  governoratesList: string[];
  realYearsMetadata?: {
    caseYears: { year: number; count: number }[];
    incomingYears: { year: number; count: number }[];
    incomingMonths: Record<string, number>;
    createdYears: { year: number; count: number }[];
    createdMonths: Record<string, number>;
  };
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

const ARABIC_MONTHS = [
  { index: 0, name: "يناير (شهر 1)" },
  { index: 1, name: "فبراير (شهر 2)" },
  { index: 2, name: "مارس (شهر 3)" },
  { index: 3, name: "أبريل (شهر 4)" },
  { index: 4, name: "مايو (شهر 5)" },
  { index: 5, name: "يونيو (شهر 6)" },
  { index: 6, name: "يوليو (شهر 7)" },
  { index: 7, name: "أغسطس (شهر 8)" },
  { index: 8, name: "سبتمبر (شهر 9)" },
  { index: 9, name: "أكتوبر (شهر 10)" },
  { index: 10, name: "نوفمبر (شهر 11)" },
  { index: 11, name: "ديسمبر (شهر 12)" },
];

export default function RegistrationReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  const isAdmin = data?.currentUser?.role === "ADMIN";

  // الفلاتر الشاملة
  const [governorate, setGovernorate] = useState("ALL");
  const [caseYear, setCaseYear] = useState("ALL");
  const [prosecutionId, setProsecutionId] = useState("ALL");
  const [partialProsecutionId, setPartialProsecutionId] = useState("ALL");
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
  const [dateBasis, setDateBasis] = useState<"caseYear" | "incomingDate" | "createdAt">("caseYear");
  const [reportYear, setReportYear] = useState("ALL");
  const [reportMonth, setReportMonth] = useState("ALL");
  const [showCustomDateRange, setShowCustomDateRange] = useState(false);
  const [dateShortcut, setDateShortcut] = useState<
    "ALL" | "TODAY" | "YESTERDAY" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR" | "LAST_YEAR" | "CUSTOM_MONTH" | "CUSTOM"
  >("ALL");
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // التبويب النشط (الافتراضي: التقرير العددي الإحصائي بالأرقام فقط)
  const [activeTab, setActiveTab] = useState<"numerical" | "cases" | "governorates" | "prosecutions" | "stages" | "workload">("numerical");
  const [casesTableSearch, setCasesTableSearch] = useState("");
  const [casesTableYear, setCasesTableYear] = useState("ALL");
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
    prosecution: "",
    partialProsecution: "",
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

  // حالة نافذة تعيين وتغيير النيابة السريعة
  const [quickProsCase, setQuickProsCase] = useState<CaseItem | null>(null);
  const [quickPlenary, setQuickPlenary] = useState("");
  const [quickDistrict, setQuickDistrict] = useState("");
  const [quickGov, setQuickGov] = useState("");
  const [savingQuickPros, setSavingQuickPros] = useState(false);

  // حالة معالج كشف التكرارات والازدواج
  const [showOctoberModal, setShowOctoberModal] = useState(false);
  const [octoberLoading, setOctoberLoading] = useState(false);
  const [octoberData, setOctoberData] = useState<any | null>(null);
  const [migratingOctober, setMigratingOctober] = useState(false);
  const [duplicatesTab, setDuplicatesTab] = useState<"prosecutions" | "cases">("prosecutions");
  const [deletingDuplicateCase, setDeletingDuplicateCase] = useState<any | null>(null);
  const [deleteDuplicateReason, setDeleteDuplicateReason] = useState("");
  const [isDeletingDuplicate, setIsDeletingDuplicate] = useState(false);
  const [archivingCaseId, setArchivingCaseId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function handleOpenEdit(c: CaseItem) {
    setEditingCase(c);
    setEditForm({
      governorate: c.governorate || c.prosecutionRel?.governorate || "",
      prosecution: c.prosecutionRel?.name || c.prosecution || "",
      partialProsecution: c.partialProsecutionRel?.name || c.partialProsecution || "",
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
          prosecution: editForm.prosecution.trim() || null,
          partialProsecution: editForm.partialProsecution.trim() || null,
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

  // النيابات الكلية المتاحة مفلترة بحسب المحافظة المحددة
  const plenaryProsecutions = useMemo(() => {
    if (!data?.prosecutions) return [];
    const list = data.prosecutions.filter((p) => !p.type || p.type === "PLENARY" || p.type === "ADMINISTRATIVE");
    if (governorate === "ALL" || governorate === "UNSPECIFIED") return list;
    return list.filter((p) => !p.governorate || p.governorate === governorate);
  }, [data?.prosecutions, governorate]);

  // النيابات الجزئية المتاحة مفلترة بحسب النيابة الكلية والمحافظة
  const districtProsecutions = useMemo(() => {
    if (!data?.prosecutions) return [];
    const list = data.prosecutions.filter((p) => p.type === "DISTRICT");
    if (prosecutionId !== "ALL") {
      const selectedPlenary = data.prosecutions.find((p) => p.id === prosecutionId);
      return list.filter((p) => {
        if (p.parentId && p.parentId === prosecutionId) return true;
        if (selectedPlenary && p.parentName && p.parentName === selectedPlenary.name) return true;
        return false;
      });
    }
    if (governorate !== "ALL" && governorate !== "UNSPECIFIED") {
      return list.filter((p) => !p.governorate || p.governorate === governorate);
    }
    return list;
  }, [data?.prosecutions, prosecutionId, governorate]);

  // قائمة السنوات الفعلية المتاحة المستخرجة حصراً من قاعدة البيانات (بدون افتراضات)
  const activeYearsList = useMemo(() => {
    if (data?.realYearsMetadata) {
      if (dateBasis === "caseYear") return data.realYearsMetadata.caseYears;
      if (dateBasis === "incomingDate") return data.realYearsMetadata.incomingYears;
      return data.realYearsMetadata.createdYears;
    }
    if (data?.cases) {
      const map = new Map<number, number>();
      data.cases.forEach((c) => {
        const yr =
          dateBasis === "caseYear"
            ? c.caseYear
            : dateBasis === "incomingDate"
            ? (c.incomingDate ? new Date(c.incomingDate).getFullYear() : null)
            : (c.createdAt ? new Date(c.createdAt).getFullYear() : null);
        if (yr && !isNaN(yr)) map.set(yr, (map.get(yr) || 0) + 1);
      });
      return Array.from(map.entries())
        .map(([year, count]) => ({ year, count }))
        .sort((a, b) => b.year - a.year);
    }
    return [];
  }, [data, dateBasis]);

  // قائمة الشهور المرتبطة بالسنة المختارة الفعلية
  const activeMonthsList = useMemo(() => {
    if (reportYear === "ALL") return [];
    const monthsMap =
      dateBasis === "incomingDate"
        ? data?.realYearsMetadata?.incomingMonths
        : data?.realYearsMetadata?.createdMonths;

    return ARABIC_MONTHS.map((m) => {
      const monthNum = m.index + 1;
      const key = `${reportYear}-${monthNum}`;
      const count = monthsMap ? monthsMap[key] || 0 : 0;
      return {
        index: m.index,
        monthNum,
        name: m.name,
        count,
      };
    });
  }, [data, dateBasis, reportYear]);

  // السجلات المفلترة تفصيلياً داخل تبويب جدول السجلات التفصيلي
  const displayedCases = useMemo(() => {
    if (!data?.cases) return [];
    return data.cases.filter((c) => {
      if (casesTableYear !== "ALL" && String(c.caseYear) !== casesTableYear) return false;
      if (casesTableSearch.trim()) {
        const q = casesTableSearch.toLowerCase().trim();
        const mNum = `${c.caseNumber}/${c.caseYear}`.includes(q);
        const mProsNum = c.prosecutionCaseNumber?.toLowerCase().includes(q);
        const mComp = c.complainantName?.toLowerCase().includes(q);
        const mResp = (c.respondentName || c.entityName || c.hospitalName)?.toLowerCase().includes(q);
        const mPros = (c.prosecution || c.partialProsecution)?.toLowerCase().includes(q);
        const mGov = (c.governorate || c.prosecutionRel?.governorate)?.toLowerCase().includes(q);
        if (!mNum && !mProsNum && !mComp && !mResp && !mPros && !mGov) return false;
      }
      return true;
    });
  }, [data?.cases, casesTableYear, casesTableSearch]);

  // بناء نص ملخص الفلاتر المطبقة للترويسة والطباعة
  function getFilterSummaryText(): string {
    const parts: string[] = [];
    const basisLabel =
      dateBasis === "caseYear"
        ? "سنة قيد القضية"
        : dateBasis === "incomingDate"
        ? "تاريخ الوارد"
        : "تاريخ التسجيل بالمنظومة";
    parts.push(`الأساس: ${basisLabel}`);

    if (reportYear !== "ALL") {
      parts.push(`السنة: ${reportYear}`);
      if (reportMonth !== "ALL") {
        const mObj = ARABIC_MONTHS.find((m) => m.index + 1 === Number(reportMonth));
        parts.push(`الشهر: ${mObj?.name || `شهر ${reportMonth}`}`);
      } else {
        parts.push("الشهر: كامل السنة");
      }
    } else if (caseYear !== "ALL") {
      parts.push(`سنة القضية: ${caseYear}`);
    } else {
      parts.push("السنة: كافة السنوات والملفات");
    }

    if (governorate !== "ALL") {
      parts.push(governorate === "UNSPECIFIED" ? "المحافظة: غير محددة" : `المحافظة: ${governorate}`);
    }
    if (prosecutionId !== "ALL") {
      const p = data?.prosecutions.find((x) => x.id === prosecutionId);
      parts.push(`النيابة الكلية: ${p?.name || prosecutionId}`);
    }
    if (partialProsecutionId !== "ALL") {
      const p = data?.prosecutions.find((x) => x.id === partialProsecutionId);
      parts.push(`النيابة الجزئية: ${p?.name || partialProsecutionId}`);
    }
    if (registrationType !== "ALL") {
      parts.push(`النوع: ${TYPE_CONFIG[registrationType]?.label || registrationType}`);
    }
    if (status !== "ALL") {
      parts.push(`المرحلة: ${STATUS_LABELS[status]?.label || status}`);
    }
    if (entityType !== "ALL") parts.push(`فئة الجهة: ${entityType}`);
    if (branchOrHospital.trim()) parts.push(`الفرع/المنشأة: ${branchOrHospital.trim()}`);
    if (subCommitteeId !== "ALL") {
      const s = data?.subCommitteesList.find((x) => x.id === subCommitteeId);
      parts.push(`اللجنة: ${s?.name || subCommitteeId}`);
    }
    if (startDate || endDate) {
      parts.push(`فترة مخصصة: ${startDate || "البداية"} إلى ${endDate || "الآن"}`);
    }
    return parts.length > 0 ? parts.join(" | ") : "جميع السجلات (إجمالي عام بدون فلترة وبدون مراحل)";
  }

  interface FilterOverrides {
    governorate?: string;
    caseYear?: string;
    reportYear?: string;
    reportMonth?: string;
    prosecutionId?: string;
    partialProsecutionId?: string;
    entityType?: string;
    branchOrHospital?: string;
    subCommitteeId?: string;
    status?: string;
    registrationType?: string;
    complainantName?: string;
    respondentName?: string;
    startDate?: string;
    endDate?: string;
    dateBasis?: "incomingDate" | "createdAt" | "caseYear";
    createdById?: string;
  }

  function fetchReport(overrides?: FilterOverrides | string, overrideYear?: string) {
    setLoading(true);
    setError(null);
    const overridesObj: FilterOverrides =
      typeof overrides === "string"
        ? { governorate: overrides, caseYear: overrideYear }
        : overrides || {};

    const activeGov = overridesObj.governorate !== undefined ? overridesObj.governorate : governorate;
    const activeYear = overridesObj.caseYear !== undefined ? overridesObj.caseYear : caseYear;
    const activeDateBasis = overridesObj.dateBasis !== undefined ? overridesObj.dateBasis : dateBasis;
    const activeReportYear = overridesObj.reportYear !== undefined ? overridesObj.reportYear : reportYear;
    const activeReportMonth = overridesObj.reportMonth !== undefined ? overridesObj.reportMonth : reportMonth;
    const activePros = overridesObj.prosecutionId !== undefined ? overridesObj.prosecutionId : prosecutionId;
    const activePartPros = overridesObj.partialProsecutionId !== undefined ? overridesObj.partialProsecutionId : partialProsecutionId;
    const activeEntityType = overridesObj.entityType !== undefined ? overridesObj.entityType : entityType;
    const activeBranch = overridesObj.branchOrHospital !== undefined ? overridesObj.branchOrHospital : branchOrHospital;
    const activeSubCom = overridesObj.subCommitteeId !== undefined ? overridesObj.subCommitteeId : subCommitteeId;
    const activeStatus = overridesObj.status !== undefined ? overridesObj.status : status;
    const activeType = overridesObj.registrationType !== undefined ? overridesObj.registrationType : registrationType;
    const activeComp = overridesObj.complainantName !== undefined ? overridesObj.complainantName : complainantName;
    const activeResp = overridesObj.respondentName !== undefined ? overridesObj.respondentName : respondentName;
    const activeStart = overridesObj.startDate !== undefined ? overridesObj.startDate : startDate;
    const activeEnd = overridesObj.endDate !== undefined ? overridesObj.endDate : endDate;
    const activeUser = overridesObj.createdById !== undefined ? overridesObj.createdById : createdById;

    const params = new URLSearchParams();
    if (activeGov !== "ALL") params.set("governorate", activeGov);
    if (activeDateBasis) params.set("dateBasis", activeDateBasis);

    if (activeReportYear && activeReportYear !== "ALL") {
      params.set("reportYear", activeReportYear);
      if (activeReportMonth && activeReportMonth !== "ALL") {
        params.set("reportMonth", activeReportMonth);
      }
    } else if (activeYear !== "ALL") {
      params.set("caseYear", activeYear);
    } else if (activeStart || activeEnd) {
      if (activeStart) params.set("startDate", activeStart);
      if (activeEnd) params.set("endDate", activeEnd);
    }

    if (activePros !== "ALL") params.set("prosecutionId", activePros);
    if (activePartPros !== "ALL") params.set("partialProsecutionId", activePartPros);
    if (activeEntityType !== "ALL") params.set("entityType", activeEntityType);
    if (activeBranch.trim()) params.set("branchOrHospital", activeBranch.trim());
    if (activeSubCom !== "ALL") params.set("subCommitteeId", activeSubCom);
    if (activeStatus !== "ALL") params.set("status", activeStatus);
    if (activeType !== "ALL") params.set("registrationType", activeType);
    if (activeComp.trim()) params.set("complainantName", activeComp.trim());
    if (activeResp.trim()) params.set("respondentName", activeResp.trim());
    if (activeUser !== "ALL") params.set("createdById", activeUser);

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

  // تعيين وتغيير سريع للنيابة من داخل جدول السجلات
  async function handleQuickAssignPros(caseId: string, pros: string, partialPros?: string, gov?: string) {
    if (!pros) return;
    try {
      const payload: any = { prosecution: pros };
      if (partialPros !== undefined) payload.partialProsecution = partialPros || null;
      if (gov) payload.governorate = gov;

      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "تعذر تحديث النيابة");
      }
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cases: prev.cases.map((c) =>
            c.id === caseId
              ? {
                  ...c,
                  prosecution: pros,
                  partialProsecution: partialPros !== undefined ? partialPros : c.partialProsecution,
                  governorate: gov || c.governorate,
                }
              : c
          ),
        };
      });
      fetchReport();
      showToast(`تم تحديث وتثبيت النيابة (${pros}) للسجل بنجاح.`, "success");
    } catch (e: any) {
      showToast(e.message || "حدث خطأ أثناء حفظ النيابة", "error");
    }
  }

  function handleOpenQuickPros(c: CaseItem) {
    setQuickProsCase(c);
    const curPros = c.prosecutionRel?.name || c.prosecution || "";
    setQuickPlenary(curPros);
    setQuickDistrict(c.partialProsecutionRel?.name || c.partialProsecution || "");
    setQuickGov(c.governorate || c.prosecutionRel?.governorate || "");
  }

  async function handleSaveQuickProsModal() {
    if (!quickProsCase || !quickPlenary.trim()) return;
    setSavingQuickPros(true);
    try {
      await handleQuickAssignPros(
        quickProsCase.id,
        quickPlenary.trim(),
        quickDistrict.trim() || undefined,
        quickGov.trim() || undefined
      );
      setQuickProsCase(null);
    } finally {
      setSavingQuickPros(false);
    }
  }

  // فتح معالج توحيد نيابة أكتوبر الكلية
  async function openOctoberWizard() {
    if (!isAdmin) {
      showToast("هذه الأداة مخصصة لمدير النظام (Admin) فقط", "error");
      return;
    }
    setShowOctoberModal(true);
    setOctoberLoading(true);
    try {
      const res = await fetch(`/api/cases/standardize-prosecution?_t=${Date.now()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "تعذر فحص التكرارات");
      setOctoberData(json);
    } catch (e: any) {
      showToast(e.message || "تعذر جلب بيانات حصر التكرارات والنيابات", "error");
    } finally {
      setOctoberLoading(false);
    }
  }

  // تطبيق توحيد نيابة أكتوبر دفعة واحدة
  async function applyOctoberStandardization() {
    setMigratingOctober(true);
    try {
      const res = await fetch("/api/cases/standardize-prosecution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetProsecution: "أكتوبر الكلية", targetGovernorate: "الجيزة" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل تنفيذ التوحيد");
      showToast(json.message || "تم توحيد كافة سجلات نيابة أكتوبر بنجاح.", "success", "اكتمل التوحيد المعتمد");
      // تحديث البيانات
      const refreshRes = await fetch(`/api/cases/standardize-prosecution?_t=${Date.now()}`, { cache: "no-store" });
      const refreshJson = await refreshRes.json();
      setOctoberData(refreshJson);
      fetchReport();
    } catch (e: any) {
      showToast(e.message || "حدث خطأ أثناء توحيد النيابة", "error");
    } finally {
      setMigratingOctober(false);
    }
  }

  // تطبيق توحيد عام لأي مجموعة مسميات نيابات مكررة
  async function handleUnifyVariants(variants: string[], targetName: string, targetGov?: string) {
    setMigratingOctober(true);
    try {
      const res = await fetch("/api/cases/standardize-prosecution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceVariants: variants,
          targetProsecution: targetName,
          targetGovernorate: targetGov,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل تنفيذ التوحيد");
      showToast(json.message || `تم توحيد السجلات بنجاح تحت مسمى "${targetName}".`, "success", "اكتمل التوحيد المعتمد");
      // تحديث فحص التكرارات
      const refreshRes = await fetch(`/api/cases/standardize-prosecution?_t=${Date.now()}`, { cache: "no-store" });
      const refreshJson = await refreshRes.json();
      setOctoberData(refreshJson);
      fetchReport();
    } catch (e: any) {
      showToast(e.message || "حدث خطأ أثناء توحيد النيابة", "error");
    } finally {
      setMigratingOctober(false);
    }
  }

  // حذف السجل المكرر مع التحقق والرقابة الأمنية
  async function handleDeleteDuplicateCase() {
    if (!deletingDuplicateCase) return;
    if (!deleteDuplicateReason.trim()) {
      showToast("يرجى تدوين سبب وسند الحذف (إلزامي للرقابة والتدقيق الأمني)", "error");
      return;
    }
    setIsDeletingDuplicate(true);
    try {
      const res = await fetch(`/api/cases/${deletingDuplicateCase.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deleteDuplicateReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل حذف السجل");
      showToast(json.message || "تم حذف السجل المكرر بنجاح.", "success", "تم الحذف والتدقيق");
      setDeletingDuplicateCase(null);
      setDeleteDuplicateReason("");
      // تحديث فحص التكرارات وإحصائيات التقرير
      const refreshRes = await fetch(`/api/cases/standardize-prosecution?_t=${Date.now()}`, { cache: "no-store" });
      const refreshJson = await refreshRes.json();
      setOctoberData(refreshJson);
      fetchReport();
    } catch (err: any) {
      showToast(err.message || "تعذر حذف السجل", "error");
    } finally {
      setIsDeletingDuplicate(false);
    }
  }

  // أرشفة / إغلاق السجل المكرر
  async function handleArchiveDuplicateCase(caseId: string, caseLabel: string) {
    setArchivingCaseId(caseId);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CLOSED",
          reason: "أرشفة السجل المكرر لعدم احتسابه في السجلات النشطة",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل أرشفة السجل");
      showToast(`تمت أرشفة السجل (${caseLabel}) وإغلاقه بنجاح.`, "success", "تمت الأرشفة");
      const refreshRes = await fetch(`/api/cases/standardize-prosecution?_t=${Date.now()}`, { cache: "no-store" });
      const refreshJson = await refreshRes.json();
      setOctoberData(refreshJson);
      fetchReport();
    } catch (err: any) {
      showToast(err.message || "تعذر أرشفة السجل", "error");
    } finally {
      setArchivingCaseId(null);
    }
  }

  // استرجاع السجل المؤرشف وإلغاء الأرشفة
  async function handleRestoreDuplicateCase(caseId: string, caseLabel: string) {
    setArchivingCaseId(caseId);
    try {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "REGISTERED",
          reason: "استرجاع السجل المؤرشف وإلغاء الأرشفة",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "فشل استرجاع السجل");
      showToast(`تم استرجاع السجل (${caseLabel}) وإلغاء أرشفته بنجاح.`, "success", "تم الاسترجاع");
      const refreshRes = await fetch(`/api/cases/standardize-prosecution?_t=${Date.now()}`, { cache: "no-store" });
      const refreshJson = await refreshRes.json();
      setOctoberData(refreshJson);
      fetchReport();
    } catch (err: any) {
      showToast(err.message || "تعذر استرجاع السجل", "error");
    } finally {
      setArchivingCaseId(null);
    }
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
    if (!isAdmin) {
      showToast("هذه الأداة مخصصة لمدير النظام (Admin) فقط", "error");
      return;
    }
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
    if (caseYear !== "ALL") {
      setActiveTab("cases"); // إظهار السجلات التفصيلية فوراً كما هو مطلوب
    }
    fetchReport();
  }

  // تطبيق الاختصارات السريعة للفترات الزمنية
  function applyDateShortcut(
    shortcut: "ALL" | "TODAY" | "YESTERDAY" | "THIS_MONTH" | "LAST_MONTH" | "THIS_YEAR" | "LAST_YEAR"
  ) {
    setDateShortcut(shortcut);
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    let newStart = "";
    let newEnd = "";

    if (shortcut === "ALL") {
      newStart = "";
      newEnd = "";
    } else if (shortcut === "TODAY") {
      newStart = fmt(today);
      newEnd = fmt(today);
    } else if (shortcut === "YESTERDAY") {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      newStart = fmt(y);
      newEnd = fmt(y);
    } else if (shortcut === "THIS_MONTH") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      const last = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      newStart = fmt(first);
      newEnd = fmt(last);
      setSelectedMonth(today.getMonth());
      setSelectedYear(today.getFullYear());
    } else if (shortcut === "LAST_MONTH") {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      newStart = fmt(first);
      newEnd = fmt(last);
      setSelectedMonth(first.getMonth());
      setSelectedYear(first.getFullYear());
    } else if (shortcut === "THIS_YEAR") {
      newStart = `${today.getFullYear()}-01-01`;
      newEnd = `${today.getFullYear()}-12-31`;
      setSelectedYear(today.getFullYear());
    } else if (shortcut === "LAST_YEAR") {
      const prevYr = today.getFullYear() - 1;
      newStart = `${prevYr}-01-01`;
      newEnd = `${prevYr}-12-31`;
      setSelectedYear(prevYr);
    }

    setStartDate(newStart);
    setEndDate(newEnd);
    if (shortcut !== "ALL") {
      setActiveTab("cases"); // إظهار السجلات التفصيلية فوراً للتقرير المطلوب
    }
    fetchReport({ startDate: newStart, endDate: newEnd });
  }

  // تقرير شهري مخصص لشهر وسنة معينة
  function selectCustomMonth(mIdx: number, yr: number) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const first = fmt(new Date(yr, mIdx, 1));
    const last = fmt(new Date(yr, mIdx + 1, 0));
    setSelectedMonth(mIdx);
    setSelectedYear(yr);
    setStartDate(first);
    setEndDate(last);
    setDateShortcut("CUSTOM_MONTH");
    setActiveTab("cases");
    fetchReport({ startDate: first, endDate: last });
  }

  // اختيار عام قيد القضية / المحضر
  function selectCaseYear(yr: string) {
    setCaseYear(yr);
    setActiveTab("cases");
    fetchReport({ caseYear: yr });
  }

  // تغيير أساس وتصنيف التاريخ
  function changeDateBasis(newBasis: "incomingDate" | "createdAt" | "caseYear") {
    setDateBasis(newBasis);
    fetchReport({ dateBasis: newBasis });
  }

  // إعادة ضبط كاملة لكافة الفلاتر (عرض الإجمالي بدون فلتر وبدون مراحل)
  function handleResetFilters() {
    setGovernorate("ALL");
    setCaseYear("ALL");
    setCasesTableSearch("");
    setCasesTableYear("ALL");
    setProsecutionId("ALL");
    setPartialProsecutionId("ALL");
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
    setDateBasis("incomingDate");
    setCreatedById("ALL");
    setError(null);

    fetchReport({
      governorate: "ALL",
      caseYear: "ALL",
      prosecutionId: "ALL",
      partialProsecutionId: "ALL",
      entityType: "ALL",
      branchOrHospital: "",
      subCommitteeId: "ALL",
      status: "ALL",
      registrationType: "ALL",
      createdById: "ALL",
      complainantName: "",
      respondentName: "",
      startDate: "",
      endDate: "",
      dateBasis: "incomingDate",
    });
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
        { header: "رقم سجل الوارد", key: "caseNumber", width: 90, align: "center" },
        { header: "تاريخ سجل الوارد", key: "incomingDateFormatted", width: 95, align: "center" },
        { header: "نوع السجل", key: "typeLabel", width: 80, align: "center" },
        { header: "رقم القضية / المحضر / الشكوى", key: "prosecutionCaseNumber", width: 140, align: "center" },
        { header: "عام قيد القضية", key: "caseYear", width: 80, align: "center", type: "Number" },
        { header: "المحافظة", key: "governorate", width: 100, align: "center" },
        { header: "النيابة المختصة", key: "prosecution", width: 140, align: "right" },
        { header: "الفرع / المنشأة المشكو في حقها", key: "hospitalName", width: 160, align: "right" },
        { header: "اسم الشاكي", key: "complainantName", width: 130, align: "right" },
        { header: "اسم المشكو في حقه", key: "respondentName", width: 130, align: "right" },
        { header: "اللجنة الفرعية", key: "subCommittee", width: 120, align: "center" },
        { header: "المرحلة الحالية", key: "statusLabel", width: 140, align: "center" },
        { header: "الموظف المسجل", key: "createdByName", width: 120, align: "center" },
        { header: "تاريخ التسجيل بالمنظومة", key: "createdAtFormatted", width: 110, align: "center" },
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
          incomingDateFormatted: c.incomingDate ? formatDate(c.incomingDate) : "—",
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
          createdAtFormatted: formatDateTime(c.createdAt),
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

        {/* ─── محرك استخراج التقارير بالقوائم المنسدلة المرتبطة ─── */}
        <form onSubmit={handleFilterSubmit} className="space-y-4">
          {/* 1. المجموعة الزمنية المرتبطة: أساس التقرير + السنة الفعلية بقاعدة البيانات + الشهر المرتبط */}
          <div className="bg-gradient-to-r from-teal-950 via-slate-900 to-teal-900 text-white p-4 rounded-2xl shadow-sm border border-teal-800/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-teal-800/40 pb-2">
              <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>المحددات الزمنية المرتبطة (من واقع السجلات الفعلية المسجلة فقط)</span>
              </span>
              <span className="text-[11px] text-teal-200">
                {activeYearsList.length > 0
                  ? `متاح (${activeYearsList.length}) سنوات فعلية بقاعدة البيانات`
                  : "جاري حصر السنوات الفعلية..."}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              {/* قائمة 1: أساس ومعيار التقرير */}
              <div>
                <label className="block text-[11px] font-bold text-teal-100 mb-1 flex items-center gap-1">
                  <span>1. معيار وتصنيف التقرير</span>
                </label>
                <select
                  value={dateBasis}
                  onChange={(e) => {
                    const newBasis = e.target.value as "caseYear" | "incomingDate" | "createdAt";
                    setDateBasis(newBasis);
                    fetchReport({ dateBasis: newBasis, reportYear: reportYear !== "ALL" ? reportYear : undefined });
                  }}
                  className="w-full text-xs font-bold py-2 px-2.5 rounded-xl bg-slate-900/90 text-amber-300 border border-teal-500/50 focus:ring-2 focus:ring-teal-400 focus:outline-none cursor-pointer"
                >
                  <option value="caseYear">📅 عام قيد القضية / المحضر / الشكوى (سنة القضية)</option>
                  <option value="incomingDate">📥 تاريخ استلام وقيد سجل الوارد (تاريخ الوارد)</option>
                  <option value="createdAt">💻 تاريخ ووقت القيد الإلكتروني بالمنظومة</option>
                </select>
                <span className="text-[10px] text-teal-300/80 mt-1 block">
                  {dateBasis === "caseYear"
                    ? "يبحث وفق سنة قيد القضية المسجلة بالسجل"
                    : dateBasis === "incomingDate"
                    ? "يبحث وفق تاريخ استلام الشكوى / كتاب النيابة"
                    : "يبحث وفق تاريخ حفظ السجل على السيستم"}
                </span>
              </div>

              {/* قائمة 2: السنة الفعلية (مرتبطة ومستخرجة من قاعدة البيانات فقط) */}
              <div>
                <label className="block text-[11px] font-bold text-teal-100 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-300" />
                    <span>2. السنة (الأعوام المسجلة فعلياً)</span>
                  </span>
                  {reportYear !== "ALL" && (
                    <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black font-mono">
                      سنة {reportYear}
                    </span>
                  )}
                </label>
                <select
                  value={reportYear}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReportYear(val);
                    setReportMonth("ALL");
                    setStartDate("");
                    setEndDate("");
                    setDateShortcut("ALL");
                    fetchReport({
                      reportYear: val,
                      reportMonth: "ALL",
                      startDate: "",
                      endDate: "",
                    });
                  }}
                  className="w-full text-xs font-mono font-bold py-2 px-2.5 rounded-xl bg-slate-900/90 text-white border border-teal-500/50 focus:ring-2 focus:ring-teal-400 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">جميع السنوات والملفات المسجلة (إجمالي عام)</option>
                  {activeYearsList.map((item) => (
                    <option key={item.year} value={String(item.year)}>
                      سنة {item.year} — ({formatNumber(item.count)} سجل مسجل فعلياً)
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-teal-300/80 mt-1 block">
                  {reportYear !== "ALL"
                    ? `محددة سنة ${reportYear} فقط`
                    : "تظهر فقط الأعوام التي تحوي ملفات مسجلة"}
                </span>
              </div>

              {/* قائمة 3: الشهر (مرتبط بالسنة المختارة) */}
              <div>
                <label className="block text-[11px] font-bold text-teal-100 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-amber-300" />
                    <span>3. الشهر (التقرير الشهري)</span>
                  </span>
                  {reportMonth !== "ALL" && (
                    <span className="text-[10px] bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded font-black font-mono">
                      شهر {reportMonth}
                    </span>
                  )}
                </label>
                <select
                  value={reportMonth}
                  disabled={reportYear === "ALL"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setReportMonth(val);
                    setStartDate("");
                    setEndDate("");
                    fetchReport({
                      reportYear: reportYear,
                      reportMonth: val,
                      startDate: "",
                      endDate: "",
                    });
                  }}
                  className={`w-full text-xs font-bold py-2 px-2.5 rounded-xl bg-slate-900/90 border border-teal-500/50 focus:ring-2 focus:ring-teal-400 focus:outline-none cursor-pointer ${
                    reportYear === "ALL"
                      ? "opacity-50 text-slate-400 cursor-not-allowed"
                      : "text-white"
                  }`}
                >
                  <option value="ALL">
                    {reportYear === "ALL"
                      ? "اختر سنة أولاً لتفعيل اختيار الشهر (أو كامل المدة)"
                      : `كامل سنة ${reportYear} (إجمالي العام بالكامل)`}
                  </option>
                  {activeMonthsList.map((m) => (
                    <option key={m.monthNum} value={String(m.monthNum)}>
                      {m.name} {m.count > 0 ? `— (${formatNumber(m.count)} سجل)` : "— (0 سجل)"}
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-teal-300/80 mt-1 block">
                  {reportYear === "ALL"
                    ? "حدد السنة لتفعيل قائمة شهورها"
                    : `يعرض إحصائية شهور سنة ${reportYear}`}
                </span>
              </div>
            </div>
          </div>

          {/* 2. المجموعة الجغرافية والقضائية والإجرائية المرتبطة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 pt-1">
            {/* المحافظة */}
            <div>
              <label className="label flex items-center gap-1 font-bold text-slate-800">
                <MapPin className="w-3 h-3 text-rose-600" />
                <span>4. المحافظة</span>
              </label>
              <select
                value={governorate}
                onChange={(e) => {
                  const val = e.target.value;
                  setGovernorate(val);
                  setProsecutionId("ALL");
                  setPartialProsecutionId("ALL");
                  fetchReport({
                    governorate: val,
                    prosecutionId: "ALL",
                    partialProsecutionId: "ALL",
                  });
                }}
                className="input font-semibold text-xs"
              >
                <option value="ALL">جميع المحافظات (27 محافظة)</option>
                <option value="UNSPECIFIED" className="font-bold text-amber-800 bg-amber-50">
                  ⚠️ غير محددة المحافظة (شكاوى مباشرة بدون نيابة)
                </option>
                {data?.governoratesList.map((gov) => (
                  <option key={gov} value={gov}>
                    محافظة {gov}
                  </option>
                ))}
              </select>
            </div>

            {/* النيابة الكلية (مرتبطة بالمحافظة) */}
            <div>
              <label className="label flex items-center gap-1 font-bold text-slate-800">
                <Scale className="w-3 h-3 text-teal-700" />
                <span>5. النيابة الكلية</span>
              </label>
              <select
                value={prosecutionId}
                onChange={(e) => {
                  const val = e.target.value;
                  setProsecutionId(val);
                  setPartialProsecutionId("ALL");
                  fetchReport({
                    prosecutionId: val,
                    partialProsecutionId: "ALL",
                  });
                }}
                className="input font-semibold text-xs"
              >
                <option value="ALL">
                  {governorate === "ALL" || governorate === "UNSPECIFIED"
                    ? "جميع النيابات الكلية"
                    : `نيابات ${governorate} الكلية`}
                </option>
                {plenaryProsecutions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* النيابة الجزئية (مرتبطة بالنيابة الكلية) */}
            <div>
              <label className="label flex items-center gap-1 font-bold text-slate-800">
                <Scale className="w-3 h-3 text-slate-400" />
                <span>6. النيابة الجزئية (اختياري)</span>
              </label>
              <select
                value={partialProsecutionId}
                onChange={(e) => {
                  const val = e.target.value;
                  setPartialProsecutionId(val);
                  fetchReport({ partialProsecutionId: val });
                }}
                className="input text-xs"
              >
                <option value="ALL">
                  {prosecutionId !== "ALL"
                    ? "كافة النيابات الجزئية التابعة للكلية"
                    : "جميع النيابات الجزئية"}
                </option>
                {districtProsecutions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* نوع القيد */}
            <div>
              <label className="label flex items-center gap-1 font-bold text-slate-800">
                <FileText className="w-3 h-3 text-indigo-600" />
                <span>7. نوع القيد</span>
              </label>
              <select
                value={registrationType}
                onChange={(e) => {
                  const val = e.target.value;
                  setRegistrationType(val);
                  fetchReport({ registrationType: val });
                }}
                className="input font-semibold text-xs"
              >
                <option value="ALL">جميع الأنواع (شكوى / قضية / محضر)</option>
                <option value="CASE">قضية</option>
                <option value="REPORT">محضر</option>
                <option value="COMPLAINT">شكوى</option>
              </select>
            </div>

            {/* المرحلة بسير العمل */}
            <div>
              <label className="label flex items-center gap-1 font-bold text-slate-800">
                <Layers className="w-3 h-3 text-purple-600" />
                <span>8. المرحلة الإجرائية</span>
              </label>
              <select
                value={status}
                onChange={(e) => {
                  const val = e.target.value;
                  setStatus(val);
                  fetchReport({ status: val });
                }}
                className="input font-semibold text-xs"
              >
                <option value="ALL">جميع المراحل (إجمالي عام)</option>
                <option value="REGISTERED">1. بانتظار التوجيه (قيد جديد)</option>
                <option value="UNDER_SUBCOMMITTEE_REVIEW">2. قيد دراسة اللجنة الفرعية</option>
                <option value="PENDING_SUPREME_REVIEW">3. بانتظار اعتماد اللجنة العليا</option>
                <option value="REFERRED_FOR_REVIEW">4. محال لإعادة الدراسة</option>
                <option value="APPROVED">5. معتمد (قرار نهائي)</option>
                <option value="CLOSED">6. مغلق بالأرشيف</option>
              </select>
            </div>

            {/* فئة الفرع / المنشأة */}
            <div>
              <label className="label flex items-center gap-1 font-bold text-slate-800">
                <Building2 className="w-3 h-3 text-teal-600" />
                <span>فئة المنشأة المشكو فيها</span>
              </label>
              <select
                value={entityType}
                onChange={(e) => {
                  const val = e.target.value;
                  setEntityType(val);
                  fetchReport({ entityType: val });
                }}
                className="input text-xs"
              >
                <option value="ALL">جميع فئات المنشآت</option>
                {ENTITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* اسم المنشأة أو المستشفى */}
            <div>
              <label className="label font-bold text-slate-800">اسم المستشفى / الفرع</label>
              <input
                type="text"
                value={branchOrHospital}
                onChange={(e) => setBranchOrHospital(e.target.value)}
                placeholder="مثال: القصر العيني، الهلال..."
                className="input text-xs"
              />
            </div>

            {/* اللجنة الفرعية */}
            <div>
              <label className="label font-bold text-slate-800">اللجنة الفرعية المختصة</label>
              <select
                value={subCommitteeId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSubCommitteeId(val);
                  fetchReport({ subCommitteeId: val });
                }}
                className="input text-xs"
              >
                <option value="ALL">جميع اللجان الفرعية</option>
                {data?.subCommitteesList.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* اسم الشاكي */}
            <div>
              <label className="label font-bold text-slate-800">اسم الشاكي</label>
              <input
                type="text"
                value={complainantName}
                onChange={(e) => setComplainantName(e.target.value)}
                placeholder="بحث باسم الشاكي..."
                className="input text-xs"
              />
            </div>

            {/* المشكو في حقه */}
            <div>
              <label className="label font-bold text-slate-800">المشكو في حقه</label>
              <input
                type="text"
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                placeholder="اسم الطبيب / المشكو في حقه..."
                className="input text-xs"
              />
            </div>

            {/* موظف القيد */}
            <div>
              <label className="label flex items-center gap-1 font-bold text-slate-800">
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setCreatedById(val);
                    fetchReport({ createdById: val });
                  }}
                  className="input text-xs"
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
          </div>

          {/* 3. شريط الإجراءات والتحكم واستعراض النتائج */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-black shadow-md transition-all disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                <span>{loading ? "جاري استخراج التقرير..." : "استخراج وتطبيق التقرير"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab("cases");
                  fetchReport();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-xs transition-colors"
                title="الانتقال فوراً لجدول السجلات التفصيلي"
              >
                <Eye className="w-4 h-4 text-teal-300" />
                <span>استعراض السجلات التفصيلية فوراً ({formatNumber(data?.cases.length)})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCustomDateRange(!showCustomDateRange)}
                className="text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3 py-2 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-teal-700" />
                <span>{showCustomDateRange ? "إخفاء التحديد المخصص باليوم" : "📅 تخصيص فترة باليوم (من تاريخ ... إلى تاريخ ...)"}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetFilters}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-300 transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>إلغاء الفلاتر وعرض الإجمالي العام</span>
              </button>
            </div>
          </div>

          {/* تحديد فترة مخصصة باليوم (اختياري وقابل للطي) */}
          {showCustomDateRange && (
            <div className="p-3.5 bg-teal-50/60 rounded-xl border border-teal-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end animate-in fade-in">
              <div>
                <label className="label text-[11px] font-bold text-teal-950">من تاريخ:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input text-xs font-mono"
                />
              </div>
              <div>
                <label className="label text-[11px] font-bold text-teal-950">إلى تاريخ:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input text-xs font-mono"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setReportYear("ALL");
                    setReportMonth("ALL");
                    fetchReport({ startDate, endDate, reportYear: "ALL", reportMonth: "ALL" });
                  }}
                  className="btn-primary text-xs py-2 px-3 w-full"
                >
                  تطبيق الفترة المخصصة
                </button>
              </div>
            </div>
          )}

          {/* شريط ملخص التقرير المطبق حالياً */}
          <div className="text-xs text-slate-700 font-medium bg-slate-50 border border-slate-200 p-2.5 rounded-xl flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="font-black text-slate-900">📌 التقرير المطبق:</span>
              <span className="text-teal-950 font-bold">{getFilterSummaryText()}</span>
            </div>
            <span className="font-mono text-teal-800 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
              {formatNumber(data?.cases.length)} سجل مطابق
            </span>
          </div>
        </form>
      </div>

      {/* ─── تنبيه ومعالج السجلات غير المحددة المحافظات (مخصص حصرياً لمدير النظام Admin) ─── */}
      {isAdmin && data?.governorateBreakdown.some((g) => g.governorate === "غير محدد" && g.total > 0) && (
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
            <button
              type="button"
              onClick={openOctoberWizard}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-800 to-slate-900 hover:from-teal-900 hover:to-black text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs border border-teal-700/50"
              title="كشف التكرارات والازدواج في مسميات النيابات والسجلات واقتراح حلها"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>كاشف ومعالج التكرارات والازدواج</span>
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
              <div className="p-3 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-800">
                    قائمة السجلات التفصيلية ({formatNumber(displayedCases.length)} من أصل {formatNumber(data?.cases.length)} سجل)
                  </span>
                  {caseYear !== "ALL" && (
                    <span className="text-[11px] bg-teal-100 text-teal-900 border border-teal-300 px-2.5 py-0.5 rounded-full font-bold font-mono">
                      عام قيد القضية: لسنة {caseYear}
                    </span>
                  )}
                </div>

                {/* شريط بحث وفلتر سريع بعام القيد داخل جدول السجلات التفصيلي */}
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold text-slate-600">سنة القيد:</span>
                    <select
                      value={casesTableYear}
                      onChange={(e) => setCasesTableYear(e.target.value)}
                      className="h-8 px-2 text-xs font-mono font-bold rounded-lg border border-slate-300 bg-white text-slate-800 focus:border-teal-600"
                    >
                      <option value="ALL">جميع السنوات المسجلة</option>
                      {activeYearsList.map((item) => (
                        <option key={item.year} value={String(item.year)}>
                          سنة {item.year} ({formatNumber(item.count)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative min-w-[210px]">
                    <Search className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={casesTableSearch}
                      onChange={(e) => setCasesTableSearch(e.target.value)}
                      placeholder="بحث فوري: رقم، شاكي، نيابة..."
                      className="w-full h-8 pr-8 pl-2 text-xs rounded-lg border border-slate-300 bg-white placeholder:text-slate-400 focus:border-teal-600"
                    />
                  </div>

                  {(casesTableSearch || casesTableYear !== "ALL") && (
                    <button
                      type="button"
                      onClick={() => {
                        setCasesTableSearch("");
                        setCasesTableYear("ALL");
                      }}
                      className="h-8 px-2.5 text-[11px] font-bold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors"
                    >
                      تصفية
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center text-slate-500 text-xs font-bold">
                  جاري استخراج السجلات وفرزها...
                </div>
              ) : !displayedCases.length ? (
                <div className="p-12 text-center text-slate-400 text-xs font-bold">
                  لا توجد سجلات مطابقة لشروط الفلترة المحددة
                </div>
              ) : (
                <div className="table-wrapper border-0 rounded-none shadow-none overflow-x-auto">
                  <table className="table-custom print-table" style={{ width: "100%", tableLayout: "fixed" }}>
                    <thead>
                      <tr>
                        <th style={{ width: "3.5%" }}>م</th>
                        <th style={{ width: "10%" }}>رقم وتاريخ الوارد</th>
                        <th style={{ width: "6%" }}>النوع</th>
                        <th style={{ width: "14%" }}>رقم وقيد القضية / المحضر</th>
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
                      {displayedCases.map((c, idx) => {
                        const typeInfo = TYPE_CONFIG[c.registrationType] ?? {
                          label: c.registrationType,
                          badge: "bg-slate-100",
                        };
                        const statusInfo = STATUS_LABELS[c.status] ?? {
                          label: c.status,
                          badge: "bg-slate-100",
                        };
                        const govName = c.governorate || c.prosecutionRel?.governorate || "—";

                        // تحديد تفاصيل ورقم القضية أو المحضر مع عام القيد
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
                            <td className="text-center font-mono text-xs">
                              {/* ─── معاينة سريعة عند المرور بالماوس (Hover Tooltip) ─── */}
                              <div className="relative group/tip inline-flex flex-col items-center justify-center">
                                <span className="font-bold text-slate-900 font-mono text-xs underline decoration-teal-400 decoration-dotted underline-offset-4 group-hover:text-teal-700">
                                  وارد #{c.caseNumber}
                                </span>
                                <span className="text-[10px] text-teal-800 font-mono font-medium mt-0.5">
                                  {c.incomingDate ? formatDate(c.incomingDate) : formatDate(c.createdAt)}
                                </span>
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="hidden group-hover/tip:block absolute z-50 right-0 top-full mt-2 w-80 p-3.5 bg-slate-900 text-white rounded-2xl shadow-2xl text-xs space-y-2 pointer-events-none border border-slate-700 print:hidden text-right animate-in fade-in-50 zoom-in-95"
                                >
                                  <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                                    <span className="font-bold text-teal-400">سجل وارد: #{c.caseNumber} • {c.incomingDate ? formatDate(c.incomingDate) : formatDate(c.createdAt)}</span>
                                    <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-bold">{typeInfo.label}</span>
                                  </div>
                                  <div className="space-y-1.5 text-[11px] leading-relaxed">
                                    <div className="p-2 bg-slate-800/80 rounded-lg text-slate-200">
                                      <p className="text-[10px] text-teal-400 font-bold mb-0.5">القيد: {recordDetails} لسنة {c.caseYear}</p>
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
                            <td className="text-center font-mono text-xs">
                              <span className="font-bold text-teal-950 font-mono text-xs block">
                                {recordDetails}
                              </span>
                              <span className="text-[10px] text-slate-600 font-mono font-bold">
                                لسنة {c.caseYear}
                              </span>
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
                                    {data?.governoratesList?.map((g) => (
                                      <option key={g} value={g}>{g}</option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                govName
                              )}
                            </td>
                            <td className="text-xs text-slate-700" onClick={(e) => e.stopPropagation()}>
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between gap-1 flex-wrap">
                                  <span className="font-bold text-slate-800">
                                    {c.prosecutionRel?.name || c.prosecution || (c.registrationType === "COMPLAINT" ? "شكوى مباشرة" : "غير محدد")}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenQuickPros(c)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 transition-colors print:hidden"
                                    title="تغيير أو تحديد النيابة العامة لهذا السجل"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* زر سريع خاص لتحويل السادس من أكتوبر إلى أكتوبر الكلية */}
                                {(c.prosecution?.includes("السادس من") || c.prosecution?.includes("6 أكتوبر") || c.prosecution?.includes("6 اكتوبر")) && (
                                  <button
                                    type="button"
                                    onClick={() => handleQuickAssignPros(c.id, "أكتوبر الكلية", c.partialProsecutionRel?.name || c.partialProsecution || undefined, "الجيزة")}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-1.5 py-0.5 rounded transition-colors shadow-2xs w-fit"
                                    title="تحويل وتوحيد إلى نيابة أكتوبر الكلية فوراً"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5 text-amber-700" />
                                    <span>تحويل إلى: أكتوبر الكلية</span>
                                  </button>
                                )}

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

      {/* ─── نافذة التغيير والتعيين السريع للنيابة ─── */}
      {quickProsCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:hidden animate-in fade-in-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col font-body">
            <div className="p-4 bg-gradient-to-r from-teal-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-teal-300" />
                <div>
                  <h3 className="font-bold text-sm">تغيير وتعيين النيابة العامة للسجل</h3>
                  <p className="text-[11px] text-teal-200 font-mono">سجل رقم: {quickProsCase.caseNumber} لسنة {quickProsCase.caseYear}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickProsCase(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">الشاكي:</span>
                  <span className="font-bold text-slate-900">{quickProsCase.complainantName || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">المستشفى / الجهة:</span>
                  <span className="font-bold text-slate-900">{quickProsCase.hospitalName || quickProsCase.entityName || "—"}</span>
                </div>
              </div>

              {/* النيابة الكلية */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">النيابة الكلية المختصة *</label>
                <select
                  value={quickPlenary}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQuickPlenary(val);
                    const match = OFFICIAL_PROSECUTIONS_LIST.find((p) => p.name === val);
                    if (match?.governorate) setQuickGov(match.governorate);
                    // تصفير الجزئية إذا لم تعد تابعة
                    const curDistrictMatch = OFFICIAL_PROSECUTIONS_LIST.find((p) => p.name === quickDistrict);
                    if (curDistrictMatch && curDistrictMatch.parentName !== val) {
                      setQuickDistrict("");
                    }
                  }}
                  className="input w-full font-semibold text-slate-900 text-xs"
                >
                  <option value="">-- اختر النيابة الكلية --</option>
                  <option value="أكتوبر الكلية">⭐ أكتوبر الكلية (معتمدة وموحدة)</option>
                  {OFFICIAL_PROSECUTIONS_LIST.filter((p) => p.type === "PLENARY" || !p.parentName).map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} {p.governorate ? `(محافظة ${p.governorate})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* النيابة الجزئية */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">النيابة الجزئية التابعة (اختياري)</label>
                <select
                  value={quickDistrict}
                  onChange={(e) => setQuickDistrict(e.target.value)}
                  className="input w-full text-xs font-medium text-slate-800"
                >
                  <option value="">-- بدون نيابة جزئية محددة --</option>
                  {OFFICIAL_PROSECUTIONS_LIST.filter((p) => p.type === "DISTRICT" || !!p.parentName)
                    .filter((p) => !quickPlenary || p.parentName === quickPlenary)
                    .map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* المحافظة */}
              <div className="space-y-1">
                <label className="font-bold text-slate-800 block">المحافظة المقترنة</label>
                <select
                  value={quickGov}
                  onChange={(e) => setQuickGov(e.target.value)}
                  className="input w-full text-xs"
                >
                  <option value="">-- حدد المحافظة --</option>
                  {data?.governoratesList.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickProsCase(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={savingQuickPros || !quickPlenary}
                  onClick={handleSaveQuickProsModal}
                  className="px-5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white font-bold inline-flex items-center gap-1.5"
                >
                  {savingQuickPros ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جاري الحفظ...</span>
                    </>
                  ) : (
                    <span>تأكيد وحفظ النيابة</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── نافذة كاشف ومعالج التكرارات والازدواج (خاص بالمدير فقط) ─── */}
      {isAdmin && showOctoberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs print:hidden animate-in fade-in-50">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col font-body max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">كاشف ومعالج التكرارات والازدواج في النيابات والسجلات</h3>
                  <p className="text-[11px] text-teal-200">
                    أداة فحص واكتشاف مسميات النيابات المزدوجة والقضايا المكررة مع توفير حلول التوحيد الفوري بنقرة واحدة
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOctoberModal(false)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Sub-tabs header */}
            <div className="flex items-center gap-2 p-2.5 bg-slate-100 border-b border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => setDuplicatesTab("prosecutions")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  duplicatesTab === "prosecutions"
                    ? "bg-teal-800 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>ازدواج وتعدد مسميات النيابات</span>
                {octoberData && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      duplicatesTab === "prosecutions"
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-800"
                    }`}
                  >
                    {(octoberData.prosecutionDuplicates?.length || 0) + (octoberData.sixthOctoberCount > 0 ? 1 : 0)}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setDuplicatesTab("cases")}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  duplicatesTab === "cases"
                    ? "bg-teal-800 text-white shadow-xs"
                    : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>القضايا المسجلة برقم وسنة مكررة</span>
                {octoberData && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                      duplicatesTab === "cases"
                        ? "bg-white/20 text-white"
                        : "bg-slate-200 text-slate-800"
                    }`}
                  >
                    {octoberData.duplicateCases?.length || 0}
                  </span>
                )}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {octoberLoading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-9 h-9 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-bold text-slate-700">جاري فحص وتدقيق قاعدة البيانات للكشف عن أي تكرارات أو ازدواجيات...</p>
                </div>
              ) : octoberData ? (
                duplicatesTab === "prosecutions" ? (
                  /* ─── تبويب ازدواج مسميات النيابات ─── */
                  <div className="space-y-4">
                    {/* بطاقة نيابة أكتوبر الكلية */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                      <div className="bg-slate-50 p-3.5 flex items-center justify-between border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
                          <span className="font-bold text-slate-900 text-xs">نيابة أكتوبر الكلية (محافظة الجيزة)</span>
                        </div>
                        {octoberData.sixthOctoberCount === 0 ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px] inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>موحدة بالكامل 100%</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-[11px] inline-flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>يوجد ({octoberData.sixthOctoberCount}) سجل غير موحد</span>
                          </span>
                        )}
                      </div>

                      <div className="p-4 space-y-3 bg-white">
                        <div className="grid grid-cols-3 gap-2.5 text-center">
                          <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200">
                            <span className="text-[10px] text-teal-800 font-bold block">المسمى المعتمد (أكتوبر الكلية)</span>
                            <span className="text-base font-mono font-black text-teal-900">{octoberData.octoberStandardCount} سجل</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                            <span className="text-[10px] text-amber-800 font-bold block">مسميات قديمة (السادس من أكتوبر)</span>
                            <span className="text-base font-mono font-black text-amber-900">{octoberData.sixthOctoberCount} سجل</span>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
                            <span className="text-[10px] text-slate-700 font-bold block">إجمالي ملفات النيابة</span>
                            <span className="text-base font-mono font-black text-slate-900">{octoberData.totalCombined} سجل</span>
                          </div>
                        </div>

                        {octoberData.sixthOctoberCount > 0 ? (
                          <div className="pt-2 flex items-center justify-between gap-3 bg-amber-50/70 p-3 rounded-xl border border-amber-200">
                            <p className="text-[11px] text-amber-900">
                              توجد <strong>{octoberData.sixthOctoberCount}</strong> سجلات مقيدة بمسمى قديم "السادس من أكتوبر"، يمكنك توحيدها فوراً لتصبح تحت "أكتوبر الكلية".
                            </p>
                            <button
                              type="button"
                              disabled={migratingOctober}
                              onClick={applyOctoberStandardization}
                              className="px-4 py-2 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs inline-flex items-center gap-1.5 shrink-0 shadow-xs"
                            >
                              {migratingOctober ? (
                                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <Check className="w-4 h-4 text-emerald-300" />
                              )}
                              <span>توحيد الـ ({octoberData.sixthOctoberCount}) سجل فوراً</span>
                            </button>
                          </div>
                        ) : (
                          <p className="text-[11px] text-emerald-700 font-medium">
                            ✓ تم توحيد كافة ملفات وسجلات أكتوبر تحت المسمى الرسمي المعتمد "أكتوبر الكلية" وتثبيت المحافظة على الجيزة.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* باقي النيابات المكتشف فيها تكرار أو مسميات متعددة */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-teal-700" />
                        <span>ازدواجيات ومسميات النيابات المكتشفة بقاعدة البيانات</span>
                      </h4>

                      {octoberData.prosecutionDuplicates && Array.isArray(octoberData.prosecutionDuplicates) && octoberData.prosecutionDuplicates.length > 0 ? (
                        <div className="space-y-3">
                          {octoberData.prosecutionDuplicates.map((group: any, idx: number) => (
                            <div key={idx} className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-3">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-900 text-xs">
                                      المسمى المعتمد المقترح: <span className="text-teal-800 underline decoration-teal-500 font-black">{group.suggestedTarget}</span>
                                    </span>
                                    {group.suggestedGovernorate && (
                                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                                        محافظة {group.suggestedGovernorate}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-slate-500 mt-0.5">
                                    إجمالي القضايا: <strong className="text-slate-800 font-mono">{group.totalCases}</strong> سجل | معلقة للتوحيد: <strong className="text-amber-800 font-mono">{group.pendingMigrationCount}</strong> سجل
                                  </p>
                                </div>

                                {group.pendingMigrationCount > 0 && (
                                  <button
                                    type="button"
                                    disabled={migratingOctober}
                                    onClick={() =>
                                      handleUnifyVariants(
                                        (group.variants || []).filter((v: any) => !v.isTarget).map((v: any) => v.name),
                                        group.suggestedTarget,
                                        group.suggestedGovernorate
                                      )
                                    }
                                    className="px-3.5 py-1.5 rounded-lg bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors"
                                  >
                                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                                    <span>توحيد الـ ({group.pendingMigrationCount}) سجل تحت ({group.suggestedTarget})</span>
                                  </button>
                                )}
                              </div>

                              {/* المسميات المتفرعة المسجلة */}
                              <div className="bg-slate-50 rounded-lg p-2.5 flex flex-wrap gap-2 text-[11px]">
                                {(group.variants || []).map((v: any, vIdx: number) => (
                                  <div
                                    key={vIdx}
                                    className={`px-2.5 py-1 rounded-md border flex items-center gap-1.5 ${
                                      v.isTarget
                                        ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                                        : "bg-white border-amber-300 text-amber-900"
                                    }`}
                                  >
                                    <span>{v.name}</span>
                                    <span className="px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-800 font-mono text-[10px] font-bold">
                                      {v.count} سجل
                                    </span>
                                    {v.isTarget && <span className="text-emerald-700 font-bold text-[10px]">(المعتمد)</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center space-y-2 bg-emerald-50/70 rounded-xl border border-emerald-200">
                          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                          <h5 className="font-bold text-emerald-900">كافة مسميات النيابات منضبطة تماماً!</h5>
                          <p className="text-[11px] text-emerald-700">
                            لا توجد أي نيابات مكررة أو مسجلة بمسميات متعددة خارج الدليل المعتمد.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ─── تبويب القضايا المكررة بنفس الرقم والسنة ─── */
                  <div className="space-y-4">
                    {octoberData.duplicateCases && Array.isArray(octoberData.duplicateCases) && octoberData.duplicateCases.length > 0 ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                          <span>
                            تم رصد <strong>({octoberData.duplicateCases.length})</strong> رقم قضية/محضر مكرر أكثر من مرة بنفس الرقم والسنة والنيابة. يمكنك مراجعتها وتعديلها:
                          </span>
                        </div>

                        {octoberData.duplicateCases.map((dup: any, dIdx: number) => (
                          <div key={dIdx} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                            {/* رأس بطاقة التكرار مع التشخيص */}
                            <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                  <span className="font-bold text-slate-900 text-xs">
                                    قضية / محضر رقم <span className="font-mono text-teal-800 text-sm font-black">{dup.prosecutionCaseNumber}</span> لسنة <span className="font-mono text-teal-800 text-sm font-black">{dup.caseYear}</span>
                                  </span>
                                  <span className="px-2.5 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-900 text-[11px] font-bold">
                                    {dup.prosecution || "شكوى مباشرة (بدون نيابة)"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setShowOctoberModal(false);
                                      setActiveTab("cases");
                                      setCasesTableYear("ALL");
                                      setCasesTableSearch(dup.prosecutionCaseNumber || "");
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-900 text-[11px] font-bold border border-teal-300 inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                                    title="الانتقال فوراً لجدول السجلات التفصيلي وحصر هذه السجلات المكررة بالجدول الرئيسي"
                                  >
                                    <Search className="w-3.5 h-3.5 text-teal-700" />
                                    <span>عرض الـ ({dup.count}) بالجدول الرئيسي</span>
                                  </button>
                                  <span className="px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-950 text-[11px] font-bold font-mono">
                                    مكرر {dup.count} مرات {dup.closedCount ? `(${dup.activeCount || 0} نشط | ${dup.closedCount} مؤرشف)` : ""}
                                  </span>
                                </div>
                              </div>

                              {/* شريط الإيضاح التشخيصي لسبب التكرار */}
                              <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px]">
                                {dup.differentCreators ? (
                                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-950 font-bold inline-flex items-center gap-1 border border-amber-300">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                                    <span>سُجلت بواسطة موظفين مختلفين: ({dup.creators?.join(" و ")})</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-950 font-bold inline-flex items-center gap-1 border border-purple-200">
                                    <User className="w-3.5 h-3.5 text-purple-700" />
                                    <span>سُجلت مكررة بواسطة نفس الموظف: ({dup.creators?.[0] || "موظف واحد"})</span>
                                  </span>
                                )}

                                {dup.hasDifferentHospitals && (
                                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-bold inline-flex items-center gap-1 border border-blue-200">
                                    <Building2 className="w-3.5 h-3.5 text-blue-700" />
                                    <span>يوجد تباين في مسمى المنشأة الطبية بين السجلات</span>
                                  </span>
                                )}

                                {dup.hasDifferentPartials && (
                                  <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold inline-flex items-center gap-1 border border-slate-300">
                                    <Scale className="w-3.5 h-3.5 text-slate-700" />
                                    <span>اختلاف في النيابة الجزئية</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* تفاصيل السجلات المكررة */}
                            <div className="divide-y divide-slate-100">
                              {(dup.cases || dup.records || []).map((c: any) => {
                                const fullCase = data?.cases.find((x) => x.id === c.id);
                                return (
                                  <div key={c.id} className="p-3.5 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                                    {/* معلومات القيد والوارد والتاريخ */}
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-mono font-bold text-teal-950 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 text-xs">
                                          وارد #{c.caseNumber} لسنة {c.caseYear}
                                        </span>
                                        <span className="text-[11px] text-slate-500 font-mono">
                                          تاريخ الوارد: {c.incomingDate ? formatDate(c.incomingDate) : "—"}
                                        </span>
                                        <span className="text-[11px] text-slate-400">•</span>
                                        <span className="text-[11px] text-slate-600 font-mono flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-slate-400" />
                                          <span>سُجل إلكترونياً: {formatDateTime(c.createdAt)}</span>
                                        </span>
                                        <span className="px-2 py-0.2 rounded bg-purple-50 text-purple-900 text-[10px] font-bold border border-purple-200">
                                          مسجل الحالة: {c.registeredBy}
                                        </span>
                                        {c.status === "CLOSED" && (
                                          <span className="px-2 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                                            مؤرشف / مغلق
                                          </span>
                                        )}
                                      </div>

                                      {/* أطراف الشكوى والمنشأة */}
                                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-[11px] pt-1">
                                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                                          <span className="text-slate-400 block text-[10px]">الشاكي:</span>
                                          <strong className="text-slate-900 block truncate">{c.complainantName}</strong>
                                          {c.complainantPhone && <span className="text-teal-700 font-mono text-[10px]">{c.complainantPhone}</span>}
                                        </div>
                                        <div className="bg-white p-2 rounded-lg border border-slate-200">
                                          <span className="text-slate-400 block text-[10px]">المشكو في حقه:</span>
                                          <strong className="text-slate-900 block truncate">{c.respondentName}</strong>
                                          {c.respondentPhone && <span className="text-teal-700 font-mono text-[10px]">{c.respondentPhone}</span>}
                                        </div>
                                        <div className="bg-white p-2 rounded-lg border border-slate-200 sm:col-span-2 md:col-span-1">
                                          <span className="text-slate-400 block text-[10px]">المنشأة والجهة:</span>
                                          <strong className="text-slate-900 block truncate">{c.hospitalName}</strong>
                                          <span className="text-slate-500 text-[10px] block">
                                            {c.partialProsecution !== "—" ? `نيابة: ${c.partialProsecution}` : ""} {c.governorate ? `(${c.governorate})` : ""}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* أزرار الإجراءات */}
                                    <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center pt-2 md:pt-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (fullCase) handleOpenEdit(fullCase);
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-900 text-slate-700 text-[11px] font-bold border border-slate-300 inline-flex items-center gap-1 transition-colors"
                                        title="تعديل بيانات ورقم قيد هذا السجل"
                                      >
                                        <Edit3 className="w-3.5 h-3.5 text-teal-700" />
                                        <span>تعديل</span>
                                      </button>

                                      {c.status !== "CLOSED" ? (
                                        <button
                                          type="button"
                                          disabled={archivingCaseId === c.id}
                                          onClick={() => handleArchiveDuplicateCase(c.id, `${c.caseNumber}/${c.caseYear}`)}
                                          className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-300 inline-flex items-center gap-1 transition-colors"
                                          title="أرشفة السجل وإغلاقه لعدم احتسابه في السجلات النشطة"
                                        >
                                          {archivingCaseId === c.id ? (
                                            <div className="w-3 h-3 border-2 border-amber-700 border-t-transparent rounded-full animate-spin" />
                                          ) : (
                                            <Archive className="w-3.5 h-3.5 text-amber-700" />
                                          )}
                                          <span>أرشفة</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          disabled={archivingCaseId === c.id}
                                          onClick={() => handleRestoreDuplicateCase(c.id, `${c.caseNumber}/${c.caseYear}`)}
                                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-[11px] font-bold border border-emerald-300 inline-flex items-center gap-1 transition-colors"
                                          title="استرجاع هذا السجل المؤرشف وإعادته كقيد نشط"
                                        >
                                          {archivingCaseId === c.id ? (
                                            <div className="w-3 h-3 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                                          ) : (
                                            <RotateCcw className="w-3.5 h-3.5 text-emerald-700" />
                                          )}
                                          <span>استرجاع (إلغاء الأرشفة)</span>
                                        </button>
                                      )}

                                      <button
                                        type="button"
                                        onClick={() => setDeletingDuplicateCase(c)}
                                        className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-300 inline-flex items-center gap-1 transition-colors"
                                        title="حذف هذا القيد المكرر نهائياً بعد التحقق"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                        <span>حذف القيد</span>
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center space-y-2 bg-emerald-50/70 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                        <h5 className="font-bold text-emerald-900 text-sm">لا توجد قضايا مكررة!</h5>
                        <p className="text-xs text-emerald-700">
                          كافة أرقام القضايا والمحاضر والشكاوى فريدة ولا يوجد أي تكرار لنفس القضية والسنة والنيابة.
                        </p>
                      </div>
                    )}
                  </div>
                )
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
              <span className="text-slate-500 text-[11px]">
                {octoberData ? `إجمالي الفحوصات: ${octoberData.totalCombined || 0} سجل نيابات` : ""}
              </span>
              <button
                type="button"
                onClick={() => setShowOctoberModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold transition-colors"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── نافذة تأكيد حذف السجل المكرر (خاص بالمدير Admin) ─── */}
      {isAdmin && deletingDuplicateCase && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs print:hidden animate-in fade-in-50">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-rose-200 overflow-hidden font-body animate-in zoom-in-95">
            <div className="p-4 bg-gradient-to-r from-rose-900 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
                  <Trash2 className="w-5 h-5 text-rose-300" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">تأكيد حذف القيد المكرر نهائياً</h3>
                  <p className="text-[11px] text-rose-200">إلغاء وحذف السجل المكرر بالكامل من قاعدة البيانات والتقارير</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeletingDuplicateCase(null)}
                className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5 text-rose-950">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="font-bold text-xs">تنبيه رقابي هام:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  سيتم حذف هذا السجل بشكل نهائي ولن يظهر في أي إحصائيات أو كشوفات قادمة. سيتم توثيق اسمك وسند الحذف في سجل التدقيق الأمني للرقابة.
                </p>
              </div>

              {/* بطاقة السجل المراد حذفه */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">رقم وسنة السجل:</span>
                  <strong className="font-mono text-slate-900">وارد #{deletingDuplicateCase.caseNumber} لسنة {deletingDuplicateCase.caseYear}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">رقم القضية / المحضر:</span>
                  <strong className="font-mono text-teal-800">{deletingDuplicateCase.prosecutionCaseNumber} لسنة {deletingDuplicateCase.caseYear}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">الشاكي:</span>
                  <strong>{deletingDuplicateCase.complainantName}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">المنشأة الطبية:</span>
                  <strong>{deletingDuplicateCase.hospitalName}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">موظف القيد الأصلي:</span>
                  <strong className="text-purple-900">{deletingDuplicateCase.registeredBy}</strong>
                </div>
              </div>

              {/* سبب الحذف */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 block text-xs">
                  سبب وسند الحذف <span className="text-rose-600 font-bold">*</span> (إلزامي للرقابة)
                </label>
                <input
                  type="text"
                  value={deleteDuplicateReason}
                  onChange={(e) => setDeleteDuplicateReason(e.target.value)}
                  placeholder="مثال: قيد مكرر بالخطأ للقضية ذاتها من موظف آخر..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingDuplicateCase(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="button"
                  disabled={isDeletingDuplicate}
                  onClick={handleDeleteDuplicateCase}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs inline-flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  {isDeletingDuplicate ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>جاري الحذف والتوثيق...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>تأكيد الحذف النهائي للسجل</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── نافذة المعالج الذكي لتحديد واستنتاج المحافظات (خاص بالمدير فقط) ─── */}
      {isAdmin && showAutoDetectModal && (
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
                      تفاصيل وبيانات السجل: وارد رقم ({selectedCaseModal.caseNumber})
                      {selectedCaseModal.prosecutionCaseNumber
                        ? ` — ${TYPE_CONFIG[selectedCaseModal.registrationType]?.label || "قيد"} رقم (${selectedCaseModal.prosecutionCaseNumber}) لسنة (${selectedCaseModal.caseYear})`
                        : ` — لسنة (${selectedCaseModal.caseYear})`}
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
                    <span className="text-slate-500 block text-[11px]">رقم سجل الوارد:</span>
                    <strong className="text-teal-950 font-mono text-sm">وارد #{selectedCaseModal.caseNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">تاريخ سجل الوارد:</span>
                    <strong className="text-teal-900 font-mono">
                      {selectedCaseModal.incomingDate ? formatDate(selectedCaseModal.incomingDate) : "—"}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">نوع القيد:</span>
                    <strong className="text-slate-900">{TYPE_CONFIG[selectedCaseModal.registrationType]?.label}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">رقم وقيد القضية / المحضر:</span>
                    <strong className="text-teal-950 font-mono">
                      {selectedCaseModal.prosecutionCaseNumber
                        ? `${selectedCaseModal.prosecutionCaseNumber} لسنة ${selectedCaseModal.caseYear}`
                        : `سنة ${selectedCaseModal.caseYear}`}
                    </strong>
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
                    <span className="text-slate-500 block text-[11px]">عدد المرفقات:</span>
                    <strong className="text-slate-800 font-mono">{selectedCaseModal.attachmentsCount} ملف</strong>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[11px]">تاريخ ووقت القيد الإلكتروني بالمنظومة:</span>
                    <strong className="text-slate-800 font-mono">{formatDateTime(selectedCaseModal.createdAt)}</strong>
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
                    تعديل بيانات السجل: وارد #{editingCase.caseNumber} {editingCase.prosecutionCaseNumber ? `— قضية/محضر ${editingCase.prosecutionCaseNumber} لسنة ${editingCase.caseYear}` : `— لسنة ${editingCase.caseYear}`}
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

                {/* النيابة الكلية */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">النيابة العامة الكلية</label>
                  <select
                    value={editForm.prosecution}
                    onChange={(e) => {
                      const selectedPros = e.target.value;
                      const matched = OFFICIAL_PROSECUTIONS_LIST.find((p) => p.name === selectedPros);
                      setEditForm({
                        ...editForm,
                        prosecution: selectedPros,
                        governorate: matched?.governorate || editForm.governorate,
                      });
                    }}
                    className="input w-full"
                  >
                    <option value="">-- بدون نيابة محددة (شكوى مباشرة) --</option>
                    {OFFICIAL_PROSECUTIONS_LIST.filter((p) => p.type === "PLENARY" || !p.parentName)
                      .filter((p) => !editForm.governorate || p.governorate === editForm.governorate)
                      .map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name} {p.governorate ? `(${p.governorate})` : ""}
                        </option>
                      ))}
                  </select>
                </div>

                {/* النيابة الجزئية */}
                <div>
                  <label className="font-bold text-slate-800 block mb-1">النيابة الجزئية التابعة</label>
                  <select
                    value={editForm.partialProsecution}
                    onChange={(e) => setEditForm({ ...editForm, partialProsecution: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">-- بدون نيابة جزئية --</option>
                    {OFFICIAL_PROSECUTIONS_LIST.filter((p) => p.type === "DISTRICT" || !!p.parentName)
                      .filter((p) => !editForm.prosecution || p.parentName === editForm.prosecution)
                      .map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name}
                        </option>
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
      {/* ─── إشعار تفاعلي عصري أنيق في الواجهة الأمامية فوق كل النوافذ (In-App Toast) ─── */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] max-w-lg w-[92%] sm:w-auto min-w-[340px] pointer-events-auto animate-in fade-in-50 slide-in-from-top-4 duration-300">
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
