import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubCommitteeReportForm } from "./report-form";
import { AttachmentUploader } from "@/app/dashboard/_components/attachment-uploader";
import { ReviewTeamManager } from "./review-team-manager";
import { MeetingDateManager } from "./meeting-date-manager";
import { formatDate, formatCurrency } from "@/lib/formatters";

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  REGISTERED:                { label: "بانتظار التوجيه", badge: "badge-registered" },
  UNDER_SUBCOMMITTEE_REVIEW: { label: "قيد دراسة اللجنة الفرعية", badge: "badge-review" },
  PENDING_SUPREME_REVIEW:    { label: "بانتظار اعتماد اللجنة العليا", badge: "badge-pending" },
  APPROVED:                  { label: "معتمد (قرار نهائي)", badge: "badge-approved" },
  REFERRED_FOR_REVIEW:       { label: "محال لإعادة الدراسة", badge: "badge-referred" },
};

const SUPREME_DECISION_CONFIG: Record<string, { label: string; badgeClass: string }> = {
  APPROVE:    { label: "اعتماد تقرير اللجنة الفرعية (قرار نهائي)", badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  APPROVED:   { label: "اعتماد تقرير اللجنة الفرعية (قرار نهائي)", badgeClass: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  REFER_BACK: { label: "إحالة لإعادة الفحص والدراسة", badgeClass: "bg-amber-50 text-amber-800 border-amber-300" },
  REFERRED:   { label: "إحالة لإعادة الفحص والدراسة", badgeClass: "bg-amber-50 text-amber-800 border-amber-300" },
  DIFFERENT:  { label: "قرار مغاير لتوصية اللجنة الفرعية", badgeClass: "bg-rose-50 text-rose-800 border-rose-300" },
  REJECTED:   { label: "رفض التقرير", badgeClass: "bg-rose-50 text-rose-800 border-rose-300" },
};

export default async function SubCommitteeCaseDetail({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as any)?.id;

  const caseRecord = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      subCommittee: true,
      specialties: { include: { specialty: true } },
      attachments: { orderBy: { uploadedAt: "desc" } },
      actions: { orderBy: { createdAt: "desc" }, include: { recordedBy: { select: { fullName: true } } } },
      supremeDecisions: {
        orderBy: { createdAt: "desc" },
        include: {
          decidedBy: { select: { fullName: true } },
          referredSubCommittee: { select: { name: true } },
        },
      },
      payments: true,
    },
  });

  if (!caseRecord) notFound();

  const canSubmitReport = caseRecord.status === "UNDER_SUBCOMMITTEE_REVIEW" || caseRecord.status === "REFERRED_FOR_REVIEW";
  const statusInfo = STATUS_CONFIG[caseRecord.status] ?? { label: caseRecord.status, badge: "badge-registered" };

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 text-xs font-black border border-teal-300">
              ملف فحص ودراسة
            </span>
            <span className="text-xs text-slate-500 font-bold">{caseRecord.subCommittee?.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            السجل رقم: {caseRecord.caseNumber} / {caseRecord.caseYear}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            المنظومة الإلكترونية للجنة العليا للمسؤولية الطبية وسلامة المريض
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={statusInfo.badge}>
            {statusInfo.label}
          </span>
          <Link href="/dashboard/subcommittee" className="btn-secondary text-xs">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            رجوع للقائمة
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* العمود الرئيسي */}
        <div className="lg:col-span-2 space-y-6">
          {/* قرار واعتماد اللجنة العليا للمسؤولية الطبية (إن وجد) */}
          {caseRecord.supremeDecisions.length > 0 && (
            <div className="card border-[#1F4E79]/30 bg-blue-50/40 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚖️</span>
                  <div>
                    <h2 className="text-sm font-black text-[#1F4E79]">قرار واعتماد اللجنة العليا للمسؤولية الطبية</h2>
                    <p className="text-[11px] text-slate-500">القرار الصادر بخصوص هذا السجل من رئاسة اللجنة العليا</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1 rounded-full border bg-white text-slate-700">
                  {caseRecord.supremeDecisions.length} قرار صادر
                </span>
              </div>

              <div className="space-y-3">
                {caseRecord.supremeDecisions.map((dec) => {
                  const cfg = SUPREME_DECISION_CONFIG[dec.decisionType] ?? { label: dec.decisionType, badgeClass: "bg-slate-100 text-slate-800 border-slate-300" };
                  return (
                    <div key={dec.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${cfg.badgeClass}`}>
                          {cfg.label}
                        </span>
                        <div className="text-[11px] text-slate-500 font-bold flex items-center gap-3">
                          <span>📅 تاريخ انعقاد الجلسة: <span className="font-mono">{formatDate(dec.meetingDate)}</span></span>
                          <span>👤 رئيس الجلسة: {dec.decidedBy.fullName}</span>
                        </div>
                      </div>

                      <div className="space-y-1 text-slate-800">
                        <strong className="block text-slate-900 font-black">منطوق وحيثيات القرار:</strong>
                        <p className="leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-200 font-medium whitespace-pre-wrap">
                          {dec.decisionDetails}
                        </p>
                      </div>

                      {dec.referredSubCommittee && (
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">
                          ⚠️ أُحيل السجل إلى: {dec.referredSubCommittee.name}
                        </div>
                      )}

                      {caseRecord.payments.length > 0 && caseRecord.payments[0].entitled && (
                        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-950 font-bold">
                          <span>💰 تقدير التعويض المستحق:</span>
                          <span className="text-sm font-black font-mono">
                            {formatCurrency(caseRecord.payments[0].amount)}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* بطاقة تفاصيل الواقعة والمنشأة المشكو في حقها */}
          <div className="card border-slate-200 space-y-4">
            <h2 className="text-sm font-black text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
              <span>تفاصيل الواقعة وموضوع النزاع الطبي</span>
              <span className="text-xs font-bold text-slate-500">📎 {caseRecord.attachmentsCount} مرفقات رسمية</span>
            </h2>

            {caseRecord.hospitalName && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs">
                <span className="text-lg">🏥</span>
                <div>
                  <span className="font-black text-amber-950">المنشأة المشكو في حقها: </span>
                  <span className="font-bold text-amber-900">{caseRecord.hospitalName}</span>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-800 font-medium">
              {caseRecord.description}
            </div>

            {/* التخصصات الطبية المعنية */}
            {caseRecord.specialties.length > 0 && (
              <div>
                <span className="text-xs font-bold text-slate-600 block mb-1.5">التخصصات الطبية المعنية بالفحص:</span>
                <div className="flex flex-wrap gap-1.5">
                  {caseRecord.specialties.map((s) => (
                    <span key={s.id} className="px-2.5 py-1 rounded-lg bg-[#1F4E79]/10 text-[#1F4E79] font-bold text-xs border border-[#1F4E79]/20">
                      🩺 {s.specialty.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* تاريخ انعقاد جلسة فحص اللجنة الفرعية */}
          <MeetingDateManager
            caseId={caseRecord.id}
            initialMeetingDate={caseRecord.meetingDate ? caseRecord.meetingDate.toISOString() : null}
          />

          {/* تشكيل فريق الفحص وقواعد تعارض المصالح وحق التنحي */}
          <ReviewTeamManager
            caseId={caseRecord.id}
            currentUserId={currentUserId}
            hospitalName={caseRecord.hospitalName || undefined}
          />

          {/* نموذج رفع التقرير الطبي وتوصيف الخطأ */}
          {canSubmitReport ? (
            <div className="card border-slate-200">
              <h2 className="text-sm font-black text-slate-900 mb-4 flex items-center gap-2">
                <span>📝</span>
                <span>إعداد ورفع التقرير الطبي وتوصيف الخطأ</span>
              </h2>
              <SubCommitteeReportForm caseId={caseRecord.id} />
            </div>
          ) : (
            <div className="card p-6 bg-slate-50 border-slate-200 text-center">
              <span className="text-2xl block mb-2">🔒</span>
              <p className="font-black text-slate-700 text-sm">تم رفع التقرير للجنة العليا، السجل غير متاح لتعديل التقرير حالياً</p>
            </div>
          )}

          {/* سجل التقارير والإجراءات السابقة */}
          {caseRecord.actions.length > 0 && (
            <div className="card border-slate-200 space-y-3">
              <h2 className="text-sm font-black text-slate-900">سجل الإجراءات والتقارير الصادرة ({caseRecord.actions.length})</h2>
              <div className="space-y-3">
                {caseRecord.actions.map((act) => (
                  <div key={act.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-500 font-bold">
                      <span>مُعد التقرير: {act.recordedBy.fullName}</span>
                      <span className="font-mono">{formatDate(act.createdAt)}</span>
                    </div>
                    {act.faultDescription && (
                      <p><strong className="text-slate-900">توصيف الخطأ الطبي: </strong>{act.faultDescription}</p>
                    )}
                    {act.reportText && (
                      <p><strong className="text-slate-900">نص التقرير: </strong>{act.reportText}</p>
                    )}
                    {act.actionTaken && (
                      <p><strong className="text-slate-900">التوصية والإجراء: </strong>{act.actionTaken}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* العمود الجانبي للمرفقات والمواعيد */}
        <div className="space-y-6">
          {/* كارت المواعيد والمهلة الزمنية */}
          <div className="card border-slate-200 space-y-3">
            <h3 className="text-xs font-black text-slate-900 border-b pb-2">⏱️ المواعيد المقررة للفحص</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">تاريخ الإحالة والتوجيه:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {caseRecord.assignedAt ? formatDate(caseRecord.assignedAt) : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الموعد النهائي لرفع التقرير:</span>
                <span className="font-bold text-[#1F4E79] font-mono">
                  {caseRecord.expectedDueDate ? formatDate(caseRecord.expectedDueDate) : "30 يوماً"}
                </span>
              </div>
              {caseRecord.followUpNotes && (
                <div className="pt-2 border-t text-[11px] text-slate-600 bg-slate-50 p-2 rounded">
                  <strong>توجيهات موظف المتابعة: </strong>
                  {caseRecord.followUpNotes}
                </div>
              )}
            </div>
          </div>

          {/* مرفقات القضية */}
          <div className="card border-slate-200 space-y-3">
            <h3 className="text-xs font-black text-slate-900 border-b pb-2">📁 المستندات والمرفقات ({caseRecord.attachments.length})</h3>
            {caseRecord.attachments.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {caseRecord.attachments.map((att) => (
                  <div key={att.id} className="p-2 rounded bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                    <span className="truncate max-w-[150px] font-bold text-slate-700">{att.fileName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {att.fileSize ? `${Math.round(att.fileSize / 1024)} KB` : "ملف"}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <AttachmentUploader caseId={caseRecord.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
