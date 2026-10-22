"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Search,
  Loader2,
  X,
  Building2,
  ChevronLeft,
  Scale,
  Stethoscope,
  FolderOpen,
} from "lucide-react";

interface SearchCaseResult {
  id: string;
  caseNumber: string;
  caseYear: number;
  prosecutionCaseNumber: string | null;
  reportYear: number | null;
  registrationType: "COMPLAINT" | "CASE" | "REPORT";
  status: string;
  complainantName: string | null;
  respondentName: string | null;
  hospitalName: string | null;
  entityType?: string | null;
  entityName?: string | null;
  prosecution: string | null;
  createdAt: string;
  subCommitteeId?: string | null;
  subCommittee: { id?: string; name: string } | null;
}

const TYPE_CONFIG: Record<string, { label: string; badge: string }> = {
  COMPLAINT: { label: "شكوى", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  CASE: { label: "قضية", badge: "bg-purple-50 text-purple-800 border-purple-200" },
  REPORT: { label: "محضر", badge: "bg-slate-100 text-slate-800 border-slate-300" },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  REGISTERED: { label: "بانتظار التوجيه", color: "text-amber-700 bg-amber-50 border-amber-200" },
  UNDER_SUBCOMMITTEE_REVIEW: { label: "قيد دراسة اللجنة", color: "text-teal-700 bg-teal-50 border-teal-200" },
  PENDING_SUPREME_REVIEW: { label: "بانتظار اللجنة العليا", color: "text-blue-700 bg-blue-50 border-blue-200" },
  APPROVED: { label: "معتمد نهائي", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  REFERRED_FOR_REVIEW: { label: "إعادة دراسة", color: "text-rose-700 bg-rose-50 border-rose-200" },
  CLOSED: { label: "مغلق", color: "text-slate-600 bg-slate-100 border-slate-200" },
};

export function GlobalSearchBar({ userRole: initialRole }: { userRole?: string | null }) {
  const router = useRouter();
  const { data: session } = useSession();
  const effectiveRole = initialRole || (session?.user as any)?.role;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchCaseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // اختصار لوحة المفاتيح Ctrl+K أو Cmd+K للتركيز على البحث
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // البحث السريع مع Debounce 220ms
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setLoading(false);
      setSelectedIndex(-1);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/cases/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setIsOpen(true);
          setSelectedIndex(-1);
        }
      } catch (err) {
        console.error("Search fetch failed", err);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timeout);
  }, [query]);

  // تحديد المسار الأنسب للسجل بناءً على دور المستخدم وحالة السجل
  function getActionTarget(item: SearchCaseResult) {
    const isUnassigned = item.status === "REGISTERED" || !item.subCommittee;

    // لموظف المتابعة والتوجيه
    if (effectiveRole === "FOLLOW_UP_OFFICER") {
      if (isUnassigned || item.status === "REFERRED_FOR_REVIEW") {
        return {
          href: `/dashboard/follow-up/${item.id}/assign`,
          label: "توجيه وتحديد التخصص واللجنة",
        };
      }
      return {
        href: `/dashboard/registration/${item.id}`,
        label: "عرض ملف السجل",
      };
    }

    // لعضو اللجنة الفرعية
    if (effectiveRole === "SUBCOMMITTEE_MEMBER") {
      return {
        href: `/dashboard/subcommittee/${item.id}`,
        label: "دراسة اللجنة الفرعية",
      };
    }

    // لعضو اللجنة العليا
    if (effectiveRole === "SUPREME_COMMITTEE") {
      return {
        href: `/dashboard/supreme/${item.id}`,
        label: "قرار اللجنة العليا",
      };
    }

    // للمشرف العام ADMIN أو أي دور آخر
    if (isUnassigned || item.status === "REFERRED_FOR_REVIEW") {
      return {
        href: `/dashboard/follow-up/${item.id}/assign`,
        label: "توجيه وتحديد التخصص واللجنة",
      };
    }

    return {
      href: `/dashboard/registration/${item.id}`,
      label: "عرض ملف السجل",
    };
  }

  function handleSelect(item: SearchCaseResult, customHref?: string) {
    setIsOpen(false);
    setQuery("");
    const target = customHref || getActionTarget(item).href;
    router.push(target);
  }

  // التنقل بالأسهم واختيار نتيجة
  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!isOpen || results.length === 0) {
      if (e.key === "Escape") setIsOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            if (query.trim() || results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="بحث سريع: برقم السجل، المحضر، الشاكي، النيابة، المشكو في حقه..."
          className="w-full h-10 pr-10 pl-16 text-xs rounded-xl border border-slate-200 bg-slate-50/80 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600/30 focus:border-teal-600 focus:bg-white transition-all font-body shadow-xs"
        />

        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center gap-1">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
                setIsOpen(false);
                inputRef.current?.focus();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              title="مسح البحث"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-100 border border-slate-200 select-none">
              <span className="text-[9px]">Ctrl</span>K
            </kbd>
          )}
        </div>
      </div>

      {/* ─── القائمة المنسدلة للنتائج السريعة ─── */}
      {isOpen && query.trim().length > 0 && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute top-full mt-2 w-full sm:w-[520px] right-0 z-50 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden font-body animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="font-bold text-slate-700">نتائج البحث الفوري ({results.length})</span>
            <span className="text-[10px] text-slate-400">انقر على الإجراء المطلوب أو اضغط Enter</span>
          </div>

          <div className="max-h-[420px] overflow-y-auto divide-y divide-slate-100">
            {results.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 text-teal-700">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري البحث الفوري...</span>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-slate-700">لا توجد نتائج مطابقة لـ "{query}"</p>
                    <p className="text-[11px] text-slate-400 mt-1">تأكد من رقم السجل أو اسم الشاكي / المحضر.</p>
                  </div>
                )}
              </div>
            ) : (
              results.map((item, idx) => {
                const typeInfo = TYPE_CONFIG[item.registrationType] || { label: item.registrationType, badge: "bg-slate-100 text-slate-700" };
                const statusInfo = STATUS_CONFIG[item.status] || { label: item.status, color: "text-slate-600 bg-slate-100 border-slate-200" };
                const isSelected = idx === selectedIndex;
                const isUnassigned = item.status === "REGISTERED" || !item.subCommittee;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`p-3.5 cursor-pointer transition-colors space-y-2.5 ${
                      isSelected ? "bg-teal-50/60" : "hover:bg-slate-50/80"
                    }`}
                  >
                    {/* السطر الأول: الأرقام والأنواع والحالة */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-slate-900 font-mono text-xs font-heading">
                          #{item.caseNumber} / {item.caseYear}
                        </span>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${typeInfo.badge}`}>
                          {typeInfo.label}
                        </span>

                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>

                        {item.prosecutionCaseNumber && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] border border-slate-200 font-semibold" dir="auto">
                            {item.prosecutionCaseNumber} {item.reportYear ? `/ ${item.reportYear}` : ""}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.createdAt ? new Date(item.createdAt).toLocaleDateString("ar-EG") : ""}
                      </span>
                    </div>

                    {/* أطراف النزاع والنيابة */}
                    <div className="text-xs text-slate-600 space-y-1">
                      {item.complainantName && (
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-slate-400 text-[11px] shrink-0">الشاكي:</span>
                          <span className="font-semibold text-slate-800 truncate">{item.complainantName}</span>
                        </div>
                      )}

                      {(item.respondentName || item.hospitalName || item.entityName) && (
                        <div className="flex items-center gap-1.5 truncate text-[11px]">
                          <span className="text-slate-400 shrink-0">المشكو في حقه:</span>
                          <span className="font-semibold text-slate-700 truncate">
                            {item.respondentName || item.hospitalName || item.entityName}
                          </span>
                          {item.entityType && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] font-semibold shrink-0">
                              {item.entityType}
                            </span>
                          )}
                        </div>
                      )}

                      {item.prosecution && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{item.prosecution}</span>
                          {item.subCommittee && (
                            <span className="text-teal-700 font-semibold shrink-0">({item.subCommittee.name})</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ─── شريط الإجراءات المباشرة السريعة ─── */}
                    <div className="pt-2 border-t border-slate-100/90 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* زر التوجيه واختيار التخصص واللجنة (المطلوب أساساً) */}
                        {isUnassigned ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(item, `/dashboard/follow-up/${item.id}/assign`);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-bold font-heading transition-all shadow-2xs hover:shadow-xs"
                          >
                            <Stethoscope className="w-3 h-3" />
                            <span>توجيه السجل (تحديد التخصص واللجنة)</span>
                          </button>
                        ) : item.status === "UNDER_SUBCOMMITTEE_REVIEW" ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(item, `/dashboard/subcommittee/${item.id}`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-[11px] font-bold font-heading transition-all shadow-2xs hover:shadow-xs"
                          >
                            <Stethoscope className="w-3 h-3" />
                            <span>أعمال اللجنة الفرعية</span>
                          </button>
                        ) : (item.status === "PENDING_SUPREME_REVIEW" || item.status === "APPROVED") ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(item, `/dashboard/supreme/${item.id}`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold font-heading transition-all shadow-2xs hover:shadow-xs"
                          >
                            <Scale className="w-3 h-3" />
                            <span>قرار اللجنة العليا</span>
                          </button>
                        ) : null}

                        {/* زر فتح ملف وتفاصيل السجل الشامل */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(item, `/dashboard/registration/${item.id}`);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-all border border-slate-200"
                        >
                          <FolderOpen className="w-3 h-3 text-slate-500" />
                          <span>عرض ملف السجل</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
                        <span>فتح</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
