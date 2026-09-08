"use client";

import { useState } from "react";

interface DoctorFinanceItem {
  id: string;
  name: string;
  title: string | null;
  employer: string;
  phone: string | null;
  nationalId: string | null;
  financialType: string | null;
  bankName: string | null;
  accountNumber: string | null;
  iban: string | null;
  cardNumber: string | null;
  active: boolean;
  subCommittee: {
    id: string;
    name: string;
    code: string;
  };
  specialty?: {
    name: string;
  } | null;
}

export function DoctorsFinanceTable({
  doctors,
  subCommittees,
}: {
  doctors: DoctorFinanceItem[];
  subCommittees: { id: string; name: string; code: string }[];
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSubCommittee, setSelectedSubCommittee] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  }

  const filteredDoctors = doctors.filter((doc) => {
    const matchSearch =
      !searchTerm ||
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.nationalId && doc.nationalId.includes(searchTerm)) ||
      (doc.bankName && doc.bankName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (doc.accountNumber && doc.accountNumber.includes(searchTerm)) ||
      (doc.cardNumber && doc.cardNumber.includes(searchTerm)) ||
      (doc.phone && doc.phone.includes(searchTerm));

    const matchCommittee = !selectedSubCommittee || doc.subCommittee.id === selectedSubCommittee;

    const matchType =
      filterType === "ALL" ||
      (filterType === "PAYROLL_CARD" && doc.financialType === "PAYROLL_CARD") ||
      (filterType === "BANK_ACCOUNT" && doc.financialType === "BANK_ACCOUNT") ||
      (filterType === "BANK_CARD" && doc.financialType === "BANK_CARD") ||
      (filterType === "MISSING" && !doc.accountNumber && !doc.cardNumber);

    return matchSearch && matchCommittee && matchType;
  });

  return (
    <div className="space-y-4">
      {/* أدوات البحث والفلترة المتقدمة للشؤون المالية */}
      <div className="card p-4 border-slate-200 bg-white space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
            <span>🔍</span>
            <span>بحث وتصفية حسابات الأطباء المصرفية</span>
          </h3>
          <span className="text-xs font-bold text-slate-500">
            تم العثور على {filteredDoctors.length} من إجمالي {doctors.length} طبيب
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              البحث بالاسم / الرقم القومي / رقم الحساب / البنك
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="اكتب للبحث الفوري..."
              className="form-input text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              اللجنة الفرعية التابع لها الطبيب
            </label>
            <select
              value={selectedSubCommittee}
              onChange={(e) => setSelectedSubCommittee(e.target.value)}
              className="form-select text-xs"
            >
              <option value="">— جميع اللجان الـ 16 —</option>
              {subCommittees.map((sc) => (
                <option key={sc.id} value={sc.id}>
                  {sc.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">
              نوع وسيلة الصرف
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="form-select text-xs"
            >
              <option value="ALL">الكل (جميع الوسائل)</option>
              <option value="PAYROLL_CARD">💳 فيزا مرتبات حكومية (ميزة)</option>
              <option value="BANK_ACCOUNT">🏦 حسابات بنكية شخصية</option>
              <option value="BANK_CARD">💳 كروت بنكية خاصة</option>
              <option value="MISSING">⚠️ بانتظار استيفاء البيانات</option>
            </select>
          </div>
        </div>
      </div>

      {/* جدول الحسابات البنكية للمسؤول المالي */}
      <div className="card p-0 overflow-hidden border-slate-200 bg-white">
        <div className="table-wrapper border-0 rounded-none">
          <table className="table-custom">
            <thead>
              <tr>
                <th>اسم الطبيب / اللقب</th>
                <th>اللجنة الفرعية</th>
                <th>التخصص وجهة العمل</th>
                <th>الرقم القومي</th>
                <th>طريقة الصرف</th>
                <th>البنك وحساب التحويل</th>
                <th>هاتف التواصل</th>
                <th className="text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-slate-500">
                    لا توجد بيانات أطباء مطابقة لمعايير البحث المحددة.
                  </td>
                </tr>
              ) : (
                filteredDoctors.map((doc) => {
                  const targetNumber = doc.financialType === "BANK_CARD" ? doc.cardNumber : doc.accountNumber;
                  const isCopied = copiedId === doc.id;

                  return (
                    <tr key={doc.id} className={!doc.active ? "bg-slate-50/70" : undefined}>
                      {/* الاسم */}
                      <td className="font-bold text-slate-900 whitespace-nowrap">
                        <span className="text-slate-500 text-xs ml-1">{doc.title || "د."}</span>
                        <span>{doc.name}</span>
                        {!doc.active && (
                          <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded font-bold mr-1.5">
                            موقوف مؤقتاً
                          </span>
                        )}
                      </td>

                      {/* اللجنة الفرعية */}
                      <td className="text-xs font-bold text-[#1F4E79] whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-blue-50 border border-blue-200">
                          {doc.subCommittee.name}
                        </span>
                      </td>

                      {/* التخصص والجهة */}
                      <td className="text-xs">
                        <div className="font-bold text-slate-800">
                          {doc.specialty?.name ? `🩺 ${doc.specialty.name}` : "—"}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[160px]" title={doc.employer}>
                          🏥 {doc.employer}
                        </div>
                      </td>

                      {/* الرقم القومي */}
                      <td className="text-xs font-mono font-bold text-slate-800" dir="ltr">
                        {doc.nationalId ? (
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {doc.nationalId}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-sans italic">—</span>
                        )}
                      </td>

                      {/* طريقة الصرف */}
                      <td>
                        {doc.financialType === "PAYROLL_CARD" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-purple-950 bg-purple-100 border border-purple-300 px-2 py-0.5 rounded-lg shadow-sm">
                            <span>💳</span>
                            <span>فيزا مرتبات حكومية</span>
                          </span>
                        ) : doc.financialType === "BANK_ACCOUNT" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg">
                            <span>🏦</span>
                            <span>حساب بنكي شخصي</span>
                          </span>
                        ) : doc.financialType === "BANK_CARD" ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">
                            <span>💳</span>
                            <span>كارت بنكي خاص</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                            غير محدد
                          </span>
                        )}
                      </td>

                      {/* البنك وحساب التحويل */}
                      <td className="text-xs">
                        {doc.bankName || targetNumber ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900">{doc.bankName || "بنك غير محدد"}</div>
                            {targetNumber ? (
                              <div className="font-mono font-bold text-emerald-700 text-[11px]" dir="ltr">
                                {targetNumber}
                              </div>
                            ) : (
                              <span className="text-[10px] text-amber-600">رقم الحساب غير مدخل</span>
                            )}
                            {doc.iban && (
                              <div className="text-[10px] font-mono text-slate-500 truncate max-w-[160px]" dir="ltr" title={doc.iban}>
                                IBAN: {doc.iban}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            ⚠️ بانتظار استيفاء البيانات
                          </span>
                        )}
                      </td>

                      {/* الهاتف */}
                      <td className="text-xs font-mono text-slate-600" dir="ltr">
                        {doc.phone || "—"}
                      </td>

                      {/* الإجراءات: نسخ رقم الحساب */}
                      <td className="text-center whitespace-nowrap">
                        {targetNumber ? (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(targetNumber, doc.id)}
                            className={`text-xs px-2.5 py-1 rounded font-bold transition-all ${
                              isCopied
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300"
                            }`}
                            title="نسخ رقم الحساب أو الكارت للحافظة المصرفية"
                          >
                            {isCopied ? "✓ تم النسخ" : "📋 نسخ الحساب"}
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
