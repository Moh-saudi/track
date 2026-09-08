import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PaymentRow } from "./payment-row";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { DoctorsFinanceTable } from "./doctors-finance-table";

export const revalidate = 0;

export default async function FinanceDashboard() {
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

  const notPaid = payments.filter((p) => p.status === "NOT_PAID").length;
  const settling = payments.filter((p) => p.status === "UNDER_SETTLEMENT").length;
  const paid = payments.filter((p) => p.status === "PAID").length;
  const totalAmt = payments
    .filter((p) => p.status === "PAID" && p.amount)
    .reduce((sum, p) => sum + (p.amount ?? 0), 0);

  const completedBankAccounts = doctors.filter(
    (d) =>
      (d.financialType === "BANK_ACCOUNT" && d.accountNumber) ||
      (d.financialType === "BANK_CARD" && d.cardNumber)
  ).length;

  return (
    <div className="space-y-6">
      {/* رأس الصفحة الحكومي الرصين */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded bg-[#1F4E79]/10 text-[#1F4E79] border border-[#1F4E79]/20 text-[11px] font-bold">
              🏛️ الشؤون المالية والحسابات
            </span>
            <span className="text-xs text-slate-500 font-bold">اللجنة العليا للمسؤولية الطبية وسلامة المريض</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            المنظومة المالية وصرف مستحقات أطباء اللجان والتعويضات
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            عرض مباشر وفوري للحسابات المصرفية لأطباء اللجان الفرعية الـ 16 ومتابعة صرف التعويضات
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold">
            💳 {completedBankAccounts} حساباً جاهزاً للتحويل
          </span>
        </div>
      </div>

      {/* المؤشرات المالية السريعة */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-icon bg-blue-50 text-[#1F4E79] border border-blue-200">
            👨‍⚕️
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{doctors.length}</p>
            <p className="text-xs font-bold text-slate-500">أطباء اللجان الفرعية</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-emerald-50 text-emerald-700 border border-emerald-200">
            🏦
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 font-mono">{formatNumber(completedBankAccounts)}</p>
            <p className="text-xs font-bold text-slate-500">حسابات بنكية وفيزا مسجلة</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-amber-50 text-amber-700 border border-amber-200">
            ⏳
          </div>
          <div>
            <p className="text-2xl font-black text-amber-700 font-mono">{formatNumber(notPaid + settling)}</p>
            <p className="text-xs font-bold text-slate-500">تعويضات تحت التسوية</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-teal-50 text-teal-700 border border-teal-200">
            💰
          </div>
          <div>
            <p className="text-xl font-black text-teal-800 font-mono">
              {formatCurrency(totalAmt)}
            </p>
            <p className="text-xs font-bold text-slate-500">إجمالي التعويضات المصروفة</p>
          </div>
        </div>
      </div>

      {/* ─── القسم الأول: سجل الحسابات البنكية لأطباء اللجان الفرعية ─── */}
      <div className="space-y-3">
        <div className="border-b border-slate-200 pb-2">
          <h2 className="text-base font-black text-[#1F4E79] flex items-center gap-2">
            <span>💳</span>
            <span>الحسابات المصرفية والفيزا لأطباء واستشاريي اللجان الفرعية (16 لجنة)</span>
          </h2>
          <p className="text-xs text-slate-500">
            بيانات التحويل البنكي والفيزا المسجلة من قِبل مقرري اللجان الفرعية لتسهيل التحويل المباشر
          </p>
        </div>

        <DoctorsFinanceTable doctors={doctors as any} subCommittees={subCommittees} />
      </div>

      {/* ─── القسم الثاني: سجلات التعويضات والمدفوعات للقضايا ─── */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <span>⚖️</span>
              <span>سجلات صرف التعويضات المقررة بالقضايا والتقارير الطبية</span>
            </h2>
            <p className="text-xs text-slate-500">
              المبالغ المقررة بقرارات اللجنة العليا للمسؤولية الطبية وحالة الصرف
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500">{payments.length} سجل مالي</span>
        </div>

        <div className="card p-0 overflow-hidden border-slate-200 bg-white">
          <div className="table-wrapper border-0 rounded-none">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>رقم السجل / القضية</th>
                  <th>المستفيد / الطبيب</th>
                  <th>يستحق؟</th>
                  <th>المبلغ المقرر</th>
                  <th>حالة الصرف</th>
                  <th>إجراء التعديل</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs text-slate-500">
                      لا توجد سجلات تعويضات مالية مقيدة حالياً. تُنشأ تلقائياً عند اعتماد قرارات اللجنة العليا.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => <PaymentRow key={p.id} payment={p as any} />)
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
