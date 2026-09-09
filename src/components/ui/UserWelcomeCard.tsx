"use client";

import React from "react";
import { Calendar, CheckCircle2, Shield, User } from "lucide-react";

export interface UserWelcomeCardProps {
  user?: {
    name?: string | null;
    fullName?: string | null;
    email?: string | null;
    role?: string | null;
    employer?: string | null;
    subCommitteeName?: string | null;
  } | null;
  className?: string;
}

interface RoleStyleConfig {
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  avatarBg: string;
  avatarText: string;
  borderRight: string;
  accentDot: string;
}

const ROLE_STYLES: Record<string, RoleStyleConfig> = {
  REGISTRATION_CLERK: {
    label: "موظف التسجيل والقيد",
    badgeBg: "bg-sky-50/80",
    badgeText: "text-sky-800",
    badgeBorder: "border-sky-200/70",
    avatarBg: "bg-sky-100/70 text-sky-800",
    avatarText: "text-sky-800",
    borderRight: "border-r-sky-500",
    accentDot: "bg-sky-500",
  },
  FOLLOW_UP_OFFICER: {
    label: "موظف المتابعة والتوجيه",
    badgeBg: "bg-violet-50/80",
    badgeText: "text-violet-800",
    badgeBorder: "border-violet-200/70",
    avatarBg: "bg-violet-100/70 text-violet-800",
    avatarText: "text-violet-800",
    borderRight: "border-r-violet-500",
    accentDot: "bg-violet-500",
  },
  SUBCOMMITTEE_MEMBER: {
    label: "عضو لجنة فرعية",
    badgeBg: "bg-amber-50/80",
    badgeText: "text-amber-800",
    badgeBorder: "border-amber-200/70",
    avatarBg: "bg-amber-100/70 text-amber-800",
    avatarText: "text-amber-800",
    borderRight: "border-r-amber-500",
    accentDot: "bg-amber-500",
  },
  SUPREME_COMMITTEE: {
    label: "عضو اللجنة العليا",
    badgeBg: "bg-teal-50/80",
    badgeText: "text-teal-800",
    badgeBorder: "border-teal-200/70",
    avatarBg: "bg-teal-100/70 text-teal-800",
    avatarText: "text-teal-800",
    borderRight: "border-r-teal-600",
    accentDot: "bg-teal-500",
  },
  FINANCE: {
    label: "الشؤون المالية والبدلات",
    badgeBg: "bg-emerald-50/80",
    badgeText: "text-emerald-800",
    badgeBorder: "border-emerald-200/70",
    avatarBg: "bg-emerald-100/70 text-emerald-800",
    avatarText: "text-emerald-800",
    borderRight: "border-r-emerald-500",
    accentDot: "bg-emerald-500",
  },
  ADMIN: {
    label: "مدير المنظومة والتحول الرقمي",
    badgeBg: "bg-slate-100/90",
    badgeText: "text-slate-800",
    badgeBorder: "border-slate-300/70",
    avatarBg: "bg-slate-100 text-slate-800",
    avatarText: "text-slate-800",
    borderRight: "border-r-teal-600",
    accentDot: "bg-teal-500",
  },
  RISK_OFFICER: {
    label: "مسؤول إدارة المخاطر وتصحيح المسار",
    badgeBg: "bg-rose-50/80",
    badgeText: "text-rose-800",
    badgeBorder: "border-rose-200/70",
    avatarBg: "bg-rose-100/70 text-rose-800",
    avatarText: "text-rose-800",
    borderRight: "border-r-rose-500",
    accentDot: "bg-rose-500",
  },
};

export function UserWelcomeCard({ user, className = "" }: UserWelcomeCardProps) {
  const role = user?.role || "REGISTRATION_CLERK";
  const style = ROLE_STYLES[role] || ROLE_STYLES.REGISTRATION_CLERK;

  const displayName = user?.fullName || user?.name || "مستخدم المنظومة";
  const initialLetter = displayName.trim().charAt(0) || "م";

  const subDetail = user?.employer
    ? `جهة العمل: ${user.employer}`
    : user?.subCommitteeName
    ? `اللجنة: ${user.subCommitteeName}`
    : null;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-md shadow-2xs border-r-[3.5px] ${style.borderRight} p-3 sm:px-4 sm:py-2.5 transition-all select-none font-body ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* الطرف الأيمن: صورة المستخدم + اسمه + شارة الحساب */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative shrink-0">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold font-heading text-sm shadow-2xs ${style.avatarBg}`}
            >
              {initialLetter}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-body">مرحباً،</span>
              <h2 className="text-sm font-bold font-heading text-slate-900 truncate">
                {displayName}
              </h2>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${style.badgeBg} ${style.badgeText} ${style.badgeBorder} font-heading`}
              >
                {style.label}
              </span>
            </div>

            {subDetail && (
              <p className="text-[11px] text-slate-500 truncate font-body">
                {subDetail}
              </p>
            )}
          </div>
        </div>

        {/* الطرف الأيسر: تاريخ اليوم ومؤشر التواجد */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-body shrink-0 self-end sm:self-center">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/70 text-slate-600 text-[11px] font-medium border border-slate-200/50">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span suppressHydrationWarning>
              {new Date().toLocaleDateString("ar-EG", {
                weekday: "long",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50/90 text-emerald-800 text-[11px] font-medium border border-emerald-200/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>جلسة نشطة</span>
          </div>
        </div>
      </div>
    </div>
  );
}
