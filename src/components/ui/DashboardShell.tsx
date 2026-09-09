"use client";

import React, { useState } from "react";
import { TopBar } from "@/components/ui/TopBar";
import { Sidebar, NavItemConfig } from "@/components/ui/Sidebar";

export interface DashboardShellProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
    employer?: string | null;
  };
  roleLabel: string;
  role: string;
  navItems?: NavItemConfig[];
  children: React.ReactNode;
}

export function DashboardShell({
  user,
  roleLabel,
  role,
  navItems,
  children,
}: DashboardShellProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-body" dir="rtl">
      {/* ─── الشريط العلوي الرسمي ─── */}
      <TopBar
        user={user}
        roleLabel={roleLabel}
        onMobileMenuToggle={() => setIsMobileOpen((prev) => !prev)}
      />

      {/* ─── تخطيط الصفحة: Sidebar + Main Content ─── */}
      <div className="flex flex-1 relative">
        <Sidebar
          role={role}
          navItems={navItems}
          isOpenMobile={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
        />

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 bg-slate-50 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
