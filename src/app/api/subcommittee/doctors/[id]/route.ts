import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const userSubCommitteeId = (session.user as any).subCommitteeId;

  const doctor = await prisma.subCommitteeDoctor.findUnique({
    where: { id: params.id },
  });

  if (!doctor) {
    return NextResponse.json({ error: "الطبيب غير مسجل" }, { status: 404 });
  }

  // التأكد من أن المقرر يعدل فقط أطباء لجنته
  if (role === "SUBCOMMITTEE_MEMBER" && doctor.subCommitteeId !== userSubCommitteeId) {
    return NextResponse.json({ error: "غير مصرح لك بتعديل بيانات طبيب خارج لجنتك" }, { status: 403 });
  }

  const body = await req.json();
  const updateData: any = {};

  if (typeof body.active === "boolean") {
    updateData.active = body.active;
  }
  if (body.name) updateData.name = body.name;
  if (body.title) updateData.title = body.title;
  if (body.employer) updateData.employer = body.employer;
  if (body.specialtyId !== undefined) updateData.specialtyId = body.specialtyId || null;
  if (body.phone !== undefined) updateData.phone = body.phone || null;
  if (body.notes !== undefined) updateData.notes = body.notes || null;
  if (body.nationalId !== undefined) updateData.nationalId = body.nationalId || null;
  if (body.financialType !== undefined) updateData.financialType = body.financialType || null;
  if (body.bankName !== undefined) updateData.bankName = body.bankName || null;
  if (body.accountNumber !== undefined) updateData.accountNumber = body.accountNumber || null;
  if (body.iban !== undefined) updateData.iban = body.iban || null;
  if (body.cardNumber !== undefined) updateData.cardNumber = body.cardNumber || null;

  const updated = await prisma.subCommitteeDoctor.update({
    where: { id: params.id },
    data: updateData,
    include: { specialty: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const userSubCommitteeId = (session.user as any).subCommitteeId;

  const doctor = await prisma.subCommitteeDoctor.findUnique({
    where: { id: params.id },
    include: { reviewAssignments: true },
  });

  if (!doctor) {
    return NextResponse.json({ error: "الطبيب غير موجود" }, { status: 404 });
  }

  if (role === "SUBCOMMITTEE_MEMBER" && doctor.subCommitteeId !== userSubCommitteeId) {
    return NextResponse.json({ error: "غير مصرح لك بحذف طبيب خارج لجنتك" }, { status: 403 });
  }

  if (doctor.reviewAssignments.length > 0) {
    // إذا كان مرتبطاً بقضايا سابقة، يفضل الإيقاف المؤقت بدلاً من الحذف للحفاظ على السجل
    return NextResponse.json({
      error: "لا يمكن حذف الطبيب لأنه مسجل بالفعل في تقارير قضايا سابقة. يرجى استخدام خاصية «الإيقاف المؤقت» بدلاً من الحذف.",
    }, { status: 400 });
  }

  await prisma.subCommitteeDoctor.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true, message: "تم حذف الطبيب من سجل اللجنة" });
}
