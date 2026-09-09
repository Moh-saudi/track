import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = "", error, children, ...props }, ref) => {
    return (
      <div className="relative w-full">
        <select
          ref={ref}
          className={`w-full h-10 rounded-lg border bg-white pr-3.5 pl-10 py-2 text-sm text-slate-900 transition-colors font-body appearance-none
            focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600
            disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500
            ${error ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500" : "border-slate-300"}
            ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
        {error && <p className="mt-1 text-xs text-rose-600 font-body">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";
