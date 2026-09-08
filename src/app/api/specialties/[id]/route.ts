import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "FOLLOW_UP_OFFICER") {
    return NextResponse.json({ error: "صلاحية التعديل للمسؤول فقط" }, { status: 403 });
  }

  const body = await req.json();
  const updateData: any = {};
  if (body.name) updateData.name = body.name.trim();
  if (body.code !== undefined) updateData.code = body.code ? body.code.trim() : null;
  if (typeof body.active === "boolean") updateData.active = body.active;

  const updated = await prisma.specialty.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "صلاحية الحذف لمدير النظام فقط" }, { status: 403 });
  }

  const caseCount = await prisma.caseSpecialty.count({
    where: { specialtyId: params.id },
  });

  if (caseCount > 0) {
    return NextResponse.json(
      { error: `لا يمكن حذف هذا التخصص لأنه مرتبط بـ (${caseCount}) قضايا مسجلة بالمنظومة. يمكنك إيقاف تفعيله بدلاً من الحذف.` },
      { status: 400 }
    );
  }

  await prisma.specialty.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}
