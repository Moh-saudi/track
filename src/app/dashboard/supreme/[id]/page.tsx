import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DecisionForm } from "./decision-form";
import { AttachmentUploader } from "@/app/dashboard/_components/attachment-uploader";
import { formatDate } from "@/lib/formatters";
import { Download } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  PENDING_SUPREME_REVIEW:"بانتظار القرار",
  APPROVED:              "معتمدة",
  REFERRED_FOR_REVIEW:   "محالة",
};

const DECISION_LABELS: Record<string, string> = {
  APPROVE:    "اعتماد قرار اللجنة الفرعية",
  REFER_BACK: "إحالة لإعادة الدراسة",
  DIFFERENT:  "قرار مغاير",
};

export default async function SupremeCaseDetail({ params }: { params: { id: string } }) {
  const [caseRecord, subCommittees] = await Promise.all([
    prisma.case.findUnique({
      where: { id: params.id },
      include: {
        subCommittee:     true,
        actions:          { orderBy: { createdAt: "desc" }, include: { recordedBy: { select: { fullName: true } } } },
        attachments:      { orderBy: { uploadedAt: "desc" } },
        supremeDecisions: { orderBy: { createdAt: "desc" }, include: { decidedBy: { select: { fullName: true } } } },
      },
    }),
    prisma.subCommittee.findMany({ where: { active: true }, orderBy: { code: "asc" } }),
  ]);

  if (!caseRecord) notFound();

  const latestAction   = caseRecord.actions[0];
  const canIssueDecision = caseRecord.status === "PENDING_SUPREME_REVIEW";

  return (
    <div>
      {/* رأس */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {caseRecord.caseNumber}
            {caseRecord.reportYear ? ` لسنة ${caseRecord.reportYear}` : ""}
          </h1>
          <p className="page-subtitle">{caseRecord.subCommittee?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge text-sm px-3 py-1 ${
            caseRecord.status === "PENDING_SUPREME_REVIEW" ? "badge-pending" :
            caseRecord.status === "APPROVED"               ? "badge-approved" : "badge-referred"
          }`}>
            {STATUS_LABELS[caseRecord.status] ?? caseRecord.status}
          </span>
          <a href="/dashboard/supreme" className="btn-secondary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            رجوع
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* المحتوى الرئيسي */}
        <div className="lg:col-span-2 space-y-6">

          {/* وصف القضية */}
          <div className="card">
            <h2 className="section-title">وصف القضية</h2>
            <p className="text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-4 text-sm">
              {caseRecord.description}
            </p>
          </div>

          {/* تقرير اللجنة الفرعية */}
          {latestAction && (
            <div className="card border-r-4 border-r-blue-400">
              <h2 className="section-title">تقرير اللجنة الفرعية</h2>
              <dl className="space-y-3 text-sm">
                {latestAction.faultDescription && (
                  <div className="bg-red-50 rounded-lg p-3">
                    <dt className="text-xs font-semibold text-red-700 mb-1">توصيف الخطأ الطبي</dt>
                    <dd className="text-red-900">{latestAction.faultDescription}</dd>
                  </div>
                )}
                {latestAction.reportText && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <dt className="text-xs font-semibold text-gray-600 mb-1">نص التقرير</dt>
                    <dd className="text-gray-800 leading-relaxed">{latestAction.reportText}</dd>
                  </div>
                )}
                {latestAction.actionTaken && (
                  <div className="bg-blue-50 rounded-lg p-3">
                    <dt className="text-xs font-semibold text-blue-700 mb-1">الإجراء المتخذ / التوصية</dt>
                    <dd className="text-blue-900">{latestAction.actionTaken}</dd>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
                  <span>بواسطة: {latestAction.recordedBy.fullName}</span>
                  <span>{latestAction.meetingDate
                    ? `انعقاد: ${formatDate(latestAction.meetingDate)}`
                    : ""
                  }</span>
                </div>
              </dl>
            </div>
          )}

          {/* سجل قرارات اللجنة العليا */}
          {caseRecord.supremeDecisions.length > 0 && (
            <div className="card">
              <h2 className="section-title">قرارات اللجنة العليا السابقة</h2>
              <div className="space-y-3">
                {caseRecord.supremeDecisions.map(d => (
                  <div key={d.id} className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`badge ${
                        d.decisionType === "APPROVE"    ? "bg-emerald-100 text-emerald-700" :
                        d.decisionType === "REFER_BACK" ? "bg-orange-100 text-orange-700" :
                        "bg-purple-100 text-purple-700"
                      }`}>
                        {DECISION_LABELS[d.decisionType]}
                      </span>
                      <span className="text-xs font-mono text-gray-500">
                        {formatDate(d.meetingDate)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{d.decisionDetails}</p>
                    <p className="text-xs text-gray-400 mt-2">بواسطة: {d.decidedBy.fullName}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* نموذج القرار */}
          {canIssueDecision ? (
            <div className="card">
              <h2 className="section-title">إصدار القرار النهائي</h2>
              <DecisionForm caseId={caseRecord.id} subCommittees={subCommittees} />
            </div>
          ) : (
            <div className="alert-info">
              <strong>ملاحظة:</strong> لا يمكن إصدار قرار جديد — حالة القضية:{" "}
              <strong>{STATUS_LABELS[caseRecord.status] ?? caseRecord.status}</strong>
            </div>
          )}
        </div>

        {/* المرفقات */}
        <div>
          <div className="card sticky top-24">
            <h2 className="section-title">المرفقات ({caseRecord.attachments.length})</h2>
            {caseRecord.attachments.length === 0 ? (
              <div className="empty-state py-6">
                <p className="text-xs">لا توجد مرفقات</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {caseRecord.attachments.map(a => (
                  <li key={a.id} className="flex items-center justify-between gap-2 text-xs p-2 rounded-lg bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <svg className="w-4 h-4 text-teal-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <span className="truncate text-gray-700 font-medium">{a.fileName}</span>
                    </div>
                    <a
                      href={`/api/cases/${caseRecord.id}/attachments/${a.id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded bg-white border border-gray-200 text-teal-700 hover:bg-teal-50 transition-colors shrink-0"
                      title="تحميل المرفق بأمان"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <AttachmentUploader caseId={caseRecord.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
