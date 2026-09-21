import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const partySchema = z.object({
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().optional().nullable(),
  nationalId: z.string().optional().nullable(),
  medicalProfession: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const createCaseSchema = z.object({
  registrationType: z.enum(["COMPLAINT", "CASE", "REPORT"]),
  caseNumber: z.string().min(1, "رقم السجل مطلوب"),
  caseYear: z.number().int().gte(1990).lte(2100, "سنة السجل غير صالحة"),
  prosecutionCaseNumber: z.string().optional().nullable(),
  incomingDate: z.string().optional().nullable(),
  attachmentsCount: z.number().int().min(0).default(0),
  hospitalName: z.string().optional().nullable(),
  respondentName: z.string().optional().nullable(),
  respondentPhone: z.string().optional().nullable(),
  prosecution: z.string().optional().nullable(),
  prosecutionId: z.string().optional().nullable(),
  partialProsecution: z.string().optional().nullable(),
  partialProsecutionId: z.string().optional().nullable(),
  governorate: z.string().optional().nullable(),
  complainantName: z.string().optional().nullable(),
  complainantPhone: z.string().optional().nullable(),
  complainants: z.array(partySchema).optional(),
  respondents: z.array(partySchema).optional(),
  description: z.string().min(1, "ملخص الواقعة / موضوع الشكوى مطلوب"),
  specialtyIds: z.array(z.string()).optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const currentUserId = (session.user as any).id;
  const subCommitteeId = (session.user as any).subCommitteeId;

  let where: any = {};
  if (role === "REGISTRATION_CLERK") {
    where = { createdById: currentUserId };
  } else if (role === "SUBCOMMITTEE_MEMBER") {
    if (!subCommitteeId) return NextResponse.json({ error: "المستخدم غير مرتبط بلجنة فرعية" }, { status: 403 });
    where = { subCommitteeId };
  } else if (!can(role, "VIEW_ALL_CASES")) {
    return NextResponse.json({ error: "غير مصرح بالاطلاع على قائمة القضايا" }, { status: 403 });
  }

  const cases = await prisma.case.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      subCommittee: true,
      prosecutionRel: true,
      specialties: { include: { specialty: true } },
      reviewers: {
        include: {
          user: { select: { id: true, fullName: true, employer: true, role: true } },
        },
      },
      followUpOfficer: { select: { id: true, fullName: true } },
    },
  });
  return NextResponse.json(cases);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !can((session.user as any).role, "CREATE_CASE")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const parsed = createCaseSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  if ((data.registrationType === "CASE" || data.registrationType === "REPORT") && !data.prosecutionCaseNumber?.trim()) {
    return NextResponse.json({
      error: data.registrationType === "CASE"
        ? "رقم القضية حقل إلزامي عند اختيار نوع القيد (قضية)"
        : "رقم محضر النيابة حقل إلزامي عند اختيار نوع القيد (محضر نيابة عامة)",
    }, { status: 400 });
  }

  let prosecutionName = data.prosecution?.trim() || null;
  if (data.prosecutionId && !prosecutionName) {
    const p = await prisma.prosecution.findUnique({ where: { id: data.prosecutionId } });
    if (!p || !p.active) return NextResponse.json({ error: "النيابة/الجهة المحددة غير صالحة أو غير نشطة" }, { status: 400 });
    prosecutionName = p.name;
  }

  let partialProsecutionName = data.partialProsecution?.trim() || null;
  if (data.partialProsecutionId && !partialProsecutionName) {
    const pp = await prisma.prosecution.findUnique({ where: { id: data.partialProsecutionId } });
    if (pp) partialProsecutionName = pp.name;
  }

  const primaryComplainant = data.complainants?.[0]?.name || data.complainantName || "";
  if (!primaryComplainant.trim()) {
    return NextResponse.json({ error: "اسم الشاكي حقل إلزامي (شاكي واحد على الأقل)" }, { status: 400 });
  }
  const primaryComplainantPhone = data.complainants?.[0]?.phone || data.complainantPhone || null;

  const primaryRespondent = data.respondents?.[0]?.name || data.respondentName || null;
  const primaryRespondentPhone = data.respondents?.[0]?.phone || data.respondentPhone || null;

  const existingCase = await prisma.case.findFirst({
    where: {
      registrationType: data.registrationType,
      caseNumber: data.caseNumber.trim(),
      caseYear: data.caseYear,
      ...(data.prosecutionId ? { prosecutionId: data.prosecutionId } : {}),
    },
  });
  if (existingCase) {
    return NextResponse.json({
      error: `يوجد سجل مسجل مسبقاً بنفس رقم السجل (${data.caseNumber}) لسنة (${data.caseYear}) لذات النيابة/الجهة. يرجى مراجعة السجلات لتفادي التكرار.`,
    }, { status: 409 });
  }

  const created = await prisma.case.create({
    data: {
      registrationType: data.registrationType,
      caseNumber: data.caseNumber.trim(),
      caseYear: data.caseYear,
      prosecutionCaseNumber: data.prosecutionCaseNumber?.trim() || null,
      incomingDate: data.incomingDate ? new Date(data.incomingDate) : new Date(),
      attachmentsCount: data.attachmentsCount || 0,
      hospitalName: data.hospitalName?.trim() || null,
      respondentName: primaryRespondent ? primaryRespondent.trim() : null,
      respondentPhone: primaryRespondentPhone ? primaryRespondentPhone.trim() : null,
      prosecution: prosecutionName,
      prosecutionId: data.prosecutionId || null,
      partialProsecution: partialProsecutionName,
      partialProsecutionId: data.partialProsecutionId || null,
      governorate: data.governorate?.trim() || null,
      complainantName: primaryComplainant.trim(),
      complainantPhone: primaryComplainantPhone ? primaryComplainantPhone.trim() : null,
      complainants: data.complainants && data.complainants.length > 0
        ? (data.complainants as any)
        : [{ name: primaryComplainant.trim(), phone: primaryComplainantPhone?.trim() || null }],
      respondents: data.respondents && data.respondents.length > 0
        ? (data.respondents as any)
        : primaryRespondent ? [{ name: primaryRespondent.trim(), phone: primaryRespondentPhone?.trim() || null }] : [],
      description: data.description.trim(),
      createdById: (session.user as any).id,
      specialties: data.specialtyIds?.length
        ? { create: data.specialtyIds.map((specialtyId) => ({ specialtyId })) }
        : undefined,
    },
    include: {
      prosecutionRel: true,
      partialProsecutionRel: true,
      specialties: { include: { specialty: true } },
    },
  });

  await writeAuditLog({
    entityType: "Case",
    entityId: created.id,
    action: "CREATE",
    userId: (session.user as any).id,
    afterData: created,
  });

  return NextResponse.json(created, { status: 201 });
}
