"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Calendar, Filter, RotateCcw } from "lucide-react";

export function SupremeDateFilter() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialStart = searchParams.get("startDate") || "";
  const initialEnd = searchParams.get("endDate") || "";

  const [startDate, setStartDate] = useState(initialStart);
  const [endDate, setEndDate] = useState(initialEnd);

  function handleFilter(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);

    router.push(`/dashboard/supreme?${params.toString()}`);
  }

  function handleReset() {
    setStartDate("");
    setEndDate("");
    router.push("/dashboard/supreme");
  }

  const hasFilter = !!(initialStart || initialEnd);

  return (
    <form
      onSubmit={handleFilter}
      className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-body text-xs"
    >
      <div className="flex items-center gap-2 text-slate-700 font-bold font-heading">
        <Calendar className="w-4 h-4 text-teal-600 shrink-0" />
        <span>تحديد النطاق الزمني للإحصائيات:</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">من تاريخ:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 px-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium">إلى تاريخ:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 px-2.5 rounded-lg border border-slate-300 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 font-mono"
          />
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors shadow-xs"
        >
          <Filter className="w-3.5 h-3.5" />
          <span>تطبيق الفلترة</span>
        </button>

        {hasFilter && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 h-9 px-2.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            title="إعادة ضبط النطاق الزمني"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إلغاء الفلتر</span>
          </button>
        )}
      </div>
    </form>
  );
}
