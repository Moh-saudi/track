"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  FileText,
  Building2,
  Scale,
  ClipboardList,
  Search,
  Save,
  X,
  ArrowRight,
} from "lucide-react";


interface Prosecution {
  id: string;
  name: string;
}

export default function NewCasePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [registrationType, setRegistrationType] = useState<"COMPLAINT" | "CASE" | "REPORT">("COMPLAINT");
  const [caseNumber, setCaseNumber] = useState("");
  const [caseYear, setCaseYear] = useState<number>(new Date().getFullYear());
  const [incomingDate, setIncomingDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [respondentName, setRespondentName] = useState("");
  const [complainantName, setComplainantName] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [description, setDescription] = useState("");
  const [attachmentsCount, setAttachmentsCount] = useState<number>(0);

  // النيابات المختصة
  const [prosecutions, setProsecutions] = useState<Prosecution[]>([]);
  const [selectedProsecutionId, setSelectedProsecutionId] = useState("");
  const [prosecutionSearch, setProsecutionSearch] = useState("");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const prosRes = await fetch("/api/prosecutions");
        if (prosRes.ok) setProsecutions(await prosRes.json());
      } catch (e) {
        console.error(e);
      }
    }
    loadData();
  }, []);

  const filteredProsecutions = prosecutions.filter((p) =>
    p.name.toLowerCase().includes(prosecutionSearch.trim().toLowerCase())
  );

  const selectedProsecution = prosecutions.find((p) => p.id === selectedProsecutionId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!caseNumber.trim()) {
      setError("يرجى إدخال رقم السجل بشكل صحيح");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          registrationType,
          caseNumber: caseNumber.trim(),
          caseYear: Number(caseYear),
          incomingDate: incomingDate || undefined,
          respondentName: respondentName.trim() || undefined,
          complainantName: complainantName.trim() || undefined,
          prosecution: selectedProsecution?.name || undefined,
          governorate: governorate.trim() || undefined,
          description: description.trim(),
          attachmentsCount: Number(attachmentsCount) || 0,
        };

        const res = await fetch("/api/cases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "تعذر قيد السجل، يرجى مراجعة البيانات");
        }

        router.push("/dashboard/registration");
        router.refresh();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ─── رأس الصفحة الموحد ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "قيد السجلات", href: "/dashboard/registration" },
          { label: "قيد سجل جديد" },
        ]}
        title="قيد شكوى / قضية / محضر نيابة جديد"
        description="تسجيل وحفظ بيانات السجل والمرفقات تمهيداً للإحالة للجان الفحص الفرعية."
        actions={
          <Link
            href="/dashboard/registration"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-50 shadow-xs font-body"
          >
            <ArrowRight className="w-4 h-4" />
            <span>عودة للسجلات</span>
          </Link>
        }
      />

      <Card className="space-y-6 p-6 sm:p-8">
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
                { type: "COMPLAINT", label: "شكوى رسمية", desc: "واردة من مواطن أو جهة", icon: Building2 },
                { type: "CASE", label: "قضية متداولة", desc: "دعوى قضائية منظورة", icon: Scale },
                { type: "REPORT", label: "محضر نيابة عامة", desc: "إحالة من النيابة المختصة", icon: ClipboardList },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = registrationType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setRegistrationType(item.type as any)}
                    className={`p-3.5 rounded-xl border text-right transition-all flex items-start justify-between font-body ${
                      isSelected
                        ? "border-teal-600 bg-teal-50/70 text-teal-900 font-bold shadow-xs ring-1 ring-teal-600/30"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold block font-heading">{item.label}</span>
                      <span className="text-[11px] text-slate-500 font-normal">{item.desc}</span>
                    </div>
                    <Icon className={`w-5 h-5 ${isSelected ? "text-teal-600" : "text-slate-400"}`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. تاريخ الوارد + رقم السجل + سنة القيد + عدد المرفقات */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="form-group">
              <label className="form-label form-label-required">تاريخ الوارد (الاستلام)</label>
              <input
                type="date"
                required
                value={incomingDate}
                onChange={(e) => setIncomingDate(e.target.value)}
                className="form-input text-xs font-mono font-medium"
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block font-body">
                تاريخ ورود كتاب النيابة أو استلام الشكوى
              </span>
            </div>

            <div className="form-group">
              <label className="form-label form-label-required">رقم السجل</label>
              <input
                type="text"
                required
                value={caseNumber}
                onChange={(e) => setCaseNumber(e.target.value)}
                placeholder="مثال: 1425"
                className="form-input text-xs font-mono font-medium"
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label className="form-label form-label-required">سنة القيد</label>
              <input
                type="number"
                required
                value={caseYear}
                onChange={(e) => setCaseYear(Number(e.target.value))}
                className="form-input text-xs font-mono font-medium"
                dir="ltr"
              />
            </div>

            <div className="form-group">
              <label className="form-label">عدد المرفقات الورقية/الرقمية</label>
              <input
                type="number"
                min="0"
                value={attachmentsCount}
                onChange={(e) => setAttachmentsCount(Number(e.target.value))}
                className="form-input text-xs font-mono font-medium"
                dir="ltr"
              />
            </div>
          </div>

          {/* 3. أطراف السجل */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="form-group">
              <label className="form-label">المشكو في حقه (الطبيب / المنشأة)</label>
              <input
                type="text"
                value={respondentName}
                onChange={(e) => setRespondentName(e.target.value)}
                placeholder="اسم الطبيب أو المستشفى..."
                className="form-input text-xs"
              />
            </div>

            <div className="form-group">
              <label className="form-label">الشاكي / المبلّغ</label>
              <input
                type="text"
                value={complainantName}
                onChange={(e) => setComplainantName(e.target.value)}
                placeholder="اسم مقدم الشكوى أو المتضرر..."
                className="form-input text-xs"
              />
            </div>

            <div className="form-group">
              <label className="form-label">المحافظة</label>
              <input
                type="text"
                value={governorate}
                onChange={(e) => setGovernorate(e.target.value)}
                placeholder="مثال: القاهرة، الجيزة..."
                className="form-input text-xs"
              />
            </div>
          </div>

          {/* 4. النيابة العامة المختصة مع حقل بحث فوري مباشر */}
          <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="form-label form-label-required font-bold text-slate-900 m-0">
                النيابة العامة المختصة
              </label>
              {selectedProsecution && (
                <Badge variant="teal" size="sm">
                  المحددة حالياً: {selectedProsecution.name}
                </Badge>
              )}
            </div>

            {/* أ. حقل البحث الفوري المباشر */}
            <div className="relative">
              <input
                type="text"
                value={prosecutionSearch}
                onChange={(e) => {
                  const query = e.target.value;
                  setProsecutionSearch(query);
                  const match = prosecutions.find((p) =>
                    p.name.toLowerCase().includes(query.trim().toLowerCase())
                  );
                  if (match && query.trim().length >= 2) {
                    setSelectedProsecutionId(match.id);
                  }
                }}
                placeholder="اكتب هنا للبحث الفوري في قائمة النيابات (مثال: غرب القاهرة، شبين الكوم...)"
                className="form-input text-xs pr-3 pl-8 bg-white border-slate-300 focus:border-teal-600"
              />
              {prosecutionSearch && (
                <button
                  type="button"
                  onClick={() => setProsecutionSearch("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold px-1"
                  title="مسح البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* ب. قائمة النيابات المرتبطة بالبحث مباشرة */}
            <div>
              <select
                value={selectedProsecutionId}
                onChange={(e) => setSelectedProsecutionId(e.target.value)}
                className="form-select text-xs font-medium text-slate-900 bg-white border-slate-300"
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
            <Link href="/dashboard/registration">
              <Button type="button" variant="secondary">
                إلغاء
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              icon={<Save className="w-4 h-4" />}
            >
              قيد وحفظ السجل رسمياً
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
