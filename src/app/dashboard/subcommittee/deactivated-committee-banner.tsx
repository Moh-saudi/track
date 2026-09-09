"use client";

import { useState } from "react";
import {
  ShieldAlert,
  Headphones,
  Info,
  X,
  Phone,
  Mail,
  AlertTriangle,
  Lock,
} from "lucide-react";

interface DeactivatedCommitteeBannerProps {
  committeeName: string;
  reason?: string | null;
}

export function DeactivatedCommitteeBanner({
  committeeName,
  reason,
}: DeactivatedCommitteeBannerProps) {
  const [showModal, setShowModal] = useState(true);
  const [showSupportDetails, setShowSupportDetails] = useState(false);

  return (
    <>
      {/* ─── البنر التحذيري الثابت بأعلى الشاشة ─── */}
      <div className="rounded-2xl border-2 border-amber-300 bg-amber-50/90 p-5 shadow-xs font-body space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold font-heading text-amber-950 flex items-center gap-2">
                <span>تنبيه إداري رسمي: نشاط اللجنة الفرعية ({committeeName}) موقوف مؤقتاً بقرار إداري</span>
              </h3>
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                الحساب يعمل حالياً في <strong>وضع القراءة والأرشفة والاطلاع فقط</strong>. تم تعليق صلاحيات جدولة الجلسات وإصدار التقارير الطبية وإضافة الأطباء مؤقتاً، مع الاحتفاظ بكافة السجلات القضائية السابقة كأرشيف محفوظ.
              </p>
              {reason && (
                <div className="text-xs text-amber-950 bg-amber-100/70 px-3 py-1.5 rounded-lg border border-amber-200 mt-1">
                  <strong>توجيهات الإدارة:</strong> {reason}
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSupportDetails(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors shadow-xs shrink-0 self-start sm:self-center font-heading"
          >
            <Headphones className="w-4 h-4" />
            <span>التواصل مع الدعم الفني ومدير النظام</span>
          </button>
        </div>
      </div>

      {/* ─── النافذة التنبيهية المنبثقة عند فتح الصفحة (Modal Popup) ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs font-body animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-heading text-slate-900">
                    تنبيه إيقاف مؤقت للجنة الفرعية
                  </h3>
                  <p className="text-xs text-slate-500 font-body">{committeeName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold font-heading">
                  <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>الحساب في وضع الاطلاع والأرشفة فقط</span>
                </div>
                <p className="text-amber-950 leading-relaxed font-medium">
                  نحيطكم علماً بأنه قد تم إيقاف نشاط هذه اللجنة الفرعية مؤقتاً بقرار من مدير المنظومة. يمكنك استعراض كافة السجلات والتقارير الطبية السابقة للاطلاع والأرشفة، مع إيقاف استقبال قضايا جديدة أو تعديل السجلات.
                </p>
                {reason && (
                  <div className="p-2.5 rounded-xl bg-white border border-amber-200 text-amber-900 font-medium">
                    <span className="font-bold block text-[11px] text-amber-700">توجيهات أو سبب الإيقاف:</span>
                    <span className="text-xs">{reason}</span>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-800 font-heading block">
                  لإعادة التفعيل أو الاستفسار، يرجى مراجعة إدارة المنظومة:
                </span>
                <div className="flex items-center justify-between text-slate-600">
                  <span>الخط المباشر للدعم:</span>
                  <span className="font-mono font-bold text-teal-800" dir="ltr">02-2792-8800</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>البريد الإلكتروني المعتمد:</span>
                  <span className="font-mono font-semibold text-slate-800" dir="ltr">support@med-committee.gov.eg</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setShowSupportDetails(true);
                }}
                className="h-10 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold font-body transition-colors"
              >
                بيانات التواصل بالدعم الفني
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="h-10 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold font-body transition-colors shadow-xs"
              >
                موافق ومتابعة الاطلاع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── نافذة بيانات التواصل مع الدعم الفني ومدير النظام ─── */}
      {showSupportDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-body animate-in fade-in" dir="rtl">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">
                    التواصل مع الدعم الفني ومدير المنظومة
                  </h3>
                  <p className="text-xs text-slate-500">الأمانة الفنية — اللجنة العليا للمسؤولية الطبية</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportDetails(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <p className="text-slate-600 font-medium">
                لإعادة تفعيل نشاط اللجنة الفرعية أو طلب إعادة تعيين كلمات المرور، يمكنكم التواصل المباشر مع إدارة المنظومة:
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">الهاتف والخط الساخن:</span>
                  <span className="font-mono font-bold text-teal-800" dir="ltr">02-2792-8800</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">البريد الإلكتروني الرسمي:</span>
                  <a
                    href="mailto:support@med-committee.gov.eg?subject=استفسار%20إيقاف%20نشاط%20لجنة%20فرعية"
                    className="font-mono text-teal-700 hover:underline font-semibold"
                    dir="ltr"
                  >
                    support@med-committee.gov.eg
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">مواعيد الدعم الفني:</span>
                  <span className="font-semibold text-slate-800">الأحد - الخميس (8:30 ص - 4:30 م)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">المقر الإداري:</span>
                  <span className="font-semibold text-slate-800">مقر رئاسة مجلس الوزراء — القاهرة</span>
                </div>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs">
                <span>
                  * ملاحظة: يتم تنفيذ طلبات إعادة تفعيل اللجان وإعادة تعيين كلمات المرور حصراً بواسطة مدير المنظومة بعد التنسيق مع الأمانة الفنية.
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSupportDetails(false)}
                className="w-full h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
