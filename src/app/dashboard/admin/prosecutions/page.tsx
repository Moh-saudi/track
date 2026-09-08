"use client";

import { useState, useEffect, useTransition } from "react";

interface ProsecutionItem {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
  createdAt: string;
  _count?: {
    cases: number;
  };
}

export default function ProsecutionsManagementPage() {
  const [prosecutions, setProsecutions] = useState<ProsecutionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);

  // حقول إضافة نيابة جديدة
  const [name, setName] = useState("");

  // بحث
  const [searchTerm, setSearchTerm] = useState("");

  async function loadData() {
    try {
      const res = await fetch("/api/prosecutions");
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
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "تعذر إضافة النيابة");

        setSuccessMsg(`تمت إضافة (${data.name}) لسجل النيابات الرسمية بنجاح`);
        setName("");
        setShowAddForm(false);
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

  const filtered = prosecutions.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* رأس الصفحة الحكومي الرصين */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded bg-[#1F4E79]/10 text-[#1F4E79] border border-[#1F4E79]/20 text-[11px] font-bold">
              ⚖️ النيابات العامة المعتمدة
            </span>
            <span className="text-xs text-slate-500 font-bold">قاعدة بيانات الجهات القضائية المحيلة</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            سجل وإدارة جهات النيابة العامة
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إدارة النيابات الكلية والجزئية الرسمية لمنع التكرار والأخطاء الإملائية أثناء قيد السجلات
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary text-xs font-bold px-4 py-2.5 shadow-sm self-start sm:self-auto"
        >
          {showAddForm ? "إلغاء الإضافة" : "➕ إضافة نيابة جديدة"}
        </button>
      </div>

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
        <div className="card border-slate-200 p-6 space-y-4 bg-slate-50/80 animate-in fade-in zoom-in-95">
          <div className="border-b border-slate-200 pb-2">
            <h2 className="text-sm font-black text-slate-900">إضافة جهة نيابة عامة جديدة</h2>
            <p className="text-[11px] text-slate-500">ستظهر هذه النيابة فوراً كخيار معتمد في قائمة قيد السجلات الجديدة</p>
          </div>

          <form onSubmit={handleAddProsecution} className="space-y-4">
            <div>
              <div className="form-group">
                <label className="form-label form-label-required">اسم النيابة الكلية أو الجزئية</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: شبين الكوم الكلية - تلا الجزئية"
                  className="form-input text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary text-xs px-5 py-2 font-bold"
              >
                {isPending ? "جارٍ الحفظ..." : "حفظ وقيد النيابة"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* بطاقات الإحصاءات */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="card p-4 border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1F4E79] flex items-center justify-center text-xl font-bold border border-blue-200">
            🏛️
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{prosecutions.length}</p>
            <p className="text-xs font-bold text-slate-500">إجمالي النيابات المسجلة</p>
          </div>
        </div>

        <div className="card p-4 border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl font-bold border border-emerald-200">
            🟢
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{prosecutions.filter((p) => p.active).length}</p>
            <p className="text-xs font-bold text-slate-500">نيابات مفعلة للاختيار</p>
          </div>
        </div>

        <div className="card p-4 border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-xl font-bold border border-amber-200">
            ⏸️
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{prosecutions.filter((p) => !p.active).length}</p>
            <p className="text-xs font-bold text-slate-500">نيابات موقوفة مؤقتاً</p>
          </div>
        </div>
      </div>

      {/* شريط البحث وجدول النيابات */}
      <div className="card p-0 overflow-hidden border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-sm">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="🔍 بحث سريع في أسماء النيابات..."
              className="form-input text-xs"
            />
          </div>
          <span className="text-xs font-bold text-slate-500">
            معروض {filtered.length} من إجمالي {prosecutions.length} نيابة
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">جارٍ تحميل سجل النيابات...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">لا توجد نيابات مطابقة لمعايير البحث.</div>
        ) : (
          <div className="table-wrapper border-0 rounded-none">
            <table className="table-custom">
              <thead>
                <tr>
                  <th className="w-16">#</th>
                  <th>اسم النيابة العامة</th>
                  <th>الحالة</th>
                  <th className="text-center">التحكم</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id} className={!item.active ? "bg-slate-50/70" : undefined}>
                    <td className="font-mono text-xs text-slate-400 font-bold">{idx + 1}</td>
                    <td className="font-bold text-slate-900 text-xs">
                      🏛️ {item.name}
                    </td>
                    <td>
                      {item.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          <span>نشطة ومتاحة للقيد</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          <span>موقوفة مؤقتاً</span>
                        </span>
                      )}
                    </td>
                    <td className="text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          className={`text-xs px-2.5 py-1 rounded font-bold transition-colors ${
                            item.active
                              ? "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                              : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                          }`}
                        >
                          {item.active ? "إيقاف" : "تفعيل"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="text-xs px-2.5 py-1 rounded text-rose-700 hover:bg-rose-50 border border-rose-200 font-bold transition-colors"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
