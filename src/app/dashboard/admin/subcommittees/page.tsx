"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import {
  Building2,
  Stethoscope,
  Plus,
  ArrowRight,
  Search,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Trash2,
  AlertTriangle,
  X,
  RefreshCw,
  Users,
  Scale,
  ShieldAlert,
} from "lucide-react";

interface SubCommittee {
  id: string;
  name: string;
  code: string;
  scope?: string | null;
  active: boolean;
  deactivationMode?: string | null;
  deactivationReason?: string | null;
  _count?: { cases: number; members: number; doctors: number };
}

interface Specialty {
  id: string;
  name: string;
  code?: string | null;
  active: boolean;
}

export default function AdminSubCommitteesPage() {
  const [subCommittees, setSubCommittees] = useState<SubCommittee[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [activeTab, setActiveTab] = useState<"COMMITTEES" | "SPECIALTIES">("COMMITTEES");
  const [loading, setLoading] = useState(true);

  // حقول إضافة لجنة جديدة
  const [scName, setScName] = useState("");
  const [scCode, setScCode] = useState("");
  const [scScope, setScScope] = useState("");
  const [showAddSc, setShowAddSc] = useState(false);

  // حقول إضافة تخصص جديد
  const [specName, setSpecName] = useState("");
  const [specCode, setSpecCode] = useState("");
  const [showAddSpec, setShowAddSpec] = useState(false);

  // البحث والفلترة
  const [scSearch, setScSearch] = useState("");
  const [scStatusFilter, setScStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  const [specSearch, setSpecSearch] = useState("");
  const [specStatusFilter, setSpecStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // رسائل وتأكيدات
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // حالة مودال التأكيد
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "TOGGLE_SC" | "DELETE_SC" | "TOGGLE_SPEC" | "DELETE_SPEC";
    targetId: string;
    targetName: string;
    currentActive?: boolean;
    currentMode?: "READ_ONLY" | "LOCK_OUT" | null;
  }>({
    isOpen: false,
    type: "TOGGLE_SC",
    targetId: "",
    targetName: "",
  });

  const [deactivationMode, setDeactivationMode] = useState<"READ_ONLY" | "LOCK_OUT">("READ_ONLY");
  const [deactivationReason, setDeactivationReason] = useState("");

  async function loadData() {
    setLoading(true);
    try {
      const [scRes, specRes] = await Promise.all([
        fetch("/api/subcommittees?all=true"),
        fetch("/api/specialties?all=true"),
      ]);
      if (scRes.ok) setSubCommittees(await scRes.json());
      if (specRes.ok) setSpecialties(await specRes.json());
    } catch (e) {
      console.error(e);
      setError("حدث خطأ أثناء تحميل البيانات من الخادم");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ─── إضافة لجنة فرعية جديدة ───
  async function handleAddSubCommittee(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/subcommittees", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: scName, code: scCode, scope: scScope }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "تعذّر إضافة اللجنة الفرعية");
          return;
        }

        setScName("");
        setScCode("");
        setScScope("");
        setShowAddSc(false);
        setSuccess(`تمت إضافة اللجنة الفرعية (${data.name}) بنجاح`);
        await loadData();
      } catch (err: any) {
        setError(err.message || "حدث خطأ غير متوقع");
      }
    });
  }

  // ─── إضافة تخصص طبي جديد ───
  async function handleAddSpecialty(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/specialties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: specName, code: specCode }),
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "تعذّر إضافة التخصص الطبي");
          return;
        }

        setSpecName("");
        setSpecCode("");
        setShowAddSpec(false);
        setSuccess(`تمت إضافة التخصص الطبي (${data.name}) بنجاح`);
        await loadData();
      } catch (err: any) {
        setError(err.message || "حدث خطأ غير متوقع");
      }
    });
  }

  // ─── تنفيذ إجراءات المودال (تعطيل/تفعيل/حذف) ───
  async function handleExecuteConfirm() {
    const { type, targetId, targetName, currentActive } = confirmModal;
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        if (type === "TOGGLE_SC") {
          const bodyPayload: any = { active: !currentActive };
          if (currentActive) {
            bodyPayload.deactivationMode = deactivationMode;
            bodyPayload.deactivationReason = deactivationReason;
          }

          const res = await fetch(`/api/subcommittees/${targetId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(bodyPayload),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "تعذر تغيير حالة اللجنة");
          setSuccess(
            !currentActive
              ? `تم تفعيل اللجنة الفرعية (${targetName}) بنجاح وإعادتها لقوائم التوجيه والإحالة`
              : `تم تعطيل وإيقاف اللجنة الفرعية (${targetName}) بنجاح بنظام (${
                  deactivationMode === "READ_ONLY" ? "الاطلاع والأرشفة فقط" : "القفل التام للحسابات"
                })`
          );
        } else if (type === "DELETE_SC") {
          const res = await fetch(`/api/subcommittees/${targetId}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "تعذر حذف اللجنة الفرعية");
          setSuccess(`تم حذف اللجنة الفرعية (${targetName}) نهائياً`);
        } else if (type === "TOGGLE_SPEC") {
          const res = await fetch(`/api/specialties/${targetId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ active: !currentActive }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "تعذر تغيير حالة التخصص");
          setSuccess(
            !currentActive
              ? `تم تفعيل التخصص الطبي (${targetName}) بنجاح`
              : `تم تعطيل وتجميد التخصص الطبي (${targetName}) بنجاح`
          );
        } else if (type === "DELETE_SPEC") {
          const res = await fetch(`/api/specialties/${targetId}`, {
            method: "DELETE",
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "تعذر حذف التخصص الطبي");
          setSuccess(`تم حذف التخصص الطبي (${targetName}) نهائياً`);
        }

        await loadData();
      } catch (err: any) {
        setError(err.message || "حدث خطأ أثناء تنفيذ الإجراء");
      }
    });
  }

  // ─── تصفية اللجان ───
  const filteredSubCommittees = useMemo(() => {
    return subCommittees.filter((sc) => {
      if (scStatusFilter === "ACTIVE" && !sc.active) return false;
      if (scStatusFilter === "INACTIVE" && sc.active) return false;

      if (scSearch.trim()) {
        const q = scSearch.toLowerCase().trim();
        return (
          sc.name.toLowerCase().includes(q) ||
          sc.code.toLowerCase().includes(q) ||
          (sc.scope && sc.scope.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [subCommittees, scStatusFilter, scSearch]);

  // ─── تصفية التخصصات ───
  const filteredSpecialties = useMemo(() => {
    return specialties.filter((spec) => {
      if (specStatusFilter === "ACTIVE" && !spec.active) return false;
      if (specStatusFilter === "INACTIVE" && spec.active) return false;

      if (specSearch.trim()) {
        const q = specSearch.toLowerCase().trim();
        return (
          spec.name.toLowerCase().includes(q) ||
          (spec.code && spec.code.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [specialties, specStatusFilter, specSearch]);

  const activeCommitteesCount = subCommittees.filter((c) => c.active).length;
  const inactiveCommitteesCount = subCommittees.length - activeCommitteesCount;

  const activeSpecialtiesCount = specialties.filter((s) => s.active).length;
  const inactiveSpecialtiesCount = specialties.length - activeSpecialtiesCount;

  return (
    <div className="space-y-6">
      {/* ─── رأس الصفحة الموحد ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "إدارة المنظومة", href: "/dashboard/admin" },
          { label: "إدارة اللجان والتخصصات" },
        ]}
        title="إدارة اللجان الفرعية والتخصصات الطبية"
        description="التحكم الكامل في تشكيل اللجان الفرعية والتخصصات المعيارية: إضافة، تفعيل، تعطيل، وحذف اللجان والتخصصات."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setError(null);
                setSuccess(null);
                loadData();
              }}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs font-body"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>تحديث</span>
            </button>
            <Link
              href="/dashboard/admin"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-2xs font-body"
            >
              <ArrowRight className="w-4 h-4" />
              <span>لوحة الإدارة</span>
            </Link>
          </div>
        }
      />

      {/* ─── رسائل النجاح والخطأ ─── */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-body flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold font-heading block">تنبيه من المنظومة:</span>
              <p className="leading-relaxed">{error}</p>
            </div>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-500 hover:text-rose-700 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-body flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{success}</span>
          </div>
          <button
            onClick={() => setSuccess(null)}
            className="text-emerald-500 hover:text-emerald-700 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── التبويبات الرئيسية ─── */}
      <div className="flex border-b border-slate-200 gap-2 font-heading">
        <button
          type="button"
          onClick={() => {
            setActiveTab("COMMITTEES");
            setError(null);
            setSuccess(null);
          }}
          className={`px-4 py-2.5 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "COMMITTEES"
              ? "border-teal-600 text-teal-700 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>الجهات واللجان الفرعية المعتمدة</span>
          <Badge variant={activeTab === "COMMITTEES" ? "teal" : "slate"} size="sm">
            {subCommittees.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab("SPECIALTIES");
            setError(null);
            setSuccess(null);
          }}
          className={`px-4 py-2.5 font-semibold text-xs border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "SPECIALTIES"
              ? "border-teal-600 text-teal-700 bg-white"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Stethoscope className="w-4 h-4" />
          <span>التخصصات الطبية المعيارية</span>
          <Badge variant={activeTab === "SPECIALTIES" ? "teal" : "slate"} size="sm">
            {specialties.length}
          </Badge>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          القسم الأول: تبويب الجهات واللجان الفرعية
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === "COMMITTEES" && (
        <div className="space-y-6">
          {/* بطاقات الإحصاءات السريعة للجان */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="إجمالي اللجان المسجلة"
              value={subCommittees.length}
              icon={<Building2 className="w-6 h-6" />}
              variant="sky"
            />
            <StatCard
              title="لجان نشطة ومتاحة للإحالة"
              value={activeCommitteesCount}
              icon={<CheckCircle2 className="w-6 h-6" />}
              variant="emerald"
            />
            <StatCard
              title="لجان معطلة / موقوفة"
              value={inactiveCommitteesCount}
              icon={<PauseCircle className="w-6 h-6" />}
              variant={inactiveCommitteesCount > 0 ? "rose" : "slate"}
            />
            <StatCard
              title="إجمالي القضايا الموزعة"
              value={subCommittees.reduce((sum, sc) => sum + (sc._count?.cases || 0), 0)}
              icon={<Scale className="w-6 h-6" />}
              variant="teal"
            />
          </div>

          {/* شريط الإجراءات والبحث والفلترة */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            {/* أزرار الحالة */}
            <div className="flex flex-wrap items-center gap-1.5 font-body">
              <button
                type="button"
                onClick={() => setScStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  scStatusFilter === "ALL"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                الكل ({subCommittees.length})
              </button>
              <button
                type="button"
                onClick={() => setScStatusFilter("ACTIVE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                  scStatusFilter === "ACTIVE"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>النشطة ({activeCommitteesCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setScStatusFilter("INACTIVE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                  scStatusFilter === "INACTIVE"
                    ? "bg-slate-800 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>المعطلة ({inactiveCommitteesCount})</span>
              </button>
            </div>

            {/* البحث وزر إضافة لجنة */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={scSearch}
                  onChange={(e) => setScSearch(e.target.value)}
                  placeholder="بحث باسم اللجنة أو الكود أو النطاق..."
                  className="h-10 pr-9 pl-4 text-xs rounded-lg border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-hidden focus:border-teal-600 w-full sm:w-64 font-body"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowAddSc(!showAddSc)}
                className="h-10 inline-flex items-center justify-center gap-1.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold font-body transition-colors shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة لجنة فرعية جديدة</span>
              </button>
            </div>
          </div>

          {/* نموذج إضافة لجنة فرعية جديدة (قابل للفتح والإغلاق) */}
          {showAddSc && (
            <Card className="border-teal-200 bg-teal-50/20 p-5 animate-in fade-in space-y-4">
              <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                <h3 className="text-sm font-bold font-heading text-teal-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-teal-600" />
                  <span>إضافة جهة أو لجنة فرعية جديدة للمنظومة</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddSc(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubCommittee} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="form-group">
                  <label className="form-label form-label-required text-xs">اسم الجهة أو الكلية</label>
                  <input
                    type="text"
                    required
                    value={scName}
                    onChange={(e) => setScName(e.target.value)}
                    placeholder="مثال: كلية طب جامعة بني سويف"
                    className="form-input text-xs h-10"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label form-label-required text-xs">كود اللجنة المختصر</label>
                  <input
                    type="text"
                    required
                    value={scCode}
                    onChange={(e) => setScCode(e.target.value)}
                    placeholder="مثال: SC-17"
                    className="form-input text-xs h-10 font-mono"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label text-xs">النطاق الجغرافي / المؤسسي</label>
                  <input
                    type="text"
                    value={scScope}
                    onChange={(e) => setScScope(e.target.value)}
                    placeholder="مثال: إقليم شمال الصعيد"
                    className="form-input text-xs h-10"
                  />
                </div>

                <div className="md:col-span-3 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddSc(false)}
                    className="h-10 text-xs"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isPending}
                    className="h-10 text-xs px-6"
                  >
                    حفظ واعتماد اللجنة
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* جدول اللجان الفرعية الشامل */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">م</TableHead>
                  <TableHead className="w-20">الكود</TableHead>
                  <TableHead>اسم الجهة / اللجنة الفرعية</TableHead>
                  <TableHead>النطاق الجغرافي</TableHead>
                  <TableHead className="text-center">القضايا المسندة</TableHead>
                  <TableHead className="text-center">أطباء واستشاريين</TableHead>
                  <TableHead className="text-center">الأعضاء والمقررين</TableHead>
                  <TableHead className="text-center">الحالة</TableHead>
                  <TableHead className="text-center w-48">إجراءات الإدارة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubCommittees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="p-12 text-center text-xs text-slate-500 font-body">
                      لا توجد لجان مطابقة لمعايير البحث الحالية
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSubCommittees.map((sc, idx) => (
                    <TableRow key={sc.id} className={!sc.active ? "bg-slate-50/70" : ""}>
                      <TableCell className="font-mono text-slate-400 text-xs">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-mono font-bold text-teal-800 text-xs">
                        {sc.code}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900 text-xs font-heading">
                        {sc.name}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600 font-body">
                        {sc.scope || "—"}
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold text-xs text-slate-800">
                        {sc._count?.cases || 0}
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold text-xs text-slate-800">
                        {sc._count?.doctors || 0}
                      </TableCell>
                      <TableCell className="text-center font-mono font-semibold text-xs text-slate-800">
                        {sc._count?.members || 0}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            sc.active
                              ? "emerald"
                              : sc.deactivationMode === "LOCK_OUT"
                              ? "rose"
                              : "slate"
                          }
                        >
                          {sc.active
                            ? "نشطة ومتاحة"
                            : sc.deactivationMode === "LOCK_OUT"
                            ? "معطلة (قفل تام)"
                            : "معطلة (اطلاع فقط)"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {/* زر تعطيل أو تفعيل */}
                          {sc.active ? (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmModal({
                                  isOpen: true,
                                  type: "TOGGLE_SC",
                                  targetId: sc.id,
                                  targetName: sc.name,
                                  currentActive: true,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold font-body border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
                              title="تعطيل اللجنة لمنع إسناد قضايا جديدة لها"
                            >
                              <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>تعطيل</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmModal({
                                  isOpen: true,
                                  type: "TOGGLE_SC",
                                  targetId: sc.id,
                                  targetName: sc.name,
                                  currentActive: false,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold font-body border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
                              title="إعادة تفعيل اللجنة"
                            >
                              <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>تفعيل</span>
                            </button>
                          )}

                          {/* زر الحذف */}
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmModal({
                                isOpen: true,
                                type: "DELETE_SC",
                                targetId: sc.id,
                                targetName: sc.name,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold font-body border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                            title="حذف اللجنة نهائياً (في حال عدم وجود قضايا أو أطباء مرتبطين بها)"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          القسم الثاني: تبويب التخصصات الطبية
         ══════════════════════════════════════════════════════════════ */}
      {activeTab === "SPECIALTIES" && (
        <div className="space-y-6">
          {/* بطاقات الإحصاءات السريعة للتخصصات */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="إجمالي التخصصات المسجلة"
              value={specialties.length}
              icon={<Stethoscope className="w-6 h-6" />}
              variant="sky"
            />
            <StatCard
              title="تخصصات نشطة ومتاحة للاختيار"
              value={activeSpecialtiesCount}
              icon={<CheckCircle2 className="w-6 h-6" />}
              variant="emerald"
            />
            <StatCard
              title="تخصصات معطلة / مجمدة"
              value={inactiveSpecialtiesCount}
              icon={<PauseCircle className="w-6 h-6" />}
              variant={inactiveSpecialtiesCount > 0 ? "rose" : "slate"}
            />
          </div>

          {/* شريط الإجراءات والبحث والفلترة للتخصصات */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            {/* أزرار الحالة */}
            <div className="flex flex-wrap items-center gap-1.5 font-body">
              <button
                type="button"
                onClick={() => setSpecStatusFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  specStatusFilter === "ALL"
                    ? "bg-teal-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                الكل ({specialties.length})
              </button>
              <button
                type="button"
                onClick={() => setSpecStatusFilter("ACTIVE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                  specStatusFilter === "ACTIVE"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>النشطة ({activeSpecialtiesCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setSpecStatusFilter("INACTIVE")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                  specStatusFilter === "INACTIVE"
                    ? "bg-slate-800 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>المعطلة ({inactiveSpecialtiesCount})</span>
              </button>
            </div>

            {/* البحث وزر إضافة تخصص */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={specSearch}
                  onChange={(e) => setSpecSearch(e.target.value)}
                  placeholder="بحث باسم التخصص الطبي أو الكود..."
                  className="h-10 pr-9 pl-4 text-xs rounded-lg border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-hidden focus:border-teal-600 w-full sm:w-64 font-body"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowAddSpec(!showAddSpec)}
                className="h-10 inline-flex items-center justify-center gap-1.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold font-body transition-colors shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة تخصص طبي جديد</span>
              </button>
            </div>
          </div>

          {/* نموذج إضافة تخصص جديد */}
          {showAddSpec && (
            <Card className="border-teal-200 bg-teal-50/20 p-5 animate-in fade-in space-y-4">
              <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                <h3 className="text-sm font-bold font-heading text-teal-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-teal-600" />
                  <span>إضافة تخصص طبي معتمد جديد</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAddSpec(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSpecialty} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label form-label-required text-xs">اسم التخصص الطبي</label>
                  <input
                    type="text"
                    required
                    value={specName}
                    onChange={(e) => setSpecName(e.target.value)}
                    placeholder="مثال: جراحة الأوعية الدموية والقسطرة"
                    className="form-input text-xs h-10"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label text-xs">كود التخصص (اختياري)</label>
                  <input
                    type="text"
                    value={specCode}
                    onChange={(e) => setSpecCode(e.target.value)}
                    placeholder="مثال: SPEC-24"
                    className="form-input text-xs h-10 font-mono"
                  />
                </div>

                <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowAddSpec(false)}
                    className="h-10 text-xs"
                  >
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    loading={isPending}
                    className="h-10 text-xs px-6"
                  >
                    حفظ التخصص الطبي
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* جدول التخصصات الطبية التفاعلي */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">م</TableHead>
                  <TableHead>اسم التخصص الطبي</TableHead>
                  <TableHead className="w-32">الكود</TableHead>
                  <TableHead className="text-center w-32">الحالة</TableHead>
                  <TableHead className="text-center w-48">إجراءات الإدارة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSpecialties.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="p-12 text-center text-xs text-slate-500 font-body">
                      لا توجد تخصصات مطابقة لمعايير البحث الحالية
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredSpecialties.map((spec, idx) => (
                    <TableRow key={spec.id} className={!spec.active ? "bg-slate-50/70" : ""}>
                      <TableCell className="font-mono text-slate-400 text-xs">
                        {idx + 1}
                      </TableCell>
                      <TableCell className="font-semibold text-slate-900 text-xs font-heading">
                        {spec.name}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {spec.code || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={spec.active ? "emerald" : "slate"}>
                          {spec.active ? "نشط ومتاح" : "معطل / مجمد"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          {/* زر تعطيل أو تفعيل */}
                          {spec.active ? (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmModal({
                                  isOpen: true,
                                  type: "TOGGLE_SPEC",
                                  targetId: spec.id,
                                  targetName: spec.name,
                                  currentActive: true,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold font-body border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
                              title="تعطيل التخصص لمنع اختياره مستقبلاً"
                            >
                              <PauseCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>تعطيل</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                setConfirmModal({
                                  isOpen: true,
                                  type: "TOGGLE_SPEC",
                                  targetId: spec.id,
                                  targetName: spec.name,
                                  currentActive: false,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold font-body border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-colors"
                              title="إعادة تفعيل التخصص"
                            >
                              <PlayCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>تفعيل</span>
                            </button>
                          )}

                          {/* زر الحذف */}
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmModal({
                                isOpen: true,
                                type: "DELETE_SPEC",
                                targetId: spec.id,
                                targetName: spec.name,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold font-body border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors"
                            title="حذف التخصص نهائياً (في حال عدم وجود قضايا أو أطباء مرتبطين به)"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════
          نافذة تأكيد الإجراءات (مودال التفعيل/التعطيل/الحذف)
         ══════════════════════════════════════════════════════════════ */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 font-body animate-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmModal.type.includes("DELETE")
                    ? "bg-rose-50 text-rose-600"
                    : confirmModal.currentActive
                    ? "bg-amber-50 text-amber-600"
                    : "bg-emerald-50 text-emerald-600"
                }`}
              >
                {confirmModal.type.includes("DELETE") ? (
                  <Trash2 className="w-5 h-5" />
                ) : confirmModal.currentActive ? (
                  <PauseCircle className="w-5 h-5" />
                ) : (
                  <PlayCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold font-heading text-slate-900">
                  {confirmModal.type === "DELETE_SC" && "تأكيد حذف اللجنة الفرعية"}
                  {confirmModal.type === "DELETE_SPEC" && "تأكيد حذف التخصص الطبي"}
                  {confirmModal.type === "TOGGLE_SC" &&
                    (confirmModal.currentActive ? "تأكيد تعطيل اللجنة الفرعية" : "تأكيد تفعيل اللجنة الفرعية")}
                  {confirmModal.type === "TOGGLE_SPEC" &&
                    (confirmModal.currentActive ? "تأكيد تعطيل التخصص الطبي" : "تأكيد تفعيل التخصص الطبي")}
                </h3>
                <p className="text-xs text-slate-500 font-body">إجراء إداري مقيد بصلاحيات مدير النظام</p>
              </div>
            </div>

            <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
              {confirmModal.type === "DELETE_SC" && (
                <span>
                  هل أنت متأكد من رغبتك في حذف اللجنة الفرعية{" "}
                  <strong className="text-rose-700">({confirmModal.targetName})</strong> نهائياً؟
                  <br />
                  <span className="text-slate-500 text-[11px] block mt-1">
                    * ملاحظة: سيتم التحقق تلقائياً من عدم وجود أي قضايا أو أطباء مرتبطين بها قبل إتمام الحذف.
                  </span>
                </span>
              )}

              {confirmModal.type === "DELETE_SPEC" && (
                <span>
                  هل أنت متأكد من رغبتك في حذف التخصص الطبي{" "}
                  <strong className="text-rose-700">({confirmModal.targetName})</strong> نهائياً؟
                  <br />
                  <span className="text-slate-500 text-[11px] block mt-1">
                    * ملاحظة: سيتم التحقق تلقائياً من عدم وجود قضايا أو أطباء مسجلين بهذا التخصص.
                  </span>
                </span>
              )}

              {confirmModal.type === "TOGGLE_SC" && (
                <div>
                  {confirmModal.currentActive ? (
                    <div className="space-y-3">
                      <div className="text-slate-800">
                        أنت على وشك إيقاف نشاط اللجنة الفرعية{" "}
                        <strong className="text-slate-900 font-bold font-heading">
                          ({confirmModal.targetName})
                        </strong>
                        . يرجى تحديد طبيعة ونظام الإيقاف المطلوب:
                      </div>

                      {/* خيار 1: الاطلاع والأرشفة فقط */}
                      <div
                        onClick={() => setDeactivationMode("READ_ONLY")}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          deactivationMode === "READ_ONLY"
                            ? "border-teal-600 bg-teal-50/70 ring-1 ring-teal-600"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="deactivation_mode"
                          checked={deactivationMode === "READ_ONLY"}
                          onChange={() => setDeactivationMode("READ_ONLY")}
                          className="mt-0.5 text-teal-600 focus:ring-teal-600 cursor-pointer"
                        />
                        <div className="space-y-0.5 text-xs">
                          <span className="font-bold text-slate-900 font-heading block">
                            ١. وضع القراءة والاطلاع فقط (الموصى به)
                          </span>
                          <p className="text-[11px] text-slate-600 leading-relaxed font-body">
                            يستطيع مقرر وأعضاء اللجنة تسجيل الدخول واستعراض القضايا والتقارير السابقة كأرشيف فقط، مع قفل صلاحيات التعديل، وإظهار بوب-اب التوقف المؤقت وبنر التحذير الرسمي.
                          </p>
                        </div>
                      </div>

                      {/* خيار 2: القفل التام للحسابات */}
                      <div
                        onClick={() => setDeactivationMode("LOCK_OUT")}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                          deactivationMode === "LOCK_OUT"
                            ? "border-rose-600 bg-rose-50/70 ring-1 ring-rose-600"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="deactivation_mode"
                          checked={deactivationMode === "LOCK_OUT"}
                          onChange={() => setDeactivationMode("LOCK_OUT")}
                          className="mt-0.5 text-rose-600 focus:ring-rose-600 cursor-pointer"
                        />
                        <div className="space-y-0.5 text-xs">
                          <span className="font-bold text-rose-900 font-heading block">
                            ٢. القفل التام للحسابات ومنع تسجيل الدخول
                          </span>
                          <p className="text-[11px] text-slate-600 leading-relaxed font-body">
                            حظر تسجيل دخول كافة مستخدمي هذه اللجنة نهائياً، مع ظهور رسالة إيقاف نشاط اللجنة والتوجيه بالتواصل مع الدعم الفني ومدير النظام عند محاولة الدخول.
                          </p>
                        </div>
                      </div>

                      {/* سبب الإيقاف */}
                      <div className="space-y-1 pt-1">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          سبب أو توجيهات إيقاف النشاط (اختياري):
                        </label>
                        <input
                          type="text"
                          value={deactivationReason}
                          onChange={(e) => setDeactivationReason(e.target.value)}
                          placeholder="مثال: لحين الانتهاء من التشكيل الجديد للجنة"
                          className="w-full h-9 px-3 rounded-lg border border-slate-300 text-xs bg-white focus:outline-hidden focus:border-teal-600 font-body"
                        />
                      </div>
                    </div>
                  ) : (
                    <span>
                      هل تريد إعادة تفعيل اللجنة الفرعية{" "}
                      <strong className="text-teal-800 font-bold">({confirmModal.targetName})</strong>؟ ستصبح متاحة مجدداً للإحالة وتوزيع القضايا وسيتم إلغاء أي قيود دخول مفروضة على مستخدميها.
                    </span>
                  )}
                </div>
              )}

              {confirmModal.type === "TOGGLE_SPEC" && (
                <span>
                  {confirmModal.currentActive ? (
                    <>
                      هل تريد تعطيل التخصص الطبي{" "}
                      <strong className="text-slate-900">({confirmModal.targetName})</strong>؟ لن يظهر في خيارات إضافة
                      التخصصات الجديدة بالقضايا أو للأطباء.
                    </>
                  ) : (
                    <>
                      هل تريد إعادة تفعيل التخصص الطبي{" "}
                      <strong className="text-teal-800">({confirmModal.targetName})</strong>؟
                    </>
                  )}
                </span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="h-10 text-xs"
              >
                إلغاء
              </Button>
              <Button
                type="button"
                variant={confirmModal.type.includes("DELETE") ? "danger" : "primary"}
                loading={isPending}
                onClick={handleExecuteConfirm}
                className="h-10 text-xs px-5"
              >
                {confirmModal.type.includes("DELETE")
                  ? "تأكيد الحذف النهائي"
                  : confirmModal.currentActive
                  ? "تأكيد التعطيل"
                  : "تأكيد التفعيل"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
