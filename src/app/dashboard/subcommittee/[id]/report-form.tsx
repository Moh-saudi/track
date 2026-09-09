"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Send,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Stethoscope,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  Calendar,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SubCommitteeReportFormProps {
  caseId: string;
  meetingDate?: Date | string | null;
  respondentName?: string | null;
  hospitalName?: string | null;
  complainantName?: string | null;
}

type FaultStatus = "FAULT_CONFIRMED" | "NO_FAULT" | "INSUFFICIENT_DOCS";

export function SubCommitteeReportForm({
  caseId,
  meetingDate,
  respondentName,
  hospitalName,
  complainantName,
}: SubCommitteeReportFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [finalizePending, setFinalizePending] = useState(false);

  // تاريخ اليوم كافتراضي
  const todayStr = new Date().toISOString().split("T")[0];
  const meetingDateStr = meetingDate
    ? new Date(meetingDate).toISOString().split("T")[0]
    : todayStr;

  // الحقول الأساسية
  const [receivedDate, setReceivedDate] = useState(todayStr);
  const [reportDate, setReportDate] = useState(todayStr);

  // التقييم الذكي لموقف الخطأ الطبي
  const [faultStatus, setFaultStatus] = useState<FaultStatus>("FAULT_CONFIRMED");

  // معطيات تفصيلية ذكية بحسب النتيجة
  const [faultCategory, setFaultCategory] = useState("تشخيصي وعلاجي");
  const [faultSeverity, setFaultSeverity] = useState("جسيم");
  const [causality, setCausality] = useState("علاقة سببية مباشرة ومؤكدة بين الخطأ والضرر");
  const [noFaultReason, setNoFaultReason] = useState("مضاعفة طبية متعارف عليها علمياً تم التعامل معها وفق الأصول");
  const [missingRequirements, setMissingRequirements] = useState("أصل الملف الطبي وتذكرة العمليات وقائمة التخدير");

  // النصوص التحريرية
  const [faultDescription, setFaultDescription] = useState("");
  const [reportText, setReportText] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [error, setError] = useState<string | null>(null);

  // وظيفة المساعد الذكي لتوليد مسودة فنية استناداً للمعطيات
  function generateSmartDraft(status: FaultStatus) {
    const target = respondentName || hospitalName;
    const respondentText = target ? `لدى المشكو في حقه (${target})` : "لدى المشكو في حقه";
    const patient = complainantName ? `للحالة / ${complainantName}` : "للمريض موضوع الفحص";

    if (status === "FAULT_CONFIRMED") {
      const genFault = `ثبوت وجود خطأ طبي فني من نوع (${faultCategory}) بدرجة جسامة (${faultSeverity})، مع توافر (${causality}) الذي لحق بـ ${patient} ${respondentText}. الخطأ تمثل في الإخلال بمعايير الممارسة الطبية السليمة وعدم اتخاذ الحيطة والحذر الواجبين قانوناً وفنياً.`;
      const genReport = `اجتمعت اللجنة الفرعية لفحص الواقعة ومراجعة السجلات الطبية والتقارير المرفقة. وبعد الفحص والتدقيق العلمي المتخصص، تبيّن للجنة أن الإجراءات الطبية المتبعة لم تراعِ الأصول الفنية المستقرة، مما ترتب عليه حدوث الضرر المشكو منه. نوصي باعتبار الواقعة تشكل مسؤولية طبية موجبة للمساءلة والتعويض.`;
      const genAction = `1. إثبات المسؤولية المهنية عن الخطأ الطبي.\n2. التوصية للجنة العليا للمسؤولية الطبية بتقدير التعويض العادل.\n3. إحالة التقرير للنيابة العامة الموقرة لاستكمال التحقيقات.`;

      setFaultDescription(genFault);
      setReportText(genReport);
      setActionTaken(genAction);
    } else if (status === "NO_FAULT") {
      const genFault = `انتفاء الخطأ الطبي والمسؤولية المهنية. تبيّن أن ما حدث يندرج تحت (${noFaultReason}) دون إهمال أو تقصير من الفريق الطبي المعالج.`;
      const genReport = `بعد الاطلاع على أوراق السجل والملف العلاجي والفحوصات، ثبت للجنة أن الفريق الطبي التزم بالبروتوكولات العلمية المعيارية المقررة لمثل هذه الحالات، وأن الضرر ناتج عن التطور الطبيعي للحالة المرضية أو مضاعفة واردة علمياً تم اتخاذ سائر الإجراءات الوقائية والتدخلية للحد منها.`;
      const genAction = `حفظ الشكوى وتبرئة ساحة الفريق الطبي لانتفاء الخطأ المهني والتقصير الطبي.`;

      setFaultDescription(genFault);
      setReportText(genReport);
      setActionTaken(genAction);
    } else if (status === "INSUFFICIENT_DOCS") {
      const genFault = `يتعذر البت الفني النهائي في الواقعة في الوقت الراهن لعدم اكتمال السجلات الطبية الأساسية، مع ضرورة استيفاء: (${missingRequirements}).`;
      const genReport = `ناظرت اللجنة أوراق القضية وتبين وجود نقص جوهري في المستندات الطبية والفنية الجوهرية التي لا يمكن بدونها الجزم بمدى صحة الإجراء الطبي. يتطلب الأمر إعادة مخاطبة جهة التحقيق لضم أصول المستندات المطلوبة ومناظرة المريض أو الأطباء المعنيين.`;
      const genAction = `مخاطبة جهة التحقيق / المشكو في حقه لاستيفاء النواقص المحددة وإرجاء التقرير النهائي لحين ورودها.`;

      setFaultDescription(genFault);
      setReportText(genReport);
      setActionTaken(genAction);
    }
  }

  // التعامل مع تغيير التقييم الذكي
  function handleStatusChange(newStatus: FaultStatus) {
    setFaultStatus(newStatus);
    generateSmartDraft(newStatus);
  }

  async function submit(finalize: boolean) {
    setError(null);
    if (finalize) {
      if (!reportText || reportText.trim().length < 15) {
        setError("يرجى كتابة نص التقرير الطبي ومبرراته قبل الاعتماد والرفع للجنة العليا");
        return;
      }
      if (!actionTaken || actionTaken.trim().length < 5) {
        setError("يرجى تدوين الإجراء المتخذ وتوصية اللجنة الفرعية");
        return;
      }
      setFinalizePending(true);
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            receivedDate,
            meetingDate: meetingDateStr,
            faultDescription: faultDescription || undefined,
            reportDate: reportDate || undefined,
            reportText: reportText || undefined,
            actionTaken: actionTaken || undefined,
            finalize,
          }),
        });

        setFinalizePending(false);

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const errMessage = typeof body.error === "string"
            ? body.error
            : typeof body.error === "object"
            ? Object.values(body.error).flat().join(" - ")
            : "تعذّر الحفظ — تحقق من صحة البيانات";
          setError(errMessage);
          return;
        }

        router.push("/dashboard/subcommittee");
        router.refresh();
      } catch (err: any) {
        setFinalizePending(false);
        setError(err.message || "حدث خطأ غير متوقع أثناء الحفظ");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
      className="space-y-6 font-body"
      noValidate
    >
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-bold font-heading">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* المواعيد المعتمدة للجلسة والتقرير */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="form-group">
          <label htmlFor="receivedDate" className="form-label form-label-required text-xs">
            تاريخ استلام الملف للجنة
          </label>
          <input
            id="receivedDate"
            type="date"
            required
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
            className="form-input text-xs font-mono"
            dir="ltr"
          />
        </div>

        <div className="form-group">
          <label className="form-label text-xs">
            تاريخ انعقاد الجلسة (المرحلة الأولى)
          </label>
          <div className="h-10 px-3 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs font-mono font-bold flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-teal-700" />
            <span>{meetingDateStr}</span>
            <span className="text-[10px] text-teal-600 font-body mr-auto">(محدد رسمياً)</span>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="reportDate" className="form-label form-label-required text-xs">
            تاريخ صدور التقرير الفني
          </label>
          <input
            id="reportDate"
            type="date"
            required
            min={meetingDateStr}
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="form-input text-xs font-mono"
            dir="ltr"
          />
        </div>
      </div>

      {/* ─── التقييم الطبي التفاعلي الذكي (Smart Clinical Assessment) ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="form-label form-label-required text-xs font-bold text-slate-900 m-0">
            النتيجة الفنية وقرار فحص اللجنة:
          </label>
          <span className="text-[11px] text-slate-500">
            حدد النتيجة لتوليد القوالب التحريرية والتوصيات تلقائياً
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* خيار 1: ثبوت الخطأ */}
          <button
            type="button"
            onClick={() => handleStatusChange("FAULT_CONFIRMED")}
            className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
              faultStatus === "FAULT_CONFIRMED"
                ? "bg-rose-50/70 border-rose-300 ring-2 ring-rose-500/20 shadow-sm"
                : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
                <Stethoscope className="w-4 h-4" />
              </div>
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  faultStatus === "FAULT_CONFIRMED"
                    ? "border-rose-600 bg-rose-600 text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {faultStatus === "FAULT_CONFIRMED" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-950 font-heading">ثبوت خطأ طبي ومسؤولية</h4>
              <p className="text-[11px] text-rose-800 font-body mt-0.5 leading-tight">
                إخلال بالمعايير الفنية مع توافر رابطة السببية بالضرر
              </p>
            </div>
          </button>

          {/* خيار 2: انتفاء الخطأ */}
          <button
            type="button"
            onClick={() => handleStatusChange("NO_FAULT")}
            className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
              faultStatus === "NO_FAULT"
                ? "bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-500/20 shadow-sm"
                : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  faultStatus === "NO_FAULT"
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {faultStatus === "NO_FAULT" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-950 font-heading">انتفاء الخطأ والمسؤولية</h4>
              <p className="text-[11px] text-emerald-800 font-body mt-0.5 leading-tight">
                مضاعفة طبية واردة أو التزام كامل بالبروتوكولات
              </p>
            </div>
          </button>

          {/* خيار 3: تعذر البت لحاجة استيفاء */}
          <button
            type="button"
            onClick={() => handleStatusChange("INSUFFICIENT_DOCS")}
            className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between ${
              faultStatus === "INSUFFICIENT_DOCS"
                ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 shadow-sm"
                : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <HelpCircle className="w-4 h-4" />
              </div>
              <span
                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                  faultStatus === "INSUFFICIENT_DOCS"
                    ? "border-amber-600 bg-amber-600 text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {faultStatus === "INSUFFICIENT_DOCS" && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
              </span>
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-950 font-heading">تعذر البت / طلب استيفاء</h4>
              <p className="text-[11px] text-amber-800 font-body mt-0.5 leading-tight">
                نقص مستندات أو أشعات أو حاجة لمناظرة إكلينيكية
              </p>
            </div>
          </button>
        </div>

        {/* حقول المعطيات الذكية المرتبطة بكل خيار */}
        {faultStatus === "FAULT_CONFIRMED" && (
          <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="form-label text-[11px] text-rose-950 font-bold">نوع الخطأ الطبي:</label>
                <select
                  value={faultCategory}
                  onChange={(e) => {
                    setFaultCategory(e.target.value);
                  }}
                  className="form-input text-xs bg-white"
                >
                  <option value="تشخيصي وعلاجي">خطأ تشخيصي وعلاجي</option>
                  <option value="جراحي وإجرائي">خطأ جراحي وإجرائي</option>
                  <option value="تخدير وعناية مركزة">خطأ تخدير وإنعاش</option>
                  <option value="دوائي وجرعات">خطأ دوائي ومغالاة في الجرعات</option>
                  <option value="إهمال رقابي وتأخر تدخل">إهمال رقابي وتأخر في التدخل الطارئ</option>
                </select>
              </div>

              <div>
                <label className="form-label text-[11px] text-rose-950 font-bold">جسامة الخطأ:</label>
                <select
                  value={faultSeverity}
                  onChange={(e) => {
                    setFaultSeverity(e.target.value);
                  }}
                  className="form-input text-xs bg-white"
                >
                  <option value="جسيم">خطأ فني جسيم لا يغتفر</option>
                  <option value="عادي">خطأ مهني عادي</option>
                  <option value="ترتب عليه عجز مستديم">ترتب عليه عجز مستديم</option>
                  <option value="أدى إلى وفاة المريض">أدى إلى وفاة المريض</option>
                </select>
              </div>

              <div>
                <label className="form-label text-[11px] text-rose-950 font-bold">رابطة السببية:</label>
                <select
                  value={causality}
                  onChange={(e) => {
                    setCausality(e.target.value);
                  }}
                  className="form-input text-xs bg-white"
                >
                  <option value="علاقة سببية مباشرة ومؤكدة بين الخطأ والضرر">علاقة سببية مباشرة ومؤكدة</option>
                  <option value="مساهمة جزئية مع الحالة السابقة للمريض">مساهمة جزئية مع اعتلال سابق</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => generateSmartDraft("FAULT_CONFIRMED")}
                className="inline-flex items-center gap-1.5 text-xs text-rose-700 hover:text-rose-900 font-bold bg-white px-2.5 py-1 rounded-lg border border-rose-300"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>تحديث نص التقرير بناءً على التصنيفات المختارة</span>
              </button>
            </div>
          </div>
        )}

        {faultStatus === "NO_FAULT" && (
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3">
            <div className="text-xs">
              <label className="form-label text-[11px] text-emerald-950 font-bold">السند الفني لانتفاء الخطأ:</label>
              <select
                value={noFaultReason}
                onChange={(e) => setNoFaultReason(e.target.value)}
                className="form-input text-xs bg-white"
              >
                <option value="مضاعفة طبية متعارف عليها علمياً تم التعامل معها وفق الأصول">مضاعفة طبية مقبولة علمياً مع اتخاذ الاحتياطات القياسية</option>
                <option value="التزام كامل بالبروتوكول العلاجي المعتمد لوزارة الصحة">التزام كامل بالبروتوكول العلاجي المعتمد</option>
                <option value="الضرر ناتج عن التطور الطبيعي للمرض أو تأخر وصول الحالة">الضرر ناتج عن التطور الطبيعي للحالة المرضية الحرجة</option>
                <option value="عدم اتباع المريض لتعليمات الطبيب المعالج">عدم التزام المريض بالتعليمات الطبية</option>
              </select>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => generateSmartDraft("NO_FAULT")}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 font-bold bg-white px-2.5 py-1 rounded-lg border border-emerald-300"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>تحديث نص التقرير بناءً على السند الفني</span>
              </button>
            </div>
          </div>
        )}

        {faultStatus === "INSUFFICIENT_DOCS" && (
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-3">
            <div className="text-xs">
              <label className="form-label text-[11px] text-amber-950 font-bold">المستندات والنواقص المطلوب استيفاؤها:</label>
              <input
                type="text"
                value={missingRequirements}
                onChange={(e) => setMissingRequirements(e.target.value)}
                placeholder="بيان الأشعات، تذكرة التخدير، تحقيقات النيابة..."
                className="form-input text-xs bg-white"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => generateSmartDraft("INSUFFICIENT_DOCS")}
                className="inline-flex items-center gap-1.5 text-xs text-amber-700 hover:text-amber-900 font-bold bg-white px-2.5 py-1 rounded-lg border border-amber-300"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>تحديث نص التقرير بمستندات الاستيفاء</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* حقل توصيف الخطأ */}
      <div className="form-group">
        <label htmlFor="faultDescription" className="form-label font-bold text-xs">
          توصيف الخطأ الطبي وحيثياته الفنية:
        </label>
        <textarea
          id="faultDescription"
          rows={4}
          value={faultDescription}
          onChange={(e) => setFaultDescription(e.target.value)}
          placeholder="التوصيف الفني الطبي الدقيق للواقعة..."
          className="form-input form-textarea text-sm leading-relaxed p-3.5 min-h-[120px]"
        />
      </div>

      {/* حقل نص التقرير الشامل */}
      <div className="form-group">
        <label htmlFor="reportText" className="form-label form-label-required font-bold text-xs">
          النص الكامل لتقرير اللجنة الفرعية:
        </label>
        <textarea
          id="reportText"
          rows={8}
          required
          value={reportText}
          onChange={(e) => setReportText(e.target.value)}
          placeholder="تفاصيل التقرير الطبي ومناقشات الأعضاء الفاحصين وسند النتائج..."
          className="form-input form-textarea text-sm leading-relaxed p-3.5 min-h-[200px]"
        />
      </div>

      {/* حقل الإجراء المتخذ والتوصية النهائية */}
      <div className="form-group">
        <label htmlFor="actionTaken" className="form-label form-label-required font-bold text-xs">
          التوصية الختامية والإجراء المقترح للجنة العليا:
        </label>
        <textarea
          id="actionTaken"
          rows={4}
          required
          value={actionTaken}
          onChange={(e) => setActionTaken(e.target.value)}
          placeholder="توصية اللجنة المرفوعة للجنة العليا (تعويض / حفظ / إحالة تأديبية / طلب استيفاء)..."
          className="form-input form-textarea text-sm leading-relaxed p-3.5 min-h-[120px]"
        />
      </div>

      {/* أزرار الإجراءات */}
      <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-slate-200">
        <Button
          type="submit"
          variant="secondary"
          size="md"
          loading={isPending && !finalizePending}
          icon={<Save className="w-4 h-4" />}
          className="w-full sm:w-auto"
        >
          حفظ كمسودة فنية
        </Button>

        <Button
          type="button"
          variant="primary"
          size="md"
          loading={finalizePending}
          onClick={() => submit(true)}
          icon={<Send className="w-4 h-4" />}
          className="w-full sm:flex-1"
        >
          اعتماد التقرير ورفعه رسمياً للجنة العليا
        </Button>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-900 font-body">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          تنبيه نظامي: اعتماد التقرير ورفعه سيغلق إمكانية التعديل على اللجنة الفرعية وتنتقل القضية لمرحلة "بانتظار اعتماد اللجنة العليا".
        </span>
      </div>
    </form>
  );
}
