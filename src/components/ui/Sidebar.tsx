"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  PlusCircle,
  BarChart3,
  Scale,
  Building2,
  Stethoscope,
  Users,
  Microscope,
  FileCheck,
  Coins,
  Building,
  Settings,
  X,
  Landmark,
  CreditCard,
  Calendar,
  History,
  Activity,
  ShieldAlert,
  Clock,
  LayoutDashboard,
} from "lucide-react";

export interface NavItemConfig {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group?: string;
  exact?: boolean;
}

export const NAV_ITEMS_BY_ROLE: Record<string, NavItemConfig[]> = {
  REGISTRATION_CLERK: [
    { href: "/dashboard/registration", label: "لوحة قيادة ومؤشرات التسجيل", icon: LayoutDashboard, group: "المهام والعمليات", exact: true },
    { href: "/dashboard/registration/cases", label: "سجل القضايا والشكاوى والمحاضر", icon: ClipboardList, group: "المهام والعمليات" },
    { href: "/dashboard/registration/new", label: "قيد سجل جديد", icon: PlusCircle, group: "المهام والعمليات" },
    { href: "/dashboard/registration/reports", label: "تقارير ومعدلات التسجيل", icon: BarChart3, group: "المهام والعمليات" },
  ],
  FOLLOW_UP_OFFICER: [
    { href: "/dashboard/follow-up", label: "لوحة قيادة ومؤشرات التوجيه", icon: LayoutDashboard, group: "المهام والعمليات", exact: true },
    { href: "/dashboard/follow-up/cases", label: "مرصد التوجيه ومتابعة المدد", icon: Scale, group: "المهام والعمليات" },
    { href: "/dashboard/registration/reports", label: "تقارير ومعدلات التسجيل", icon: BarChart3, group: "المهام والعمليات" },
    { href: "/dashboard/admin/prosecutions", label: "سجل جهات النيابة", icon: Building2, group: "الإدارة والتهيئة" },
    { href: "/dashboard/admin/specialties", label: "سجل التخصصات الطبية", icon: Stethoscope, group: "الإدارة والتهيئة" },
  ],
  SUBCOMMITTEE_MEMBER: [
    { href: "/dashboard/subcommittee", label: "لوحة قيادة ومؤشرات اللجنة", icon: LayoutDashboard, group: "أعمال الجلسات والتقارير", exact: true },
    { href: "/dashboard/subcommittee/cases", label: "السجلات والقضايا المحالة للفحص", icon: Stethoscope, group: "أعمال الجلسات والتقارير" },
    { href: "/dashboard/subcommittee/reports", label: "التقارير الإحصائية والتحليلية", icon: BarChart3, group: "أعمال الجلسات والتقارير" },
    { href: "/dashboard/subcommittee/doctors", label: "سجل أطباء واستشاري اللجنة", icon: Users, group: "الفريق والاستشاريين" },
  ],
  SUPREME_COMMITTEE: [
    { href: "/dashboard/supreme", label: "لوحة قيادة ومؤشرات الدائرة العليا", icon: LayoutDashboard, group: "أعمال الدائرة العليا والقرارات", exact: true },
    { href: "/dashboard/supreme/cases", label: "مراجعة السجلات والقرارات", icon: FileCheck, group: "أعمال الدائرة العليا والقرارات" },
    { href: "/dashboard/supreme/schedule", label: "أجندة وخطة الانعقاد", icon: Calendar, group: "أعمال الدائرة العليا والقرارات" },
  ],
  FINANCE: [
    { href: "/dashboard/finance", label: "لوحة قيادة ومؤشرات المنظومة المالية", icon: LayoutDashboard, group: "الرقابة والمؤشرات", exact: true },
    { href: "/dashboard/finance/payments", label: "صرف البدلات والمستحقات", icon: Scale, group: "إجراءات الصرف والحسابات" },
    { href: "/dashboard/finance/doctors", label: "الحسابات المصرفية للأطباء", icon: Landmark, group: "إجراءات الصرف والحسابات" },
  ],
  ADMIN: [
    { href: "/dashboard/admin", label: "لوحة القيادة والتحول الرقمي", icon: LayoutDashboard, group: "القيادة والرقابة المركزية", exact: true },
    { href: "/dashboard/admin/audit-logs", label: "سجل جلسات وتواجد المستخدمين", icon: Clock, group: "القيادة والرقابة المركزية" },
    { href: "/dashboard/admin/audit-actions", label: "سجل الحركات الرقابية الشامل", icon: History, group: "القيادة والرقابة المركزية" },
    { href: "/dashboard/admin/active-users", label: "المستخدمون المتصلون ومدة العمل", icon: Activity, group: "القيادة والرقابة المركزية" },
    { href: "/dashboard/admin/risk-mode", label: "غرفة عمليات المخاطر وتصحيح المسار", icon: ShieldAlert, group: "القيادة والرقابة المركزية" },
    { href: "/dashboard/follow-up", label: "مرصد التوجيه ومتابعة المدد", icon: Scale, group: "المهام والعمليات" },
    { href: "/dashboard/registration", label: "قيد واستعراض السجلات", icon: ClipboardList, group: "المهام والعمليات", exact: true },
    { href: "/dashboard/registration/new", label: "قيد سجل جديد", icon: PlusCircle, group: "المهام والعمليات" },
    { href: "/dashboard/registration/reports", label: "تقارير ومعدلات التسجيل", icon: BarChart3, group: "المهام والعمليات" },
    { href: "/dashboard/subcommittee", label: "دراسة اللجان الفرعية", icon: Microscope, group: "المهام والعمليات", exact: true },
    { href: "/dashboard/subcommittee/reports", label: "إحصائيات وتقارير اللجان الفرعية", icon: BarChart3, group: "المهام والعمليات" },
    { href: "/dashboard/supreme", label: "تحليلات وإحصائيات اللجنة العليا", icon: BarChart3, group: "المهام والعمليات", exact: true },
    { href: "/dashboard/supreme/cases", label: "قرارات واعتمادات اللجنة العليا", icon: FileCheck, group: "المهام والعمليات" },
    { href: "/dashboard/supreme/schedule", label: "أجندة وخطة انعقاد اللجنة العليا", icon: Calendar, group: "المهام والعمليات" },
    { href: "/dashboard/finance", label: "لوحة المؤشرات المالية", icon: Coins, group: "المهام والعمليات", exact: true },
    { href: "/dashboard/finance/payments", label: "صرف البدلات والمستحقات", icon: Scale, group: "المهام والعمليات" },
    { href: "/dashboard/finance/doctors", label: "الحسابات المصرفية للأطباء", icon: Landmark, group: "الإدارة والتهيئة" },
    { href: "/dashboard/admin/subcommittees", label: "إدارة اللجان الفرعية", icon: Building, group: "الإدارة والتهيئة" },
    { href: "/dashboard/admin/specialties", label: "سجل التخصصات الطبية", icon: Stethoscope, group: "الإدارة والتهيئة" },
    { href: "/dashboard/admin/prosecutions", label: "سجل جهات النيابة العامة", icon: Building2, group: "الإدارة والتهيئة" },
    { href: "/dashboard/subcommittee/doctors", label: "سجل أطباء اللجنة", icon: Users, group: "الإدارة والتهيئة" },
    { href: "/dashboard/admin/users", label: "إدارة المستخدمين والصلاحيات", icon: Settings, group: "الإدارة والتهيئة" },
  ],
  RISK_OFFICER: [
    { href: "/dashboard/admin/risk-mode", label: "غرفة عمليات المخاطر وتصحيح المسار", icon: ShieldAlert, group: "إدارة المخاطر والأزمات", exact: true },
    { href: "/dashboard/admin/audit-logs", label: "سجل جلسات وتواجد المستخدمين", icon: Clock, group: "إدارة المخاطر والأزمات" },
    { href: "/dashboard/admin/audit-actions", label: "سجل الحركات الرقابية الشامل", icon: History, group: "إدارة المخاطر والأزمات" },
    { href: "/dashboard/follow-up", label: "مرصد التوجيه ومتابعة المدد", icon: Scale, group: "الرقابة والمتابعة العامة" },
    { href: "/dashboard/supreme/cases", label: "مراجعة قرارات واعتمادات اللجنة العليا", icon: FileCheck, group: "الرقابة والمتابعة العامة" },
    { href: "/dashboard/admin/subcommittees", label: "سجل اللجان الفرعية والجهات", icon: Building, group: "الرقابة والمتابعة العامة" },
  ],
};

export interface SidebarProps {
  role?: string;
  navItems?: NavItemConfig[];
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({ role = "REGISTRATION_CLERK", navItems, isOpenMobile, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const effectiveItems = navItems || NAV_ITEMS_BY_ROLE[role] || [];

  // تجميع الروابط في أقسام منطقية
  const groups: Record<string, NavItemConfig[]> = {};
  effectiveItems.forEach((item) => {
    const groupName = item.group || "المهام والعمليات";
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(item);
  });

  const isItemActive = (item: NavItemConfig) => {
    if (item.exact) {
      return pathname === item.href;
    }
    if (pathname === item.href) {
      return true;
    }
    // Nested active check
    if (item.href !== "/dashboard" && pathname.startsWith(item.href)) {
      return true;
    }
    return false;
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#F7FAF9] border-l border-slate-200 text-slate-700 font-body select-none">
      {/* رأس الـ Drawer في الموبايل */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-200 bg-white">
        <span className="text-xs font-bold font-heading text-slate-800">
          قائمة التنقل
        </span>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="إغلاق القائمة"
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* الروابط مقسمة إلى مجموعات */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {Object.entries(groups).map(([groupName, items]) => (
          <div key={groupName} className="space-y-1">
            <div className="px-3 py-1 text-[11px] font-bold text-slate-600 tracking-wider font-heading">
              {groupName}
            </div>

            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onCloseMobile}
                    className={`group flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-all duration-150 ${
                      active
                        ? "bg-teal-50 text-teal-800 border-r-[3px] border-r-teal-600 rounded-r-none font-semibold shadow-2xs"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 transition-colors ${
                        active
                          ? "text-teal-700"
                          : "text-slate-400 group-hover:text-slate-600"
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      {/* ─── Desktop Sidebar (ثابت بعرض 256px) ─── */}
      <aside className="hidden md:flex w-64 flex-col shrink-0 z-20 sticky top-16 h-[calc(100vh-4rem)]">
        {sidebarContent}
      </aside>

      {/* ─── Mobile Drawer ─── */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex" dir="rtl">
          {/* خلفية معتمة */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />

          {/* درج القائمة */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-right duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
