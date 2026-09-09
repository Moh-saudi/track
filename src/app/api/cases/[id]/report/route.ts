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

  // لا يمكن تعديل السجل إلا إذا كان قيد الدراسة أو محالاً لإعادة الدراسة
  if (caseRecord.status !== "UNDER_SUBCOMMITTEE_REVIEW" && caseRecord.status !== "REFERRED_FOR_REVIEW") {
    return NextResponse.json(
      { error: "لا يمكن تعديل التقرير الطبي أو فتح السجل بعد اعتماده، إلا إذا أحيل السجل من اللجنة العليا لإعادة الدراسة." },
      { status: 400 }
    );
  }

  // فحص حالة اللجنة الفرعية
  if (caseRecord.subCommitteeId) {
    const sc = await prisma.subCommittee.findUnique({
      where: { id: caseRecord.subCommitteeId },
      select: { active: true },
    });
    if (sc && !sc.active) {
      return NextResponse.json(
        { error: "لا يمكن تحرير أو رفع التقرير الطبي لأن نشاط هذه اللجنة الفرعية موقوف مؤقتاً بقرار إداري." },
        { status: 403 }
      );
    }
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

  // التحقق من اكتمال أركان التقرير الفني عند الاعتماد والرفع للجنة العليا
  if (data.finalize) {
    if (
      !data.meetingDate ||
      !data.reportDate ||
      !data.faultDescription?.trim() ||
      (!data.reportText?.trim() && !data.actionTaken?.trim())
    ) {
      return NextResponse.json(
        {
          error: "لاعتماد التقرير الفني ورفعه رسمياً للجنة العليا، يجب تسجيل تاريخ الانعقاد، وتاريخ إصدار التقرير، وتوصيف الخطأ الطبي، والإجراء المتخذ كاملاً.",
        },
        { status: 400 }
      );
    }
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

  const caseUpdateData: any = {};
  if (data.meetingDate) {
    caseUpdateData.meetingDate = new Date(data.meetingDate);
  }
  if (data.finalize) {
    caseUpdateData.status = "PENDING_SUPREME_REVIEW";
  }
  if (Object.keys(caseUpdateData).length > 0) {
    await prisma.case.update({
      where: { id: params.id },
      data: caseUpdateData,
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
