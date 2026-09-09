"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/formatters";
import { Building2, Calendar, CheckCircle2, Clock, Edit2, Send, X } from "lucide-react";

interface Props {
  caseId: string;
  caseNumber: string;
  caseYear: number;
  prosecutionName?: string | null;
  notifiedAt?: Date | string | null;
  letterNumber?: string | null;
  notes?: string | null;
}

export function ProsecutionNotificationCell({
  caseId,
  caseNumber,
  caseYear,
  prosecutionName,
  notifiedAt,
  letterNumber,
  notes,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [date, setDate] = useState<string>(() => {
    if (notifiedAt) {
      try {
        return new Date(notifiedAt).toISOString().split("T")[0];
      } catch {
        return "";
      }
    }
    return new Date().toISOString().split("T")[0];
  });
  const [num, setNum] = useState(letterNumber || "");
  const [noteText, setNoteText] = useState(notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date) {
      setError("يرجى تحديد تاريخ إخطار النيابة");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/cases/${caseId}/prosecution-notification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prosecutionNotifiedAt: date,
          prosecutionLetterNumber: num,
          prosecutionNotificationNotes: noteText,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشل حفظ البيانات");
      }

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div>
        {notifiedAt ? (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors text-right group"
              title="تعديل بيانات مخاطبة النيابة"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <div className="space-y-0.5 font-mono text-[11px]">
                <div className="font-bold flex items-center gap-1">
                  <span>تم الإخطار:</span>
                  <span>{formatDate(notifiedAt)}</span>
                </div>
                {letterNumber && (
                  <div className="text-[10px] text-emerald-700 font-normal">
                    صادر رقم: {letterNumber}
                  </div>
                )}
              </div>
              <Edit2 className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity mr-1" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold font-body transition-colors shadow-2xs"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>تسجيل مخاطبة النيابة</span>
          </button>
        )}
      </div>

      {/* نافذة التوثيق المنبثقة */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-heading text-slate-900">
                    توثيق مخاطبة النيابة العامة
                  </h3>
                  <p className="text-xs text-slate-500 font-body">
                    السجل: {caseNumber} / {caseYear} {prosecutionName ? `— (${prosecutionName})` : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-body">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 font-body text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  تاريخ إرسال المكاتبة / إخطار النيابة بموعد الجلسة <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full h-10 pr-9 pl-3 rounded-lg border border-slate-300 bg-white font-mono text-xs focus:outline-hidden focus:border-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  رقم صادر الخطاب / المكاتبة (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثال: ص-412/2026 نيابات"
                  value={num}
                  onChange={(e) => setNum(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-300 bg-white text-xs focus:outline-hidden focus:border-teal-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  ملاحظات إضافية (طريقة الإرسال، اسم المستلم، إلخ)
                </label>
                <textarea
                  rows={2}
                  placeholder="تم إرسال الخطاب بالبريد المسجل / باليد..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-hidden focus:border-teal-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => setIsOpen(false)}
                  className="px-4 h-9 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors font-semibold text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 h-9 rounded-lg bg-teal-600 hover:bg-teal-700 text-white transition-colors font-semibold text-xs inline-flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{saving ? "جاري الحفظ..." : "حفظ التوثيق"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
