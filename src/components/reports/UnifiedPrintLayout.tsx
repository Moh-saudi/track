"use client";

import React from "react";
import { formatDateTime } from "@/lib/formatters";

export interface UnifiedPrintLayoutProps {
  title: string;
  filterSummary?: string;
  currentUser?: {
    name?: string;
    role?: string;
  };
  totalCount: number;
  globalTotal?: number;
  orientation?: "portrait" | "landscape";
  children: React.ReactNode;
}

export function UnifiedPrintLayout({
  title,
  filterSummary,
  currentUser,
  totalCount,
  globalTotal,
  orientation = "landscape",
  children,
}: UnifiedPrintLayoutProps) {
  const printDate = new Date();

  const printCss = `
    @media print {
      @page {
        size: A4 ${orientation} !important;
        margin: 8mm 6mm 10mm 6mm !important;
      }
      header,
      aside,
      nav,
      .print\\:hidden,
      .no-print,
      button,
      input,
      select,
      textarea,
      [role="navigation"] {
        display: none !important;
      }
      html,
      body {
        background: #ffffff !important;
        color: #000000 !important;
        font-size: 8pt !important;
        line-height: 1.2 !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      main {
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      .print-header-container,
      .print-footer-container {
        display: flex !important;
      }
      .print-table,
      table {
        width: 100% !important;
        max-width: 100% !important;
        table-layout: fixed !important;
        border-collapse: collapse !important;
        margin-top: 4px !important;
      }
      .print-table th,
      .print-table td,
      table th,
      table td {
        border: 1px solid #334155 !important;
        padding: 3px 4px !important;
        font-size: 7.5pt !important;
        line-height: 1.2 !important;
        color: #0f172a !important;
        text-align: center !important;
        word-break: break-word !important;
        overflow-wrap: break-word !important;
        white-space: normal !important;
      }
      .print-table th,
      table th {
        background-color: #f1f5f9 !important;
        font-weight: 800 !important;
        color: #0f172a !important;
      }
      tr {
        page-break-inside: avoid !important;
      }
    }
  `;

  return (
    <>
      {/* أنماط الطباعة المباشرة لضمان دعم متصفحات الويب بدون اعتماد على مترجم */}
      <style dangerouslySetInnerHTML={{ __html: printCss }} />

      {/* ─── الترويسة الرسمية الخاصة بالطباعة: النسر بجوار العنوان الرسمي ─── */}
      <div className="hidden print:flex items-center justify-between pb-2.5 mb-2.5 border-b-2 border-slate-900 print-header-container">
        {/* اليمين: النسر الجمهوري الرسمي بجوار اسم الدولة واللجنة والعنوان */}
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="شعار جمهورية مصر العربية"
            width={44}
            height={44}
            className="w-11 h-11 object-contain shrink-0"
          />
          <div className="text-right leading-tight">
            <p className="text-[11px] font-bold text-slate-800">جمهورية مصر العربية — رئاسة مجلس الوزراء</p>
            <p className="text-xs font-black text-slate-900 mt-0.5">اللجنة العليا للمسؤولية الطبية وسلامة المريض</p>
            <h1 className="text-sm font-black text-teal-900 mt-1">{title}</h1>
          </div>
        </div>

        {/* اليسار: بيانات التقرير وتاريخ الطباعة والمستخرج */}
        <div className="text-left text-[10.5px] leading-tight space-y-0.5 min-w-[210px] border-r border-slate-300 pr-3">
          <p className="font-semibold text-slate-900">
            <span className="text-slate-500">المستخرج:</span> {currentUser?.name || "مدير النظام"}
          </p>
          <p className="text-[9.5px] text-slate-600 font-mono" suppressHydrationWarning>
            <span className="text-slate-500">تاريخ الطباعة:</span> {formatDateTime(printDate)}
          </p>
          <div className="flex items-center gap-2 mt-0.5 pt-0.5">
            <span className="text-[10.5px] font-bold font-mono text-slate-900">
              عدد السجلات: {totalCount}
            </span>
            {typeof globalTotal === "number" && globalTotal !== totalCount && (
              <span className="text-[9.5px] text-slate-500 font-mono">
                (من إجمالي عام {globalTotal})
              </span>
            )}
          </div>
          {filterSummary && filterSummary !== "جميع السجلات (إجمالي عام بدون فلترة)" && (
            <p className="text-[9px] text-slate-600 font-mono mt-0.5 max-w-xs text-right">
              <span className="font-bold text-slate-700">الفلاتر:</span> {filterSummary}
            </p>
          )}
        </div>
      </div>

      {/* ─── محتوى التقرير المطلوب طباعته ─── */}
      <div className="w-full">
        {children}
      </div>

      {/* ─── تذييل بسيط مختصر في سطر واحد ─── */}
      <div className="hidden print:flex items-center justify-between mt-3 pt-2 border-t border-slate-300 text-[9px] text-slate-500 font-mono print-footer-container">
        <span>منظومة تتبع قضايا المسؤولية الطبية — رئاسة مجلس الوزراء</span>
        <span>محرر إلكتروني رسمي مستخرج آلياً في {formatDateTime(printDate)}</span>
      </div>
    </>
  );
}
