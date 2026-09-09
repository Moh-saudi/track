"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  Plus,
  X,
  Send,
  AlertCircle,
  CheckSquare,
  Square,
} from "lucide-react";

interface Props {
  availableCases: Array<{
    id: string;
    caseNumber: string;
    caseYear: number;
    complainantName: string | null;
    hospitalName: string | null;
    subCommittee?: { name: string } | null;
  }>;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateSessionModal({
  availableCases,
  onClose,
  onCreated,
}: Props) {
  const router = useRouter();
  const [sessionNumber, setSessionNumber] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [location, setLocation] = useState(
    "قاعة الاجتماعات الرئيسية - الأمانة الفنية للجنة العليا"
  );
  const [notes, setNotes] = useState("");
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleCase(id: string) {
    setSelectedCaseIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function toggleAll() {
    if (selectedCaseIds.length === availableCases.length) {
      setSelectedCaseIds([]);
    } else {
      setSelectedCaseIds(availableCases.map((c) => c.id));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionNumber.trim()) {
      setError("يرجى إدخال عنوان أو رقم الجلسة");
      return;
    }
    if (!sessionDate) {
      setError("يرجى تحديد موعد وتاريخ الجلسة");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/supreme/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionNumber: sessionNumber.trim(),
          sessionDate,
          location: location.trim(),
          notes: notes.trim() || undefined,
          caseIds: selectedCaseIds,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل جدولة الجلسة");
      }

      onClose();
      if (onCreated) onCreated();
      router.refresh();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء حفظ الجلسة");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-body">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        {/* الترويسة */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-slate-900">
                جدولة جلسة انعقاد جديدة للجنة العليا
              </h3>
              <p className="text-xs text-slate-500">
                تحديد الموعد والمقر وإدراج السجلات الطبية المعروضة
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* رقم / عنوان الجلسة */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              عنوان أو رقم الجلسة <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="مثال: الجلسة الدورية رقم 12 لسنة 2026"
              value={sessionNumber}
              onChange={(e) => setSessionNumber(e.target.value)}
              className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-body focus:outline-hidden focus:border-teal-600 shadow-2xs"
            />
          </div>

          {/* موعد وتاريخ الجلسة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                تاريخ ووقت الانعقاد <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white font-mono text-xs focus:outline-hidden focus:border-teal-600 shadow-2xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1">
                مقر الانعقاد
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:border-teal-600 shadow-2xs"
              />
            </div>
          </div>

          {/* السجلات الطبية المعروضة بالجلسة */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-slate-700 font-semibold">
                السجلات الجاهزة للعرض بالجدول ({selectedCaseIds.length} من {availableCases.length} مختار)
              </label>
              {availableCases.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-[11px] text-teal-700 font-semibold hover:underline"
                >
                  {selectedCaseIds.length === availableCases.length
                    ? "إلغاء تحديد الكل"
                    : "تحديد كل السجلات"}
                </button>
              )}
            </div>

            <div className="max-h-40 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-2 space-y-1.5">
              {availableCases.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  لا توجد سجلات جاهزة ومحالة للجنة العليا حالياً
                </div>
              ) : (
                availableCases.map((c) => {
                  const isChecked = selectedCaseIds.includes(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggleCase(c.id)}
                      className={`flex items-center justify-between p-2 rounded-xl border transition-colors cursor-pointer text-xs ${
                        isChecked
                          ? "bg-teal-50/70 border-teal-300 text-teal-900"
                          : "bg-white border-slate-200 text-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-teal-600 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <span className="font-mono font-bold">
                          {c.caseNumber} / {c.caseYear}
                        </span>
                        {c.complainantName && (
                          <span className="text-slate-500 font-normal">
                            — الشاكي: {c.complainantName}
                          </span>
                        )}
                      </div>
                      {c.subCommittee?.name && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {c.subCommittee.name}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ملاحظات الجلسة */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              ملاحظات وجدول الأعمال الإضافي (اختياري)
            </label>
            <textarea
              rows={2}
              placeholder="بنود إضافية، حضور استشاريين، توصيات خاصة..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:border-teal-600 resize-none shadow-2xs"
            />
          </div>

          {/* أزرار الإجراء */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="px-4 h-9 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors font-semibold"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 h-9 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{saving ? "جاري الحفظ..." : "تأكيد وجدولة الجلسة"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
