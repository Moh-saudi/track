import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptOptionalField, encryptOptionalField } from "@/lib/crypto";
import { writeAuditLog } from "@/lib/audit";

function canManageDoctor(role: string, doctorSubCommitteeId: string, userSubCommitteeId?: string | null) {
  if (role === "ADMIN") return true;
  return role === "SUBCOMMITTEE_MEMBER" && !!userSubCommitteeId && doctorSubCommitteeId === userSubCommitteeId;
}

function safeDoctorResponse(doctor: any) {
  return {
    ...doctor,
    nationalId: decryptOptionalField(doctor.nationalId),
    accountNumber: decryptOptionalField(doctor.accountNumber),
    iban: decryptOptionalField(doctor.iban),
    cardNumber: decryptOptionalField(doctor.cardNumber),
  };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const userSubCommitteeId = (session.user as any).subCommitteeId;
  const doctor = await prisma.subCommitteeDoctor.findUnique({ where: { id: (await params).id } });
  if (!doctor) return NextResponse.json({ error: "الطبيب غير مسجل" }, { status: 404 });

  if (!canManageDoctor(role, doctor.subCommitteeId, userSubCommitteeId)) {
    return NextResponse.json({ error: "غير مصرح لك بتعديل بيانات هذا الطبيب" }, { status: 403 });
  }

  const body = await req.json();
  const updateData: any = {};
  if (typeof body.active === "boolean") updateData.active = body.active;
  if (body.name) updateData.name = String(body.name).trim();
  if (body.title) updateData.title = String(body.title).trim();
  if (body.employer) updateData.employer = String(body.employer).trim();
  if (body.specialtyId !== undefined) updateData.specialtyId = body.specialtyId || null;
  if (body.phone !== undefined) updateData.phone = body.phone ? String(body.phone).trim() : null;
  if (body.notes !== undefined) updateData.notes = body.notes ? String(body.notes).trim() : null;
  if (body.nationalId !== undefined) {
    if (body.nationalId && !/^\d{14}$/.test(String(body.nationalId))) {
      return NextResponse.json({ error: "الرقم القومي يجب أن يتكون من 14 رقماً" }, { status: 400 });
    }
    updateData.nationalId = encryptOptionalField(body.nationalId || null);
  }
  if (body.financialType !== undefined) {
    const allowedFinancialTypes = ["PAYROLL_CARD", "BANK_ACCOUNT", "BANK_CARD"];
    if (body.financialType && !allowedFinancialTypes.includes(body.financialType)) {
      return NextResponse.json({ error: "نوع الحساب المالي غير صالح" }, { status: 400 });
    }
    updateData.financialType = body.financialType || null;
  }
  if (body.bankName !== undefined) updateData.bankName = body.bankName ? String(body.bankName).trim() : null;
  if (body.accountNumber !== undefined) updateData.accountNumber = encryptOptionalField(body.accountNumber || null);
  if (body.iban !== undefined) updateData.iban = encryptOptionalField(body.iban || null);
  if (body.cardNumber !== undefined) updateData.cardNumber = encryptOptionalField(body.cardNumber || null);

  const updated = await prisma.subCommitteeDoctor.update({
    where: { id: (await params).id },
    data: updateData,
    include: { specialty: true },
  });

  await writeAuditLog({
    entityType: "SubCommitteeDoctor",
    entityId: updated.id,
    action: "UPDATE",
    userId: (session.user as any).id,
    beforeData: doctor,
    afterData: updated,
  });

  return NextResponse.json(safeDoctorResponse(updated));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const userSubCommitteeId = (session.user as any).subCommitteeId;
  const doctor = await prisma.subCommitteeDoctor.findUnique({
    where: { id: (await params).id },
    include: { reviewAssignments: true },
  });
  if (!doctor) return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });

  if (!canManageDoctor(role, doctor.subCommitteeId, userSubCommitteeId)) {
    return NextResponse.json({ error: "غير مصرح لك بحذف هذا الطبيب" }, { status: 403 });
  }

  if (doctor.reviewAssignments.length > 0) {
    return NextResponse.json({
      error: "لا يمكن حذف الطبيب لأنه مسجل بالفعل في تقارير قضايا سابقة. يرجى استخدام خاصية «الإيقاف المؤقت» بدلاً من الحذف.",
    }, { status: 400 });
  }

  await prisma.subCommitteeDoctor.delete({ where: { id: (await params).id } });
  await writeAuditLog({
    entityType: "SubCommitteeDoctor",
    entityId: (await params).id,
    action: "DELETE",
    userId: (session.user as any).id,
    beforeData: doctor,
  });

  return NextResponse.json({ success: true, message: "تم حذف الطبيب من سجل اللجنة" });
}
