import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatNumber } from "@/lib/formatters";

export const revalidate = 0;

export default async function FollowUpDashboard() {
  const cases = await prisma.case.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      subCommittee: true,
      specialties: { include: { specialty: true } },
      createdBy: { select: { fullName: true } },
      actions: { select: { reportDate: true } },
      reviewers: {
        include: {
          user: { select: { fullName: true, employer: true } },
          doctor: { select: { name: true, employer: true } },
        },
      },
    },
  });

  const now = new Date();

  // 1. السجلات غير الموزعة (بانتظار التوجيه)
  const unassignedCases = cases.filter((c) => c.status === "REGISTERED" || !c.subCommitteeId);

  // السجلات التي تأخر توزيعها أكثر من 3 أيام من تاريخ قيدها
  const delayedUnassigned = unassignedCases.filter((c) => {
    const diffDays = Math.floor((now.getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 3;
  });

  // 2. السجلات قيد دراسة اللجان الفرعية لمتابعة المدد الزمنية
  const inReviewCases = cases.filter(
    (c) => c.subCommitteeId && (c.status === "UNDER_SUBCOMMITTEE_REVIEW" || c.status === "REFERRED_FOR_REVIEW")
  );

  let onTrackCount = 0;
  let nearingDeadlineCount = 0;
  let overdueCount = 0;

  inReviewCases.forEach((c) => {
    if (c.expectedDueDate) {
      const due = new Date(c.expectedDueDate).getTime();
      const diffDays = Math.ceil((due - now.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        overdueCount++;
      } else if (diffDays <= 5) {
        nearingDeadlineCount++;
      } else {
        onTrackCount++;
      }
    } else {
      onTrackCount++;
    }
  });

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-[#1F4E79]/10 text-[#1F4E79] border border-[#1F4E79]/20 text-[11px] font-bold">
              ⚖️ مرصد المتابعة والتوجيه
            </span>
            <span className="text-xs text-slate-500 font-bold">مكتب المتابعة الفنية وتقييم الأداء الزمني</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            مرصد توجيه السجلات ومتابعة مدد اللجان الفرعية
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            إحالة القضايا للـ 16 جهة المعتمدة وتتبع الالتزام بالمدد الزمنية المحددة وكشف المتأخرات
          </p>
        </div>

        {delayedUnassigned.length > 0 && (
          <div className="badge-delayed px-3 py-1.5 text-xs">
            <span>🚨</span>
            <span>تنبيه عاجل: {delayedUnassigned.length} سجل تجاوزت 3 أيام دون توجيه</span>
          </div>
        )}
      </div>

      {/* بطاقات المؤشرات */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="stat-icon bg-slate-100 text-slate-800">
            📥
          </div>
          <div>
            <p className="text-2xl font-black text-slate-900">{unassignedCases.length}</p>
            <p className="text-xs font-bold text-slate-500">بانتظار التوزيع</p>
          </div>
        </div>

        <div className="stat-card border-rose-200 bg-rose-50/40">
          <div className="stat-icon bg-rose-100 text-rose-700">
            ⚠️
          </div>
          <div>
            <p className="text-2xl font-black text-rose-700">{delayedUnassigned.length}</p>
            <p className="text-xs font-bold text-rose-800">تأخر توزيعها (&gt; 3 أيام)</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon bg-emerald-50 text-emerald-700 border border-emerald-200">
            🟢
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-700">{onTrackCount}</p>
            <p className="text-xs font-bold text-slate-500">في المهلة الزمنية</p>
          </div>
        </div>

        <div className="stat-card border-rose-200 bg-rose-50/40">
          <div className="stat-icon bg-rose-100 text-rose-700">
            🔴
          </div>
          <div>
            <p className="text-2xl font-black text-rose-700">{overdueCount}</p>
            <p className="text-xs font-bold text-rose-800">تجاوزت المهلة المقررة</p>
          </div>
        </div>
      </div>

      {/* ─── القسم الأول: السجلات التي تنتظر التوجيه والإحالة ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <h2 className="text-sm font-black text-slate-900">
              أولاً: السجلات بانتظار التوجيه إلى اللجان الفرعية
            </h2>
            <span className="badge-registered text-[10px]">
              {unassignedCases.length} سجل
            </span>
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          {unassignedCases.length === 0 ? (
            <div className="p-8 text-center text-emerald-700 text-xs font-bold bg-emerald-50/50">
              تم توجيه وتوزيع كافة السجلات المقيدة بنجاح
            </div>
          ) : (
            <div className="table-wrapper border-0 rounded-none shadow-none">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>موقف التوزيع</th>
                    <th>رقم السجل / السنة</th>
                    <th>النوع</th>
                    <th>المشكو في حقه</th>
                    <th>الشاكي / النيابة</th>
                    <th>المرفقات</th>
                    <th>التخصصات المعنية</th>
                    <th>تاريخ القيد</th>
                    <th className="text-center">إجراء التوجيه</th>
                  </tr>
                </thead>
                <tbody>
                  {unassignedCases.map((c) => {
                    const daysSinceReg = Math.floor((now.getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                    const isDelayed = daysSinceReg >= 3;

                    return (
                      <tr
                        key={c.id}
                        className={isDelayed ? "table-row-delayed" : undefined}
                      >
                        <td>
                          {isDelayed ? (
                            <span className="badge-delayed">
                              🚨 متأخر (+{daysSinceReg} أيام)
                            </span>
                          ) : (
                            <span className="badge bg-slate-100 text-slate-700 border border-slate-300">
                              منذ {daysSinceReg === 0 ? "اليوم" : `${daysSinceReg} يوم`}
                            </span>
                          )}
                        </td>

                        <td className="font-bold text-slate-900 font-mono whitespace-nowrap">
                          {c.caseNumber} / {c.caseYear}
                        </td>

                        <td>
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800 border">
                            {c.registrationType === "COMPLAINT" ? "شكوى" : c.registrationType === "CASE" ? "قضية" : "محضر"}
                          </span>
                        </td>

                        <td className="font-medium text-slate-800 text-xs">
                          {c.respondentName ? (
                            <span className="truncate block max-w-[180px] font-bold text-slate-900" title={c.respondentName}>
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
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white text-slate-700 text-xs font-bold font-mono border border-slate-200">
                            📎 {c.attachmentsCount} ملف
                          </span>
                        </td>

                        <td>
                          <div className="flex flex-wrap gap-1 max-w-[160px]">
                            {c.specialties.length > 0 ? (
                              c.specialties.map((s) => (
                                <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded bg-white text-slate-700 font-bold border">
                                  {s.specialty.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-400 text-[11px]">بانتظار التوجيه</span>
                            )}
                          </div>
                        </td>

                        <td className="text-xs font-mono text-slate-600 whitespace-nowrap">
                          {formatDate(c.createdAt)}
                        </td>

                        <td className="text-center whitespace-nowrap">
                          <Link
                            href={`/dashboard/follow-up/${c.id}/assign`}
                            className={`btn btn-sm ${isDelayed ? "btn-danger font-black" : "btn-primary"}`}
                          >
                            <span>توجيه وتحديد المهلة</span>
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

      {/* ─── القسم الثاني: مرصد متابعة مدد اللجان الفرعية ─── */}
      <div className="space-y-3 pt-3 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <h2 className="text-sm font-black text-slate-900">
              ثانياً: مرصد متابعة مدد إنجاز اللجان الفرعية
            </h2>
            <span className="badge-review text-[10px]">
              {inReviewCases.length} قيد الدراسة
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            مؤشر الالتزام بالمهلة القانونية (30 يوماً)
          </span>
        </div>

        <div className="card p-0 overflow-hidden">
          {inReviewCases.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-bold">
              لا توجد قضايا قيد دراسة اللجان الفرعية حالياً
            </div>
          ) : (
            <div className="table-wrapper border-0 rounded-none shadow-none">
              <table className="table-custom">
                <thead>
                  <tr>
                    <th>رقم السجل / السنة</th>
                    <th>اللجنة الفرعية المحال إليها</th>
                    <th>التخصصات</th>
                    <th>تاريخ التوجيه</th>
                    <th>الموعد النهائي للإنجاز</th>
                    <th>نسبة استهلاك المهلة</th>
                    <th>موقف الالتزام بالمهلة</th>
                    <th>فريق الفحص</th>
                  </tr>
                </thead>
                <tbody>
                  {inReviewCases.map((c) => {
                    const assignedDate = c.assignedAt ? new Date(c.assignedAt) : new Date(c.createdAt);
                    const dueDate = c.expectedDueDate ? new Date(c.expectedDueDate) : null;

                    let totalDays = 30;
                    let daysElapsed = 0;
                    let daysRemaining = 0;
                    let percent = 0;
                    let isOverdue = false;
                    let isCritical = false;

                    if (dueDate) {
                      totalDays = Math.max(1, Math.round((dueDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24)));
                      daysElapsed = Math.max(0, Math.floor((now.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24)));
                      daysRemaining = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                      percent = Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));
                      if (daysRemaining < 0) isOverdue = true;
                      else if (daysRemaining <= 5) isCritical = true;
                    }

                    return (
                      <tr key={c.id} className={isOverdue ? "bg-rose-50/50" : undefined}>
                        <td className="font-bold text-slate-900 font-mono whitespace-nowrap">
                          {c.caseNumber} / {c.caseYear}
                        </td>

                        <td className="font-bold text-slate-800 text-xs">
                          {c.subCommittee?.name || "—"}
                        </td>

                        <td>
                          <div className="flex flex-wrap gap-1 max-w-[150px]">
                            {c.specialties.map((s) => (
                              <span key={s.id} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold border">
                                {s.specialty.name}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="text-xs font-mono text-slate-600 whitespace-nowrap">
                          {formatDate(assignedDate)}
                        </td>

                        <td className="text-xs font-mono font-bold whitespace-nowrap">
                          {dueDate ? formatDate(dueDate) : "غير محدد"}
                        </td>

                        {/* شريط استهلاك المهلة */}
                        <td className="min-w-[150px]">
                          <div className="w-full">
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                              <span>مضى {daysElapsed} يوم</span>
                              <span>{percent}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${isOverdue ? "bg-rose-600" : isCritical ? "bg-amber-500" : "bg-emerald-600"}`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* موقف الالتزام */}
                        <td>
                          {isOverdue ? (
                            <span className="badge-delayed">
                              🔴 متأخرة (+{Math.abs(daysRemaining)} يوم)
                            </span>
                          ) : isCritical ? (
                            <span className="badge bg-amber-50 text-amber-800 border border-amber-300 font-bold">
                              🟡 أوشكت (متبقي {daysRemaining} أيام)
                            </span>
                          ) : (
                            <span className="badge-approved">
                              🟢 في المهلة (متبقي {daysRemaining} يوم)
                            </span>
                          )}
                        </td>

                        {/* فريق الفحص */}
                        <td>
                          <div className="text-xs space-y-0.5">
                            {c.reviewers.length > 0 ? (
                              c.reviewers.map((rev) => (
                                <div key={rev.id} className="text-[11px] text-slate-700">
                                  <span>{rev.doctor?.name || rev.user?.fullName || "عضو فاحص"}</span>
                                  {rev.status === "RECUSED" && (
                                    <span className="text-[10px] text-rose-600 font-bold mr-1">(تنحى)</span>
                                  )}
                                </div>
                              ))
                            ) : (
                              <span className="text-slate-400 text-xs">بانتظار التشكيل</span>
                            )}
                          </div>
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
    </div>
  );
}
