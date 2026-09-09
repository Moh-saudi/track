"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Clock, AlertCircle, CheckCircle2, Edit3, X, Save } from "lucide-react";
import { Button, Badge } from "@/components/ui";

export function MeetingDateManager({
  caseId,
  initialMeetingDate,
  initialReason,
  initialUpdatedAt,
  initialReschedules = [],
  readOnly = false,
  onDateSaved,
}: {
  caseId: string;
  initialMeetingDate?: Date | string | null;
  initialReason?: string | null;
  initialUpdatedAt?: Date | string | null;
  initialReschedules?: Array<{
    id: string;
    oldDate?: Date | string | null;
    newDate: Date | string;
    reason: string;
    createdAt: Date | string;
    createdBy?: { fullName: string } | null;
  }>;
  readOnly?: boolean;
  onDateSaved?: (date: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [meetingDate, setMeetingDate] = useState<string>(
    initialMeetingDate ? new Date(initialMeetingDate).toISOString().split("T")[0] : ""
  );
  const [reason, setReason] = useState<string>("");
  const [savedReason, setSavedReason] = useState<string | null>(initialReason || null);
  const [savedDate, setSavedDate] = useState<string | null>(
    initialMeetingDate
      ? new Date(initialMeetingDate).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : null
  );

  const [isEditing, setIsEditing] = useState(!initialMeetingDate && !readOnly);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // هل هذا تعديل على موعد محدد مسبقاً؟
  const isReschedule = !!initialMeetingDate;

  async function handleSaveDate(e: React.FormEvent) {
    e.preventDefault();
    if (!meetingDate) return;

    if (isReschedule && (!reason || reason.trim().length < 3)) {
      setError("يرجى كتابة سبب تعديل أو تأجيل موعد انعقاد الجلسة ليظهر في مرصد المتابعة والتوجيه");
      return;
    }

    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/cases/${caseId}/meeting`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            meetingDate,
            reason: isReschedule ? reason.trim() : undefined,
          }),
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
        if (isReschedule) {
          setSavedReason(reason.trim());
        }
        setIsEditing(false);
        setSuccess(data.message || "تم حفظ موعد انعقاد الجلسة بنجاح");
        if (onDateSaved) {
          onDateSaved(meetingDate);
        }
        router.refresh();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold font-heading text-slate-900">
              تاريخ وموعد انعقاد جلسة اللجنة الفرعية
            </h3>
            <p className="text-xs text-slate-500 font-body">
              المرحلة الأولى: جدولة الجلسة وإخطار مرصد المتابعة والتوجيه
            </p>
          </div>
        </div>

        {!isEditing && savedDate && (
          readOnly ? (
            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 font-body">
              معتمد (للاطلاع فقط)
            </span>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsEditing(true);
                setReason("");
                setError(null);
              }}
              icon={<Edit3 className="w-3.5 h-3.5" />}
            >
              تعديل أو تأجيل الموعد
            </Button>
          )
        )}
      </div>

      {error && (
        <div className="alert-error text-xs flex items-center gap-2 font-body">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert-success text-xs flex items-center gap-2 font-body">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {isEditing ? (
        <form onSubmit={handleSaveDate} className="space-y-4 pt-1 font-body">
          <div className="form-group">
            <label className="form-label form-label-required">
              {isReschedule
                ? "حدد الموعد الجديد لانعقاد الجلسة:"
                : "حدد تاريخ وموعد انعقاد الجلسة لفحص ومناقشة القضية:"}
            </label>
            <input
              type="date"
              required
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              className="form-input text-xs font-mono max-w-sm"
              dir="ltr"
            />
          </div>

          {isReschedule && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <label className="form-label form-label-required text-amber-950 font-bold m-0 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>سبب تعديل أو تأجيل موعد انعقاد الجلسة (إلزامي):</span>
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="اكتب التبرير الإداري أو الفني لتعديل الموعد (مثال: اعتذار استشاري التخدير عن الحضور لظرف طارئ وتكليف بديل، أو طلب استيفاء أشعات إضافية من النيابة)..."
                className="form-input form-textarea text-xs bg-white min-h-[90px]"
              />
              <p className="text-[11px] text-amber-800 font-normal">
                سيظهر هذا السبب وتاريخ التعديل مباشرة في شاشة مسؤول المتابعة والتوجيه بمرصد مدد اللجان.
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isPending}
              disabled={!meetingDate}
              icon={<Save className="w-3.5 h-3.5" />}
            >
              {isReschedule ? "تأكيد وتوثيق تعديل الموعد" : "حفظ وجدولة موعد الانعقاد"}
            </Button>
            {savedDate && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setIsEditing(false);
                  setError(null);
                }}
                icon={<X className="w-3.5 h-3.5" />}
              >
                إلغاء
              </Button>
            )}
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 flex items-center justify-between font-body">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-teal-200 text-teal-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs text-slate-500 font-medium block">
                  الموعد المعتمد لانعقاد جلسة الفحص:
                </span>
                <span className="text-base font-bold text-teal-900 font-mono">
                  {savedDate}
                </span>
              </div>
            </div>
            <Badge variant="teal" size="md">
              جلسة مجدولة رسمياً
            </Badge>
          </div>

          {initialReschedules.length > 0 ? (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-2 font-body">
              <div className="flex items-center justify-between font-bold text-amber-950 font-heading border-b border-amber-200 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  <span>سجل التعديلات والتأجيلات السابقة ({initialReschedules.length})</span>
                </span>
                <span className="text-[11px] text-amber-800 font-normal">موثق بمرصد التوجيه</span>
              </div>

              <div className="space-y-2">
                {initialReschedules.map((r, idx) => (
                  <div key={r.id} className="p-2.5 rounded-lg bg-white border border-amber-200/80 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-bold text-amber-900">تعديل رقم {initialReschedules.length - idx}</span>
                      <span className="font-mono">{new Date(r.createdAt).toLocaleDateString("en-GB")}</span>
                    </div>
                    <div className="text-slate-600 text-[11px] font-mono">
                      {r.oldDate && <span className="line-through text-slate-400 mr-1">{new Date(r.oldDate).toLocaleDateString("en-GB")}</span>}
                      <span className="font-bold text-teal-800">← {new Date(r.newDate).toLocaleDateString("en-GB")}</span>
                    </div>
                    <p className="text-slate-800 text-xs leading-relaxed">
                      <strong className="text-amber-950">السبب: </strong>
                      {r.reason}
                    </p>
                    {r.createdBy?.fullName && (
                      <span className="text-[10px] text-slate-400 block">بواسطة: {r.createdBy.fullName}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : savedReason ? (
            <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-xs space-y-1 font-body">
              <div className="flex items-center gap-1.5 font-bold text-amber-950 font-heading">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>آخر سبب مسجل لتعديل/تأجيل موعد الجلسة:</span>
              </div>
              <p className="text-amber-900 leading-relaxed pr-5">
                {savedReason}
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
