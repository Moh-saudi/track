import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import EditCaseClient from "./edit-case-client";

export const revalidate = 0;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCasePage({ params }: Props) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as any).role;
  const userId = (session.user as any).id;

  const caseRecord = await prisma.case.findUnique({
    where: { id },
    include: {
      prosecutionRel: true,
      partialProsecutionRel: true,
    },
  });

  if (!caseRecord) {
    notFound();
  }

  // التحقق من الصلاحيات: موظف التسجيل الذي أنشأ القيد أو المسؤول العام
  const isCreator = caseRecord.createdById === userId;
  const isAdmin = role === "ADMIN";

  if (!isAdmin && (!isCreator || role !== "REGISTRATION_CLERK")) {
    redirect("/dashboard/registration");
  }

  // موظف التسجيل مقيد بالتعديل فقط قبل توجيه السجل للجان
  if (role === "REGISTRATION_CLERK" && caseRecord.status !== "REGISTERED") {
    redirect(`/dashboard/registration/${id}`);
  }

  // تجهيز البيانات لتمريرها للمكون العميل بأمان
  const serializedCase = {
    id: caseRecord.id,
    registrationType: caseRecord.registrationType,
    caseNumber: caseRecord.caseNumber,
    caseYear: caseRecord.caseYear,
    prosecutionCaseNumber: caseRecord.prosecutionCaseNumber || "",
    incomingDate: caseRecord.incomingDate ? caseRecord.incomingDate.toISOString().split("T")[0] : "",
    attachmentsCount: caseRecord.attachmentsCount || 0,
    governorate: caseRecord.governorate || "",
    prosecution: caseRecord.prosecution || "",
    prosecutionId: caseRecord.prosecutionId || "",
    partialProsecution: caseRecord.partialProsecution || "",
    partialProsecutionId: caseRecord.partialProsecutionId || "",
    description: caseRecord.description || "",
    complainantName: caseRecord.complainantName || "",
    complainantPhone: caseRecord.complainantPhone || "",
    respondentName: caseRecord.respondentName || "",
    respondentPhone: caseRecord.respondentPhone || "",
    complainants: Array.isArray(caseRecord.complainants) ? (caseRecord.complainants as any[]) : [],
    respondents: Array.isArray(caseRecord.respondents) ? (caseRecord.respondents as any[]) : [],
    status: caseRecord.status,
  };

  return <EditCaseClient initialCase={serializedCase} />;
}
