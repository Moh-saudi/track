"use client";

import { useState, useMemo } from "react";
import { PaymentRow } from "../payment-row";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Coins,
  Scale,
  RefreshCw,
} from "lucide-react";

interface PaymentItem {
  id: string;
  status: string;
  entitled: boolean;
  amount: number | null;
  recipientRole?: string | null;
  paidAt?: string | Date | null;
  notes: string | null;
  createdAt: string | Date;
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
}

export function PaymentsTableView({ payments }: { payments: PaymentItem[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [entitledFilter, setEntitledFilter] = useState<string>("ALL");

  const counts = useMemo(() => {
    return {
      all: payments.length,
      notPaid: payments.filter((p) => p.status === "NOT_PAID").length,
      settling: payments.filter((p) => p.status === "UNDER_SETTLEMENT").length,
      paid: payments.filter((p) => p.status === "PAID").length,
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      // Status filter
      if (statusFilter !== "ALL" && p.status !== statusFilter) {
        return false;
      }

      // Entitlement filter
      if (entitledFilter === "ENTITLED" && !p.entitled) return false;
      if (entitledFilter === "NOT_ENTITLED" && p.entitled) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const caseNum = p.case?.caseNumber?.toLowerCase() || "";
        const docName = p.doctor?.name?.toLowerCase() || "";
        const memberName = p.member?.fullName?.toLowerCase() || "";
        const role = p.recipientRole?.toLowerCase() || "";
        const notes = p.notes?.toLowerCase() || "";

        return (
          caseNum.includes(query) ||
          docName.includes(query) ||
          memberName.includes(query) ||
          role.includes(query) ||
          notes.includes(query)
        );
      }

      return true;
    });
  }, [payments, statusFilter, entitledFilter, searchTerm]);

  const totalFilteredAmount = useMemo(() => {
    return filteredPayments
      .filter((p) => p.amount)
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  }, [filteredPayments]);

  const paidFilteredAmount = useMemo(() => {
    return filteredPayments
      .filter((p) => p.status === "PAID" && p.amount)
      .reduce((sum, p) => sum + (p.amount ?? 0), 0);
  }, [filteredPayments]);

  return (
    <div className="space-y-4">
      {/* ─── شريط التبويبات والفلترة ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        {/* التبويبات */}
        <div className="flex flex-wrap items-center gap-1.5 font-body">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              statusFilter === "ALL"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            الكل ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("NOT_PAID")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === "NOT_PAID"
                ? "bg-slate-800 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>لم يُسدَّد ({counts.notPaid})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("UNDER_SETTLEMENT")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === "UNDER_SETTLEMENT"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60"
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>تحت التسوية ({counts.settling})</span>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PAID")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              statusFilter === "PAID"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>مُسدَّد ({counts.paid})</span>
          </button>
        </div>

        {/* حقول البحث والفلترة */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="بحث برقم السجل أو اسم الطبيب..."
              className="h-10 pr-9 pl-4 text-xs rounded-lg border border-slate-300 bg-white placeholder:text-slate-400 focus:outline-hidden focus:border-teal-600 w-full sm:w-64 font-body"
            />
          </div>

          <select
            value={entitledFilter}
            onChange={(e) => setEntitledFilter(e.target.value)}
            className="h-10 px-3 text-xs rounded-lg border border-slate-300 bg-white text-slate-700 focus:outline-hidden focus:border-teal-600 font-body"
          >
            <option value="ALL">جميع الاستحقاقات</option>
            <option value="ENTITLED">مستحق فقط</option>
            <option value="NOT_ENTITLED">غير مستحق</option>
          </select>
        </div>
      </div>

      {/* ─── شريط الملخص المالي للنتائج المعروضة ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-100/80 rounded-xl border border-slate-200 text-xs text-slate-700 font-body">
        <div className="flex items-center gap-4">
          <span>
            السجلات المعروضة: <strong>{filteredPayments.length}</strong> من إجمالي <strong>{payments.length}</strong>
          </span>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-teal-700 hover:underline text-[11px]"
            >
              إلغاء البحث
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 font-mono">
          <span>
            إجمالي المبالغ بالنتائج: <strong className="text-slate-900">{formatCurrency(totalFilteredAmount)}</strong>
          </span>
          <span className="text-slate-300">|</span>
          <span>
            المصروف منها: <strong className="text-emerald-700">{formatCurrency(paidFilteredAmount)}</strong>
          </span>
        </div>
      </div>

      {/* ─── جدول الصرف والبيانات ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>رقم السجل / القضية</TableHead>
              <TableHead>المستفيد / العضو</TableHead>
              <TableHead>الصفة</TableHead>
              <TableHead>بدل الجلسة المقرر</TableHead>
              <TableHead>حالة الصرف</TableHead>
              <TableHead>تاريخ السداد</TableHead>
              <TableHead className="text-center">إجراء التسديد</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="p-12 text-center text-xs text-slate-500 font-body">
                  <div className="max-w-xs mx-auto space-y-2">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-semibold text-slate-700">لا توجد سجلات مطابقة لمعايير البحث الحالية</p>
                    <p className="text-[11px] text-slate-400">
                      تأكد من شروط التصفية أو قم بتسجيل قرارات اعتماد جديدة باللجنة العليا.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredPayments.map((p) => <PaymentRow key={p.id} payment={p as any} />)
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
