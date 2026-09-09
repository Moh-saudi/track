"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, User, ShieldCheck, LogOut, Building2 } from "lucide-react";

export interface UserMenuProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
    employer?: string | null;
  };
  roleLabel: string;
}

export function UserMenu({ user, roleLabel }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const initial = user.name ? user.name.trim().charAt(0) : "م";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative font-body" ref={menuRef}>
      {/* الزر الرئيسي */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="flex items-center gap-2.5 p-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-1 select-none"
      >
        <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-bold text-xs flex items-center justify-center font-heading shrink-0">
          {initial}
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-slate-900 font-heading truncate max-w-[120px] leading-tight">
            {user.name || "المستخدم"}
          </p>
          <span className="text-[11px] text-slate-500 font-body block truncate max-w-[120px]">
            {roleLabel}
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* القائمة المنسدلة */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
          {/* معلومات الحساب */}
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-900 font-heading">
              {user.name}
            </p>
            <p className="text-[11px] text-teal-700 font-medium font-body mt-0.5">
              {roleLabel}
            </p>
            {user.employer && (
              <p className="text-[11px] text-slate-500 font-body mt-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{user.employer}</span>
              </p>
            )}
            {user.email && (
              <p className="text-[11px] text-slate-400 font-body truncate mt-0.5" dir="ltr">
                {user.email}
              </p>
            )}
          </div>

          {/* روابط الحساب */}
          <div className="py-1">
            <Link
              href="/dashboard/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-900 transition-colors"
            >
              <User className="w-4 h-4 text-slate-400" />
              <span>الملف الشخصي</span>
            </Link>

            <Link
              href="/dashboard/profile#security"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-xs text-slate-700 hover:bg-teal-50 hover:text-teal-900 transition-colors"
            >
              <ShieldCheck className="w-4 h-4 text-slate-400" />
              <span>تغيير كلمة المرور والأمان</span>
            </Link>
          </div>

          {/* زر تسجيل الخروج */}
          <div className="pt-1 border-t border-slate-100 mt-1">
            <form action="/api/auth/signout" method="POST">
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors text-right"
              >
                <LogOut className="w-4 h-4 text-rose-500" />
                <span>تسجيل الخروج</span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
