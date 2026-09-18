import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "صلاحية التعديل لمدير المنظومة فقط" }, { status: 403 });
  }

  const existing = await prisma.specialty.findUnique({
    where: { id: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "التخصص الطبي غير موجود" }, { status: 404 });
  }

  const body = await req.json();
  const updateData: any = {};
  if (body.name) updateData.name = body.name.trim();
  if (body.code !== undefined) updateData.code = body.code ? body.code.trim() : null;
  if (typeof body.active === "boolean") updateData.active = body.active;

  const updated = await prisma.specialty.update({
    where: { id: id },
    data: updateData,
  });

  await writeAuditLog({
    entityType: "Specialty",
    entityId: updated.id,
    action: "UPDATE",
    userId: (session.user as any).id,
    beforeData: existing,
    afterData: updated,
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "صلاحية الحذف لمدير النظام فقط" }, { status: 403 });
  }

  const existing = await prisma.specialty.findUnique({
    where: { id: id },
  });
  if (!existing) {
    return NextResponse.json({ error: "التخصص الطبي غير موجود" }, { status: 404 });
  }

  const [caseCount, doctorCount] = await Promise.all([
    prisma.caseSpecialty.count({
      where: { specialtyId: id },
    }),
    prisma.subCommitteeDoctor.count({
      where: { specialtyId: id },
    }),
  ]);

  if (caseCount > 0 || doctorCount > 0) {
    const details = [];
    if (caseCount > 0) details.push(`(${caseCount}) قضايا مسجلة`);
    if (doctorCount > 0) details.push(`(${doctorCount}) أطباء مسندين`);

    return NextResponse.json(
      {
        error: `لا يمكن حذف هذا التخصص نظراً لارتباطه بـ ${details.join(
          " و "
        )}. يمكنك تعطيل وتجميد التخصص بدلاً من حذفه لمنع اختياره مستقبلاً مع الحفاظ على سلامة السجلات.`,
      },
      { status: 400 }
    );
  }

  await prisma.specialty.delete({
    where: { id: id },
  });

  await writeAuditLog({
    entityType: "Specialty",
    entityId: id,
    action: "DELETE",
    userId: (session.user as any).id,
    beforeData: existing,
  });

  return NextResponse.json({ success: true });
}
