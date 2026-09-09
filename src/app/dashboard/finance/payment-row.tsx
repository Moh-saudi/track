"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { TableRow, TableCell } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { CreditCard, Building, Calendar, CheckCircle2 } from "lucide-react";

const STATUS_OPTIONS: { value: string; label: string; variant: "slate" | "amber" | "emerald" }[] = [
  { value: "NOT_PAID", label: "لم يُسدَّد", variant: "slate" },
  { value: "UNDER_SETTLEMENT", label: "تحت التسوية", variant: "amber" },
  { value: "PAID", label: "مُسدَّد", variant: "emerald" },
];

export type PaymentProps = {
  id: string;
  status: string;
  entitled: boolean;
  amount: number | null;
  recipientRole?: string | null;
  paidAt?: string | Date | null;
  notes: string | null;
  case: { caseNumber: string; reportYear: number | null };
  member: { fullName: string; role?: string } | null;
  doctor?: {
    name: string;
    title: string | null;
    employer?: string | null;
    financialType: string | null;
    bankName: string | null;
    accountNumber: string | null;
    cardNumber: string | null;
  } | null;
};

export function PaymentRow({ payment }: { payment: PaymentProps }) {
  const router = useRouter();
  const [status, setStatus] = useState(payment.status);
  const [paidAt, setPaidAt] = useState<string>(() => {
    if (payment.paidAt) {
      try {
        return new Date(payment.paidAt).toISOString().split("T")[0];
      } catch {
        return "";
      }
    }
    return "";
  });
  const [saving, setSaving] = useState(false);

  async function updatePayment(newStatus: string, newPaidAt?: string) {
    setSaving(true);
    setStatus(newStatus);
    const dateToSave =
      newStatus === "PAID"
        ? newPaidAt || paidAt || new Date().toISOString().split("T")[0]
        : null;

    if (newStatus === "PAID" && !paidAt) {
      setPaidAt(dateToSave || "");
    } else if (newStatus !== "PAID") {
      setPaidAt("");
    }

    try {
      await fetch(`/api/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          paidAt: dateToSave,
        }),
      });
      router.refresh();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setPaidAt(val);
    if (status === "PAID") {
      setSaving(true);
      await fetch(`/api/payments/${payment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "PAID",
          paidAt: val || null,
        }),
      });
      setSaving(false);
      router.refresh();
    }
  }

  const currentOption = STATUS_OPTIONS.find((o) => o.value === status);
  const isSupreme =
    payment.recipientRole?.includes("عليا") ||
    payment.member?.role === "SUPREME_COMMITTEE" ||
    payment.amount === 8000;

  return (
    <TableRow className="hover:bg-slate-50/80 transition-colors">
      {/* القضية */}
      <TableCell className="font-mono text-xs font-bold text-slate-900">
        <span>{payment.case.caseNumber}</span>
        {payment.case.reportYear ? (
          <span className="text-slate-500 font-normal mr-1">
            لسنة {payment.case.reportYear}
          </span>
        ) : null}
      </TableCell>

      {/* المستفيد */}
      <TableCell className="text-xs text-slate-800">
        {payment.doctor ? (
          <div className="space-y-1">
            <span className="font-bold text-slate-900 block font-heading">
              {payment.doctor.title || "د."} {payment.doctor.name}
            </span>
            {payment.doctor.financialType === "PAYROLL_CARD" &&
              payment.doctor.cardNumber && (
                <span className="text-[11px] text-purple-900 font-mono flex items-center gap-1 bg-purple-50 px-2 py-0.5 rounded w-fit">
                  <CreditCard className="w-3 h-3 text-purple-600" />
                  <span>
                    فيزا مرتبات ({payment.doctor.bankName || "ميزة"}):{" "}
                    {payment.doctor.cardNumber}
                  </span>
                </span>
              )}
            {payment.doctor.financialType === "BANK_ACCOUNT" &&
              payment.doctor.accountNumber && (
                <span className="text-[11px] text-emerald-800 font-mono flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded w-fit">
                  <Building className="w-3 h-3 text-emerald-600" />
                  <span>
                    {payment.doctor.bankName}: {payment.doctor.accountNumber}
                  </span>
                </span>
              )}
            {payment.doctor.financialType === "BANK_CARD" &&
              payment.doctor.cardNumber && (
                <span className="text-[11px] text-sky-800 font-mono flex items-center gap-1 bg-sky-50 px-2 py-0.5 rounded w-fit">
                  <CreditCard className="w-3 h-3 text-sky-600" />
                  <span>
                    كارت خاص ({payment.doctor.bankName}):{" "}
                    {payment.doctor.cardNumber}
                  </span>
                </span>
              )}
            {!payment.doctor.financialType && (
              <span className="text-[11px] text-slate-400 font-body">
                لم يُسجل حساب بنكي بعد
              </span>
            )}
          </div>
        ) : payment.member?.fullName ? (
          <div className="space-y-0.5">
            <span className="font-bold text-slate-900 block font-heading">
              {payment.member.fullName}
            </span>
            <span className="text-[11px] text-teal-700 font-body">
              عضو اللجنة العليا للمسؤولية الطبية
            </span>
          </div>
        ) : (
          <span className="italic text-slate-400">—</span>
        )}
      </TableCell>

      {/* الصفة / نوع البدل */}
      <TableCell>
        <span
          className={`inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold font-body ${
            isSupreme
              ? "bg-teal-50 text-teal-800 border border-teal-200"
              : "bg-sky-50 text-sky-800 border border-sky-200"
          }`}
        >
          {isSupreme
            ? "عضو اللجنة العليا"
            : payment.recipientRole || "عضو لجنة فرعية"}
        </span>
      </TableCell>

      {/* المبلغ المقرر */}
      <TableCell className="text-xs font-bold font-mono">
        <span className={isSupreme ? "text-teal-700 font-bold" : "text-slate-800 font-bold"}>
          {formatCurrency(payment.amount ?? (isSupreme ? 8000 : 5000))}
        </span>
      </TableCell>

      {/* حالة الصرف */}
      <TableCell>
        <Badge variant={currentOption?.variant ?? "slate"} size="sm">
          {currentOption?.label ?? status}
        </Badge>
      </TableCell>

      {/* تاريخ السداد */}
      <TableCell className="text-xs font-mono">
        {status === "PAID" ? (
          <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 w-fit">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold">
              {paidAt || formatDate(payment.paidAt || new Date())}
            </span>
          </div>
        ) : (
          <span className="text-slate-400 italic font-body text-xs">
            — لم يُسدَّد —
          </span>
        )}
      </TableCell>

      {/* إجراء التسديد وتحديد التاريخ */}
      <TableCell>
        <div className="flex flex-col sm:flex-row items-center gap-1.5 justify-end">
          {status !== "PAID" && (
            <button
              type="button"
              disabled={saving}
              onClick={() => updatePayment("PAID")}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs font-body disabled:opacity-50"
              title="تسديد البدل الآن بتاريخ اليوم"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>تسديد</span>
            </button>
          )}

          <div className="flex items-center gap-1">
            <select
              value={status}
              disabled={saving}
              onChange={(e) => updatePayment(e.target.value)}
              className="form-select h-8 py-1 px-2 text-xs w-28 disabled:opacity-60 font-body rounded-lg border border-slate-300 bg-white"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {status === "PAID" && (
              <input
                type="date"
                value={paidAt}
                disabled={saving}
                onChange={handleDateChange}
                className="h-8 px-2 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 font-mono disabled:opacity-50 focus:outline-hidden focus:border-teal-600"
                title="تعديل تاريخ السداد"
              />
            )}
          </div>

          {saving && (
            <span className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
