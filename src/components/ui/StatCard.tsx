"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { LucideIcon } from "lucide-react";

export type StatCardVariant =
  | "teal"
  | "amber"
  | "sky"
  | "emerald"
  | "rose"
  | "violet"
  | "purple"
  | "orange"
  | "slate"
  | "neutral";

export interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode | LucideIcon | React.ComponentType<{ className?: string }>;
  variant?: StatCardVariant;
  color?: StatCardVariant;
  isZeroNeutral?: boolean;
  isWarningOnPositive?: boolean;
  subtitle?: string;
  description?: string;
  className?: string;
  onClick?: () => void;
}

export function StatCard({
  title,
  value,
  icon,
  variant,
  color,
  isZeroNeutral = true,
  isWarningOnPositive = false,
  subtitle,
  description,
  className = "",
  onClick,
}: StatCardProps) {
  const pathname = usePathname();
  const chosenVariant = variant || color || "teal";
  const numVal = typeof value === "number" ? value : parseInt(value as string, 10);
  const isZero = isZeroNeutral && (value === 0 || value === "0" || numVal === 0);

  let effectiveVariant: StatCardVariant = chosenVariant;
  if (isZero && !isWarningOnPositive) {
    effectiveVariant = "slate";
  } else if (isWarningOnPositive && !isZero) {
    effectiveVariant = "rose";
  }

  const variantStyles: Record<StatCardVariant, { iconBg: string; valueColor: string }> = {
    teal: { iconBg: "bg-teal-50 text-teal-700 border-teal-200", valueColor: "text-slate-900" },
    amber: { iconBg: "bg-amber-50 text-amber-800 border-amber-200", valueColor: "text-slate-900" },
    sky: { iconBg: "bg-sky-50 text-sky-700 border-sky-200", valueColor: "text-slate-900" },
    emerald: { iconBg: "bg-emerald-50 text-emerald-800 border-emerald-200", valueColor: "text-slate-900" },
    rose: { iconBg: "bg-red-50 text-red-800 border-red-200", valueColor: "text-red-800" },
    violet: { iconBg: "bg-violet-50 text-violet-700 border-violet-200", valueColor: "text-slate-900" },
    purple: { iconBg: "bg-purple-50 text-purple-700 border-purple-200", valueColor: "text-slate-900" },
    orange: { iconBg: "bg-orange-50 text-orange-700 border-orange-200", valueColor: "text-slate-900" },
    slate: { iconBg: "bg-slate-100 text-slate-600 border-slate-200", valueColor: "text-slate-700" },
    neutral: { iconBg: "bg-slate-100 text-slate-600 border-slate-200", valueColor: "text-slate-700" },
  };

  const style = variantStyles[effectiveVariant] || variantStyles.teal;
  const sub = subtitle || description;
  const financialText = `${title} ${typeof value === "string" ? value : ""} ${sub || ""}`;
  const isFinancialCard = /(بدل|بدلات|مستحق|مستحقات|صرف|تسديد|مدفوع|التسوية|ج\.م)/.test(financialText);
  const isFinanceArea = pathname?.startsWith("/dashboard/finance") ?? false;

  if (isFinancialCard && !isFinanceArea) {
    return null;
  }

  const renderIcon = () => {
    if (!icon) return null;
    if (React.isValidElement(icon)) return icon;
    if (
      typeof icon === "function" ||
      (typeof icon === "object" && icon !== null && ("render" in icon || "$$typeof" in icon))
    ) {
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className="w-5 h-5" />;
    }
    if (typeof icon === "string" || typeof icon === "number") return <span>{icon}</span>;
    return null;
  };

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between gap-4 transition-all ${
        onClick ? "cursor-pointer hover:border-slate-300 hover:shadow-md" : ""
      } ${className}`}
    >
      <div className="space-y-1 min-w-0">
        <p className="text-[13px] font-medium text-slate-600 font-body">{title}</p>
        <p
          suppressHydrationWarning
          className={`text-lg sm:text-xl leading-tight font-semibold font-heading tracking-tight break-words ${style.valueColor}`}
        >
          {value}
        </p>
        {sub && <p className="text-xs leading-relaxed text-slate-500 font-body">{sub}</p>}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${style.iconBg}`}>
        {renderIcon()}
      </div>
    </div>
  );
}
