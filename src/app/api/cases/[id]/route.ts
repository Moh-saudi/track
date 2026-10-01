import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { isValidEgyptianPhone } from "@/lib/formatters";

const partyItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().trim().refine((val) => !val || isValidEgyptianPhone(val), {
    message: "رقم الهاتف يجب أن يتكون من 11 رقماً مصرياً يبدأ بـ 01 (مثال: 01012345678)",
  }).optional().nullable(),
  nationalId: z.string().optional().nullable(),
  medicalProfession: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  isSummoned: z.boolean().optional(),
  summonedAt: z.string().optional().nullable(),
});

const patchCaseSchema = z.object({
  // Party and session attendees updates
  complainants: z.array(partyItemSchema).optional(),
  respondents: z.array(partyItemSchema).optional(),
  sessionAttendees: z.array(partyItemSchema).optional(),

  // Case registration updates
  registrationType: z.enum(["COMPLAINT", "CASE", "REPORT"]).optional(),
  caseNumber: z.string().min(1, "رقم السجل مطلوب").optional(),
  caseYear: z.number().int().gte(1990).lte(2100, "سنة السجل غير صالحة").optional(),
  prosecutionCaseNumber: z.string().optional().nullable(),
  incomingDate: z.string().optional().nullable(),
  attachmentsCount: z.number().int().min(0).optional(),
  hospitalName: z.string().optional().nullable(),
  prosecution: z.string().optional().nullable(),
  prosecutionId: z.string().optional().nullable(),
  partialProsecution: z.string().optional().nullable(),
  partialProsecutionId: z.string().optional().nullable(),
  governorate: z.string().optional().nullable(),
  description: z.string().min(1, "ملخص الواقعة مطلوب").optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const subCommitteeId = (session.user as any).subCommitteeId;

  const item = await prisma.case.findUnique({
    where: { id: id },
    include: {
      subCommittee: true,
      prosecutionRel: true,
      partialProsecutionRel: true,
      specialties: { include: { specialty: true } },
      reviewers: {
        include: {
          doctor: {
            select: { id: true, name: true, title: true, employer: true, phone: true, specialty: true },
          },
          user: {
            select: { id: true, fullName: true, employer: true, role: true, email: true },
          },
        },
      },
      followUpOfficer: { select: { id: true, fullName: true } },
      actions: {
        include: { recordedBy: { select: { id: true, fullName: true, role: true } } },
        orderBy: { createdAt: "desc" },
      },
      supremeDecisions: {
        include: { decidedBy: { select: { id: true, fullName: true, role: true } } },
        orderBy: { createdAt: "desc" },
      },
      attachments: {
        select: {
          id: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          uploadedAt: true,
          uploadedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!item) return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });

  const permitted =
    (role === "REGISTRATION_CLERK" && item.createdById === userId) ||
    (role === "SUBCOMMITTEE_MEMBER" && !!subCommitteeId && item.subCommitteeId === subCommitteeId) ||
    can(role, "VIEW_ALL_CASES");

  if (!permitted) return NextResponse.json({ error: "غير مصرح بالاطلاع على هذا السجل" }, { status: 403 });

  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const subCommitteeId = (session.user as any).subCommitteeId;

  const currentCase = await prisma.case.findUnique({
    where: { id },
  });

  if (!currentCase) return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });

  const isCreator = currentCase.createdById === userId;
  const isAdmin = role === "ADMIN";
  const isSubcommittee = role === "SUBCOMMITTEE_MEMBER" && !!subCommitteeId && currentCase.subCommitteeId === subCommitteeId;
  const isRouteCase = can(role, "ROUTE_CASE");

  const permitted = (isCreator && role === "REGISTRATION_CLERK") || isAdmin || isSubcommittee || isRouteCase;

  if (!permitted) {
    return NextResponse.json({ error: "غير مصرح بتعديل هذا السجل" }, { status: 403 });
  }

  // موظف التسجيل يمكنه تعديل قيده فقط طالما السجل ما زال في حالة القيد الأصلية (REGISTERED)
  if (role === "REGISTRATION_CLERK" && currentCase.status !== "REGISTERED") {
    return NextResponse.json(
      { error: "لا يمكن تعديل السجل بعد إحالته أو توجيهه للجنة، يرجى مراجعة المشرف" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const parsed = patchCaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const data = parsed.data;

  // التحقق من تكرار رقم السجل والسنة عند تعديلهما
  const newRegType = data.registrationType || currentCase.registrationType;
  const newCaseNumber = data.caseNumber ? data.caseNumber.trim() : currentCase.caseNumber;
  const newCaseYear = data.caseYear || currentCase.caseYear;
  const newProsId = data.prosecutionId !== undefined ? data.prosecutionId : currentCase.prosecutionId;

  if (
    newCaseNumber !== currentCase.caseNumber ||
    newCaseYear !== currentCase.caseYear ||
    newRegType !== currentCase.registrationType ||
    newProsId !== currentCase.prosecutionId
  ) {
    const duplicate = await prisma.case.findFirst({
      where: {
        id: { not: id },
        registrationType: newRegType,
        caseNumber: newCaseNumber,
        caseYear: newCaseYear,
        ...(newProsId ? { prosecutionId: newProsId } : {}),
      },
    });
    if (duplicate) {
      return NextResponse.json({
        error: `يوجد سجل مسجل مسبقاً بنفس رقم السجل (${newCaseNumber}) لسنة (${newCaseYear}) لذات النيابة. يرجى المراجعة لتفادي التكرار.`,
      }, { status: 409 });
    }
  }

  // التحقق من رقم القضية أو المحضر إن كان نوع السجل قضية أو محضر
  const finalRegType = data.registrationType || currentCase.registrationType;
  const finalProsCaseNum = data.prosecutionCaseNumber !== undefined 
    ? data.prosecutionCaseNumber?.trim() 
    : currentCase.prosecutionCaseNumber;

  if ((finalRegType === "CASE" || finalRegType === "REPORT") && !finalProsCaseNum) {
    return NextResponse.json({
      error: finalRegType === "CASE" 
        ? "رقم القضية المرتبط حقل إلزامي عند قيد قضية" 
        : "رقم محضر النيابة المرتبط حقل إلزامي عند قيد محضر نيابة",
    }, { status: 400 });
  }

  const updateData: any = {};

  if (data.registrationType) updateData.registrationType = data.registrationType;
  if (data.caseNumber) updateData.caseNumber = data.caseNumber.trim();
  if (data.caseYear) updateData.caseYear = data.caseYear;
  if (data.prosecutionCaseNumber !== undefined) updateData.prosecutionCaseNumber = data.prosecutionCaseNumber?.trim() || null;
  if (data.incomingDate !== undefined) updateData.incomingDate = data.incomingDate ? new Date(data.incomingDate) : null;
  if (data.attachmentsCount !== undefined) updateData.attachmentsCount = data.attachmentsCount;
  if (data.hospitalName !== undefined) updateData.hospitalName = data.hospitalName?.trim() || null;
  if (data.governorate !== undefined) updateData.governorate = data.governorate?.trim() || null;
  if (data.description) updateData.description = data.description.trim();

  // النيابات
  if (data.prosecution !== undefined) updateData.prosecution = data.prosecution?.trim() || null;
  if (data.prosecutionId !== undefined) updateData.prosecutionId = data.prosecutionId || null;
  if (data.partialProsecution !== undefined) updateData.partialProsecution = data.partialProsecution?.trim() || null;
  if (data.partialProsecutionId !== undefined) updateData.partialProsecutionId = data.partialProsecutionId || null;

  // الأطراف
  if (data.complainants) {
    updateData.complainants = data.complainants;
    if (data.complainants.length > 0) {
      updateData.complainantName = data.complainants[0].name;
      updateData.complainantPhone = data.complainants[0].phone || null;
    }
  }

  if (data.respondents) {
    updateData.respondents = data.respondents;
    if (data.respondents.length > 0) {
      updateData.respondentName = data.respondents[0].name;
      updateData.respondentPhone = data.respondents[0].phone || null;
    } else {
      updateData.respondentName = null;
      updateData.respondentPhone = null;
    }
  }

  if (data.sessionAttendees) {
    updateData.sessionAttendees = data.sessionAttendees;
  }

  const updatedCase = await prisma.case.update({
    where: { id },
    data: updateData,
  });

  const isGeneralUpdate = !!(data.caseNumber || data.prosecution || data.description || data.registrationType);
  await writeAuditLog({
    entityType: "Case",
    entityId: id,
    action: isGeneralUpdate ? "UPDATE" : "UPDATE_PARTIES",
    userId,
    beforeData: currentCase,
    afterData: updatedCase,
  });

  return NextResponse.json(updatedCase);
}
