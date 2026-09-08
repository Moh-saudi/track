import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { authOptions } from "@/lib/auth";
import { CabinetLogo } from "@/components/CabinetLogo";

const ROLE_LABELS: Record<string, string> = {
  ADMIN:               "مدير المنظومة",
  FOLLOW_UP_OFFICER:   "موظف المتابعة والتوجيه",
  REGISTRATION_CLERK:  "موظف قيد السجلات",
  SUBCOMMITTEE_MEMBER: "عضو / مقرر لجنة فاحصة",
  SUPREME_COMMITTEE:   "عضو اللجنة العليا",
  FINANCE:             "مسؤول الشؤون المالية",
};

const NAV_ITEMS_BY_ROLE: Record<string, { href: string; label: string; icon: string }[]> = {
  REGISTRATION_CLERK: [
    { href: "/dashboard/registration",         label: "سجل القضايا والشكاوى",    icon: "📋" },
    { href: "/dashboard/registration/new",     label: "قيد سجل جديد",             icon: "➕" },
    { href: "/dashboard/registration/reports", label: "تقارير ومعدلات التسجيل",   icon: "📊" },
  ],
  FOLLOW_UP_OFFICER: [
    { href: "/dashboard/follow-up",            label: "مرصد التوجيه ومتابعة المدد", icon: "⚖️" },
    { href: "/dashboard/registration/reports", label: "تقارير ومعدلات التسجيل",   icon: "📊" },
    { href: "/dashboard/admin/prosecutions",   label: "سجل جهات النيابة",          icon: "🏛️" },
    { href: "/dashboard/admin/specialties",    label: "سجل التخصصات الطبية",        icon: "🩺" },
  ],
  SUBCOMMITTEE_MEMBER: [
    { href: "/dashboard/subcommittee",         label: "السجلات المحالة للجنّتي", icon: "🩺" },
    { href: "/dashboard/subcommittee/doctors", label: "سجل أطباء اللجنة",        icon: "👨‍⚕️" },
  ],
  SUPREME_COMMITTEE: [
    { href: "/dashboard/supreme",          label: "مراجعة واعتماد اللجنة العليا", icon: "📜" },
  ],
  FINANCE: [
    { href: "/dashboard/finance",          label: "الجدول المالي والتعويضات", icon: "💰" },
  ],
  ADMIN: [
    { href: "/dashboard/follow-up",           label: "مرصد التوجيه ومتابعة المدد", icon: "⚖️" },
    { href: "/dashboard/registration",        label: "قيد واستعراض السجلات",        icon: "📋" },
    { href: "/dashboard/registration/new",    label: "قيد سجل جديد",                 icon: "➕" },
    { href: "/dashboard/registration/reports", label: "تقارير ومعدلات التسجيل",   icon: "📊" },
    { href: "/dashboard/admin/prosecutions",  label: "سجل جهات النيابة العامة",     icon: "🏛️" },
    { href: "/dashboard/admin/specialties",   label: "سجل التخصصات الطبية",        icon: "🩺" },
    { href: "/dashboard/subcommittee",        label: "دراسة اللجان الفرعية",         icon: "🔬" },
    { href: "/dashboard/subcommittee/doctors", label: "سجل أطباء اللجنة",            icon: "👨‍⚕️" },
    { href: "/dashboard/supreme",             label: "قرارات اللجنة العليا",         icon: "📜" },
    { href: "/dashboard/finance",             label: "الجدول المالي والتعويضات",      icon: "💰" },
    { href: "/dashboard/admin/subcommittees", label: "إدارة اللجان الفرعية",         icon: "🏢" },
    { href: "/dashboard/admin",               label: "إدارة المستخدمين والصلاحيات",  icon: "⚙️" },
  ],
};

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any)?.role as string;
  const employer = (session.user as any)?.employer as string | undefined;
  const navItems = NAV_ITEMS_BY_ROLE[role] ?? [];

  return (
    <div className="min-h-screen bg-slate-100 flex" dir="rtl">
      {/* ─── الشريط الجانبي الحكومي الهادئ (Sidebar) ─── */}
      <aside
        className="w-[280px] text-white flex flex-col flex-shrink-0 shadow-md z-30 border-l border-[#1F4E79]/30"
        style={{ background: "linear-gradient(180deg, #1F4E79 0%, #153856 100%)" }}
      >
        {/* الهيدر والشعار المعتمد */}
        <div className="p-4 border-b border-white/10">
          <CabinetLogo size="sm" textColor="light" />
        </div>

        {/* بطاقة المستخدم الحالي */}
        <div className="p-3.5 border-b border-white/10 bg-black/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white/15 border border-white/20 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              {session.user.name ? session.user.name.charAt(0) : "م"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">
                {session.user.name}
              </p>
              <div className="mt-0.5">
                <span className="inline-block px-2 py-0.5 rounded bg-white/15 text-white/90 border border-white/20 text-[10px] font-semibold">
                  {ROLE_LABELS[role] ?? role}
                </span>
              </div>
              {employer && (
                <p className="text-[10px] text-blue-200/90 mt-1 truncate" title={employer}>
                  🏛️ جهة العمل: {employer}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* قائمة الروابط */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-200/70">
            المهام والعمليات
          </div>

          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-blue-100 hover:bg-white/10 hover:text-white transition-colors"
            >
              <span className="text-sm">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}

          <div className="pt-3 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-200/70 border-t border-white/10 mt-3">
            الحساب الشخصي
          </div>

          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold text-blue-100 hover:bg-white/10 hover:text-white transition-colors"
          >
            <span className="text-sm">👤</span>
            <span>بيانات الحساب وسياسة الأمان</span>
          </Link>
        </nav>

        {/* زر تسجيل الخروج */}
        <div className="p-3 border-t border-white/10">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-rose-200 hover:text-white hover:bg-rose-800/40 border border-rose-400/20 transition-colors"
            >
              <span>🚪</span>
              <span>تسجيل الخروج</span>
            </button>
          </form>
        </div>
      </aside>

      {/* ─── مساحة المحتوى والـ Header ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* شريط الرأس (Header) الحكومي الهادئ */}
        <header className="h-[60px] bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm z-20">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded bg-[#1F4E79]/10 text-[#1F4E79] border border-[#1F4E79]/20 text-xs font-bold">
              رئاسة مجلس الوزراء
            </span>
            <span className="text-xs font-bold text-slate-700 hidden sm:inline">
              اللجنة العليا للمسؤولية الطبية وسلامة المريض
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>المنظومة متصلة</span>
            </span>
            <Link
              href="/dashboard/profile"
              className="w-8 h-8 rounded-full bg-[#1F4E79] text-white flex items-center justify-center font-bold text-xs hover:bg-[#173d61] transition-colors"
              title="الملف الشخصي"
            >
              {session.user.name ? session.user.name.charAt(0) : "م"}
            </Link>
          </div>
        </header>

        {/* صفحة المحتوى */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
