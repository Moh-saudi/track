"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Headphones,
  Lightbulb,
  Eye,
  EyeOff,
  X,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        if (res.error.includes("LOCKED_SUBCOMMITTEE")) {
          setError(
            "عذراً، تم إيقاف نشاط هذه اللجنة الفرعية وقفل حساباتها مؤقتاً بقرار إداري. يُرجى مراجعة مدير النظام أو التواصل مع الدعم الفني مباشرة."
          );
        } else {
          setError("بيانات الدخول غير صحيحة — يرجى التحقق من البريد الإلكتروني وكلمة المرور");
        }
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-3 sm:p-6 font-body" dir="rtl">
      {/* حاوية النافذة المقسمة لشاشات الدخول الرسمية */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        {/* ─── الجانب الأيمن: الشعار والعنوان مع هوية teal-900 / slate-900 ─── */}
        <div className="lg:col-span-6 relative bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white p-8 sm:p-12 flex flex-col justify-between overflow-hidden">
          {/* الصورة الطبية بشفافية كخلفية رسمية */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/medical_bg.jpg"
              alt="بيئة طبية ورسمية"
              className="w-full h-full object-cover opacity-20 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-teal-950/80 to-slate-900/80" />
          </div>

          {/* محتوى الجانب الأيمن */}
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 backdrop-blur-sm text-xs font-semibold text-white font-heading">
              <span>جمهورية مصر العربية</span>
              <span>•</span>
              <span>رئاسة مجلس الوزراء</span>
            </div>

            <div className="space-y-3">
              <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-2.5 flex items-center justify-center shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logo.svg"
                  alt="شعار جمهورية مصر العربية"
                  className="w-full h-full object-contain drop-shadow"
                />
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-white leading-tight tracking-tight font-heading">
                اللجنة العليا للمسؤولية الطبية وسلامة المريض
              </h1>

              <div className="inline-block px-3 py-1 rounded-lg bg-teal-500/20 border border-teal-300/30 text-xs sm:text-sm font-semibold text-teal-200 font-heading">
                المنظومة الرقمية لتتبع قضايا اللجنة العليا للمسؤولية الطبية
              </div>
            </div>
          </div>
        </div>

        {/* ─── الجانب الأيسر: فورم تسجيل الدخول ─── */}
        <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-between bg-white">
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <Badge variant="teal" size="md">
                  بوابة الدخول الموحدة
                </Badge>
                <span className="text-xs text-slate-400 font-medium">نظام رسمي مؤمن</span>
              </div>
              <h2 className="text-2xl font-bold font-heading text-slate-900 mt-2">تسجيل الدخول للمنظومة</h2>
              <p className="text-xs text-slate-500 font-body mt-0.5">
                أدخل البريد الإلكتروني وكلمة المرور المسجلة بسجلات اللجنة
              </p>
            </div>

            {error && (
              <div className="alert-error text-xs">
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 font-body">البريد الإلكتروني المعتمد</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@cabinet.gov.eg"
                    className="w-full h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 placeholder:text-slate-400 font-body transition-all focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 font-body">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-11 rounded-xl border border-slate-300 bg-white pl-4 pr-12 text-sm text-slate-900 placeholder:text-slate-400 font-body transition-all focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20 font-mono"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-teal-600 rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
                    title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* خيار تذكرني وزر الدعم الفني */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-teal-600 focus:ring-teal-600"
                  />
                  <span>تذكرني على هذا الجهاز</span>
                </label>

                <button
                  type="button"
                  onClick={() => setShowSupportModal(true)}
                  className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline flex items-center gap-1 font-body"
                >
                  <Headphones className="w-3.5 h-3.5" />
                  <span>نسيت كلمة المرور؟ الدعم الفني</span>
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={isPending}
                className="w-full h-11 text-sm font-bold shadow-sm mt-2"
              >
                {isPending ? "جارٍ التحقق والدخول..." : "دخول المنظومة"}
              </Button>
            </form>

            {/* إشعار الأمان والسرية الحكومية */}
            <div className="pt-4 border-t border-slate-100">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-xs">
                  <p className="font-bold text-slate-800 font-heading">
                    منظومة حكومية رسمية مشفرة
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed font-body">
                    الدخول مقصور على السادة الأعضاء والموظفين المصرح لهم رسمياً بموجب القرار الوزاري. كافة محاولات الدخول وأنشطة المستخدمين مسجلة ومراقبة أمنياً.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* تذييل النافذة */}
          <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-body">
            <span>منظومة إلكترونية موحدة ومؤمنة</span>
            <span>الإصدار 2.4</span>
          </div>
        </div>
      </div>

      {/* ─── نافذة الدعم الفني الخاص باللجنة للتحديات التقنية وإعادة تعيين كلمة المرور (Modal) ─── */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-body" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 font-heading">الدعم الفني وإعادة تعيين كلمة المرور</h3>
                  <p className="text-xs text-slate-500">الأمانة الفنية — اللجنة العليا للمسؤولية الطبية</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold font-heading text-xs">
                  <Lightbulb className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>سياسة إعادة تعيين كلمة المرور:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  طبقاً للوائح السرية والحماية الحكومية، <strong>تتم إعادة تعيين كلمة المرور حصراً من خلال مدير النظام</strong> بعد التحقق المباشر من هوية صاحب الحساب لضمان عدم اختراق أو تغيير صلاحيات أي مستخدم دون علمه.
                </p>
              </div>

              <p className="text-slate-600 font-medium">
                يمكنكم التواصل المباشر مع إدارة المنظومة والدعم الفني عبر القنوات المعتمدة التالية:
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">الهاتف والخط الساخن:</span>
                  <span className="font-mono font-bold text-teal-800" dir="ltr">02-2792-8800</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">البريد الإلكتروني المعتمد:</span>
                  <a
                    href="mailto:support@med-committee.gov.eg?subject=طلب%20إعادة%20تعيين%20كلمة%20المرور"
                    className="font-mono text-teal-700 hover:underline font-semibold"
                    dir="ltr"
                  >
                    support@med-committee.gov.eg
                  </a>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">مواعيد الدعم والعمل:</span>
                  <span className="font-semibold text-slate-800">الأحد - الخميس (8:30 ص - 4:30 م)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">مقر الأمانة الفنية:</span>
                  <span className="font-semibold text-slate-800">مقر رئاسة مجلس الوزراء — القاهرة</span>
                </div>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-900 flex items-start gap-2">
                <Lightbulb className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
                <span><strong>ملاحظة:</strong> للمقررين وأعضاء اللجان الفرعية، يمكن إرسال طلب إعادة تعيين كلمة المرور مباشرة عبر مسؤول النظم والتحول الرقمي.</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setShowSupportModal(false)}
                className="w-full"
              >
                إغلاق النافذة
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
