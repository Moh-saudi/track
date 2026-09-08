import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const recuseSchema = z.object({
  reason: z.string().min(5, "يجب كتابة سبب التنحي والاعتذار بوضوح"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; reviewerId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const userId = (session.user as any).id;
  const parsed = recuseSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const reviewer = await prisma.caseReviewer.findUnique({
    where: { id: params.reviewerId },
    include: { user: true },
  });

  if (!reviewer) {
    return NextResponse.json({ error: "سجل الفحص غير موجود" }, { status: 404 });
  }

  // يمكن للعضو نفسه أو المشرف تسجيل التنحي
  if (reviewer.userId !== userId && (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح — يمكنك فقط تقديم طلب تنحٍ عن السجلات المسندة إليك شخصياً" }, { status: 403 });
  }

  const updated = await prisma.caseReviewer.update({
    where: { id: params.reviewerId },
    data: {
      status: "RECUSED",
      recusalReason: parsed.data.reason,
      recusedAt: new Date(),
    },
  });

  await writeAuditLog({
    entityType: "CaseReviewer",
    entityId: updated.id,
    action: "RECUSAL",
    userId,
    beforeData: reviewer,
    afterData: updated,
  });

  return NextResponse.json({
    message: "تم تسجيل طلب التنحي والاعتذار بنجاح، وسيتم إخطار منسق اللجنة وموظف المتابعة لإسناد بديل",
    reviewer: updated,
  });
}
