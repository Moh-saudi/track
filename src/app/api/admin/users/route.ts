import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { getPasswordPolicyError } from "@/lib/password-policy";

const createUserSchema = z.object({
  email:          z.string().email("بريد إلكتروني غير صحيح"),
  fullName:       z.string().min(2, "الاسم مطلوب"),
  password:       z.string().min(1, "كلمة المرور مطلوبة"),
  role:           z.enum(["REGISTRATION_CLERK", "FOLLOW_UP_OFFICER", "SUBCOMMITTEE_MEMBER", "SUPREME_COMMITTEE", "FINANCE", "ADMIN", "RISK_OFFICER"]),
  employer:       z.string().optional().nullable(),
  subCommitteeId: z.string().optional().nullable(),
  specialtyId:    z.string().optional().nullable(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !can((session.user as any).role, "MANAGE_USERS_AND_ROLES")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { fullName: "asc" },
    select: {
      id: true, email: true, fullName: true, role: true,
      employer: true, active: true, createdAt: true, subCommitteeId: true,
      subCommittee: { select: { name: true, code: true } },
      specialty: { select: { name: true } },
    },
  });

  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !can((session.user as any).role, "MANAGE_USERS_AND_ROLES")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const parsed = createUserSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const normalizedEmail = data.email.toLowerCase().trim();

  const passwordError = getPasswordPolicyError(data.password, normalizedEmail);
  if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 409 });

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email:          normalizedEmail,
      fullName:       data.fullName.trim(),
      passwordHash,
      role:           data.role as any,
      employer:       data.employer?.trim() || null,
      subCommitteeId: data.role === "SUBCOMMITTEE_MEMBER" ? (data.subCommitteeId || null) : null,
      specialtyId:    data.specialtyId || null,
      active:         true,
    },
    select: { id: true, email: true, fullName: true, role: true, employer: true, active: true },
  });

  await writeAuditLog({
    entityType: "User",
    entityId: user.id,
    action: "CREATE",
    userId: (session.user as any).id,
    afterData: { email: user.email, role: user.role },
  });

  return NextResponse.json(user, { status: 201 });
}
