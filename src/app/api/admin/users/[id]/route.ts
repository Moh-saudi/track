import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { getPasswordPolicyError } from "@/lib/password-policy";

const updateSchema = z.object({
  active:         z.boolean().optional(),
  fullName:       z.string().min(2).optional(),
  employer:       z.string().nullable().optional(),
  subCommitteeId: z.string().nullable().optional(),
  specialtyId:    z.string().nullable().optional(),
  role:           z.enum(["REGISTRATION_CLERK", "SUBCOMMITTEE_MEMBER", "SUPREME_COMMITTEE", "FINANCE", "ADMIN", "FOLLOW_UP_OFFICER", "RISK_OFFICER"]).optional(),
  newPassword:    z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user || !can((session.user as any).role, "MANAGE_USERS_AND_ROLES")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  if ((session.user as any).id === id) {
    return NextResponse.json({ error: "لا يمكن تعديل حسابك الشخصي من هنا" }, { status: 400 });
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const before = await prisma.user.findUnique({
    where: { id: id },
    select: { id: true, email: true, role: true, active: true, sessionVersion: true },
  });
  if (!before) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  const updateData: any = {};
  let securityContextChanged = false;

  if (parsed.data.active !== undefined && parsed.data.active !== before.active) {
    updateData.active = parsed.data.active;
    securityContextChanged = true;
  }
  if (parsed.data.fullName) updateData.fullName = parsed.data.fullName.trim();
  if (parsed.data.employer !== undefined) updateData.employer = parsed.data.employer?.trim() || null;
  if (parsed.data.subCommitteeId !== undefined) {
    updateData.subCommitteeId = parsed.data.subCommitteeId;
    securityContextChanged = true;
  }
  if (parsed.data.specialtyId !== undefined) updateData.specialtyId = parsed.data.specialtyId;
  if (parsed.data.role && parsed.data.role !== before.role) {
    updateData.role = parsed.data.role;
    securityContextChanged = true;
  }
  if (parsed.data.newPassword) {
    const passwordError = getPasswordPolicyError(parsed.data.newPassword, before.email);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
    updateData.passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    securityContextChanged = true;
  }
  if (securityContextChanged) {
    updateData.sessionVersion = { increment: 1 };
  }

  const updated = await prisma.user.update({
    where: { id: id },
    data: updateData,
    select: { id: true, email: true, fullName: true, role: true, active: true, sessionVersion: true },
  });

  await writeAuditLog({
    entityType: "User",
    entityId: updated.id,
    action: "UPDATE",
    userId: (session.user as any).id,
    beforeData: before,
    afterData: { ...updated, passwordChanged: Boolean(parsed.data.newPassword) },
  });

  return NextResponse.json(updated);
}
