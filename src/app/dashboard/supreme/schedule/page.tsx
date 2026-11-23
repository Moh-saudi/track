"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ScheduleClientView } from "./schedule-client-view";
import {
  Calendar,
  FileCheck,
  BarChart3,
  Users,
  Clock,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function SupremeSchedulePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [supremeMembers, setSupremeMembers] = useState<any[]>([]);
  const [pendingCases, setPendingCases] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/supreme/sessions");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "تعذر جلب بيانات الجلسات");
      }
      const data = await res.json();
      const rawSessions = Array.isArray(data.sessions) ? data.sessions : [];
      const cleanSessions = rawSessions.map((s: any) => ({
        id: s.id,
        sessionNumber: s.sessionNumber || "جلسة بدون عنوان",
        sessionDate: s.sessionDate || new Date().toISOString(),
        location: s.location || null,
        status: s.status || "SCHEDULED",
        notes: s.notes || null,
        createdBy: s.createdBy ? { fullName: s.createdBy.fullName } : null,
        cases: Array.isArray(s.cases) ? s.cases : [],
      }));

      setSessions(cleanSessions);
      setSupremeMembers(Array.isArray(data.supremeMembers) ? data.supremeMembers : []);
      setPendingCases(Array.isArray(data.availableCases) ? data.availableCases : []);
    } catch (err: any) {
      console.error("Load schedule error:", err);
      setError(err.message || "حدث خطأ أثناء تحميل بيانات الجدول");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const now = new Date();
  const upcomingSessions = sessions.filter((s) => {
    try {
      return new Date(s.sessionDate) >= now;
    } catch {
      return false;
    }
  });

  const totalCasesInSessions = sessions.reduce(
    (acc, s) => acc + (Array.isArray(s.cases) ? s.cases.length : 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* ─── ترويسة الصفحة ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "اللجنة العليا", href: "/dashboard/supreme" },
          { label: "أجندة وخطة الانعقاد" },
        ]}
        title="أجندة وخطة انعقاد جلسات اللجنة العليا"
        description="تقويم تفاعلي وجدول أعمال دوري لتنظيم مواعيد جلسات انعقاد الدائرة العليا وإرسال الدعوات المنسقة للأعضاء عبر الواتساب والبريد الإلكتروني."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/supreme/cases"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs font-body"
            >
              <FileCheck className="w-3.5 h-3.5 text-teal-600" />
              <span>مراجعة السجلات والقرارات</span>
            </Link>
            <Link
              href="/dashboard/supreme"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-xs font-body"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>لوحة المؤشرات والتحليلات</span>
            </Link>
          </div>
        }
      />

      {/* ─── بطاقات المؤشرات التنفيذية للجدولة ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="الجلسات القادمة المجدولة"
          value={upcomingSessions.length}
          icon={<Clock className="w-6 h-6" />}
          variant={upcomingSessions.length > 0 ? "teal" : "slate"}
        />
        <StatCard
          title="السجلات المدرجة على الجداول"
          value={totalCasesInSessions}
          icon={<Calendar className="w-6 h-6" />}
          variant="sky"
        />
        <StatCard
          title="سجلات بانتظار إدراجها بالجدول"
          value={pendingCases.length}
          icon={<FileCheck className="w-6 h-6" />}
          variant={pendingCases.length > 0 ? "amber" : "emerald"}
        />
        <StatCard
          title="أعضاء اللجنة العليا المعتمدين"
          value={supremeMembers.length}
          icon={<Users className="w-6 h-6" />}
          variant="slate"
        />
      </div>

      {/* ─── حالة التحميل أو الخطأ أو عرض المكون ─── */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-16 flex flex-col items-center justify-center gap-3 text-slate-500 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <p className="text-sm font-semibold font-body">جارٍ تحميل أجندة وتقويم جلسات اللجنة العليا...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-3xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-rose-900 font-heading">تعذر تحميل بيانات الأجندة</h3>
            <p className="text-xs text-rose-700 font-body mt-1">{error}</p>
          </div>
          <Button type="button" variant="primary" size="sm" onClick={loadData} icon={<RefreshCw className="w-3.5 h-3.5" />}>
            إعادة المحاولة
          </Button>
        </div>
      ) : (
        <ScheduleClientView
          sessions={sessions}
          supremeMembers={supremeMembers}
          availableCases={pendingCases}
        />
      )}
    </div>
  );
}
