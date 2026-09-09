import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "slate"
    | "registered"
    | "review"
    | "amber"
    | "pending"
    | "sky"
    | "approved"
    | "emerald"
    | "referred"
    | "rose"
    | "delayed"
    | "red"
    | "teal"
    | "violet";
  size?: "sm" | "md";
  icon?: React.ReactNode;
}

export function Badge({
  className = "",
  variant = "default",
  size = "md",
  icon,
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center gap-1 rounded-full font-medium border font-body whitespace-nowrap";

  const sizeStyles = {
    sm: "text-[11px] px-2 py-0.5",
    md: "text-xs px-2.5 py-1",
  }[size];

  const variantStyles = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
    registered: "bg-slate-100 text-slate-700 border-slate-200",
    review: "bg-amber-100 text-amber-800 border-amber-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    pending: "bg-sky-100 text-sky-800 border-sky-200",
    sky: "bg-sky-100 text-sky-800 border-sky-200",
    approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
    emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
    referred: "bg-rose-100 text-rose-800 border-rose-200",
    rose: "bg-rose-100 text-rose-800 border-rose-200",
    delayed: "bg-red-100 text-red-800 border-red-200 font-bold",
    red: "bg-red-100 text-red-800 border-red-200",
    teal: "bg-teal-100 text-teal-800 border-teal-200",
    violet: "bg-violet-100 text-violet-800 border-violet-200",
  }[variant];

  return (
    <span className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`} {...props}>
      {icon}
      {children}
    </span>
  );
}
