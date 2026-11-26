"use client";

import { useState, useEffect, useTransition, useMemo, useRef } from "react";
import Link from "next/link";
import {
  UserCheck,
  Plus,
  CreditCard,
  Building,
  Building2,
  Stethoscope,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Pause,
  Play,
  Trash2,
  X,
  Search,
  Eye,
  Phone,
  ExternalLink,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Filter,
  ShieldCheck,
  Calendar,
  Layers,
  Sparkles,
  ChevronDown,
  CheckSquare,
  Square,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { PageHeader, StatCard, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@/components/ui";
import { formatDate } from "@/lib/formatters";

interface Specialty {
  id: string;
  name: string;
  code?: string;
}

interface SubCommittee {
  id: string;
  name: string;
  code: string;
}

interface CaseAssignment {
  id: string;
  assignedAt: string;
  role?: string;
  case: {
    id: string;
    caseNumber: number;
    caseYear: number;
    complainantName: string;
    hospitalName?: string | null;
    status: string;
    incomingDate?: string | null;
  };
}

interface Doctor {
  id: string;
  name: string;
  title: string | null;
  employer: string;
  subCommitteeId?: string;
  subCommittee?: { id: string; name: string; code: string } | null;
  specialtyId: string | null;
  specialty?: Specialty | null;
  phone: string | null;
  active: boolean;
  notes: string | null;
  nationalId?: string | null;
  financialType?: "PAYROLL_CARD" | "BANK_ACCOUNT" | "BANK_CARD" | null;
  bankName?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  cardNumber?: string | null;
  reviewAssignments?: CaseAssignment[];
  createdAt: string;
}

export default function SubcommitteeDoctorsPage() {
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const [currentUser, setCurrentUser] = useState<{ role?: string; subCommitteeId?: string | null } | null>(null);

  const role = currentUser?.role || (session?.user as any)?.role;
  const userSubCommitteeId = currentUser !== null ? currentUser.subCommitteeId : (session?.user as any)?.subCommitteeId;
  const canManageAllCommittees = role === "ADMIN" || (role === "SUBCOMMITTEE_MEMBER" && !userSubCommitteeId);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [subCommittees, setSubCommittees] = useState<SubCommittee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // فلاتر البحث والاستعراض (دعم الاختيار المتعدد)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCommitteeFilters, setSelectedCommitteeFilters] = useState<string[]>([]);
  const [selectedSpecialtyFilters, setSelectedSpecialtyFilters] = useState<string[]>([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<"ALL" | "ACTIVE" | "PAUSED" | "MISSING_FINANCE">("ALL");

  // قوائم منسدلة للاختيار المتعدد
  const [committeeDropdownOpen, setCommitteeDropdownOpen] = useState(false);
  const [specialtyDropdownOpen, setSpecialtyDropdownOpen] = useState(false);
  const [committeeSearchInside, setCommitteeSearchInside] = useState("");
  const [specialtySearchInside, setSpecialtySearchInside] = useState("");

  // نافذة معاينة كامل بيانات الطبيب
  const [viewingDoctor, setViewingDoctor] = useState<Doctor | null>(null);
  const [loadingDoctorDetails, setLoadingDoctorDetails] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // نافذة تعديل البيانات المالية
  const [editingFinanceDoc, setEditingFinanceDoc] = useState<Doctor | null>(null);
  const [editNationalId, setEditNationalId] = useState("");
  const [editFinancialType, setEditFinancialType] = useState<"PAYROLL_CARD" | "BANK_ACCOUNT" | "BANK_CARD">("PAYROLL_CARD");
  const [editBankName, setEditBankName] = useState("");
  const [editAccountNumber, setEditAccountNumber] = useState("");
  const [editIban, setEditIban] = useState("");
  const [editCardNumber, setEditCardNumber] = useState("");

  async function loadData() {
    try {
      setLoading(true);
      const [docsRes, specRes, subRes] = await Promise.all([
        fetch("/api/subcommittee/doctors"),
        fetch("/api/specialties"),
        fetch("/api/subcommittees"),
      ]);

      if (!docsRes.ok) {
        const d = await docsRes.json();
        throw new Error(d.error || "تعذر تحميل سجل أطباء اللجنة");
      }

      setDoctors(await docsRes.json());
      if (specRes.ok) setSpecialties(await specRes.json());
      if (subRes.ok) setSubCommittees(await subRes.json());
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((s) => {
        if (s?.user) {
          setCurrentUser({ role: s.user.role, subCommitteeId: s.user.subCommitteeId });
        }
      })
      .catch(() => undefined);
  }, []);

  // ─── Faceted Search: القاعدة لحساب توزيع اللجان (كل الفلاتر ما عدا فلتر اللجنة ذاته) ───
  const baseForCommitteePills = useMemo(() => {
    return doctors.filter((doc) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = doc.name.toLowerCase().includes(q);
        const matchesPhone = doc.phone?.includes(q) ?? false;
        const matchesEmployer = doc.employer?.toLowerCase().includes(q) ?? false;
        const matchesNationalId = doc.nationalId?.includes(q) ?? false;
        const matchesSpecialty = doc.specialty?.name.toLowerCase().includes(q) ?? false;
        const matchesCommittee = doc.subCommittee?.name.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesPhone && !matchesEmployer && !matchesNationalId && !matchesSpecialty && !matchesCommittee) return false;
      }
      if (selectedSpecialtyFilters.length > 0) {
        const docSpecId = doc.specialty?.id || doc.specialtyId;
        if (!docSpecId || !selectedSpecialtyFilters.includes(docSpecId)) return false;
      }
      if (selectedStatusFilter === "ACTIVE" && !doc.active) return false;
      if (selectedStatusFilter === "PAUSED" && doc.active) return false;
      if (selectedStatusFilter === "MISSING_FINANCE") {
        const hasCard = Boolean(doc.cardNumber);
        const hasAcc = Boolean(doc.accountNumber || doc.iban);
        if (hasCard || hasAcc) return false;
      }
      return true;
    });
  }, [doctors, searchTerm, selectedSpecialtyFilters, selectedStatusFilter]);

  // ─── Faceted Search: القاعدة لحساب توزيع التخصصات (كل الفلاتر ما عدا فلتر التخصص ذاته) ───
  const baseForSpecialtyPills = useMemo(() => {
    return doctors.filter((doc) => {
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = doc.name.toLowerCase().includes(q);
        const matchesPhone = doc.phone?.includes(q) ?? false;
        const matchesEmployer = doc.employer?.toLowerCase().includes(q) ?? false;
        const matchesNationalId = doc.nationalId?.includes(q) ?? false;
        const matchesSpecialty = doc.specialty?.name.toLowerCase().includes(q) ?? false;
        const matchesCommittee = doc.subCommittee?.name.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesPhone && !matchesEmployer && !matchesNationalId && !matchesSpecialty && !matchesCommittee) return false;
      }
      if (selectedCommitteeFilters.length > 0) {
        const docCommId = doc.subCommittee?.id || doc.subCommitteeId;
        if (!docCommId || !selectedCommitteeFilters.includes(docCommId)) return false;
      }
      if (selectedStatusFilter === "ACTIVE" && !doc.active) return false;
      if (selectedStatusFilter === "PAUSED" && doc.active) return false;
      if (selectedStatusFilter === "MISSING_FINANCE") {
        const hasCard = Boolean(doc.cardNumber);
        const hasAcc = Boolean(doc.accountNumber || doc.iban);
        if (hasCard || hasAcc) return false;
      }
      return true;
    });
  }, [doctors, searchTerm, selectedCommitteeFilters, selectedStatusFilter]);

  // حساب توزيع الأطباء على اللجان (سياقي: بناء على فلاتر التخصص والبحث والحالة)
  const committeeDistribution = useMemo(() => {
    const counts: Record<string, { id: string; name: string; code: string; count: number }> = {};
    baseForCommitteePills.forEach((d) => {
      const commId = d.subCommittee?.id || d.subCommitteeId || "UNKNOWN";
      const commName = d.subCommittee?.name || "لجنة غير محددة";
      const commCode = d.subCommittee?.code || "—";
      if (!counts[commId]) {
        counts[commId] = { id: commId, name: commName, code: commCode, count: 0 };
      }
      counts[commId].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [baseForCommitteePills]);

  // حساب توزيع الأطباء على التخصصات الطبية (سياقي: بناء على فلاتر اللجنة والبحث والحالة)
  const specialtyDistribution = useMemo(() => {
    const counts: Record<string, { id: string; name: string; count: number }> = {};
    baseForSpecialtyPills.forEach((d) => {
      const specId = d.specialty?.id || d.specialtyId || "UNKNOWN";
      const specName = d.specialty?.name || "تخصص غير محدد";
      if (!counts[specId]) {
        counts[specId] = { id: specId, name: specName, count: 0 };
      }
      counts[specId].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  }, [baseForSpecialtyPills]);

  // تبديل اختيار اللجنة (Multi-select Toggle)
  function toggleCommitteeFilter(id: string) {
    setSelectedCommitteeFilters((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // تبديل اختيار التخصص (Multi-select Toggle)
  function toggleSpecialtyFilter(id: string) {
    setSelectedSpecialtyFilters((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // تصفية الأطباء بناء على الفلاتر والبحث (دعم الاختيار المتعدد)
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      // بحث نصي
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = doc.name.toLowerCase().includes(q);
        const matchesPhone = doc.phone?.includes(q) ?? false;
        const matchesEmployer = doc.employer?.toLowerCase().includes(q) ?? false;
        const matchesNationalId = doc.nationalId?.includes(q) ?? false;
        const matchesSpecialty = doc.specialty?.name.toLowerCase().includes(q) ?? false;
        const matchesCommittee = doc.subCommittee?.name.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesPhone && !matchesEmployer && !matchesNationalId && !matchesSpecialty && !matchesCommittee) {
          return false;
        }
      }

      // فلترة اللجان المتعددة (OR منطقي بين اللجان المختارة)
      if (selectedCommitteeFilters.length > 0) {
        const docCommId = doc.subCommittee?.id || doc.subCommitteeId;
        if (!docCommId || !selectedCommitteeFilters.includes(docCommId)) {
          return false;
        }
      }

      // فلترة التخصصات المتعددة (OR منطقي بين التخصصات المختارة)
      if (selectedSpecialtyFilters.length > 0) {
        const docSpecId = doc.specialty?.id || doc.specialtyId;
        if (!docSpecId || !selectedSpecialtyFilters.includes(docSpecId)) {
          return false;
        }
      }

      // فلترة الحالة والبيانات المالية
      if (selectedStatusFilter === "ACTIVE" && !doc.active) return false;
      if (selectedStatusFilter === "PAUSED" && doc.active) return false;
      if (selectedStatusFilter === "MISSING_FINANCE") {
        const hasCard = Boolean(doc.cardNumber);
        const hasAcc = Boolean(doc.accountNumber || doc.iban);
        if (hasCard || hasAcc) return false;
      }

      return true;
    });
  }, [doctors, searchTerm, selectedCommitteeFilters, selectedSpecialtyFilters, selectedStatusFilter]);

  // فتح نافذة المعاينة الكاملة للطبيب
  async function openDoctorDetails(doc: Doctor) {
    setViewingDoctor(doc);
    setLoadingDoctorDetails(true);
    try {
      const res = await fetch(`/api/subcommittee/doctors/${doc.id}`);
      if (res.ok) {
        const fullDoc = await res.json();
        setViewingDoctor(fullDoc);
      }
    } catch (err) {
      console.error("Failed to fetch full doctor details:", err);
    } finally {
      setLoadingDoctorDetails(false);
    }
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  function openFinanceModal(doc: Doctor) {
    setEditingFinanceDoc(doc);
    setEditNationalId(doc.nationalId || "");
    setEditFinancialType((doc.financialType as any) || "PAYROLL_CARD");
    setEditBankName(doc.bankName || "البنك الأهلي المصري (ميزة / مرتبات حكومية)");
    setEditAccountNumber(doc.accountNumber || "");
    setEditIban(doc.iban || "");
    setEditCardNumber(doc.cardNumber || "");
  }

  async function handleSaveFinanceUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingFinanceDoc) return;
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/subcommittee/doctors/${editingFinanceDoc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nationalId: editNationalId || null,
            financialType: editFinancialType,
            bankName: editBankName || null,
            accountNumber: editFinancialType === "BANK_ACCOUNT" ? editAccountNumber || null : null,
            iban: editFinancialType === "BANK_ACCOUNT" ? editIban || null : null,
            cardNumber: editFinancialType === "PAYROLL_CARD" || editFinancialType === "BANK_CARD" ? editCardNumber || null : null,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "تعذر تحديث البيانات المالية");

        setSuccessMsg(`تم تحديث البيانات المالية للطبيب (${editingFinanceDoc.name}) بنجاح`);
        setEditingFinanceDoc(null);
        if (viewingDoctor && viewingDoctor.id === editingFinanceDoc.id) {
          setViewingDoctor(data);
        }
        await loadData();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  async function handleToggleStatus(doc: Doctor) {
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/subcommittee/doctors/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !doc.active }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "تعذر تحديث حالة الطبيب");
      }

      setSuccessMsg(
        !doc.active
          ? `تم تنشيط الطبيب (${doc.name}) وإتاحته للفحص`
          : `تم الإيقاف المؤقت للطبيب (${doc.name}) بنجاح ولن يظهر في تشكيلات الفحص الجديدة`
      );
      if (viewingDoctor && viewingDoctor.id === doc.id) {
        setViewingDoctor({ ...viewingDoctor, active: !doc.active });
      }
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteDoctor(doc: Doctor) {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف الطبيب (${doc.name}) من سجل اللجنة؟`)) return;

    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/subcommittee/doctors/${doc.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "تعذر حذف الطبيب");
      }

      setSuccessMsg("تم حذف الطبيب من سجل اللجنة بنجاح");
      if (viewingDoctor && viewingDoctor.id === doc.id) {
        setViewingDoctor(null);
      }
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function resetAllFilters() {
    setSearchTerm("");
    setSelectedCommitteeFilters([]);
    setSelectedSpecialtyFilters([]);
    setSelectedStatusFilter("ALL");
  }

  const hasActiveFilters = Boolean(
    searchTerm ||
    selectedCommitteeFilters.length > 0 ||
    selectedSpecialtyFilters.length > 0 ||
    selectedStatusFilter !== "ALL"
  );

  return (
    <div className="space-y-6">
      {/* ─── رأس الصفحة الموحد ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "اللجان الفرعية", href: "/dashboard/subcommittee" },
          { label: "سجل أطباء اللجنة" },
        ]}
        title="سجل وتوزيع الأطباء واستشاريي اللجان"
        description="حصر وتوزيع الأطباء والخبراء الاستشاريين على اللجان الفرعية الـ 16 والتخصصات الطبية، مع الإدارة الدقيقة للحسابات البنكية وصرف المستحقات."
        actions={
          <Link
            href="/dashboard/subcommittee/doctors/new"
            className="h-10 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold font-heading shadow-xs inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة طبيب جديد</span>
          </Link>
        }
      />

      {/* التنبيهات العائمة */}
      {error && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] max-w-lg w-[92%] sm:w-auto min-w-[340px] pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="p-3.5 rounded-2xl shadow-2xl bg-rose-950/95 text-white border-2 border-rose-500 backdrop-blur-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/30 border border-rose-400/40 flex items-center justify-center text-rose-200 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="font-bold text-xs text-rose-200">تنبيه بالخطأ</p>
                <p className="text-xs text-white font-medium">{error}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setError(null)}
              className="text-rose-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] max-w-lg w-[92%] sm:w-auto min-w-[340px] pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="p-3.5 rounded-2xl shadow-2xl bg-emerald-950/95 text-white border-2 border-emerald-500 backdrop-blur-md flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/30 border border-emerald-400/40 flex items-center justify-center text-emerald-200 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-right">
                <p className="font-bold text-xs text-emerald-200">تمت العملية بنجاح</p>
                <p className="text-xs text-white font-medium">{successMsg}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ─── بطاقات المؤشرات الإحصائية العامة ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="إجمالي الأطباء المقيدين"
          value={doctors.length}
          icon={<UserCheck className="w-5 h-5" />}
          color="teal"
          description="حصر شامل لكافة الاستشاريين"
        />
        <StatCard
          title="أطباء متاحون للفحص"
          value={doctors.filter((d) => d.active).length}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
          description={`${doctors.filter((d) => !d.active).length} طبيب موقوف مؤقتاً`}
        />
        <StatCard
          title="فيزا مرتبات حكومية"
          value={doctors.filter((d) => d.financialType === "PAYROLL_CARD").length}
          icon={<CreditCard className="w-5 h-5" />}
          color="purple"
          description="صرف مباشر عبر بطاقات ميزة"
        />
        <StatCard
          title="حسابات بنكية شخصية"
          value={doctors.filter((d) => d.financialType === "BANK_ACCOUNT" || d.financialType === "BANK_CARD").length}
          icon={<Building className="w-5 h-5" />}
          color="sky"
          description="تحويل بنكي / IBAN"
        />
      </div>

      {/* ─── مركز توزيع الأطباء التفاعلي (دعم الاختيار المتعدد) ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs space-y-4">
        {/* رأس القسم التفاعلي */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-heading text-slate-800 flex items-center gap-2">
                <span>توزيع الأطباء والاستشاريين حسب اللجان والتخصصات</span>
                <span className="text-[10px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200 font-bold">
                  يدعم الاختيار المتعدد
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 font-body">
                يمكنك النقر على أكثر من لجنة وأكثر من تخصص طبي في نفس الوقت لتصفية الأطباء بدقة متناهية
              </p>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط الفلاتر ({selectedCommitteeFilters.length + selectedSpecialtyFilters.length} محددة)</span>
            </button>
          )}
        </div>

        {/* 1. توزيع الأطباء على اللجان والجهات الفرعية (اختيار متعدد) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-teal-600" />
              <span>
                التوزيع حسب اللجان الفرعية ({committeeDistribution.length} جهة)
                {selectedCommitteeFilters.length > 0 && (
                  <span className="text-teal-700 font-bold mr-1">
                    [تم تحديد {selectedCommitteeFilters.length} لجان]
                  </span>
                )}
              </span>
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              المعروض حالياً: {filteredDoctors.length} من أصل {doctors.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedCommitteeFilters([])}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedCommitteeFilters.length === 0
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              جميع اللجان ({baseForCommitteePills.length})
            </button>
            {committeeDistribution.map((item) => {
              const isSelected = selectedCommitteeFilters.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleCommitteeFilter(item.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-teal-600 text-white border-teal-700 shadow-xs font-bold ring-2 ring-teal-500/30"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 font-medium"
                  }`}
                  title={`${item.name} (${item.code})`}
                >
                  <span className="truncate max-w-[150px]">{item.name}</span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? "bg-white/20 text-white font-bold" : "bg-teal-100/70 text-teal-800 font-bold"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. توزيع الأطباء على التخصصات الطبية المعيارية (اختيار متعدد) */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
              <span>
                التوزيع حسب التخصصات الطبية ({specialtyDistribution.length} تخصص)
                {selectedSpecialtyFilters.length > 0 && (
                  <span className="text-teal-700 font-bold mr-1">
                    [تم تحديد {selectedSpecialtyFilters.length} تخصصات]
                  </span>
                )}
              </span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedSpecialtyFilters([])}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedSpecialtyFilters.length === 0
                  ? "bg-teal-700 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              جميع التخصصات ({baseForSpecialtyPills.length})
            </button>
            {specialtyDistribution.map((item) => {
              const isSelected = selectedSpecialtyFilters.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleSpecialtyFilter(item.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-teal-600 text-white border-teal-700 shadow-xs font-bold ring-2 ring-teal-500/30"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80 font-medium"
                  }`}
                  title={item.name}
                >
                  <span className="truncate max-w-[150px]">{item.name}</span>
                  <span
                    className={`font-mono text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? "bg-white/20 text-white font-bold" : "bg-sky-100 text-sky-800 font-bold"
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── جدول أطباء واستشاريي اللجنة الفرعية ─── */}
      <Card className="p-0 overflow-hidden">
        {/* شريط البحث والفلترة التفصيلية متعددة الاختيار */}
        <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-3 relative">
          {/* خلفية إغلاق القوائم عند النقر بالخارج */}
          {(committeeDropdownOpen || specialtyDropdownOpen) && (
            <div
              className="fixed inset-0 z-20"
              onClick={() => {
                setCommitteeDropdownOpen(false);
                setSpecialtyDropdownOpen(false);
              }}
            />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 relative z-30">
            {/* حقل البحث السريع */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث: باسم الطبيب، المستشفى، الرقم القومي، الهاتف..."
                className="form-input text-xs pr-9 bg-white w-full"
              />
            </div>

            {/* فلتر اللجان - اختيار متعدد مع نافذة منسدلة أنيقة */}
            {canManageAllCommittees && (
              <div className="relative w-full sm:w-56">
                <button
                  type="button"
                  onClick={() => {
                    setCommitteeDropdownOpen(!committeeDropdownOpen);
                    setSpecialtyDropdownOpen(false);
                  }}
                  className={`form-input text-xs bg-white w-full flex items-center justify-between gap-1.5 px-3 py-2 text-right cursor-pointer ${
                    selectedCommitteeFilters.length > 0 ? "border-teal-500 font-bold text-teal-900 bg-teal-50/30" : "text-slate-700"
                  }`}
                >
                  <span className="truncate">
                    {selectedCommitteeFilters.length === 0
                      ? "اللجان الفرعية (الكل)"
                      : `اللجان (${selectedCommitteeFilters.length} محددة)`}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${committeeDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {committeeDropdownOpen && (
                  <div className="absolute top-full mt-1 right-0 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-40 space-y-2 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-xs">
                      <span className="font-bold text-slate-800">اختيار اللجان الفرعية:</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedCommitteeFilters(subCommittees.map((s) => s.id))}
                          className="text-[11px] text-teal-700 hover:underline font-medium"
                        >
                          تحديد الكل
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCommitteeFilters([])}
                          className="text-[11px] text-rose-600 hover:underline font-medium"
                        >
                          مسح
                        </button>
                      </div>
                    </div>

                    <div className="relative">
                      <Search className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={committeeSearchInside}
                        onChange={(e) => setCommitteeSearchInside(e.target.value)}
                        placeholder="تصفية اللجان..."
                        className="form-input text-[11px] pr-7 py-1 h-7 bg-slate-50 w-full"
                      />
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-0.5">
                      {subCommittees
                        .filter((sc) => sc.name.toLowerCase().includes(committeeSearchInside.toLowerCase()))
                        .map((sc) => {
                          const isChecked = selectedCommitteeFilters.includes(sc.id);
                          const docCount = baseForCommitteePills.filter((d) => (d.subCommittee?.id || d.subCommitteeId) === sc.id).length;
                          return (
                            <label
                              key={sc.id}
                              className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                                isChecked ? "bg-teal-50 text-teal-900 font-bold" : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleCommitteeFilter(sc.id)}
                                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                />
                                <span className="truncate">{sc.name}</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 font-normal shrink-0">
                                {docCount} طبيب
                              </span>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* فلتر التخصصات - اختيار متعدد مع نافذة منسدلة أنيقة */}
            <div className="relative w-full sm:w-56">
              <button
                type="button"
                onClick={() => {
                  setSpecialtyDropdownOpen(!specialtyDropdownOpen);
                  setCommitteeDropdownOpen(false);
                }}
                className={`form-input text-xs bg-white w-full flex items-center justify-between gap-1.5 px-3 py-2 text-right cursor-pointer ${
                  selectedSpecialtyFilters.length > 0 ? "border-teal-500 font-bold text-teal-900 bg-teal-50/30" : "text-slate-700"
                }`}
              >
                <span className="truncate">
                  {selectedSpecialtyFilters.length === 0
                    ? "التخصصات الطبية (الكل)"
                    : `التخصصات (${selectedSpecialtyFilters.length} محددة)`}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${specialtyDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {specialtyDropdownOpen && (
                <div className="absolute top-full mt-1 right-0 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-40 space-y-2 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 text-xs">
                    <span className="font-bold text-slate-800">اختيار التخصصات الطبية:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedSpecialtyFilters(specialties.map((s) => s.id))}
                        className="text-[11px] text-teal-700 hover:underline font-medium"
                      >
                        تحديد الكل
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedSpecialtyFilters([])}
                        className="text-[11px] text-rose-600 hover:underline font-medium"
                      >
                        مسح
                      </button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="w-3 h-3 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={specialtySearchInside}
                      onChange={(e) => setSpecialtySearchInside(e.target.value)}
                      placeholder="تصفية التخصصات..."
                      className="form-input text-[11px] pr-7 py-1 h-7 bg-slate-50 w-full"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    {specialties
                      .filter((sp) => sp.name.toLowerCase().includes(specialtySearchInside.toLowerCase()))
                      .map((sp) => {
                        const isChecked = selectedSpecialtyFilters.includes(sp.id);
                        const docCount = baseForSpecialtyPills.filter((d) => (d.specialty?.id || d.specialtyId) === sp.id).length;
                        return (
                          <label
                            key={sp.id}
                            className={`flex items-center justify-between p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                              isChecked ? "bg-teal-50 text-teal-900 font-bold" : "hover:bg-slate-50 text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => toggleSpecialtyFilter(sp.id)}
                                className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                              />
                              <span className="truncate">{sp.name}</span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 font-normal shrink-0">
                              {docCount} طبيب
                            </span>
                          </label>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* فلتر الحالة والبيانات المالية */}
            <div className="w-full sm:w-44">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value as any)}
                className="form-select text-xs bg-white w-full"
              >
                <option value="ALL">جميع الحالات</option>
                <option value="ACTIVE">متاحون للفحص فقط</option>
                <option value="PAUSED">موقوفون مؤقتاً</option>
                <option value="MISSING_FINANCE">بيانات مالية ناقصة</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto shrink-0 relative z-10">
            <span className="text-xs font-semibold text-slate-600 font-mono">
              معروض {filteredDoctors.length} من {doctors.length} طبيب
            </span>
          </div>
        </div>

        {/* عرض التسميات النشطة للفلاتر المتعددة إن وجدت */}
        {hasActiveFilters && (
          <div className="p-2.5 bg-teal-50/50 border-b border-teal-100 flex items-center gap-2 flex-wrap text-xs">
            <span className="text-teal-900 font-bold flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-teal-600" />
              <span>الفلاتر النشطة:</span>
            </span>

            {/* لجان محددة */}
            {selectedCommitteeFilters.map((id) => {
              const sc = subCommittees.find((s) => s.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-100/80 text-teal-900 text-[11px] font-medium border border-teal-200"
                >
                  <span>{sc?.name || id}</span>
                  <button
                    type="button"
                    onClick={() => toggleCommitteeFilter(id)}
                    className="hover:text-rose-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {/* تخصصات محددة */}
            {selectedSpecialtyFilters.map((id) => {
              const sp = specialties.find((s) => s.id === id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-100/80 text-sky-900 text-[11px] font-medium border border-sky-200"
                >
                  <Stethoscope className="w-3 h-3 text-sky-700" />
                  <span>{sp?.name || id}</span>
                  <button
                    type="button"
                    onClick={() => toggleSpecialtyFilter(id)}
                    className="hover:text-rose-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}

            {searchTerm && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-200 text-slate-800 text-[11px]">
                <span>بحث: {searchTerm}</span>
                <button type="button" onClick={() => setSearchTerm("")}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={resetAllFilters}
              className="text-[11px] text-rose-700 hover:underline font-bold mr-auto cursor-pointer"
            >
              مسح جميع الفلاتر
            </button>
          </div>
        )}

        {/* عرض الجدول */}
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 font-body">جارٍ تحميل سجل وتوزيع الأطباء...</div>
        ) : filteredDoctors.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 space-y-3 font-body">
            <p>لا توجد سجلات مطابقة لمعايير البحث الحالية.</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>إعادة ضبط الفلاتر</span>
              </button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="min-w-[190px]">اسم الطبيب / اللقب العلمي</TableHead>
                {canManageAllCommittees && <TableHead className="min-w-[150px]">اللجنة الفرعية</TableHead>}
                <TableHead className="min-w-[220px] w-60">التخصص الطبي</TableHead>
                <TableHead className="min-w-[190px]">جهة العمل / المستشفى</TableHead>
                <TableHead className="min-w-[210px]">البيانات المالية وصرف المستحقات</TableHead>
                <TableHead className="w-32">الحالة</TableHead>
                <TableHead className="w-28">الهاتف</TableHead>
                <TableHead className="text-center w-36">الإجراءات والتحكم</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDoctors.map((doc, idx) => (
                <TableRow key={doc.id} className={!doc.active ? "bg-slate-50/90 opacity-75" : undefined}>
                  <TableCell className="font-mono text-xs text-slate-400 font-semibold">{idx + 1}</TableCell>

                  {/* اسم الطبيب: قابل للنقر لفتح كامل البيانات */}
                  <TableCell className="min-w-[190px]">
                    <button
                      type="button"
                      onClick={() => openDoctorDetails(doc)}
                      className="text-right group flex flex-col items-start cursor-pointer"
                      title="انقر لفتح واستعراض كامل ملف وبيانات الطبيب"
                    >
                      <div className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors flex items-center gap-1 text-xs font-heading">
                        <span className="text-slate-500 font-normal">{doc.title || "د."}</span>
                        <span className="group-hover:underline underline-offset-2">{doc.name}</span>
                        <Eye className="w-3 h-3 text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {doc.nationalId && (
                        <span className="text-[10px] text-slate-400 font-mono mt-0.5" dir="ltr">
                          الرقم القومي: {doc.nationalId}
                        </span>
                      )}
                    </button>
                  </TableCell>

                  {/* اللجنة الفرعية */}
                  {canManageAllCommittees && (
                    <TableCell className="text-xs font-body whitespace-nowrap min-w-[150px]">
                      {doc.subCommittee ? (
                        <button
                          type="button"
                          onClick={() => toggleCommitteeFilter(doc.subCommittee?.id || "")}
                          className={`inline-flex items-center px-2 py-0.5 rounded-md font-medium border transition-colors cursor-pointer ${
                            selectedCommitteeFilters.includes(doc.subCommittee.id)
                              ? "bg-teal-700 text-white border-teal-800 font-bold"
                              : "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100"
                          }`}
                          title="تصفية حسب هذه اللجنة (يدعم الاختيار المتعدد)"
                        >
                          {doc.subCommittee.name}
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                  )}

                  {/* التخصص الطبي (تم توسيع العمود وجعله عريضاً ومريحاً للقراءة) */}
                  <TableCell className="min-w-[220px] w-60">
                    {doc.specialty ? (
                      <button
                        type="button"
                        onClick={() => toggleSpecialtyFilter(doc.specialty?.id || "")}
                        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium border font-body transition-colors cursor-pointer text-right max-w-full ${
                          selectedSpecialtyFilters.includes(doc.specialty.id)
                            ? "bg-teal-700 text-white border-teal-800 shadow-xs font-bold"
                            : "bg-teal-50/80 text-teal-900 border-teal-200 hover:bg-teal-100"
                        }`}
                        title="تصفية حسب هذا التخصص (يدعم الاختيار المتعدد)"
                      >
                        <Stethoscope className={`w-3.5 h-3.5 shrink-0 ${
                          selectedSpecialtyFilters.includes(doc.specialty.id) ? "text-white" : "text-teal-600"
                        }`} />
                        <span className="leading-snug break-words">{doc.specialty?.name || "—"}</span>
                      </button>
                    ) : (
                      <span className="text-slate-400 text-xs font-body">—</span>
                    )}
                  </TableCell>

                  {/* جهة العمل */}
                  <TableCell className="font-medium text-slate-800 text-xs font-body min-w-[190px]">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="line-clamp-2" title={doc.employer}>{doc.employer}</span>
                    </div>
                  </TableCell>

                  {/* البيانات المالية والمصرفية */}
                  <TableCell className="text-xs font-body min-w-[210px]">
                    {doc.financialType === "PAYROLL_CARD" && (doc.bankName || doc.cardNumber) ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-purple-900 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md text-[11px]">
                          <CreditCard className="w-3 h-3 text-purple-700" />
                          <span>فيزا مرتبات ({doc.bankName || "ميزة"})</span>
                        </span>
                        <span className="block text-xs font-mono text-purple-950 font-bold" dir="ltr">
                          {doc.cardNumber || "—"}
                        </span>
                      </div>
                    ) : doc.financialType === "BANK_ACCOUNT" && (doc.bankName || doc.accountNumber) ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-teal-900 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md text-[11px]">
                          <Building className="w-3 h-3 text-teal-700" />
                          <span>حساب بنكي ({doc.bankName})</span>
                        </span>
                        <span className="block text-xs font-mono text-teal-900 font-bold" dir="ltr">
                          {doc.accountNumber || "—"}
                        </span>
                      </div>
                    ) : doc.financialType === "BANK_CARD" && (doc.bankName || doc.cardNumber) ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
                          <CreditCard className="w-3 h-3 text-emerald-700" />
                          <span>كارت بنكي خاص ({doc.bankName})</span>
                        </span>
                        <span className="block text-xs font-mono text-slate-700 font-bold" dir="ltr">
                          {doc.cardNumber || "—"}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>بانتظار استيفاء البيانات</span>
                      </span>
                    )}
                  </TableCell>

                  {/* الحالة */}
                  <TableCell className="w-32">
                    {doc.active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium font-body">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        <span>نشط ومتاح للفحص</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium font-body">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        <span>موقوف مؤقتاً</span>
                      </span>
                    )}
                  </TableCell>

                  {/* الهاتف */}
                  <TableCell className="text-xs text-slate-600 font-mono w-28" dir="ltr">
                    {doc.phone ? (
                      <a
                        href={`tel:${doc.phone}`}
                        className="hover:text-teal-700 hover:underline inline-flex items-center gap-1"
                        title="اتصال بالطبيب"
                      >
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{doc.phone}</span>
                      </a>
                    ) : (
                      "—"
                    )}
                  </TableCell>

                  {/* التحكم والإجراءات */}
                  <TableCell className="text-center whitespace-nowrap w-36">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openDoctorDetails(doc)}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-teal-50 text-teal-900 hover:bg-teal-100 border border-teal-200 font-semibold font-body transition-colors cursor-pointer"
                        title="استعراض كامل الملف التفصيلي للطبيب والقضايا المسندة"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-700" />
                        <span>عرض البيانات</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openFinanceModal(doc)}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200 font-semibold font-body transition-colors cursor-pointer"
                        title="تعديل أو استكمال فيزا المرتبات / الحساب البنكي"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-purple-700" />
                        <span>الماليات</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(doc)}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg font-semibold font-body transition-colors cursor-pointer ${
                          doc.active
                            ? "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                            : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                        }`}
                        title={doc.active ? "إيقاف الطبيب مؤقتاً عن استلام قضايا جديدة" : "إعادة تنشيط الطبيب وإتاحته للفحص"}
                      >
                        {doc.active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDoctor(doc)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                        title="حذف من السجل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* ─── نافذة استعراض كامل ملف وبيانات الطبيب (Doctor Details Modal) ─── */}
      {viewingDoctor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 font-body">
            {/* رأس نافذة الطبيب */}
            <div className="p-4 border-b border-teal-200 bg-gradient-to-r from-teal-900 via-slate-900 to-teal-950 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-teal-500/20 border border-teal-400/40 flex items-center justify-center text-teal-300">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2 flex-wrap font-heading">
                    <span>{viewingDoctor.title || "د."}</span>
                    <span>{viewingDoctor.name}</span>
                    {viewingDoctor.active ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                        نشط ومتاح للفحص
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                        موقوف مؤقتاً
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-teal-200/80 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span>اللجنة: {viewingDoctor.subCommittee?.name || "غير محددة"}</span>
                    <span>•</span>
                    <span>التخصص: {viewingDoctor.specialty?.name || "غير محدد"}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openFinanceModal(viewingDoctor)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>تعديل المالي</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingDoctor(null)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* محتوى بيانات الطبيب */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {loadingDoctorDetails && (
                <div className="p-2 rounded-lg bg-teal-50 text-teal-800 text-xs text-center font-medium animate-pulse">
                  جارٍ تحديث أحدث السجلات والقضايا والبيانات المشفرة للطبيب...
                </div>
              )}

              {/* شبكة البيانات الأساسية */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* بطاقة الهوية والتواصل */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5 font-heading">
                    <UserCheck className="w-4 h-4 text-teal-700" />
                    <span>بيانات الهوية والاتصال</span>
                  </span>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">الرقم القومي (14 رقماً):</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-slate-900" dir="ltr">
                          {viewingDoctor.nationalId || "غير مسجل"}
                        </span>
                        {viewingDoctor.nationalId && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(viewingDoctor.nationalId!, "nid")}
                            className="p-1 text-slate-400 hover:text-teal-700"
                            title="نسخ الرقم القومي"
                          >
                            {copiedKey === "nid" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">رقم الهاتف المحمول:</span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-slate-900" dir="ltr">
                          {viewingDoctor.phone || "غير مسجل"}
                        </span>
                        {viewingDoctor.phone && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(viewingDoctor.phone!, "phone")}
                            className="p-1 text-slate-400 hover:text-teal-700"
                            title="نسخ رقم الهاتف"
                          >
                            {copiedKey === "phone" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">اللقب العلمي / الدرجة:</span>
                      <span className="font-bold text-slate-800">{viewingDoctor.title || "طبيب استشاري"}</span>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="text-slate-500">تاريخ القيد بالسجل:</span>
                      <span className="font-mono text-slate-700">
                        {viewingDoctor.createdAt ? formatDate(viewingDoctor.createdAt) : "—"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* بطاقة جهة العمل واللجنة الفرعية */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5 font-heading">
                    <Building2 className="w-4 h-4 text-teal-700" />
                    <span>جهة العمل ومحددات النزاهة</span>
                  </span>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">اللجنة الفرعية:</span>
                      <span className="font-bold text-teal-900">{viewingDoctor.subCommittee?.name || "—"}</span>
                    </div>

                    <div className="flex items-center justify-between py-1 border-b border-slate-200/70">
                      <span className="text-slate-500">التخصص الطبي:</span>
                      <span className="font-bold text-slate-800">{viewingDoctor.specialty?.name || "—"}</span>
                    </div>

                    <div className="py-1 border-b border-slate-200/70">
                      <span className="text-slate-500 block mb-1">جهة العمل الأصلية (المستشفى / الجامعة):</span>
                      <span className="font-bold text-slate-900 block bg-white p-1.5 rounded-lg border border-slate-200">
                        {viewingDoctor.employer}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>يُحظر تكليف الطبيب بفحص أي قضية تخص جهة عمله درءاً لتعارض المصالح.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* بطاقة البيانات المالية وصرف المستحقات المصرفية */}
              <div className="p-4 rounded-xl border border-purple-200 bg-purple-50/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5 font-heading">
                    <CreditCard className="w-4 h-4 text-purple-700" />
                    <span>البيانات المالية وصرف المستحقات المصرفية</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => openFinanceModal(viewingDoctor)}
                    className="text-xs font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                  >
                    تعديل البيانات المالية
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-white p-3 rounded-xl border border-purple-100">
                  <div>
                    <span className="text-slate-500 text-[11px] block">طريقة التحويل والصرف:</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {viewingDoctor.financialType === "PAYROLL_CARD"
                        ? "فيزا مرتبات حكومية"
                        : viewingDoctor.financialType === "BANK_ACCOUNT"
                        ? "حساب بنكي شخصي"
                        : viewingDoctor.financialType === "BANK_CARD"
                        ? "كارت بنكي خاص"
                        : "غير محدد"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[11px] block">اسم البنك:</span>
                    <span className="font-bold text-slate-900 mt-0.5 block">
                      {viewingDoctor.bankName || "—"}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[11px] block">
                      {viewingDoctor.financialType === "BANK_ACCOUNT" ? "رقم الحساب / IBAN:" : "رقم البطاقة (16 رقم):"}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="font-mono font-bold text-purple-950 text-xs" dir="ltr">
                        {viewingDoctor.financialType === "BANK_ACCOUNT"
                          ? viewingDoctor.iban || viewingDoctor.accountNumber || "—"
                          : viewingDoctor.cardNumber || "—"}
                      </span>
                      {(viewingDoctor.cardNumber || viewingDoctor.accountNumber || viewingDoctor.iban) && (
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              viewingDoctor.cardNumber || viewingDoctor.iban || viewingDoctor.accountNumber || "",
                              "fin"
                            )
                          }
                          className="p-1 text-slate-400 hover:text-purple-700"
                          title="نسخ الحساب"
                        >
                          {copiedKey === "fin" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* بطاقة القضايا والتقارير الطبية المسندة للطبيب */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5 font-heading">
                    <FileText className="w-4 h-4 text-teal-600" />
                    <span>سجل القضايا والتقارير الطبية المسندة للطبيب</span>
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {viewingDoctor.reviewAssignments?.length || 0} قضية مسندة
                  </span>
                </div>

                {!viewingDoctor.reviewAssignments || viewingDoctor.reviewAssignments.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                    لا توجد قضايا أو تكليفات فحص مسندة لهذا الطبيب حتى الآن.
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>رقم وتاريخ القضية</TableHead>
                          <TableHead>الشاكي</TableHead>
                          <TableHead>المستشفى المشكو في حقها</TableHead>
                          <TableHead>مرحلة القضية</TableHead>
                          <TableHead className="text-center w-20">معاينة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingDoctor.reviewAssignments.map((ra, idx) => (
                          <TableRow key={ra.id}>
                            <TableCell className="font-mono text-xs text-slate-400">{idx + 1}</TableCell>
                            <TableCell>
                              <div className="font-mono font-bold text-slate-900 text-xs">
                                وارد #{ra.case.caseNumber} / {ra.case.caseYear}
                              </div>
                              <div className="text-[10px] text-teal-700 font-mono">
                                {ra.case.incomingDate ? formatDate(ra.case.incomingDate) : "—"}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-slate-900 font-medium">
                              {ra.case.complainantName || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-slate-700">
                              {ra.case.hospitalName || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="teal" size="sm">
                                {ra.case.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <a
                                href={`/dashboard/registration/${ra.case.id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-900 hover:underline"
                              >
                                <span>فتح</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>

            {/* ذيل النافذة */}
            <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                معرف الطبيب: <strong className="font-mono text-slate-700">{viewingDoctor.id}</strong>
              </span>
              <button
                type="button"
                onClick={() => setViewingDoctor(null)}
                className="btn-secondary text-xs px-4 py-1.5 cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── نافذة منبثقة لتعديل أو تحديث البيانات المالية ─── */}
      {editingFinanceDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 font-body">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-heading text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-teal-600" />
                  <span>تحديث البيانات المالية: {editingFinanceDoc.name}</span>
                </h3>
                <p className="text-xs text-slate-500 font-body">تحديث فيزا المرتبات أو الحساب البنكي للصرف المالي المباشر</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingFinanceDoc(null);
                  setError(null);
                }}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSaveFinanceUpdate} className="space-y-4 font-body">
              <div className="form-group">
                <label className="form-label">الرقم القومي (14 رقماً)</label>
                <input
                  type="text"
                  maxLength={14}
                  value={editNationalId}
                  onChange={(e) => setEditNationalId(e.target.value.replace(/\D/g, ""))}
                  placeholder="2XXXXXXXXXXXXX"
                  className="form-input text-xs font-mono"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <label className="form-label">طريقة تحويل وصرف الأتعاب:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label
                    className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer ${
                      editFinancialType === "PAYROLL_CARD"
                        ? "bg-purple-50 border-purple-400 text-purple-950 font-bold"
                        : "border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="editFinancialType"
                      checked={editFinancialType === "PAYROLL_CARD"}
                      onChange={() => setEditFinancialType("PAYROLL_CARD")}
                      className="text-purple-700"
                    />
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>فيزا مرتبات</span>
                  </label>
                  <label
                    className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer ${
                      editFinancialType === "BANK_ACCOUNT"
                        ? "bg-teal-50 border-teal-400 text-teal-950 font-bold"
                        : "border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="editFinancialType"
                      checked={editFinancialType === "BANK_ACCOUNT"}
                      onChange={() => setEditFinancialType("BANK_ACCOUNT")}
                      className="text-teal-600"
                    />
                    <Building className="w-3.5 h-3.5" />
                    <span>حساب بنكي</span>
                  </label>
                  <label
                    className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer ${
                      editFinancialType === "BANK_CARD"
                        ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold"
                        : "border-slate-200"
                    }`}
                  >
                    <input
                      type="radio"
                      name="editFinancialType"
                      checked={editFinancialType === "BANK_CARD"}
                      onChange={() => setEditFinancialType("BANK_CARD")}
                      className="text-emerald-700"
                    />
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>كارت بنكي خاص</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">اسم البنك</label>
                <input
                  type="text"
                  value={editBankName}
                  onChange={(e) => setEditBankName(e.target.value)}
                  placeholder="مثال: البنك الأهلي المصري"
                  className="form-input text-xs"
                />
              </div>

              {editFinancialType === "PAYROLL_CARD" ? (
                <div className="form-group">
                  <label className="form-label">رقم كارت فيزا المرتبات (16 رقماً)</label>
                  <input
                    type="text"
                    value={editCardNumber}
                    onChange={(e) => setEditCardNumber(e.target.value)}
                    placeholder="XXXX XXXX XXXX XXXX"
                    className="form-input text-xs font-mono"
                    dir="ltr"
                  />
                </div>
              ) : editFinancialType === "BANK_ACCOUNT" ? (
                <>
                  <div className="form-group">
                    <label className="form-label">رقم الحساب البنكي</label>
                    <input
                      type="text"
                      value={editAccountNumber}
                      onChange={(e) => setEditAccountNumber(e.target.value)}
                      placeholder="رقم الحساب..."
                      className="form-input text-xs font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">رقم الآيبان (IBAN)</label>
                    <input
                      type="text"
                      value={editIban}
                      onChange={(e) => setEditIban(e.target.value)}
                      placeholder="EGXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      className="form-input text-xs font-mono"
                      dir="ltr"
                    />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label">رقم كارت الفيزا</label>
                  <input
                    type="text"
                    value={editCardNumber}
                    onChange={(e) => setEditCardNumber(e.target.value)}
                    placeholder="XXXX XXXX XXXX XXXX"
                    className="form-input text-xs font-mono"
                    dir="ltr"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setEditingFinanceDoc(null);
                    setError(null);
                  }}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary text-xs px-5 py-2 font-bold"
                >
                  {isPending ? "جارٍ الحفظ..." : "تأكيد وحفظ التحديث المالي"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
