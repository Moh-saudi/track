import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SubCommitteeReportForm } from "../report-form";
import { formatDate } from "@/lib/formatters";
import {
  FileText,
  Calendar,
  Lock,
  ArrowRight,
  Users,
  ShieldAlert,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Stethoscope,
  Printer,
  Scale
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { PageHeader } from "@/components/ui/PageHeader";

export default async function SubCommitteeReportPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const caseRecord = await prisma.case.findUnique({
    where: { id: params.id },
    include: {
      subCommittee: true,
      specialties: { include: { specialty: true } },
      actions: { orderBy: { createdAt: "desc" }, include: { recordedBy: { select: { fullName: true } } } },
    },
  });

  if (!caseRecord) notFound();

  // التحقق من صلاحية اللجنة
  if (caseRecord.subCommitteeId !== (session.user as any).subCommitteeId && (session.user as any).role !== "ADMIN") {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-rose-200 text-rose-800 font-body">
        <ShieldAlert className="w-10 h-10 mx-auto mb-2 text-rose-600" />
        <h2 className="text-base font-bold font-heading">غير مصرح بالوصول</h2>
        <p className="text-xs mt-1 text-rose-700">هذا السجل ليس موجهاً إلى لجنتك الفرعية.</p>
        <Link href="/dashboard/subcommittee" className="btn-secondary text-xs mt-4 inline-flex">
          العودة لقائمة اللجان
        </Link>
      </div>
    );
  }

  const reviewersCount = await prisma.caseReviewer.count({
    where: { caseId: params.id, status: { not: "RECUSED" } },
  });

  const hasMeetingDate = !!caseRecord.meetingDate;
  // لا يمكن فتح السجل للتعديل إلا إذا كان قيد الدراسة أو محالاً لإعادة الدراسة من اللجنة العليا
  const canEdit = caseRecord.status === "UNDER_SUBCOMMITTEE_REVIEW" || caseRecord.status === "REFERRED_FOR_REVIEW";
  const latestReport = caseRecord.actions.length > 0 ? caseRecord.actions[0] : null;

  return (
    <div className="space-y-6 font-body">
      {/* ─── رأس الصفحة الموحد ─── */}
      <PageHeader
        breadcrumbs={[
          { label: "الرئيسية", href: "/dashboard" },
          { label: "اللجنة الفرعية", href: "/dashboard/subcommittee" },
          { label: `السجل ${caseRecord.caseNumber} / ${caseRecord.caseYear}`, href: `/dashboard/subcommittee/${caseRecord.id}` },
          { label: canEdit ? "المرحلة الثانية: التقرير الطبي" : "عرض التقرير المعتمد (للاطلاع فقط)" },
        ]}
        title={
          canEdit
            ? `المرحلة الثانية: مداولة الجلسة وإعداد التقرير الطبي — سجل ${caseRecord.caseNumber} / ${caseRecord.caseYear}`
            : `التقرير الطبي الفني المعتمد (للاطلاع فقط) — سجل ${caseRecord.caseNumber} / ${caseRecord.caseYear}`
        }
        description={
          canEdit
            ? "توثيق نتائج مناقشة أعضاء فريق الفحص، توصيف الخطأ المهني، وتحديد التوصيات المرفوعة لرئاسة اللجنة العليا."
            : "وثيقة التقرير الطبي الصادر والمعتمد رسمياً من اللجنة الفرعية والمحال لرئاسة اللجنة العليا للمسؤولية الطبية."
        }
        actions={
          <div className="flex items-center gap-3">
            {!canEdit && (
              <span className="px-3 py-1 rounded-full bg-slate-200 text-slate-800 text-xs font-bold font-heading border border-slate-300">
                وضع القراءة والاطلاع فقط
              </span>
            )}
            <Link
              href={`/dashboard/subcommittee/${caseRecord.id}`}
              className="btn-secondary text-xs"
            >
              <ArrowRight className="w-4 h-4" />
              <span>الرجوع للمرحلة الأولى (بيانات الجلسة وتشكيل الفريق)</span>
            </Link>
          </div>
        }
      />

      {/* تنبيه إذا لم تكتمل المرحلة الأولى */}
      {!hasMeetingDate ? (
        <div className="p-8 rounded-2xl bg-amber-50 border border-amber-300 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-amber-950 font-heading">
              المرحلة الثانية مغلقة: يتطلب إتمام المرحلة الأولى أولاً
            </h3>
            <p className="text-xs text-amber-900 max-w-lg mx-auto leading-relaxed">
              وفقاً لدورة العمل المعتمدة بالمنظومة، يجب أولاً تحديد واعتماد موعد انعقاد الجلسة في المرحلة الأولى ليظهر لدى حسابات التوجيه والمتابعة قبل فتح نموذج التقرير الطبي.
            </p>
          </div>
          <div>
            <Link
              href={`/dashboard/subcommittee/${caseRecord.id}`}
              className="btn-primary text-xs inline-flex items-center gap-2"
            >
              <span>الانتقال للمرحلة الأولى لجدولة موعد الجلسة</span>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* تنبيه القفل الرسمي في حال اعتماد السجل */}
          {!canEdit ? (
            <div className="p-4 rounded-2xl bg-slate-100 border border-slate-300 text-slate-800 text-xs flex items-center justify-between font-body shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <strong className="font-bold font-heading text-slate-900 block text-xs">
                    السجل مغلق وغير متاح للتعديل نهائياً:
                  </strong>
                  <span className="text-slate-600">
                    تم اعتماد التقرير الطبي ورفعه للجنة العليا للمسؤولية الطبية. لا يمكن إعادة فتح السجل أو تعديل أي بيانات به إلا في حال صدور قرار إحالة لإعادة الدراسة من اللجنة العليا.
                  </span>
                </div>
              </div>
              <Badge variant="pending" size="sm">معتمد رسمياً</Badge>
            </div>
          ) : caseRecord.status === "REFERRED_FOR_REVIEW" ? (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-center justify-between font-body shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <strong className="font-bold font-heading text-amber-950 block text-xs">
                    أُعيد السجل من اللجنة العليا لإعادة الدراسة:
                  </strong>
                  <span className="text-amber-900">
                    تم فتح النموذج للتحرير استناداً لقرار الإحالة لإعادة الفحص وإعداد التقرير التكميلي أو المعدل.
                  </span>
                </div>
              </div>
              <Badge variant="referred" size="sm">متاح للتحرير</Badge>
            </div>
          ) : null}

          {/* بطاقة ملخص معطيات الجلسة المعتمدة من المرحلة الأولى */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center border border-teal-200">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-heading text-slate-900">
                    بيانات جلسة الفحص المعتمدة
                  </h3>
                  <p className="text-xs text-slate-500">
                    اللجنة الفرعية: {caseRecord.subCommittee?.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="teal" size="md">
                  جلسة منعقدة / مجدولة
                </Badge>
                {caseRecord.status === "PENDING_SUPREME_REVIEW" && (
                  <Badge variant="pending" size="md">
                    تم الرفع للجنة العليا
                  </Badge>
                )}
                {caseRecord.status === "APPROVED" && (
                  <Badge variant="approved" size="md">
                    معتمد بقرار نهائي
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block font-medium">موعد انعقاد الجلسة:</span>
                <span className="text-sm font-bold text-teal-800 font-mono flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  <span>{formatDate(caseRecord.meetingDate!)}</span>
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block font-medium">المشكو في حقه:</span>
                <span className="font-bold text-slate-900 truncate block">
                  {caseRecord.respondentName || caseRecord.hospitalName || "غير محدد"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block font-medium">الشاكي / المريض:</span>
                <span className="font-bold text-slate-900 truncate block">
                  {caseRecord.complainantName || "—"}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-500 block font-medium">فريق الفحص المعتمد:</span>
                <span className="font-bold text-slate-900 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-slate-600" />
                  <span>{reviewersCount} أعضاء واستشاريين</span>
                </span>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════════ */}
          {/* الحالة ١: السجل متاح للتحرير (قيد الدراسة أو محال لإعادة الدراسة)        */}
          {/* ══════════════════════════════════════════════════════════════════════ */}
          {canEdit ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold font-heading text-slate-900">
                  تحرير التقرير الطبي وتوصيف المسؤولية المهنية
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  استخدم أداة التقييم التفاعلي الذكي لتوليد الحيثيات وصياغة التوصيات الرسمية.
                </p>
              </div>

              <SubCommitteeReportForm
                caseId={caseRecord.id}
                meetingDate={caseRecord.meetingDate}
                respondentName={caseRecord.respondentName || caseRecord.hospitalName}
                hospitalName={caseRecord.respondentName || caseRecord.hospitalName}
                complainantName={caseRecord.complainantName}
              />
            </div>
          ) : (
            /* ══════════════════════════════════════════════════════════════════════ */
            /* الحالة ٢: السجل معتمد ومغلق — عرض وثيقة التقرير المعتمد فقط (Read-Only) */
            /* ══════════════════════════════════════════════════════════════════════ */
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden font-body">
              {/* ترويسة التقرير الرسمية */}
              <div className="p-6 bg-gradient-to-l from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-teal-400" />
                    <h3 className="text-base font-bold font-heading">
                      وثيقة التقرير الطبي المعتمد للجنة الفرعية
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300">
                    صادر بخصوص السجل رقم: {caseRecord.caseNumber} / {caseRecord.caseYear} — وضع القراءة والاطلاع فقط
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>مرفوع رسمياً للجنة العليا</span>
                  </span>
                </div>
              </div>

              {latestReport ? (
                <div className="p-6 space-y-6">
                  {/* معلومات التوثيق */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 text-xs text-slate-600">
                    <div className="flex items-center gap-4">
                      <span><strong>مُعد التقرير ومقرر اللجنة: </strong>{latestReport.recordedBy.fullName}</span>
                      <span><strong>تاريخ الاعتماد والرفع: </strong><span className="font-mono">{formatDate(latestReport.createdAt)}</span></span>
                    </div>
                    {latestReport.reportDate && (
                      <span className="font-mono text-teal-800 font-bold">
                        تاريخ صدور التقرير: {formatDate(latestReport.reportDate)}
                      </span>
                    )}
                  </div>

                  {/* توصيف الخطأ الطبي وحيثياته */}
                  {latestReport.faultDescription && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold font-heading text-slate-900 flex items-center gap-1.5">
                        <Stethoscope className="w-4 h-4 text-teal-600" />
                        <span>توصيف الخطأ الطبي وحيثياته الفنية:</span>
                      </h4>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                        {latestReport.faultDescription}
                      </div>
                    </div>
                  )}

                  {/* النص الكامل لتقرير اللجنة */}
                  {latestReport.reportText && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold font-heading text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-teal-600" />
                        <span>النص الكامل لتقرير اللجنة الفرعية ومداولة الجلسة:</span>
                      </h4>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">
                        {latestReport.reportText}
                      </div>
                    </div>
                  )}

                  {/* التوصية والإجراء المتخذ */}
                  {latestReport.actionTaken && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold font-heading text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-teal-600" />
                        <span>التوصية الختامية والإجراء المرفوع للجنة العليا:</span>
                      </h4>
                      <div className="p-4 rounded-xl bg-teal-50/70 border border-teal-200 text-xs text-teal-950 leading-relaxed font-medium whitespace-pre-wrap">
                        {latestReport.actionTaken}
                      </div>
                    </div>
                  )}

                  {/* تذييل توضيحي */}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                      <span>وثيقة رقمية مسجلة ومحمية ضد التعديل بالمنظومة الإلكترونية</span>
                    </span>
                    <Link
                      href={`/dashboard/subcommittee/${caseRecord.id}`}
                      className="btn-secondary text-xs"
                    >
                      الرجوع لبيانات القضية
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs space-y-2">
                  <p>تم إحالة السجل للجنة العليا دون تدوين تقرير نصي سابق.</p>
                  <Link
                    href={`/dashboard/subcommittee/${caseRecord.id}`}
                    className="btn-secondary text-xs inline-flex"
                  >
                    الرجوع لصفحة السجل
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* سجل كافة المداولات والتقارير المحفوظة إن وجدت */}
          {caseRecord.actions.length > 1 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-3">
              <h3 className="text-sm font-bold font-heading text-slate-900">
                سجل المداولات والتقارير الفنية السابقة ({caseRecord.actions.length})
              </h3>
              <div className="space-y-3">
                {caseRecord.actions.slice(1).map((act) => (
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
      )}
    </div>
  );
}
