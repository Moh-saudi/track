import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  currentPassword: z.string().min(1, "كلمة المرور الحالية مطلوبة"),
  newPassword:     z.string().min(8, "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل"),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const role = (session.user as any).role;
  // طبقاً لسياسات الأمان والحماية الحكومية لا يجوز للمستخدم العادي تغيير كلمة المرور ذاتياً
  if (role !== "ADMIN") {
    return NextResponse.json(
      {
        error:
          "طبقاً لسياسات الأمان والحماية الحكومية المعتمدة، لا يجوز للمستخدم تغيير كلمة المرور ذاتياً منعاً لقيام أي طرف بتغييرها دون علمه. يرجى مراجعة مدير المنظومة أو الدعم الفني المعتمد لإعادة تعيين كلمة المرور.",
      },
      { status: 403 }
    );
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { currentPassword, newPassword } = parsed.data;

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return NextResponse.json({ error: "كلمة المرور الحالية غير صحيحة" }, { status: 400 });

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  await writeAuditLog({
    entityType: "User",
    entityId: userId,
    action: "CHANGE_PASSWORD",
    userId,
    afterData: { passwordChanged: true },
  });

  return NextResponse.json({ message: "تم تغيير كلمة المرور بنجاح" });
}
