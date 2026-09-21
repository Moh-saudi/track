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
  type: z.enum(["PLENARY", "DISTRICT"]).optional(),
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

    let prosecutions = await prisma.prosecution.findMany({
      where,
      orderBy: [{ governorate: "asc" }, { name: "asc" }],
      include: {
        parent: { select: { id: true, name: true } },
      },
    });

    if (prosecutions.length === 0) {
      try {
        const totalCount = await prisma.prosecution.count();
        if (totalCount === 0) {
          const plenaryMap: Record<string, string> = {};
          for (const item of OFFICIAL_PROSECUTIONS_LIST.filter((p) => p.type === "PLENARY")) {
            const created = await prisma.prosecution.create({
              data: {
                name: item.name,
                governorate: item.governorate,
                type: "PLENARY",
                active: true,
              },
            }).catch(() => null);
            if (created) plenaryMap[item.name] = created.id;
          }
          for (const item of OFFICIAL_PROSECUTIONS_LIST.filter((p) => p.type === "DISTRICT")) {
            const parentId = item.parentName ? plenaryMap[item.parentName] || null : null;
            await prisma.prosecution.create({
              data: {
                name: item.name,
                governorate: item.governorate,
                type: "DISTRICT",
                parentId,
                active: true,
              },
            }).catch(() => null);
          }
          prosecutions = await prisma.prosecution.findMany({
            where: all ? {} : { active: true },
            orderBy: [{ governorate: "asc" }, { name: "asc" }],
            include: { parent: { select: { id: true, name: true } } },
          });
        } else {
          await prisma.prosecution.updateMany({ data: { active: true } }).catch(() => {});
          prosecutions = await prisma.prosecution.findMany({
            orderBy: [{ governorate: "asc" }, { name: "asc" }],
            include: { parent: { select: { id: true, name: true } } },
          });
        }
      } catch (innerErr) {
        console.warn("Auto-seed prosecutions error:", innerErr);
      }
    }

    if (prosecutions.length > 0) {
      return NextResponse.json(prosecutions);
    }
  } catch (err: any) {
    console.error("GET /api/prosecutions query error:", err);
  }

  // Fallback: return official list directly formatted
  const fallback = OFFICIAL_PROSECUTIONS_LIST.map((item, idx) => ({
    id: `official_${idx + 1}`,
    name: item.name,
    governorate: item.governorate,
    type: item.type,
    active: true,
    parent: item.parentName ? { id: `parent_${idx}`, name: item.parentName } : null,
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
