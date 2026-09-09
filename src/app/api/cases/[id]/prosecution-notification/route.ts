import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  prosecutionNotifiedAt: z.string().nullable().optional(),
  prosecutionLetterNumber: z.string().nullable().optional(),
  prosecutionNotificationNotes: z.string().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || (!can(role, "ROUTE_CASE") && role !== "ADMIN")) {
    return NextResponse.json({ error: "غير مصرح لك بتسجيل مخاطبة النيابة" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existingCase = await prisma.case.findUnique({
    where: { id: params.id },
  });
  if (!existingCase) {
    return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });
  }

  const notifiedAtDate = parsed.data.prosecutionNotifiedAt
    ? new Date(parsed.data.prosecutionNotifiedAt)
    : null;

  const updatedCase = await prisma.case.update({
    where: { id: params.id },
    data: {
      prosecutionNotifiedAt: notifiedAtDate,
      prosecutionLetterNumber: parsed.data.prosecutionLetterNumber?.trim() || null,
      prosecutionNotificationNotes: parsed.data.prosecutionNotificationNotes?.trim() || null,
    },
  });

  await writeAuditLog({
    entityType: "Case",
    entityId: params.id,
    action: "UPDATE",
    userId: (session.user as any).id,
    beforeData: {
      prosecutionNotifiedAt: existingCase.prosecutionNotifiedAt,
      prosecutionLetterNumber: existingCase.prosecutionLetterNumber,
    },
    afterData: {
      prosecutionNotifiedAt: updatedCase.prosecutionNotifiedAt,
      prosecutionLetterNumber: updatedCase.prosecutionLetterNumber,
    },
  });

  return NextResponse.json(updatedCase);
}
