"use client";

import React from "react";
import { CabinetLogo } from "@/components/CabinetLogo";
import { UserMenu } from "@/components/ui/UserMenu";
import { Search, Bell, Menu, Shield } from "lucide-react";

export interface TopBarProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
    employer?: string | null;
  };
  roleLabel: string;
  onMobileMenuToggle: () => void;
}

export function TopBar({ user, roleLabel, onMobileMenuToggle }: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 font-body shadow-xs">
      {/* ─── اليمين: الهوية الرسمية وزر القائمة للموبايل ─── */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          aria-label="فتح قائمة التنقل"
          className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600"
        >
          <Menu className="w-5 h-5" />
        </button>

        <CabinetLogo size="header" />
      </div>

      {/* ─── المنتصف: شريط البحث الموحد (Global Search Placeholder) ─── */}
      <div className="hidden lg:flex flex-1 max-w-md mx-4">
        <div className="relative w-full">
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            readOnly
            placeholder="ابحث برقم السجل، اسم الشاكي، النيابة..."
            title="شريط البحث السريع"
            className="w-full h-10 pr-10 pl-4 text-xs rounded-lg border border-slate-200 bg-slate-50/70 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 cursor-default transition-colors font-body"
          />
        </div>
      </div>

      {/* ─── اليسار: حالة النظام + التنبيهات + المستخدم ─── */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* مؤشر الحالة المحايد */}
        <div className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium">
          <Shield className="w-3.5 h-3.5 text-teal-600" />
          <span>منظومة المسئولية الطبية</span>
        </div>

        {/* زر التنبيهات */}
        <button
          type="button"
          aria-label="التنبيهات"
          title="التنبيهات والإشعارات"
          className="w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 relative"
        >
          <Bell className="w-4 h-4" />
          <span className="sr-only">التنبيهات</span>
        </button>

        {/* قائمة المستخدم */}
        <UserMenu user={user} roleLabel={roleLabel} />
      </div>
    </header>
  );
}
