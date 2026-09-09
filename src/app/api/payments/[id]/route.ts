import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  status: z.enum(["NOT_PAID", "UNDER_SETTLEMENT", "PAID"]).optional(),
  entitled: z.boolean().optional(),
  amount: z.number().optional(),
  paidAt: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || !can((session.user as any).role, "VIEW_UPDATE_PAYMENTS")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const before = await prisma.payment.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "غير موجود" }, { status: 404 });

  const updateData: any = { ...parsed.data };
  if (parsed.data.paidAt !== undefined) {
    updateData.paidAt = parsed.data.paidAt ? new Date(parsed.data.paidAt) : null;
  } else if (parsed.data.status === "PAID" && !before.paidAt) {
    updateData.paidAt = new Date();
  } else if (parsed.data.status === "NOT_PAID") {
    updateData.paidAt = null;
  }

  const updated = await prisma.payment.update({
    where: { id: params.id },
    data: updateData,
  });

  await writeAuditLog({
    entityType: "Payment",
    entityId: updated.id,
    action: "UPDATE",
    userId: (session.user as any).id,
    beforeData: before,
    afterData: updated,
  });

  return NextResponse.json(updated);
}
