"use client";

import { useState, useTransition } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CabinetLogo } from "@/components/CabinetLogo";

export default function LoginPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showSupportModal, setShowSupportModal] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    });
  }

  function fillRole(accountEmail: string) {
    setEmail(accountEmail);
    setPassword("ChangeMe123!");
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-3 sm:p-6" dir="rtl">
      {/* حاوية النافذة المقسمة لشاشات الدخول الرسمية */}
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        
        {/* ─── الجانب الأيمن: الشعار والعنوان مع صورة طبية بشفافية 40% ─── */}
        <div className="lg:col-span-6 relative bg-gradient-to-br from-[#12314e] via-[#1F4E79] to-[#153a5c] text-white p-8 sm:p-12 flex flex-col justify-between overflow-hidden">
          {/* الصورة الطبية بشفافية 40% كخلفية رسمية هادئة */}
          <div className="absolute inset-0 z-0 pointer-events-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/medical_bg.jpg"
              alt="بيئة طبية ورسمية"
              className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#102942]/90 via-[#1F4E79]/80 to-[#1F4E79]/70" />
          </div>

          {/* محتوى الجانب الأيمن (فوق الخلفية) */}
          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm text-xs font-bold text-white/95">
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
              
              <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight">
                اللجنة العليا للمسؤولية الطبية وسلامة المريض
              </h1>

              <div className="inline-block px-3 py-1 rounded-lg bg-blue-500/20 border border-blue-300/30 text-xs sm:text-sm font-bold text-blue-100">
                المنظومة الرقمية لتتبع قضايا اللجنة العليا للمسؤولية الطبية
              </div>
            </div>

            <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed max-w-md font-medium">
              المنصة الوطنية الموحدة لتسجيل وتداول وتوجيه التقارير الفنية الطبية بدقة وشفافية، وضمان حيادية لجان الفحص وتتبع الالتزام بالمدد المقررة قانوناً.
            </p>
          </div>

          {/* تذييل رسمي وقور في أسفل الجانب الأيمن */}
          <div className="relative z-10 pt-6 border-t border-white/15 flex items-center justify-between text-xs text-blue-100/70 font-medium">
            <span>جمهورية مصر العربية</span>
            <span>بوابة العمل الرسمية المعتمدة</span>
          </div>
        </div>

        {/* ─── الجانب الأيسر: فورم تسجيل الدخول ─── */}
        <div className="lg:col-span-6 p-6 sm:p-10 flex flex-col justify-between bg-white">
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#1F4E79] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
                  بوابة الدخول الموحدة
                </span>
                <span className="text-[11px] text-slate-400 font-medium">نظام رسمي مؤمن</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 mt-2">تسجيل الدخول للمنظومة</h2>
              <p className="text-xs text-slate-500 mt-0.5">
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
                <label className="block text-sm font-bold text-slate-800">البريد الإلكتروني المعتمد</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@cabinet.gov.eg"
                    className="w-full h-12 rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900 placeholder:text-slate-400 font-medium transition-all focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-800">كلمة المرور</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full h-12 rounded-xl border border-slate-300 bg-white pl-4 pr-12 text-base text-slate-900 placeholder:text-slate-400 font-medium transition-all focus:border-[#1F4E79] focus:outline-none focus:ring-2 focus:ring-[#1F4E79]/20"
                    dir="ltr"
                  />
                  {/* زر إظهار وإخفاء الرقم السري على اليمين بأيقونة واضحة دون أي تداخل مع الأحرف */}
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[#1F4E79] rounded-lg hover:bg-slate-100 transition-colors focus:outline-none"
                    title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* خيار تذكرني وزر الدعم الفني */}
              <div className="flex items-center justify-between text-sm pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-slate-700 font-semibold">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-[#1F4E79] focus:ring-[#1F4E79]"
                  />
                  <span>تذكرني على هذا الجهاز</span>
                </label>

                {/* زر التواصل مع الدعم الفني الخاص باللجنة */}
                <button
                  type="button"
                  onClick={() => setShowSupportModal(true)}
                  className="text-sm font-bold text-[#1F4E79] hover:text-[#173d61] hover:underline flex items-center gap-1.5"
                >
                  <span>🎧</span>
                  <span>الدعم الفني للجنة</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="btn-primary w-full h-12 text-base font-bold shadow-md mt-2"
              >
                {isPending ? "جارٍ التحقق والدخول..." : "دخول المنظومة"}
              </button>
            </form>

            {/* أزرار التجربة السريعة للأدوار */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <p className="text-[11px] font-bold text-slate-500 text-center">
                دخول سريع لاختبار الأدوار الرسمية (كلمة المرور: ChangeMe123!):
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => fillRole("followup@example.local")}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-[#1F4E79] border border-slate-200 hover:border-[#1F4E79]/40 text-right font-bold transition-colors"
                >
                  ⚖️ موظف المتابعة والتوجيه
                </button>
                <button
                  type="button"
                  onClick={() => fillRole("clerk@example.local")}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-[#1F4E79] border border-slate-200 hover:border-[#1F4E79]/40 text-right font-bold transition-colors"
                >
                  📝 موظف قيد السجلات
                </button>
                <button
                  type="button"
                  onClick={() => fillRole("dr.ahmed@example.local")}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-[#1F4E79] border border-slate-200 hover:border-[#1F4E79]/40 text-right font-bold transition-colors"
                >
                  👨‍⚕️ مقرر لجنة الفحص
                </button>
                <button
                  type="button"
                  onClick={() => fillRole("admin@example.local")}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-[#1F4E79] border border-slate-200 hover:border-[#1F4E79]/40 text-right font-bold transition-colors"
                >
                  ⚙️ مدير المنظومة (ADMIN)
                </button>
              </div>
            </div>
          </div>

          {/* تذييل الصفحة */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>جميع الحقوق محفوظة © رئاسة مجلس الوزراء</span>
            <span>الإصدار 2.4</span>
          </div>
        </div>

      </div>

      {/* ─── نافذة الدعم الفني الخاص باللجنة للتحديات التقنية (Modal) ─── */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1F4E79] border border-blue-200 flex items-center justify-center text-xl font-bold">
                  🎧
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">الدعم الفني والمساندة التقنية</h3>
                  <p className="text-[11px] text-slate-500">الأمانة الفنية — اللجنة العليا للمسؤولية الطبية</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
              <p className="text-slate-600">
                في حال مواجهة أي صعوبة في الدخول أو تحديات تقنية في المنظومة، يمكنكم التواصل المباشر مع فريق الدعم والمساندة الفنية:
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">الخط الداخلي المباشر:</span>
                  <span className="font-black text-[#1F4E79]" dir="ltr">02-2792-XXXX</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">البريد الإلكتروني المعتمد:</span>
                  <span className="font-bold text-slate-800" dir="ltr">support@med-committee.gov.eg</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">مواعيد العمل:</span>
                  <span className="font-bold text-slate-800">الأحد - الخميس (8:30 ص - 4:30 م)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">مقر الأمانة الفنية:</span>
                  <span className="font-bold text-slate-800">مقر رئاسة مجلس الوزراء</span>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-[#1F4E79]">
                💡 <strong>ملاحظة:</strong> للمقررين وأعضاء اللجان الفرعية، يمكن إرسال طلب إعادة تعيين كلمة المرور مباشرة عبر مسؤول النظم والتحول الرقمي.
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowSupportModal(false)}
                className="btn-primary w-full py-2 text-xs font-bold"
              >
                إغلاق النافذة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
