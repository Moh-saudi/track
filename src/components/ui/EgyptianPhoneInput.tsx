"use client";

import React, { useMemo } from "react";
import { Phone, CheckCircle2, AlertCircle } from "lucide-react";
import { getEgyptianPhoneStatus, sanitizeEgyptianPhone } from "@/lib/formatters";

export interface EgyptianPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  showStatus?: boolean;
  size?: "sm" | "md";
}

export function EgyptianPhoneInput({
  value,
  onChange,
  placeholder = "01XXXXXXXXX",
  className = "",
  disabled = false,
  required = false,
  id,
  name,
  showStatus = true,
  size = "md",
}: EgyptianPhoneInputProps) {
  const status = useMemo(() => getEgyptianPhoneStatus(value), [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const clean = sanitizeEgyptianPhone(e.target.value);
    onChange(clean);
  };

  const isSmall = size === "sm";

  return (
    <div className="w-full">
      <div className="relative flex items-center">
        <input
          id={id}
          name={name}
          type="tel"
          inputMode="numeric"
          maxLength={11}
          disabled={disabled}
          required={required}
          value={value || ""}
          onChange={handleChange}
          placeholder={placeholder}
          dir="ltr"
          className={`w-full font-mono transition-colors rounded-lg border text-slate-900 bg-white
            disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed
            focus:outline-none focus:ring-1
            ${isSmall ? "h-9 text-xs px-2.5" : "h-10 text-xs px-3"}
            ${
              status.isValid
                ? "border-emerald-500 focus:border-emerald-600 focus:ring-emerald-500 bg-emerald-50/20"
                : status.isError
                ? "border-rose-400 focus:border-rose-500 focus:ring-rose-500 bg-rose-50/20"
                : "border-slate-300 focus:border-teal-600 focus:ring-teal-600"
            }
            ${value ? "pr-8" : ""}
            ${className}`}
        />

        {/* أيقونة الحالة اللحظية في الطرف الأيمن داخل الحقل */}
        <div className="absolute right-2.5 flex items-center pointer-events-none">
          {status.isValid ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-in zoom-in-75 duration-150" />
          ) : status.isError ? (
            <AlertCircle className="w-4 h-4 text-rose-500 animate-in zoom-in-75 duration-150" />
          ) : value && value.length > 0 ? (
            <span className="text-[10px] font-mono font-semibold px-1 rounded bg-slate-100 text-slate-500">
              {value.length}/11
            </span>
          ) : null}
        </div>
      </div>

      {/* رسالة التأكيد اللحظية أسفل الحقل */}
      {showStatus && value && value.length > 0 && (
        <div className="mt-1 flex items-center gap-1.5 transition-all animate-in fade-in slide-in-from-top-0.5 duration-150">
          {status.isValid ? (
            <p className="text-[11px] font-semibold text-emerald-700 font-body flex items-center gap-1">
              <span>{status.message}</span>
            </p>
          ) : status.isError ? (
            <p className="text-[11px] font-medium text-rose-600 font-body flex items-center gap-1">
              <span>{status.message}</span>
            </p>
          ) : (
            <p className="text-[10px] text-slate-500 font-body flex items-center gap-1">
              <span>{status.message}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
