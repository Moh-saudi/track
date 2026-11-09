"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/formatters";
import { EGYPT_GOVERNORATES } from "@/lib/constants/governorates";
import {
  ShieldAlert,
  Lock,
  Unlock,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  FileText,
  X,
  Send,
  Building,
  Scale,
  Search,
  Filter,
  Clock,
  Eye,
  ArrowRight,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  RefreshCw,
  Building2,
  User,
  Hash,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export interface CaseItem {
  id: string;
  caseNumber: string;
  caseYear: number;
  registrationType?: "COMPLAINT" | "CASE" | "REPORT" | string;
  prosecutionCaseNumber?: string | null;
  incomingDate?: string | null;
  complainantName: string | null;
  respondentName?: string | null;
  hospitalName?: string | null;
  entityName?: string | null;
  entityType?: string | null;
  governorate?: string | null;
  prosecution?: string | null;
  partialProsecution?: string | null;
  status: string;
  assignedAt: string | null;
  isRiskOverridden: boolean;
  riskOverrideReason: string | null;
  riskOverrideDocument: string | null;
  riskOverriddenAt: string | null;
  subCommittee?: { id: string; name: string } | null;
  supremeDecisions: Array<{
    decisionType: string;
    meetingDate: string;
    decisionDetails: string;
  }>;
  actions: Array<{
    receivedDate: string | null;
    meetingDate: string | null;
    reportDate: string | null;
  }>;
}

interface Props {
  cases: CaseItem[];
  subCommittees?: Array<{ id: string; name: string }>;
}

const STATUS_LABELS: Record<string, { label: string; variant: "slate" | "amber" | "sky" | "emerald" | "rose" }> = {
  REGISTERED: { label: "بانتظار التوجيه", variant: "slate" },
  UNDER_SUBCOMMITTEE_REVIEW: { label: "قيد دراسة اللجنة الفرعية", variant: "amber" },
  PENDING_SUPREME_REVIEW: { label: "بانتظار اعتماد اللجنة العليا", variant: "sky" },
  APPROVED: { label: "معتمد (قرار نهائي)", variant: "emerald" },
  REFERRED_FOR_REVIEW: { label: "محال لإعادة الدراسة", variant: "rose" },
  CLOSED: { label: "مغلق بالأرشيف", variant: "slate" },
};

const TYPE_CONFIG: Record<string, { label: string; badge: string }> = {
  COMPLAINT: { label: "شكوى", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  CASE:      { label: "قضية", badge: "bg-purple-50 text-purple-800 border-purple-200" },
  REPORT:    { label: "محضر", badge: "bg-slate-100 text-slate-800 border-slate-300" },
};

function normalizeSearchText(str?: string | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[\u064B-\u065F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function RiskModeClient({ cases, subCommittees = [] }: Props) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // التبويبات السريعة
  const [activeTab, setActiveTab] = useState<string>("ALL");

  // حقول البحث المخصصة المباشرة
  const [searchCaseNumber, setSearchCaseNumber] = useState("");
  const [searchProsCaseNumber, setSearchProsCaseNumber] = useState("");
  const [searchPartyName, setSearchPartyName] = useState("");
  const [searchTerm, setSearchTerm] = useState(""); // بحث شامل حر

  // الفلاتر المنسدلة
  const [selectedGov, setSelectedGov] = useState("ALL");
  const [selectedPros, setSelectedPros] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [selectedCommittee, setSelectedCommittee] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedYear, setSelectedYear] = useState("ALL");
  const [selectedRiskLevel, setSelectedRiskLevel] = useState("ALL");

  // الترقيم والصفحات
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // حالة نافذة تصحيح المسار
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>("UNDER_SUBCOMMITTEE_REVIEW");
  const [reason, setReason] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [overriding, setOverriding] = useState(false);
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [overrideSuccess, setOverrideSuccess] = useState(false);

  useEffect(() => {
    const hasCookie = document.cookie
      .split("; ")
      .some((row) => row.startsWith("risk_mode_session="));
    setIsAuthenticated(hasCookie);
  }, []);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/admin/risk-mode/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل التحقق من كلمة المرور");
      }

      setIsAuthenticated(true);
      router.refresh();
    } catch (err: any) {
      setAuthError(err.message || "حدث خطأ أثناء المصادقة");
    } finally {
      setVerifying(false);
    }
  }

  function handleExit() {
    document.cookie =
      "risk_mode_session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    setIsAuthenticated(false);
    router.refresh();
  }

  async function handleOverrideSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCase) return;

    setOverriding(true);
    setOverrideError(null);

    try {
      const res = await fetch(`/api/cases/${selectedCase.id}/risk-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetStatus,
          riskOverrideReason: reason.trim(),
          riskOverrideDocument: docNumber.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "تعذر تصحيح مسار السجل");
      }

      setOverrideSuccess(true);
      setTimeout(() => {
        setSelectedCase(null);
        setOverrideSuccess(false);
        setReason("");
        setDocNumber("");
        router.refresh();
      }, 1400);
    } catch (err: any) {
      setOverrideError(err.message || "حدث خطأ أثناء استدراك وتصحيح مسار السجل");
    } finally {
      setOverriding(false);
    }
  }

  // استخراج اللجان الفرعية المتاحة والسنوات والمحافظات والنيابات
  const availableCommittees = useMemo(() => {
    if (subCommittees && subCommittees.length > 0) return subCommittees;
    const map = new Map<string, string>();
    cases.forEach((c) => {
      if (c.subCommittee?.id && c.subCommittee?.name) {
        map.set(c.subCommittee.id, c.subCommittee.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [subCommittees, cases]);

  const availableYears = useMemo(() => {
    const set = new Set<number>();
    cases.forEach((c) => {
      if (c.caseYear) set.add(c.caseYear);
    });
    return Array.from(set).sort((a, b) => b - a);
  }, [cases]);

  const availableGovernorates = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => {
      if (c.governorate) set.add(c.governorate);
    });
    return Array.from(set).sort();
  }, [cases]);

  const availableProsecutions = useMemo(() => {
    const set = new Set<string>();
    cases.forEach((c) => {
      if (c.prosecution) set.add(c.prosecution);
      if (c.partialProsecution) set.add(c.partialProsecution);
    });
    return Array.from(set).sort();
  }, [cases]);

  // عدد الفلاتر النشطة
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (activeTab !== "ALL") count++;
    if (searchCaseNumber.trim()) count++;
    if (searchProsCaseNumber.trim()) count++;
    if (searchPartyName.trim()) count++;
    if (searchTerm.trim()) count++;
    if (selectedGov !== "ALL") count++;
    if (selectedPros !== "ALL") count++;
    if (selectedType !== "ALL") count++;
    if (selectedCommittee !== "ALL") count++;
    if (selectedStatus !== "ALL") count++;
    if (selectedYear !== "ALL") count++;
    if (selectedRiskLevel !== "ALL") count++;
    return count;
  }, [
    activeTab,
    searchCaseNumber,
    searchProsCaseNumber,
    searchPartyName,
    searchTerm,
    selectedGov,
    selectedPros,
    selectedType,
    selectedCommittee,
    selectedStatus,
    selectedYear,
    selectedRiskLevel,
  ]);

  function handleResetFilters() {
    setActiveTab("ALL");
    setSearchCaseNumber("");
    setSearchProsCaseNumber("");
    setSearchPartyName("");
    setSearchTerm("");
    setSelectedGov("ALL");
    setSelectedPros("ALL");
    setSelectedType("ALL");
    setSelectedCommittee("ALL");
    setSelectedStatus("ALL");
    setSelectedYear("ALL");
    setSelectedRiskLevel("ALL");
    setCurrentPage(1);
  }

  // تصفية السجلات الشاملة
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  const filteredCases = useMemo(() => {
    return cases.filter((c) => {
      const isOverdue =
        c.status === "REFERRED_FOR_REVIEW" ||
        (c.assignedAt &&
          now - new Date(c.assignedAt).getTime() > thirtyDaysMs &&
          c.status !== "APPROVED" &&
          c.status !== "CLOSED");

      const isReferredBack =
        c.status === "REFERRED_FOR_REVIEW" ||
        c.supremeDecisions[0]?.decisionType === "REFER_BACK" ||
        c.supremeDecisions[0]?.decisionType === "DIFFERENT";

      // 1. فلتر التبويب السريع
      if (activeTab === "OVERDUE" && !isOverdue) return false;
      if (activeTab === "OVERRIDDEN" && !c.isRiskOverridden) return false;
      if (activeTab === "REFERRED_BACK" && !isReferredBack) return false;
      if (activeTab === "APPROVED" && c.status !== "APPROVED") return false;
      if (activeTab === "SUBCOMMITTEE" && c.status !== "UNDER_SUBCOMMITTEE_REVIEW") return false;
      if (activeTab === "SUPREME" && c.status !== "PENDING_SUPREME_REVIEW") return false;
      if (activeTab === "REGISTERED" && c.status !== "REGISTERED") return false;

      // 2. فلتر رقم السجل المخصص
      if (searchCaseNumber.trim()) {
        const q = searchCaseNumber.trim().toLowerCase();
        if (!String(c.caseNumber).toLowerCase().includes(q)) return false;
      }

      // 3. فلتر رقم القضية أو المحضر المرتبط
      if (searchProsCaseNumber.trim()) {
        const q = normalizeSearchText(searchProsCaseNumber);
        if (!normalizeSearchText(c.prosecutionCaseNumber).includes(q)) return false;
      }

      // 4. فلتر الاسم (الشاكي أو المشكو في حقه أو الطبيب)
      if (searchPartyName.trim()) {
        const q = normalizeSearchText(searchPartyName);
        const matchC = normalizeSearchText(c.complainantName).includes(q);
        const matchR = normalizeSearchText(c.respondentName).includes(q);
        const matchH = normalizeSearchText(c.hospitalName || c.entityName).includes(q);
        if (!matchC && !matchR && !matchH) return false;
      }

      // 5. فلتر نوع السجل
      if (selectedType !== "ALL" && c.registrationType !== selectedType) return false;

      // 6. فلتر المحافظة
      if (selectedGov !== "ALL" && c.governorate !== selectedGov) return false;

      // 7. فلتر النيابة المختصة (كلية أو جزئية)
      if (selectedPros !== "ALL") {
        const pNorm = normalizeSearchText(selectedPros);
        const matchPros = normalizeSearchText(c.prosecution).includes(pNorm);
        const matchPartial = normalizeSearchText(c.partialProsecution).includes(pNorm);
        if (!matchPros && !matchPartial) return false;
      }

      // 8. فلتر اللجنة الفرعية
      if (selectedCommittee !== "ALL") {
        if (selectedCommittee === "UNASSIGNED") {
          if (c.subCommittee?.id) return false;
        } else if (c.subCommittee?.id !== selectedCommittee) {
          return false;
        }
      }

      // 9. فلتر المرحلة / الحالة
      if (selectedStatus !== "ALL" && c.status !== selectedStatus) return false;

      // 10. فلتر سنة السجل
      if (selectedYear !== "ALL" && String(c.caseYear) !== selectedYear) return false;

      // 11. فلتر مستوى مؤشر الخطر
      if (selectedRiskLevel === "OVERDUE" && !isOverdue) return false;
      if (selectedRiskLevel === "OVERRIDDEN" && !c.isRiskOverridden) return false;
      if (selectedRiskLevel === "REFERRED_BACK" && !isReferredBack) return false;
      if (selectedRiskLevel === "NORMAL" && (isOverdue || c.isRiskOverridden || isReferredBack)) return false;

      // 12. محرك البحث العام الحر
      if (searchTerm.trim()) {
        const q = normalizeSearchText(searchTerm);
        const matchNum = String(c.caseNumber).includes(q);
        const matchYear = String(c.caseYear).includes(q);
        const matchProsNum = normalizeSearchText(c.prosecutionCaseNumber).includes(q);
        const matchComplainant = normalizeSearchText(c.complainantName).includes(q);
        const matchRespondent = normalizeSearchText(c.respondentName).includes(q);
        const matchHospital = normalizeSearchText(c.hospitalName || c.entityName).includes(q);
        const matchPros = normalizeSearchText(c.prosecution).includes(q);
        const matchPartialPros = normalizeSearchText(c.partialProsecution).includes(q);
        const matchGov = normalizeSearchText(c.governorate).includes(q);
        const matchComm = normalizeSearchText(c.subCommittee?.name).includes(q);
        const matchDoc = normalizeSearchText(c.riskOverrideDocument).includes(q);
        const matchReason = normalizeSearchText(c.riskOverrideReason).includes(q);

        const anyMatch =
          matchNum ||
          matchYear ||
          matchProsNum ||
          matchComplainant ||
          matchRespondent ||
          matchHospital ||
          matchPros ||
          matchPartialPros ||
          matchGov ||
          matchComm ||
          matchDoc ||
          matchReason;

        if (!anyMatch) return false;
      }

      return true;
    });
  }, [
    cases,
    activeTab,
    searchCaseNumber,
    searchProsCaseNumber,
    searchPartyName,
    searchTerm,
    selectedGov,
    selectedPros,
    selectedType,
    selectedCommittee,
    selectedStatus,
    selectedYear,
    selectedRiskLevel,
    now,
    thirtyDaysMs,
  ]);

  // إعادة الصفحة إلى 1 عند تغيير أي معيار
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchCaseNumber,
    searchProsCaseNumber,
    searchPartyName,
    searchTerm,
    activeTab,
    selectedGov,
    selectedPros,
    selectedType,
    selectedCommittee,
    selectedStatus,
    selectedYear,
    selectedRiskLevel,
  ]);

  // حساب الترقيم (Pagination)
  const totalPages = Math.ceil(filteredCases.length / pageSize) || 1;
  const paginatedCases = useMemo(() => {
    if (pageSize >= 1000) return filteredCases;
    const start = (currentPage - 1) * pageSize;
    return filteredCases.slice(start, start + pageSize);
  }, [filteredCases, currentPage, pageSize]);

  // في حال لم يتم المصادقة بعد
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-lg text-center space-y-5 font-body">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold font-heading text-slate-900">
            بوابة غرفة عمليات إدارة المخاطر وتصحيح المسار
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            منطقة حوكمية استثنائية مشددة تتطلب تأكيد كلمة المرور للمصادقة وتوثيق جلسة العمل في السجل الرقابي، وتتيح التدخل الطارئ وتصحيح مسار القضايا المعيبة بموجب تأشيرات وسندات رسمية.
          </p>
        </div>

        {authError && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
            {authError}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4 text-xs">
          <div className="text-right">
            <label className="block text-slate-700 font-semibold mb-1">
              تأكيد كلمة المرور لتفعيل وضع المخاطر
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                placeholder="أدخل كلمة المرور الحالية للتأكيد..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pr-9 pl-4 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:border-rose-600 shadow-2xs font-mono"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={verifying}
            className="w-full bg-rose-600 hover:bg-rose-700 font-heading font-bold"
          >
            <Unlock className="w-4 h-4 ml-2" />
            <span>المصادقة ودخول غرفة المخاطر</span>
          </Button>
        </form>
      </div>
    );
  }

  // عند تفعيل وضع إدارة المخاطر
  return (
    <div className="space-y-5 font-body" dir="rtl">
      {/* ─── 1. بنر إشعار وضع إدارة المخاطر النشط ─── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-rose-50/80 border-2 border-rose-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold font-heading text-rose-950 flex items-center gap-2">
              <span>غرفة عمليات إدارة المخاطر وتصحيح المسار الإجرائي (Break-Glass Active)</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-200 text-rose-900 font-mono font-bold">
                وضع استثنائي نشط
              </span>
            </h3>
            <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
              يمكنك التدخل الاستثنائي واستدراك مسار السجلات المعتمدة أو المتعثرة. تذكر أن كل تدخل يُسجَّل فورياً بالسند والمبرر في سجل التدقيق الرقابي.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExit}
          className="px-4 py-2 rounded-xl bg-white border border-rose-300 text-rose-800 hover:bg-rose-100/60 transition-colors text-xs font-bold shrink-0 shadow-2xs self-start md:self-auto"
        >
          إنهاء وضع المخاطر
        </button>
      </div>

      {/* ─── 2. التبويبات السريعة ─── */}
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
        {[
          { id: "ALL", label: `كافة السجلات (${cases.length})` },
          { id: "OVERDUE", label: "متأخرة (خطر التعثر)" },
          { id: "OVERRIDDEN", label: "تم تصحيح مسارها" },
          { id: "REFERRED_BACK", label: "خلافات فنية ومعادة" },
          { id: "APPROVED", label: "معتمدة نهائياً" },
          { id: "SUBCOMMITTEE", label: "قيد دراسة الفرعية" },
          { id: "SUPREME", label: "بانتظار اعتماد العليا" },
          { id: "REGISTERED", label: "بانتظار التوجيه" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all font-heading ${
              activeTab === tab.id
                ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── 3. لوحة البحث المتقدم والفلاتر الذكية لتصحيح المسار ─── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
        {/* ترويسة لوحة البحث والفلاتر */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-teal-700" />
            <h3 className="text-sm font-bold font-heading text-slate-900">
              أدوات البحث المباشر والفلاتر التفصيلية لتصحيح المسار
            </h3>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                {activeFiltersCount} فلتر نشط
              </span>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              title="إعادة تعيين كافة الفلاتر وحقول البحث"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط الفلاتر</span>
            </button>
          )}
        </div>

        {/* ─── أ) حقول البحث المباشرة بالاسم ورقم القضية ورقم السجل ─── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. بحث بالاسم (الشاكي / الطبيب / المشكو في حقه) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-teal-600" />
              <span>بحث بالاسم (الشاكي / المشكو في حقه)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchPartyName}
                onChange={(e) => setSearchPartyName(e.target.value)}
                placeholder="اسم الشاكي، الطبيب، المشكو في حقه..."
                className="w-full h-10 pr-3 pl-8 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 focus:bg-white font-medium"
              />
              {searchPartyName && (
                <button
                  type="button"
                  onClick={() => setSearchPartyName("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                  title="مسح"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2. بحث برقم القضية أو المحضر */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-indigo-600" />
              <span>بحث برقم القضية أو المحضر المرتبط</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchProsCaseNumber}
                onChange={(e) => setSearchProsCaseNumber(e.target.value)}
                placeholder="مثال: 4521 إداري / 1082 جنح..."
                className="w-full h-10 pr-3 pl-8 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 focus:bg-white font-mono font-medium"
                dir="auto"
              />
              {searchProsCaseNumber && (
                <button
                  type="button"
                  onClick={() => setSearchProsCaseNumber("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                  title="مسح"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 3. بحث برقم السجل (قيد المنظومة) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-teal-700" />
              <span>بحث برقم السجل (وارد المنظومة)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchCaseNumber}
                onChange={(e) => setSearchCaseNumber(e.target.value)}
                placeholder="مثال: 12 أو 582..."
                className="w-full h-10 pr-3 pl-8 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 focus:bg-white font-mono font-medium"
                dir="ltr"
              />
              {searchCaseNumber && (
                <button
                  type="button"
                  onClick={() => setSearchCaseNumber("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                  title="مسح"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 4. بحث عام حر (كلمات مفتاحية، المنشأة، سند التصحيح) */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span>بحث عام إضافي (المنشأة، النيابة، السند)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="اسم المستشفى، النيابة، أو السند..."
                className="w-full h-10 pr-3 pl-8 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-rose-500 focus:bg-white font-medium"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                  title="مسح"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ─── ب) شبكة الفلاتر التفصيلية المنسدلة ─── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 pt-2 border-t border-slate-100">
          {/* 1. نوع السجل */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">نوع السجل</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full h-9 px-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:border-rose-500"
            >
              <option value="ALL">جميع الأنواع</option>
              <option value="COMPLAINT">شكوى</option>
              <option value="CASE">قضية</option>
              <option value="REPORT">محضر</option>
            </select>
          </div>

          {/* 2. المحافظة */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">المحافظة</label>
            <select
              value={selectedGov}
              onChange={(e) => setSelectedGov(e.target.value)}
              className="w-full h-9 px-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:border-rose-500"
            >
              <option value="ALL">جميع المحافظات</option>
              {(availableGovernorates.length > 0 ? availableGovernorates : EGYPT_GOVERNORATES).map((gov) => (
                <option key={gov} value={gov}>
                  {gov}
                </option>
              ))}
            </select>
          </div>

          {/* 3. النيابة المختصة */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">النيابة المختصة</label>
            <select
              value={selectedPros}
              onChange={(e) => setSelectedPros(e.target.value)}
              className="w-full h-9 px-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:border-rose-500"
            >
              <option value="ALL">جميع النيابات</option>
              {availableProsecutions.map((pros) => (
                <option key={pros} value={pros}>
                  {pros}
                </option>
              ))}
            </select>
          </div>

          {/* 4. اللجنة الفرعية */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">اللجنة الفرعية</label>
            <select
              value={selectedCommittee}
              onChange={(e) => setSelectedCommittee(e.target.value)}
              className="w-full h-9 px-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:border-rose-500"
            >
              <option value="ALL">جميع اللجان</option>
              <option value="UNASSIGNED">-- بانتظار التوجيه (بدون لجنة) --</option>
              {availableCommittees.map((comm) => (
                <option key={comm.id} value={comm.id}>
                  {comm.name}
                </option>
              ))}
            </select>
          </div>

          {/* 5. المرحلة الحالية */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">المرحلة الحالية</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full h-9 px-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:border-rose-500"
            >
              <option value="ALL">جميع المراحل</option>
              <option value="REGISTERED">1. بانتظار التوجيه</option>
              <option value="UNDER_SUBCOMMITTEE_REVIEW">2. قيد دراسة الفرعية</option>
              <option value="PENDING_SUPREME_REVIEW">3. بانتظار اعتماد العليا</option>
              <option value="REFERRED_FOR_REVIEW">4. محال لإعادة الدراسة</option>
              <option value="APPROVED">5. معتمد (قرار نهائي)</option>
              <option value="CLOSED">6. مغلق بالأرشيف</option>
            </select>
          </div>

          {/* 6. مؤشر الخطر */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">مؤشر الخطر</label>
            <select
              value={selectedRiskLevel}
              onChange={(e) => setSelectedRiskLevel(e.target.value)}
              className="w-full h-9 px-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:border-rose-500"
            >
              <option value="ALL">كافة المؤشرات</option>
              <option value="OVERDUE">🚨 متعثرة (&gt; 30 يوم)</option>
              <option value="OVERRIDDEN">🔄 تم تصحيح مسارها</option>
              <option value="REFERRED_BACK">⚖️ قرارات مغايرة/معادة</option>
              <option value="NORMAL">✅ ضمن المعدل الطبيعي</option>
            </select>
          </div>

          {/* 7. سنة السجل */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-600 block">سنة السجل</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full h-9 px-2 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-800 focus:border-rose-500"
            >
              <option value="ALL">جميع السنوات</option>
              {availableYears.map((yr) => (
                <option key={yr} value={String(yr)}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* سطر ملخص نتائج الفلترة وحجم الصفحة */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span>النتائج المطابقة:</span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
              {filteredCases.length} سجل
            </span>
            <span className="text-slate-400">من إجمالي {cases.length} سجل بالمنظومة</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-500">عدد السجلات بالصفحة:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-8 px-2 rounded-lg border border-slate-200 bg-white font-semibold text-slate-700 text-xs"
            >
              <option value={25}>25 سجل</option>
              <option value={50}>50 سجل</option>
              <option value={100}>100 سجل</option>
              <option value={1000}>عرض الكل ({filteredCases.length})</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── 4. جدول السجلات الخاضعة للرقابة وإدارة المخاطر ─── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-heading">
                <th className="p-3.5">السجل ونوعه</th>
                <th className="p-3.5">الشاكي والمشكو في حقه</th>
                <th className="p-3.5">الجهة والنيابة المختصة</th>
                <th className="p-3.5">اللجنة الفرعية</th>
                <th className="p-3.5">المرحلة ومؤشر الخطر</th>
                <th className="p-3.5">موقف التدخل السابق</th>
                <th className="p-3.5 text-center">تصحيح المسار</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-body">
              {paginatedCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 space-y-2">
                    <AlertTriangle className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-bold text-slate-600">لا توجد سجلات تطابق معايير الفلترة أو البحث المحددة</p>
                    <p className="text-xs text-slate-400">جرب تعديل كلمة البحث أو إعادة تعيين الفلاتر لعرض السجلات.</p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>إعادة ضبط كافة الفلاتر والبحث</span>
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedCases.map((c) => {
                  const statusInfo = STATUS_LABELS[c.status] || { label: c.status, variant: "slate" };
                  const typeInfo = TYPE_CONFIG[c.registrationType || "COMPLAINT"] || TYPE_CONFIG.COMPLAINT;

                  const isOverdue =
                    c.status === "REFERRED_FOR_REVIEW" ||
                    (c.assignedAt &&
                      now - new Date(c.assignedAt).getTime() > thirtyDaysMs &&
                      c.status !== "APPROVED" &&
                      c.status !== "CLOSED");

                  const isReferredBack =
                    c.status === "REFERRED_FOR_REVIEW" ||
                    c.supremeDecisions[0]?.decisionType === "REFER_BACK" ||
                    c.supremeDecisions[0]?.decisionType === "DIFFERENT";

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* 1. السجل ونوعه */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {c.caseNumber} / {c.caseYear}
                            </span>
                            <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border ${typeInfo.badge}`}>
                              {typeInfo.label}
                            </span>
                          </div>

                          {c.prosecutionCaseNumber && (
                            <div className="font-mono text-[11px] text-slate-600 flex items-center gap-1">
                              <span className="text-slate-400">مرتبط:</span>
                              <span className="font-semibold text-slate-800">{c.prosecutionCaseNumber}</span>
                            </div>
                          )}

                          {c.incomingDate && (
                            <span className="text-[10px] text-slate-400 block font-mono">
                              وارد: {formatDate(c.incomingDate)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. الشاكي والمشكو في حقه */}
                      <td className="p-3.5 max-w-[200px]">
                        <div className="space-y-1">
                          <div className="flex items-start gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <p className="font-bold text-slate-800 truncate" title={c.complainantName || ""}>
                              {c.complainantName || "—"}
                            </p>
                          </div>

                          {(c.respondentName || c.hospitalName || c.entityName) && (
                            <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
                              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                              <span className="truncate" title={`${c.respondentName || ""} • ${c.hospitalName || c.entityName || ""}`}>
                                {c.respondentName || c.hospitalName || c.entityName}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. الجهة والنيابة والمحافظة */}
                      <td className="p-3.5 max-w-[190px]">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-800 truncate" title={`النيابة الكلية: ${c.prosecution || "—"}`}>
                            {c.prosecution || (c.registrationType === "COMPLAINT" ? "شكوى مباشرة" : "—")}
                          </p>

                          {c.partialProsecution && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200/80 truncate font-body w-fit max-w-[170px]"
                              title={`النيابة الجزئية: ${c.partialProsecution}`}
                            >
                              <span className="font-bold">جزئية:</span>
                              <span className="truncate">{c.partialProsecution}</span>
                            </span>
                          )}

                          {c.governorate && (
                            <span className="text-[10px] text-slate-400 block font-body">
                              محافظة {c.governorate}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. اللجنة الفرعية */}
                      <td className="p-3.5">
                        {c.subCommittee?.name ? (
                          <span className="font-semibold text-slate-800 text-xs">
                            {c.subCommittee.name}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            بانتظار التوجيه
                          </span>
                        )}
                      </td>

                      {/* 5. المرحلة ومؤشر الخطر */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          <Badge variant={statusInfo.variant} size="sm">
                            {statusInfo.label}
                          </Badge>

                          <div>
                            {isOverdue ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                <span>تجاوز الإطار الزمني</span>
                              </span>
                            ) : isReferredBack ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                                <ShieldAlert className="w-3 h-3 text-purple-600" />
                                <span>خلاف فني / إعادة</span>
                              </span>
                            ) : (
                              <span className="text-emerald-700 text-[10px] font-medium flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>ضمن الإطار الطبيعي</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 6. موقف التدخل السابق */}
                      <td className="p-3.5 max-w-[170px]">
                        {c.isRiskOverridden ? (
                          <div className="p-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-0.5">
                            <span className="font-bold flex items-center gap-1 text-amber-950">
                              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                              <span>تم تصحيح المسار:</span>
                            </span>
                            <span className="text-[10px] text-amber-800 block truncate" title={`سند: ${c.riskOverrideDocument || ""}`}>
                              سند: {c.riskOverrideDocument || "غير محدد"}
                            </span>
                            {c.riskOverriddenAt && (
                              <span className="text-[9px] text-amber-600 block font-mono">
                                {formatDate(c.riskOverriddenAt)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* 7. إجراءات تصحيح المسار والمعاينة */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCase(c);
                              setTargetStatus(
                                c.status === "APPROVED"
                                  ? "UNDER_SUBCOMMITTEE_REVIEW"
                                  : "PENDING_SUPREME_REVIEW"
                              );
                              setReason("");
                              setDocNumber("");
                              setOverrideError(null);
                            }}
                            className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors inline-flex items-center gap-1 shadow-2xs"
                            title="استدراك وتصحيح مسار السجل"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>تصحيح المسار</span>
                          </button>

                          <Link
                            href={`/dashboard/registration/${c.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:text-teal-700 hover:bg-slate-50 transition-colors"
                            title="معاينة ملف السجل في نافذة جديدة"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── الترقيم وتصفح الصفحات ─── */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50/50 text-xs">
            <span className="text-slate-500 font-medium">
              صفحة {currentPage} من أصل {totalPages} (إجمالي {filteredCases.length} سجل مطابقة)
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold inline-flex items-center gap-1"
              >
                <ChevronRight className="w-3.5 h-3.5" />
                <span>السابق</span>
              </button>

              <span className="px-3 py-1 font-bold text-slate-800 font-mono">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-bold inline-flex items-center gap-1"
              >
                <span>التالي</span>
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── 5. نافذة منبثقة لتنفيذ قرار تصحيح المسار الاستثنائي ─── */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-body">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-heading text-slate-900">
                    استدراك وتصحيح مسار السجل
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    سجل رقم: {selectedCase.caseNumber} لسنة {selectedCase.caseYear}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {overrideSuccess ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                <h4 className="text-sm font-bold text-emerald-900 font-heading">
                  تم تصحيح مسار السجل وتوثيق الإجراء بنجاح
                </h4>
                <p className="text-xs text-emerald-700">
                  تم قيد المذكرة الإدارية بسجل التدقيق الأمني وتوجيه السجل إلى المسار الجديد
                </p>
              </div>
            ) : (
              <form onSubmit={handleOverrideSubmit} className="space-y-4 text-xs">
                {overrideError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                    {overrideError}
                  </div>
                )}

                {/* كارت ملخص السجل الراهن */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">مقدم الشكوى:</span>
                    <span className="font-bold text-slate-900">{selectedCase.complainantName || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">اللجنة المقيدة:</span>
                    <span className="font-bold text-slate-900">{selectedCase.subCommittee?.name || "بانتظار التوجيه"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">الحالة الراهنة:</span>
                    <span className="font-bold text-slate-900">
                      {STATUS_LABELS[selectedCase.status]?.label || selectedCase.status}
                    </span>
                  </div>
                </div>

                {/* المسار الجديد */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    المسار الإجرائي الجديد المراد توجيه السجل إليه *
                  </label>
                  <select
                    value={targetStatus}
                    onChange={(e) => setTargetStatus(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-semibold text-slate-800 focus:border-rose-600 text-xs"
                  >
                    <option value="UNDER_SUBCOMMITTEE_REVIEW">
                      إعادة للدراسة باللجنة الفرعية المختصة (UNDER_SUBCOMMITTEE_REVIEW)
                    </option>
                    <option value="PENDING_SUPREME_REVIEW">
                      إعادة للعرض والمراجعة باللجنة العليا (PENDING_SUPREME_REVIEW)
                    </option>
                    <option value="REFERRED_FOR_REVIEW">
                      إحالة رسمية لإعادة الفحص بلجنة أخرى (REFERRED_FOR_REVIEW)
                    </option>
                    <option value="REGISTERED">
                      إعادة السجل إلى قائمة "بانتظار التوجيه" وسحبه من اللجنة (REGISTERED)
                    </option>
                    <option value="CLOSED">
                      حفظ أو إغلاق إداري طارئ (CLOSED)
                    </option>
                  </select>
                </div>

                {/* رقم وتاريخ السند الإداري */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    رقم وتاريخ السند الإداري / تأشيرة القرار الآمر بالتصحيح *
                  </label>
                  <input
                    type="text"
                    required
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    placeholder="مثال: قرار وزاري رقم 45 لسنة 2026 أو مذكرة الشؤون القانونية رقم 12"
                    className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white focus:border-rose-600 font-medium"
                  />
                </div>

                {/* التسبيب الإداري */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    التسبيب الإداري والمبرر القانوني لفتح وتصحيح المسار *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="بيان الخطأ المادي أو المستند الطبي الطارئ أو موجب الاستدراك الذي استوجب تصحيح مسار السجل..."
                    className="w-full p-3 rounded-xl border border-slate-300 bg-white focus:border-rose-600 leading-relaxed font-body"
                    style={{ width: "100%", minWidth: "100%", display: "block" }}
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedCase(null)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    loading={overriding}
                    disabled={overriding}
                    className="bg-rose-600 hover:bg-rose-700 font-heading font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5 ml-1.5" />
                    <span>تأكيد وتوجيه السجل</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
