import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { AdminUsersTable } from "./users-table";

const ROLE_LABELS: Record<string, string> = {
  ADMIN:               "مدير النظام",
  FOLLOW_UP_OFFICER:   "موظف المتابعة والتوجيه",
  REGISTRATION_CLERK:  "موظف التسجيل والقيد",
  SUBCOMMITTEE_MEMBER: "عضو / مقرر لجنة فاحصة",
  SUPREME_COMMITTEE:   "عضو اللجنة العليا",
  FINANCE:             "الشؤون المالية",
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN:               "bg-purple-100 text-purple-800 border border-purple-300",
  FOLLOW_UP_OFFICER:   "bg-blue-50 text-[#1F4E79] border border-blue-200 font-bold",
  REGISTRATION_CLERK:  "bg-blue-100 text-blue-800 border border-blue-300",
  SUBCOMMITTEE_MEMBER: "bg-teal-100 text-teal-800 border border-teal-300",
  SUPREME_COMMITTEE:   "bg-amber-100 text-amber-800 border border-amber-300",
  FINANCE:             "bg-emerald-100 text-emerald-800 border border-emerald-300",
};

export default async function AdminDashboard() {
  const [subCommittees, specialtiesCount, users, casesCount, paymentsCount] = await Promise.all([
    prisma.subCommittee.findMany({
      orderBy: { code: "asc" },
      include: {
        _count: { select: { members: true, cases: true } },
      },
    }),
    prisma.specialty.count(),
    prisma.user.findMany({
      orderBy: { fullName: "asc" },
      include: {
        subCommittee: { select: { name: true } },
        specialty: { select: { name: true } },
      },
    }),
    prisma.case.count(),
    prisma.payment.count(),
  ]);

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-xs font-black border border-purple-300">
              لوحة الإدارة العليا
            </span>
            <span className="text-xs text-slate-500 font-bold">رئاسة مجلس الوزراء</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            إدارة المستخدمين والصلاحيات والمنظومة
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            متابعة مستخدمي النظام، جهات العمل لفحص تعارض المصالح، وإحصائيات اللجان المعتمدة
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admin/subcommittees"
            className="btn-primary text-xs px-4 py-2.5"
          >
            🏛️ إدارة اللجان والتخصصات
          </Link>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5 border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1F4E79] border border-blue-200 flex items-center justify-center font-black text-xl shadow-sm">
            📋
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{casesCount}</p>
            <p className="text-xs font-bold text-slate-500">إجمالي القضايا والسجلات</p>
          </div>
        </div>

        <div className="card p-5 border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1F4E79]/10 text-[#1F4E79] border border-[#1F4E79]/20 flex items-center justify-center font-black text-xl shadow-sm">
            🏛️
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{subCommittees.length}</p>
            <p className="text-xs font-bold text-slate-500">الجهات واللجان المعتمدة</p>
          </div>
        </div>

        <div className="card p-5 border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center font-black text-xl shadow-sm">
            🩺
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{specialtiesCount}</p>
            <p className="text-xs font-bold text-slate-500">تخصص طبي معتمد</p>
          </div>
        </div>

        <div className="card p-5 border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center font-black text-xl shadow-sm">
            👥
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{users.length}</p>
            <p className="text-xs font-bold text-slate-500">المستخدمون المسجلون</p>
          </div>
        </div>
      </div>

      {/* جدول المستخدمين وجهات العمل */}
      <div className="card p-0 overflow-hidden border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-black text-slate-800">قائمة المستخدمين وجهات العمل المعتمدة</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">تُستخدم جهة العمل (Employer) في فحص تعارض المصالح الآلي</p>
          </div>
          <span className="text-xs font-bold text-slate-500">{users.length} مستخدم</span>
        </div>

        <AdminUsersTable users={users as any} />
      </div>
    </div>
  );
}
