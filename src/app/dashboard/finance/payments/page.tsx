import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaymentsTableView } from "./payments-table-view";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency } from "@/lib/formatters";
import Link from "next/link";
import {
  Coins,
  Scale,
  Landmark,
  CheckCircle2,
  Clock,
  RefreshCw,
  CreditCard,
} from "lucide-react";

export const revalidate = 0;

export default async function FinancePaymentsPage() {
  const payments = await prisma.payment.findMany({
    include: {
      case: { select: { caseNumber: true, reportYear: true } },
      member: { select: { fullName: true } },
      doctor: {
        select: {
          name: true,
          title: true,
          financialType: true,
          bankName: true,
          accountNumber: true,
          cardNumber: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const notPaid = payments.filter((p) => p.status === "NOT_PAID");
  const settling = payments.filter((p) => p.status === "UNDER_SETTLEMENT");
  const paid = payments.filter((p) => p.status === "PAID");

  const totalPaidAmount = paid.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const totalSettlingAmount = settling.reduce((sum, p) => sum + (p.amount ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* ─── رأس الصفحة الموحد ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "المنظومة المالية", href: "/dashboard/finance" },
          { label: "صرف البدلات والمستحقات" },
        ]}
        title="سجلات صرف البدلات المقررة بالقضايا والتقارير الطبية"
        description="متابعة تسوية وصرف المبالغ المقررة بقرارات اعتماد اللجنة العليا للمسؤولية الطبية وتحديث حالات التحويل."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/finance"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs font-body"
            >
              <Coins className="w-3.5 h-3.5 text-teal-600" />
              <span>المؤشرات المالية</span>
            </Link>
            <Link
              href="/dashboard/finance/doctors"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-xs font-body"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>حسابات وبطاقات الأطباء</span>
            </Link>
          </div>
        }
      />

      {/* ─── بطاقات المؤشرات المالية للبدلات ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي قرارات الصرف"
          value={payments.length}
          icon={<Scale className="w-6 h-6" />}
          variant="sky"
        />
        <StatCard
          title="إجمالي المبالغ المصروفة"
          value={formatCurrency(totalPaidAmount)}
          icon={<CheckCircle2 className="w-6 h-6" />}
          variant="emerald"
        />
        <StatCard
          title="مبالغ قيد التسوية"
          value={formatCurrency(totalSettlingAmount)}
          icon={<RefreshCw className="w-6 h-6" />}
          variant={settling.length > 0 ? "amber" : "slate"}
        />
        <StatCard
          title="سجلات لم تُسدَّد بعد"
          value={notPaid.length}
          icon={<Clock className="w-6 h-6" />}
          variant={notPaid.length > 0 ? "rose" : "slate"}
        />
      </div>

      {/* ─── جدول الصرف التفاعلي ─── */}
      <PaymentsTableView payments={payments as any} />
    </div>
  );
}
