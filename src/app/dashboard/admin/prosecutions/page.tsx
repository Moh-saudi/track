"use client";

import { useState, useEffect, useTransition } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader } from "@/components/ui/PageHeader";
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
import {
  Building2,
  CheckCircle2,
  PauseCircle,
  Search,
  Plus,
  Trash2,
  Edit2,
  MapPin,
  X,
  Scale,
  GitFork,
} from "lucide-react";
import { EGYPT_GOVERNORATES } from "@/lib/constants/governorates";

interface ProsecutionItem {
  id: string;
  name: string;
  code?: string | null;
  governorate?: string | null;
  type?: string | null;
  parentId?: string | null;
  parent?: { id: string; name: string } | null;
  active: boolean;
  createdAt: string;
}

export default function ProsecutionsManagementPage() {
  const [prosecutions, setProsecutions] = useState<ProsecutionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);

  // حقول إضافة جهة جديدة
  const [name, setName] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [type, setType] = useState<"PLENARY" | "DISTRICT">("PLENARY");
  const [parentId, setParentId] = useState("");

  // حالة التعديل
  const [editingItem, setEditingItem] = useState<ProsecutionItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editGov, setEditGov] = useState("");
  const [editType, setEditType] = useState<"PLENARY" | "DISTRICT">("PLENARY");
  const [editParentId, setEditParentId] = useState("");

  // بحث وفلترة
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGovFilter, setSelectedGovFilter] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("");

  async function loadData() {
    try {
      const res = await fetch("/api/prosecutions?all=true");
      if (!res.ok) throw new Error("تعذر تحميل قائمة النيابات");
      const data = await res.json();
      setProsecutions(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const plenaryProsecutions = prosecutions.filter(
    (p) => !p.type || p.type === "PLENARY" || !p.parentId
  );

  async function handleAddProsecution(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/prosecutions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            governorate: governorate.trim() || null,
            type,
            parentId: type === "DISTRICT" && parentId ? parentId : null,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "تعذر إضافة النيابة");

        setSuccessMsg(`تمت إضافة النيابة (${data.name}) بنجاح`);
        setName("");
        setGovernorate("");
        setType("PLENARY");
        setParentId("");
        setShowAddForm(false);
        await loadData();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  function startEdit(item: ProsecutionItem) {
    setEditingItem(item);
    setEditName(item.name);
    setEditGov(item.governorate || "");
    setEditType(item.type === "DISTRICT" ? "DISTRICT" : "PLENARY");
    setEditParentId(item.parentId || "");
    setError(null);
    setSuccessMsg(null);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem || !editName.trim()) return;

    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/prosecutions/${editingItem.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName.trim(),
            governorate: editGov.trim() || null,
            type: editType,
            parentId: editType === "DISTRICT" && editParentId ? editParentId : null,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "تعذر تعديل النيابة");

        setSuccessMsg(`تم تعديل بيانات النيابة (${data.name}) بنجاح`);
        setEditingItem(null);
        await loadData();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  async function handleToggleStatus(item: ProsecutionItem) {
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/prosecutions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "تعذر تحديث حالة النيابة");
      }

      setSuccessMsg(`تم تحديث حالة النيابة (${item.name}) بنجاح`);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(item: ProsecutionItem) {
    if (!confirm(`هل أنت متأكد من حذف النيابة (${item.name})؟`)) return;

    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/prosecutions/${item.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر حذف النيابة");

      setSuccessMsg("تم حذف النيابة بنجاح");
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const filtered = prosecutions.filter((p) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(q) ||
      (p.governorate && p.governorate.toLowerCase().includes(q)) ||
      (p.parent && p.parent.name.toLowerCase().includes(q));
    const matchesGov = !selectedGovFilter || p.governorate === selectedGovFilter;
    const matchesType =
      !selectedTypeFilter ||
      (selectedTypeFilter === "PLENARY" && (!p.type || p.type === "PLENARY")) ||
      (selectedTypeFilter === "DISTRICT" && p.type === "DISTRICT");
    return matchesSearch && matchesGov && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* ─── رأس الصفحة الموحد ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "إدارة المنظومة", href: "/dashboard/admin" },
          { label: "سجل جهات النيابة العامة" },
        ]}
        title="سجل وإدارة جهات النيابة العامة (الكلية والجزئية)"
        description="إدارة وتصنيف النيابات العامة إلى نيابات كلية ونيابات جزئية وربط التبعية القضائية والمحافظات."
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={() => {
              setShowAddForm(!showAddForm);
              setEditingItem(null);
            }}
            icon={<Plus className="w-4 h-4" />}
          >
            {showAddForm ? "إلغاء الإضافة" : "إضافة نيابة عامة جديدة"}
          </Button>
        }
      />

      {/* التنبيهات */}
      {error && (
        <div className="alert-error text-xs">
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert-success text-xs">
          <span>{successMsg}</span>
        </div>
      )}

      {/* نموذج تعديل نيابة قائمة */}
      {editingItem && (
        <Card className="space-y-4 bg-teal-50/50 border-teal-200 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-teal-200/70 pb-2">
            <div>
              <h2 className="text-sm font-bold text-teal-900 font-heading">
                تعديل بيانات النيابة: {editingItem.name}
              </h2>
              <p className="text-xs text-teal-700 font-body">
                تعديل الاسم، النوع (كلية / جزئية)، والنيابة الكلية التابعة لها والمحافظة
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingItem(null)}
              className="text-teal-700 hover:text-teal-900 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="form-group">
                <label className="form-label form-label-required">اسم النيابة العامة</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="اسم النيابة..."
                  className="form-input text-xs"
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">نوع النيابة</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as any)}
                  className="form-select text-xs font-bold"
                >
                  <option value="PLENARY">نيابة كلية</option>
                  <option value="DISTRICT">نيابة جزئية</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">المحافظة التابعة لها</label>
                <select
                  value={editGov}
                  onChange={(e) => setEditGov(e.target.value)}
                  className="form-select text-xs"
                >
                  <option value="">-- بدون تحديد محافظة --</option>
                  {EGYPT_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {editType === "DISTRICT" && (
              <div className="p-3 bg-white border border-teal-300 rounded-xl space-y-1.5">
                <label className="form-label font-bold text-teal-950">
                  النيابة الكلية المشرفة (التبعية القضائية)
                </label>
                <select
                  value={editParentId}
                  onChange={(e) => setEditParentId(e.target.value)}
                  className="form-select text-xs font-medium"
                >
                  <option value="">-- حدد النيابة الكلية التابعة لها --</option>
                  {plenaryProsecutions
                    .filter((p) => p.id !== editingItem.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.governorate ? `(${p.governorate})` : ""}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-teal-200">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setEditingItem(null)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isPending}
              >
                حفظ التعديلات
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* نموذج الإضافة */}
      {showAddForm && (
        <Card className="space-y-4 bg-slate-50/80 animate-in fade-in zoom-in-95">
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-sm font-bold text-slate-900 font-heading">
              إضافة نيابة عامة معتمدة جديدة
            </h2>
            <p className="text-xs text-slate-500 font-body">
              تظهر هذه النيابة تلقائياً في قائمة الاختيار لموظفي التسجيل عند قيد سجل جديد
            </p>
          </div>

          <form onSubmit={handleAddProsecution} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="form-group">
                <label className="form-label form-label-required">اسم النيابة العامة</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: نيابة العجوزة الجزئية"
                  className="form-input text-xs"
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">نوع النيابة</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="form-select text-xs font-bold"
                >
                  <option value="PLENARY">نيابة كلية</option>
                  <option value="DISTRICT">نيابة جزئية</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">المحافظة التابعة لها</label>
                <select
                  value={governorate}
                  onChange={(e) => setGovernorate(e.target.value)}
                  className="form-select text-xs"
                >
                  <option value="">-- اختر المحافظة (اختياري) --</option>
                  {EGYPT_GOVERNORATES.map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {type === "DISTRICT" && (
              <div className="p-3 bg-white border border-teal-300 rounded-xl space-y-1.5">
                <label className="form-label font-bold text-teal-950">
                  النيابة الكلية المشرفة (التبعية القضائية)
                </label>
                <select
                  value={parentId}
                  onChange={(e) => setParentId(e.target.value)}
                  className="form-select text-xs font-medium"
                >
                  <option value="">-- حدد النيابة الكلية التابعة لها --</option>
                  {plenaryProsecutions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.governorate ? `(${p.governorate})` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowAddForm(false)}
              >
                إلغاء
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={isPending}
              >
                حفظ وقيد النيابة
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* بطاقات الإحصاءات */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي النيابات المسجلة"
          value={prosecutions.length}
          icon={<Building2 className="w-6 h-6" />}
          variant="teal"
        />
        <StatCard
          title="النيابات الكلية"
          value={prosecutions.filter((p) => !p.type || p.type === "PLENARY").length}
          icon={<Scale className="w-6 h-6" />}
          variant="sky"
        />
        <StatCard
          title="النيابات الجزئية"
          value={prosecutions.filter((p) => p.type === "DISTRICT").length}
          icon={<GitFork className="w-6 h-6" />}
          variant="amber"
        />
        <StatCard
          title="نيابات مفعلة للقيد"
          value={prosecutions.filter((p) => p.active).length}
          icon={<CheckCircle2 className="w-6 h-6" />}
          variant="emerald"
        />
      </div>

      {/* شريط البحث وفلترة المحافظات والنوع وجدول النيابات */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="بحث سريع في أسماء النيابات أو المحافظة..."
                className="form-input text-xs pr-9 bg-white"
              />
            </div>

            <div className="w-full sm:w-44">
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value)}
                className="form-select text-xs bg-white"
              >
                <option value="">جميع الأنواع (كلية وجزئية)</option>
                <option value="PLENARY">نيابات كلية فقط</option>
                <option value="DISTRICT">نيابات جزئية فقط</option>
              </select>
            </div>

            <div className="w-full sm:w-48">
              <select
                value={selectedGovFilter}
                onChange={(e) => setSelectedGovFilter(e.target.value)}
                className="form-select text-xs bg-white"
              >
                <option value="">جميع المحافظات</option>
                {EGYPT_GOVERNORATES.map((gov) => (
                  <option key={gov} value={gov}>
                    {gov}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="text-xs font-medium text-slate-500 font-body shrink-0">
            معروض {filtered.length} من إجمالي {prosecutions.length} نيابة
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-body">جارٍ تحميل سجل النيابات...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-body">لا توجد نيابات مطابقة لمعايير البحث.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">#</TableHead>
                <TableHead>اسم النيابة العامة</TableHead>
                <TableHead>النوع والتصنيف</TableHead>
                <TableHead>التبعية القضائية</TableHead>
                <TableHead>المحافظة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-center">التحكم والإجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item, idx) => (
                <TableRow key={item.id} className={!item.active ? "bg-slate-50/70" : undefined}>
                  <TableCell className="font-mono text-xs text-slate-400 font-semibold">{idx + 1}</TableCell>
                  <TableCell className="font-semibold text-slate-900 text-xs font-heading">
                    {item.name}
                  </TableCell>
                  <TableCell>
                    {item.type === "DISTRICT" ? (
                      <Badge variant="amber" size="sm">
                        نيابة جزئية
                      </Badge>
                    ) : (
                      <Badge variant="teal" size="sm">
                        نيابة كلية
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.parent ? (
                      <span className="text-xs font-medium text-slate-700">
                        تابعة لـ: <strong className="text-teal-900">{item.parent.name}</strong>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.governorate ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium font-body border border-slate-200">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{item.governorate}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">غير محددة</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.active ? (
                      <Badge variant="approved" size="sm" icon={<CheckCircle2 className="w-3 h-3 text-emerald-600" />}>
                        نشطة ومتاحة للقيد
                      </Badge>
                    ) : (
                      <Badge variant="amber" size="sm" icon={<PauseCircle className="w-3 h-3 text-amber-600" />}>
                        موقوفة مؤقتاً
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => startEdit(item)}
                        icon={<Edit2 className="w-3 h-3" />}
                      >
                        تعديل
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleToggleStatus(item)}
                      >
                        {item.active ? "إيقاف" : "تفعيل"}
                      </Button>
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(item)}
                        icon={<Trash2 className="w-3 h-3" />}
                      >
                        حذف
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
