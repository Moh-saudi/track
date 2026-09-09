"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, FileText, AlertTriangle, ShieldCheck } from "lucide-react";

const DECISION_OPTIONS = [
  {
    value: "APPROVE",
    label: "اعتماد قرار اللجنة الفرعية",
    description: "الموافقة على قرار اللجنة الفرعية كما هو",
    icon: CheckCircle2,
    cls: "border-emerald-400 bg-emerald-50 text-emerald-700",
  },
  {
    value: "REFER_BACK",
    label: "إحالة لإعادة الدراسة",
    description: "إعادة القضية للجنة فرعية أخرى أو نفس اللجنة",
    icon: RotateCcw,
    cls: "border-amber-400 bg-amber-50 text-amber-700",
  },
  {
    value: "DIFFERENT",
    label: "قرار مختلف",
    description: "إصدار قرار مغاير لقرار اللجنة الفرعية",
    icon: FileText,
    cls: "border-purple-400 bg-purple-50 text-purple-700",
  },
];

export function DecisionForm({
  caseId,
  subCommittees,
}: {
  caseId: string;
  subCommittees: { id: string; name: string; code: string }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [meetingDate,           setMeetingDate]           = useState("");
  const [decisionType,          setDecisionType]          = useState<"APPROVE" | "REFER_BACK" | "DIFFERENT">("APPROVE");
  const [decisionDetails,       setDecisionDetails]       = useState("");
  const [referredSubCommitteeId, setReferredSubCommitteeId] = useState("");
  const [error,                 setError]                 = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await fetch(`/api/cases/${caseId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingDate,
          decisionType,
          decisionDetails,
          referredSubCommitteeId: decisionType === "REFER_BACK" ? referredSubCommitteeId : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "تعذّر حفظ القرار");
        return;
      }

      router.push("/dashboard/supreme");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <div className="alert-error mb-4">{error}</div>}

      {/* تاريخ الانعقاد */}
      <div className="form-group">
        <label htmlFor="meetingDate" className="label label-required">
          تاريخ انعقاد اللجنة العليا
        </label>
        <input
          id="meetingDate"
          type="date"
          required
          value={meetingDate}
          onChange={e => setMeetingDate(e.target.value)}
          className="input"
        />
      </div>

      {/* نوع القرار — بطاقات اختيار */}
      <div className="form-group">
        <label className="label label-required">نوع القرار</label>
        <div className="grid grid-cols-1 gap-3 mt-1">
          {DECISION_OPTIONS.map(opt => {
            const OptionIcon = opt.icon;
            return (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-150
                  ${decisionType === opt.value ? opt.cls + " border-current" : "border-slate-200 hover:border-slate-300 bg-white"}`}
              >
                <input
                  type="radio"
                  name="decisionType"
                  value={opt.value}
                  checked={decisionType === opt.value}
                  onChange={() => setDecisionType(opt.value as any)}
                  className="mt-1 accent-teal-600"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <OptionIcon className="w-4 h-4" />
                    <span className="font-semibold text-sm font-heading">{opt.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* اللجنة المحال إليها — تظهر فقط عند اختيار REFER_BACK */}
      {decisionType === "REFER_BACK" && (
        <div className="form-group">
          <label htmlFor="referredSC" className="label label-required">
            اللجنة الفرعية المحال إليها
          </label>
          <select
            id="referredSC"
            required
            value={referredSubCommitteeId}
            onChange={e => setReferredSubCommitteeId(e.target.value)}
            className="input"
          >
            <option value="">— اختر اللجنة —</option>
            {subCommittees.map(sc => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* تفاصيل القرار */}
      <div className="form-group">
        <label htmlFor="decisionDetails" className="label label-required">
          تفاصيل القرار ومبرراته
        </label>
        <textarea
          id="decisionDetails"
          rows={5}
          required
          value={decisionDetails}
          onChange={e => setDecisionDetails(e.target.value)}
          placeholder="اكتب تفاصيل القرار ومبرراته بشكل كامل..."
          className="input resize-none"
        />
        <span className="text-xs text-gray-400 block mt-1 text-left">{decisionDetails.length} حرف</span>
      </div>

      {/* زر الاعتماد */}
      <div className="pt-3 border-t border-slate-100">
        <button
          type="submit"
          disabled={isPending || !meetingDate || !decisionDetails}
          className="w-full h-11 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-heading"
        >
          {isPending ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>جارِ اعتماد القرار...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              <span>اعتماد القرار النهائي</span>
            </>
          )}
        </button>

        <p className="text-xs text-amber-700 mt-2 text-center flex items-center justify-center gap-1 font-body">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>هذا الإجراء نهائي ولا يمكن التراجع عنه</span>
        </p>
      </div>
    </form>
  );
}
