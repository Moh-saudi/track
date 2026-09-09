"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { UserCheck, Plus, CreditCard, Building, Building2, Stethoscope, AlertTriangle, CheckCircle2, Pause, Play, Trash2, X } from "lucide-react";
import { PageHeader, StatCard, Card, Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Badge } from "@/components/ui";

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

export default function SubcommitteeDoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      {/* ─── رأس الصفحة الموحد ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "اللجان الفرعية", href: "/dashboard/subcommittee" },
          { label: "سجل أطباء اللجنة" },
        ]}
        title="سجل الأطباء واستشاريي اللجنة والبيانات المالية"
        description="قيد الأطباء وبيانات صرف المستحقات المصرفية لتظهر فوراً للمسؤول المالي."
        actions={
          <Link
            href="/dashboard/subcommittee/doctors/new"
            className="h-10 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold font-heading shadow-xs inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة طبيب جديد</span>
          </Link>
        }
      />

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



      {/* نافذة منبثقة لتعديل أو تحديث البيانات المالية */}
      {editingFinanceDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold font-heading text-slate-900 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-teal-600" />
                  <span>تحديث البيانات المالية: {editingFinanceDoc.name}</span>
                </h3>
                <p className="text-xs text-slate-500 font-body">تحديث فيزا المرتبات أو الحساب البنكي للصرف المالي المباشر</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingFinanceDoc(null)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFinanceUpdate} className="space-y-4 font-body">
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
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>فيزا مرتبات</span>
                  </label>
                  <label className={`p-2 rounded-lg border flex items-center gap-2 cursor-pointer ${
                    editFinancialType === "BANK_ACCOUNT" ? "bg-teal-50 border-teal-400 text-teal-950 font-bold" : "border-slate-200"
                  }`}>
                    <input
                      type="radio"
                      name="editFinancialType"
                      checked={editFinancialType === "BANK_ACCOUNT"}
                      onChange={() => setEditFinancialType("BANK_ACCOUNT")}
                      className="text-teal-600"
                    />
                    <Building className="w-3.5 h-3.5" />
                    <span>حساب بنكي</span>
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
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>كارت بنكي خاص</span>
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
        <StatCard
          title="إجمالي الأطباء المقيدين"
          value={doctors.length}
          icon={<UserCheck className="w-5 h-5" />}
          color="teal"
        />
        <StatCard
          title="فيزا مرتبات حكومية"
          value={doctors.filter((d) => d.financialType === "PAYROLL_CARD").length}
          icon={<CreditCard className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="حسابات بنكية شخصية"
          value={doctors.filter((d) => d.financialType === "BANK_ACCOUNT").length}
          icon={<Building className="w-5 h-5" />}
          color="teal"
        />
        <StatCard
          title="أطباء متاحون للفحص"
          value={doctors.filter((d) => d.active).length}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
        />
      </div>

      {/* جدول أطباء واستشاريي اللجنة الفرعية */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold font-heading text-slate-800">قائمة الأطباء والاستشاريين والحسابات البنكية</h2>
            <p className="text-xs text-slate-500 mt-0.5 font-body">تُفحص جهة عمل الطبيب لمنع تعارض المصالح، وتُحال بياناته البنكية للشؤون المالية</p>
          </div>
          <span className="text-xs text-slate-500 font-body">{doctors.length} طبيب مقيد</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500 font-body">جارٍ تحميل سجل الأطباء...</div>
        ) : doctors.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-3 font-body">
            <p>لا يوجد أطباء مسجلون في حصر اللجنة الفرعية حتى الآن.</p>
            <Link
              href="/dashboard/subcommittee/doctors/new"
              className="inline-flex items-center gap-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold font-heading transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>قيد أول طبيب استشاري</span>
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>اسم الطبيب / اللقب</TableHead>
                <TableHead>التخصص الطبي</TableHead>
                <TableHead>جهة العمل / المستشفى</TableHead>
                <TableHead>البيانات المالية وصرف المستحقات</TableHead>
                <TableHead>الحالة في اللجنة</TableHead>
                <TableHead>الهاتف</TableHead>
                <TableHead className="text-center">الإجراءات والتحكم</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((doc) => (
                <TableRow key={doc.id} className={!doc.active ? "bg-slate-50/90 opacity-75" : undefined}>
                  <TableCell className="font-bold text-slate-900 whitespace-nowrap font-heading">
                    <span className="text-slate-500 text-xs ml-1 font-body">{doc.title || "د."}</span>
                    <span>{doc.name}</span>
                    {doc.nationalId && (
                      <span className="block text-[11px] text-slate-400 font-mono font-normal">
                        الرقم القومي: {doc.nationalId}
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    {doc.specialty ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 font-medium border border-teal-200 font-body">
                        <Stethoscope className="w-3 h-3 text-teal-600" />
                        <span>{doc.specialty.name}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs font-body">—</span>
                    )}
                  </TableCell>

                  <TableCell className="font-medium text-slate-800 text-xs font-body">
                    <div className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{doc.employer}</span>
                    </div>
                  </TableCell>

                  {/* البيانات المالية والمصرفية */}
                  <TableCell className="text-xs font-body">
                    {doc.financialType === "PAYROLL_CARD" && (doc.bankName || doc.cardNumber) ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-purple-900 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md text-[11px]">
                          <CreditCard className="w-3 h-3 text-purple-700" />
                          <span>فيزا مرتبات حكومية ({doc.bankName || "ميزة"})</span>
                        </span>
                        <span className="block text-xs font-mono text-purple-950 font-bold" dir="ltr">
                          {doc.cardNumber || "—"}
                        </span>
                      </div>
                    ) : doc.financialType === "BANK_ACCOUNT" && (doc.bankName || doc.accountNumber) ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-teal-900 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md text-[11px]">
                          <Building className="w-3 h-3 text-teal-700" />
                          <span>حساب بنكي شخصي ({doc.bankName})</span>
                        </span>
                        <span className="block text-xs font-mono text-teal-900 font-bold" dir="ltr">
                          {doc.accountNumber || "—"}
                        </span>
                      </div>
                    ) : doc.financialType === "BANK_CARD" && (doc.bankName || doc.cardNumber) ? (
                      <div className="space-y-0.5">
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[11px]">
                          <CreditCard className="w-3 h-3 text-emerald-700" />
                          <span>كارت بنكي خاص ({doc.bankName})</span>
                        </span>
                        <span className="block text-xs font-mono text-slate-700 font-bold" dir="ltr">
                          {doc.cardNumber || "—"}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        <span>بانتظار استيفاء البيانات</span>
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    {doc.active ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium font-body">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        <span>نشط ومتاح للفحص</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium font-body">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        <span>موقوف مؤقتاً</span>
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-xs text-slate-600 font-mono" dir="ltr">
                    {doc.phone || "—"}
                  </TableCell>

                  <TableCell className="text-center whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openFinanceModal(doc)}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 hover:bg-purple-100 border border-purple-200 font-semibold font-body transition-colors"
                        title="تعديل أو استكمال فيزا المرتبات / الحساب البنكي"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>البيانات المالية</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleToggleStatus(doc)}
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold font-body transition-colors ${
                          doc.active
                            ? "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                            : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
                        }`}
                        title={doc.active ? "إيقاف الطبيب مؤقتاً عن استلام قضايا جديدة" : "إعادة تنشيط الطبيب وإتاحته للفحص"}
                      >
                        {doc.active ? (
                          <>
                            <Pause className="w-3.5 h-3.5" />
                            <span>تجميد</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5" />
                            <span>تنشيط</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteDoctor(doc)}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
                        title="حذف من السجل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
