import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const doctorSchema = z.object({
  name: z.string().min(3, "يجب إدخال اسم الطبيب كاملاً"),
  title: z.string().optional(),
  employer: z.string().min(2, "يجب تحديد جهة عمل الطبيب / المستشفى لفحص تعارض المصالح"),
  specialtyId: z.string().optional(),
  phone: z.string().optional(),
  notes: z.string().optional(),
  subCommitteeId: z.string().optional(),
  nationalId: z.string().optional(),
  financialType: z.enum(["PAYROLL_CARD", "BANK_ACCOUNT", "BANK_CARD"]).optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  iban: z.string().optional(),
  cardNumber: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userSubCommitteeId = (session.user as any).subCommitteeId;

  // للمقرر يتم جلب أطباء لجنته فقط، وللمالية والأدمن يمكن تحديد اللجنة عبر query param أو جلب الجميع
  const { searchParams } = new URL(req.url);
  const targetSubCommitteeId = searchParams.get("subCommitteeId") || userSubCommitteeId;

  const whereClause: any = {};
  if (role === "SUBCOMMITTEE_MEMBER") {
    if (!userSubCommitteeId) {
      return NextResponse.json({ error: "المستخدم غير مرتبط بلجنة فرعية" }, { status: 400 });
    }
    whereClause.subCommitteeId = userSubCommitteeId;
  } else if (targetSubCommitteeId && role !== "FINANCE") {
    whereClause.subCommitteeId = targetSubCommitteeId;
  } else if (targetSubCommitteeId && searchParams.get("subCommitteeId")) {
    whereClause.subCommitteeId = searchParams.get("subCommitteeId");
  }

  const doctors = await prisma.subCommitteeDoctor.findMany({
    where: whereClause,
    include: {
      specialty: true,
      subCommittee: { select: { id: true, name: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(doctors);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const role = (session.user as any).role;
  const userSubCommitteeId = (session.user as any).subCommitteeId;

  if (role !== "SUBCOMMITTEE_MEMBER" && role !== "ADMIN") {
    return NextResponse.json({ error: "صلاحية إدارة أطباء اللجنة مخصصة لمقرر اللجنة الفرعية أو المدير" }, { status: 403 });
  }

  const parsed = doctorSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const effectiveSubCommitteeId = role === "ADMIN" && parsed.data.subCommitteeId
    ? parsed.data.subCommitteeId
    : userSubCommitteeId;

  if (!effectiveSubCommitteeId) {
    return NextResponse.json({ error: "يجب تحديد اللجنة الفرعية التابع لها الطبيب" }, { status: 400 });
  }

  const doctor = await prisma.subCommitteeDoctor.create({
    data: {
      subCommitteeId: effectiveSubCommitteeId,
      name: parsed.data.name,
      title: parsed.data.title || "استشاري",
      employer: parsed.data.employer,
      specialtyId: parsed.data.specialtyId || null,
      phone: parsed.data.phone || null,
      notes: parsed.data.notes || null,
      nationalId: parsed.data.nationalId || null,
      financialType: parsed.data.financialType || null,
      bankName: parsed.data.bankName || null,
      accountNumber: parsed.data.accountNumber || null,
      iban: parsed.data.iban || null,
      cardNumber: parsed.data.cardNumber || null,
      active: true,
    },
    include: {
      specialty: true,
      subCommittee: true,
    },
  });

  return NextResponse.json(doctor, { status: 201 });
}
