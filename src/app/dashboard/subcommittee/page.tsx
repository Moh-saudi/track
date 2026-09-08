import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/formatters";

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  REGISTERED:                { label: "بانتظار التوجيه", badge: "badge-registered" },
  UNDER_SUBCOMMITTEE_REVIEW: { label: "قيد الدراسة", badge: "badge-review" },
  PENDING_SUPREME_REVIEW:    { label: "بانتظار اعتماد اللجنة العليا", badge: "badge-pending" },
  APPROVED:                  { label: "معتمد (قرار نهائي)", badge: "badge-approved" },
  REFERRED_FOR_REVIEW:       { label: "محال لإعادة الدراسة", badge: "badge-referred" },
  CLOSED:                    { label: "مغلق", badge: "badge-closed" },
};

export default async function SubCommitteeDashboard() {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const role = user?.role;
  const subCommitteeId = user?.subCommitteeId;

  // إذا كان المستخدم مديراً يرى الكل، وإذا كان عضواً يرى قضايا لجنته
  let where: any = {};
  if (role === "SUBCOMMITTEE_MEMBER" && subCommitteeId) {
    where = { subCommitteeId };
  } else if (role !== "ADMIN") {
    where = { subCommitteeId: subCommitteeId || "none" };
  }

  const [cases, subCommittee] = await Promise.all([
    prisma.case.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        subCommittee: true,
        specialties: { include: { specialty: true } },
        actions: { orderBy: { createdAt: "desc" }, take: 1 },
        reviewers: {
          include: {
            user: { select: { fullName: true } },
            doctor: { select: { name: true } },
          },
        },
      },
    }),
    subCommitteeId ? prisma.subCommittee.findUnique({ where: { id: subCommitteeId } }) : null,
  ]);

  const pending = cases.filter((c) => c.status === "UNDER_SUBCOMMITTEE_REVIEW" || c.status === "REFERRED_FOR_REVIEW").length;
  const done = cases.filter((c) => c.status === "PENDING_SUPREME_REVIEW" || c.status === "APPROVED").length;

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-black border border-teal-300">
              اللجنة الفرعية الفاحصة
            </span>
            <span className="text-xs text-slate-500 font-bold">
              {subCommittee ? subCommittee.name : "جميع اللجان الفرعية (وضع المشرف)"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            السجلات والقضايا المحالة للفحص الطبي
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            دراسة الملفات، تشكيل فرق الفحص، توصيف الخطأ الطبي، وإعداد التقارير الفنية
          </p>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5 flex items-center gap-4 border-slate-200">
          <div className="w-12 h-12 rounded-xl bg-[#1F4E79]/10 text-[#1F4E79] flex items-center justify-center font-black text-xl border border-[#1F4E79]/20 shadow-sm">
            📑
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{cases.length}</p>
            <p className="text-xs font-bold text-slate-500">إجمالي السجلات المحالة</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4 border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-black text-xl shadow-sm">
            ⏳
          </div>
          <div>
            <p className="text-2xl font-black text-amber-700">{pending}</p>
            <p className="text-xs font-bold text-slate-500">قيد الدراسة والفحص</p>
          </div>
        </div>

        <div className="card p-5 flex items-center gap-4 border-slate-200">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-black text-xl shadow-sm">
            ✅
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-700">{done}</p>
            <p className="text-xs font-bold text-slate-500">تم رفع تقريرها للجنة العليا</p>
          </div>
        </div>
      </div>

      {/* جدول القضايا المحالة */}
      <div className="card p-0 overflow-hidden border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="text-xs font-black text-slate-800">السجلات المسندة للجنة</h2>
          <span className="text-xs font-bold text-slate-500">{cases.length} قضية</span>
        </div>

        {cases.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-bold">
            لا توجد سجلات محالة إلى هذه اللجنة حالياً
          </div>
        ) : (
          <div className="table-container border-0 rounded-none">
            <table className="data-table">
              <thead>
                <tr>
                  <th>رقم السجل / السنة</th>
                  <th>النوع</th>
                  <th>المنشأة المشكو في حقها</th>
                  <th>التخصصات المعنية</th>
                  <th>تاريخ الإحالة</th>
                  <th>المهلة المحددة</th>
                  <th>فريق الفحص</th>
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

                      <td>
                        <div className="flex flex-wrap gap-1 max-w-[160px]">
                          {c.specialties.map((s) => (
                            <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border">
                              {s.specialty.name}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="text-xs font-mono text-slate-600 whitespace-nowrap">
                        {c.assignedAt ? formatDate(c.assignedAt) : "—"}
                      </td>

                      <td className="text-xs font-mono font-bold whitespace-nowrap">
                        {c.expectedDueDate ? (
                          <span className="text-[#1F4E79]">
                            {formatDate(c.expectedDueDate)}
                          </span>
                        ) : (
                          "30 يوماً"
                        )}
                      </td>

                      <td>
                        <div className="text-xs space-y-0.5">
                          {c.reviewers.length > 0 ? (
                            c.reviewers.map((r) => (
                              <div key={r.id} className="text-[11px] font-bold text-slate-700">
                                👨‍⚕️ {r.doctor?.name || r.user?.fullName || "طبيب فاحص"}
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-slate-400">لم يعين فريق</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span className={statusInfo.badge}>
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="text-center whitespace-nowrap">
                        <Link
                          href={`/dashboard/subcommittee/${c.id}`}
                          className="btn-primary btn-sm text-xs px-3 py-1.5"
                        >
                          فتح ودراسة السجل
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
