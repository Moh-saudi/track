import React, { forwardRef } from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost" | "success";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", loading, icon, children, disabled, ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none font-body";

    const variantStyles = {
      primary: "bg-teal-600 text-white hover:bg-teal-700 focus:ring-teal-600 shadow-sm",
      secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-300 shadow-sm",
      danger: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-600 shadow-sm",
      success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-600 shadow-sm",
      ghost: "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    }[variant];

    const sizeStyles = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : (
          icon
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
