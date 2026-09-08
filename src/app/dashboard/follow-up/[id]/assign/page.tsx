"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/formatters";

interface SubCommittee {
  id: string;
  name: string;
  scope?: string;
}

interface Specialty {
  id: string;
  name: string;
}

interface CaseDetails {
  id: string;
  caseNumber: string;
  caseYear: number;
  registrationType: string;
  respondentName?: string;
  complainantName?: string;
  prosecution?: string;
  description: string;
  attachmentsCount: number;
  specialties: { specialty: Specialty }[];
}

export default function FollowUpAssignPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [caseData, setCaseData] = useState<CaseDetails | null>(null);
  const [subCommittees, setSubCommittees] = useState<SubCommittee[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);

  const [selectedSubCommitteeId, setSelectedSubCommitteeId] = useState("");
  const [committeeSearch, setCommitteeSearch] = useState("");
  const [selectedSpecialtyIds, setSelectedSpecialtyIds] = useState<string[]>([]);
  const [specialtySearch, setSpecialtySearch] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [caseRes, scRes, specRes] = await Promise.all([
          fetch(`/api/cases/${params.id}`),
          fetch("/api/subcommittees"),
          fetch("/api/specialties"),
        ]);

        if (!caseRes.ok) throw new Error("تعذر جلب بيانات السجل");
        const cData = await caseRes.json();
        setCaseData(cData);

        if (cData.specialties && Array.isArray(cData.specialties)) {
          setSelectedSpecialtyIds(cData.specialties.map((s: any) => s.specialty?.id || s.specialtyId));
        }

        if (scRes.ok) setSubCommittees(await scRes.json());
        if (specRes.ok) setSpecialties(await specRes.json());
      } catch (err: any) {
        setError(err.message || "حدث خطأ أثناء تحميل البيانات");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [params.id]);

  function toggleSpecialty(id: string) {
    setSelectedSpecialtyIds((prev) =>
      prev.includes(id) ? prev.filter((sId) => sId !== id) : [...prev, id]
    );
  }

  const filteredSubCommittees = subCommittees.filter((sc) =>
    !committeeSearch.trim() || sc.name.toLowerCase().includes(committeeSearch.trim().toLowerCase()) ||
    (sc.scope && sc.scope.toLowerCase().includes(committeeSearch.trim().toLowerCase()))
  );

  const filteredSpecialties = specialties.filter((sp) =>
    !specialtySearch.trim() || sp.name.toLowerCase().includes(specialtySearch.trim().toLowerCase())
  );

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSubCommitteeId) {
      setError("يرجى اختيار اللجنة الفرعية / الجهة المحال إليها السجل");
      return;
    }

    setError(null);
    startTransition(async () => {
      const payload: any = {
        subCommitteeId: selectedSubCommitteeId,
        specialtyIds: selectedSpecialtyIds,
        durationDays: 30,
        followUpNotes,
      };

      const res = await fetch(`/api/cases/${params.id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "تعذّر حفظ التوجيه");
        return;
      }

      router.push("/dashboard/follow-up");
      router.refresh();
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-xs text-slate-500 font-bold">
        جارٍ جلب تفاصيل السجل...
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="alert-error">
        السجل غير موجود أو تعذر تحميله
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-black text-slate-900">
            توجيه وإحالة السجل: {caseData.caseNumber} / {caseData.caseYear}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إحالة السجل لإحدى الجهات الـ 16 المعتمدة وتحديد التخصصات والمدة الزمنية
          </p>
        </div>
        <Link href="/dashboard/follow-up" className="btn-secondary text-xs">
          إلغاء وعودة
        </Link>
      </div>

      {/* ملخص السجل */}
      <div className="card space-y-3 bg-slate-50/50">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
          <span className="text-xs font-bold text-slate-800">بيانات السجل</span>
          <span className="badge bg-slate-100 text-slate-700 border">📎 {caseData.attachmentsCount} مرفقات</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block font-medium">نوع السجل:</span>
            <span className="font-bold text-slate-800">
              {caseData.registrationType === "COMPLAINT" ? "شكوى" : caseData.registrationType === "CASE" ? "قضية" : "محضر"}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">الشاكي:</span>
            <span className="font-bold text-slate-800">{caseData.complainantName || "—"}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">المشكو في حقه:</span>
            <span className="font-bold text-slate-900">{caseData.respondentName || "—"}</span>
          </div>
          <div>
            <span className="text-slate-400 block font-medium">النيابة العامة:</span>
            <span className="font-bold text-slate-800">{caseData.prosecution || "—"}</span>
          </div>
        </div>

        <div>
          <span className="text-slate-400 block text-xs font-medium mb-1">الموضوع:</span>
          <p className="text-xs text-slate-700 bg-white p-3 rounded-lg border border-slate-200 leading-relaxed">
            {caseData.description}
          </p>
        </div>
      </div>

      {/* نموذج التوجيه */}
      <div className="card space-y-5">
        {error && (
          <div className="alert-error">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAssign} className="space-y-5">
          {/* اختيار اللجنة من الـ 16 جهة — بدون أكواد برمجية نهائياً حفاظاً على الأمان والطابع الحكومي الرسمي */}
          <div className="form-group">
            <label className="form-label form-label-required">الجهة / اللجنة الفرعية المعتمدة للإحالة</label>
            <input
              type="text"
              placeholder="بحث في أسماء الجهات الـ 16 المعتمدة..."
              value={committeeSearch}
              onChange={(e) => setCommitteeSearch(e.target.value)}
              className="input mb-2 text-xs"
            />
            <select
              required
              value={selectedSubCommitteeId}
              onChange={(e) => setSelectedSubCommitteeId(e.target.value)}
              className="form-input form-select font-bold"
            >
              <option value="">-- اختر الجهة من الـ 16 جهة المنصوص عليها --</option>
              {filteredSubCommittees.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name} {sc.scope ? `— (${sc.scope})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* التخصصات الطبية المعنية */}
          <div className="form-group">
            <div className="flex items-center justify-between mb-1.5">
              <label className="form-label mb-0">تأكيد التخصصات الطبية المطلوبة لفريق الفحص</label>
              <span className="text-[11px] font-bold text-slate-500">تم تحديد: {selectedSpecialtyIds.length} تخصص</span>
            </div>
            <input
              type="text"
              placeholder="بحث في قائمة التخصصات الطبية..."
              value={specialtySearch}
              onChange={(e) => setSpecialtySearch(e.target.value)}
              className="input mb-2 text-xs"
            />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              {filteredSpecialties.map((spec) => {
                const isSelected = selectedSpecialtyIds.includes(spec.id);
                return (
                  <button
                    key={spec.id}
                    type="button"
                    onClick={() => toggleSpecialty(spec.id)}
                    className={`p-2 rounded text-xs font-bold text-right border transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-[#1F4E79] text-white border-[#1F4E79]"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>{spec.name}</span>
                    {isSelected && <span>✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* المهلة الزمنية لإنجاز التقرير — طبقاً للقانون 30 يوماً فقط */}
          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1F4E79] flex items-center gap-1.5">
                <span>⏱️</span>
                <span>المهلة القانونية المقررة لإنجاز ورفع التقرير الطبي</span>
              </label>
              <span className="px-2.5 py-1 rounded-full bg-[#1F4E79] text-white text-xs font-black shadow-sm">
                30 يوماً فقط (طبقاً للقانون)
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              تنص المادة القانونية على إنجاز ورفع تقرير اللجنة الفرعية الفاحصة خلال مهلة أقصاها <strong>30 يوماً</strong> من تاريخ قرار التوجيه والإحالة.
            </p>

            <div className="pt-2 border-t border-blue-200/70 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">تاريخ الاستحقاق القانوني الأقصى:</span>
              <span className="font-bold text-[#1F4E79] bg-white px-3 py-1 rounded-lg border border-blue-200 shadow-sm font-mono">
                {(() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 30);
                  return formatDate(d);
                })()}
              </span>
            </div>
          </div>

          {/* ملاحظات التوجيه */}
          <div className="form-group">
            <label className="form-label">ملاحظات وتوجيهات للجنة الفرعية (اختياري)</label>
            <textarea
              rows={3}
              value={followUpNotes}
              onChange={(e) => setFollowUpNotes(e.target.value)}
              placeholder="اكتب أي توجيهات خاصة باللجنة الفرعية..."
              className="form-input form-textarea text-xs"
            />
          </div>

          {/* أزرار الحفظ */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <Link href="/dashboard/follow-up" className="btn-secondary">
              إلغاء
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary px-6"
            >
              {isPending ? "جارٍ التوجيه..." : "اعتماد توجيه وإحالة السجل"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
