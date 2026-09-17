import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { getPasswordPolicyError } from "@/lib/password-policy";

const schema = z.object({
  currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة"),
  newPassword: z.string().min(1, "كلمة المرور الجديدة مطلوبة"),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { currentPassword, newPassword } = parsed.data;

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, passwordHash: true, active: true },
  });
  if (!user || !user.active) return NextResponse.json({ error: "المستخدم غير موجود أو غير نشط" }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 });

  const passwordError = getPasswordPolicyError(newPassword, user.email);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const sameAsCurrent = await bcrypt.compare(newPassword, user.passwordHash);
  if (sameAsCurrent) {
    return NextResponse.json({ error: "كلمة المرور الجديدة يجب أن تختلف عن الحالية" }, { status: 400 });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: newHash,
      sessionVersion: { increment: 1 },
    },
  });

  await writeAuditLog({
    entityType: "User",
    entityId: userId,
    action: "CHANGE_PASSWORD",
    userId,
    afterData: { passwordChanged: true, sessionsRevoked: true },
  });

  return NextResponse.json({
    message: "تم تغيير كلمة المرور وإبطال الجلسات السابقة. يرجى تسجيل الدخول مرة أخرى.",
    reauthenticate: true,
  });
}
