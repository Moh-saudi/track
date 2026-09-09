import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!can(role, "MANAGE_SUBCOMMITTEES_AND_SPECIALTIES")) {
    return NextResponse.json(
      { error: "صلاحية التعديل لمدير النظام فقط" },
      { status: 403 }
    );
  }

  const body = await req.json();
  const updateData: any = {};
  if (body.name) updateData.name = body.name.trim();
  if (body.code) updateData.code = body.code.trim();
  if (body.scope !== undefined) updateData.scope = body.scope?.trim() || null;
  if (typeof body.active === "boolean") updateData.active = body.active;
  if (body.deactivationMode !== undefined) updateData.deactivationMode = body.deactivationMode;
  if (body.deactivationReason !== undefined) updateData.deactivationReason = body.deactivationReason?.trim() || null;

  const existing = await prisma.subCommittee.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "اللجنة الفرعية غير موجودة" }, { status: 404 });
  }

  const updated = await prisma.subCommittee.update({
    where: { id: params.id },
    data: updateData,
  });

  await writeAuditLog({
    entityType: "SubCommittee",
    entityId: updated.id,
    action: "UPDATE",
    userId: (session.user as any).id,
    beforeData: existing,
    afterData: updated,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!can(role, "MANAGE_SUBCOMMITTEES_AND_SPECIALTIES")) {
    return NextResponse.json(
      { error: "صلاحية الحذف لمدير النظام فقط" },
      { status: 403 }
    );
  }

  const existing = await prisma.subCommittee.findUnique({
    where: { id: params.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "اللجنة الفرعية غير موجودة" }, { status: 404 });
  }

  // فحص الارتباطات بالقضايا والأطباء والمستخدمين
  const [casesCount, doctorsCount, membersCount, referredCount] = await Promise.all([
    prisma.case.count({ where: { subCommitteeId: params.id } }),
    prisma.subCommitteeDoctor.count({ where: { subCommitteeId: params.id } }),
    prisma.user.count({ where: { subCommitteeId: params.id } }),
    prisma.supremeDecision.count({ where: { referredSubCommitteeId: params.id } }),
  ]);

  const totalDependencies = casesCount + doctorsCount + membersCount + referredCount;

  if (totalDependencies > 0) {
    const details = [];
    if (casesCount > 0) details.push(`${casesCount} قضايا مسندة`);
    if (doctorsCount > 0) details.push(`${doctorsCount} أطباء مقيدين`);
    if (membersCount > 0) details.push(`${membersCount} أعضاء ومقررين`);
    if (referredCount > 0) details.push(`${referredCount} قرارات إحالة سابقة`);

    return NextResponse.json(
      {
        error: `لا يمكن حذف هذه اللجنة الفرعية نظراً لوجود بيانات مرتبطة بها (${details.join(
          " ، "
        )}). حفاظاً على سلامة السجلات القضائية، يمكنك "تعطيل اللجنة" بدلاً من حذفها لمنع إسناد قضايا جديدة لها.`,
      },
      { status: 400 }
    );
  }

  await prisma.subCommittee.delete({
    where: { id: params.id },
  });

  await writeAuditLog({
    entityType: "SubCommittee",
    entityId: params.id,
    action: "DELETE",
    userId: (session.user as any).id,
    beforeData: existing,
  });

  return NextResponse.json({ success: true });
}
