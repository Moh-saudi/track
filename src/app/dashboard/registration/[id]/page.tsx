import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CaseDetailsClient } from "./case-details-client";

export const revalidate = 0;

interface Props {
  params: Promise<{ id: string }>;
}

function safeIsoDate(d: any): string | null {
  if (!d) return null;
  const date = new Date(d);
  return isNaN(date.getTime()) ? null : date.toISOString();
}

export default async function RegistrationCaseDetailsPage({ params }: Props) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      redirect("/login");
    }

    const currentRole = (session.user as any)?.role || "";
    const currentUserId = (session.user as any)?.id || "";

    // استعلامات فرعية خفيفة وموازية لا ترهق ذاكرة WASM ولا تسبب Error 1102
    const [caseRecord, specialties, attachments, auditLogs] = await Promise.all([
      prisma.case.findUnique({
        where: { id: id },
        select: {
          id: true,
          caseNumber: true,
          caseYear: true,
          prosecutionCaseNumber: true,
          registrationType: true,
          complainantName: true,
          respondentName: true,
          entityType: true,
          entityName: true,
          hospitalName: true,
          governorate: true,
          prosecution: true,
          prosecutionId: true,
          partialProsecution: true,
          partialProsecutionId: true,
          description: true,
          incomingDate: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          createdById: true,
          subCommitteeId: true,
          meetingDate: true,
          subCommittee: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, fullName: true, email: true, role: true } },
        },
      }),
      prisma.caseSpecialty.findMany({
        where: { caseId: id },
        select: {
          id: true,
          specialty: { select: { id: true, name: true } },
        },
      }),
      prisma.attachment.findMany({
        where: { caseId: id },
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          uploadedAt: true,
          uploadedBy: { select: { fullName: true } },
        },
        orderBy: { uploadedAt: "desc" },
        take: 20,
      }),
      prisma.auditLog.findMany({
        where: { entityType: "Case", entityId: id },
        select: {
          id: true,
          action: true,
          createdAt: true,
          user: { select: { fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
    ]);

    if (!caseRecord) {
      return (
        <CaseDetailsClient
          caseRecord={null}
          caseAuditLogs={[]}
          currentRole={currentRole}
          currentUserId={currentUserId}
        />
      );
    }

    // تسطيح ومعايرة التواريخ لمنع مشاكل Hydration
    const serializedRecord = {
      ...caseRecord,
      createdAt: safeIsoDate(caseRecord.createdAt),
      updatedAt: safeIsoDate(caseRecord.updatedAt),
      incomingDate: safeIsoDate(caseRecord.incomingDate),
      meetingDate: safeIsoDate(caseRecord.meetingDate),
      specialties: specialties || [],
      attachments: (attachments || []).map((att) => ({
        ...att,
        uploadedAt: safeIsoDate(att.uploadedAt),
      })),
    };

    const serializedAuditLogs = (auditLogs || []).map((log) => ({
      ...log,
      createdAt: safeIsoDate(log.createdAt),
    }));

    return (
      <CaseDetailsClient
        caseRecord={serializedRecord}
        caseAuditLogs={serializedAuditLogs}
        currentRole={currentRole}
        currentUserId={currentUserId}
      />
    );
  } catch (err: any) {
    if (err?.digest?.startsWith("NEXT_REDIRECT") || err?.digest?.startsWith("NEXT_NOT_FOUND")) {
      throw err;
    }
    console.error("[REGISTRATION_CASE_DETAILS_ERROR]:", err);
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 m-6 font-body" dir="rtl">
        <h2 className="text-base font-bold font-heading mb-2">تعذر تحميل بيانات السجل</h2>
        <p className="text-xs text-rose-700 font-mono mb-4">{err?.message}</p>
        <Link
          href="/dashboard/registration"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold font-heading transition-colors"
        >
          <span>العودة لقائمة السجلات</span>
        </Link>
      </div>
    );
  }
}
