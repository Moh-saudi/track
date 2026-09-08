import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const meetingSchema = z.object({
  meetingDate: z.string().min(1, "يجب إدخال تاريخ انعقاد جلسة اللجنة"),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const userSubCommitteeId = (session.user as any).subCommitteeId;

  if (role !== "SUBCOMMITTEE_MEMBER" && role !== "ADMIN") {
    return NextResponse.json({ error: "تحديد موعد الانعقاد مخصص لمقرر اللجنة الفرعية أو المدير" }, { status: 403 });
  }

  const currentCase = await prisma.case.findUnique({
    where: { id: params.id },
  });

  if (!currentCase) {
    return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
  }

  if (role === "SUBCOMMITTEE_MEMBER" && currentCase.subCommitteeId !== userSubCommitteeId) {
    return NextResponse.json({ error: "غير مصرح — هذا السجل غير محال للجنتك الفرعية" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = meetingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updatedCase = await prisma.case.update({
    where: { id: params.id },
    data: {
      meetingDate: new Date(parsed.data.meetingDate),
    },
  });

  return NextResponse.json({
    success: true,
    meetingDate: updatedCase.meetingDate,
    message: "تم حفظ تاريخ انعقاد جلسة اللجنة بنجاح",
  });
}
