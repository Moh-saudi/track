import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptOptionalField, encryptOptionalField } from "@/lib/crypto";
import { writeAuditLog } from "@/lib/audit";

const doctorSchema = z.object({
  name: z.string().min(3, "يجب إدخال اسم الطبيب كاملاً"),
  title: z.string().optional(),
  employer: z.string().min(2, "يجب تحديد جهة عمل الطبيب / المستشفى لفحص تعارض المصالح"),
  specialtyId: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  subCommitteeId: z.string().optional(),
  nationalId: z.string().regex(/^\d{14}$/, "الرقم القومي يجب أن يتكون من 14 رقماً").optional(),
  financialType: z.enum(["PAYROLL_CARD", "BANK_ACCOUNT", "BANK_CARD"]).optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  iban: z.string().optional(),
  cardNumber: z.string().optional(),
});

function sanitizeDoctorForRole(doc: any, canViewBanking: boolean) {
  if (!canViewBanking) {
    const { nationalId, accountNumber, cardNumber, iban, bankName, financialType, ...safeDoc } = doc;
    return safeDoc;
  }
  return {
    ...doc,
    nationalId: decryptOptionalField(doc.nationalId),
    accountNumber: decryptOptionalField(doc.accountNumber),
    cardNumber: decryptOptionalField(doc.cardNumber),
    iban: decryptOptionalField(doc.iban),
  };
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const userSubCommitteeId = (session.user as any).subCommitteeId;
  const allowedRoles = ["SUBCOMMITTEE_MEMBER", "FINANCE", "ADMIN"];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "غير مصرح بالاطلاع على سجل أطباء اللجان" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const requestedSubCommitteeId = searchParams.get("subCommitteeId");
  const whereClause: any = {};

  if (role === "SUBCOMMITTEE_MEMBER") {
    if (!userSubCommitteeId) return NextResponse.json({ error: "المستخدم غير مرتبط بلجنة فرعية" }, { status: 400 });
    whereClause.subCommitteeId = userSubCommitteeId;
  } else if (requestedSubCommitteeId) {
    whereClause.subCommitteeId = requestedSubCommitteeId;
  }

  const doctors = await prisma.subCommitteeDoctor.findMany({
    where: whereClause,
    include: {
      specialty: true,
      subCommittee: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const sanitizedDoctors = doctors.map((doc) => {
    const canViewBanking = role === "FINANCE" || role === "ADMIN" ||
      (role === "SUBCOMMITTEE_MEMBER" && doc.subCommitteeId === userSubCommitteeId);
    return sanitizeDoctorForRole(doc, canViewBanking);
  });

  return NextResponse.json(sanitizedDoctors);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const userSubCommitteeId = (session.user as any).subCommitteeId;
  if (role !== "SUBCOMMITTEE_MEMBER" && role !== "ADMIN") {
    return NextResponse.json({ error: "صلاحية إدارة أطباء اللجنة مخصصة لمقرر اللجنة الفرعية أو المدير" }, { status: 403 });
  }

  const parsed = doctorSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const effectiveSubCommitteeId = role === "ADMIN" && parsed.data.subCommitteeId
    ? parsed.data.subCommitteeId
    : userSubCommitteeId;
  if (!effectiveSubCommitteeId) {
    return NextResponse.json({ error: "يجب تحديد اللجنة الفرعية التابع لها الطبيب" }, { status: 400 });
  }

  const doctor = await prisma.subCommitteeDoctor.create({
    data: {
      subCommitteeId: effectiveSubCommitteeId,
      name: parsed.data.name.trim(),
      title: parsed.data.title?.trim() || "استشاري",
      employer: parsed.data.employer.trim(),
      specialtyId: parsed.data.specialtyId || null,
      phone: parsed.data.phone?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      nationalId: encryptOptionalField(parsed.data.nationalId),
      financialType: parsed.data.financialType || null,
      bankName: parsed.data.bankName?.trim() || null,
      accountNumber: encryptOptionalField(parsed.data.accountNumber),
      iban: encryptOptionalField(parsed.data.iban),
      cardNumber: encryptOptionalField(parsed.data.cardNumber),
      active: true,
    },
    include: { specialty: true, subCommittee: true },
  });

  await writeAuditLog({
    entityType: "SubCommitteeDoctor",
    entityId: doctor.id,
    action: "CREATE",
    userId: (session.user as any).id,
    afterData: doctor,
  });

  return NextResponse.json(sanitizeDoctorForRole(doctor, true), { status: 201 });
}
