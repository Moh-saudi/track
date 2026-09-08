"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function SubCommitteeReportForm({ caseId }: { caseId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [finalizePending, setFinalizePending] = useState(false);

  const [receivedDate,     setReceivedDate]     = useState("");
  const [meetingDate,      setMeetingDate]       = useState("");
  const [faultDescription, setFaultDescription] = useState("");
  const [reportDate,       setReportDate]       = useState("");
  const [reportText,       setReportText]       = useState("");
  const [actionTaken,      setActionTaken]      = useState("");
  const [error,            setError]            = useState<string | null>(null);

  async function submit(finalize: boolean) {
    setError(null);
    if (finalize) setFinalizePending(true);

    startTransition(async () => {
      const res = await fetch(`/api/cases/${caseId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receivedDate,
          meetingDate:      meetingDate  || undefined,
          faultDescription: faultDescription || undefined,
          reportDate:       reportDate   || undefined,
          reportText:       reportText   || undefined,
          actionTaken:      actionTaken  || undefined,
          finalize,
        }),
      });

      setFinalizePending(false);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "تعذّر الحفظ — تحقق من البيانات");
        return;
      }

      router.push("/dashboard/subcommittee");
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={e => { e.preventDefault(); submit(false); }}
      noValidate
    >
      {error && (
        <div className="alert-error mb-4">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* تاريخ الاستلام */}
        <div className="form-group">
          <label htmlFor="receivedDate" className="label label-required">تاريخ استلام القضية</label>
          <input
            id="receivedDate"
            type="date"
            required
            value={receivedDate}
            onChange={e => setReceivedDate(e.target.value)}
            className="input"
          />
        </div>

        {/* تاريخ الانعقاد */}
        <div className="form-group">
          <label htmlFor="meetingDate" className="label">تاريخ انعقاد اللجنة</label>
          <input
            id="meetingDate"
            type="date"
            value={meetingDate}
            onChange={e => setMeetingDate(e.target.value)}
            className="input"
          />
        </div>
      </div>

      {/* توصيف الخطأ */}
      <div className="form-group">
        <label htmlFor="faultDescription" className="label">توصيف الخطأ الطبي</label>
        <textarea
          id="faultDescription"
          rows={3}
          value={faultDescription}
          onChange={e => setFaultDescription(e.target.value)}
          placeholder="وصف تفصيلي للخطأ الطبي المُوصَّف..."
          className="input resize-none"
        />
      </div>

      {/* تاريخ إصدار التقرير */}
      <div className="form-group">
        <label htmlFor="reportDate" className="label">
          تاريخ إصدار التقرير
          <span className="text-xs text-gray-400 font-normal mr-2">(يجب أن يكون بعد تاريخ الانعقاد)</span>
        </label>
        <input
          id="reportDate"
          type="date"
          value={reportDate}
          onChange={e => setReportDate(e.target.value)}
          className="input"
          min={meetingDate || undefined}
        />
      </div>

      {/* نص التقرير */}
      <div className="form-group">
        <label htmlFor="reportText" className="label">نص تقرير اللجنة</label>
        <textarea
          id="reportText"
          rows={4}
          value={reportText}
          onChange={e => setReportText(e.target.value)}
          placeholder="النص الكامل لتقرير اللجنة الفرعية..."
          className="input resize-none"
        />
      </div>

      {/* الإجراء المتخذ */}
      <div className="form-group">
        <label htmlFor="actionTaken" className="label">الإجراء المتخذ / التوصية</label>
        <textarea
          id="actionTaken"
          rows={3}
          value={actionTaken}
          onChange={e => setActionTaken(e.target.value)}
          placeholder="ما هي توصية اللجنة أو الإجراء المقترح؟"
          className="input resize-none"
        />
      </div>

      {/* أزرار الحفظ */}
      <div className="flex gap-3 pt-3 border-t border-gray-100">
        <button
          type="submit"
          disabled={isPending || !receivedDate}
          className="btn-secondary"
        >
          {isPending && !finalizePending ? (
            <><div className="loading-spinner" /><span>جارِ الحفظ...</span></>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              حفظ كمسودة
            </>
          )}
        </button>

        <button
          type="button"
          disabled={isPending || !receivedDate}
          onClick={() => submit(true)}
          className="btn-primary flex-1"
        >
          {finalizePending ? (
            <><div className="loading-spinner" /><span>جارِ الرفع...</span></>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              حفظ ورفع للجنة العليا
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-amber-600 mt-2 bg-amber-50 px-3 py-2 rounded-lg">
        ⚠️ الرفع للجنة العليا سيغلق التقرير ولن يمكن تعديله لاحقاً إلا بعد قرار اللجنة العليا
      </p>
    </form>
  );
}
