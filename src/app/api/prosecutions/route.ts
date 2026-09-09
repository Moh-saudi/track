import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const prosecutionSchema = z.object({
  name: z.string().min(2, "يجب إدخال اسم النيابة بشكل صحيح"),
  code: z.string().optional(),
  active: z.boolean().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  }

  const prosecutions = await prisma.prosecution.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(prosecutions);
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
      active: parsed.data.active ?? true,
    },
  });

  return NextResponse.json(prosecution, { status: 201 });
}
