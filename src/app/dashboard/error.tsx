"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Copy, Home, RefreshCw, ShieldCheck, Wrench } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const reference = error.digest || "غير متاح";

  useEffect(() => {
    console.error("Dashboard render error:", error);
  }, [error]);

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="min-h-[65vh] flex items-center justify-center px-4 py-10" dir="rtl">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-l from-teal-50 via-white to-slate-50 p-6 sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-800">
                <ShieldCheck className="h-3.5 w-3.5" />
                المنظومة ما زالت تعمل بصورة آمنة
              </div>
              <h1 className="font-heading text-xl font-bold text-slate-900 sm:text-2xl">
                تعذر تحميل هذه الصفحة مؤقتًا
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-7 text-slate-600">
                حدث خطأ أثناء تجهيز بيانات الصفحة. يمكنك إعادة المحاولة الآن، وإذا استمرت المشكلة تواصل مع الدعم الفني مع إرسال الرقم المرجعي الظاهر أدناه.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6 sm:p-8">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">الرقم المرجعي للدعم الفني</p>
                <p className="mt-1 break-all font-mono text-sm font-bold text-slate-800">{reference}</p>
              </div>
              <button
                type="button"
                onClick={copyReference}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "تم النسخ" : "نسخ الرقم"}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-bold text-white transition-colors hover:bg-teal-700"
            >
              <RefreshCw className="h-4 w-4" />
              إعادة المحاولة
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              تحديث الصفحة
            </button>

            <a
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Home className="h-4 w-4" />
              العودة للرئيسية
            </a>
          </div>

          <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900">
            <Wrench className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="text-xs leading-6">
              إذا تكرر الخطأ بعد تحديث الصفحة، تواصل مع الدعم الفني وأرسل الرقم المرجعي حتى يمكن تحديد سبب المشكلة بسرعة دون مشاركة أي بيانات حساسة من السجل.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
