import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { ScheduleClientView } from "./schedule-client-view";
import Link from "next/link";
import {
  Calendar,
  FileCheck,
  BarChart3,
  Users,
  Clock,
  CheckCircle2,
} from "lucide-react";

export const revalidate = 0;

export default async function SupremeSchedulePage() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  if (userRole !== "SUPREME_COMMITTEE" && userRole !== "ADMIN") {
    redirect("/dashboard");
  }

  const [sessions, supremeMembers, pendingCases] = await Promise.all([
    prisma.supremeSession.findMany({
      orderBy: { sessionDate: "asc" },
      include: {
        createdBy: { select: { fullName: true } },
        cases: {
          select: {
            id: true,
            caseNumber: true,
            caseYear: true,
            complainantName: true,
            hospitalName: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: "SUPREME_COMMITTEE", active: true },
      select: {
        id: true,
        fullName: true,
        email: true,
        employer: true,
      },
      orderBy: { fullName: "asc" },
    }),
    prisma.case.findMany({
      where: {
        status: { in: ["PENDING_SUPREME_REVIEW", "UNDER_SUBCOMMITTEE_REVIEW"] },
      },
      select: {
        id: true,
        caseNumber: true,
        caseYear: true,
        complainantName: true,
        hospitalName: true,
        subCommittee: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const now = new Date();
  const upcomingSessions = sessions.filter((s) => new Date(s.sessionDate) >= now);
  const totalCasesInSessions = sessions.reduce(
    (acc, s) => acc + s.cases.length,
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

      {/* ─── عرض التقويم وجدول الأجندة التفاعلي ─── */}
      <ScheduleClientView
        sessions={sessions as any}
        supremeMembers={supremeMembers}
        availableCases={pendingCases}
      />
    </div>
  );
}
