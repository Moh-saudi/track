"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function MeetingDateManager({
  caseId,
  initialMeetingDate,
}: {
  caseId: string;
  initialMeetingDate?: Date | string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [meetingDate, setMeetingDate] = useState<string>(
    initialMeetingDate ? new Date(initialMeetingDate).toISOString().split("T")[0] : ""
  );
  const [savedDate, setSavedDate] = useState<string | null>(
    initialMeetingDate
      ? new Date(initialMeetingDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : null
  );
  const [isEditing, setIsEditing] = useState(!initialMeetingDate);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSaveDate(e: React.FormEvent) {
    e.preventDefault();
    if (!meetingDate) return;

    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/meeting`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ meetingDate }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "تعذر حفظ تاريخ الانعقاد");

        setSavedDate(
          new Date(meetingDate).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        );
        setIsEditing(false);
        setSuccess(true);
        router.refresh();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  return (
    <div className="card border-slate-200 p-5 space-y-3 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
        <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
          <span>📅</span>
          <span>تاريخ وموعد انعقاد جلسة اللجنة الفرعية</span>
        </h3>
        {!isEditing && savedDate && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="text-[11px] font-bold text-[#1F4E79] hover:underline"
          >
            تعديل الموعد
          </button>
        )}
      </div>

      {error && <div className="alert-error text-xs">{error}</div>}
      {success && <div className="alert-success text-xs">تم تسجيل موعد انعقاد جلسة اللجنة بنجاح</div>}

      {isEditing ? (
        <form onSubmit={handleSaveDate} className="space-y-3 pt-1">
          <div className="form-group">
            <label className="form-label form-label-required">حدد تاريخ انعقاد الجلسة لفحص ومناقشة القضية:</label>
            <input
              type="date"
              required
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="form-input text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending || !meetingDate}
              className="btn-primary text-xs px-4 py-2 font-bold"
            >
              {isPending ? "جارٍ الحفظ..." : "تأكيد وحفظ موعد الانعقاد"}
            </button>
            {savedDate && (
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="btn-secondary text-xs px-3 py-2"
              >
                إلغاء
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[11px] text-slate-500 font-medium block">الموعد المحدد لانعقاد اللجنة:</span>
            <span className="text-xs font-black text-[#1F4E79]">{savedDate}</span>
          </div>
          <span className="px-2 py-0.5 rounded bg-white text-blue-800 text-[10px] font-bold border border-blue-200">
            جلسة مقررة
          </span>
        </div>
      )}
    </div>
  );
}
