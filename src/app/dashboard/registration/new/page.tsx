"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface ProsecutionItem {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
}

export default function NewCasePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [registrationType, setRegistrationType] = useState<"COMPLAINT" | "CASE" | "REPORT">("COMPLAINT");
  const [caseNumber, setCaseNumber] = useState("");
  const [caseYear, setCaseYear] = useState(new Date().getFullYear().toString());
  const [attachmentsCount, setAttachmentsCount] = useState<number>(0);

  // أطراف الواقعة (الشاكي والمشكو في حقه متجاورين لتسهيل الاستخدام)
  const [complainantName, setComplainantName] = useState("");
  const [respondentName, setRespondentName] = useState("");

  // بيانات النيابة العامة المعتمدة والبحث الفوري المرتبط مباشرة
  const [prosecutions, setProsecutions] = useState<ProsecutionItem[]>([]);
  const [selectedProsecutionId, setSelectedProsecutionId] = useState("");
  const [prosecutionSearch, setProsecutionSearch] = useState("");

  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  // تحميل قائمة النيابات الرسمية المعتمدة
  useEffect(() => {
    fetch("/api/prosecutions")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProsecutions(data);
          if (data.length > 0 && !selectedProsecutionId) {
            setSelectedProsecutionId(data[0].id);
          }
        }
      })
      .catch((err) => console.error(err));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!caseNumber.trim()) {
      setError("يرجى إدخال رقم السجل");
      return;
    }
    if (!caseYear || isNaN(Number(caseYear))) {
      setError("يرجى إدخال سنة السجل بالأرقام");
      return;
    }
    if (!complainantName.trim()) {
      setError("يرجى إدخال اسم الشاكي / المريض (حقل إلزامي)");
      return;
    }
    if (!selectedProsecutionId) {
      setError("يرجى تحديد النيابة العامة المختصة");
      return;
    }
    if (!description.trim()) {
      setError("يرجى إدخال ملخص الواقعة / موضوع الشكوى");
      return;
    }

    const selectedPros = prosecutions.find((p) => p.id === selectedProsecutionId);

    startTransition(async () => {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registrationType,
          caseNumber: caseNumber.trim(),
          caseYear: Number(caseYear),
          attachmentsCount: Number(attachmentsCount) || 0,
          hospitalName: null,
          respondentName: respondentName.trim() || null,
          prosecutionId: selectedProsecutionId || null,
          prosecution: selectedPros ? selectedPros.name : null,
          governorate: null, // تم حذف حقل المحافظة بناءً على التعليمات
          complainantName: complainantName.trim() || null,
          description: description.trim(),
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(typeof body.error === "string" ? body.error : "تعذّر حفظ السجل");
        return;
      }

      router.push("/dashboard/registration");
      router.refresh();
    });
  }

  // فلترة قائمة النيابات بالاسم فقط مع الربط المباشر بحقل البحث
  const filteredProsecutions = prosecutions.filter((p) =>
    p.name.toLowerCase().includes(prosecutionSearch.trim().toLowerCase())
  );

  const selectedProsecution = prosecutions.find((p) => p.id === selectedProsecutionId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* رأس الصفحة الحكومي */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded bg-[#1F4E79]/10 text-[#1F4E79] border border-[#1F4E79]/20 text-[11px] font-bold">
              📝 الأمانة الفنية — قيد السجلات
            </span>
            <span className="text-xs text-slate-500 font-bold">نموذج القيد الرقمي الموحد</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            قيد شكوى / قضية / محضر نيابة جديد
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            يتم تسجيل وحفظ بيانات السجل والمرفقات تمهيداً للإحالة للجان الفحص الفرعية
          </p>
        </div>
        <Link href="/dashboard/registration" className="btn-secondary text-xs self-start sm:self-auto">
          ← إلغاء وعودة للسجلات
        </Link>
      </div>

      <div className="card space-y-6 p-6 sm:p-8">
        {error && (
          <div className="alert-error text-xs">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. نوع السجل */}
          <div className="form-group">
            <label className="form-label form-label-required">نوع السجل</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { type: "COMPLAINT", label: "شكوى رسمية", desc: "واردة من مواطن أو جهة", icon: "🏛️" },
                { type: "CASE", label: "قضية متداولة", desc: "دعوى قضائية منظورة", icon: "⚖️" },
                { type: "REPORT", label: "محضر نيابة عامة", desc: "إحالة من النيابة المختصة", icon: "📋" },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setRegistrationType(item.type as any)}
                  className={`p-3.5 rounded-xl border text-right transition-all flex items-start justify-between ${
                    registrationType === item.type
                      ? "border-[#1F4E79] bg-blue-50/70 text-[#1F4E79] font-black shadow-sm ring-1 ring-[#1F4E79]/30"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block">{item.label}</span>
                    <span className="text-[10px] text-slate-500 font-normal">{item.desc}</span>
                  </div>
                  <span className="text-xl">{item.icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. رقم السجل + سنة السجل + عدد المرفقات بالأرقام الإنجليزية */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="form-group">
              <label className="form-label form-label-required">رقم السجل</label>
              <input
                type="text"
                required
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                placeholder="1045"
                className="form-input font-bold font-mono text-sm"
              />
              <span className="text-[10px] text-slate-500">الرقم المجرد (مثال: 1045)</span>
            </div>

            <div className="form-group">
              <label className="form-label form-label-required">سنة السجل</label>
              <input
                type="number"
                required
                min={1990}
                max={2100}
                value={caseYear}
                onChange={(e) => setCaseYear(e.target.value)}
                placeholder="2026"
                className="form-input font-bold font-mono text-center text-sm"
              />
              <span className="text-[10px] text-slate-500">السنة الميلادية (2026)</span>
            </div>

            <div className="form-group">
              <label className="form-label form-label-required">عدد المرفقات الورقية والطبية</label>
              <input
                type="number"
                min={0}
                required
                value={attachmentsCount}
                onChange={(e) => setAttachmentsCount(Number(e.target.value))}
                placeholder="0"
                className="form-input font-bold font-mono text-center text-sm"
              />
              <span className="text-[10px] text-slate-500">أشعات، تقارير، ملفات طبية</span>
            </div>
          </div>

          {/* 3. الحقول المتجاورة: اسم الشاكي + اسم المشكو في حقه (تجربة مستخدم سهلة وسريعة ومتناسقة) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-group">
              <label className="form-label form-label-required text-slate-800 font-bold">
                اسم الشاكي / المريض
              </label>
              <input
                type="text"
                required
                value={complainantName}
                onChange={(e) => setComplainantName(e.target.value)}
                placeholder="الاسم الثلاثي أو الرباعي للشاكي"
                className="form-input text-xs font-bold"
              />
            </div>

            <div className="form-group">
              <label className="form-label text-slate-800 font-bold">
                اسم المشكو في حقه (الطبيب / الكادر الطبي)
              </label>
              <input
                type="text"
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                placeholder="اسم الطبيب أو الفريق الطبي المشكو في حقه"
                className="form-input text-xs"
              />
            </div>
          </div>

          {/* 4. النيابة العامة المختصة (حقل البحث فوق القائمة ومرتبط بها مباشرة) */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="form-label form-label-required font-bold text-slate-900 m-0">
                النيابة العامة المختصة
              </label>
              {selectedProsecution && (
                <span className="text-[11px] font-bold text-[#1F4E79] bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  المحددة حالياً: {selectedProsecution.name}
                </span>
              )}
            </div>

            {/* أ. حقل البحث الفوري المباشر — يقع فوق قائمة النيابة مباشرة */}
            <div className="relative">
              <input
                type="text"
                value={prosecutionSearch}
                onChange={(e) => {
                  const query = e.target.value;
                  setProsecutionSearch(query);
                  // ربط فوري بالقائمة: إذا وجد تطابق مباشر أثناء الكتابة، يتم تحديده تلقائياً
                  const match = prosecutions.find((p) =>
                    p.name.toLowerCase().includes(query.trim().toLowerCase())
                  );
                  if (match && query.trim().length >= 2) {
                    setSelectedProsecutionId(match.id);
                  }
                }}
                placeholder="🔍 اكتب هنا للبحث الفوري في قائمة النيابات (مثال: غرب القاهرة، شبين الكوم، المنصورة...)"
                className="form-input text-xs pr-3 pl-8 bg-white border-slate-300 focus:border-[#1F4E79]"
              />
              {prosecutionSearch && (
                <button
                  type="button"
                  onClick={() => setProsecutionSearch("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold px-1"
                  title="مسح البحث"
                >
                  ✕
                </button>
              )}
            </div>

            {/* ب. قائمة النيابات المرتبطة بالبحث مباشرة */}
            <div>
              <select
                value={selectedProsecutionId}
                onChange={(e) => setSelectedProsecutionId(e.target.value)}
                className="form-input text-xs font-bold text-[#1F4E79] bg-white border-blue-200 shadow-2xs"
              >
                <option value="">
                  -- حدد النيابة العامة المختصة ({filteredProsecutions.length} خيار متاح) --
                </option>
                {filteredProsecutions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. ملخص الواقعة / موضوع الشكوى */}
          <div className="form-group">
            <label className="form-label form-label-required">ملخص الواقعة / موضوع الشكوى</label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="اكتب ملخص الإجراء الطبي المتنازع بشأنه وما ورد بتقرير النيابة أو عريضة الشكوى..."
              className="form-input form-textarea text-xs"
            />
          </div>

          {/* أزرار الحفظ والإلغاء */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Link href="/dashboard/registration" className="btn-secondary text-xs px-5 py-2.5">
              إلغاء
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="btn-primary text-xs px-7 py-2.5 font-bold shadow-sm"
            >
              {isPending ? "جارٍ الحفظ في السجل..." : "💾 قيد وحفظ السجل رسمياً"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
