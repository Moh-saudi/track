import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AttachmentUploader } from "@/app/dashboard/_components/attachment-uploader";
import { ReviewTeamManager } from "./review-team-manager";
import { MeetingDateManager } from "./meeting-date-manager";
import { formatDate, formatCurrency } from "@/lib/formatters";
import {
  Scale,
  Calendar,
  User,
  AlertTriangle,
  Paperclip,
  Building2,
  Stethoscope,
  Clock,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Check,
  FileText,
  ChevronLeft,
  Lock,
  Download
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

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
      meetingReschedules: {
        orderBy: { createdAt: "desc" },
        include: { createdBy: { select: { fullName: true } } },
      },
    },
  });

  if (!caseRecord) notFound();

  const statusInfo = STATUS_CONFIG[caseRecord.status] ?? { label: caseRecord.status, badge: "badge-registered" };
  const hasMeetingDate = !!caseRecord.meetingDate;
  const isPendingSupreme = caseRecord.status === "PENDING_SUPREME_REVIEW";
  // لا يمكن تعديل السجل إلا إذا كان قيد دراسة اللجنة أو محالاً لإعادة الدراسة من اللجنة العليا
  const canEdit = caseRecord.status === "UNDER_SUBCOMMITTEE_REVIEW" || caseRecord.status === "REFERRED_FOR_REVIEW";

  return (
    <div className="space-y-6 font-body">
      {/* ─── رأس الصفحة الموحد ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "اللجنة الفرعية", href: "/dashboard/subcommittee" },
          { label: `سجل رقم ${caseRecord.caseNumber} / ${caseRecord.caseYear}` },
        ]}
        title={`المرحلة الأولى: التحضير وجدولة الجلسة وتشكيل الفريق — سجل ${caseRecord.caseNumber} / ${caseRecord.caseYear}`}
        description={`ملف دراسة وبحث باللجنة الفرعية (${caseRecord.subCommittee?.name || "اللجنة الفرعية"}).`}
        actions={
          <div className="flex items-center gap-3">
            <span className={statusInfo.badge}>
              {statusInfo.label}
            </span>
            <Link href="/dashboard/subcommittee" className="btn-secondary text-xs">
              <ArrowRight className="w-4 h-4" />
              رجوع للقائمة
            </Link>
          </div>
        }
      />

      {/* ─── تنبيه القفل ووضع القراءة والاطلاع فقط ─── */}
      {!canEdit ? (
        <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 text-slate-800 text-xs flex items-center justify-between font-body shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <strong className="font-bold font-heading text-slate-900 block text-xs">
                السجل في وضع القراءة والاطلاع فقط (معتمد):
              </strong>
              <span className="text-slate-600">
                تم اعتماد تقرير هذا السجل ورفعه رسمياً للجنة العليا. لا يمكن فتح السجل أو إجراء أي تعديل عليه، إلا إذا صدر قرار من اللجنة العليا بإعادته لإعادة الدراسة.
              </span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-800 font-bold text-[11px] shrink-0">
            مغلق للتعديل
          </span>
        </div>
      ) : caseRecord.status === "REFERRED_FOR_REVIEW" ? (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-center justify-between font-body shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <strong className="font-bold font-heading text-amber-950 block text-xs">
                السجل محال لإعادة الدراسة من اللجنة العليا:
              </strong>
              <span className="text-amber-900">
                تم فتح السجل للتحرير بناءً على قرار الإحالة. يمكنك إعادة فحص الأوراق وتعديل موعد الجلسة أو إعداد التقرير الطبي المعدل.
              </span>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-amber-200 text-amber-900 font-bold text-[11px] shrink-0">
            متاح للتحرير
          </span>
        </div>
      ) : null}

      {/* ─── مؤشر المراحل التشغيلية (Two-Phase Workflow Stepper) ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* المرحلة 1 (الصفحة الحالية) */}
          <div className="p-3.5 rounded-xl border bg-teal-50/70 border-teal-300 text-teal-950 ring-2 ring-teal-600/20 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold font-heading ${
              hasMeetingDate ? "bg-teal-700 text-white" : "bg-amber-600 text-white"
            }`}>
              {hasMeetingDate ? <Check className="w-4 h-4" /> : "1"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h4 className="text-xs font-bold font-heading">
                  المرحلة الأولى: جدولة الجلسة وتشكيل الفريق (الحالية)
                </h4>
                {hasMeetingDate ? (
                  <Badge variant="approved" size="sm">مكتملة</Badge>
                ) : (
                  <Badge variant="review" size="sm">مطلوب الجدولة</Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                {hasMeetingDate
                  ? `تم اعتماد الجلسة في: ${formatDate(caseRecord.meetingDate!)}`
                  : "سجل تاريخ الانعقاد ليظهر مباشرة في مرصد التوجيه والمتابعة"}
              </p>
            </div>
          </div>

          {/* المرحلة 2 (صفحة مستقلة) */}
          <Link
            href={hasMeetingDate ? `/dashboard/subcommittee/${caseRecord.id}/report` : "#"}
            className={`p-3.5 rounded-xl border transition-all flex items-center gap-3 ${
              !hasMeetingDate
                ? "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed opacity-80"
                : "bg-white border-teal-200 text-slate-900 hover:bg-teal-50/50 hover:border-teal-300 shadow-sm"
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold font-heading ${
              !hasMeetingDate
                ? "bg-slate-200 text-slate-500"
                : isPendingSupreme
                ? "bg-emerald-600 text-white"
                : "bg-teal-600 text-white"
            }`}>
              {isPendingSupreme ? <Check className="w-4 h-4" /> : "2"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <h4 className="text-xs font-bold font-heading flex items-center gap-1.5">
                  <span>المرحلة الثانية: التقرير الطبي وتوصيف الخطأ</span>
                  {hasMeetingDate && <ChevronLeft className="w-3.5 h-3.5 text-teal-600" />}
                </h4>
                {!hasMeetingDate ? (
                  <Badge variant="slate" size="sm">مغلقة مؤقتاً</Badge>
                ) : isPendingSupreme ? (
                  <Badge variant="pending" size="sm">تم الرفع</Badge>
                ) : (
                  <Badge variant="teal" size="sm">صفحة مستقلة</Badge>
                )}
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                {!hasMeetingDate
                  ? "تفتح بعد جدولة موعد الجلسة في هذه الصفحة"
                  : "اضغط للانتقال لصفحة إعداد التقرير والمداولة"}
              </p>
            </div>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* العمود الرئيسي للمرحلة الأولى */}
        <div className="lg:col-span-2 space-y-6">
          {/* قرار واعتماد اللجنة العليا للمسؤولية الطبية (إن وجد) */}
          {caseRecord.supremeDecisions.length > 0 && (
            <div className="bg-white rounded-2xl border border-teal-200 bg-teal-50/20 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700">
                    <Scale className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold font-heading text-teal-900">قرار واعتماد اللجنة العليا للمسؤولية الطبية</h2>
                    <p className="text-xs text-slate-500 font-body">القرار الصادر بخصوص هذا السجل من رئاسة اللجنة العليا</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full border border-slate-200 bg-white text-slate-700 font-body">
                  {caseRecord.supremeDecisions.length} قرار صادر
                </span>
              </div>

              <div className="space-y-3">
                {caseRecord.supremeDecisions.map((dec) => {
                  const cfg = SUPREME_DECISION_CONFIG[dec.decisionType] ?? { label: dec.decisionType, badgeClass: "bg-slate-100 text-slate-800 border-slate-300" };
                  return (
                    <div key={dec.id} className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3 text-xs font-body">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.badgeClass}`}>
                          {cfg.label}
                        </span>
                        <div className="text-xs text-slate-500 font-medium flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>تاريخ انعقاد الجلسة: <span className="font-mono">{formatDate(dec.meetingDate)}</span></span>
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>رئيس الجلسة: {dec.decidedBy.fullName}</span>
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1 text-slate-800">
                        <strong className="block text-slate-900 font-bold font-heading">منطوق وحيثيات القرار:</strong>
                        <p className="leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium whitespace-pre-wrap font-body">
                          {dec.decisionDetails}
                        </p>
                      </div>

                      {dec.referredSubCommittee && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>أُحيل السجل إلى: {dec.referredSubCommittee.name}</span>
                        </div>
                      )}

                      {caseRecord.payments.length > 0 && caseRecord.payments[0].entitled && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-950 font-semibold">
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-emerald-600" />
                            <span>تقدير البدل المستحق:</span>
                          </span>
                          <span className="text-sm font-bold font-mono">
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

          {/* بطاقة تفاصيل الواقعة وبيانات المشكو في حقه */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-sm font-bold font-heading text-slate-900 border-b border-slate-100 pb-2 flex items-center justify-between">
              <span>تفاصيل الواقعة وموضوع النزاع الطبي</span>
              <span className="text-xs font-medium text-slate-500 font-body flex items-center gap-1">
                <Paperclip className="w-3.5 h-3.5" />
                <span>{caseRecord.attachmentsCount} مرفقات رسمية</span>
              </span>
            </h2>

            {(caseRecord.respondentName || caseRecord.hospitalName) && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs font-body">
                <User className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <div>
                  <span className="font-bold text-amber-950">المشكو في حقه: </span>
                  <span className="text-amber-900 font-semibold">{caseRecord.respondentName || caseRecord.hospitalName}</span>
                </div>
              </div>
            )}

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-800 font-medium">
              {caseRecord.description}
            </div>

            {/* التخصصات الطبية المعنية */}
            {caseRecord.specialties.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-slate-600 block mb-1.5 font-body">التخصصات الطبية المعنية بالفحص:</span>
                <div className="flex flex-wrap gap-1.5">
                  {caseRecord.specialties.map((s) => (
                    <span key={s.id} className="px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 font-medium text-xs border border-teal-200 flex items-center gap-1 font-body">
                      <Stethoscope className="w-3 h-3 text-teal-600" />
                      <span>{s.specialty.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* المرحلة الأولى: جدولة الجلسة وتوثيق أسباب التعديل                       */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          <div className="space-y-4">
            <MeetingDateManager
              caseId={caseRecord.id}
              initialMeetingDate={caseRecord.meetingDate ? caseRecord.meetingDate.toISOString() : null}
              initialReason={caseRecord.meetingDateReason}
              initialUpdatedAt={caseRecord.meetingDateUpdatedAt ? caseRecord.meetingDateUpdatedAt.toISOString() : null}
              initialReschedules={caseRecord.meetingReschedules.map((r) => ({
                id: r.id,
                oldDate: r.oldDate ? r.oldDate.toISOString() : null,
                newDate: r.newDate.toISOString(),
                reason: r.reason,
                createdAt: r.createdAt.toISOString(),
                createdBy: r.createdBy ? { fullName: r.createdBy.fullName } : null,
              }))}
              readOnly={!canEdit}
            />

            {/* تشكيل فريق الفحص وقواعد تعارض المصالح وحق التنحي */}
            <ReviewTeamManager
              caseId={caseRecord.id}
              currentUserId={currentUserId}
              respondentName={caseRecord.respondentName || caseRecord.hospitalName || undefined}
              readOnly={!canEdit}
            />
          </div>

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* بطاقة الانتقال للمرحلة الثانية (صفحة التقرير الطبي المستقلة)            */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          <div className={`p-6 rounded-2xl border transition-all ${
            hasMeetingDate
              ? "bg-gradient-to-br from-teal-50 to-emerald-50/40 border-teal-200 shadow-sm"
              : "bg-slate-50 border-slate-200 text-slate-400"
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FileText className={`w-5 h-5 ${hasMeetingDate ? "text-teal-700" : "text-slate-400"}`} />
                  <h3 className={`text-sm font-bold font-heading ${hasMeetingDate ? "text-slate-900" : "text-slate-500"}`}>
                    المرحلة الثانية: مداولة الجلسة وإعداد التقرير الطبي وتوصيف الخطأ
                  </h3>
                </div>
                <p className="text-xs text-slate-600 max-w-lg leading-relaxed">
                  {hasMeetingDate
                    ? canEdit
                      ? "تم استيفاء المرحلة الأولى وجدولة الجلسة بنجاح. يمكنك الآن الانتقال للصفحة المستقلة الخاصة بتحرير التقرير الطبي والرفع للجنة العليا."
                      : "تم اعتماد التقرير ورفعه رسمياً للجنة العليا. يمكنك استعراض التقرير المعتمد في وضع القراءة والاطلاع فقط."
                    : "تتطلب المنظومة أولاً جدولة وتأكيد موعد انعقاد الجلسة في هذه الصفحة ليتم فتح رابط المرحلة الثانية."}
                </p>
              </div>

              {hasMeetingDate ? (
                <Link
                  href={`/dashboard/subcommittee/${caseRecord.id}/report`}
                  className="btn-primary text-xs px-5 py-2.5 inline-flex items-center gap-2 shrink-0 shadow-sm"
                >
                  <span>{canEdit ? "الانتقال لصفحة التقرير الطبي لتحريره" : "عرض التقرير الطبي المعتمد (للاطلاع فقط)"}</span>
                  <ArrowLeft className="w-4 h-4" />
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="btn-secondary text-xs px-5 py-2.5 inline-flex items-center gap-2 shrink-0 opacity-60 cursor-not-allowed"
                >
                  <span>بانتظار جدولة الجلسة</span>
                </button>
              )}
            </div>
          </div>

          {/* سجل الإجراءات والتقارير الصادرة السابقة */}
          {caseRecord.actions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
              <h2 className="text-sm font-bold font-heading text-slate-900">سجل الإجراءات والتقارير الصادرة ({caseRecord.actions.length})</h2>
              <div className="space-y-3">
                {caseRecord.actions.map((act) => (
                  <div key={act.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs font-body">
                    <div className="flex items-center justify-between text-slate-500 font-semibold border-b border-slate-200 pb-2">
                      <span>مُعد التقرير: {act.recordedBy.fullName}</span>
                      <span className="font-mono">{formatDate(act.createdAt)}</span>
                    </div>
                    {act.faultDescription && (
                      <p><strong className="text-slate-900 font-heading">توصيف الخطأ الطبي: </strong>{act.faultDescription}</p>
                    )}
                    {act.reportText && (
                      <p><strong className="text-slate-900 font-heading">نص التقرير: </strong>{act.reportText}</p>
                    )}
                    {act.actionTaken && (
                      <p><strong className="text-slate-900 font-heading">التوصية والإجراء: </strong>{act.actionTaken}</p>
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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
            <h3 className="text-xs font-bold font-heading text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-teal-600" />
              <span>المواعيد المقررة للفحص</span>
            </h3>
            <div className="space-y-2 text-xs font-body">
              <div className="flex justify-between">
                <span className="text-slate-500">تاريخ الإحالة والتوجيه:</span>
                <span className="font-bold text-slate-800 font-mono">
                  {caseRecord.assignedAt ? formatDate(caseRecord.assignedAt) : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الموعد المقرر للجلسة:</span>
                <span className="font-bold text-teal-700 font-mono">
                  {caseRecord.meetingDate ? formatDate(caseRecord.meetingDate) : "لم يُحدد بعد"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الموعد النهائي لرفع التقرير:</span>
                <span className="font-bold text-teal-700 font-mono">
                  {caseRecord.expectedDueDate ? formatDate(caseRecord.expectedDueDate) : "30 يوماً"}
                </span>
              </div>
              {caseRecord.followUpNotes && (
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                  <strong>توجيهات موظف المتابعة: </strong>
                  {caseRecord.followUpNotes}
                </div>
              )}
            </div>
          </div>

          {/* مرفقات القضية */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
            <h3 className="text-xs font-bold font-heading text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-1.5">
              <FolderOpen className="w-3.5 h-3.5 text-teal-600" />
              <span>المستندات والمرفقات ({caseRecord.attachments.length})</span>
            </h3>
            {caseRecord.attachments.length > 0 && (
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {caseRecord.attachments.map((att) => (
                  <div key={att.id} className="p-2 rounded bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-1.5 truncate">
                      <span className="truncate max-w-[130px] font-bold text-slate-700">{att.fileName}</span>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {att.fileSize ? `${Math.round(att.fileSize / 1024)} KB` : "ملف"}
                      </span>
                    </div>
                    <a
                      href={`/api/cases/${caseRecord.id}/attachments/${att.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded bg-white border border-slate-200 text-teal-700 hover:bg-teal-50 transition-colors shrink-0"
                      title="تحميل المرفق بأمان"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
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
