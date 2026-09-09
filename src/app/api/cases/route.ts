import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const createCaseSchema = z.object({
  registrationType: z.enum(["COMPLAINT", "CASE", "REPORT"]),
  caseNumber: z.string().min(1, "رقم السجل مطلوب"),
  caseYear: z.number().int().gte(1990).lte(2100, "سنة السجل غير صالحة"),
  incomingDate: z.string().optional().nullable(),
  attachmentsCount: z.number().int().min(0).default(0),
  hospitalName: z.string().optional().nullable(),
  respondentName: z.string().optional().nullable(),
  prosecution: z.string().optional().nullable(),
  prosecutionId: z.string().optional().nullable(),
  governorate: z.string().optional().nullable(),
  complainantName: z.string().min(2, "اسم الشاكي / المريض مطلوب وإلزامي"),
  description: z.string().min(1, "ملخص الواقعة / موضوع الشكوى مطلوب"),
  specialtyIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const subCommitteeId = (session.user as any).subCommitteeId;

  let where: any = {};
  if (role === "SUBCOMMITTEE_MEMBER") {
    // يرى القضايا الموجهة للجنته الفرعية
    where = { subCommitteeId };
  }

  const cases = await prisma.case.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      subCommittee: true,
      prosecutionRel: true,
      specialties: {
        include: { specialty: true },
      },
      reviewers: {
        include: {
          user: {
            select: { id: true, fullName: true, employer: true, role: true },
          },
        },
      },
      followUpOfficer: {
        select: { id: true, fullName: true },
      },
    },
  });
  return NextResponse.json(cases);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !can((session.user as any).role, "CREATE_CASE")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createCaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // في حال اختيار prosecutionId ولم يحدد نص prosecution، نجلبه تلقائياً
  let prosecutionName = data.prosecution || null;
  if (data.prosecutionId && !prosecutionName) {
    const p = await prisma.prosecution.findUnique({ where: { id: data.prosecutionId } });
    if (p) prosecutionName = p.name;
  }

  // التحقق من عدم تكرار قيد نفس السجل مسبقاً بنفس الرقم والسنة والنيابة ونوع القيد
  const existingCase = await prisma.case.findFirst({
    where: {
      registrationType: data.registrationType,
      caseNumber: data.caseNumber.trim(),
      caseYear: data.caseYear,
      ...(data.prosecutionId ? { prosecutionId: data.prosecutionId } : {}),
    },
  });

  if (existingCase) {
    return NextResponse.json(
      {
        error: `يوجد سجل مسجل مسبقاً بنفس رقم السجل (${data.caseNumber}) لسنة (${data.caseYear}) لذات النيابة/الجهة. يرجى مراجعة السجلات لتفادي التكرار.`,
      },
      { status: 409 }
    );
  }

  const created = await prisma.case.create({
    data: {
      registrationType: data.registrationType,
      caseNumber: data.caseNumber,
      caseYear: data.caseYear,
      incomingDate: data.incomingDate ? new Date(data.incomingDate) : new Date(),
      attachmentsCount: data.attachmentsCount || 0,
      hospitalName: data.respondentName || data.hospitalName || null,
      respondentName: data.respondentName || data.hospitalName || null,
      prosecution: prosecutionName,
      prosecutionId: data.prosecutionId || null,
      governorate: data.governorate || null,
      complainantName: data.complainantName || null,
      description: data.description,
      createdById: (session.user as any).id,
      specialties: data.specialtyIds && data.specialtyIds.length > 0
        ? {
            create: data.specialtyIds.map((specId) => ({
              specialtyId: specId,
            })),
          }
        : undefined,
    },
    include: {
      prosecutionRel: true,
      specialties: {
        include: { specialty: true },
      },
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
