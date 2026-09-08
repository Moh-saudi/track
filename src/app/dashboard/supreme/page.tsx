import Link from "next/link";
import { prisma } from "@/lib/prisma";

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  PENDING_SUPREME_REVIEW: { label: "بانتظار قرار اللجنة العليا", badge: "badge-pending" },
  APPROVED:               { label: "معتمد (قرار نهائي)", badge: "badge-approved" },
  REFERRED_FOR_REVIEW:    { label: "محال لإعادة الدراسة", badge: "badge-referred" },
};

export default async function SupremeDashboard() {
  const [cases, totalApproved] = await Promise.all([
    prisma.case.findMany({
      where: { status: { in: ["PENDING_SUPREME_REVIEW", "APPROVED", "REFERRED_FOR_REVIEW"] } },
      orderBy: { updatedAt: "desc" },
      include: {
        subCommittee: true,
        specialties: { include: { specialty: true } },
        supremeDecisions: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.case.count({ where: { status: "APPROVED" } }),
  ]);

  const pending = cases.filter((c) => c.status === "PENDING_SUPREME_REVIEW").length;
  const referred = cases.filter((c) => c.status === "REFERRED_FOR_REVIEW").length;

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 text-xs font-black border border-amber-300">
              الدائرة العليا
            </span>
            <span className="text-xs text-slate-500 font-bold">اللجنة العليا للمسؤولية الطبية وسلامة المريض</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            مراجعة واعتماد القرارات النهائية
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            مراجعة تقارير اللجان الفرعية، اعتماد القرارات النهائية، أو الإحالة لإعادة الفحص
          </p>
        </div>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4 border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-black text-xl shadow-sm">
            ⏳
          </div>
          <div>
            <p className="text-2xl font-black text-amber-700">{pending}</p>
            <p className="text-xs font-bold text-slate-500">بانتظار قرار اللجنة العليا</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4 border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-700 border border-orange-200 flex items-center justify-center font-black text-xl shadow-sm">
            🔄
          </div>
          <div>
            <p className="text-2xl font-black text-orange-700">{referred}</p>
            <p className="text-xs font-bold text-slate-500">محالة لإعادة الدراسة</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4 border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black text-xl shadow-sm">
            ⚖️
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-700">{totalApproved}</p>
            <p className="text-xs font-bold text-slate-500">قرارات نهائية معتمدة</p>
          </div>
        </div>
      </div>

      {/* الجدول */}
      <div className="card p-0 overflow-hidden border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-800">قضايا الدائرة العليا</h2>
          <span className="text-xs font-bold text-slate-500">{cases.length} قضية</span>
        </div>

        {cases.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-bold">
            لا توجد تقارير بانتظار نظر اللجنة العليا حالياً
          </div>
        ) : (
          <div className="table-container border-0 rounded-none">
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم السجل / السنة</th>
                  <th>النوع</th>
                  <th>المنشأة المشكو في حقها</th>
                  <th>اللجنة الفرعية الفاحصة</th>
                  <th>التخصصات</th>
                  <th>الحالة</th>
                  <th className="text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => {
                  const statusInfo = STATUS_CONFIG[c.status] ?? { label: c.status, badge: "badge-registered" };
                  return (
                    <tr key={c.id}>
                      <td className="font-black text-slate-900 whitespace-nowrap">
                        {c.caseNumber} / {c.caseYear}
                      </td>

                      <td>
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 border">
                          {c.registrationType === "COMPLAINT" ? "شكوى" : c.registrationType === "CASE" ? "قضية" : "محضر"}
                        </span>
                      </td>

                      <td className="font-bold text-slate-800 text-xs">
                        {c.hospitalName || "—"}
                      </td>

                      <td className="font-bold text-[#1F4E79] text-xs">
                        {c.subCommittee?.name || "—"}
                      </td>

                      <td>
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {c.specialties.map((s) => (
                            <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border">
                              {s.specialty.name}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td>
                        <span className={statusInfo.badge}>
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="text-center whitespace-nowrap">
                        <Link
                          href={`/dashboard/supreme/${c.id}`}
                          className="btn-primary btn-sm text-xs px-3 py-1.5"
                        >
                          دراسة وإصدار القرار
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
