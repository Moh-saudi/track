import React, { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", icon, error, ...props }, ref) => {
    return (
      <div className="relative w-full">
        {icon && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`w-full h-10 rounded-lg border bg-white px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 transition-colors font-body
            focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600
            disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500
            ${icon ? "pr-10 pl-3.5" : "px-3.5"}
            ${error ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500" : "border-slate-300"}
            ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-rose-600 font-body">{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";
