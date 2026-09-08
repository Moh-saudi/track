"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const DECISION_OPTIONS = [
  {
    value: "APPROVE",
    label: "اعتماد قرار اللجنة الفرعية",
    description: "الموافقة على قرار اللجنة الفرعية كما هو",
    icon: "✅",
    cls: "border-emerald-400 bg-emerald-50 text-emerald-700",
  },
  {
    value: "REFER_BACK",
    label: "إحالة لإعادة الدراسة",
    description: "إعادة القضية للجنة فرعية أخرى أو نفس اللجنة",
    icon: "🔄",
    cls: "border-orange-400 bg-orange-50 text-orange-700",
  },
  {
    value: "DIFFERENT",
    label: "قرار مختلف",
    description: "إصدار قرار مغاير لقرار اللجنة الفرعية",
    icon: "📝",
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
          {DECISION_OPTIONS.map(opt => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-150
                ${decisionType === opt.value ? opt.cls + " border-current" : "border-gray-200 hover:border-gray-300 bg-white"}`}
            >
              <input
                type="radio"
                name="decisionType"
                value={opt.value}
                checked={decisionType === opt.value}
                onChange={() => setDecisionType(opt.value as any)}
                className="mt-1 accent-gov-700"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span>{opt.icon}</span>
                  <span className="font-medium text-sm">{opt.label}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{opt.description}</p>
              </div>
            </label>
          ))}
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
      <div className="pt-3 border-t border-gray-100">
        <button
          type="submit"
          disabled={isPending || !meetingDate || !decisionDetails}
          className="btn-primary w-full btn-lg"
        >
          {isPending ? (
            <><div className="loading-spinner" /><span>جارِ اعتماد القرار...</span></>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              اعتماد القرار النهائي
            </>
          )}
        </button>

        <p className="text-xs text-amber-600 mt-2 text-center">
          ⚠️ هذا الإجراء نهائي ولا يمكن التراجع عنه
        </p>
      </div>
    </form>
  );
}
