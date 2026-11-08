import Link from "next/link";
import { AlertCircle, ArrowRight } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-body" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl text-center space-y-4">
        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200/80">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold font-heading text-slate-900">الصفحة أو السجل غير موجود</h1>
        <p className="text-xs text-slate-500 leading-relaxed font-body">
          عذراً، لم يتم العثور على الصفحة أو السجل المطلوب، قد يكون الرابط غير صحيح أو تم نقل الملف.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full h-11 px-5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold font-heading transition-colors shadow-xs"
          >
            <span>العودة للوحة التحكم الرئيسية</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

