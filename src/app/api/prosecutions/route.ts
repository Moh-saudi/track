import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureSchemaMigrated } from "@/lib/db-migrate";
import { OFFICIAL_PROSECUTIONS_LIST } from "@/lib/constants/prosecutions";

const prosecutionSchema = z.object({
  name: z.string().min(2, "يجب إدخال اسم النيابة بشكل صحيح"),
  code: z.string().optional().nullable(),
  governorate: z.string().optional().nullable(),
  type: z.enum(["PLENARY", "DISTRICT", "ADMINISTRATIVE"]).optional(),
  parentId: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  await ensureSchemaMigrated();

  const { searchParams } = new URL(req.url);
  const all = searchParams.get("all") === "true";
  const governorate = searchParams.get("governorate");
  const type = searchParams.get("type");

  try {
    const where: any = {};
    if (!all) {
      where.active = true;
    }
    if (governorate) {
      where.governorate = governorate;
    }
    if (type) {
      where.type = type;
    }

    const prosecutions = await prisma.prosecution.findMany({
      where,
      orderBy: [{ governorate: "asc" }, { name: "asc" }],
      include: {
        parent: { select: { id: true, name: true } },
      },
    });

    if (prosecutions.length > 0) {
      return NextResponse.json(prosecutions);
    }
  } catch (err: any) {
    console.error("GET /api/prosecutions query error:", err);
  }

  // Fallback: return official list directly formatted with matching parent IDs
  const parentMapByName: Record<string, string> = {};
  OFFICIAL_PROSECUTIONS_LIST.forEach((item, idx) => {
    if (item.type === "PLENARY" || item.type === "ADMINISTRATIVE") {
      parentMapByName[item.name] = `official_${idx + 1}`;
    }
  });

  const fallback = OFFICIAL_PROSECUTIONS_LIST.map((item, idx) => ({
    id: `official_${idx + 1}`,
    name: item.name,
    governorate: item.governorate,
    type: item.type,
    active: true,
    parentId: item.parentName ? parentMapByName[item.parentName] || null : null,
    parent: item.parentName
      ? { id: parentMapByName[item.parentName] || "", name: item.parentName }
      : null,
  }));

  return NextResponse.json(fallback);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (role !== "ADMIN" && role !== "FOLLOW_UP_OFFICER" && role !== "REGISTRATION_CLERK") {
    return NextResponse.json({ error: "غير مصرح لك بإضافة نيابة جديدة" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = prosecutionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.prosecution.findFirst({
    where: { name: parsed.data.name.trim() },
  });

  if (existing) {
    return NextResponse.json({ error: "اسم النيابة مسجل مسبقاً في المنظومة لمنع التكرار" }, { status: 400 });
  }

  const prosecution = await prisma.prosecution.create({
    data: {
      name: parsed.data.name.trim(),
      code: parsed.data.code?.trim() || null,
      governorate: parsed.data.governorate?.trim() || null,
      type: parsed.data.type || "PLENARY",
      parentId: parsed.data.parentId || null,
      active: parsed.data.active ?? true,
    },
  });

  return NextResponse.json(prosecution, { status: 201 });
}
