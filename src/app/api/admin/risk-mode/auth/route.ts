import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { createRiskSessionToken, RISK_SESSION_MAX_AGE } from "@/lib/risk-session";

const schema = z.object({
  password: z.string().min(1, "كلمة المرور مطلوبة"),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;

  if (!session?.user || (user?.role !== "ADMIN" && user?.role !== "RISK_OFFICER")) {
    return NextResponse.json({ error: "غير مصرح — مخصص لمدير المنظومة ومسؤول إدارة المخاطر فقط" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!dbUser || !dbUser.active) {
    return NextResponse.json({ error: "المستخدم غير موجود أو غير نشط" }, { status: 404 });
  }

  const isValid = await bcrypt.compare(parsed.data.password, dbUser.passwordHash);
  if (!isValid) {
    return NextResponse.json({ error: "كلمة المرور غير صحيحة" }, { status: 401 });
  }

  await writeAuditLog({
    entityType: "SystemSecurity",
    entityId: dbUser.id,
    action: "ADMIN_RISK_MODE_ACTIVATED",
    userId: dbUser.id,
    afterData: {
      message: "تم تفعيل وضع إدارة المخاطر وتصحيح المسار الإجرائي بنجاح",
      timestamp: new Date().toISOString(),
    },
  });

  const response = NextResponse.json({
    success: true,
    message: "تم التحقق وتفعيل وضع إدارة المخاطر بنجاح",
    expiresInSeconds: RISK_SESSION_MAX_AGE,
  });

  response.cookies.set({
    name: "risk_mode_session",
    value: createRiskSessionToken(dbUser.id),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: RISK_SESSION_MAX_AGE,
    sameSite: "strict",
  });

  return response;
}
