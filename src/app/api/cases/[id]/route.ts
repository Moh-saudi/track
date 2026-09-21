import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const partyItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "الاسم مطلوب"),
  phone: z.string().optional().nullable(),
  nationalId: z.string().optional().nullable(),
  medicalProfession: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  isSummoned: z.boolean().optional(),
  summonedAt: z.string().optional().nullable(),
});

const patchCaseSchema = z.object({
  complainants: z.array(partyItemSchema).optional(),
  respondents: z.array(partyItemSchema).optional(),
  sessionAttendees: z.array(partyItemSchema).optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const subCommitteeId = (session.user as any).subCommitteeId;

  const item = await prisma.case.findUnique({
    where: { id: id },
    include: {
      subCommittee: true,
      prosecutionRel: true,
      partialProsecutionRel: true,
      specialties: { include: { specialty: true } },
      reviewers: {
        include: {
          doctor: {
            select: { id: true, name: true, title: true, employer: true, phone: true, specialty: true },
          },
          user: {
            select: { id: true, fullName: true, employer: true, role: true, email: true },
          },
        },
      },
      followUpOfficer: { select: { id: true, fullName: true } },
      actions: {
        include: { recordedBy: { select: { id: true, fullName: true, role: true } } },
        orderBy: { createdAt: "desc" },
      },
      supremeDecisions: {
        include: { decidedBy: { select: { id: true, fullName: true, role: true } } },
        orderBy: { createdAt: "desc" },
      },
      attachments: {
        select: {
          id: true,
          fileName: true,
          fileType: true,
          fileSize: true,
          uploadedAt: true,
          uploadedBy: { select: { id: true, fullName: true } },
        },
        orderBy: { uploadedAt: "desc" },
      },
    },
  });

  if (!item) return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });

  const permitted =
    (role === "REGISTRATION_CLERK" && item.createdById === userId) ||
    (role === "SUBCOMMITTEE_MEMBER" && !!subCommitteeId && item.subCommitteeId === subCommitteeId) ||
    can(role, "VIEW_ALL_CASES");

  if (!permitted) return NextResponse.json({ error: "غير مصرح بالاطلاع على هذا السجل" }, { status: 403 });

  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  const subCommitteeId = (session.user as any).subCommitteeId;

  const currentCase = await prisma.case.findUnique({
    where: { id },
  });

  if (!currentCase) return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });

  const permitted =
    (role === "SUBCOMMITTEE_MEMBER" && !!subCommitteeId && currentCase.subCommitteeId === subCommitteeId) ||
    role === "ADMIN" ||
    can(role, "ROUTE_CASE");

  if (!permitted) {
    return NextResponse.json({ error: "غير مصرح بتعديل بيانات الأطراف أو الجلسة لهذا السجل" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchCaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updateData: any = {};

  if (parsed.data.complainants) {
    updateData.complainants = parsed.data.complainants;
    if (parsed.data.complainants.length > 0) {
      updateData.complainantName = parsed.data.complainants[0].name;
      updateData.complainantPhone = parsed.data.complainants[0].phone || null;
    }
  }

  if (parsed.data.respondents) {
    updateData.respondents = parsed.data.respondents;
    if (parsed.data.respondents.length > 0) {
      updateData.respondentName = parsed.data.respondents[0].name;
      updateData.respondentPhone = parsed.data.respondents[0].phone || null;
    } else {
      updateData.respondentName = null;
      updateData.respondentPhone = null;
    }
  }

  if (parsed.data.sessionAttendees) {
    updateData.sessionAttendees = parsed.data.sessionAttendees;
  }

  const updatedCase = await prisma.case.update({
    where: { id },
    data: updateData,
  });

  await writeAuditLog({
    entityType: "Case",
    entityId: id,
    action: "UPDATE_PARTIES",
    userId,
    beforeData: currentCase,
    afterData: updatedCase,
  });

  return NextResponse.json(updatedCase);
}
