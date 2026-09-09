import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";

const createSchema = z.object({
  sessionNumber: z.string().min(1, "رقم أو عنوان الجلسة مطلوب"),
  sessionDate: z.string().min(1, "تاريخ ووقت الجلسة مطلوب"),
  location: z.string().optional(),
  notes: z.string().optional(),
  caseIds: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "SUPREME_COMMITTEE" && role !== "ADMIN")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const sessions = await prisma.supremeSession.findMany({
    orderBy: { sessionDate: "asc" },
    include: {
      createdBy: { select: { fullName: true } },
      cases: {
        select: {
          id: true,
          caseNumber: true,
          caseYear: true,
          complainantName: true,
          hospitalName: true,
          status: true,
          subCommittee: { select: { name: true } },
        },
      },
    },
  });

  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== "SUPREME_COMMITTEE" && role !== "ADMIN")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { sessionNumber, sessionDate, location, notes, caseIds } = parsed.data;

  const newSession = await prisma.supremeSession.create({
    data: {
      sessionNumber: sessionNumber.trim(),
      sessionDate: new Date(sessionDate),
      location: location?.trim() || "قاعة الاجتماعات الكبرى - الأمانة الفنية للجنة العليا",
      notes: notes?.trim() || null,
      createdById: (session.user as any).id,
      cases: caseIds && caseIds.length > 0 ? {
        connect: caseIds.map((id) => ({ id })),
      } : undefined,
    },
    include: {
      cases: true,
    },
  });

  await writeAuditLog({
    entityType: "SupremeSession",
    entityId: newSession.id,
    action: "CREATE",
    userId: (session.user as any).id,
    afterData: {
      sessionNumber: newSession.sessionNumber,
      sessionDate: newSession.sessionDate,
      casesCount: caseIds?.length || 0,
    },
  });

  return NextResponse.json(newSession, { status: 201 });
}
