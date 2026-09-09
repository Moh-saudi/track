import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { UserWelcomeCard } from "@/components/ui/UserWelcomeCard";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { StatCard } from "@/components/ui/StatCard";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import {
  Building2,
  CreditCard,
  Users,
  Landmark,
  Clock,
  Coins,
  Scale,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  BarChart3,
  Stethoscope,
  ChevronLeft,
} from "lucide-react";

export const revalidate = 0;

export default async function FinanceDashboard() {
  const session = await getServerSession(authOptions);

  const [payments, doctors, subCommittees] = await Promise.all([
    prisma.payment.findMany({
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
    }),
    prisma.subCommitteeDoctor.findMany({
      include: {
        subCommittee: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.subCommittee.findMany({
      where: { active: true },
      select: { id: true, name: true, code: true },
      orderBy: { code: "asc" },
    }),
  ]);

  const notPaid = payments.filter((p) => p.status === "NOT_PAID");
  const settling = payments.filter((p) => p.status === "UNDER_SETTLEMENT");
  const paid = payments.filter((p) => p.status === "PAID");

  const totalPaidAmt = paid.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const totalSettlingAmt = settling.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const totalNotPaidAmt = notPaid.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const grandTotalAmt = totalPaidAmt + totalSettlingAmt + totalNotPaidAmt;

  const completedBankAccounts = doctors.filter(
    (d) =>
      (d.financialType === "BANK_ACCOUNT" && d.accountNumber) ||
      ((d.financialType === "BANK_CARD" || d.financialType === "PAYROLL_CARD") && d.cardNumber)
  ).length;

  const incompleteAccounts = doctors.length - completedBankAccounts;

  // إحصائيات اللجان الـ 16
  const committeeStats = subCommittees.map((sc) => {
    const scDoctors = doctors.filter((d) => d.subCommitteeId === sc.id);
    const readyDocs = scDoctors.filter(
      (d) =>
        (d.financialType === "BANK_ACCOUNT" && d.accountNumber) ||
        ((d.financialType === "BANK_CARD" || d.financialType === "PAYROLL_CARD") && d.cardNumber)
    ).length;

    return {
      id: sc.id,
      code: sc.code,
      name: sc.name,
      doctorCount: scDoctors.length,
      readyAccounts: readyDocs,
      completionRate: scDoctors.length > 0 ? Math.round((readyDocs / scDoctors.length) * 100) : 0,
    };
  });

  const recentPayments = payments.slice(0, 6);

  return (
    <div className="space-y-5">
      {/* ─── كارت الحساب الصغير الهادئ ─── */}
      <UserWelcomeCard user={session?.user} />

      {/* ─── شريط التبويب الأنيق والهادئ ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/dashboard/finance"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs sm:text-sm font-semibold bg-teal-600 text-white shadow-xs font-heading"
          >
            <Coins className="w-4 h-4" />
            <span>لوحة قيادة ومؤشرات المالية</span>
          </Link>

          <Link
            href="/dashboard/finance/payments"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs sm:text-sm font-semibold bg-white text-slate-600 hover:text-slate-900 border border-slate-200 transition-all font-heading"
          >
            <Scale className="w-4 h-4" />
            <span>صرف البدلات والمستحقات</span>
            {payments.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-mono font-bold border border-slate-200">
                {payments.length}
              </span>
            )}
          </Link>

          <Link
            href="/dashboard/finance/doctors"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-xs sm:text-sm font-semibold bg-white text-slate-600 hover:text-slate-900 border border-slate-200 transition-all font-heading"
          >
            <CreditCard className="w-4 h-4" />
            <span>الحسابات المصرفية للأطباء</span>
          </Link>
        </div>
      </div>

      {/* ─── رأس الصفحة الموحد ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "المنظومة المالية" },
        ]}
        title="المنظومة المالية والمؤشرات التنفيذية للبدلات ومستحقات الأطباء"
        description="لوحة قيادة رقابية متكاملة لمتابعة الأرصدة المصروفة، والتدفقات المالية للجان، والجاهزية المصرفية لأطباء اللجان الفرعية."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/finance/payments"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors shadow-xs font-body"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>صرف البدلات والمستحقات</span>
            </Link>
            <Link
              href="/dashboard/finance/doctors"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs font-body"
            >
              <CreditCard className="w-3.5 h-3.5 text-teal-600" />
              <span>الحسابات المصرفية للأطباء</span>
            </Link>
          </div>
        }
      />

      {/* ─── بطاقات المؤشرات المالية التنفيذية ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="إجمالي البدلات المصروفة"
          value={formatCurrency(totalPaidAmt)}
          icon={<Coins className="w-6 h-6" />}
          variant="teal"
        />
        <StatCard
          title="مبالغ قيد التسوية والتحويل"
          value={formatCurrency(totalSettlingAmt)}
          icon={<Clock className="w-6 h-6" />}
          variant={settling.length > 0 ? "amber" : "slate"}
        />
        <StatCard
          title="حسابات بنكية وبطاقات جاهزة"
          value={`${completedBankAccounts} / ${doctors.length}`}
          icon={<Landmark className="w-6 h-6" />}
          variant="emerald"
        />
        <StatCard
          title="أطباء واستشاريي اللجان (16 لجنة)"
          value={doctors.length}
          icon={<Users className="w-6 h-6" />}
          variant="sky"
        />
      </div>

      {/* ─── بطاقات الوصول السريع للأقسام المنفصلة ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* بطاقة صرف البدلات */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-teal-500/50 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                {payments.length} سجل بدلات
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-slate-900">
                صرف البدلات ومستحقات القضايا
              </h3>
              <p className="text-xs text-slate-500 font-body mt-1 leading-relaxed">
                شاشة مخصصة لإدارة تسوية وصرف البدلات المقررة بقرارات اعتماد اللجنة العليا، مع فلترة حسب حالة الصرف وتحديث مباشر للحالات.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono pt-2 border-t border-slate-100">
              <span className="text-emerald-700">
                مُسدَّد: <strong>{paid.length}</strong>
              </span>
              <span className="text-amber-700">
                تحت التسوية: <strong>{settling.length}</strong>
              </span>
              <span className="text-rose-700">
                لم يُسدَّد: <strong>{notPaid.length}</strong>
              </span>
            </div>
          </div>

          <div className="pt-4 mt-2">
            <Link
              href="/dashboard/finance/payments"
              className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold font-body transition-colors shadow-xs"
            >
              <span>فتح جدول صرف البدلات</span>
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* بطاقة حسابات الأطباء */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-emerald-500/50 transition-all flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
                <CreditCard className="w-5 h-5" />
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                {completedBankAccounts} حساباً جاهزاً
              </span>
            </div>
            <div>
              <h3 className="text-base font-bold font-heading text-slate-900">
                سجل الحسابات المصرفية وبطاقات الدفع للأطباء
              </h3>
              <p className="text-xs text-slate-500 font-body mt-1 leading-relaxed">
                شاشة متخصصة لاستعراض بيانات الحسابات البنكية وبطاقات ميزة/المرتبات لأطباء واستشاريي الـ 16 لجنة فرعية مع إمكانية النسخ والتصفية باللجنة.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono pt-2 border-t border-slate-100">
              <span className="text-slate-700">
                إجمالي الأطباء: <strong>{doctors.length}</strong>
              </span>
              <span className="text-emerald-700">
                حسابات مكتملة: <strong>{completedBankAccounts}</strong>
              </span>
              {incompleteAccounts > 0 && (
                <span className="text-amber-700">
                  قيد الاستيفاء: <strong>{incompleteAccounts}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="pt-4 mt-2">
            <Link
              href="/dashboard/finance/doctors"
              className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold font-body transition-colors shadow-xs"
            >
              <span>فتح سجل حسابات الأطباء (16 لجنة)</span>
              <ChevronLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── تحليلات التدفقات المالية وتوزيع الحالات ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* عمود 1: مؤشر توزيع حالات الصرف */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5 font-body">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-teal-600" />
              <span>مؤشر نسب ومبالغ الصرف</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              متابعة التدفق المالي بحسب حالات السداد المقيدة
            </p>
          </div>

          <div className="space-y-4">
            {/* مُسدَّد */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span>مُسدَّد بالكامل</span>
                </span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatCurrency(totalPaidAmt)}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${grandTotalAmt > 0 ? (totalPaidAmt / grandTotalAmt) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{paid.length} قرار صرف</span>
                <span>{grandTotalAmt > 0 ? Math.round((totalPaidAmt / grandTotalAmt) * 100) : 0}%</span>
              </div>
            </div>

            {/* تحت التسوية */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span>تحت التسوية والتحويل</span>
                </span>
                <span className="font-mono font-bold text-amber-700">
                  {formatCurrency(totalSettlingAmt)}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${grandTotalAmt > 0 ? (totalSettlingAmt / grandTotalAmt) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{settling.length} قرار صرف</span>
                <span>{grandTotalAmt > 0 ? Math.round((totalSettlingAmt / grandTotalAmt) * 100) : 0}%</span>
              </div>
            </div>

            {/* لم يُسدَّد */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span>لم يُسدَّد بعد</span>
                </span>
                <span className="font-mono font-bold text-rose-700">
                  {formatCurrency(totalNotPaidAmt)}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${grandTotalAmt > 0 ? (totalNotPaidAmt / grandTotalAmt) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>{notPaid.length} قرار صرف</span>
                <span>{grandTotalAmt > 0 ? Math.round((totalNotPaidAmt / grandTotalAmt) * 100) : 0}%</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs text-slate-600 space-y-1">
            <div className="flex justify-between font-bold text-slate-800">
              <span>إجمالي المخصصات المالية:</span>
              <span className="font-mono text-teal-800">{formatCurrency(grandTotalAmt)}</span>
            </div>
            <p className="text-[11px] text-slate-500">
              تتولى الإدارة المالية المراجعة والتسوية مع قطاع الشؤون المالية بالوزارة.
            </p>
          </div>
        </div>

        {/* عمود 2 + 3: مصفوفة الجاهزية البنكية للجان الـ 16 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4 font-body">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" />
                <span>مصفوفة جاهزية الحسابات البنكية باللجان الفرعية (16 لجنة)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                معدل استيفاء بيانات الحسابات والفيزا لكل لجنة لتسهيل سرعة الصرف
              </p>
            </div>
            <Link
              href="/dashboard/finance/doctors"
              className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline self-start sm:self-auto"
            >
              عرض كافة الأطباء ←
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 font-heading">
                  <th className="pb-2.5 pr-2">الكود</th>
                  <th className="pb-2.5">اللجنة الفرعية</th>
                  <th className="pb-2.5 text-center">عدد الأطباء</th>
                  <th className="pb-2.5 text-center">حسابات جاهزة</th>
                  <th className="pb-2.5 text-center">نسبة الاكتمال</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {committeeStats.map((sc) => (
                  <tr key={sc.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 pr-2 font-mono font-bold text-slate-700">
                      {sc.code}
                    </td>
                    <td className="py-2.5 font-medium text-slate-900 font-heading">
                      {sc.name}
                    </td>
                    <td className="py-2.5 text-center font-mono font-semibold text-slate-700">
                      {sc.doctorCount}
                    </td>
                    <td className="py-2.5 text-center font-mono font-semibold text-emerald-700">
                      {sc.readyAccounts}
                    </td>
                    <td className="py-2.5 text-center">
                      <div className="inline-flex items-center gap-1.5 font-mono">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                            sc.completionRate === 100
                              ? "bg-emerald-100 text-emerald-800"
                              : sc.completionRate >= 50
                              ? "bg-teal-50 text-teal-800"
                              : sc.completionRate > 0
                              ? "bg-amber-50 text-amber-800"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          %{sc.completionRate}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── آخر سجلات البدلات المقيدة ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-600" />
              <span>آخر قرارات وسجلات البدلات المقيدة</span>
            </h3>
            <p className="text-xs text-slate-500 font-body mt-0.5">
              أحدث سجلات الصرف المنشأة تلقائياً بقرارات اعتماد اللجنة العليا
            </p>
          </div>
          <Link
            href="/dashboard/finance/payments"
            className="text-xs font-semibold text-teal-700 hover:text-teal-800 hover:underline font-body"
          >
            الانتقال لجدول الصرف الكامل ({payments.length}) ←
          </Link>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>رقم السجل / القضية</TableHead>
                <TableHead>المستفيد / العضو</TableHead>
                <TableHead>الصفة</TableHead>
                <TableHead>بدل الجلسة</TableHead>
                <TableHead>حالة الصرف</TableHead>
                <TableHead>تاريخ السداد</TableHead>
                <TableHead>الإجراء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="p-8 text-center text-xs text-slate-500">
                    لا توجد سجلات بدلات مالية مقيدة حالياً.
                  </TableCell>
                </TableRow>
              ) : (
                recentPayments.map((p) => {
                  const statusMap: Record<string, { label: string; variant: "slate" | "amber" | "emerald" }> = {
                    NOT_PAID: { label: "لم يُسدَّد", variant: "slate" },
                    UNDER_SETTLEMENT: { label: "تحت التسوية", variant: "amber" },
                    PAID: { label: "مُسدَّد", variant: "emerald" },
                  };
                  const currStatus = statusMap[p.status] || { label: p.status, variant: "slate" };
                  const isSupreme = p.recipientRole?.includes("عليا") || p.amount === 8000;

                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs font-semibold text-slate-800">
                        {p.case.caseNumber}
                        {p.case.reportYear ? (
                          <span className="text-slate-400 mr-1">لسنة {p.case.reportYear}</span>
                        ) : (
                          ""
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-800 font-body">
                        {p.doctor ? (
                          <span className="font-semibold text-slate-900 font-heading">
                            {p.doctor.title || "د."} {p.doctor.name}
                          </span>
                        ) : p.member ? (
                          <span className="font-semibold text-slate-900 font-heading">
                            {p.member.fullName}
                          </span>
                        ) : (
                          "غير محدد"
                        )}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold font-body ${
                            isSupreme
                              ? "bg-teal-50 text-teal-800 border border-teal-200"
                              : "bg-sky-50 text-sky-800 border border-sky-200"
                          }`}
                        >
                          {isSupreme ? "عضو اللجنة العليا" : (p.recipientRole || "عضو لجنة فرعية")}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold text-slate-900">
                        {p.amount ? formatCurrency(p.amount) : formatCurrency(isSupreme ? 8000 : 5000)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={currStatus.variant}>{currStatus.label}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {p.status === "PAID" && p.paidAt ? (
                          <span className="text-emerald-700 font-semibold">{new Date(p.paidAt).toLocaleDateString("ar-EG")}</span>
                        ) : (
                          <span className="text-slate-400 italic font-body">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link
                          href="/dashboard/finance/payments"
                          className="text-xs text-teal-700 hover:text-teal-900 font-semibold font-body"
                        >
                          تسديد / تفاصيل ←
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
