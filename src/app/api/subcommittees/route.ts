import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const createSubCommitteeSchema = z.object({
  name: z.string().min(3, "اسم اللجنة/الجهة مطلوب"),
  code: z.string().min(2, "كود اللجنة مطلوب"),
  scope: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const url = new URL(req.url);
  const includeInactive = url.searchParams.get("all") === "true";

  const list = await prisma.subCommittee.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { code: "asc" },
    include: {
      _count: {
        select: { cases: true, members: true, doctors: true },
      },
    },
  });
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !can((session.user as any).role, "MANAGE_SUBCOMMITTEES_AND_SPECIALTIES")) {
    return NextResponse.json({ error: "غير مصرح — متاح للمشرف فقط" }, { status: 403 });
  }

  const parsed = createSubCommitteeSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const created = await prisma.subCommittee.create({
    data: {
      name: parsed.data.name,
      code: parsed.data.code,
      scope: parsed.data.scope || null,
      active: true,
    },
  });

  await writeAuditLog({
    entityType: "SubCommittee",
    entityId: created.id,
    action: "CREATE",
    userId: (session.user as any).id,
    afterData: created,
  });

  return NextResponse.json(created, { status: 201 });
}
