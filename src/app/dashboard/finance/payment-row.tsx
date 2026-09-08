"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/formatters";

const STATUS_OPTIONS = [
  { value: "NOT_PAID",         label: "لم يُسدَّد",    cls: "badge-not-paid" },
  { value: "UNDER_SETTLEMENT", label: "تحت التسوية",   cls: "badge-settlement" },
  { value: "PAID",             label: "مُسدَّد",        cls: "badge-paid" },
];

type PaymentProps = {
  id:       string;
  status:   string;
  entitled: boolean;
  amount:   number | null;
  notes:    string | null;
  case:     { caseNumber: string; reportYear: number | null };
  member:   { fullName: string } | null;
  doctor?:  {
    name: string;
    title: string | null;
    financialType: string | null;
    bankName: string | null;
    accountNumber: string | null;
    cardNumber: string | null;
  } | null;
};

export function PaymentRow({ payment }: { payment: PaymentProps }) {
  const router = useRouter();
  const [status, setStatus] = useState(payment.status);
  const [saving, setSaving]  = useState(false);

  async function updateStatus(newStatus: string) {
    setSaving(true);
    setStatus(newStatus);
    await fetch(`/api/payments/${payment.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setSaving(false);
    router.refresh();
  }

  const currentOption = STATUS_OPTIONS.find(o => o.value === status);

  return (
    <tr>
      {/* القضية */}
      <td className="font-mono text-xs font-medium text-gray-800">
        {payment.case.caseNumber}
        {payment.case.reportYear
          ? <span className="text-gray-400 mr-1">لسنة {payment.case.reportYear}</span>
          : ""
        }
      </td>

      {/* المستفيد */}
      <td className="text-xs text-gray-800">
        {payment.doctor ? (
          <div>
            <span className="font-bold text-slate-900 block">{payment.doctor.title || "د."} {payment.doctor.name}</span>
            {payment.doctor.financialType === "PAYROLL_CARD" && payment.doctor.cardNumber && (
              <span className="text-[10px] text-purple-900 font-mono block">
                💳 فيزا مرتبات ({payment.doctor.bankName || "ميزة"}): {payment.doctor.cardNumber}
              </span>
            )}
            {payment.doctor.financialType === "BANK_ACCOUNT" && payment.doctor.accountNumber && (
              <span className="text-[10px] text-emerald-800 font-mono block">
                🏦 {payment.doctor.bankName}: {payment.doctor.accountNumber}
              </span>
            )}
            {payment.doctor.financialType === "BANK_CARD" && payment.doctor.cardNumber && (
              <span className="text-[10px] text-blue-800 font-mono block">
                💳 كارت خاص ({payment.doctor.bankName}): {payment.doctor.cardNumber}
              </span>
            )}
          </div>
        ) : payment.member?.fullName ? (
          <span className="font-medium text-gray-700">{payment.member.fullName}</span>
        ) : (
          <span className="italic text-gray-400">—</span>
        )}
      </td>

      {/* يستحق؟ */}
      <td>
        {payment.entitled
          ? <span className="badge bg-emerald-100 text-emerald-700">✓ نعم</span>
          : <span className="badge bg-red-100 text-red-700">✗ لا</span>
        }
      </td>

      {/* المبلغ */}
      <td className="text-sm font-medium text-gray-800 font-mono">
        {payment.amount != null
          ? <span>{formatCurrency(payment.amount)}</span>
          : <span className="italic text-gray-400 font-sans">—</span>
        }
      </td>

      {/* حالة الصرف — حالة حالية */}
      <td>
        <span className={currentOption?.cls ?? "badge"}>
          {currentOption?.label ?? status}
        </span>
      </td>

      {/* تغيير الحالة */}
      <td>
        <div className="flex items-center gap-2">
          <select
            value={status}
            disabled={saving}
            onChange={e => updateStatus(e.target.value)}
            className="input py-1 px-2 text-xs w-36 disabled:opacity-60"
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {saving && <div className="loading-spinner w-4 h-4" />}
        </div>
      </td>
    </tr>
  );
}
