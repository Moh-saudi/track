import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac";
import { writeAuditLog } from "@/lib/audit";
import { SUBCOMMITTEE_FINDINGS } from "@/lib/subcommittee-findings";

const schema = z.object({
  receivedDate: z.string().optional(), // ISO date
  meetingDate: z.string().optional(),
  faultDescription: z.string().min(1, "يرجى اختيار نتيجة دراسة اللجنة الفرعية من الخيارات المعتمدة"), // يحمل الاختيار الفني المعتمد
  reportDate: z.string().optional(),
  reportText: z.string().optional(),
  actionTaken: z.string().optional(),
  notes: z.string().optional(),
  finalize: z.boolean().optional(), // إذا true: تُحوَّل القضية لحالة "بانتظار اعتماد اللجنة العليا"
});

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (!session?.user || !can(role, "RECORD_SUBCOMMITTEE_REPORT")) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const caseRecord = await prisma.case.findUnique({ where: { id: id } });
  if (!caseRecord) return NextResponse.json({ error: "القضية غير موجودة" }, { status: 404 });
  if (caseRecord.subCommitteeId !== (session.user as any).subCommitteeId && role !== "ADMIN") {
    return NextResponse.json({ error: "هذه القضية ليست موجهة للجنتك" }, { status: 403 });
  }

  // لا يمكن تعديل السجل إلا إذا كان قيد الدراسة أو محالاً لإعادة الدراسة
  if (caseRecord.status !== "UNDER_SUBCOMMITTEE_REVIEW" && caseRecord.status !== "REFERRED_FOR_REVIEW") {
    return NextResponse.json(
      { error: "لا يمكن تعديل دراسة اللجنة أو فتح السجل بعد اعتماده، إلا إذا أحيل السجل من اللجنة العليا لإعادة الدراسة." },
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
        { error: "لا يمكن تحرير أو رفع دراسة اللجنة لأن نشاط هذه اللجنة الفرعية موقوف مؤقتاً بقرار إداري." },
        { status: 403 }
      );
    }
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;

  // تاريخ إصدار التقرير يجب ألا يسبق تاريخ الانعقاد إن وجدا
  if (data.reportDate && data.meetingDate && new Date(data.reportDate) < new Date(data.meetingDate)) {
    return NextResponse.json(
      { error: "تاريخ إصدار القرار والتقرير يجب أن يكون متزامناً مع أو بعد تاريخ انعقاد اللجنة" },
      { status: 400 }
    );
  }

  // التحقق من اكتمال أركان القرار عند الاعتماد والرفع للجنة العليا
  if (data.finalize) {
    if (!data.faultDescription || !data.faultDescription.trim()) {
      return NextResponse.json(
        {
          error: "لاعتماد دراسة اللجنة ورفعها رسمياً للجنة العليا، يجب تحديد نتيجة دراسة اللجنة من الخيارات الخمسة المعتمدة.",
        },
        { status: 400 }
      );
    }
  }

  const effectiveFinding = data.faultDescription.trim();
  const effectiveReceivedDate = data.receivedDate ? new Date(data.receivedDate) : new Date();
  const effectiveMeetingDate = data.meetingDate ? new Date(data.meetingDate) : caseRecord.meetingDate;
  const effectiveReportDate = data.reportDate ? new Date(data.reportDate) : new Date();

  const action = await prisma.caseAction.create({
    data: {
      caseId: id,
      receivedDate: effectiveReceivedDate,
      meetingDate: effectiveMeetingDate,
      faultDescription: effectiveFinding,
      reportDate: effectiveReportDate,
      reportText: data.reportText || data.notes || effectiveFinding,
      actionTaken: data.actionTaken || effectiveFinding,
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
      where: { id: id },
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
