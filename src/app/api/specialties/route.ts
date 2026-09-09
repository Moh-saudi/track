import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const createSpecialtySchema = z.object({
  name: z.string().min(2, "اسم التخصص الطبي مطلوب"),
  code: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const url = new URL(req.url);
  const includeInactive = url.searchParams.get("all") === "true";
  const specialties = await prisma.specialty.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(specialties);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !can((session.user as any).role, "MANAGE_SUBCOMMITTEES_AND_SPECIALTIES")) {
    return NextResponse.json({ error: "غير مصرح — متاح للمشرف فقط" }, { status: 403 });
  }

  const parsed = createSpecialtySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.specialty.findUnique({
    where: { name: parsed.data.name.trim() },
  });
  if (existing) {
    return NextResponse.json({ error: "هذا التخصص الطبي مسجل بالفعل مسبقاً لمنع التكرار" }, { status: 400 });
  }

  const created = await prisma.specialty.create({
    data: {
      name: parsed.data.name.trim(),
      code: parsed.data.code?.trim() || null,
      active: true,
    },
  });

  await writeAuditLog({
    entityType: "Specialty",
    entityId: created.id,
    action: "CREATE",
    userId: (session.user as any).id,
    afterData: created,
  });

  return NextResponse.json(created, { status: 201 });
}
