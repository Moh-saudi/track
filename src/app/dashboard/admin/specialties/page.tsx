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
  Stethoscope,
  CheckCircle2,
  PauseCircle,
  Search,
  Plus,
  Trash2,
} from "lucide-react";

interface SpecialtyItem {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
  createdAt: string;
}

export default function SpecialtiesManagementPage() {
  const [specialties, setSpecialties] = useState<SpecialtyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);

  // حقول إضافة تخصص جديد
  const [name, setName] = useState("");

  // بحث
  const [searchTerm, setSearchTerm] = useState("");

  async function loadData() {
    try {
      const res = await fetch("/api/specialties?all=true");
      if (!res.ok) throw new Error("تعذر تحميل قائمة التخصصات الطبية");
      const data = await res.json();
      setSpecialties(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAddSpecialty(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/specialties", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "تعذر إضافة التخصص الطبي");

        setSuccessMsg(`تمت إضافة التخصص الطبي (${data.name}) بنجاح`);
        setName("");
        setShowAddForm(false);
        await loadData();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  async function handleToggleStatus(item: SpecialtyItem) {
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/specialties/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "تعذر تحديث حالة التخصص");
      }

      setSuccessMsg(`تم تحديث حالة التخصص (${item.name}) بنجاح`);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDelete(item: SpecialtyItem) {
    if (!confirm(`هل أنت متأكد من حذف التخصص الطبي (${item.name})؟`)) return;

    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/specialties/${item.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "تعذر حذف التخصص الطبي");

      setSuccessMsg("تم حذف التخصص الطبي بنجاح");
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  const filtered = specialties.filter(
    (s) => s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ─── رأس الصفحة الموحد ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "إدارة المنظومة", href: "/dashboard/admin" },
          { label: "سجل التخصصات الطبية" },
        ]}
        title="سجل وإدارة التخصصات الطبية"
        description="إدارة قائمة التخصصات الطبية المعيارية المستخدمة في توجيه وتوزيع القضايا للجان الفحص الفرعية."
        actions={
          <Button
            type="button"
            variant="primary"
            onClick={() => setShowAddForm(!showAddForm)}
            icon={<Plus className="w-4 h-4" />}
          >
            {showAddForm ? "إلغاء الإضافة" : "إضافة تخصص طبي جديد"}
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

      {/* نموذج الإضافة */}
      {showAddForm && (
        <Card className="space-y-4 bg-slate-50/80 animate-in fade-in zoom-in-95">
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-sm font-bold text-slate-900 font-heading">إضافة تخصص طبي معتمد جديد</h2>
            <p className="text-xs text-slate-500 font-body">
              يُتاح هذا التخصص تلقائياً لموظفي التوجيه والمتابعة لربطه بالقضايا وإحالتها للجان الفرعية المختصة
            </p>
          </div>

          <form onSubmit={handleAddSpecialty} className="space-y-4">
            <div className="form-group">
              <label className="form-label form-label-required">اسم التخصص الطبي</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: جراحة السمنة ومناظير الجهاز الهضمي"
                className="form-input text-xs"
              />
            </div>

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
                حفظ وقيد التخصص
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* بطاقات الإحصاءات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="إجمالي التخصصات الطبية"
          value={specialties.length}
          icon={<Stethoscope className="w-6 h-6" />}
          variant="teal"
        />
        <StatCard
          title="تخصصات نشطة ومتاحة"
          value={specialties.filter((s) => s.active).length}
          icon={<CheckCircle2 className="w-6 h-6" />}
          variant="emerald"
        />
        <StatCard
          title="تخصصات موقوفة مؤقتاً"
          value={specialties.filter((s) => !s.active).length}
          icon={<PauseCircle className="w-6 h-6" />}
          variant="amber"
        />
      </div>

      {/* شريط البحث والجدول */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث في أسماء التخصصات الطبية..."
              className="form-input text-xs pr-9"
            />
          </div>
          <span className="text-xs font-medium text-slate-500 font-body">
            معروض <span className="font-mono">{filtered.length}</span> من إجمالي <span className="font-mono">{specialties.length}</span> تخصص
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-body">جارٍ تحميل سجل التخصصات الطبية...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-body">لا توجد تخصصات طبية مطابقة لمعايير البحث.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>اسم التخصص الطبي</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead className="text-center">التحكم</TableHead>
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
                    {item.active ? (
                      <Badge variant="approved" size="sm" icon={<CheckCircle2 className="w-3 h-3 text-emerald-600" />}>
                        نشط ومتاح للتوجيه
                      </Badge>
                    ) : (
                      <Badge variant="amber" size="sm" icon={<PauseCircle className="w-3 h-3 text-amber-600" />}>
                        موقوف مؤقتاً
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
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
