import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const updateSchema = z.object({
  sessionNumber: z.string().optional(),
  sessionDate: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(["SCHEDULED", "IN_PROGRESS", "COMPLETED", "POSTPONED"]).optional(),
  notes: z.string().optional(),
  caseIds: z.array(z.string()).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "SUPREME_COMMITTEE" && role !== "ADMIN")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.supremeSession.findUnique({
    where: { id: params.id },
    include: { cases: { select: { id: true } } },
  });
  if (!existing) {
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  }

  const { sessionNumber, sessionDate, location, status, notes, caseIds } = parsed.data;

  const updateData: any = {};
  if (sessionNumber !== undefined) updateData.sessionNumber = sessionNumber.trim();
  if (sessionDate !== undefined) updateData.sessionDate = new Date(sessionDate);
  if (location !== undefined) updateData.location = location.trim();
  if (status !== undefined) updateData.status = status;
  if (notes !== undefined) updateData.notes = notes.trim();

  if (caseIds !== undefined) {
    updateData.cases = {
      set: caseIds.map((id) => ({ id })),
    };
  }

  const updated = await prisma.supremeSession.update({
    where: { id: params.id },
    data: updateData,
    include: { cases: true },
  });

  await writeAuditLog({
    entityType: "SupremeSession",
    entityId: updated.id,
    action: "UPDATE",
    userId: (session.user as any).id,
    beforeData: existing,
    afterData: updated,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "SUPREME_COMMITTEE" && role !== "ADMIN")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const existing = await prisma.supremeSession.findUnique({
    where: { id: params.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "الجلسة غير موجودة" }, { status: 404 });
  }

  // Unlink any cases connected to this session
  await prisma.case.updateMany({
    where: { supremeSessionId: params.id },
    data: { supremeSessionId: null },
  });

  await prisma.supremeSession.delete({
    where: { id: params.id },
  });

  await writeAuditLog({
    entityType: "SupremeSession",
    entityId: params.id,
    action: "DELETE",
    userId: (session.user as any).id,
    beforeData: existing,
  });

  return NextResponse.json({ success: true });
}
