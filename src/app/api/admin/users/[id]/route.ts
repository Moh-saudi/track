import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

import bcrypt from "bcryptjs";

const updateSchema = z.object({
  active:         z.boolean().optional(),
  fullName:       z.string().min(2).optional(),
  employer:       z.string().nullable().optional(),
  subCommitteeId: z.string().nullable().optional(),
  specialtyId:    z.string().nullable().optional(),
  role:           z.enum(["REGISTRATION_CLERK", "SUBCOMMITTEE_MEMBER", "SUPREME_COMMITTEE", "FINANCE", "ADMIN", "FOLLOW_UP_OFFICER", "RISK_OFFICER"]).optional(),
  newPassword:    z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل").optional(),
});

// PATCH — تعديل مستخدم
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !can((session.user as any).role, "MANAGE_USERS_AND_ROLES")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  // لا يمكن تعديل حسابك الشخصي
  if ((session.user as any).id === params.id) {
    return NextResponse.json({ error: "لا يمكن تعديل حسابك الشخصي من هنا" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const before = await prisma.user.findUnique({
    where: { id: params.id },
    select: { id: true, email: true, role: true, active: true },
  });
  if (!before) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  const updateData: any = {};
  if (parsed.data.active !== undefined) updateData.active = parsed.data.active;
  if (parsed.data.fullName) updateData.fullName = parsed.data.fullName;
  if (parsed.data.employer !== undefined) updateData.employer = parsed.data.employer?.trim() || null;
  if (parsed.data.subCommitteeId !== undefined) updateData.subCommitteeId = parsed.data.subCommitteeId;
  if (parsed.data.specialtyId !== undefined) updateData.specialtyId = parsed.data.specialtyId;
  if (parsed.data.role) updateData.role = parsed.data.role;
  if (parsed.data.newPassword) {
    updateData.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: updateData,
    select: { id: true, email: true, fullName: true, role: true, active: true },
  });

  await writeAuditLog({
    entityType: "User",
    entityId: updated.id,
    action: "UPDATE",
    userId: (session.user as any).id,
    beforeData: before,
    afterData: updated,
  });

  return NextResponse.json(updated);
}
