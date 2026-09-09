import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate, formatDateTime } from "@/lib/formatters";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { AttachmentUploader } from "@/app/dashboard/_components/attachment-uploader";
import {
  FileText,
  Building2,
  Calendar,
  Clock,
  User,
  Paperclip,
  ArrowRight,
  ShieldCheck,
  Stethoscope,
  Edit3,
  CheckCircle2,
  AlertCircle,
  FolderOpen,
  UserCheck,
  Activity,
  Download,
} from "lucide-react";

export const revalidate = 0;

interface Props {
  params: { id: string };
}

export default async function RegistrationCaseDetailsPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const [caseRecord, caseAuditLogs] = await Promise.all([
    prisma.case.findUnique({
      where: { id: params.id },
      include: {
        subCommittee: true,
        specialties: { include: { specialty: true } },
        createdBy: { select: { id: true, fullName: true, email: true, role: true } },
        followUpOfficer: { select: { id: true, fullName: true } },
        attachments: {
          include: { uploadedBy: { select: { fullName: true } } },
          orderBy: { uploadedAt: "desc" },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: { entityType: "Case", entityId: params.id },
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (!caseRecord) {
    notFound();
  }

  const currentUserId = (session.user as any)?.id;
  const isCreatedByMe = caseRecord.createdById === currentUserId;
  const isModified =
    new Date(caseRecord.updatedAt).getTime() - new Date(caseRecord.createdAt).getTime() > 60000;

  const typeConfig: Record<string, { label: string; variant: "sky" | "violet" | "slate" }> = {
    COMPLAINT: { label: "شكوى", variant: "sky" },
    CASE: { label: "قضية", variant: "violet" },
    REPORT: { label: "محضر", variant: "slate" },
  };

  const statusConfig: Record<string, { label: string; variant: "slate" | "amber" | "sky" | "emerald" | "rose" }> = {
    REGISTERED: { label: "بانتظار التوجيه للجنة", variant: "slate" },
    UNDER_SUBCOMMITTEE_REVIEW: { label: "قيد دراسة اللجنة الفرعية", variant: "amber" },
    PENDING_SUPREME_REVIEW: { label: "بانتظار اعتماد الدائرة العليا", variant: "sky" },
    APPROVED: { label: "معتمد بقرار نهائي", variant: "emerald" },
    REFERRED_FOR_REVIEW: { label: "محال لإعادة الدراسة", variant: "rose" },
    CLOSED: { label: "مغلق", variant: "slate" },
  };

  const typeInfo = typeConfig[caseRecord.registrationType] || { label: caseRecord.registrationType, variant: "slate" };
  const statusInfo = statusConfig[caseRecord.status] || { label: caseRecord.status, variant: "slate" };

  return (
    <div className="space-y-6 font-body pb-12">
      {/* ─── رأس الصفحة ومسار التصفح ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "قيد السجلات", href: "/dashboard/registration" },
          { label: `ملف السجل #${caseRecord.caseNumber}/${caseRecord.caseYear}` },
        ]}
        title={`ملف وتفاصيل السجل: ${caseRecord.caseNumber} / ${caseRecord.caseYear}`}
        description={`عرض شامل لبيانات الشاكي، الواقعة، جهة النيابة، ومسجّل السجل وحالة الوثائق المرفقة.`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={statusInfo.variant} size="md">
              {statusInfo.label}
            </Badge>

            <Link
              href="/dashboard/registration"
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold font-heading transition-colors shadow-2xs"
            >
              <ArrowRight className="w-4 h-4" />
              <span>العودة لسجل القضايا</span>
            </Link>
          </div>
        }
      />

      {/* ─── بطاقة هوية السجل والقيد والمسجّل ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* رقم السجل والنوع */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">رقم وتصنيف السجل</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold font-mono text-slate-900 font-heading">
                {caseRecord.caseNumber} / {caseRecord.caseYear}
              </span>
              <Badge variant={typeInfo.variant} size="sm">
                {typeInfo.label}
              </Badge>
            </div>
          </div>

          {/* مسجّل السجل (القائم بالقيد) */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">القائم بقيد السجل</span>
            <div className="flex items-center gap-1.5">
              {isCreatedByMe ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-800 bg-sky-100/70 px-2 py-0.5 rounded font-heading">
                  <UserCheck className="w-3.5 h-3.5 text-sky-700" />
                  <span>أنا (حسابك الشخصي)</span>
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1 truncate">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate">{caseRecord.createdBy?.fullName || "موظف تسجيل"}</span>
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-mono block">
              تاريخ القيد: {formatDateTime(caseRecord.createdAt)}
            </span>
          </div>

          {/* تاريخ الوارد */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">تاريخ استلام الوارد</span>
            <div className="text-xs font-bold font-mono text-teal-800 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
              <span>
                {caseRecord.incomingDate
                  ? new Date(caseRecord.incomingDate).toLocaleDateString("ar-EG")
                  : "غير مسجل"}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 block">
              تاريخ كتاب النيابة / استلام الشكوى
            </span>
          </div>

          {/* موقف التعديل على السجل */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 block">موقف التعديل الرقابي</span>
            <div className="flex items-center gap-1">
              {isModified ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                  <span>تم التعديل عليه</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>قيد أصلي (لم يُعدّل)</span>
                </span>
              )}
            </div>
            {isModified && (
              <span className="text-[10px] text-amber-800 font-mono block">
                آخر تعديل: {formatDateTime(caseRecord.updatedAt)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─── تفاصيل بيانات الواقعة والإحالة ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* العمود الأيمن (7 أعمدة): بيانات الواقعة وأطراف الشكوى */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold font-heading text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              <span>بيانات الواقعة وأطراف النزاع</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-500 font-medium">اسم الشاكي / المريض:</span>
                <p className="font-bold text-slate-900 text-sm font-heading">
                  {caseRecord.complainantName || "غير محدد"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-medium">جهة النيابة العامة الوارد منها:</span>
                <p className="font-bold text-slate-900 text-sm font-heading">
                  {caseRecord.prosecution || "غير محدد"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-medium">المشكو في حقه (الطبيب / الكادر):</span>
                <p className="font-bold text-slate-900 text-sm font-heading">
                  {caseRecord.respondentName || "غير محدد"}
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-slate-500 font-medium">المنشأة الطبية / المستشفى:</span>
                <p className="font-bold text-slate-900 text-sm font-heading">
                  {caseRecord.hospitalName || "غير محدد"}
                </p>
              </div>

              {caseRecord.governorate && (
                <div className="space-y-1">
                  <span className="text-slate-500 font-medium">المحافظة:</span>
                  <p className="font-semibold text-slate-800">
                    {caseRecord.governorate}
                  </p>
                </div>
              )}
            </div>

            {/* ملخص الواقعة وموضوع الشكوى */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 font-heading">
                ملخص الواقعة وتفاصيل الشكوى المقيدة:
              </span>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-body whitespace-pre-wrap">
                {caseRecord.description || "لا يوجد ملخص نصي مسجل للواقعة."}
              </div>
            </div>
          </div>

          {/* سجل الحركات والتدقيق الرقابي لهذا السجل */}
          {caseAuditLogs.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
              <h2 className="text-base font-bold font-heading text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Activity className="w-5 h-5 text-teal-600" />
                <span>سجل الحركات والتدقيق الرقابي على هذا السجل</span>
              </h2>

              <div className="divide-y divide-slate-100">
                {caseAuditLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5">
                      <span className="font-semibold text-slate-800 block font-heading">
                        {log.action === "CREATE" ? "قيد السجل لأول مرة" : log.action === "UPDATE" ? "تعديل بيانات السجل" : log.action}
                      </span>
                      <span className="text-[11px] text-slate-500 font-body">
                        بواسطة: {log.user?.fullName || "المستخدم"}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* العمود الأيسر (5 أعمدة): اللجنة الفرعية + المرفقات */}
        <div className="lg:col-span-5 space-y-6">
          {/* موقف التوجيه والإحالة */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold font-heading text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              <span>موقف التوجيه واللجنة الفرعية</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 font-medium block mb-1">اللجنة المحال إليها:</span>
                {caseRecord.subCommittee ? (
                  <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl">
                    <span className="font-bold text-teal-900 text-sm font-heading block">
                      {caseRecord.subCommittee.name}
                    </span>
                    <span className="text-[11px] text-teal-700 font-mono">
                      كود اللجنة: {caseRecord.subCommittee.code}
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                    <span className="font-bold text-xs font-heading block">
                      بانتظار التوجيه
                    </span>
                    <span className="text-[11px] text-amber-700">
                      منوط بموظف المتابعة والتوجيه بعد اكتمال القيد.
                    </span>
                  </div>
                )}
              </div>

              {/* التخصصات */}
              {caseRecord.specialties.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-slate-500 font-medium block">التخصصات الطبية المعنية:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {caseRecord.specialties.map((s) => (
                      <Badge key={s.id} variant="teal" size="sm">
                        {s.specialty.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* موعد الجلسة إن وجد */}
              {caseRecord.meetingDate && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <span className="text-slate-500 font-medium block">موعد انعقاد الجلسة:</span>
                  <span className="font-bold text-slate-900 font-mono text-sm block">
                    {formatDate(caseRecord.meetingDate)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* المرفقات والوثائق المسلمة */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold font-heading text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-teal-600" />
                <span>المرفقات والوثائق المسلمة</span>
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-mono font-bold">
                {caseRecord.attachments.length} ملف
              </span>
            </div>

            {caseRecord.attachments.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl space-y-1">
                <Paperclip className="w-5 h-5 mx-auto text-slate-300" />
                <p>لا توجد ملفات مرفقة بهذا السجل حتى الآن</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {caseRecord.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-3 hover:bg-slate-100/70 transition-colors"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <span className="font-bold text-slate-800 truncate block font-heading">
                        {att.fileName}
                      </span>
                      <div className="text-[10px] text-slate-500 flex items-center gap-2 font-mono">
                        <span>{att.fileSize ? `${Math.round(att.fileSize / 1024)} KB` : "ملف"}</span>
                        <span>•</span>
                        <span>{formatDate(att.uploadedAt)}</span>
                        {att.uploadedBy?.fullName && (
                          <>
                            <span>•</span>
                            <span>{att.uploadedBy.fullName}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <a
                      href={`/api/cases/${caseRecord.id}/attachments/${att.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white border border-slate-200 text-teal-700 hover:bg-teal-50 transition-colors shrink-0"
                      title="تحميل أو معاينة المرفق بأمان"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </div>
                ))}
              </div>
            )}

            {/* رفع مرفق جديد إن لزم الأمر */}
            <div className="pt-3 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 block mb-2 font-heading">
                إضافة مرفقات أو وثائق جديدة للملف:
              </span>
              <AttachmentUploader caseId={caseRecord.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
