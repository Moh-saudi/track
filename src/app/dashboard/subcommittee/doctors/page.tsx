"use client";

import { useState, useEffect, useTransition } from "react";

interface Specialty {
  id: string;
  name: string;
}

interface Doctor {
  id: string;
  name: string;
  title: string | null;
  employer: string;
  specialtyId: string | null;
  specialty?: Specialty | null;
  phone: string | null;
  active: boolean;
  notes: string | null;
  nationalId?: string | null;
  financialType?: "PAYROLL_CARD" | "BANK_ACCOUNT" | "BANK_CARD" | null;
  bankName?: string | null;
  accountNumber?: string | null;
  iban?: string | null;
  cardNumber?: string | null;
  createdAt: string;
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

export default function SubcommitteeDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [showAddForm, setShowAddForm] = useState(false);

  // حقول إضافة طبيب جديد
  const [name, setName] = useState("");
  const [title, setTitle] = useState("أستاذ دكتور");
  const [employer, setEmployer] = useState("");
  const [specialtyId, setSpecialtyId] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // البيانات المالية - الافتراضي فيزا مرتبات للأطباء الحكوميين
  const [nationalId, setNationalId] = useState("");
  const [financialType, setFinancialType] = useState<"PAYROLL_CARD" | "BANK_ACCOUNT" | "BANK_CARD">("PAYROLL_CARD");
  const [bankName, setBankName] = useState("البنك الأهلي المصري (ميزة / مرتبات حكومية)");
  const [customBankName, setCustomBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [iban, setIban] = useState("");
  const [cardNumber, setCardNumber] = useState("");

  // نافذة تعديل البيانات المالية
  const [editingFinanceDoc, setEditingFinanceDoc] = useState<Doctor | null>(null);
  const [editNationalId, setEditNationalId] = useState("");
  const [editFinancialType, setEditFinancialType] = useState<"PAYROLL_CARD" | "BANK_ACCOUNT" | "BANK_CARD">("PAYROLL_CARD");
  const [editBankName, setEditBankName] = useState("");
  const [editAccountNumber, setEditAccountNumber] = useState("");
  const [editIban, setEditIban] = useState("");
  const [editCardNumber, setEditCardNumber] = useState("");

  async function loadData() {
    try {
      const [docsRes, specRes] = await Promise.all([
        fetch("/api/subcommittee/doctors"),
        fetch("/api/specialties"),
      ]);

      if (!docsRes.ok) {
        const d = await docsRes.json();
        throw new Error(d.error || "تعذر تحميل سجل أطباء اللجنة");
      }

      setDoctors(await docsRes.json());
      if (specRes.ok) {
        setSpecialties(await specRes.json());
      }
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAddDoctor(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const resolvedBankName = bankName === "أخرى / بنك آخر" ? customBankName : bankName;

    startTransition(async () => {
      try {
        const res = await fetch("/api/subcommittee/doctors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            title,
            employer,
            specialtyId: specialtyId || undefined,
            phone: phone || undefined,
            notes: notes || undefined,
            nationalId: nationalId || undefined,
            financialType: financialType,
            bankName: resolvedBankName || undefined,
            accountNumber: financialType === "BANK_ACCOUNT" ? (accountNumber || undefined) : undefined,
            iban: financialType === "BANK_ACCOUNT" ? (iban || undefined) : undefined,
            cardNumber: (financialType === "PAYROLL_CARD" || financialType === "BANK_CARD") ? (cardNumber || undefined) : undefined,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "تعذر إضافة الطبيب");
        }

        setSuccessMsg(`تم قيد الطبيب (${data.name}) وحفظ بياناته المالية بنجاح`);
        setName("");
        setEmployer("");
        setSpecialtyId("");
        setPhone("");
        setNotes("");
        setNationalId("");
        setAccountNumber("");
        setIban("");
        setCardNumber("");
        setCustomBankName("");
        setShowAddForm(false);
        await loadData();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  function openFinanceModal(doc: Doctor) {
    setEditingFinanceDoc(doc);
    setEditNationalId(doc.nationalId || "");
    setEditFinancialType((doc.financialType as any) || "PAYROLL_CARD");
    setEditBankName(doc.bankName || "البنك الأهلي المصري (ميزة / مرتبات حكومية)");
    setEditAccountNumber(doc.accountNumber || "");
    setEditIban(doc.iban || "");
    setEditCardNumber(doc.cardNumber || "");
  }

  async function handleSaveFinanceUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingFinanceDoc) return;
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/subcommittee/doctors/${editingFinanceDoc.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nationalId: editNationalId || null,
            financialType: editFinancialType,
            bankName: editBankName || null,
            accountNumber: editFinancialType === "BANK_ACCOUNT" ? (editAccountNumber || null) : null,
            iban: editFinancialType === "BANK_ACCOUNT" ? (editIban || null) : null,
            cardNumber: (editFinancialType === "PAYROLL_CARD" || editFinancialType === "BANK_CARD") ? (editCardNumber || null) : null,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "تعذر تحديث البيانات المالية");

        setSuccessMsg(`تم تحديث البيانات المالية للطبيب (${editingFinanceDoc.name}) بنجاح`);
        setEditingFinanceDoc(null);
        await loadData();
      } catch (err: any) {
        setError(err.message);
      }
    });
  }

  async function handleToggleStatus(doc: Doctor) {
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/subcommittee/doctors/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !doc.active }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "تعذر تحديث حالة الطبيب");
      }

      setSuccessMsg(
        !doc.active
          ? `تم تنشيط الطبيب (${doc.name}) وإتاحته للفحص`
          : `تم الإيقاف المؤقت للطبيب (${doc.name}) بنجاح ولن يظهر في تشكيلات الفحص الجديدة`
      );
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleDeleteDoctor(doc: Doctor) {
    if (!confirm(`هل أنت متأكد من رغبتك في حذف الطبيب (${doc.name}) من سجل اللجنة؟`)) return;

    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/subcommittee/doctors/${doc.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "تعذر حذف الطبيب");
      }

      setSuccessMsg("تم حذف الطبيب من سجل اللجنة بنجاح");
      await loadData();
    } catch (err: any) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded bg-[#1F4E79]/10 text-[#1F4E79] border border-[#1F4E79]/20 text-[11px] font-bold">
              👨‍⚕️ إدارة الاستشاريين والبيانات المالية
            </span>
            <span className="text-xs text-slate-500 font-bold">اللجنة العليا للمسؤولية الطبية وسلامة المريض</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            سجل الأطباء واستشاريي اللجنة والبيانات المالية
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            قيد الأطباء وبيانات صرف المستحقات (فيزا مرتبات حكومية / حساب بنكي / كارت بنكي) لتظهر فوراً للمسؤول المالي
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary text-xs font-bold px-4 py-2.5 shadow-sm self-start sm:self-auto"
        >
          {showAddForm ? "إلغاء الإضافة" : "➕ قيد طبيب / استشاري جديد"}
        </button>
      </div>

      {/* التنبيهات ورسائل النجاح */}
      {error && (
        <div className="alert-error text-xs">
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="alert-success text-xs">
          <span>{successMsg}</span>
        </div>
      )}

      {/* نموذج إضافة طبيب جديد (قابل للطي) */}
      {showAddForm && (
        <div className="card border-slate-200 p-6 space-y-5 bg-slate-50/80 animate-in fade-in zoom-in-95">
          <div className="border-b border-slate-200 pb-3">
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <span>📝</span>
              <span>إضافة طبيب استشاري جديد وبياناته المالية لسجل اللجنة</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              الأطباء يسجلون في هذا الحصر فقط دون حسابات دخول، وتُربط حساباتهم بالشؤون المالية للصرف
            </p>
          </div>

          <form onSubmit={handleAddDoctor} className="space-y-5">
            {/* البيانات الشخصية والمهنية */}
            <div className="space-y-3">
              <span className="text-xs font-black text-[#1F4E79] flex items-center gap-1.5">
                <span>👤</span>
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

            {/* البيانات المالية وصرف المستحقات */}
            <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-200/80 space-y-4">
              <div className="flex items-center justify-between border-b border-purple-200/60 pb-2">
                <span className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                  <span>💳</span>
                  <span>البيانات المالية وصرف المستحقات (تظهر للمسؤول المالي مباشرة)</span>
                </span>
                <span className="text-[11px] text-purple-800 font-bold">فيزا مرتبات / حساب بنكي / كارت</span>
              </div>

              {/* اختيار نوع وسيلة الصرف والتحويل */}
              <div className="space-y-2">
                <span className="text-xs font-black text-slate-700 block">طريقة تحويل وصرف الأتعاب والمكافآت:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    financialType === "PAYROLL_CARD"
                      ? "bg-purple-100/70 border-purple-400 text-purple-950 shadow-sm"
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
                      <span className="font-black block">💳 فيزا مرتبات حكومية</span>
                      <span className="text-[10px] text-slate-500">كارت ميزة مرتبات للمستشفيات والجامعات</span>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    financialType === "BANK_ACCOUNT"
                      ? "bg-blue-100/70 border-blue-400 text-blue-950 shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}>
                    <input
                      type="radio"
                      name="financialType"
                      checked={financialType === "BANK_ACCOUNT"}
                      onChange={() => setFinancialType("BANK_ACCOUNT")}
                      className="text-[#1F4E79] focus:ring-[#1F4E79]"
                    />
                    <div>
                      <span className="font-black block">🏦 حساب بنكي شخصي</span>
                      <span className="text-[10px] text-slate-500">تحويل بنكي / IBAN شخصي</span>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                    financialType === "BANK_CARD"
                      ? "bg-emerald-100/70 border-emerald-400 text-emerald-950 shadow-sm"
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
                      <span className="font-black block">💳 فيزا / كارت بنكي خاص</span>
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                إلغاء
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary text-xs px-5 py-2 font-bold"
              >
                {isPending ? "جارٍ الحفظ..." : "حفظ وقيد الطبيب باللجنة"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* نافذة منبثقة لتعديل أو تحديث البيانات المالية */}
      {editingFinanceDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card max-w-lg w-full bg-white p-6 space-y-4 shadow-xl border-slate-200 animate-in fade-in zoom-in-95">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <span>💳</span>
                  <span>تحديث البيانات المالية: {editingFinanceDoc.name}</span>
                </h3>
                <p className="text-[11px] text-slate-500">تحديث فيزا المرتبات أو الحساب البنكي للصرف المالي المباشر</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingFinanceDoc(null)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFinanceUpdate} className="space-y-4">
              <div className="form-group">
                <label className="form-label">الرقم القومي (14 رقماً)</label>
                <input
                  type="text"
                  maxLength={14}
                  value={editNationalId}
                  onChange={(e) => setEditNationalId(e.target.value.replace(/\D/g, ""))}
                  placeholder="2XXXXXXXXXXXXX"
                  className="form-input text-xs font-mono"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1.5">
                <label className="form-label">طريقة تحويل وصرف الأتعاب:</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <label className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer ${
                    editFinancialType === "PAYROLL_CARD" ? "bg-purple-50 border-purple-400 text-purple-950 font-bold" : "border-slate-200"
                  }`}>
                    <input
                      type="radio"
                      name="editFinancialType"
                      checked={editFinancialType === "PAYROLL_CARD"}
                      onChange={() => setEditFinancialType("PAYROLL_CARD")}
                      className="text-purple-700"
                    />
                    <span>💳 فيزا مرتبات</span>
                  </label>
                  <label className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer ${
                    editFinancialType === "BANK_ACCOUNT" ? "bg-blue-50 border-blue-400 text-blue-950 font-bold" : "border-slate-200"
                  }`}>
                    <input
                      type="radio"
                      name="editFinancialType"
                      checked={editFinancialType === "BANK_ACCOUNT"}
                      onChange={() => setEditFinancialType("BANK_ACCOUNT")}
                      className="text-[#1F4E79]"
                    />
                    <span>🏦 حساب بنكي</span>
                  </label>
                  <label className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer ${
                    editFinancialType === "BANK_CARD" ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-bold" : "border-slate-200"
                  }`}>
                    <input
                      type="radio"
                      name="editFinancialType"
                      checked={editFinancialType === "BANK_CARD"}
                      onChange={() => setEditFinancialType("BANK_CARD")}
                      className="text-emerald-700"
                    />
                    <span>💳 كارت بنكي خاص</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">اسم البنك</label>
                <input
                  type="text"
                  value={editBankName}
                  onChange={(e) => setEditBankName(e.target.value)}
                  placeholder="مثال: البنك الأهلي المصري"
                  className="form-input text-xs"
                />
              </div>

              {editFinancialType === "PAYROLL_CARD" ? (
                <div className="form-group">
                  <label className="form-label">رقم كارت فيزا المرتبات (16 رقماً)</label>
                  <input
                    type="text"
                    value={editCardNumber}
                    onChange={(e) => setEditCardNumber(e.target.value)}
                    placeholder="XXXX XXXX XXXX XXXX"
                    className="form-input text-xs font-mono"
                    dir="ltr"
                  />
                </div>
              ) : editFinancialType === "BANK_ACCOUNT" ? (
                <>
                  <div className="form-group">
                    <label className="form-label">رقم الحساب البنكي</label>
                    <input
                      type="text"
                      value={editAccountNumber}
                      onChange={(e) => setEditAccountNumber(e.target.value)}
                      placeholder="رقم الحساب..."
                      className="form-input text-xs font-mono"
                      dir="ltr"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">رقم الآيبان (IBAN)</label>
                    <input
                      type="text"
                      value={editIban}
                      onChange={(e) => setEditIban(e.target.value)}
                      placeholder="EGXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      className="form-input text-xs font-mono"
                      dir="ltr"
                    />
                  </div>
                </>
              ) : (
                <div className="form-group">
                  <label className="form-label">رقم كارت الفيزا</label>
                  <input
                    type="text"
                    value={editCardNumber}
                    onChange={(e) => setEditCardNumber(e.target.value)}
                    placeholder="XXXX XXXX XXXX XXXX"
                    className="form-input text-xs font-mono"
                    dir="ltr"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingFinanceDoc(null)}
                  className="btn-secondary text-xs px-4 py-2"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="btn-primary text-xs px-5 py-2 font-bold"
                >
                  {isPending ? "جارٍ الحفظ..." : "تأكيد وحفظ التحديث المالي"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* بطاقات إحصائيات سريعة للجنة */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1F4E79] flex items-center justify-center text-xl font-bold border border-blue-200">
            👨‍⚕️
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{doctors.length}</p>
            <p className="text-xs font-bold text-slate-500">إجمالي الأطباء المقيدين</p>
          </div>
        </div>

        <div className="card p-4 border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-800 flex items-center justify-center text-xl font-bold border border-purple-200">
            💳
          </div>
          <div>
            <p className="text-2xl font-black text-purple-900">
              {doctors.filter((d) => d.financialType === "PAYROLL_CARD").length}
            </p>
            <p className="text-xs font-bold text-slate-500">فيزا مرتبات حكومية</p>
          </div>
        </div>

        <div className="card p-4 border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center text-xl font-bold border border-blue-200">
            🏦
          </div>
          <div>
            <p className="text-2xl font-black text-blue-900">
              {doctors.filter((d) => d.financialType === "BANK_ACCOUNT").length}
            </p>
            <p className="text-xs font-bold text-slate-500">حسابات بنكية شخصية</p>
          </div>
        </div>

        <div className="card p-4 border-slate-200 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl font-bold border border-emerald-200">
            🟢
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{doctors.filter((d) => d.active).length}</p>
            <p className="text-xs font-bold text-slate-500">أطباء متاحون للفحص</p>
          </div>
        </div>
      </div>

      {/* جدول أطباء واستشاريي اللجنة الفرعية */}
      <div className="card p-0 overflow-hidden border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-slate-800">قائمة الأطباء والاستشاريين والحسابات البنكية</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">تُفحص جهة عمل الطبيب لمنع تعارض المصالح، وتُحال بياناته البنكية للشؤون المالية</p>
          </div>
          <span className="text-xs font-bold text-slate-500">{doctors.length} طبيب مقيد</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">جارٍ تحميل سجل الأطباء...</div>
        ) : doctors.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-2">
            <p>لا يوجد أطباء مسجلون في حصر اللجنة الفرعية حتى الآن.</p>
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="btn-primary text-xs px-4 py-2"
            >
              ➕ قيد أول طبيب استشاري
            </button>
          </div>
        ) : (
          <div className="table-wrapper border-0 rounded-none">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>اسم الطبيب / اللقب</th>
                  <th>التخصص الطبي</th>
                  <th>جهة العمل / المستشفى</th>
                  <th>البيانات المالية وصرف المستحقات</th>
                  <th>الحالة في اللجنة</th>
                  <th>الهاتف</th>
                  <th className="text-center">الإجراءات والتحكم</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doc) => (
                  <tr key={doc.id} className={!doc.active ? "bg-slate-50/90 opacity-75" : undefined}>
                    <td className="font-bold text-slate-900 whitespace-nowrap">
                      <span className="text-slate-500 text-xs ml-1">{doc.title || "د."}</span>
                      <span>{doc.name}</span>
                      {doc.nationalId && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          الرقم القومي: {doc.nationalId}
                        </span>
                      )}
                    </td>

                    <td>
                      {doc.specialty ? (
                        <span className="inline-block text-[11px] px-2 py-0.5 rounded bg-blue-50 text-[#1F4E79] font-bold border border-blue-200">
                          🩺 {doc.specialty.name}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>

                    <td className="font-bold text-slate-800 text-xs">
                      🏥 {doc.employer}
                    </td>

                    {/* البيانات المالية والمصرفية */}
                    <td className="text-xs">
                      {doc.financialType === "PAYROLL_CARD" && (doc.bankName || doc.cardNumber) ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 font-black text-purple-900 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded text-[11px]">
                            <span>💳</span>
                            <span>فيزا مرتبات حكومية ({doc.bankName || "ميزة"})</span>
                          </span>
                          <span className="block text-[11px] font-mono text-purple-950 font-bold" dir="ltr">
                            {doc.cardNumber || "—"}
                          </span>
                        </div>
                      ) : doc.financialType === "BANK_ACCOUNT" && (doc.bankName || doc.accountNumber) ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-[11px]">
                            <span>🏦</span>
                            <span>حساب بنكي شخصي ({doc.bankName})</span>
                          </span>
                          <span className="block text-[11px] font-mono text-blue-900 font-bold" dir="ltr">
                            {doc.accountNumber || "—"}
                          </span>
                        </div>
                      ) : doc.financialType === "BANK_CARD" && (doc.bankName || doc.cardNumber) ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                            <span>💳</span>
                            <span>كارت بنكي خاص ({doc.bankName})</span>
                          </span>
                          <span className="block text-[11px] font-mono text-slate-700 font-bold" dir="ltr">
                            {doc.cardNumber || "—"}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">
                          ⚠️ بانتظار استيفاء البيانات
                        </span>
                      )}
                    </td>

                    <td>
                      {doc.active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          <span>نشط ومتاح للفحص</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                          <span>موقوف مؤقتاً</span>
                        </span>
                      )}
                    </td>

                    <td className="text-xs text-slate-600 font-mono" dir="ltr">
                      {doc.phone || "—"}
                    </td>

                    <td className="text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openFinanceModal(doc)}
                          className="text-xs px-2 py-1 rounded bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200 font-bold transition-colors"
                          title="تعديل أو استكمال فيزا المرتبات / الحساب البنكي"
                        >
                          💳 البيانات المالية
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(doc)}
                          className={`text-xs px-2.5 py-1 rounded font-bold transition-colors ${
                            doc.active
                              ? "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                              : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                          }`}
                          title={doc.active ? "إيقاف الطبيب مؤقتاً عن استلام قضايا جديدة" : "إعادة تنشيط الطبيب وإتاحته للفحص"}
                        >
                          {doc.active ? "⏸️ تجميد" : "▶️ تنشيط"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteDoctor(doc)}
                          className="text-xs px-2 py-1 rounded text-rose-700 hover:bg-rose-50 border border-rose-200 font-bold transition-colors"
                          title="حذف من السجل"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
