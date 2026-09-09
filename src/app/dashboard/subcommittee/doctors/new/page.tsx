"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader, Card, Button } from "@/components/ui";
import {
  User,
  CreditCard,
  Building,
  Save,
  ArrowRight,
} from "lucide-react";

interface Specialty {
  id: string;
  name: string;
}

const EGYPTIAN_BANKS = [
  "البنك الأهلي المصري (ميزة / مرتبات حكومية)",
  "بنك مصر (فيزا / ميزة مرتبات)",
  "بنك القاهرة",
  "بنك التعمير والإسكان",
  "بنك الإسكندرية",
  "البنك التجاري الدولي (CIB)",
  "بنك قناة السويس",
  "بنك فيصل الإسلامي المصري",
  "مصرف أبو ظبي الإسلامي",
  "بنك قطر الوطني (QNB)",
  "بنك البركة مصر",
  "أخرى / بنك آخر",
];

export default function NewDoctorPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [error, setError] = useState<string | null>(null);

  // حقول الطبيب الشخصية والمهنية
  const [name, setName] = useState("");
  const [title, setTitle] = useState("أستاذ دكتور");
  const [employer, setEmployer] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // البيانات المالية والمصرفية
  const [nationalId, setNationalId] = useState("");
  const [financialType, setFinancialType] = useState<"PAYROLL_CARD" | "BANK_ACCOUNT" | "BANK_CARD">("PAYROLL_CARD");
  const [bankName, setBankName] = useState("البنك الأهلي المصري (ميزة / مرتبات حكومية)");
  const [customBankName, setCustomBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [cardNumber, setCardNumber] = useState("");

  useEffect(() => {
    async function loadSpecialties() {
      try {
        const res = await fetch("/api/specialties");
        if (res.ok) setSpecialties(await res.json());
      } catch (err) {
        console.error(err);
      }
    }
    loadSpecialties();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("يرجى إدخال اسم الطبيب كاملاً");
      return;
    }

    if (!employer.trim()) {
      setError("يرجى إدخال جهة عمل الطبيب لفحص تعارض المصالح آلياً");
      return;
    }

    const resolvedBankName = bankName === "أخرى / بنك آخر" ? customBankName : bankName;

    startTransition(async () => {
      try {
        const res = await fetch("/api/subcommittee/doctors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            title,
            employer: employer.trim(),
            specialtyId: specialtyId || undefined,
            phone: phone.trim() || undefined,
            notes: notes.trim() || undefined,
            nationalId: nationalId.trim() || undefined,
            financialType,
            bankName: resolvedBankName || undefined,
            accountNumber: financialType === "BANK_ACCOUNT" ? (accountNumber.trim() || undefined) : undefined,
            iban: financialType === "BANK_ACCOUNT" ? (iban.trim() || undefined) : undefined,
            cardNumber: (financialType === "PAYROLL_CARD" || financialType === "BANK_CARD") ? (cardNumber.trim() || undefined) : undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "تعذر إضافة الطبيب");
        }

        router.push("/dashboard/subcommittee/doctors");
        router.refresh();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ─── رأس الصفحة الموحد ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "اللجان الفرعية", href: "/dashboard/subcommittee" },
          { label: "سجل أطباء اللجنة", href: "/dashboard/subcommittee/doctors" },
          { label: "قيد طبيب جديد" },
        ]}
        title="قيد طبيب استشاري جديد وبياناته المالية"
        description="تسجيل الأطباء وحسابات الصرف المصرفية لتظهر فوراً للمسؤول المالي عند صرف المستحقات."
        actions={
          <Link
            href="/dashboard/subcommittee/doctors"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs sm:text-sm font-medium hover:bg-slate-50 shadow-xs font-body"
          >
            <ArrowRight className="w-4 h-4" />
            <span>عودة لسجل الأطباء</span>
          </Link>
        }
      />

      <Card className="space-y-6 p-6 sm:p-8">
        {error && (
          <div className="alert-error text-xs">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 1. البيانات الشخصية والمهنية */}
          <div className="space-y-4">
            <span className="text-xs font-bold font-heading text-teal-800 flex items-center gap-1.5">
              <User className="w-4 h-4 text-teal-600" />
              <span>البيانات الشخصية والمهنية</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label form-label-required">اسم الطبيب الاستشاري كاملاً</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: أ.د. شريف كمال الدين"
                  className="form-input text-xs"
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">الدرجة واللقب العلمي</label>
                <select
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="form-select text-xs"
                >
                  <option value="أستاذ دكتور">أستاذ دكتور (Prof. Dr.)</option>
                  <option value="أستاذ مساعد">أستاذ مساعد</option>
                  <option value="استشاري أول">استشاري أول</option>
                  <option value="استشاري">استشاري</option>
                  <option value="زميل / باحث">زميل / باحث</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">جهة العمل / المستشفى التابع لها</label>
                <input
                  type="text"
                  required
                  value={employer}
                  onChange={(e) => setEmployer(e.target.value)}
                  placeholder="مثال: مستشفى قصر العيني الفرنساوي"
                  className="form-input text-xs"
                />
                <span className="text-[10px] text-slate-500">لفحص تعارض المصالح آلياً ضد المستشفى المشكو في حقه</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">التخصص الطبي الدقيق</label>
                <select
                  value={specialtyId}
                  onChange={(e) => setSpecialtyId(e.target.value)}
                  className="form-select text-xs"
                >
                  <option value="">— اختر التخصص الطبي —</option>
                  {specialties.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">الرقم القومي (14 رقماً)</label>
                <input
                  type="text"
                  maxLength={14}
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ""))}
                  placeholder="2XXXXXXXXXXXXX"
                  className="form-input text-xs font-mono"
                  dir="ltr"
                />
                <span className="text-[10px] text-slate-500">إلزامي لصرف المكافآت الحكومية</span>
              </div>

              <div className="form-group">
                <label className="form-label">رقم الهاتف للتواصل الرسمي</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="form-input text-xs font-mono"
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          {/* 2. البيانات المالية وصرف المستحقات */}
          <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-200/80 space-y-4">
            <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
              <span className="text-xs font-bold font-heading text-purple-950 flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-purple-700" />
                <span>البيانات المالية وصرف المستحقات (تظهر للمسؤول المالي مباشرة)</span>
              </span>
              <span className="text-xs text-purple-800 font-medium font-body">فيزا مرتبات / حساب بنكي / كارت</span>
            </div>

            {/* اختيار نوع وسيلة الصرف والتحويل */}
            <div className="space-y-2">
              <span className="text-xs font-bold font-heading text-slate-700 block">طريقة تحويل وصرف الأتعاب والمكافآت:</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-body">
                <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                  financialType === "PAYROLL_CARD"
                    ? "bg-purple-100/70 border-purple-400 text-purple-950 shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}>
                  <input
                    type="radio"
                    name="financialType"
                    checked={financialType === "PAYROLL_CARD"}
                    onChange={() => setFinancialType("PAYROLL_CARD")}
                    className="text-purple-700 focus:ring-purple-700"
                  />
                  <div>
                    <span className="font-bold block flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>فيزا مرتبات حكومية</span>
                    </span>
                    <span className="text-[10px] text-slate-500">كارت ميزة مرتبات للمستشفيات والجامعات</span>
                  </div>
                </label>

                <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                  financialType === "BANK_ACCOUNT"
                    ? "bg-teal-50 border-teal-400 text-teal-950 shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}>
                  <input
                    type="radio"
                    name="financialType"
                    checked={financialType === "BANK_ACCOUNT"}
                    onChange={() => setFinancialType("BANK_ACCOUNT")}
                    className="text-teal-600 focus:ring-teal-600"
                  />
                  <div>
                    <span className="font-bold block flex items-center gap-1">
                      <Building className="w-3.5 h-3.5" />
                      <span>حساب بنكي شخصي</span>
                    </span>
                    <span className="text-[10px] text-slate-500">تحويل بنكي / IBAN شخصي</span>
                  </div>
                </label>

                <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                  financialType === "BANK_CARD"
                    ? "bg-emerald-100/70 border-emerald-400 text-emerald-950 shadow-xs"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}>
                  <input
                    type="radio"
                    name="financialType"
                    checked={financialType === "BANK_CARD"}
                    onChange={() => setFinancialType("BANK_CARD")}
                    className="text-emerald-700 focus:ring-emerald-700"
                  />
                  <div>
                    <span className="font-bold block flex items-center gap-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>فيزا / كارت بنكي خاص</span>
                    </span>
                    <span className="text-[10px] text-slate-500">كارت بنكي شخصي عادي</span>
                  </div>
                </label>
              </div>
            </div>

            {/* حقول الإدخال حسب نوع الوسيلة */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="form-group">
                <label className="form-label">
                  {financialType === "PAYROLL_CARD" ? "بنك صرف المرتبات" : "اسم البنك"}
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="form-select text-xs"
                >
                  {EGYPTIAN_BANKS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {bankName === "أخرى / بنك آخر" && (
                <div className="form-group">
                  <label className="form-label">حدد اسم البنك</label>
                  <input
                    type="text"
                    value={customBankName}
                    onChange={(e) => setCustomBankName(e.target.value)}
                    placeholder="اسم البنك..."
                    className="form-input text-xs"
                  />
                </div>
              )}

              {financialType === "PAYROLL_CARD" ? (
                <div className="form-group sm:col-span-2">
                  <label className="form-label form-label-required">رقم كارت فيزا المرتبات (16 رقماً)</label>
                  <input
                    type="text"
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="XXXX XXXX XXXX XXXX"
                    className="form-input text-xs font-mono"
                    dir="ltr"
                  />
                  <span className="text-[10px] text-purple-900 font-medium">
                    رقم كارت ميزة للمرتبات الحكومية المسلم للطبيب من جهة عمله الحكومية
                  </span>
                </div>
              ) : financialType === "BANK_ACCOUNT" ? (
                <>
                  <div className="form-group">
                    <label className="form-label">رقم الحساب البنكي</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="رقم الحساب لدى البنك..."
                      className="form-input text-xs font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">رقم الآيبان (IBAN) اختياري</label>
                    <input
                      type="text"
                      value={iban}
                      onChange={(e) => setIban(e.target.value)}
                      placeholder="EGXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      className="form-input text-xs font-mono"
                      dir="ltr"
                    />
                  </div>
                </>
              ) : (
                <div className="form-group sm:col-span-2">
                  <label className="form-label">رقم كارت الفيزا / ميزة</label>
                  <input
                    type="text"
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="XXXX XXXX XXXX XXXX"
                    className="form-input text-xs font-mono"
                    dir="ltr"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 3. ملاحظات إدارية */}
          <div className="form-group">
            <label className="form-label">ملاحظات إدارية</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات تخص الطبيب أو جدول مواعيده..."
              className="form-input text-xs"
            />
          </div>

          {/* أزرار الحفظ والإلغاء */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <Link href="/dashboard/subcommittee/doctors">
              <Button type="button" variant="secondary">
                إلغاء
              </Button>
            </Link>
            <Button
              type="submit"
              variant="primary"
              loading={isPending}
              icon={<Save className="w-4 h-4" />}
            >
              حفظ وقيد الطبيب باللجنة
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
