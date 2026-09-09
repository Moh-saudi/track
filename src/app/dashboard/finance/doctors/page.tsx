import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { DoctorsFinanceTable } from "../doctors-finance-table";
import { StatCard } from "@/components/ui/StatCard";
import Link from "next/link";
import {
  CreditCard,
  Landmark,
  Users,
  AlertCircle,
  Coins,
  Scale,
  ArrowRight,
} from "lucide-react";

export const revalidate = 0;

export default async function DoctorsFinancePage() {
  const [doctors, subCommittees] = await Promise.all([
    prisma.subCommitteeDoctor.findMany({
      include: {
        subCommittee: { select: { id: true, name: true, code: true } },
        specialty: { select: { name: true } },
      },
      orderBy: [
        { subCommittee: { name: "asc" } },
        { name: "asc" },
      ],
    }),
    prisma.subCommittee.findMany({
      where: { active: true },
      select: { id: true, name: true, code: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const bankAccountCount = doctors.filter(
    (d) => d.financialType === "BANK_ACCOUNT" && d.accountNumber
  ).length;

  const cardCount = doctors.filter(
    (d) => (d.financialType === "BANK_CARD" || d.financialType === "PAYROLL_CARD") && d.cardNumber
  ).length;

  const completeCount = bankAccountCount + cardCount;
  const pendingCount = doctors.length - completeCount;

  return (
    <div className="space-y-6">
      {/* ─── رأس الصفحة الموحد ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "المنظومة المالية", href: "/dashboard/finance" },
          { label: "الحسابات المصرفية للأطباء" },
        ]}
        title="الحسابات المصرفية وبطاقات الدفع لأطباء اللجان (16 لجنة)"
        description="استعراض ومراجعة بيانات التحويل البنكي وبطاقات الدفع الإلكتروني المسجلة للأطباء والاستشاريين لتسهيل تحويل المستحقات."
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
              href="/dashboard/finance/payments"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-xs font-body"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>جدول صرف البدلات</span>
            </Link>
          </div>
        }
      />

      {/* ─── مؤشرات الحسابات المصرفية ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي الأطباء المقيدين"
          value={doctors.length}
          icon={<Users className="w-6 h-6" />}
          variant="sky"
        />
        <StatCard
          title="حسابات بنكية جارية"
          value={bankAccountCount}
          icon={<Landmark className="w-6 h-6" />}
          variant="emerald"
        />
        <StatCard
          title="بطاقات دفع إلكتروني / ميزة"
          value={cardCount}
          icon={<CreditCard className="w-6 h-6" />}
          variant="teal"
        />
        <StatCard
          title="بيانات قيد الاستيفاء"
          value={pendingCount}
          icon={<AlertCircle className="w-6 h-6" />}
          variant={pendingCount > 0 ? "amber" : "slate"}
        />
      </div>

      {/* ─── جدول الحسابات التفاعلي ─── */}
      <div className="space-y-3">
        <DoctorsFinanceTable doctors={doctors as any} subCommittees={subCommittees} />
      </div>
    </div>
  );
}
