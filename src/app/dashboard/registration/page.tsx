import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatNumber } from "@/lib/formatters";

const TYPE_CONFIG: Record<string, { label: string; badge: string }> = {
  COMPLAINT: { label: "شكوى", badge: "bg-blue-50 text-blue-800 border-blue-200" },
  CASE:      { label: "قضية", badge: "bg-purple-50 text-purple-800 border-purple-200" },
  REPORT:    { label: "محضر", badge: "bg-slate-100 text-slate-800 border-slate-300" },
};

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  REGISTERED:                { label: "بانتظار التوجيه", badge: "badge-registered" },
  UNDER_SUBCOMMITTEE_REVIEW: { label: "قيد دراسة اللجنة الفرعية", badge: "badge-review" },
  PENDING_SUPREME_REVIEW:    { label: "بانتظار اعتماد اللجنة العليا", badge: "badge-pending" },
  APPROVED:                  { label: "معتمد (قرار نهائي)", badge: "badge-approved" },
  REFERRED_FOR_REVIEW:       { label: "محال لإعادة الدراسة", badge: "badge-referred" },
  CLOSED:                    { label: "مغلق", badge: "badge-closed" },
};

export default async function RegistrationDashboard() {
  const [cases, total] = await Promise.all([
    prisma.case.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        subCommittee: true,
        specialties: { include: { specialty: true } },
        createdBy: { select: { fullName: true } },
      },
      take: 100,
    }),
    prisma.case.count(),
  ]);

  const pending = cases.filter((c) => c.status === "REGISTERED").length;
  const underReview = cases.filter((c) => c.status === "UNDER_SUBCOMMITTEE_REVIEW").length;
  const approved = cases.filter((c) => c.status === "APPROVED").length;

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-[#1F4E79]/10 text-[#1F4E79] border border-[#1F4E79]/20 text-[11px] font-bold">
              قيد السجلات
            </span>
            <span className="text-xs text-slate-500 font-bold">الأمانة الفنية لقيد وتوثيق الموضوعات</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            سجل القضايا والشكاوى والمحاضر
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/registration/reports"
            className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 shadow-sm flex items-center gap-1.5"
          >
            <span>📊</span>
            <span>تقارير ومعدلات التسجيل</span>
          </Link>
          <Link
            href="/dashboard/registration/new"
            className="btn-primary"
          >
            <span>➕</span>
            <span>قيد سجل جديد</span>
          </Link>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-icon bg-slate-100 text-slate-800">
            📊
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900 font-mono">{formatNumber(total)}</p>
            <p className="text-xs font-bold text-slate-500">إجمالي المقيد</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-amber-50 text-amber-700 border border-amber-200">
            ⏳
          </div>
          <div>
            <p className="text-2xl font-black text-amber-700 font-mono">{formatNumber(pending)}</p>
            <p className="text-xs font-bold text-slate-500">بانتظار التوجيه</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-blue-50 text-blue-700 border border-blue-200">
            🩺
          </div>
          <div>
            <p className="text-2xl font-black text-blue-700 font-mono">{formatNumber(underReview)}</p>
            <p className="text-xs font-bold text-slate-500">قيد الدراسة</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-emerald-50 text-emerald-700 border border-emerald-200">
            ⚖️
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-700 font-mono">{formatNumber(approved)}</p>
            <p className="text-xs font-bold text-slate-500">قرارات معتمدة</p>
          </div>
        </div>
      </div>

      {/* جدول السجلات */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">قائمة السجلات المقيدة ({cases.length})</span>
        </div>

        {cases.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-bold">
            لا توجد سجلات مسجلة حتى الآن
          </div>
        ) : (
          <div className="table-wrapper border-0 rounded-none shadow-none">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>رقم السجل / السنة</th>
                  <th>النوع</th>
                  <th>المشكو في حقه</th>
                  <th>الشاكي / النيابة</th>
                  <th>المرفقات</th>
                  <th>التخصصات</th>
                  <th>اللجنة المحال إليها</th>
                  <th>تاريخ القيد</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((c) => {
                  const typeInfo = TYPE_CONFIG[c.registrationType] ?? { label: c.registrationType, badge: "bg-slate-100" };
                  const statusInfo = STATUS_CONFIG[c.status] ?? { label: c.status, badge: "badge-registered" };

                  return (
                    <tr key={c.id}>
                      <td className="font-bold text-slate-900 font-mono whitespace-nowrap">
                        {c.caseNumber} / {c.caseYear}
                      </td>

                      <td>
                        <span className={`inline-block px-2.5 py-0.5 rounded text-xs font-bold border ${typeInfo.badge}`}>
                          {typeInfo.label}
                        </span>
                      </td>

                      <td className="font-medium text-slate-800 text-xs">
                        {c.respondentName ? (
                          <span className="truncate block max-w-[190px] font-bold text-slate-900" title={c.respondentName}>
                            👨‍⚕️ {c.respondentName}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td>
                        <div className="text-xs">
                          <p className="font-bold text-slate-800">{c.complainantName || "—"}</p>
                          <p className="text-[10px] text-slate-500">{c.prosecution || "—"}</p>
                        </div>
                      </td>

                      <td>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-bold font-mono border border-slate-200">
                          📎 {c.attachmentsCount} ملف
                        </span>
                      </td>

                      <td>
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {c.specialties.length > 0 ? (
                            c.specialties.map((s) => (
                              <span
                                key={s.id}
                                className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200"
                              >
                                {s.specialty.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px]">بانتظار التوجيه</span>
                          )}
                        </div>
                      </td>

                      <td>
                        {c.subCommittee ? (
                          <span className="text-xs font-bold text-slate-900 block" title={c.subCommittee.name}>
                            {c.subCommittee.name}
                          </span>
                        ) : (
                          <span className="badge-registered text-[11px]">
                            بانتظار التوجيه
                          </span>
                        )}
                      </td>

                      <td className="text-xs font-mono text-slate-600 whitespace-nowrap">
                        {formatDate(c.createdAt)}
                      </td>

                      <td>
                        <span className={statusInfo.badge}>
                          {statusInfo.label}
                        </span>
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
