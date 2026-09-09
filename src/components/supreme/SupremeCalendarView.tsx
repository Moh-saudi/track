"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/formatters";
import { SessionInviteModal } from "./SessionInviteModal";
import {
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  List,
  Clock,
  MapPin,
  FileText,
  Share2,
  Trash2,
  AlertCircle,
  Plus,
  Users,
} from "lucide-react";

export interface SupremeSessionItem {
  id: string;
  sessionNumber: string;
  sessionDate: string | Date;
  location: string | null;
  status: string;
  notes: string | null;
  createdBy?: { fullName: string } | null;
  cases: Array<{
    id: string;
    caseNumber: string;
    caseYear: number;
    complainantName: string | null;
    hospitalName: string | null;
  }>;
}

interface Props {
  sessions: SupremeSessionItem[];
  supremeMembers: Array<{
    id: string;
    fullName: string;
    email: string;
    employer?: string | null;
  }>;
  onOpenCreateModal: () => void;
}

const WEEKDAYS = [
  "السبت",
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
];

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

export function SupremeCalendarView({
  sessions,
  supremeMembers,
  onOpenCreateModal,
}: Props) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"calendar" | "agenda">("calendar");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [selectedSessionForInvite, setSelectedSessionForInvite] =
    useState<SupremeSessionItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  function prevMonth() {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  }

  function nextMonth() {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  // Calendar cells computation
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // In Arabic calendar starting Saturday (0 in our array):
    // JS getDay(): 0 is Sunday, 1 is Monday, ..., 6 is Saturday
    // Mapping to Saturday as 0:
    // Sat = 0, Sun = 1, Mon = 2, Tue = 3, Wed = 4, Thu = 5, Fri = 6
    const getSatIndex = (d: Date) => (d.getDay() + 1) % 7;

    const startDayIndex = getSatIndex(firstDayOfMonth);
    const totalDays = lastDayOfMonth.getDate();

    const cells: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      sessions: SupremeSessionItem[];
    }> = [];

    // Previous month filler days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
      cells.push({
        date: d,
        isCurrentMonth: false,
        isToday: false,
        sessions: [],
      });
    }

    const todayStr = new Date().toISOString().split("T")[0];

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const dStr = d.toISOString().split("T")[0];
      const daySessions = sessions.filter((s) => {
        const sDateStr = new Date(s.sessionDate).toISOString().split("T")[0];
        return sDateStr === dStr;
      });

      cells.push({
        date: d,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        sessions: daySessions,
      });
    }

    // Next month filler days to complete grid (42 cells = 6 weeks)
    const remaining = 42 - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const d = new Date(currentYear, currentMonth + 1, day);
      cells.push({
        date: d,
        isCurrentMonth: false,
        isToday: false,
        sessions: [],
      });
    }

    return cells;
  }, [currentYear, currentMonth, sessions]);

  async function handleDelete(sessionId: string) {
    if (!confirm("هل أنت متأكد من رغبتك في إلغاء وحذف هذه الجلسة؟")) return;
    setDeletingId(sessionId);
    try {
      await fetch(`/api/supreme/sessions/${sessionId}`, { method: "DELETE" });
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4 font-body">
      {/* ─── شريط التحكم في التقويم وعرض الأجندة ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
        {/* اختيار الشهر والتنقل */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-slate-700 hover:bg-white hover:shadow-2xs transition-all"
              title="الشهر التالي"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-slate-700 hover:bg-white hover:shadow-2xs transition-all"
              title="الشهر السابق"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={goToToday}
            className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors shadow-2xs"
          >
            اليوم
          </button>

          <h2 className="text-base sm:text-lg font-bold font-heading text-slate-900 mr-2">
            {ARABIC_MONTHS[currentMonth]} {currentYear}
          </h2>
        </div>

        {/* التبديل بين العرض الشبكي والأجندة وزر الجدولة */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "calendar"
                  ? "bg-white text-teal-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>تقويم شهري</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "agenda"
                  ? "bg-white text-teal-800 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>جدول الأجندة ({sessions.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">جدولة جلسة انعقاد</span>
          </button>
        </div>
      </div>

      {/* ─── ١. عرض التقويم الشبكي (Google Calendar Style) ─── */}
      {viewMode === "calendar" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {/* أسماء أيام الأسبوع */}
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80 text-center text-xs font-bold font-heading text-slate-600 py-3">
            {WEEKDAYS.map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>

          {/* شبكة الأيام */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 border-b border-slate-100">
            {calendarCells.map((cell, idx) => {
              const dayNum = cell.date.getDate();

              return (
                <div
                  key={idx}
                  className={`min-h-[115px] p-2 flex flex-col justify-between transition-colors ${
                    cell.isCurrentMonth
                      ? "bg-white hover:bg-slate-50/50"
                      : "bg-slate-50/40 text-slate-300"
                  }`}
                >
                  {/* رقم اليوم ومؤشر اليوم الحالي */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center justify-center text-xs font-mono font-bold w-6 h-6 rounded-full ${
                        cell.isToday
                          ? "bg-teal-600 text-white shadow-xs"
                          : cell.isCurrentMonth
                          ? "text-slate-800"
                          : "text-slate-400"
                      }`}
                    >
                      {dayNum}
                    </span>

                    {cell.sessions.length > 0 && (
                      <span className="text-[10px] font-mono text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded-full font-bold">
                        {cell.sessions.length} جلسة
                      </span>
                    )}
                  </div>

                  {/* بطاقات الجلسات المجدولة في هذا اليوم */}
                  <div className="space-y-1.5 my-1 overflow-y-auto max-h-[75px]">
                    {cell.sessions.map((s) => {
                      const timeStr = new Date(s.sessionDate).toLocaleTimeString(
                        "ar-EG",
                        { hour: "2-digit", minute: "2-digit" }
                      );

                      return (
                        <div
                          key={s.id}
                          onClick={() => setSelectedSessionForInvite(s)}
                          className="group p-1.5 rounded-xl bg-teal-50/90 hover:bg-teal-100 border border-teal-200/80 cursor-pointer transition-all shadow-2xs"
                          title="انقر لفتح الدعوات وتفاصيل الجلسة"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold text-teal-950 truncate font-heading">
                            <span className="truncate">{s.sessionNumber}</span>
                            <span className="font-mono text-[10px] text-teal-700 font-normal shrink-0 mr-1">
                              {timeStr}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-teal-800 font-mono mt-0.5">
                            <span>{s.cases.length} سجلات</span>
                            <Share2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 text-teal-700 transition-opacity" />
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── ٢. عرض الأجندة وقائمة المواعيد (Agenda View) ─── */}
      {viewMode === "agenda" && (
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-800 text-sm font-heading">
                لا توجد جلسات انعقاد مجدولة حتى الآن
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto font-body">
                يمكنك جدولة أول جلسة وتحديد موعدها وقاعتها وإدراج السجلات الطبية
                المعروضة ودعوة الأعضاء عبر الواتساب والإيميل.
              </p>
              <button
                type="button"
                onClick={onOpenCreateModal}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>جدولة جلسة الآن</span>
              </button>
            </div>
          ) : (
            sessions.map((s) => {
              const d = new Date(s.sessionDate);
              const formattedDate = d.toLocaleDateString("ar-EG", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              });
              const formattedTime = d.toLocaleTimeString("ar-EG", {
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={s.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:border-teal-400/60 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
                      <h3 className="text-base font-bold font-heading text-slate-900">
                        {s.sessionNumber}
                      </h3>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-800 border border-teal-200 font-mono">
                        {s.cases.length} سجلات معروضة
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-teal-600" />
                        <span className="font-semibold text-slate-800">
                          {formattedDate}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono">
                        <Clock className="w-3.5 h-3.5 text-teal-600" />
                        <span>الساعة {formattedTime}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{s.location || "قاعة اجتماعات اللجنة العليا"}</span>
                      </div>
                    </div>

                    {/* قائمة السجلات المعروضة في الجلسة */}
                    {s.cases.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {s.cases.map((c) => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 text-[11px] font-mono border border-slate-200"
                          >
                            <FileText className="w-3 h-3 text-slate-500" />
                            <span>
                              {c.caseNumber}/{c.caseYear}
                            </span>
                            {c.complainantName && (
                              <span className="text-slate-500 font-sans">
                                ({c.complainantName})
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    {s.notes && (
                      <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-xl border border-slate-100 max-w-xl">
                        {s.notes}
                      </p>
                    )}
                  </div>

                  {/* أزرار الإجراءات في الأجندة */}
                  <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                    <button
                      type="button"
                      onClick={() => setSelectedSessionForInvite(s)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors shadow-xs"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>إرسال دعوة (واتساب / إيميل)</span>
                    </button>

                    <button
                      type="button"
                      disabled={deletingId === s.id}
                      onClick={() => handleDelete(s.id)}
                      className="p-2 rounded-xl border border-slate-300 hover:border-rose-300 hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                      title="إلغاء الجلسة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* نافذة إرسال الدعوات المنبثقة */}
      {selectedSessionForInvite && (
        <SessionInviteModal
          session={selectedSessionForInvite}
          supremeMembers={supremeMembers}
          onClose={() => setSelectedSessionForInvite(null)}
        />
      )}
    </div>
  );
}
