"use client";

import { useState } from "react";
import { formatDate } from "@/lib/formatters";
import {
  Calendar,
  Clock,
  MapPin,
  FileText,
  Share2,
  Mail,
  Download,
  X,
  Check,
  ExternalLink,
  MessageSquare,
  Users,
} from "lucide-react";

interface Props {
  session: {
    id: string;
    sessionNumber: string;
    sessionDate: string | Date;
    location: string | null;
    notes: string | null;
    cases: Array<{
      id: string;
      caseNumber: string;
      caseYear: number;
      complainantName: string | null;
      hospitalName: string | null;
    }>;
  };
  supremeMembers: Array<{
    id: string;
    fullName: string;
    email: string;
    employer?: string | null;
  }>;
  onClose: () => void;
}

export function SessionInviteModal({ session, supremeMembers, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const dateObj = new Date(session.sessionDate);
  const formattedDate = dateObj.toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = dateObj.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const casesListText =
    session.cases.length > 0
      ? session.cases
          .map(
            (c, idx) =>
              `  ${idx + 1}. سجل رقم ${c.caseNumber}/${c.caseYear} ${
                c.complainantName ? `(الشاكي: ${c.complainantName})` : ""
              }`
          )
          .join("\n")
      : "  لا توجد سجلات مدرجة بعد";

  const inviteMessage = `جمهورية مصر العربية 🇪🇬
رئاسة مجلس الوزراء — اللجنة العليا للمسؤولية الطبية

سعادة المستشار / الطبيب عضو اللجنة العليا الموقر،
تحية طيبة وبعد،،

نتشرف بدعوة سيادتكم لحضور اجتماع اللجنة العليا:
📋 الجلسة: ${session.sessionNumber}
📅 الموعد: ${formattedDate} — الساعة ${formattedTime}
📍 المقر: ${session.location || "قاعة اجتماعات اللجنة العليا"}

📂 جدول الأعمال المعروض (${session.cases.length} سجلات):
${casesListText}
${session.notes ? `\n📌 ملاحظات: ${session.notes}\n` : ""}
🔗 للاطلاع على الملفات وإصدار القرارات عبر المنظومة:
${typeof window !== "undefined" ? window.location.origin : ""}/dashboard/supreme/cases

شاكرين لسيادتكم كريم التعاون.
الأمانة الفنية للجنة العليا للمسؤولية الطبية`;

  // WhatsApp link
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(
    inviteMessage
  )}`;

  // Email mailto
  const emailsList = supremeMembers
    .map((m) => m.email)
    .filter(Boolean)
    .join(",");
  const emailSubject = encodeURIComponent(
    `دعوة لحضور ${session.sessionNumber} — اللجنة العليا للمسؤولية الطبية`
  );
  const emailBody = encodeURIComponent(inviteMessage);
  const mailtoUrl = `mailto:${emailsList}?subject=${emailSubject}&body=${emailBody}`;

  // Generate .ics file for Google Calendar / Apple / Outlook
  function downloadIcs() {
    const startTime = dateObj
      .toISOString()
      .replace(/-|:|\.\d+/g, "")
      .slice(0, 15) + "Z";
    const endTime = new Date(dateObj.getTime() + 2 * 60 * 60 * 1000)
      .toISOString()
      .replace(/-|:|\.\d+/g, "")
      .slice(0, 15) + "Z";

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Medical Liability Supreme Committee//Session Schedule//AR
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:session-${session.id}@medical-liability.gov.eg
DTSTAMP:${startTime}
DTSTART:${startTime}
DTEND:${endTime}
SUMMARY:${session.sessionNumber} - اللجنة العليا للمسؤولية الطبية
DESCRIPTION:${inviteMessage.replace(/\n/g, "\\n")}
LOCATION:${session.location || "قاعة الاجتماعات"}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `جلسة-${session.sessionNumber}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleCopy() {
    navigator.clipboard.writeText(inviteMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-body">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* الترويسة */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-slate-900">
                دعوة أعضاء اللجنة العليا للانعقاد
              </h3>
              <p className="text-xs text-slate-500">
                {session.sessionNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* بطاقة ملخص الموعد */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs text-slate-700">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm font-heading">
            <Calendar className="w-4 h-4 text-teal-600" />
            <span>{formattedDate}</span>
            <span className="text-slate-400 font-normal">|</span>
            <Clock className="w-4 h-4 text-teal-600" />
            <span className="font-mono">{formattedTime}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{session.location || "قاعة اجتماعات اللجنة العليا"}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              عدد السجلات المعروضة بالجلسة: <strong>{session.cases.length}</strong> سجل طبي
            </span>
          </div>
        </div>

        {/* قائمة أعضاء اللجنة العليا المستهدفين */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-teal-600" />
              <span>أعضاء اللجنة العليا المدعوون ({supremeMembers.length})</span>
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-xl bg-slate-50 border border-slate-200">
            {supremeMembers.length === 0 ? (
              <span className="text-xs text-slate-400">لا يوجد أعضاء مقيدين حالياً</span>
            ) : (
              supremeMembers.map((m) => (
                <span
                  key={m.id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-800 text-[11px] font-medium shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                  <span>{m.fullName}</span>
                </span>
              ))
            )}
          </div>
        </div>

        {/* أزرار الإرسال والمشاركة */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-900 font-heading mb-2">
            خيارات إرسال وتوجيه الدعوة:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* زر الواتساب */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-xs group"
            >
              <MessageSquare className="w-4 h-4" />
              <span>إرسال عبر الواتساب (WhatsApp)</span>
              <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100 mr-auto" />
            </a>

            {/* زر البريد الإلكتروني */}
            <a
              href={mailtoUrl}
              className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs transition-colors shadow-xs group"
            >
              <Mail className="w-4 h-4" />
              <span>إرسال عبر البريد الإلكتروني</span>
              <ExternalLink className="w-3 h-3 opacity-70 group-hover:opacity-100 mr-auto" />
            </a>

            {/* تنزيل ملف التقويم .ics */}
            <button
              type="button"
              onClick={downloadIcs}
              className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs"
            >
              <Download className="w-4 h-4 text-teal-600" />
              <span>إضافة لتقويم جوجل / Outlook (.ics)</span>
            </button>

            {/* نسخ نص الدعوة */}
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 h-11 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">تم نسخ نص الدعوة!</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>نسخ نص الدعوة الرسمي</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* زر الإغلاق */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 h-9 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-semibold text-xs transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
