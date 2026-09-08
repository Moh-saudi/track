import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";

const schema = z.object({
  receivedDate: z.string(), // ISO date
  meetingDate: z.string().optional(),
  faultDescription: z.string().optional(), // توصيف الخطأ
  reportDate: z.string().optional(),
  reportText: z.string().optional(),
  actionTaken: z.string().optional(),
  finalize: z.boolean().optional(), // إذا true: تُحوَّل القضية لحالة "بانتظار اعتماد اللجنة العليا"
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || !can(role, "RECORD_SUBCOMMITTEE_REPORT")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const caseRecord = await prisma.case.findUnique({ where: { id: params.id } });
  if (!caseRecord) return NextResponse.json({ error: "القضية غير موجودة" }, { status: 404 });
  if (caseRecord.subCommitteeId !== (session.user as any).subCommitteeId) {
    return NextResponse.json({ error: "هذه القضية ليست موجهة للجنتك" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  // تاريخ إصدار التقرير يجب أن يكون بعد تاريخ الانعقاد
  if (data.reportDate && data.meetingDate && new Date(data.reportDate) < new Date(data.meetingDate)) {
    return NextResponse.json(
      { error: "تاريخ إصدار التقرير يجب أن يكون بعد تاريخ انعقاد اللجنة" },
      { status: 400 }
    );
  }

  const action = await prisma.caseAction.create({
    data: {
      caseId: params.id,
      receivedDate: new Date(data.receivedDate),
      meetingDate: data.meetingDate ? new Date(data.meetingDate) : null,
      faultDescription: data.faultDescription,
      reportDate: data.reportDate ? new Date(data.reportDate) : null,
      reportText: data.reportText,
      actionTaken: data.actionTaken,
      recordedById: (session.user as any).id,
    },
  });

  if (data.finalize) {
    await prisma.case.update({
      where: { id: params.id },
      data: { status: "PENDING_SUPREME_REVIEW" },
    });
  }

  await writeAuditLog({
    entityType: "CaseAction",
    entityId: action.id,
    action: "CREATE",
    userId: (session.user as any).id,
    afterData: action,
  });

  return NextResponse.json(action, { status: 201 });
}
