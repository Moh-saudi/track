"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Send,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Stethoscope,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  SUBCOMMITTEE_FINDINGS,
  SubCommitteeFinding,
  FINDING_CONFIG,
} from "@/lib/subcommittee-findings";

interface SubCommitteeReportFormProps {
  caseId: string;
  meetingDate?: Date | string | null;
  respondentName?: string | null;
  hospitalName?: string | null;
  entityType?: string | null;
  entityName?: string | null;
  complainantName?: string | null;
}

export function SubCommitteeReportForm({
  caseId,
  meetingDate,
  respondentName,
  hospitalName,
  entityType,
  entityName,
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

  const [reportDate, setReportDate] = useState(todayStr);
  const [selectedFinding, setSelectedFinding] = useState<SubCommitteeFinding>(
    "لا يوجد خطأ طبي ولا مضاعفة طبية"
  );
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(finalize: boolean) {
    setError(null);
    if (!selectedFinding) {
      setError("يرجى اختيار نتيجة دراسة اللجنة الفرعية من الخيارات الخمسة المعتمدة.");
      return;
    }

    if (finalize) {
      setFinalizePending(true);
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/report`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingDate: meetingDateStr,
            reportDate: reportDate || undefined,
            faultDescription: selectedFinding,
            actionTaken: selectedFinding,
            reportText: notes.trim() ? notes.trim() : selectedFinding,
            notes: notes.trim() || undefined,
            finalize,
          }),
        });

        setFinalizePending(false);

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const errMessage =
            typeof body.error === "string"
              ? body.error
              : typeof body.error === "object"
              ? Object.values(body.error).flat().join(" - ")
              : "تعذّر حفظ دراسة اللجنة — تحقق من صحة البيانات";
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

  function getOptionIcon(idx: number) {
    switch (idx) {
      case 0:
        return <ShieldCheck className="w-5 h-5 text-emerald-700" />;
      case 1:
        return <CheckCircle2 className="w-5 h-5 text-teal-700" />;
      case 2:
        return <Stethoscope className="w-5 h-5 text-amber-700" />;
      case 3:
        return <AlertTriangle className="w-5 h-5 text-rose-700" />;
      case 4:
        return <Building2 className="w-5 h-5 text-purple-700" />;
      default:
        return <CheckCircle2 className="w-5 h-5" />;
    }
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <div className="form-group">
          <label className="form-label text-xs font-semibold text-slate-700">
            تاريخ انعقاد جلسة اللجنة الفرعية:
          </label>
          <div className="h-10 px-3 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-mono font-bold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-teal-700" />
            <span>{meetingDateStr}</span>
            <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 font-body mr-auto">
              الجلسة المعتمدة
            </span>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="reportDate" className="form-label form-label-required text-xs font-semibold text-slate-700">
            تاريخ صدور التقرير والقرار:
          </label>
          <input
            id="reportDate"
            type="date"
            required
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="form-input text-xs font-mono"
            dir="ltr"
          />
        </div>
      </div>

      {/* ─── الاختيارات الخمسة الحصرية لدراسة اللجنة الفرعية ─── */}
      <div className="space-y-3">
        <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold font-heading text-slate-900">
              قرار ونتيجة دراسة اللجنة الفرعية:
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              اختر قراراً واحداً فقط من الخيارات الرسمية الخمسة المعتمدة لرفعه للجنة العليا.
            </p>
          </div>
          <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
            5 خيارات معتمدة
          </span>
        </div>

        <div className="space-y-2.5">
          {SUBCOMMITTEE_FINDINGS.map((findingText, idx) => {
            const isSelected = selectedFinding === findingText;
            const config = FINDING_CONFIG[findingText];

            return (
              <label
                key={findingText}
                onClick={() => setSelectedFinding(findingText)}
                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? `${config.bg} ${config.border} ring-2 ${config.ring} shadow-xs`
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/70"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                      isSelected
                        ? "bg-white border-current"
                        : "bg-slate-100 border-slate-200 text-slate-500"
                    }`}
                  >
                    {getOptionIcon(idx)}
                  </div>

                  <div>
                    <span
                      className={`text-sm font-bold font-heading block ${
                        isSelected ? config.color : "text-slate-800"
                      }`}
                    >
                      {findingText}
                    </span>
                    <span className="text-[11px] text-slate-500 font-body">
                      قرار فني رسمي صادر عن دراسة اللجنة الفرعية
                    </span>
                  </div>
                </div>

                <div className="shrink-0 mr-3">
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "border-teal-700 bg-teal-700 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* حقل ملاحظات إضافية اختياري وموجز */}
      <div className="form-group pt-2 border-t border-slate-100">
        <label htmlFor="notes" className="form-label text-xs font-semibold text-slate-700">
          ملاحظات فنية أو إدارية إضافية (اختياري):
        </label>
        <textarea
          id="notes"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أي إيضاح موجز تود اللجنة الفرعية إرفاقه بالقرار..."
          className="form-input form-textarea text-xs p-3 min-h-[60px]"
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
          حفظ كمسودة
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
          اعتماد دراسة اللجنة ورفعها رسمياً للجنة العليا
        </Button>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs text-amber-900 font-body">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          تنبيه نظامي: بمجرد اعتماد القرار ورفعه، ستنتقل القضية فوراً إلى اللجنة العليا بمرحلة "بانتظار اعتماد اللجنة العليا"، مع إغلاق إمكانية التعديل على اللجنة الفرعية.
        </span>
      </div>
    </form>
  );
}
